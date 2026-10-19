import type { Logger } from "@quickstart/logging";
import type { EvalRepository } from "../repository/eval.repository.js";
import type { EvalService } from "./eval.service.js";

export class EvalWorker {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly repo: EvalRepository,
    private readonly service: EvalService,
    private readonly logger: Logger,
    private readonly options: { workerId: string; pollIntervalMs: number },
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, this.options.pollIntervalMs);
    this.timer.unref?.();
    this.logger.info("eval.worker.started", {
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
      const run = await this.repo.claimNextRun(this.options.workerId);
      if (!run) return;
      this.logger.info("eval.worker.claimed", { runId: run.id, workerId: this.options.workerId });
      await this.service.processRun(run, this.options.workerId);
      this.logger.info("eval.worker.finished", { runId: run.id });
    } catch (err) {
      this.logger.error("eval.worker.tick_failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      this.running = false;
    }
  }
}
