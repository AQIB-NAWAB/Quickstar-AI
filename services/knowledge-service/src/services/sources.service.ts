import { AppError, ErrorCode } from "@quickstart/errors";
import {
  rawStorageKeyForSource,
  storageKeyForSource,
  type ContentStore,
} from "../lib/content-store.js";
import { extractDocumentText } from "../lib/extract.js";
import type { OpenSearchClient } from "../lib/opensearch.js";
import type { IngestQueue } from "../lib/sqs.js";
import { importPublicUrl } from "../lib/url-import.js";
import type {
  KnowledgeSource,
  ListSourcesOptions,
  ListSourcesResult,
  SourcesRepository,
} from "../repository/sources.repository.js";

export const MAX_PLAIN_TEXT_CHARACTERS = 50_000;

export class SourcesService {
  constructor(
    private readonly repo: SourcesRepository,
    private readonly queue: IngestQueue,
    private readonly contentStore: ContentStore | null,
    private readonly opensearch?: OpenSearchClient,
  ) {}

  async createSource(
    workspaceId: string,
    input: {
      name?: string;
      content?: string;
      type?: string;
      content_type?: string;
      url?: string;
    },
  ): Promise<KnowledgeSource> {
    const rawType = (input.type || "text").toLowerCase().trim();

    // 1. URL Source Creation
    if (rawType === "url") {
      const targetUrl = (input.url || input.content || "").trim();
      if (!targetUrl) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "Public web page URL is required",
        });
      }

      const imported = await importPublicUrl(targetUrl);
      const name = input.name?.trim() || imported.title || "Web page";

      let storageKey: string | null = null;
      const source = await this.repo.createSource({
        workspaceId,
        name,
        kind: "url",
        contentText: this.contentStore ? null : imported.text,
        storageKey: null,
        contentType: "text/plain",
        sourceUrl: imported.url,
        charCount: imported.charCount,
      });

      if (this.contentStore) {
        storageKey = storageKeyForSource(workspaceId, source.id, source.version);
        await this.contentStore.putObject(
          storageKey,
          Buffer.from(imported.text, "utf8"),
          "text/plain; charset=utf-8",
        );
        const stored = await this.repo.assignStorage(
          workspaceId,
          source.id,
          storageKey,
          "text/plain; charset=utf-8",
          null,
          imported.charCount,
        );
        await this.enqueueIngest(workspaceId, stored);
        return stored;
      }

      await this.enqueueIngest(workspaceId, source);
      return source;
    }

    // 2. Plain Text Source Creation
    const name = input.name?.trim();
    const content = input.content?.trim();

    if (!name) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Source name is required",
      });
    }
    if (name.length > 255) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Source name must be 255 characters or less",
      });
    }
    if (!content) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Source content is required",
      });
    }
    if (content.length > MAX_PLAIN_TEXT_CHARACTERS) {
      throw new AppError({
        code: "CONTENT_TOO_LARGE" as any,
        message: `Plain text content exceeds the 50,000 character limit (${content.length.toLocaleString()} characters)`,
      });
    }

    const kind = rawType === "document" || rawType === "file" ? "document" : "text";
    const contentType = input.content_type?.trim() || "text/plain; charset=utf-8";

    let storageKey: string | null = null;
    const source = await this.repo.createSource({
      workspaceId,
      name,
      kind,
      contentText: this.contentStore ? null : content,
      storageKey: null,
      contentType,
      charCount: content.length,
    });

    if (this.contentStore) {
      storageKey = storageKeyForSource(workspaceId, source.id, source.version);
      await this.contentStore.putObject(
        storageKey,
        Buffer.from(content, "utf8"),
        contentType,
      );
      const stored = await this.repo.assignStorage(
        workspaceId,
        source.id,
        storageKey,
        contentType,
        null,
        content.length,
      );
      await this.enqueueIngest(workspaceId, stored);
      return stored;
    }

    await this.enqueueIngest(workspaceId, source);
    return source;
  }

  async uploadSource(
    workspaceId: string,
    input: {
      name?: string;
      fileName: string;
      buffer: Buffer;
      mimeType: string;
    },
  ): Promise<KnowledgeSource> {
    const fileName = input.fileName?.trim() || "document";
    const isRichDoc =
      fileName.endsWith(".pdf") || fileName.endsWith(".docx") || input.buffer.length > 50 * 1024;

    let extractionText: string | null = null;
    let charCount = 0;

    try {
      const extraction = await extractDocumentText(input.buffer, fileName, input.mimeType);
      extractionText = extraction.text;
      charCount = extraction.charCount;
    } catch (err: unknown) {
      if (!isRichDoc) {
        throw err;
      }
    }

    const derivedName =
      input.name?.trim() || fileName.replace(/\.[^/.]+$/, "") || "Uploaded Document";

    let storageKey: string | null = null;
    let rawStorageKey: string | null = null;

    const source = await this.repo.createSource({
      workspaceId,
      name: derivedName,
      kind: "file",
      contentText: this.contentStore ? null : extractionText,
      storageKey: null,
      contentType: "text/plain; charset=utf-8",
      fileName,
      fileSizeBytes: input.buffer.length,
      charCount,
    });

    if (this.contentStore) {
      storageKey = storageKeyForSource(workspaceId, source.id, source.version);
      rawStorageKey = rawStorageKeyForSource(workspaceId, source.id, source.version, fileName);

      // Store raw binary upload
      await this.contentStore.putObject(
        rawStorageKey,
        input.buffer,
        input.mimeType || "application/octet-stream",
      );

      if (extractionText) {
        // Store extracted normalized text for indexing & inspection
        await this.contentStore.putObject(
          storageKey,
          Buffer.from(extractionText, "utf8"),
          "text/plain; charset=utf-8",
        );
      }

      const stored = await this.repo.assignStorage(
        workspaceId,
        source.id,
        storageKey,
        "text/plain; charset=utf-8",
        rawStorageKey,
        charCount,
      );

      if (extractionText) {
        await this.enqueueIngest(workspaceId, stored);
      } else {
        // Enqueue into asynchronous extraction queue
        await this.repo.enqueueExtraction(workspaceId, source.id);
      }
      return stored;
    }

    if (extractionText) {
      await this.enqueueIngest(workspaceId, source);
    } else {
      await this.repo.enqueueExtraction(workspaceId, source.id);
    }
    return source;
  }

  async updateSource(
    workspaceId: string,
    sourceId: string,
    input: { name?: string; content?: string; contentType?: string },
  ): Promise<KnowledgeSource> {
    const existing = await this.repo.get(workspaceId, sourceId);
    if (!existing) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Knowledge source not found",
      });
    }

    const name = input.name?.trim();
    const content = input.content?.trim();

    if (!name && content === undefined) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Provide name or content to update",
      });
    }

    // 1. Metadata-only rename: Avoids re-embedding or touching chunks!
    if (content === undefined && name) {
      const renamed = await this.repo.updateName(workspaceId, sourceId, name);
      if (!renamed) {
        throw new AppError({
          code: ErrorCode.NOT_FOUND,
          message: "Knowledge source not found",
        });
      }
      return renamed;
    }

    // 2. Content update: Requires re-indexing with incremented version
    if (content && content.length > MAX_PLAIN_TEXT_CHARACTERS) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `Plain text content exceeds the 50,000 character limit (${content.length.toLocaleString()} characters)`,
      });
    }

    const nextVersion = existing.version + 1;
    const contentType =
      input.contentType?.trim() || existing.content_type || "text/plain; charset=utf-8";
    let storageKey = existing.storage_key;
    let contentText: string | null = existing.content_text;

    if (content !== undefined) {
      if (this.contentStore) {
        storageKey = storageKeyForSource(workspaceId, sourceId, nextVersion);
        await this.contentStore.putObject(
          storageKey,
          Buffer.from(content, "utf8"),
          contentType,
        );
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
      charCount: content !== undefined ? content.length : existing.char_count,
    });

    await this.enqueueIngest(workspaceId, updated);
    return updated;
  }

  async get(workspaceId: string, sourceId: string): Promise<KnowledgeSource> {
    const source = await this.repo.get(workspaceId, sourceId);
    if (!source) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Knowledge source not found",
      });
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

  async list(workspaceId: string, options: ListSourcesOptions = {}): Promise<ListSourcesResult> {
    return this.repo.list(workspaceId, options);
  }

  async listChunks(
    workspaceId: string,
    sourceId: string,
    options: { limit?: number; cursor?: string } = {},
  ) {
    const source = await this.repo.get(workspaceId, sourceId);
    if (!source) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Knowledge source not found",
      });
    }

    if (!this.opensearch) {
      return {
        source_id: source.id,
        source_version: source.indexed_version || source.version,
        chunk_count: 0,
        chunks: [],
        next_cursor: null,
      };
    }

    const versionToQuery = source.indexed_version > 0 ? source.indexed_version : source.version;
    const result = await this.opensearch.listSourceChunks(
      workspaceId,
      sourceId,
      versionToQuery,
      options.limit ?? 20,
      options.cursor,
    );

    return {
      source_id: source.id,
      source_version: versionToQuery,
      chunk_count: result.chunk_count,
      chunks: result.chunks,
      next_cursor: result.next_cursor,
    };
  }

  async delete(workspaceId: string, sourceId: string): Promise<{ deleted: boolean }> {
    const removed = await this.repo.delete(workspaceId, sourceId);
    if (!removed) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Knowledge source not found",
      });
    }

    // Clean up stored content objects
    if (this.contentStore) {
      if (removed.storage_key) {
        try {
          await this.contentStore.deleteObject(removed.storage_key);
        } catch {
          // best-effort cleanup
        }
      }
      if (removed.raw_storage_key) {
        try {
          await this.contentStore.deleteObject(removed.raw_storage_key);
        } catch {
          // best-effort cleanup
        }
      }
    }

    // Queue asynchronous OpenSearch index cleanup
    await this.queue.send({
      action: "delete",
      source_id: sourceId,
      workspace_id: workspaceId,
    });

    return { deleted: true };
  }

  async readyCount(workspaceId: string): Promise<{ ready_count: number }> {
    const count = await this.repo.countReady(workspaceId);
    return { ready_count: count };
  }

  async enqueueIngest(workspaceId: string, source: KnowledgeSource): Promise<void> {
    await this.queue.send({
      action: "ingest",
      source_id: source.id,
      workspace_id: workspaceId,
      version: source.version,
    });
  }
}
