export type LeadStatus = "new" | "contacted" | "qualified" | "disqualified";

export type LeadSentiment = "positive" | "neutral" | "negative" | "unknown";

export type LeadSource =
  | "web_research"
  | "lead_gen_bot"
  | "chat"
  | "voice"
  | "campaign"
  | "api"
  | "manual";

export type CapturedFields = Record<string, string | number | boolean | null>;

export type LeadFieldRole = "identity" | "contact_email" | "contact_phone" | "custom";

export type LeadFieldDef = {
  key: string;
  label: string;
  role: LeadFieldRole;
  required?: boolean;
};

export type LeadRecord = {
  id: string;
  workspaceId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  intent: string | null;
  qualificationScore: number | null;
  qualificationMax: number | null;
  sentiment: LeadSentiment;
  status: LeadStatus;
  tags: string[];
  source: string;
  capturedFields: CapturedFields;
  notes: string | null;
  conversationId: string | null;
  externalId: string | null;
  idempotencyKey: string | null;
  version: number;
  capturedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type LeadUpsertInput = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  intent?: string | null;
  qualificationScore?: number | null;
  qualificationMax?: number | null;
  sentiment?: LeadSentiment;
  status?: LeadStatus;
  tags?: string[];
  source?: string;
  capturedFields?: CapturedFields;
  notes?: string | null;
  conversationId?: string | null;
  externalId?: string | null;
  idempotencyKey?: string | null;
  capturedAt?: Date | null;
};
