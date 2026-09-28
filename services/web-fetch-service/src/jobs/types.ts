import type { AcquisitionJobStatus } from "@quickstart/contracts";

export type AcquisitionJobRecord = {
  id: string;
  workspaceId: string;
  status: AcquisitionJobStatus;
  seedUrl: string;
  params: {
    maxDepth: number;
    maxPages: number;
    renderJs: boolean;
  };
  pagesFetched: number;
  errorCode?: string;
  artifactText?: string;
  idempotencyKey: string;
  requestId: string;
};

export type CreateCrawlJobInput = {
  workspaceId: string;
  seedUrl: string;
  maxDepth: number;
  maxPages: number;
  renderJs: boolean;
  idempotencyKey: string;
  requestId: string;
};

export type JobRepository = {
  createCrawlJob(input: CreateCrawlJobInput): Promise<AcquisitionJobRecord>;
  getJob(jobId: string, workspaceId?: string): Promise<AcquisitionJobRecord | null>;
  claimNextJob(): Promise<AcquisitionJobRecord | null>;
  markRunning(jobId: string): Promise<void>;
  updateProgress(jobId: string, pagesFetched: number, artifactText: string): Promise<void>;
  markReady(jobId: string, pagesFetched: number, artifactText: string): Promise<void>;
  markFailed(jobId: string, errorCode: string): Promise<void>;
};
