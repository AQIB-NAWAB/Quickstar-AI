import { AppError, ErrorCode } from "@quickstart/errors";
import type { CampaignsRepository } from "../repository/campaigns.repository.js";
import type { CallSessionOrchestrator } from "../session/orchestrator.js";
import type { TelephonyRouter } from "../telephony/router.js";

export class CampaignsService {
  constructor(
    private readonly repo: CampaignsRepository,
    private readonly orchestrator: CallSessionOrchestrator,
    private readonly telephony: TelephonyRouter,
  ) {}

  create(workspaceId: string, body: { name: string; agent_id: string; concurrency_cap?: number }) {
    if (!body.name?.trim() || !body.agent_id) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "name and agent_id are required",
      });
    }
    return this.repo.create({
      workspaceId,
      name: body.name.trim(),
      agentId: body.agent_id,
      concurrencyCap: body.concurrency_cap,
    });
  }

  list(workspaceId: string) {
    return this.repo.list(workspaceId);
  }

  async start(workspaceId: string, campaignId: string) {
    const campaign = await this.repo.get(workspaceId, campaignId);
    if (!campaign) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Campaign not found" });
    }
    return this.repo.setState(workspaceId, campaignId, "running");
  }

  addTargets(workspaceId: string, campaignId: string, phones: string[]) {
    return this.repo.addTargets(workspaceId, campaignId, phones);
  }

  /**
   * Worker-style batch: claim pending targets and place simulated outbound calls.
   * Does not dial the whole list inside the HTTP request beyond `limit`.
   */
  async processBatch(
    workspaceId: string,
    campaignId: string,
    opts: {
      conversationId: string;
      limit?: number;
      authHeaders?: Record<string, string>;
      requestId: string;
    },
  ) {
    const campaign = await this.repo.get(workspaceId, campaignId);
    if (!campaign) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Campaign not found" });
    }
    if (campaign.state !== "running") {
      throw new AppError({
        code: ErrorCode.CONFLICT,
        message: "Campaign must be running to dial",
      });
    }

    const limit = Math.min(opts.limit ?? campaign.concurrency_cap, campaign.concurrency_cap);
    const targets = await this.repo.claimBatch(workspaceId, campaignId, limit);
    const route = await this.telephony.route(workspaceId, campaign.telephony_provider ?? undefined);
    const results = [];

    for (const target of targets) {
      try {
        const dial = await route.provider.dial({
          workspaceId,
          toE164: target.phone_e164,
          callId: target.id,
        });
        const sim = await this.orchestrator.simulateCall({
          workspaceId,
          conversationId: opts.conversationId,
          agentId: campaign.agent_id,
          direction: "outbound",
          callee: target.phone_e164,
          utterance: {
            bytes: Buffer.from("campaign hello", "utf8"),
            encoding: "fake",
            sampleRateHz: 8000,
          },
          telephonyProvider: route.provider.id,
          authHeaders: opts.authHeaders,
          requestId: opts.requestId,
        });
        await this.repo.markTarget(workspaceId, target.id, {
          status: "completed",
          callId: sim.call_id,
        });
        await route.provider.hangup(dial.providerCallSid);
        results.push({ target_id: target.id, call_id: sim.call_id, status: "completed" });
      } catch (err) {
        const message = err instanceof Error ? err.message : "dial_failed";
        await this.repo.markTarget(workspaceId, target.id, {
          status: "failed",
          lastError: message,
        });
        results.push({ target_id: target.id, status: "failed", error: message });
      }
    }

    return { processed: results.length, results, provider: route.provider.id };
  }
}
