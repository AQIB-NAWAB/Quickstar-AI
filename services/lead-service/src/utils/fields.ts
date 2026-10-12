import type { CapturedFields, LeadSentiment, LeadStatus } from "../domain/types.js";

const KEY_RE = /^[a-z][a-z0-9_]{0,63}$/;
const STATUSES = new Set<LeadStatus>(["new", "contacted", "qualified", "disqualified"]);
const SENTIMENTS = new Set<LeadSentiment>(["positive", "neutral", "negative", "unknown"]);

export function isLeadStatus(value: string): value is LeadStatus {
  return STATUSES.has(value as LeadStatus);
}

export function isLeadSentiment(value: string): value is LeadSentiment {
  return SENTIMENTS.has(value as LeadSentiment);
}

export function sanitizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const tag = String(item ?? "")
      .trim()
      .toLowerCase()
      .slice(0, 64);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= 30) break;
  }
  return out;
}

export function sanitizeCapturedFields(
  raw: unknown,
  limits: { maxKeys: number; maxValueLength: number },
): CapturedFields {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const entries = Object.entries(raw as Record<string, unknown>).slice(0, limits.maxKeys);
  const out: CapturedFields = {};
  for (const [rawKey, rawValue] of entries) {
    const key = rawKey
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 64);
    if (!key || !KEY_RE.test(key)) continue;
    if (rawValue === null) {
      out[key] = null;
      continue;
    }
    if (typeof rawValue === "number" || typeof rawValue === "boolean") {
      out[key] = rawValue;
      continue;
    }
    out[key] = String(rawValue).slice(0, limits.maxValueLength);
  }
  return out;
}

export function mergeCapturedFields(
  existing: CapturedFields,
  incoming: CapturedFields,
  limits: { maxKeys: number; maxValueLength: number },
): CapturedFields {
  return sanitizeCapturedFields({ ...existing, ...incoming }, limits);
}
