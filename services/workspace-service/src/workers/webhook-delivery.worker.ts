import { createHmac, randomUUID } from "node:crypto";
import type { Logger } from "@quickstart/logging";
import { safeFetch } from "../utils/ssrf.js";
import type { WebhooksRepository } from "../repository/webhooks.repository.js";

export type WebhookDeliveryWorkerOptions = {
  webhooksRepo: WebhooksRepository;
  logger: Logger;
  pollIntervalMs?: number;
  batchSize?: number;
  leaseSeconds?: number;
};

export function calculateSignature(secret: string, timestamp: number, bodyJson: string): string {
  const payload = `${timestamp}.${bodyJson}`;
  const hmac = createHmac("sha256", secret).update(payload).digest("hex");
  return `t=${timestamp},v1=${hmac}`;
}

export function createWebhookDeliveryWorker(options: WebhookDeliveryWorkerOptions): {
  start: () => void;
  stop: () => Promise<void>;
} {
  const {
    webhooksRepo,
    logger,
    pollIntervalMs = 2000,
    batchSize = 10,
    leaseSeconds = 30,
  } = options;

  const workerId = `webhook-worker-${randomUUID().slice(0, 8)}`;
  let isRunning = false;
  let timer: NodeJS.Timeout | null = null;
  let processing = false;

  async function processBatch(): Promise<void> {
    if (processing || !isRunning) return;
    processing = true;

    try {
      const deliveries = await webhooksRepo.claimDeliveries(workerId, batchSize, leaseSeconds);
      if (deliveries.length === 0) {
        return;
      }

      await Promise.all(
        deliveries.map(async (delivery) => {
          const attemptNumber = delivery.attempts_count + 1;
          const endpoint = await webhooksRepo.getEndpoint(delivery.workspace_id, delivery.webhook_id);

          if (!endpoint || endpoint.status === "disabled") {
            const reason = !endpoint ? "Webhook endpoint not found" : "Webhook endpoint is disabled";
            await webhooksRepo.deadLetterDelivery(delivery.id, reason);
            return;
          }

          const timestamp = Math.floor(Date.now() / 1000);
          const bodyJson = JSON.stringify(delivery.payload);
          const signature = calculateSignature(endpoint.signing_secret, timestamp, bodyJson);

          const requestHeaders: Record<string, string> = {
            "content-type": "application/json",
            "user-agent": "QuickStart-Webhooks/1.0",
            "x-quickstart-delivery-id": delivery.id,
            "x-quickstart-event": delivery.event_type,
            "x-quickstart-timestamp": String(timestamp),
            "x-quickstart-signature": signature,
          };

          const start = performance.now();
          let outcome: "success" | "failed" = "failed";
          let httpStatus: number | null = null;
          let latencyMs = 0;
          let error: string | null = null;
          let responseBody: string | null = null;
          const responseHeaders: Record<string, string> = {};

          try {
            const res = await safeFetch(endpoint.url, {
              method: "POST",
              headers: requestHeaders,
              body: bodyJson,
              timeoutMs: 10_000,
            });

            latencyMs = Math.round(performance.now() - start);
            httpStatus = res.status;
            res.headers.forEach((v, k) => {
              responseHeaders[k] = v;
            });
            responseBody = await res.text().catch(() => "");

            if (res.ok) {
              outcome = "success";
            } else {
              outcome = "failed";
              error = `HTTP ${res.status}: ${res.statusText || "Delivery rejected"}`;
            }
          } catch (err) {
            latencyMs = Math.round(performance.now() - start);
            outcome = "failed";
            error = err instanceof Error ? err.message : "Dispatch failed";
            httpStatus = 504;
          }

          await webhooksRepo.createAttempt({
            deliveryId: delivery.id,
            attemptNumber,
            httpStatus,
            latencyMs,
            outcome,
            error,
            requestHeaders,
            responseHeaders,
            responseBody: responseBody ? responseBody.slice(0, 4000) : null,
          });

          if (outcome === "success") {
            await webhooksRepo.completeDelivery(delivery.id, httpStatus, latencyMs);
            await webhooksRepo.updateEndpointHealth(endpoint.id, httpStatus, false);
            logger.info("webhooks.worker.delivery_success", {
              deliveryId: delivery.id,
              webhookId: endpoint.id,
              httpStatus,
              latencyMs,
            });
          } else {
            await webhooksRepo.updateEndpointHealth(endpoint.id, httpStatus ?? 500, true);

            if (attemptNumber < delivery.max_attempts) {
              const backoffSec = Math.min(3600, Math.pow(2, attemptNumber) * 15);
              await webhooksRepo.retryDelivery(
                delivery.id,
                backoffSec,
                httpStatus,
                latencyMs,
                error,
              );
              logger.warn("webhooks.worker.delivery_retrying", {
                deliveryId: delivery.id,
                attemptNumber,
                maxAttempts: delivery.max_attempts,
                backoffSec,
                error,
              });
            } else {
              await webhooksRepo.deadLetterDelivery(
                delivery.id,
                error ?? "Maximum retry attempts reached",
              );
              logger.error("webhooks.worker.delivery_dead_lettered", {
                deliveryId: delivery.id,
                attemptNumber,
                error,
              });
            }
          }
        }),
      );
    } catch (err) {
      logger.error("webhooks.worker.loop_error", {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      processing = false;
    }
  }

  return {
    start() {
      if (isRunning) return;
      isRunning = true;
      logger.info("webhooks.worker.started", { workerId, pollIntervalMs, batchSize });
      timer = setInterval(() => {
        void processBatch();
      }, pollIntervalMs);
      void processBatch();
    },

    async stop() {
      isRunning = false;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      logger.info("webhooks.worker.stopped", { workerId });
    },
  };
}
