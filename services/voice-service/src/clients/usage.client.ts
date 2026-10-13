import type { Logger } from "@quickstart/logging";
import type { UsageFactIngestBody } from "@quickstart/contracts";

export type UsageIngestClient = {
  emit(fact: UsageFactIngestBody): void;
};

/**
 * Fire-and-forget POST to usage-service. Never throws into the caller.
 */
export function createUsageIngestClient(opts: {
  usageUrl: string;
  internalToken: string;
  logger: Logger;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): UsageIngestClient {
  const fetchFn = opts.fetchImpl ?? fetch;
  const base = opts.usageUrl.replace(/\/$/, "");
  const timeoutMs = opts.timeoutMs ?? 2_000;

  return {
    emit(fact: UsageFactIngestBody): void {
      void (async () => {
        try {
          const res = await fetchFn(`${base}/internal/v1/usage/ingest`, {
            method: "POST",
            headers: {
              authorization: `Bearer ${opts.internalToken}`,
              "content-type": "application/json",
            },
            body: JSON.stringify(fact),
            signal: AbortSignal.timeout(timeoutMs),
          });
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            opts.logger.warn("usage.ingest_failed", {
              status: res.status,
              idempotency_key: fact.idempotency_key,
              body: text.slice(0, 200),
            });
          }
        } catch (err) {
          opts.logger.warn("usage.ingest_error", {
            idempotency_key: fact.idempotency_key,
            detail: err instanceof Error ? err.message : String(err),
          });
        }
      })();
    },
  };
}

/** No-op client when USAGE_URL is unset (local unit tests). */
export function createNoopUsageIngestClient(): UsageIngestClient {
  return { emit: () => undefined };
}
