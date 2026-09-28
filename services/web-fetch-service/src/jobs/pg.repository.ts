import type { Pool } from "pg";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { AcquisitionJobRecord, CreateCrawlJobInput, JobRepository } from "./types.js";

function rowToRecord(row: {
  id: string;
  workspace_id: string;
  status: string;
  seed_url: string;
  params: { maxDepth?: number; maxPages?: number; renderJs?: boolean };
  pages_fetched: number;
  error_code: string | null;
  artifact_text: string | null;
  idempotency_key: string;
  request_id: string;
}): AcquisitionJobRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    status: row.status as AcquisitionJobRecord["status"],
    seedUrl: row.seed_url,
    params: {
      maxDepth: row.params.maxDepth ?? 1,
      maxPages: row.params.maxPages ?? 1,
      renderJs: row.params.renderJs ?? false,
    },
    pagesFetched: row.pages_fetched,
    errorCode: row.error_code ?? undefined,
    artifactText: row.artifact_text ?? undefined,
    idempotencyKey: row.idempotency_key,
    requestId: row.request_id,
  };
}

export function createPgJobRepository(pool: Pool): JobRepository {
  return {
    async createCrawlJob(input: CreateCrawlJobInput): Promise<AcquisitionJobRecord> {
      const params = {
        maxDepth: input.maxDepth,
        maxPages: input.maxPages,
        renderJs: input.renderJs,
      };
      try {
        const { rows } = await pool.query(
          `INSERT INTO acquisition_jobs (
            workspace_id, kind, status, seed_url, params, idempotency_key, request_id
          ) VALUES ($1, 'crawl', 'queued', $2, $3::jsonb, $4, $5)
          RETURNING id, workspace_id, status, seed_url, params, pages_fetched, error_code,
                    artifact_text, idempotency_key, request_id`,
          [
            input.workspaceId,
            input.seedUrl,
            JSON.stringify(params),
            input.idempotencyKey,
            input.requestId,
          ],
        );
        return rowToRecord(rows[0]);
      } catch (error: unknown) {
        const pgCode =
          error && typeof error === "object" && "code" in error
            ? (error as { code: string }).code
            : undefined;
        if (pgCode === "23505") {
          const { rows } = await pool.query(
            `SELECT id, workspace_id, status, seed_url, params, pages_fetched, error_code,
                    artifact_text, idempotency_key, request_id
             FROM acquisition_jobs
             WHERE workspace_id = $1 AND idempotency_key = $2`,
            [input.workspaceId, input.idempotencyKey],
          );
          if (rows[0]) {
            return rowToRecord(rows[0]);
          }
        }
        throw error;
      }
    },

    async getJob(jobId: string, workspaceId?: string): Promise<AcquisitionJobRecord | null> {
      const { rows } = await pool.query(
        `SELECT id, workspace_id, status, seed_url, params, pages_fetched, error_code,
                artifact_text, idempotency_key, request_id
         FROM acquisition_jobs WHERE id = $1`,
        [jobId],
      );
      if (!rows[0]) return null;
      const record = rowToRecord(rows[0]);
      if (workspaceId && record.workspaceId !== workspaceId) {
        throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Job not found" });
      }
      return record;
    },

    async claimNextJob(): Promise<AcquisitionJobRecord | null> {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const { rows } = await client.query(
          `SELECT id, workspace_id, status, seed_url, params, pages_fetched, error_code,
                  artifact_text, idempotency_key, request_id
           FROM acquisition_jobs
           WHERE status = 'queued'
           ORDER BY created_at ASC
           FOR UPDATE SKIP LOCKED
           LIMIT 1`,
        );
        if (!rows[0]) {
          await client.query("COMMIT");
          return null;
        }
        await client.query(
          `UPDATE acquisition_jobs SET status = 'running', updated_at = now() WHERE id = $1`,
          [rows[0].id],
        );
        await client.query("COMMIT");
        const record = rowToRecord(rows[0]);
        record.status = "running";
        return record;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },

    async markRunning(jobId: string): Promise<void> {
      await pool.query(
        `UPDATE acquisition_jobs SET status = 'running', updated_at = now() WHERE id = $1`,
        [jobId],
      );
    },

    async updateProgress(jobId: string, pagesFetched: number, artifactText: string): Promise<void> {
      await pool.query(
        `UPDATE acquisition_jobs
         SET pages_fetched = $2, artifact_text = $3, updated_at = now()
         WHERE id = $1`,
        [jobId, pagesFetched, artifactText],
      );
    },

    async markReady(jobId: string, pagesFetched: number, artifactText: string): Promise<void> {
      await pool.query(
        `UPDATE acquisition_jobs
         SET status = 'ready', pages_fetched = $2, artifact_text = $3, updated_at = now()
         WHERE id = $1`,
        [jobId, pagesFetched, artifactText],
      );
    },

    async markFailed(jobId: string, errorCode: string): Promise<void> {
      await pool.query(
        `UPDATE acquisition_jobs
         SET status = 'failed', error_code = $2, updated_at = now()
         WHERE id = $1`,
        [jobId, errorCode],
      );
    },
  };
}
