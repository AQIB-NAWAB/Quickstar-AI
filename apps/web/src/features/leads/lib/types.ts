export type LeadStatus = "new" | "contacted" | "qualified" | "disqualified";

export type LeadSentiment = "positive" | "neutral" | "negative" | "unknown";

export interface LeadSummary {
  id: string;
  workspaceId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  intent: string | null;
  qualificationScore: number | null;
  qualificationMax: number | null; // e.g. 100
  sentiment: LeadSentiment;
  status: LeadStatus;
  tags: string[];
  source: string | null;
  capturedAt: string | null; // ISO UTC string
  version?: number;
}

export interface TranscriptMessage {
  id: string;
  speaker: "user" | "agent" | "system";
  text: string;
  timestamp: string; // ISO UTC or relative label
  offsetSeconds?: number;
}

export interface LeadDetail extends LeadSummary {
  capturedFields: Record<string, string | number | boolean | null>;
  /** Schema labels for captured_fields keys (key → display label). */
  attributeLabels?: Record<string, string>;
  originatingConversationId: string | null;
  transcriptStatus: "ready" | "unavailable" | "empty" | "error";
  transcriptMessages: TranscriptMessage[];
}

export interface LeadsFilterState {
  q: string;
  status: string; // "all" | LeadStatus
  tag: string; // "all" | string
  leadId: string | null;
}

export type RepositoryResult<T> =
  | { status: "ready"; data: T }
  | { status: "unavailable"; message: string }
  | { status: "forbidden"; message: string }
  | { status: "not_found"; message: string }
  | { status: "error"; message: string };

export interface LeadsListResponse {
  leads: LeadSummary[];
  total?: number;
  availableTags: string[];
  attributeLabels?: Record<string, string>;
}

export interface LeadsRepository {
  listLeads(
    workspaceId: string,
    filters?: { q?: string; status?: string; tag?: string },
    signal?: AbortSignal
  ): Promise<RepositoryResult<LeadsListResponse>>;

  getLead(
    workspaceId: string,
    leadId: string,
    signal?: AbortSignal
  ): Promise<RepositoryResult<LeadDetail>>;

  updateLeadStatus(
    workspaceId: string,
    leadId: string,
    status: LeadStatus,
    version?: number
  ): Promise<RepositoryResult<LeadDetail>>;
}
