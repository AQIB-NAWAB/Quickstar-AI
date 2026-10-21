import { AppError, ErrorCode } from "@quickstart/errors";
import { factTextDenied } from "../lib/denylist.js";
import {
  DEFAULT_FACTS_READ_LIMIT,
  DEFAULT_INTERNAL_FACTS_READ_LIMIT,
  MAX_FACT_KEY_LENGTH,
  MAX_FACT_TEXT_LENGTH,
  MAX_FACTS_READ_LIMIT,
  MAX_INTERNAL_FACTS_READ_LIMIT,
  MAX_SUBJECT_KEY_LENGTH,
} from "../lib/limits.js";
import type { FactsRepository, MemoryFactRow } from "../repository/facts.repository.js";

export type ListFactsResult = MemoryFactRow[] & {
  facts: MemoryFactRow[];
  total: number;
};

function normalizeSubjectKey(subjectKey: unknown): string {
  if (typeof subjectKey !== "string") {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "subject_key must be a string",
    });
  }
  const trimmed = subjectKey.trim();
  if (!trimmed) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "subject_key is required",
    });
  }
  if (trimmed.length > MAX_SUBJECT_KEY_LENGTH) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: `subject_key must be at most ${MAX_SUBJECT_KEY_LENGTH} characters`,
    });
  }
  return trimmed;
}

function validateFactText(factText: unknown): string {
  if (typeof factText !== "string") {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "fact_text must be a string",
    });
  }
  const trimmed = factText.trim();
  if (!trimmed) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "fact_text cannot be empty",
    });
  }
  if (trimmed.length > MAX_FACT_TEXT_LENGTH) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: `fact_text must be at most ${MAX_FACT_TEXT_LENGTH} characters`,
    });
  }
  if (factTextDenied(trimmed)) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "fact_text contains disallowed secret-like content",
    });
  }
  return trimmed;
}

function normalizeFactKey(factKey: unknown): string | null {
  if (factKey === undefined || factKey === null) {
    return null;
  }
  if (typeof factKey !== "string") {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "fact_key must be a string or null",
    });
  }
  const trimmed = factKey.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length > MAX_FACT_KEY_LENGTH) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: `fact_key must be at most ${MAX_FACT_KEY_LENGTH} characters`,
    });
  }
  return trimmed;
}

function parseReadLimit(limit: unknown, defaultLimit: number, maxLimit: number): number {
  if (limit === undefined || limit === null || limit === "") {
    return defaultLimit;
  }
  if (typeof limit === "number") {
    if (!Number.isFinite(limit) || !Number.isInteger(limit) || limit <= 0) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "limit must be a finite positive integer",
      });
    }
    return Math.min(limit, maxLimit);
  }
  if (typeof limit === "string") {
    const trimmed = limit.trim();
    if (!/^\d+$/.test(trimmed)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "limit must be a finite positive integer",
      });
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "limit must be a finite positive integer",
      });
    }
    return Math.min(parsed, maxLimit);
  }
  throw new AppError({
    code: ErrorCode.VALIDATION_FAILED,
    message: "limit must be a finite positive integer",
  });
}

export class FactsService {
  constructor(private readonly repo: FactsRepository) {}

  async list(
    workspaceId: string,
    subjectKey: string,
    limit?: unknown,
  ): Promise<ListFactsResult> {
    const subject = normalizeSubjectKey(subjectKey);
    const parsedLimit = parseReadLimit(limit, DEFAULT_FACTS_READ_LIMIT, MAX_FACTS_READ_LIMIT);
    const [rows, total] = await Promise.all([
      this.repo.list(workspaceId, subject, parsedLimit),
      this.repo.countForSubject(workspaceId, subject),
    ]);

    const result = Object.assign([...rows], {
      facts: rows,
      total,
    }) as ListFactsResult;

    return result;
  }

  async listInternal(
    workspaceId: string,
    subjectKey: string,
    limit?: unknown,
  ): Promise<ListFactsResult> {
    const subject = normalizeSubjectKey(subjectKey);
    const parsedLimit = parseReadLimit(
      limit,
      DEFAULT_INTERNAL_FACTS_READ_LIMIT,
      MAX_INTERNAL_FACTS_READ_LIMIT,
    );
    const [rows, total] = await Promise.all([
      this.repo.list(workspaceId, subject, parsedLimit),
      this.repo.countForSubject(workspaceId, subject),
    ]);

    const result = Object.assign([...rows], {
      facts: rows,
      total,
    }) as ListFactsResult;

    return result;
  }

  async create(
    workspaceId: string,
    actorId: string,
    input: { subject_key: unknown; fact_key?: unknown; fact_text: unknown },
  ): Promise<MemoryFactRow> {
    const subject = normalizeSubjectKey(input.subject_key);
    const factText = validateFactText(input.fact_text);
    const factKey = normalizeFactKey(input.fact_key);

    return this.repo.createAtomic({
      workspaceId,
      subjectKey: subject,
      factKey,
      factText,
      createdByActorId: actorId,
    });
  }

  async update(
    workspaceId: string,
    factId: string,
    input: { fact_text?: unknown; fact_key?: unknown },
  ): Promise<MemoryFactRow> {
    if (!factId || typeof factId !== "string") {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Valid fact ID required",
      });
    }

    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Request body must be an object",
      });
    }

    if (input.fact_text === undefined && input.fact_key === undefined) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "At least one field (fact_text or fact_key) must be provided for update",
      });
    }

    const existing = await this.repo.get(workspaceId, factId);
    if (!existing) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Memory fact not found",
      });
    }

    const factText =
      input.fact_text !== undefined ? validateFactText(input.fact_text) : undefined;
    const factKey =
      input.fact_key !== undefined ? normalizeFactKey(input.fact_key) : undefined;

    const updated = await this.repo.update(workspaceId, factId, {
      factText,
      factKey,
    });

    if (!updated) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Memory fact not found",
      });
    }
    return updated;
  }

  async deleteOne(workspaceId: string, factId: string): Promise<void> {
    if (!factId || typeof factId !== "string") {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Valid fact ID required",
      });
    }
    const deleted = await this.repo.deleteOne(workspaceId, factId);
    if (!deleted) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Memory fact not found",
      });
    }
  }

  async deleteBySubject(
    workspaceId: string,
    subjectKey: unknown,
  ): Promise<{ deleted_count: number }> {
    const subject = normalizeSubjectKey(subjectKey);
    const deletedCount = await this.repo.deleteBySubject(workspaceId, subject);
    return { deleted_count: deletedCount };
  }
}
