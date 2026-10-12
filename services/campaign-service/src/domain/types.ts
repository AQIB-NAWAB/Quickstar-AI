export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "running"
  | "paused"
  | "completed"
  | "failed";

export type TargetStatus =
  | "pending"
  | "queued"
  | "calling"
  | "answered"
  | "no_answer"
  | "busy"
  | "voicemail"
  | "retrying"
  | "opted_out"
  | "failed"
  | "completed";

export type AudienceFieldRole = "dial" | "identity" | "contact_email" | "custom";

export type AudienceFieldDef = {
  key: string;
  label: string;
  role: AudienceFieldRole;
  sourceColumn?: string;
  required?: boolean;
};

export type CampaignSchedule = {
  startDate: string;
  startTime: string;
  timezone: string;
  dailyWindowFrom: string;
  dailyWindowTo: string;
};

export type CampaignPacing = {
  maxConcurrentCalls: number;
  maxCallStartsPerMinute: number;
};

export type CampaignRetryPolicy = {
  maxRetries: number;
  retryIntervalMinutes: number;
  eligibleOutcomes: string[];
};

export type CampaignRecord = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  agentId: string;
  agentName: string;
  status: CampaignStatus;
  audienceSchema: AudienceFieldDef[];
  schedule: CampaignSchedule;
  pacing: CampaignPacing;
  retryPolicy: CampaignRetryPolicy;
  idempotencyKey: string | null;
  version: number;
  scheduledStart: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CampaignMetrics = {
  eligibleContacts: number;
  completedContacts: number;
  answeredContacts: number;
  answerRate: number;
  avgAnsweredDurationSeconds: number;
  activeCalls: number;
  queuedContacts: number;
  retryingContacts: number;
  startedAttempts: number;
};

export type CampaignSummary = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  agentId: string;
  agentName: string;
  status: CampaignStatus;
  eligibleContacts: number;
  completedContacts: number;
  answerRate: number | null;
  scheduledStart: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type CampaignDetail = CampaignSummary & {
  audienceSchema: AudienceFieldDef[];
  schedule: CampaignSchedule;
  pacing: CampaignPacing;
  retryPolicy: CampaignRetryPolicy;
  metrics: CampaignMetrics;
};

export type CampaignTarget = {
  id: string;
  workspaceId: string;
  campaignId: string;
  dialAddress: string;
  dialNormalized: string;
  displayName: string | null;
  email: string | null;
  attributes: Record<string, string>;
  sourceKind: "csv" | "lead" | "api";
  sourceRef: string | null;
  status: TargetStatus;
  attemptsCount: number;
  lastAttemptAt: Date | null;
  nextAttemptAt: Date | null;
  outcome: string | null;
  claimedAt: Date | null;
  claimedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CampaignAttempt = {
  id: string;
  workspaceId: string;
  campaignId: string;
  targetId: string;
  attemptNumber: number;
  idempotencyKey: string;
  callId: string | null;
  status: "answered" | "no_answer" | "busy" | "failed" | "in_progress" | "voicemail";
  outcome: string;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number | null;
  error: { code: string; message: string } | null;
};

export type IncomingTarget = {
  dialAddress: string;
  displayName?: string | null;
  email?: string | null;
  attributes?: Record<string, string>;
  sourceKind?: "csv" | "lead" | "api";
  sourceRef?: string | null;
};
