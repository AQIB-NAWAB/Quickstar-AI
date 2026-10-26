import { randomUUID } from "node:crypto";
import type { Logger } from "@quickstart/logging";
import type { EmailCampaignsRepository } from "../repository/email-campaigns.repository.js";
import type { EmailCampaignsService } from "../services/email-campaigns.service.js";

export type EmailSenderWorkerOptions = {
  repo: EmailCampaignsRepository;
  service: EmailCampaignsService;
  logger: Logger;
  pollIntervalMs?: number;
  batchSize?: number;
  leaseSeconds?: number;
  maxAttempts?: number;
};

/**
 * In-process sending worker. Every tick it:
 * 1. Promotes scheduled campaigns whose start time has passed to "sending".
 * 2. Claims due recipients with FOR UPDATE SKIP LOCKED (respecting the
 *    mailbox daily limit and stale-lease takeover for crash recovery).
 * 3. Sends each via SMTP and records success/retry/failure + activity.
 * 4. Schedules the next follow-up step for sent recipients.
 * 5. Completes campaigns with no pending/retrying recipients left.
 */
export function createEmailSenderWorker(options: EmailSenderWorkerOptions): {
  start: () => void;
  stop: () => Promise<void>;
} {
  const {
    repo,
    service,
    logger,
    pollIntervalMs = 2000,
    batchSize = 10,
    leaseSeconds = 60,
    maxAttempts = 5,
  } = options;

  const workerId = `email-sender-${randomUUID().slice(0, 8)}`;
  let isRunning = false;
  let timer: NodeJS.Timeout | null = null;
  let processing = false;

  async function tick(): Promise<void> {
    if (processing || !isRunning) return;
    processing = true;
    try {
      const promoted = await repo.activateScheduledCampaigns();
      for (const campaign of promoted) {
        await repo.addActivity({
          workspaceId: campaign.workspace_id,
          campaignId: campaign.id,
          type: "activated",
          message: "Scheduled start reached. Sending has begun.",
        });
        logger.info("email.worker.campaign_promoted", { campaignId: campaign.id });
      }

      const sendingCampaigns = await repo.listSendingCampaigns();
      for (const campaign of sendingCampaigns) {
        await processCampaign(campaign.id, campaign.workspace_id);
      }

      const completed = await repo.finalizeCompletedCampaigns();
      for (const campaign of completed) {
        await repo.addActivity({
          workspaceId: campaign.workspace_id,
          campaignId: campaign.id,
          type: "completed",
          message: "All recipients processed. Campaign completed.",
        });
        logger.info("email.worker.campaign_completed", { campaignId: campaign.id });
      }
    } catch (err) {
      logger.error("email.worker.loop_error", {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      processing = false;
    }
  }

  async function processCampaign(campaignId: string, workspaceId: string): Promise<void> {
    const claimed = await repo.claimRecipients(campaignId, batchSize, workerId, leaseSeconds);
    if (claimed.length === 0) return;

    for (const recipient of claimed) {
      try {
        if (recipient.mailbox_id === null) {
          await repo.markRecipientFailed(recipient.id, "Campaign has no sending mailbox");
          await repo.addActivity({
            workspaceId,
            campaignId,
            type: "send_failed",
            message: `${recipient.email}: campaign has no sending mailbox.`,
          });
          continue;
        }

        const suppressed = await repo.isSuppressed(workspaceId, recipient.email);
        if (suppressed) {
          await repo.markRecipientSuppressed(recipient.id, "On the workspace suppression list");
          await repo.addActivity({
            workspaceId,
            campaignId,
            type: "suppressed",
            message: `${recipient.email} skipped: on the workspace suppression list.`,
          });
          continue;
        }

        // Refresh the mailbox's daily budget when the day rolls over.
        await repo.resetMailboxDailyCounterIfStale(recipient.mailbox_id);

        const credentials = await service.workerMailboxCredentials(workspaceId, recipient.mailbox_id);
        if (!credentials) {
          await repo.markRecipientFailed(recipient.id, "Mailbox credentials are missing");
          await repo.addActivity({
            workspaceId,
            campaignId,
            type: "send_failed",
            message: `${recipient.email}: mailbox credentials are missing.`,
          });
          continue;
        }

        const followUps = Array.isArray(recipient.campaign_schedule?.followUps)
          ? recipient.campaign_schedule.followUps
          : [];
        const followUp = followUps[recipient.followup_step] ?? null;

        const fromName = recipient.campaign_from_name ?? "QuickStart AI";

        // Personalized campaigns without stored content generate it lazily
        // right before the first send (the activation batch covered the first 25).
        let generatedPersonalized = null;
        if (
          recipient.campaign_mode === "personalized" &&
          !followUp &&
          !(recipient.personalized?.subject && recipient.personalized?.html)
        ) {
          generatedPersonalized = await service.ensureRecipientPersonalized(
            workspaceId,
            { brief: recipient.campaign_brief, fromName: recipient.campaign_from_name },
            recipient,
          );
        }

        const email = await service.resolveEmailForRecipient(
          {
            mode: recipient.campaign_mode,
            subject: recipient.campaign_subject,
            html: recipient.campaign_html,
            brief: recipient.campaign_brief,
            fromName,
          },
          { personalized: generatedPersonalized ?? recipient.personalized },
          followUp,
          {
            email: recipient.email,
            name: recipient.name ?? undefined,
            company: recipient.company ?? undefined,
            website: recipient.website ?? undefined,
            category: recipient.category ?? undefined,
            location: recipient.location ?? undefined,
            summary: recipient.summary ?? undefined,
            notes: recipient.notes ?? undefined,
          },
          fromName,
          workspaceId,
        );

        try {
          const sent = await service.sendRecipientEmail({
            workspaceId,
            credentials,
            fromName,
            to: recipient.email,
            subject: email.subject,
            html: email.html,
            campaignId,
            recipientId: recipient.id,
          });

          // Schedule the next follow-up step, if any remains.
          const nextStep = recipient.followup_step + 1;
          const nextFollowUp = followUps[nextStep] ?? null;
          const nextSendAt = nextFollowUp
            ? new Date(Date.now() + Math.max(1, nextFollowUp.delayDays) * 24 * 60 * 60 * 1000)
            : null;

          await repo.markRecipientSent({
            recipientId: recipient.id,
            messageId: sent.messageId,
            sentSubject: email.subject,
            sentHtml: email.html,
            nextStep,
            nextSendAt,
          });
          await repo.incrementMailboxSent(recipient.mailbox_id);
          await repo.addActivity({
            workspaceId,
            campaignId,
            type: "sent",
            message: `${recipient.email}: sent${nextSendAt ? " (follow-up scheduled)" : ""}.`,
            metadata: { messageId: sent.messageId ?? null, followupStep: nextStep },
          });
          logger.info("email.worker.recipient_sent", {
            campaignId,
            email: recipient.email,
            messageId: sent.messageId,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "SMTP send failed";
          // Configuration problems will never succeed on retry — fail the
          // recipient immediately instead of burning retry attempts.
          const isConfigError = message.includes("must be set to sign unsubscribe links");
          if (recipient.attempts + 1 >= maxAttempts || isConfigError) {
            await repo.markRecipientFailed(recipient.id, message);
            await repo.addActivity({
              workspaceId,
              campaignId,
              type: "send_failed",
              message: `${recipient.email}: ${message}.${isConfigError ? "" : ` Giving up after ${maxAttempts} attempts.`}`,
            });
            logger.error("email.worker.recipient_failed", {
              campaignId,
              email: recipient.email,
              error: message,
            });
          } else {
            const backoffSec = Math.min(3600, Math.pow(2, recipient.attempts + 1) * 60);
            await repo.markRecipientRetry({
              recipientId: recipient.id,
              error: message,
              nextAttemptAt: new Date(Date.now() + backoffSec * 1000),
            });
            await repo.addActivity({
              workspaceId,
              campaignId,
              type: "send_retrying",
              message: `${recipient.email}: ${message}. Retrying in ${Math.round(backoffSec / 60)}m.`,
            });
            logger.warn("email.worker.recipient_retrying", {
              campaignId,
              email: recipient.email,
              attempts: recipient.attempts + 1,
              error: message,
            });
          }
        }
      } catch (err) {
        logger.error("email.worker.recipient_error", {
          campaignId,
          email: recipient.email,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return {
    start() {
      if (isRunning) return;
      isRunning = true;
      logger.info("email.worker.started", { workerId, pollIntervalMs, batchSize });
      timer = setInterval(() => {
        void tick();
      }, pollIntervalMs);
      void tick();
    },

    async stop() {
      isRunning = false;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      logger.info("email.worker.stopped", { workerId });
    },
  };
}
