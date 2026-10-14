import type { Logger } from "@quickstart/logging";
import { runWithSpan } from "@quickstart/tracing";
import { AppError, ErrorCode } from "@quickstart/errors";
import { ResearchAgent, ResearchError } from "./research.js";
import type { Store, Task } from "./store.js";
import type { Config } from "./config.js";

export async function processTask(store: Store, agent: ResearchAgent, t: Task, logger: Logger) {
  const start = Date.now();
  try {
    await runWithSpan(
      "lead.task",
      { requestId: t.request_id, tenantId: t.org_id },
      async (span) => {
        span.setAttribute("lead.task.kind", t.kind);
        span.setAttribute("lead.task.id", t.id);
        await agent.execute(t);
      },
    );
    logger.info("lead.task.complete", {
      task_id: t.id,
      run_id: t.run_id,
      kind: t.kind,
      latency_ms: Date.now() - start,
    });
  } catch (e) {
    const quota = e instanceof AppError && e.code === ErrorCode.RATE_LIMITED;
    const known = e instanceof ResearchError;
    const code = quota
      ? "BUDGET_REACHED"
      : known
        ? e.code
        : e instanceof AppError
          ? e.code
          : "TASK_ERROR";
    const delay = known && e.retryAfter ? e.retryAfter : code === "PROVIDER_HTTP_429" ? 10 : 0;
    await store.failed(t, code, known ? e.retryable : false, delay);
    logger.warn("lead.task.failed", {
      task_id: t.id,
      run_id: t.run_id,
      kind: t.kind,
      code,
      attempt: t.attempts,
    });
  }
}
export function startWorker(store: Store, agent: ResearchAgent, config: Config, logger: Logger) {
  let stopped = false;
  const active = new Set<Promise<void>>();
  let ticking = false;
  const tick = async () => {
    if (stopped || ticking) return;
    ticking = true;
    try {
      await store.finalizeRuns();
      // Local process ceiling; limit concurrent tasks to avoid bursting rate limits
      while (!stopped && active.size < 2) {
        const task = await store.claim(config.leaseSeconds);
        if (!task) break;
        const heartbeat = setInterval(() => {
          void store
            .heartbeat(task, config.leaseSeconds)
            .catch(() => logger.warn("lead.heartbeat.failed", { task_id: task.id }));
        }, 20000);
        const work = processTask(store, agent, task, logger)
          .catch(() => logger.error("lead.worker.persistence_failed", { task_id: task.id }))
          .finally(() => {
            clearInterval(heartbeat);
            active.delete(work);
          });
        active.add(work);
      }
    } catch {
      logger.error("lead.worker.dispatch_failed", {});
    } finally {
      ticking = false;
    }
  };
  const timer = setInterval(() => void tick(), config.pollMs);
  void tick();
  return {
    async stop() {
      stopped = true;
      clearInterval(timer);
      await Promise.allSettled([...active]);
    },
  };
}
