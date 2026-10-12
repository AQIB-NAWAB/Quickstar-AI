export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "running"
  | "paused"
  | "completed"
  | "failed";

export type ContactStatus =
  | "pending"
  | "calling"
  | "answered"
  | "no_answer"
  | "retrying"
  | "voicemail"
  | "opted_out"
  | "failed";

export interface CampaignMetrics {
  eligibleContacts: number;
  completedContacts: number;
  answeredContacts: number;
  answerRate: number; // e.g. 75 for 75%
  avgAnsweredDurationSeconds: number; // e.g. 138 (2m 18s)
  activeCalls: number;
  queuedContacts: number;
  retryingContacts: number; // subset of queued
  startedAttempts: number;
}

export interface CallActivityBucket {
  hourLabel: string; // e.g. "09:00"
  attempts: number;
}

export interface CampaignSchedule {
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  timezone: string; // "UTC"
  dailyWindowFrom: string; // "09:00"
  dailyWindowTo: string; // "17:00"
}

export interface CampaignPacing {
  maxConcurrentCalls: number; // e.g. 10
  maxCallStartsPerMinute: number; // e.g. 30
}

export interface CampaignRetryPolicy {
  maxRetries: number; // e.g. 2
  retryIntervalMinutes: number; // e.g. 30
  eligibleOutcomes: string[];
}

export interface CampaignSummary {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  agentId: string;
  agentName: string;
  status: CampaignStatus;
  eligibleContacts: number;
  completedContacts: number;
  answerRate: number | null; // e.g. 75 for 75%
  scheduledStart: string | null; // ISO UTC
  createdAt: string;
  updatedAt: string;
  version?: number;
}

export type AudienceFieldRole = "dial" | "identity" | "contact_email" | "custom";

export interface AudienceFieldDef {
  key: string;
  label: string;
  role: AudienceFieldRole;
  sourceColumn?: string;
  required?: boolean;
}

export interface CampaignDetail extends CampaignSummary {
  audienceSchema: AudienceFieldDef[];
  schedule: CampaignSchedule;
  pacing: CampaignPacing;
  retryPolicy: CampaignRetryPolicy;
  metrics: CampaignMetrics;
  activityBuckets: CallActivityBucket[];
}

export interface CampaignContact {
  id: string;
  campaignId: string;
  name: string | null;
  phone: string;
  email: string | null;
  /** Arbitrary mapped CSV/API fields (not limited to fixed columns). */
  customFields?: Record<string, string>;
  attributes?: Record<string, string>;
  status: ContactStatus;
  attemptsCount: number;
  lastAttemptAt: string | null; // ISO UTC
  outcome: string | null;
}

export interface ContactAttempt {
  id: string;
  contactId: string;
  campaignId: string;
  callId: string | null;
  attemptNumber: number;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  status: "answered" | "no_answer" | "busy" | "failed" | "in_progress";
  outcome: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface OutboundCall {
  id: string;
  workspaceId: string;
  campaignId: string;
  campaignName: string;
  contactId: string;
  contactName: string | null;
  phone: string;
  agentName: string;
  startedAt: string;
  durationSeconds: number | null;
  status: "completed" | "failed" | "live";
  outcome: string;
  transcript?: {
    speaker: "agent" | "contact";
    text: string;
    timestamp: string;
  }[];
}

export interface ColumnMapping {
  /** CSV header name */
  sourceColumn: string;
  /** Stable attribute key stored on the target */
  key: string;
  role: AudienceFieldRole;
}

export interface WizardDraft {
  name: string;
  description: string;
  agentId: string;
  agentName: string;
  audienceSource: "csv" | "saved_list";
  fileName?: string;
  rowCount?: number;
  /** All headers discovered from the uploaded CSV */
  csvHeaders: string[];
  /** Full parsed rows retained for remapping without re-upload */
  parsedRows: Record<string, string>[];
  /** Role mapping for any header — not limited to phone/name/email */
  columnMappings: ColumnMapping[];
  /** @deprecated Prefer columnMappings; kept for preview fixtures */
  mappedColumns: {
    phone: string;
    name?: string;
    email?: string;
    customFields?: Record<string, string>;
  };
  parsedRowsPreview: {
    phone: string;
    name?: string;
    email?: string;
    customFields?: Record<string, string>;
  }[];
  /** Full validated rows ready to POST as targets (attributes flexible). */
  preparedTargets: {
    phone: string;
    name?: string | null;
    email?: string | null;
    attributes: Record<string, string>;
  }[];
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  schedule: CampaignSchedule;
  pacing: CampaignPacing;
  retryPolicy: CampaignRetryPolicy;
}

export type RepositoryResult<T> =
  | { status: "ready"; data: T }
  | { status: "unavailable"; message: string }
  | { status: "forbidden"; message: string }
  | { status: "not_found"; message: string }
  | { status: "conflict"; message: string }
  | { status: "error"; message: string };

export interface CampaignRepository {
  listCampaigns(
    workspaceId: string,
    filters?: { q?: string; status?: string },
    signal?: AbortSignal
  ): Promise<RepositoryResult<CampaignSummary[]>>;

  getCampaign(
    workspaceId: string,
    campaignId: string,
    signal?: AbortSignal
  ): Promise<RepositoryResult<CampaignDetail>>;

  listContacts(
    workspaceId: string,
    campaignId: string,
    filters?: { q?: string; status?: string },
    signal?: AbortSignal
  ): Promise<RepositoryResult<CampaignContact[]>>;

  getContact(
    workspaceId: string,
    campaignId: string,
    contactId: string,
    signal?: AbortSignal
  ): Promise<RepositoryResult<{ contact: CampaignContact; attempts: ContactAttempt[] }>>;

  listAttempts(
    workspaceId: string,
    campaignId: string,
    signal?: AbortSignal
  ): Promise<RepositoryResult<ContactAttempt[]>>;

  listOutboundCalls(
    workspaceId: string,
    signal?: AbortSignal
  ): Promise<RepositoryResult<OutboundCall[]>>;

  getOutboundCall(
    workspaceId: string,
    callId: string,
    signal?: AbortSignal
  ): Promise<RepositoryResult<OutboundCall>>;

  saveDraft(
    workspaceId: string,
    draft: WizardDraft
  ): Promise<RepositoryResult<CampaignSummary>>;

  pauseCampaign(
    workspaceId: string,
    campaignId: string,
    version?: number
  ): Promise<RepositoryResult<CampaignDetail>>;

  resumeCampaign(
    workspaceId: string,
    campaignId: string,
    version?: number
  ): Promise<RepositoryResult<CampaignDetail>>;

  stopCampaign(
    workspaceId: string,
    campaignId: string,
    version?: number
  ): Promise<RepositoryResult<CampaignDetail>>;
}
