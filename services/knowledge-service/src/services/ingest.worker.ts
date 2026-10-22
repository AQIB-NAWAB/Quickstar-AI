import { createHash } from "node:crypto";
import type { Logger } from "@quickstart/logging";
import type { ContentStore } from "../lib/content-store.js";
import type { KnowledgeConfig } from "../config/environment.js";
import { chunkTextWithCoordinates } from "../lib/chunk.js";
import type { EmbeddingProvider } from "../lib/embed.js";
import type { ChunkDocument, OpenSearchClient } from "../lib/opensearch.js";
import type { IngestJobMessage, IngestQueue } from "../lib/sqs.js";
import type { SourcesRepository } from "../repository/sources.repository.js";

const DEFAULT_EMBED_CONCURRENCY = 2;

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

/**
 * Executes async tasks with bounded concurrency to prevent overwhelming downstream embedding providers.
 */
async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIdx = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIdx < items.length) {
      const idx = nextIdx++;
      results[idx] = await fn(items[idx], idx);
    }
  });

  await Promise.all(workers);
  return results;
}

export function startIngestWorker(deps: {
  config: KnowledgeConfig;
  queue: IngestQueue;
  repo: SourcesRepository;
  opensearch: OpenSearchClient;
  embedder: EmbeddingProvider;
  contentStore: ContentStore | null;
  logger: Logger;
  embedConcurrency?: number;
}): { stop: () => void } {
  let running = true;
  let inFlight = false;
  let timerId: ReturnType<typeof setTimeout> | undefined;

  const concurrency = deps.embedConcurrency ?? DEFAULT_EMBED_CONCURRENCY;

  const processJob = async (job: IngestJobMessage, receiptHandle: string) => {
    // 1. Delete Action
    if (job.action === "delete") {
      await deps.opensearch.deleteBySource(job.workspace_id, job.source_id);
      await deps.queue.ack(receiptHandle);
      return;
    }

    const { workspace_id: workspaceId, source_id: sourceId, version: jobVersion } = job;

    // 2. Validate current source existence & version
    const source = await deps.repo.get(workspaceId, sourceId);
    if (!source) {
      // Source deleted before worker processed it; clean up any orphaned chunks
      await deps.opensearch.deleteBySource(workspaceId, sourceId);
      await deps.queue.ack(receiptHandle);
      return;
    }

    if (jobVersion !== undefined && jobVersion !== source.version) {
      // Stale job: a newer version was enqueued
      await deps.queue.ack(receiptHandle);
      return;
    }

    // 3. Version-conditional transition to 'processing'
    const claimed = await deps.repo.updateStatus(
      workspaceId,
      sourceId,
      "processing",
      {},
      jobVersion,
    );
    if (!claimed) {
      // Version mismatch or race condition
      await deps.queue.ack(receiptHandle);
      return;
    }

    // 4. Load extracted text
    const text = await loadSourceText(source, deps.contentStore);
    if (!text || !text.trim()) {
      await deps.repo.updateStatus(
        workspaceId,
        sourceId,
        "failed",
        { error_message: "Source content is empty or could not be loaded" },
        jobVersion,
      );
      await deps.queue.ack(receiptHandle);
      return;
    }

    // 5. Generate chunks with real coordinates
    const spans = chunkTextWithCoordinates(text);
    if (spans.length === 0) {
      await deps.repo.updateStatus(
        workspaceId,
        sourceId,
        "failed",
        { error_message: "No searchable chunks could be extracted" },
        jobVersion,
      );
      await deps.queue.ack(receiptHandle);
      return;
    }

    // 6. Embed chunks with bounded concurrency and deterministic chunk IDs
    const docs: ChunkDocument[] = await mapConcurrent(
      spans,
      concurrency,
      async (span, index) => {
        const hash = createHash("sha256")
          .update(`${workspaceId}:${sourceId}:v${jobVersion}:${index}`)
          .digest("hex")
          .slice(0, 16);
        const chunkId = `chk_${hash}`;

        const vector = await deps.embedder.embed(span.text);

        return {
          workspace_id: workspaceId,
          source_id: sourceId,
          source_version: jobVersion,
          chunk_id: chunkId,
          chunk_index: span.chunk_index,
          start_char: span.start_char,
          end_char: span.end_char,
          text: span.text,
          vector,
        };
      },
    );

    // 7. Bulk index to OpenSearch (with item-level verification)
    await deps.opensearch.indexChunks(docs);

    // 8. Re-check source before publishing Ready
    const finalCheck = await deps.repo.get(workspaceId, sourceId);
    if (!finalCheck || finalCheck.version !== jobVersion) {
      // Source was deleted or bumped while indexing; delete staged chunks
      await deps.opensearch.deleteBySource(workspaceId, sourceId, jobVersion);
      await deps.queue.ack(receiptHandle);
      return;
    }

    // 9. Publish Ready with indexed_version = jobVersion
    await deps.repo.updateStatus(
      workspaceId,
      sourceId,
      "ready",
      {
        chunk_count: docs.length,
        char_count: text.length,
        indexed_version: jobVersion,
        error_message: null,
      },
      jobVersion,
    );

    // 10. Clean up older superseded versions in OpenSearch
    if (jobVersion > 1) {
      await deps.opensearch.deleteOlderVersions(workspaceId, sourceId, jobVersion);
    }

    await deps.queue.ack(receiptHandle);
  };

  const tick = async () => {
    if (!running || inFlight) {
      return;
    }
    inFlight = true;
    let receiptHandle: string | undefined;
    let workspaceId: string | undefined;
    let sourceId: string | undefined;
    let jobVersion: number | undefined;

    try {
      const msg = await deps.queue.receive();
      if (!msg) {
        return;
      }
      receiptHandle = msg.receiptHandle;
      const { job } = msg;
      if (job.action === "ingest") {
        workspaceId = job.workspace_id;
        sourceId = job.source_id;
        jobVersion = job.version;
      }
      await processJob(job, receiptHandle);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      deps.logger.warn("ingest.worker.error", { error: message, workspaceId, sourceId });

      if (workspaceId && sourceId && jobVersion !== undefined) {
        try {
          await deps.repo.updateStatus(
            workspaceId,
            sourceId,
            "failed",
            { error_message: message.slice(0, 500) },
            jobVersion,
          );
        } catch {
          // secondary failure ignored
        }
      }
      if (receiptHandle) {
        try {
          await deps.queue.ack(receiptHandle);
        } catch {
          // ack failure ignored
        }
      }
    } finally {
      inFlight = false;
      if (running) {
        timerId = setTimeout(() => void tick(), deps.config.workerPollMs);
      }
    }
  };

  void deps.opensearch.ensureIndex();
  timerId = setTimeout(() => void tick(), deps.config.workerPollMs);

  return {
    stop: () => {
      running = false;
      if (timerId) {
        clearTimeout(timerId);
      }
    },
  };
}
