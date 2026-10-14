import { createHash } from "node:crypto";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { BusinessInput, LeadRunInput, LeadPolicy } from "@quickstart/contracts";

export const DEFAULT_POLICY: LeadPolicy = {
  enabled: true,
  subscription_limits_enabled: false,
  max_categories: 5,
  max_queued_runs: 10,
  max_active_tasks: 2,
  daily_runs: 50,
  daily_units: 2000,
  daily_tokens: 3_000_000,
  scheduling_weight: 1,
  max_rounds: 3,
  max_candidates: 100,
  max_target_count: 100,
  run_deadline_seconds: 1800,
  request_rate_per_minute: 600,
  min_fit_score: 70,
};
export function fail(message: string, code: ErrorCode = ErrorCode.VALIDATION_FAILED): never {
  throw new AppError({ code, message });
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("JSON object required");
  return value as Record<string, unknown>;
}
export function text(value: unknown, name: string, max = 2000, optional = false): string {
  if (optional && (value === undefined || value === "")) return "";
  if (typeof value !== "string" || !value.trim() || value.length > max)
    fail(`${name}: non-empty string, maximum ${max} characters`);
  return value.trim();
}
export function strings(value: unknown, name: string, max = 20): string[] {
  if (!Array.isArray(value) || value.length > max) fail(`${name}: array, maximum ${max} items`);
  return [...new Set(value.map((v) => text(v, name, 200)))];
}
export function integer(value: unknown, name: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max)
    fail(`${name}: integer between ${min} and ${max}`);
  return value;
}
export function uuid(value: unknown): string {
  const v = text(value, "id", 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v))
    fail("Valid UUID required");
  return v;
}
export function normalizeWebsite(value: unknown): string {
  const raw = text(value, "website", 2048);
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return fail("Valid website URL required");
  }
  if (
    !["https:", "http:"].includes(u.protocol) ||
    u.username ||
    u.password ||
    !u.hostname ||
    (u.port && !["80", "443"].includes(u.port))
  )
    fail("Only public HTTP(S) websites on standard ports are supported");
  u.hash = "";
  return u.href;
}
export function domain(url: string): string {
  return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
}
export function businessInput(value: unknown): BusinessInput {
  const b = object(value);
  return {
    name: text(b.name, "name", 200),
    website: normalizeWebsite(b.website),
    description: text(b.description, "description", 5000),
    offerings: strings(b.offerings, "offerings"),
    target_categories: strings(b.target_categories ?? [], "target_categories"),
    locations: strings(b.locations ?? [], "locations"),
  };
}
export function runInput(value: unknown): LeadRunInput {
  const b = object(value);
  const categories = strings(b.categories, "categories", 20);
  if (!categories.length) fail("Select at least one category");
  const contact = b.required_contact ?? "none";
  if (!["none", "email", "phone"].includes(String(contact))) fail("Invalid required_contact");
  const exclusions = strings(b.excluded_domains ?? [], "excluded_domains", 100).map((x) =>
    domain(normalizeWebsite(x.includes("://") ? x : `https://${x}`)),
  );
  return {
    categories,
    location: text(b.location, "location", 200, true),
    company_size: text(b.company_size, "company_size", 100, true),
    contact_role: text(b.contact_role, "contact_role", 100, true),
    instructions: text(b.instructions, "instructions", 2000, true),
    excluded_domains: exclusions,
    required_contact: contact as LeadRunInput["required_contact"],
    target_count: integer(b.target_count ?? 20, "target_count", 1, 1000),
    ...(b.campaign_id ? { campaign_id: uuid(b.campaign_id) } : {}),
  };
}
export function policyInput(value: unknown): LeadPolicy {
  const b = object(value);
  for (const k of Object.keys(b)) if (!(k in DEFAULT_POLICY)) fail(`Unknown policy setting: ${k}`);
  const p = { ...DEFAULT_POLICY, ...b } as LeadPolicy;
  if (typeof p.enabled !== "boolean" || typeof p.subscription_limits_enabled !== "boolean")
    fail("Policy flags must be booleans");
  for (const key of Object.keys(DEFAULT_POLICY) as Array<keyof LeadPolicy>) {
    if (typeof DEFAULT_POLICY[key] === "number")
      integer(
        p[key],
        key,
        key === "min_fit_score" ? 0 : 1,
        key === "min_fit_score" ? 100 : key === "scheduling_weight" ? 10 : key === "daily_tokens" ? 10_000_000 : 1_000_000,
      );
  }
  if (
    p.max_active_tasks > 100 ||
    p.max_categories > 20 ||
    p.max_rounds > 10 ||
    p.max_candidates > 1000 ||
    p.max_target_count > 1000 ||
    p.run_deadline_seconds > 86400
  )
    fail("Policy exceeds technical safety ceilings");
  return p;
}
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, stable(v)]),
    );
  return value;
}
export function fingerprint(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(stable(value)))
    .digest("hex");
}
export function key(value: unknown): string {
  return text(value, "Idempotency-Key", 128);
}
