import type { LeadGenerationCandidateResult } from "../../lead-generation/lib/types";
import { validateAudienceWithMappings } from "./csv";
import { normalizePhone } from "./format";
import type { CampaignTelephonyMode, ColumnMapping, WizardDraft } from "./types";

export type RunLeadRow = {
  id: string;
  company: string;
  phone: string;
  email: string;
  location: string;
  website: string;
  category: string;
  dialable: boolean;
  skipReason: string | null;
};

function leadMappings(telephonyMode: CampaignTelephonyMode): ColumnMapping[] {
  const base: ColumnMapping[] = [
    { sourceColumn: "company", key: "name", role: "identity" },
    { sourceColumn: "email", key: "email", role: "contact_email" },
    { sourceColumn: "location", key: "location", role: "custom" },
    { sourceColumn: "website", key: "website", role: "custom" },
    { sourceColumn: "category", key: "category", role: "custom" },
  ];
  if (telephonyMode === "required") {
    return [{ sourceColumn: "phone", key: "phone", role: "dial" }, ...base];
  }
  return base;
}

function leadSelectable(lead: RunLeadRow, telephonyMode: CampaignTelephonyMode): boolean {
  if (telephonyMode === "required") return lead.dialable;
  return Boolean(lead.company.trim() || lead.email.trim());
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function runLeadRows(items: LeadGenerationCandidateResult[]): RunLeadRow[] {
  return items
    .filter((item) => item.status === "accepted")
    .map((item) => {
      const assessment = item.assessment;
      const phone = asText(assessment?.phone);
      const normalized = phone ? normalizePhone(phone) : "";
      const dialable = /^\+[1-9]\d{6,14}$/.test(normalized);
      return {
        id: item.id,
        company: asText(assessment?.company_name) || asText(item.url) || "Accepted lead",
        phone,
        email: asText(assessment?.email),
        location: asText(assessment?.location),
        website: asText(assessment?.website) || asText(item.url),
        category: asText(assessment?.category),
        dialable,
        skipReason: !phone
          ? "No phone on this lead"
          : dialable
            ? null
            : "Phone needs a country code, for example +92…",
      };
    });
}

export function leadRunDraftPatch(
  runId: string,
  runLabel: string,
  leads: RunLeadRow[],
  selectedIds: string[],
  telephonyMode: CampaignTelephonyMode = "required",
): Partial<WizardDraft> {
  const selected = new Set(selectedIds);
  const chosen = leads.filter(
    (lead) => selected.has(lead.id) && leadSelectable(lead, telephonyMode),
  );
  const mappings = leadMappings(telephonyMode);
  const rows = chosen.map((lead) => ({
    phone: lead.phone,
    company: lead.company,
    email: lead.email,
    location: lead.location,
    website: lead.website,
    category: lead.category,
  }));
  const validation = validateAudienceWithMappings(rows, mappings, { telephonyMode });
  return {
    audienceSource: "lead_run",
    leadRunId: runId,
    selectedLeadIds: chosen.map((lead) => lead.id),
    fileName: runLabel,
    rowCount: leads.length,
    csvHeaders: mappings.map((mapping) => mapping.sourceColumn),
    parsedRows: rows,
    columnMappings: mappings,
    mappedColumns: {
      phone: telephonyMode === "required" ? "phone" : "",
      name: "company",
      email: "email",
      customFields: {
        location: "location",
        website: "website",
        category: "category",
      },
    },
    parsedRowsPreview: validation.prepared.slice(0, 5).map((row) => ({
      phone: row.phone,
      name: row.name ?? undefined,
      email: row.email ?? undefined,
      customFields: row.attributes,
    })),
    preparedTargets: validation.prepared.map((row, index) => ({
      phone: row.phone,
      name: row.name,
      email: row.email,
      attributes: row.attributes,
      sourceRef: chosen[index]?.id ?? null,
    })),
    validCount: validation.validCount,
    invalidCount:
      validation.invalidCount +
      leads.filter((lead) => !leadSelectable(lead, telephonyMode)).length,
    duplicateCount: validation.duplicateCount,
  };
}
