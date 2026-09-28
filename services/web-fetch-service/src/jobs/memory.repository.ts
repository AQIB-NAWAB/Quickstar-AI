import { randomUUID } from "node:crypto";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { AcquisitionJobRecord, CreateCrawlJobInput, JobRepository } from "./types.js";

export function createMemoryJobRepository(): JobRepository {
  const jobs = new Map<string, AcquisitionJobRecord>();
  const idempotency = new Map<string, string>();

  return {
    async createCrawlJob(input: CreateCrawlJobInput): Promise<AcquisitionJobRecord> {
      const idemKey = `${input.workspaceId}:${input.idempotencyKey}`;
      const existingId = idempotency.get(idemKey);
      if (existingId) {
        const existing = jobs.get(existingId);
        if (existing) return existing;
      }

      const record: AcquisitionJobRecord = {
        id: randomUUID(),
        workspaceId: input.workspaceId,
        status: "queued",
        seedUrl: input.seedUrl,
        params: {
          maxDepth: input.maxDepth,
          maxPages: input.maxPages,
          renderJs: input.renderJs,
        },
        pagesFetched: 0,
        idempotencyKey: input.idempotencyKey,
        requestId: input.requestId,
      };
      jobs.set(record.id, record);
      idempotency.set(idemKey, record.id);
      return record;
    },

    async getJob(jobId: string, workspaceId?: string): Promise<AcquisitionJobRecord | null> {
      const job = jobs.get(jobId);
      if (!job) return null;
      if (workspaceId && job.workspaceId !== workspaceId) {
        throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Job not found" });
      }
      return job;
    },

    async claimNextJob(): Promise<AcquisitionJobRecord | null> {
      for (const job of jobs.values()) {
        if (job.status === "queued") {
          job.status = "running";
          return job;
        }
      }
      return null;
    },

    async markRunning(jobId: string): Promise<void> {
      const job = jobs.get(jobId);
      if (job) job.status = "running";
    },

    async updateProgress(jobId: string, pagesFetched: number, artifactText: string): Promise<void> {
      const job = jobs.get(jobId);
      if (!job) return;
      job.pagesFetched = pagesFetched;
      job.artifactText = artifactText;
    },

    async markReady(jobId: string, pagesFetched: number, artifactText: string): Promise<void> {
      const job = jobs.get(jobId);
      if (!job) return;
      job.status = "ready";
      job.pagesFetched = pagesFetched;
      job.artifactText = artifactText;
    },

    async markFailed(jobId: string, errorCode: string): Promise<void> {
      const job = jobs.get(jobId);
      if (!job) return;
      job.status = "failed";
      job.errorCode = errorCode;
    },
  };
}
