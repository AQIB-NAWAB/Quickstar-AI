import { AppError, ErrorCode } from "@quickstart/errors";
import { factTextDenied } from "../lib/denylist.js";
import {
  DEFAULT_FACTS_READ_LIMIT,
  MAX_FACT_KEY_LENGTH,
  MAX_FACT_TEXT_LENGTH,
  MAX_FACTS_PER_SUBJECT,
  MAX_FACTS_READ_LIMIT,
  MAX_SUBJECT_KEY_LENGTH,
} from "../lib/limits.js";
import type { FactsRepository, MemoryFactRow } from "../repository/facts.repository.js";

function normalizeSubjectKey(subjectKey: string): string {
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

function validateFactText(factText: string): string {
  const trimmed = factText.trim();
  if (!trimmed) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "fact_text is required",
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

function normalizeFactKey(factKey: string | undefined | null): string | null {
  if (factKey === undefined || factKey === null) {
    return null;
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

export class FactsService {
  constructor(private readonly repo: FactsRepository) {}

  async list(
    workspaceId: string,
    subjectKey: string,
    limit?: number,
  ): Promise<MemoryFactRow[]> {
    const subject = normalizeSubjectKey(subjectKey);
    const capped = Math.min(
      Math.max(limit ?? DEFAULT_FACTS_READ_LIMIT, 1),
      MAX_FACTS_READ_LIMIT,
    );
    return this.repo.list(workspaceId, subject, capped);
  }

  async create(
    workspaceId: string,
    actorId: string,
    input: { subject_key: string; fact_key?: string | null; fact_text: string },
  ): Promise<MemoryFactRow> {
    const subject = normalizeSubjectKey(input.subject_key);
    const factText = validateFactText(input.fact_text);
    const factKey = normalizeFactKey(input.fact_key);

    if (factKey) {
      return this.repo.upsertByFactKey({
        workspaceId,
        subjectKey: subject,
        factKey,
        factText,
        createdByActorId: actorId,
      });
    }

    const count = await this.repo.countForSubject(workspaceId, subject);
    if (count >= MAX_FACTS_PER_SUBJECT) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `Maximum ${MAX_FACTS_PER_SUBJECT} facts per subject`,
      });
    }

    return this.repo.insert({
      workspaceId,
      subjectKey: subject,
      factKey: null,
      factText,
      createdByActorId: actorId,
    });
  }

  async update(
    workspaceId: string,
    factId: string,
    input: { fact_text?: string; fact_key?: string | null },
  ): Promise<MemoryFactRow> {
    const existing = await this.repo.get(workspaceId, factId);
    if (!existing) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Memory fact not found",
      });
    }

    const factText = input.fact_text !== undefined ? validateFactText(input.fact_text) : undefined;
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
    const deleted = await this.repo.deleteOne(workspaceId, factId);
    if (!deleted) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Memory fact not found",
      });
    }
  }

  async deleteBySubject(workspaceId: string, subjectKey: string): Promise<{ deleted_count: number }> {
    const subject = normalizeSubjectKey(subjectKey);
    const deletedCount = await this.repo.deleteBySubject(workspaceId, subject);
    return { deleted_count: deletedCount };
  }
}
