import type { CampaignTelephonyMode, WizardDraft } from "./types";

/** Effective telephony mode, including legacy drafts saved before the field existed. */
export function resolveTelephonyMode(draft: WizardDraft): CampaignTelephonyMode {
  if (draft.telephonyMode === "none") return "none";
  const hasDialColumn = draft.columnMappings.some((mapping) => mapping.role === "dial");
  if (!hasDialColumn && draft.validCount > 0) return "none";
  if (draft.telephonyMode === "required" || hasDialColumn) return "required";
  return "none";
}

export function isAudienceOnlyCampaign(draft: WizardDraft): boolean {
  return resolveTelephonyMode(draft) === "none";
}

export function mergeWizardDraft(stored: Partial<WizardDraft>): WizardDraft {
  const base: WizardDraft = {
    name: "",
    description: "",
    agentId: "",
    agentName: "",
    telephonyMode: "required",
    audienceSource: "csv",
    fileName: "",
    rowCount: 0,
    csvHeaders: [],
    parsedRows: [],
    columnMappings: [],
    mappedColumns: { phone: "", customFields: {} },
    parsedRowsPreview: [],
    preparedTargets: [],
    validCount: 0,
    invalidCount: 0,
    duplicateCount: 0,
    schedule: {
      startDate: new Date().toISOString().slice(0, 10),
      startTime: "09:00",
      timezone: "UTC",
      dailyWindowFrom: "09:00",
      dailyWindowTo: "17:00",
    },
    pacing: { maxConcurrentCalls: 10, maxCallStartsPerMinute: 30 },
    retryPolicy: {
      maxRetries: 2,
      retryIntervalMinutes: 30,
      eligibleOutcomes: ["no_answer", "busy", "transient_error"],
    },
    ...stored,
  };
  base.telephonyMode = resolveTelephonyMode(base);
  return base;
}
