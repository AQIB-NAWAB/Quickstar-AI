import type { Logger } from "@quickstart/logging";
import type {
  CampaignAttempt,
  CampaignRecord,
  CampaignTarget,
  TargetStatus,
} from "../domain/types.js";
import type { CampaignsRepository } from "../repository/campaigns.repository.js";
import { evaluateCallingWindow } from "../utils/schedule-window.js";

export type DialResult = {
  status: CampaignAttempt["status"];
  outcome: string;
  callId: string | null;
  durationSeconds: number | null;
  error?: { code: string; message: string } | null;
};

export interface DialAdapter {
  dial(target: CampaignTarget, campaign: CampaignRecord): Promise<DialResult>;
}

/** Stub dialer for unit tests / local without voice. */
export class StubDialAdapter implements DialAdapter {
  async dial(target: CampaignTarget, _campaign: CampaignRecord): Promise<DialResult> {
    void _campaign;
    const lastDigit = Number(target.dialNormalized.slice(-1)) || 0;
    if (lastDigit % 5 === 0) {
      return {
        status: "no_answer",
        outcome: "no_answer",
        callId: `stub-${target.id}`,
        durationSeconds: 0,
      };
    }
    if (lastDigit % 7 === 0) {
      return {
        status: "busy",
        outcome: "busy",
        callId: `stub-${target.id}`,
        durationSeconds: 0,
      };
    }
    return {
      status: "answered",
      outcome: "answered",
      callId: `stub-${target.id}`,
      durationSeconds: 30 + (lastDigit % 10) * 12,
    };
  }
}

export class CampaignDialer {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly repo: CampaignsRepository,
    private readonly adapter: DialAdapter,
    private readonly logger: Logger,
    private readonly options: {
      workerId: string;
      pollIntervalMs: number;
      batchSize: number;
    },
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, this.options.pollIntervalMs);
    this.timer.unref?.();
    this.logger.info("campaign.dialer.started", {
      workerId: this.options.workerId,
      pollIntervalMs: this.options.pollIntervalMs,
    });
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    while (this.running) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const claimed = await this.repo.claimTargets(this.options.workerId, this.options.batchSize);
      for (const target of claimed) {
        await this.processTarget(target);
      }
    } catch (err) {
      this.logger.error("campaign.dialer.tick_failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      this.running = false;
    }
  }

  private async processTarget(target: CampaignTarget): Promise<void> {
    const campaign = await this.repo.getCampaignForTarget(target.id);
    if (!campaign || campaign.status !== "running") {
      await this.repo.completeTargetAttempt({
        targetId: target.id,
        nextStatus: "pending",
        outcome: "released",
        nextAttemptAt: null,
      });
      return;
    }

    if (target.isHeld) {
      return;
    }

    const windowEval = evaluateCallingWindow(campaign.schedule, target.timezone);
    if (!windowEval.inWindow) {
      if (windowEval.held) {
        await this.repo.markTargetHeld(target.id, windowEval.heldReason || "unknown_timezone");
        this.logger.warn("campaign.dialer.target_held", {
          targetId: target.id,
          campaignId: campaign.id,
          reason: windowEval.heldReason,
        });
        return;
      }

      await this.repo.completeTargetAttempt({
        targetId: target.id,
        nextStatus: "pending",
        outcome: "outside_window",
        nextAttemptAt: windowEval.nextWindowOpenAt ?? new Date(Date.now() + 5 * 60_000),
      });
      return;
    }

    const isSuppressed = await this.repo.isPhoneSuppressed(
      target.workspaceId,
      target.dialNormalized,
    );
    if (isSuppressed) {
      await this.repo.completeTargetAttempt({
        targetId: target.id,
        nextStatus: "failed",
        outcome: "suppressed",
        nextAttemptAt: null,
      });
      this.logger.info("campaign.dialer.target_suppressed", {
        targetId: target.id,
        campaignId: campaign.id,
        phone: target.dialNormalized,
      });
      return;
    }

    const attemptNumber = target.attemptsCount + 1;
    const idempotencyKey = `${campaign.id}:${target.id}:${attemptNumber}`;
    const attempt = await this.repo.createAttempt({
      workspaceId: target.workspaceId,
      campaignId: target.campaignId,
      targetId: target.id,
      attemptNumber,
      idempotencyKey,
    });

    if (attempt.status !== "in_progress") {
      return;
    }

    let result: DialResult;
    try {
      result = await this.adapter.dial(target, campaign);
    } catch (err) {
      result = {
        status: "failed",
        outcome: "dial_error",
        callId: null,
        durationSeconds: null,
        error: {
          code: "DIAL_ERROR",
          message: err instanceof Error ? err.message : "Dial failed",
        },
      };
    }

    await this.repo.completeAttempt({
      attemptId: attempt.id,
      status: result.status,
      outcome: result.outcome,
      callId: result.callId,
      durationSeconds: result.durationSeconds,
      error: result.error ?? null,
    });

    const { nextStatus, nextAttemptAt } = resolveNextTargetState(
      result,
      attemptNumber,
      campaign.retryPolicy.maxRetries,
      campaign.retryPolicy.retryIntervalMinutes,
      campaign.retryPolicy.eligibleOutcomes,
    );

    await this.repo.completeTargetAttempt({
      targetId: target.id,
      nextStatus,
      outcome: result.outcome,
      nextAttemptAt,
    });

    await this.repo.maybeCompleteCampaign(target.workspaceId, target.campaignId);

    this.logger.info("campaign.dialer.attempt_completed", {
      campaignId: target.campaignId,
      targetId: target.id,
      attemptNumber,
      outcome: result.outcome,
      nextStatus,
    });
  }
}

export function resolveNextTargetState(
  result: DialResult,
  attemptNumber: number,
  maxRetries: number,
  retryIntervalMinutes: number,
  eligibleOutcomes: string[],
): { nextStatus: TargetStatus; nextAttemptAt: Date | null } {
  if (result.status === "answered") {
    return { nextStatus: "completed", nextAttemptAt: null };
  }
  if (result.status === "voicemail") {
    return { nextStatus: "voicemail", nextAttemptAt: null };
  }

  const canRetry =
    eligibleOutcomes.includes(result.outcome) && attemptNumber <= maxRetries;

  if (canRetry) {
    return {
      nextStatus: "retrying",
      nextAttemptAt: new Date(Date.now() + retryIntervalMinutes * 60_000),
    };
  }

  if (result.status === "no_answer") return { nextStatus: "no_answer", nextAttemptAt: null };
  if (result.status === "busy") return { nextStatus: "busy", nextAttemptAt: null };
  return { nextStatus: "failed", nextAttemptAt: null };
}
