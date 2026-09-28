import { AppError, ErrorCode } from "@quickstart/errors";
import { storageKeyForSource, type ContentStore } from "../lib/content-store.js";
import type { IngestQueue } from "../lib/sqs.js";
import type { KnowledgeSource, SourcesRepository } from "../repository/sources.repository.js";

export class SourcesService {
  constructor(
    private readonly repo: SourcesRepository,
    private readonly queue: IngestQueue,
    private readonly contentStore: ContentStore | null,
  ) {}

  async createSource(
    workspaceId: string,
    input: { name: string; content: string; kind?: string; contentType?: string },
  ) {
    const name = input.name?.trim();
    const content = input.content?.trim();
    if (!name) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Source name is required" });
    }
    if (!content) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Source content is required" });
    }
    const kind = input.kind?.trim() || "text";
    const contentType = input.contentType?.trim() || "text/plain";

    let storageKey: string | null = null;
    const source = await this.repo.createSource({
      workspaceId,
      name,
      kind,
      contentText: this.contentStore ? null : content,
      storageKey: null,
      contentType,
    });

    if (this.contentStore) {
      storageKey = storageKeyForSource(workspaceId, source.id, source.version);
      await this.contentStore.putObject(storageKey, Buffer.from(content, "utf8"), contentType);
      const stored = await this.repo.assignStorage(workspaceId, source.id, storageKey, contentType);
      await this.enqueueIngest(workspaceId, stored);
      return stored;
    }

    await this.enqueueIngest(workspaceId, source);
    return source;
  }

  async updateSource(
    workspaceId: string,
    sourceId: string,
    input: { name?: string; content?: string; contentType?: string },
  ) {
    const existing = await this.repo.get(workspaceId, sourceId);
    if (!existing) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Knowledge source not found" });
    }
    const name = input.name?.trim();
    const content = input.content?.trim();
    if (!name && !content) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Provide name or content to update",
      });
    }
    const nextVersion = existing.version + 1;
    const contentType = input.contentType?.trim() || existing.content_type || "text/plain";
    let storageKey = existing.storage_key;
    let contentText: string | null = existing.content_text;

    if (content !== undefined) {
      if (this.contentStore) {
        storageKey = storageKeyForSource(workspaceId, sourceId, nextVersion);
        await this.contentStore.putObject(storageKey, Buffer.from(content, "utf8"), contentType);
        contentText = null;
      } else {
        contentText = content;
        storageKey = null;
      }
    }

    const updated = await this.repo.updateForReingest(workspaceId, sourceId, {
      name,
      contentText,
      storageKey,
      contentType,
      version: nextVersion,
    });
    await this.enqueueIngest(workspaceId, updated);
    return updated;
  }

  async get(workspaceId: string, sourceId: string) {
    const source = await this.repo.get(workspaceId, sourceId);
    if (!source) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Knowledge source not found" });
    }
    if (this.contentStore && source.storage_key && !source.content_text) {
      try {
        const body = await this.contentStore.getObject(source.storage_key);
        return { ...source, content_text: body.toString("utf8") };
      } catch {
        return source;
      }
    }
    return source;
  }

  async list(workspaceId: string, limit?: number) {
    return this.repo.list(workspaceId, limit);
  }

  async delete(workspaceId: string, sourceId: string) {
    const removed = await this.repo.delete(workspaceId, sourceId);
    if (!removed) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Knowledge source not found" });
    }
    if (this.contentStore && removed.storage_key) {
      try {
        await this.contentStore.deleteObject(removed.storage_key);
      } catch {
        // best-effort; OpenSearch cleanup still runs via queue
      }
    }
    await this.queue.send({
      action: "delete",
      source_id: sourceId,
      workspace_id: workspaceId,
    });
    return { deleted: true };
  }

  async readyCount(workspaceId: string) {
    const count = await this.repo.countReady(workspaceId);
    return { ready_count: count };
  }

  private async enqueueIngest(workspaceId: string, source: KnowledgeSource) {
    await this.queue.send({
      action: "ingest",
      source_id: source.id,
      workspace_id: workspaceId,
      version: source.version,
    });
  }
}
