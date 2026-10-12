import { AppError, ErrorCode } from "@quickstart/errors";
import type { AudienceFieldDef, IncomingTarget } from "../domain/types.js";
import { isValidE164, normalizePhone } from "./phone.js";

const KEY_RE = /^[a-z][a-z0-9_]{0,63}$/;

export function normalizeAudienceSchema(raw: unknown): AudienceFieldDef[] {
  if (!Array.isArray(raw)) return [];
  const out: AudienceFieldDef[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const key = String(row.key ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (!key || !KEY_RE.test(key) || seen.has(key)) continue;
    seen.add(key);
    const roleRaw = String(row.role ?? "custom");
    const role =
      roleRaw === "dial" || roleRaw === "identity" || roleRaw === "contact_email"
        ? roleRaw
        : "custom";
    out.push({
      key,
      label: String(row.label ?? key),
      role,
      sourceColumn:
        typeof row.source_column === "string"
          ? row.source_column
          : typeof row.sourceColumn === "string"
            ? row.sourceColumn
            : undefined,
      required: Boolean(row.required) || role === "dial",
    });
  }
  return out;
}

export function assertAudienceSchemaHasDial(schema: AudienceFieldDef[]): void {
  if (!schema.some((f) => f.role === "dial")) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "audience_schema must include one field with role=dial",
    });
  }
}

export function sanitizeAttributes(
  attributes: Record<string, string> | undefined,
  limits: { maxKeys: number; maxValueLength: number },
): Record<string, string> {
  if (!attributes) return {};
  const entries = Object.entries(attributes).slice(0, limits.maxKeys);
  const out: Record<string, string> = {};
  for (const [rawKey, rawValue] of entries) {
    const key = rawKey
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 64);
    if (!key || !KEY_RE.test(key)) continue;
    out[key] = String(rawValue ?? "").slice(0, limits.maxValueLength);
  }
  return out;
}

export function normalizeIncomingTargets(
  rows: IncomingTarget[],
  limits: { maxKeys: number; maxValueLength: number },
): {
  valid: Array<{
    dialAddress: string;
    dialNormalized: string;
    displayName: string | null;
    email: string | null;
    attributes: Record<string, string>;
    sourceKind: "csv" | "lead" | "api";
    sourceRef: string | null;
  }>;
  invalidCount: number;
  duplicateCount: number;
} {
  const valid: Array<{
    dialAddress: string;
    dialNormalized: string;
    displayName: string | null;
    email: string | null;
    attributes: Record<string, string>;
    sourceKind: "csv" | "lead" | "api";
    sourceRef: string | null;
  }> = [];
  const seen = new Set<string>();
  let invalidCount = 0;
  let duplicateCount = 0;

  for (const row of rows) {
    const dialNormalized = normalizePhone(row.dialAddress ?? "");
    if (!isValidE164(dialNormalized)) {
      invalidCount += 1;
      continue;
    }
    if (seen.has(dialNormalized)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(dialNormalized);
    valid.push({
      dialAddress: dialNormalized,
      dialNormalized,
      displayName: row.displayName?.trim() || null,
      email: row.email?.trim() || null,
      attributes: sanitizeAttributes(row.attributes, limits),
      sourceKind: row.sourceKind ?? "csv",
      sourceRef: row.sourceRef ?? null,
    });
  }

  return { valid, invalidCount, duplicateCount };
}
