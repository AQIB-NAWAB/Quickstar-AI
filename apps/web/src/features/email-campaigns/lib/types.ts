export type RepositoryResult<T> =
  | { status: "ready"; data: T }
  | { status: "loading" }
  | { status: "unavailable"; message: string }
  | { status: "forbidden"; message: string }
  | { status: "error"; message: string };

export type SmtpMailbox = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  dailyLimit: number;
  sentToday: number;
  sentDate: string | null;
  lastVerifiedAt: string | null;
  lastError: string | null;
  createdAt: string;
};

export type ConnectSmtpMailboxInput = {
  email: string;
  appPassword: string;
  firstName: string;
  lastName: string;
  dailyLimit?: number;
};

export type SmtpFollowUp = {
  delayDays: number;
  mode?: "generic" | "personalized";
  subject?: string;
  html?: string;
  brief?: string;
};

export type SmtpCampaignSchedule = {
  sendAt?: string;
  followUps?: SmtpFollowUp[];
};

export type SmtpRecipientInput = {
  email: string;
  name?: string;
  company?: string;
  website?: string;
  category?: string;
  location?: string;
  summary?: string;
  notes?: string;
  lead?: Record<string, unknown>;
};

export type CreateSmtpCampaignInput = {
  name: string;
  mailboxId: string;
  mode: "generic" | "personalized";
  fromName: string;
  subject?: string;
  previewText?: string;
  html?: string;
  brief?: string;
  recipients: SmtpRecipientInput[];
  schedule?: SmtpCampaignSchedule;
  consentConfirmed: boolean;
};

export type SmtpCampaignCounts = {
  total: number;
  pending: number;
  retrying: number;
  sent: number;
  suppressed: number;
  failed: number;
  opted_out: number;
  skipped: number;
};

export type SmtpCampaign = {
  id: string;
  name: string;
  status: string;
  mode: string;
  mailboxId: string | null;
  fromName: string | null;
  subject: string | null;
  previewText: string | null;
  schedule: SmtpCampaignSchedule;
  scheduledStartAt: string | null;
  recipientsFixed: boolean;
  consentConfirmed: boolean;
  followupStep: number;
  activatedAt: string | null;
  pausedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  counts: SmtpCampaignCounts;
};

export type SmtpRecipient = {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  website: string | null;
  category: string | null;
  location: string | null;
  summary: string | null;
  notes: string | null;
  lead: Record<string, unknown>;
  status: string;
  personalized: { subject?: string; html?: string; source?: string } | null;
  sentSubject: string | null;
  sentHtml: string | null;
  followupStep: number;
  sentAt: string | null;
  attempts: number;
  messageId: string | null;
  lastError: string | null;
};

export type SmtpActivity = {
  id: string;
  type: string;
  message: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type SmtpCampaignDetail = SmtpCampaign & {
  html: string | null;
  brief: string | null;
  mailbox: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  recipients: SmtpRecipient[];
  activity: SmtpActivity[];
};

export type SmtpSuppression = {
  workspace_id: string;
  email: string;
  reason: string;
  created_at: string;
  updated_at: string;
};

export type PersonalizedEmail = {
  subject: string;
  html: string;
  source: "ai" | "fallback";
};
