import { createHash } from "node:crypto";
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
      required: Boolean(row.required),
    });
  }
  return out;
}

export function schemaUsesTelephony(schema: AudienceFieldDef[]): boolean {
  return schema.some((f) => f.role === "dial");
}

export function assertAudienceSchemaHasDial(schema: AudienceFieldDef[]): void {
  if (!schemaUsesTelephony(schema)) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "audience_schema must include one field with role=dial",
    });
  }
}

export function assertAudienceSchemaHasReachableContact(schema: AudienceFieldDef[]): void {
  if (schema.some((f) => f.role === "contact_email" || f.role === "identity")) return;
  throw new AppError({
    code: ErrorCode.VALIDATION_FAILED,
    message: "audience_schema must include identity or contact_email when telephony is disabled",
  });
}

/** Reserved +1555… E.164 when a target has no dialable phone (audience-only campaigns). */
export function syntheticDialFromKey(key: string): string {
  const digits = createHash("sha256").update(key).digest("hex").replace(/\D/g, "");
  const seven = (digits + "0000000").slice(0, 7);
  return `+1555${seven}`;
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
  options?: { telephonyRequired?: boolean },
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
  const telephonyRequired = options?.telephonyRequired ?? true;

  for (const row of rows) {
    const displayName = row.displayName?.trim() || null;
    const email = row.email?.trim() || null;
    let dialNormalized = normalizePhone(row.dialAddress ?? "");
    if (!isValidE164(dialNormalized)) {
      if (telephonyRequired) {
        invalidCount += 1;
        continue;
      }
      const identityKey =
        email?.toLowerCase() ||
        row.sourceRef?.trim() ||
        displayName?.toLowerCase() ||
        "";
      if (!identityKey) {
        invalidCount += 1;
        continue;
      }
      dialNormalized = syntheticDialFromKey(identityKey);
    }
    if (seen.has(dialNormalized)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(dialNormalized);
    const attributes = sanitizeAttributes(row.attributes, limits);
    if (!telephonyRequired && !isValidE164(normalizePhone(row.dialAddress ?? ""))) {
      attributes.telephony_mode = "none";
    }
    valid.push({
      dialAddress: dialNormalized,
      dialNormalized,
      displayName,
      email,
      attributes,
      sourceKind: row.sourceKind ?? "csv",
      sourceRef: row.sourceRef ?? null,
    });
  }

  return { valid, invalidCount, duplicateCount };
}
