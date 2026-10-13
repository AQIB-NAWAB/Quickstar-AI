import type { LeadFieldDef, LeadFieldRole } from "../domain/types.js";

const KEY_RE = /^[a-z][a-z0-9_]{0,63}$/;

const ROLES = new Set<LeadFieldRole>([
  "identity",
  "contact_email",
  "contact_phone",
  "custom",
]);

/** Default schema compatible with today’s staff UI denorm columns. */
export function defaultLeadSchema(): LeadFieldDef[] {
  return [
    { key: "name", label: "Name", role: "identity", required: false },
    { key: "email", label: "Email", role: "contact_email", required: false },
    { key: "phone", label: "Phone", role: "contact_phone", required: false },
  ];
}

export function normalizeLeadSchema(raw: unknown): LeadFieldDef[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return defaultLeadSchema();
  }
  const out: LeadFieldDef[] = [];
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
    const role: LeadFieldRole = ROLES.has(roleRaw as LeadFieldRole)
      ? (roleRaw as LeadFieldRole)
      : "custom";
    out.push({
      key,
      label: String(row.label ?? key).slice(0, 120),
      role,
      required: Boolean(row.required),
    });
  }
  return out.length > 0 ? out : defaultLeadSchema();
}

export function leadSchemaToApi(schema: LeadFieldDef[]) {
  return schema.map((f) => ({
    key: f.key,
    label: f.label,
    role: f.role,
    required: Boolean(f.required),
  }));
}

/**
 * Project denorm contact columns from attributes using schema roles when
 * explicit first-class values are missing.
 */
export function projectDenormFromAttributes(
  schema: LeadFieldDef[],
  attributes: Record<string, string | number | boolean | null>,
  explicit: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  },
): { name: string | null; email: string | null; phone: string | null } {
  let name = explicit.name?.trim() || null;
  let email = explicit.email?.trim().toLowerCase() || null;
  let phone = explicit.phone?.trim() || null;

  for (const field of schema) {
    const raw = attributes[field.key];
    if (raw === undefined || raw === null) continue;
    const value = String(raw).trim();
    if (!value) continue;
    if (field.role === "identity" && !name) name = value.slice(0, 200);
    if (field.role === "contact_email" && !email) email = value.toLowerCase().slice(0, 320);
    if (field.role === "contact_phone" && !phone) phone = value.slice(0, 32);
  }

  // Also accept well-known keys even if schema was customized without roles.
  if (!name && attributes.name != null) name = String(attributes.name).trim().slice(0, 200) || null;
  if (!email && attributes.email != null) {
    email = String(attributes.email).trim().toLowerCase().slice(0, 320) || null;
  }
  if (!phone && attributes.phone != null) {
    phone = String(attributes.phone).trim().slice(0, 32) || null;
  }

  return { name, email, phone };
}

/** Build a label map for UI: attribute key → schema label (fallback: key). */
export function attributeLabels(schema: LeadFieldDef[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of schema) {
    out[f.key] = f.label;
  }
  return out;
}
