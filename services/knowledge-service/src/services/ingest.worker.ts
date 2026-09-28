import { randomUUID } from "node:crypto";
import type { Logger } from "@quickstart/logging";
import type { ContentStore } from "../lib/content-store.js";
import type { KnowledgeConfig } from "../config/environment.js";
import { chunkText } from "../lib/chunk.js";
import type { EmbeddingProvider } from "../lib/embed.js";
import type { OpenSearchClient } from "../lib/opensearch.js";
import type { IngestQueue } from "../lib/sqs.js";
import type { SourcesRepository } from "../repository/sources.repository.js";

async function loadSourceText(
  source: { content_text: string | null; storage_key: string | null },
  contentStore: ContentStore | null,
): Promise<string> {
  if (source.storage_key && contentStore) {
    const body = await contentStore.getObject(source.storage_key);
    return body.toString("utf8");
  }
  return source.content_text?.trim() ?? "";
}

export function startIngestWorker(deps: {
  config: KnowledgeConfig;
  queue: IngestQueue;
  repo: SourcesRepository;
  opensearch: OpenSearchClient;
  embedder: EmbeddingProvider;
  contentStore: ContentStore | null;
  logger: Logger;
}): { stop: () => void } {
  let running = true;

  const tick = async () => {
    if (!running) {
      return;
    }
    let receiptHandle: string | undefined;
    let workspaceId: string | undefined;
    let sourceId: string | undefined;

    try {
      const msg = await deps.queue.receive();
      if (!msg) {
        return;
      }
      const { job } = msg;
      receiptHandle = msg.receiptHandle;
      if (job.action === "delete") {
        await deps.opensearch.deleteBySource(job.workspace_id, job.source_id);
        await deps.queue.ack(receiptHandle);
        return;
      }

      workspaceId = job.workspace_id;
      sourceId = job.source_id;

      const source = await deps.repo.get(job.workspace_id, job.source_id);
      if (!source) {
        await deps.repo.updateStatus(job.workspace_id, job.source_id, "failed", {
          error_message: "Source missing",
        });
        await deps.queue.ack(receiptHandle);
        return;
      }

      if (job.version !== undefined && job.version !== source.version) {
        await deps.queue.ack(receiptHandle);
        return;
      }

      const text = await loadSourceText(source, deps.contentStore);
      if (!text) {
        await deps.repo.updateStatus(job.workspace_id, job.source_id, "failed", {
          error_message: "Source missing or empty",
        });
        await deps.queue.ack(receiptHandle);
        return;
      }

      await deps.repo.updateStatus(job.workspace_id, job.source_id, "processing");
      await deps.opensearch.deleteBySource(job.workspace_id, job.source_id);

      const chunks = chunkText(text);
      const docs = await Promise.all(
        chunks.map(async (chunk, index) => ({
          workspace_id: job.workspace_id,
          source_id: job.source_id,
          chunk_id: randomUUID(),
          chunk_index: index,
          text: chunk,
          vector: await deps.embedder.embed(chunk),
        })),
      );

      await deps.opensearch.indexChunks(docs);
      await deps.repo.updateStatus(job.workspace_id, job.source_id, "ready", {
        chunk_count: docs.length,
        error_message: null,
      });
      await deps.queue.ack(receiptHandle);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      deps.logger.warn("ingest.worker.error", { error: message, workspaceId, sourceId });
      if (workspaceId && sourceId) {
        try {
          await deps.repo.updateStatus(workspaceId, sourceId, "failed", {
            error_message: message.slice(0, 500),
          });
        } catch {
          // ignore secondary failure
        }
      }
      if (receiptHandle) {
        try {
          await deps.queue.ack(receiptHandle);
        } catch {
          // ignore ack failure
        }
      }
    }
  };

  const interval = setInterval(() => void tick(), deps.config.workerPollMs);
  void deps.opensearch.ensureIndex();

  return {
    stop: () => {
      running = false;
      clearInterval(interval);
    },
  };
}
