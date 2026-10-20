import type { Logger } from "@quickstart/logging";
import type { ContentStore } from "../lib/content-store.js";
import {
  extractDocumentText,
  TesseractOcrAdapter,
  type OcrEngine,
} from "../lib/extract.js";
import type { SourcesRepository } from "../repository/sources.repository.js";
import { storageKeyForSource } from "../lib/content-store.js";

export type ExtractionWorkerOptions = {
  pollIntervalMs?: number;
  ocrEngine?: OcrEngine;
};

export class ExtractionWorker {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private stopping = false;
  private readonly ocrEngine: OcrEngine;
  private readonly pollIntervalMs: number;

  constructor(
    private readonly repo: SourcesRepository,
    private readonly contentStore: ContentStore | null,
    private readonly logger: Logger,
    private readonly enqueueIngestFn: (workspaceId: string, source: any) => Promise<void>,
    options?: ExtractionWorkerOptions,
  ) {
    this.ocrEngine = options?.ocrEngine ?? new TesseractOcrAdapter();
    this.pollIntervalMs = options?.pollIntervalMs ?? 1000;
  }

  start(): void {
    if (this.timer) return;
    this.stopping = false;
    this.timer = setInterval(() => {
      void this.tick();
    }, this.pollIntervalMs);
    this.timer.unref?.();
    this.logger.info("knowledge.extraction_worker.started", {
      pollIntervalMs: this.pollIntervalMs,
    });
  }

  async stop(): Promise<void> {
    this.stopping = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    while (this.running) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  private async tick(): Promise<void> {
    if (this.running || this.stopping) return;
    this.running = true;
    try {
      const job = await this.repo.claimExtractionJob();
      if (!job) return;

      await this.processJob(job);
    } catch (err: unknown) {
      this.logger.error("knowledge.extraction_worker.tick_failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      this.running = false;
    }
  }

  private async processJob(job: {
    id: string;
    workspace_id: string;
    source_id: string;
    attempts: number;
  }): Promise<void> {
    try {
      const source = await this.repo.get(job.workspace_id, job.source_id);
      if (!source) {
        await this.repo.completeExtractionJob(job.id);
        return;
      }

      if (source.extraction_status === "completed" && source.content_text) {
        await this.repo.completeExtractionJob(job.id);
        return;
      }

      let buffer: Buffer | null = null;
      if (this.contentStore && source.raw_storage_key) {
        buffer = await this.contentStore.getObject(source.raw_storage_key);
      }

      if (!buffer) {
        throw new Error(`Raw binary buffer not found for source ${source.id}`);
      }

      const extraction = await extractDocumentText(
        buffer,
        source.file_name ?? "document",
        source.content_type ?? undefined,
        { ocrEngine: this.ocrEngine },
      );

      let storageKey = source.storage_key;
      if (this.contentStore) {
        storageKey = storageKeyForSource(job.workspace_id, source.id, source.version);
        await this.contentStore.putObject(
          storageKey,
          Buffer.from(extraction.text, "utf8"),
          "text/plain; charset=utf-8",
        );
      }

      const updated = await this.repo.updateExtractionResult(job.workspace_id, source.id, {
        status: "completed",
        contentText: this.contentStore ? null : extraction.text,
        storageKey,
        charCount: extraction.charCount,
        ocrApplied: Boolean(extraction.ocrApplied),
        error: null,
      });

      await this.repo.completeExtractionJob(job.id);

      // Trigger vector chunking and embeddings pipeline
      await this.enqueueIngestFn(job.workspace_id, updated);

      this.logger.info("knowledge.extraction_worker.job_completed", {
        jobId: job.id,
        sourceId: source.id,
        charCount: extraction.charCount,
        ocrApplied: extraction.ocrApplied,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const isTerminal = job.attempts >= 3;

      await this.repo.failExtractionJob(job.id, errorMessage, isTerminal);

      if (isTerminal) {
        await this.repo.updateExtractionResult(job.workspace_id, job.source_id, {
          status: "failed",
          error: errorMessage,
        });
      }

      this.logger.error("knowledge.extraction_worker.job_failed", {
        jobId: job.id,
        sourceId: job.source_id,
        attempts: job.attempts,
        terminal: isTerminal,
        error: errorMessage,
      });
    }
  }
}
