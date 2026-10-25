export type {
  IntegrationAuthorizeResponse,
  IntegrationCatalogItem,
  IntegrationCategory,
  IntegrationProvider,
  IntegrationsListResponse,
  IntegrationStatus,
} from "@quickstart/contracts";

export type RepositoryResult<T> =
  | { status: "ready"; data: T }
  | { status: "loading" }
  | { status: "unavailable"; message: string }
  | { status: "forbidden"; message: string }
  | { status: "error"; message: string };

export type MailchimpAudience = {
  id: string;
  name: string;
  memberCount: number | null;
};

export type MailchimpCampaign = {
  id: string;
  webId: number | null;
  status: string;
  type: string;
  subject: string;
  title: string;
  fromName: string;
  audienceId: string;
  recipientCount: number;
  createdAt: string | null;
  sendTime: string | null;
  emailsSent: number;
  editUrl: string | null;
};

export type MailchimpCampaignDraft = {
  campaignId: string;
  webId: number | null;
  status: string;
  audienceId: string;
  segmentId: number;
  recipients: {
    total: number;
    valid: number;
    subscribed: number;
    pending: number;
    unsubscribed: number;
    failed: number;
    invalid: number;
  };
  editUrl: string | null;
  previewHtml: string;
};

export type CreateMailchimpCampaignInput = {
  audienceId: string;
  recipientEmails: string[];
  subject: string;
  fromName: string;
  replyTo: string;
  previewText?: string;
  title?: string;
  html: string;
  confirmConsent: boolean;
  lead?: EmailLeadInput;
};

export type EmailLeadInput = {
  email: string;
  name?: string;
  company?: string;
  website?: string;
  category?: string;
  location?: string;
  summary?: string;
  notes?: string;
  runId?: string;
  fitReasons?: string[];
  evidence?: Array<{
    field?: string;
    value?: string;
    source_url?: string;
    quote?: string;
  }>;
  source?: "lead_generation" | "manual" | "campaign";
};

export type PersonalizeEmailInput = {
  lead: EmailLeadInput;
  brief: string;
  fromName: string;
  replyTo?: string;
};

export type PersonalizedEmail = {
  subject: string;
  html: string;
  source: "ai" | "fallback";
};

export type MailchimpCampaignDetail = MailchimpCampaign & {
  html: string;
  recipients: Array<{ email: string; status?: string; name?: string }>;
  stats: {
    emailsSent: number;
    opens: number;
    clicks: number;
    bounces: number;
    unsubscribes: number;
    openRate: number | null;
    clickRate: number | null;
  };
  lead: EmailLeadInput | null;
  links: {
    mailchimpEdit: string | null;
    mailchimpReport: string | null;
    audience: string | null;
    website: string | null;
    run: string | null;
    sources: string[];
  };
};

export type InstantlyAccount = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: number | string | null;
  statusLabel: string;
  healthy: boolean;
  warmupStatus: number | string | null;
  dailyLimit: number | null;
  providerCode: number | null;
  setupPending: boolean;
  statusMessage: string | null;
};

export type ConnectGoogleMailboxInput = {
  email: string;
  appPassword: string;
  firstName: string;
  lastName: string;
  dailyLimit?: number;
  enableWarmup?: boolean;
};

export type ConnectGoogleMailboxResult = {
  account: InstantlyAccount;
  connected: boolean;
  message: string;
};

export type InstantlyCampaignStats = {
  leads: number;
  contacted: number;
  opens: number;
  replies: number;
};

export type InstantlyCampaign = {
  id: string;
  name: string;
  status: number;
  statusLabel: string;
  accounts: string[];
  leadEmail: string | null;
  leadName: string | null;
  company: string | null;
  subject: string;
  createdAt: string | null;
  updatedAt: string | null;
  activatedAt: string | null;
  link: string | null;
  stats: InstantlyCampaignStats;
};

export type CreateInstantlyCampaignInput = {
  name?: string;
  subject: string;
  html: string;
  lead: EmailLeadInput;
  accountEmails?: string[];
  confirmCompliance: boolean;
};

export type InstantlyCampaignDetail = InstantlyCampaign & {
  body: string;
  lead: EmailLeadInput | null;
  sendEvent: {
    status: "sent" | "pending" | "unavailable";
    sentAt: string | null;
    messageId: string | null;
  };
  links: {
    instantly: string | null;
    accounts: string | null;
    website: string | null;
    run: string | null;
    sources: string[];
  };
};
