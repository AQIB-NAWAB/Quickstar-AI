import { randomUUID } from "node:crypto";
import { AppError, ErrorCode } from "@quickstart/errors";
import {
  EmailCampaignsRepository,
  type CampaignRecipientCounts,
  type RecipientInput,
  type SmtpActivityRow,
  type SmtpEmailCampaignRow,
  type SmtpEmailRecipientRow,
  type SmtpMailboxRow,
  type SmtpSuppressionRow,
} from "../repository/email-campaigns.repository.js";
import { SecretsClient } from "../clients/secrets.client.js";
import { sendSmtpEmail, verifySmtpCredentials, type SmtpCredentials } from "../email/smtp-transport.js";
import {
  fallbackEmailForLead,
  personalizeEmailForLead,
  type EmailLeadForPersonalization,
  type PersonalizedEmail,
} from "../email/personalize.js";
import {
  appOrigin,
  createUnsubscribeToken,
  parseUnsubscribeToken,
  unsubscribeSecret,
} from "../email/unsubscribe-token.js";

const MAX_RECIPIENTS_PER_CAMPAIGN = 200;
/** Cap synchronous AI generation at activation; the sender worker generates the rest lazily. */
const MAX_SYNC_PERSONALIZE = 25;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const APP_PASSWORD_PATTERN = /^[A-Za-z0-9]{16}$/;

export type SmtpMailboxDto = {
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

export type SmtpCampaignDto = {
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
  counts: CampaignRecipientCounts;
};

export type SmtpRecipientDto = {
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

export type SmtpCampaignDetailDto = SmtpCampaignDto & {
  html: string | null;
  brief: string | null;
  mailbox: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
  recipients: SmtpRecipientDto[];
  activity: Array<{
    id: string;
    type: string;
    message: string | null;
    metadata: Record<string, unknown>;
    createdAt: string;
  }>;
};

function mailboxSecretName(mailboxId: string): string {
  return `smtp_mailbox_${mailboxId}`;
}

function mapMailbox(row: SmtpMailboxRow): SmtpMailboxDto {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    status: row.status,
    dailyLimit: row.daily_limit,
    sentToday: row.sent_today,
    sentDate: row.sent_date,
    lastVerifiedAt: row.last_verified_at?.toISOString() ?? null,
    lastError: row.last_error,
    createdAt: row.created_at.toISOString(),
  };
}

function mapRecipient(row: SmtpEmailRecipientRow): SmtpRecipientDto {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    company: row.company,
    website: row.website,
    category: row.category,
    location: row.location,
    summary: row.summary,
    notes: row.notes,
    lead: row.lead ?? {},
    status: row.status,
    personalized: row.personalized,
    sentSubject: row.sent_subject,
    sentHtml: row.sent_html,
    followupStep: row.followup_step,
    sentAt: row.sent_at?.toISOString() ?? null,
    attempts: row.attempts,
    messageId: row.message_id,
    lastError: row.last_error,
  };
}

function mapCampaign(
  row: SmtpEmailCampaignRow & Partial<CampaignRecipientCounts>,
): SmtpCampaignDto {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    mode: row.mode,
    mailboxId: row.mailbox_id,
    fromName: row.from_name,
    subject: row.subject,
    previewText: row.preview_text,
    schedule: row.schedule ?? {},
    scheduledStartAt: row.scheduled_start_at?.toISOString() ?? null,
    recipientsFixed: row.recipients_fixed,
    consentConfirmed: row.consent_confirmed,
    followupStep: row.followup_step,
    activatedAt: row.activated_at?.toISOString() ?? null,
    pausedAt: row.paused_at?.toISOString() ?? null,
    completedAt: row.completed_at?.toISOString() ?? null,
    cancelledAt: row.cancelled_at?.toISOString() ?? null,
    lastError: row.last_error,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    counts: {
      total: row.total ?? 0,
      pending: row.pending ?? 0,
      retrying: row.retrying ?? 0,
      sent: row.sent ?? 0,
      suppressed: row.suppressed ?? 0,
      failed: row.failed ?? 0,
      opted_out: row.opted_out ?? 0,
      skipped: row.skipped ?? 0,
    },
  };
}

function normalizeRecipients(input: SmtpRecipientInput[]): RecipientInput[] {
  const seen = new Set<string>();
  const recipients: RecipientInput[] = [];
  for (const item of input) {
    const email = String(item.email ?? "").trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email) || seen.has(email)) continue;
    seen.add(email);
    recipients.push({
      email,
      name: String(item.name ?? "").trim().slice(0, 200) || undefined,
      company: String(item.company ?? "").trim().slice(0, 200) || undefined,
      website: String(item.website ?? "").trim().slice(0, 500) || undefined,
      category: String(item.category ?? "").trim().slice(0, 120) || undefined,
      location: String(item.location ?? "").trim().slice(0, 200) || undefined,
      summary: String(item.summary ?? "").trim() || undefined,
      notes: String(item.notes ?? "").trim() || undefined,
      lead: item.lead ?? {},
    });
  }
  return recipients;
}

function leadFromRecipient(recipient: RecipientInput): EmailLeadForPersonalization {
  return {
    email: recipient.email,
    name: recipient.name,
    company: recipient.company,
    website: recipient.website,
    category: recipient.category,
    location: recipient.location,
    summary: recipient.summary,
    notes: recipient.notes,
    fitReasons: Array.isArray(recipient.lead?.fitReasons) ? recipient.lead.fitReasons : undefined,
    evidence: Array.isArray(recipient.lead?.evidence) ? recipient.lead.evidence : undefined,
  };
}

export class EmailCampaignsService {
  constructor(
    private readonly repo: EmailCampaignsRepository,
    private readonly secrets: SecretsClient,
  ) {}

  // ---------------------------------------------------------------- mailboxes

  async listMailboxes(workspaceId: string): Promise<SmtpMailboxDto[]> {
    const rows = await this.repo.listMailboxes(workspaceId);
    return rows.map(mapMailbox);
  }

  async connectMailbox(
    workspaceId: string,
    input: ConnectSmtpMailboxInput,
  ): Promise<SmtpMailboxDto> {
    const email = String(input.email ?? "").trim().toLowerCase();
    const appPassword = String(input.appPassword ?? "").replace(/[\s-]+/g, "");
    const firstName = String(input.firstName ?? "").trim();
    const lastName = String(input.lastName ?? "").trim();
    const dailyLimit = Math.min(1000, Math.max(1, Number(input.dailyLimit) || 50));

    if (!EMAIL_PATTERN.test(email)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Enter the Google email address for the sending mailbox.",
      });
    }
    if (!APP_PASSWORD_PATTERN.test(appPassword)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Google app passwords are 16 characters. Copy the password from Google without spaces.",
      });
    }
    if (!firstName || !lastName) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Add the first and last name for the sending account.",
      });
    }
    const existing = await this.repo.getMailboxByEmail(workspaceId, email);
    if (existing) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "This mailbox is already connected for the workspace.",
      });
    }

    const verification = await verifySmtpCredentials({ email, appPassword });
    if (!verification.ok) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: verification.detail
          ? `${verification.message} SMTP said: ${verification.detail.slice(0, 300)}`
          : verification.message,
      });
    }

    const id = randomUUID();
    await this.secrets.storeNamedSecret(workspaceId, mailboxSecretName(id), appPassword);
    try {
      const row = await this.repo.createMailbox({
        id,
        workspaceId,
        email,
        firstName,
        lastName,
        secretReferenceId: mailboxSecretName(id),
        dailyLimit,
      });
      return mapMailbox(row);
    } catch (error) {
      await this.secrets.deleteNamedSecret(workspaceId, mailboxSecretName(id)).catch(() => {});
      throw error;
    }
  }

  async verifyMailbox(workspaceId: string, mailboxId: string): Promise<{ ok: boolean; message: string }> {
    const mailbox = await this.requireMailbox(workspaceId, mailboxId);
    const credentials = await this.mailboxCredentials(workspaceId, mailbox);
    if (!credentials) {
      return { ok: false, message: "The app password for this mailbox is missing. Reconnect the mailbox." };
    }
    const result = await verifySmtpCredentials(credentials);
    await this.repo.markMailboxVerified(
      workspaceId,
      mailboxId,
      result.ok ? null : `${result.message}${result.detail ? ` (${result.detail})` : ""}`,
    );
    return result;
  }

  async deleteMailbox(workspaceId: string, mailboxId: string): Promise<{ deleted: boolean }> {
    await this.requireMailbox(workspaceId, mailboxId);
    const campaigns = await this.repo.listCampaigns(workspaceId);
    const inUse = campaigns.some(
      (campaign) =>
        campaign.mailbox_id === mailboxId && ["scheduled", "sending", "paused"].includes(campaign.status),
    );
    if (inUse) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "This mailbox is used by an active campaign. Cancel or delete the campaign first.",
      });
    }
    await this.secrets.deleteNamedSecret(workspaceId, mailboxSecretName(mailboxId)).catch(() => {});
    const deleted = await this.repo.deleteMailbox(workspaceId, mailboxId);
    return { deleted };
  }

  async mailboxCredentials(
    workspaceId: string,
    mailbox: SmtpMailboxRow,
  ): Promise<SmtpCredentials | null> {
    const appPassword = await this.secrets.getNamedSecret(workspaceId, mailbox.secret_reference_id);
    if (!appPassword) return null;
    return { email: mailbox.email, appPassword };
  }

  private async requireMailbox(workspaceId: string, mailboxId: string): Promise<SmtpMailboxRow> {
    const mailbox = await this.repo.getMailbox(workspaceId, mailboxId);
    if (!mailbox) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Sending mailbox not found in this workspace.",
      });
    }
    return mailbox;
  }

  private async requireCampaign(
    workspaceId: string,
    campaignId: string,
  ): Promise<SmtpEmailCampaignRow> {
    const campaign = await this.repo.getCampaign(workspaceId, campaignId);
    if (!campaign) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Email campaign not found in this workspace.",
      });
    }
    return campaign;
  }

  // --------------------------------------------------------------- campaigns

  async listCampaigns(workspaceId: string): Promise<SmtpCampaignDto[]> {
    const rows = await this.repo.listCampaigns(workspaceId);
    return rows.map(mapCampaign);
  }

  async getCampaign(workspaceId: string, campaignId: string): Promise<SmtpCampaignDetailDto> {
    const campaign = await this.requireCampaign(workspaceId, campaignId);
    const [recipients, activity, counts, mailbox] = await Promise.all([
      this.repo.listRecipients(campaignId),
      this.repo.listActivity(campaignId),
      this.repo.countRecipients(campaignId),
      campaign.mailbox_id ? this.repo.getMailbox(workspaceId, campaign.mailbox_id) : null,
    ]);
    const dto = mapCampaign({ ...campaign, ...counts });
    return {
      ...dto,
      html: campaign.html,
      brief: campaign.brief,
      mailbox: mailbox
        ? { id: mailbox.id, email: mailbox.email, firstName: mailbox.first_name, lastName: mailbox.last_name }
        : null,
      recipients: recipients.map(mapRecipient),
      activity: activity.map((row: SmtpActivityRow) => ({
        id: row.id,
        type: row.type,
        message: row.message,
        metadata: row.metadata ?? {},
        createdAt: row.created_at.toISOString(),
      })),
    };
  }

  async createCampaign(
    workspaceId: string,
    input: CreateSmtpCampaignInput,
    createdBy?: string,
  ): Promise<SmtpCampaignDetailDto> {
    const name = String(input.name ?? "").trim().slice(0, 160);
    const mode = input.mode === "personalized" ? "personalized" : "generic";
    const fromName = String(input.fromName ?? "").trim().slice(0, 120);
    const subject = String(input.subject ?? "").trim().slice(0, 200);
    const previewText = String(input.previewText ?? "").trim().slice(0, 200);
    const html = String(input.html ?? "").trim();
    const brief = String(input.brief ?? "").trim();

    if (!name) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "A campaign name is required." });
    }
    if (!fromName) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "A sender name is required." });
    }
    if (!input.consentConfirmed) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Confirm that the recipients consented to receive email.",
      });
    }
    if (mode === "generic" && (!subject || !html)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Subject and body are required for a shared email.",
      });
    }
    if (mode === "personalized" && !brief) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "A campaign brief is required for AI-personalized emails.",
      });
    }

    const mailbox = await this.requireMailbox(workspaceId, input.mailboxId);
    if (mailbox.status !== "active") {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "The selected mailbox is not active. Reconnect it first.",
      });
    }

    const recipients = normalizeRecipients(input.recipients);
    if (recipients.length === 0) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Add at least one valid recipient email.",
      });
    }
    if (recipients.length > MAX_RECIPIENTS_PER_CAMPAIGN) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `Campaigns can include up to ${MAX_RECIPIENTS_PER_CAMPAIGN} recipients.`,
      });
    }

    const schedule = this.validateSchedule(input.schedule ?? {});
    const scheduledStartAt = this.scheduledStartOrNull(schedule);

    const id = randomUUID();
    await this.repo.createCampaign({
      id,
      workspaceId,
      name,
      mode,
      mailboxId: mailbox.id,
      fromName,
      subject: mode === "generic" ? subject : null,
      previewText: previewText || null,
      html: mode === "generic" ? html : null,
      brief: mode === "personalized" ? brief : null,
      schedule,
      consentConfirmed: true,
      createdBy: createdBy ?? null,
      scheduledStartAt,
    });
    await this.repo.replaceRecipients(id, recipients);
    await this.repo.addActivity({
      workspaceId,
      campaignId: id,
      type: "created",
      message: `Campaign draft created with ${recipients.length} recipient${recipients.length === 1 ? "" : "s"}.`,
      metadata: { mode },
    });
    return this.getCampaign(workspaceId, id);
  }

  async updateCampaignDraft(
    workspaceId: string,
    campaignId: string,
    input: Partial<CreateSmtpCampaignInput> & { recipients?: SmtpRecipientInput[] },
  ): Promise<SmtpCampaignDetailDto> {
    const campaign = await this.requireCampaign(workspaceId, campaignId);
    if (campaign.status !== "draft") {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Only draft campaigns can be edited. Recipients are fixed after activation.",
      });
    }

    const patch: Parameters<EmailCampaignsRepository["updateCampaignDraft"]>[2] = {};
    if (input.name !== undefined) patch.name = String(input.name).trim().slice(0, 160);
    if (input.fromName !== undefined) patch.fromName = String(input.fromName).trim().slice(0, 120);
    if (input.subject !== undefined) patch.subject = String(input.subject).trim().slice(0, 200) || null;
    if (input.previewText !== undefined) patch.previewText = String(input.previewText).trim().slice(0, 200) || null;
    if (input.html !== undefined) patch.html = String(input.html).trim() || null;
    if (input.brief !== undefined) patch.brief = String(input.brief).trim() || null;
    if (input.mailboxId !== undefined) {
      const mailbox = await this.requireMailbox(workspaceId, input.mailboxId);
      patch.mailboxId = mailbox.id;
    }
    if (input.schedule !== undefined) {
      const schedule = this.validateSchedule(input.schedule);
      patch.schedule = schedule;
      patch.scheduledStartAt = this.scheduledStartOrNull(schedule);
    }
    if (input.consentConfirmed !== undefined) patch.consentConfirmed = Boolean(input.consentConfirmed);

    const updated = await this.repo.updateCampaignDraft(workspaceId, campaignId, patch, campaign.version);
    if (!updated) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "The campaign changed while editing. Reload and try again.",
      });
    }

    if (input.recipients !== undefined) {
      const recipients = normalizeRecipients(input.recipients);
      if (recipients.length === 0) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "Add at least one valid recipient email.",
        });
      }
      if (recipients.length > MAX_RECIPIENTS_PER_CAMPAIGN) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: `Campaigns can include up to ${MAX_RECIPIENTS_PER_CAMPAIGN} recipients.`,
        });
      }
      await this.repo.replaceRecipients(campaignId, recipients);
      await this.repo.addActivity({
        workspaceId,
        campaignId,
        type: "recipients_updated",
        message: `Recipient list updated to ${recipients.length} recipient${recipients.length === 1 ? "" : "s"}.`,
      });
    }

    return this.getCampaign(workspaceId, campaignId);
  }

  async generateSample(
    workspaceId: string,
    input: { lead: SmtpRecipientInput; brief: string; fromName: string },
  ): Promise<PersonalizedEmail> {
    const lead = leadFromRecipient(normalizeRecipients([input.lead])[0] ?? { email: input.lead.email });
    if (!EMAIL_PATTERN.test(lead.email)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "A valid lead email is required for the sample.",
      });
    }
    const brief = String(input.brief ?? "").trim();
    const fromName = String(input.fromName ?? "").trim();
    if (!brief || !fromName) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "A campaign brief and sender name are required.",
      });
    }
    return personalizeEmailForLead(workspaceId, { lead, brief, fromName });
  }

  async activateCampaign(
    workspaceId: string,
    campaignId: string,
  ): Promise<SmtpCampaignDetailDto> {
    const campaign = await this.requireCampaign(workspaceId, campaignId);
    if (campaign.status !== "draft") {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Only draft campaigns can be activated.",
      });
    }
    if (!campaign.consent_confirmed) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Confirm that the recipients consented to receive email.",
      });
    }
    const mailbox = campaign.mailbox_id
      ? await this.repo.getMailbox(workspaceId, campaign.mailbox_id)
      : null;
    if (!mailbox || mailbox.status !== "active") {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "The sending mailbox is missing or inactive. Reconnect it first.",
      });
    }
    const credentials = await this.mailboxCredentials(workspaceId, mailbox);
    if (!credentials) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "The app password for this mailbox is missing. Reconnect the mailbox.",
      });
    }
    if (campaign.mode === "generic" && (!campaign.subject || !campaign.html)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Subject and body are required before activating.",
      });
    }
    if (campaign.mode === "personalized" && !campaign.brief) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "A campaign brief is required before activating.",
      });
    }

    const counts = await this.repo.countRecipients(campaignId);
    if (counts.total === 0) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Add at least one recipient before activating.",
      });
    }

    const sendAt = campaign.scheduled_start_at ? new Date(campaign.scheduled_start_at) : new Date();

    // 1. Fix the recipient list and generate personalized emails.
    await this.repo.setRecipientsPendingWithStart(campaignId, sendAt);
    if (campaign.mode === "personalized") {
      const recipients = await this.repo.listRecipients(campaignId, {
        limit: MAX_SYNC_PERSONALIZE,
      });
      await this.generateAndStorePersonalized(workspaceId, campaign, recipients);
      // Remaining recipients (if any) are personalized lazily by the sender
      // worker when their turn to send arrives.
    }

    // 2. Apply the suppression list.
    const recipients = await this.repo.listRecipients(campaignId, { limit: MAX_RECIPIENTS_PER_CAMPAIGN });
    let suppressedCount = 0;
    for (const recipient of recipients) {
      if (recipient.status === "suppressed") continue;
      const suppressed = await this.repo.isSuppressed(workspaceId, recipient.email);
      if (suppressed) {
        await this.repo.markRecipientSuppressed(recipient.id, "On the workspace suppression list");
        suppressedCount += 1;
      }
    }

    // 3. Transition status. Future start → scheduled, otherwise sending.
    const future = sendAt.getTime() > Date.now();
    const nextStatus = future ? "scheduled" : "sending";
    const transitioned = await this.repo.transitionStatus({
      workspaceId,
      campaignId,
      from: ["draft"],
      to: nextStatus,
      extra: {
        recipients_fixed: true,
        activated_at: new Date().toISOString(),
      },
    });
    if (!transitioned) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "The campaign changed while activating. Reload and try again.",
      });
    }
    await this.repo.setCampaignError(workspaceId, campaignId, null);
    await this.repo.addActivity({
      workspaceId,
      campaignId,
      type: "activated",
      message: future
        ? `Campaign activated and scheduled for ${sendAt.toISOString()}. Recipients are now fixed.`
        : "Campaign activated. Sending has started in the background.",
      metadata: { sendAt: sendAt.toISOString(), suppressedCount },
    });
    return this.getCampaign(workspaceId, campaignId);
  }

  /**
   * Ensures a personalized-mode recipient has generated content, generating and
   * persisting it when missing. Used by the sender worker for recipients that
   * were not covered by the synchronous activation batch.
   */
  async ensureRecipientPersonalized(
    workspaceId: string,
    campaign: { brief: string | null; fromName: string | null },
    recipient: SmtpEmailRecipientRow,
  ): Promise<PersonalizedEmail> {
    if (recipient.personalized?.subject && recipient.personalized?.html) {
      return {
        subject: recipient.personalized.subject,
        html: recipient.personalized.html,
        source: (recipient.personalized.source as "ai" | "fallback") ?? "ai",
      };
    }
    const personalized = await personalizeEmailForLead(workspaceId, {
      lead: {
        email: recipient.email,
        name: recipient.name ?? undefined,
        company: recipient.company ?? undefined,
        website: recipient.website ?? undefined,
        category: recipient.category ?? undefined,
        location: recipient.location ?? undefined,
        summary: recipient.summary ?? undefined,
        notes: recipient.notes ?? undefined,
        fitReasons: Array.isArray(recipient.lead?.fitReasons) ? recipient.lead.fitReasons : undefined,
        evidence: Array.isArray(recipient.lead?.evidence) ? recipient.lead.evidence : undefined,
      },
      brief: campaign.brief ?? "",
      fromName: campaign.fromName ?? "QuickStart AI",
    });
    await this.repo.setRecipientsPersonalized(recipient.campaign_id, [
      { recipientId: recipient.id, personalized },
    ]);
    return personalized;
  }

  private async generateAndStorePersonalized(
    workspaceId: string,
    campaign: SmtpEmailCampaignRow,
    recipients: SmtpEmailRecipientRow[],
  ): Promise<void> {
    const fromName = campaign.from_name ?? "QuickStart AI";
    const brief = campaign.brief ?? "";
    const entries: Array<{
      recipientId: string;
      personalized: { subject: string; html: string; source: string };
    }> = [];

    for (let index = 0; index < recipients.length; index += 3) {
      const batch = recipients.slice(index, index + 3);
      const results = await Promise.all(
        batch.map(async (recipient) => {
          const personalized = await personalizeEmailForLead(workspaceId, {
            lead: {
              email: recipient.email,
              name: recipient.name ?? undefined,
              company: recipient.company ?? undefined,
              website: recipient.website ?? undefined,
              category: recipient.category ?? undefined,
              location: recipient.location ?? undefined,
              summary: recipient.summary ?? undefined,
              notes: recipient.notes ?? undefined,
              fitReasons: Array.isArray(recipient.lead?.fitReasons) ? recipient.lead.fitReasons : undefined,
              evidence: Array.isArray(recipient.lead?.evidence) ? recipient.lead.evidence : undefined,
            },
            brief,
            fromName,
          });
          return { recipientId: recipient.id, personalized };
        }),
      );
      entries.push(...results);
    }
    await this.repo.setRecipientsPersonalized(campaign.id, entries);
  }

  async pauseCampaign(workspaceId: string, campaignId: string): Promise<SmtpCampaignDto> {
    const campaign = await this.requireCampaign(workspaceId, campaignId);
    if (!["scheduled", "sending"].includes(campaign.status)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Only scheduled or sending campaigns can be paused.",
      });
    }
    const updated = await this.repo.transitionStatus({
      workspaceId,
      campaignId,
      from: ["scheduled", "sending"],
      to: "paused",
      extra: { paused_at: new Date().toISOString() },
    });
    if (!updated) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "The campaign changed while pausing. Reload and try again.",
      });
    }
    await this.repo.addActivity({
      workspaceId,
      campaignId,
      type: "paused",
      message: "Campaign paused. No further emails will send until it is resumed.",
    });
    return mapCampaign({ ...updated, ...(await this.repo.countRecipients(campaignId)) });
  }

  async resumeCampaign(workspaceId: string, campaignId: string): Promise<SmtpCampaignDto> {
    const campaign = await this.requireCampaign(workspaceId, campaignId);
    if (campaign.status !== "paused") {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Only paused campaigns can be resumed.",
      });
    }
    const sendAt = campaign.scheduled_start_at ? new Date(campaign.scheduled_start_at) : new Date();
    const future = sendAt.getTime() > Date.now();
    const updated = await this.repo.transitionStatus({
      workspaceId,
      campaignId,
      from: ["paused"],
      to: future ? "scheduled" : "sending",
      extra: { paused_at: null },
    });
    if (!updated) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "The campaign changed while resuming. Reload and try again.",
      });
    }
    await this.repo.addActivity({
      workspaceId,
      campaignId,
      type: "resumed",
      message: future ? "Campaign resumed and will start at the scheduled time." : "Campaign resumed. Sending continues.",
    });
    return mapCampaign({ ...updated, ...(await this.repo.countRecipients(campaignId)) });
  }

  async cancelCampaign(workspaceId: string, campaignId: string, cancelledBy?: string): Promise<SmtpCampaignDto> {
    const campaign = await this.requireCampaign(workspaceId, campaignId);
    if (!["draft", "scheduled", "paused", "sending"].includes(campaign.status)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "This campaign can no longer be cancelled.",
      });
    }
    const skipped = await this.repo.skipPendingRecipients(campaignId, "Campaign cancelled");
    const updated = await this.repo.transitionStatus({
      workspaceId,
      campaignId,
      from: ["draft", "scheduled", "paused", "sending"],
      to: "cancelled",
      extra: { cancelled_at: new Date().toISOString(), cancelled_by: cancelledBy ?? null },
    });
    if (!updated) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "The campaign changed while cancelling. Reload and try again.",
      });
    }
    await this.repo.addActivity({
      workspaceId,
      campaignId,
      type: "cancelled",
      message: `Campaign cancelled. ${skipped} unsent email${skipped === 1 ? "" : "s"} skipped.`,
    });
    return mapCampaign({ ...updated, ...(await this.repo.countRecipients(campaignId)) });
  }

  async deleteCampaign(workspaceId: string, campaignId: string): Promise<{ deleted: boolean }> {
    await this.requireCampaign(workspaceId, campaignId);
    const deleted = await this.repo.deleteCampaign(workspaceId, campaignId);
    if (!deleted) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Only draft, cancelled, or completed campaigns can be deleted.",
      });
    }
    return { deleted };
  }

  // ------------------------------------------------------------ suppressions

  async listSuppressions(workspaceId: string): Promise<SmtpSuppressionRow[]> {
    return this.repo.listSuppressions(workspaceId);
  }

  async deleteSuppression(workspaceId: string, email: string): Promise<{ deleted: boolean }> {
    const normalized = email.trim().toLowerCase();
    const deleted = await this.repo.deleteSuppression(workspaceId, normalized);
    return { deleted };
  }

  async unsubscribe(token: string): Promise<{ email: string; alreadySuppressed: boolean }> {
    const parsed = parseUnsubscribeToken(token, unsubscribeSecret());
    if (!parsed) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "This unsubscribe link is invalid or has expired.",
      });
    }
    const found = await this.repo.getRecipientCampaign(parsed.campaignId, parsed.recipientId);
    if (!found) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "This recipient is no longer part of the campaign.",
      });
    }
    const already = await this.repo.isSuppressed(found.workspace_id, found.recipient.email);
    await this.repo.upsertSuppression(found.workspace_id, found.recipient.email, "opted_out");
    if (found.recipient.status === "pending" || found.recipient.status === "retrying") {
      await this.repo.markRecipientSuppressed(found.recipient.id, "Recipient unsubscribed");
    }
    await this.repo.addActivity({
      workspaceId: found.workspace_id,
      campaignId: parsed.campaignId,
      type: "unsubscribed",
      message: `${found.recipient.email} unsubscribed from this campaign.`,
      metadata: { email: found.recipient.email },
    });
    return { email: found.recipient.email, alreadySuppressed: already };
  }

  // ------------------------------------------------------------------ worker

  /** Credentials for the sending worker, decrypted per send batch. */
  async workerMailboxCredentials(
    workspaceId: string,
    mailboxId: string,
  ): Promise<SmtpCredentials | null> {
    const mailbox = await this.repo.getMailbox(workspaceId, mailboxId);
    if (!mailbox) return null;
    return this.mailboxCredentials(workspaceId, mailbox);
  }

  /** Subject+html for a claimed recipient, resolving personalized content or follow-ups. */
  async resolveEmailForRecipient(
    campaign: {
      mode: string;
      subject: string | null;
      html: string | null;
      brief: string | null;
      fromName: string | null;
    },
    recipient: { personalized: { subject?: string; html?: string } | null },
    followUp: { mode?: string; subject?: string; html?: string; brief?: string } | null,
    fallbackLead: EmailLeadForPersonalization,
    fromName: string,
    workspaceId: string,
  ): Promise<PersonalizedEmail> {
    if (followUp) {
      if (followUp.mode === "personalized") {
        return personalizeEmailForLead(workspaceId, {
          lead: fallbackLead,
          brief: followUp.brief ?? campaign.brief ?? "",
          fromName,
        });
      }
      if (followUp.subject && followUp.html) {
        return { subject: followUp.subject, html: followUp.html, source: "fallback" };
      }
    }
    if (campaign.mode === "personalized" && recipient.personalized?.subject && recipient.personalized?.html) {
      return {
        subject: recipient.personalized.subject,
        html: recipient.personalized.html,
        source: "ai",
      };
    }
    if (campaign.subject && campaign.html) {
      return { subject: campaign.subject, html: campaign.html, source: "fallback" };
    }
    return fallbackEmailForLead({ lead: fallbackLead, brief: campaign.brief ?? "", fromName });
  }

  async sendRecipientEmail(params: {
    workspaceId: string;
    credentials: SmtpCredentials;
    fromName: string;
    to: string;
    subject: string;
    html: string;
    campaignId: string;
    recipientId: string;
  }): Promise<{ messageId: string | null }> {
    const unsubscribeUrl = `${appOrigin()}/api/email/unsubscribe?token=${encodeURIComponent(
      createUnsubscribeToken(params.campaignId, params.recipientId, unsubscribeSecret()),
    )}`;
    return sendSmtpEmail({
      credentials: params.credentials,
      fromName: params.fromName,
      to: params.to,
      subject: params.subject,
      html: params.html,
      unsubscribeUrl,
    });
  }

  private validateSchedule(schedule: SmtpCampaignSchedule): SmtpCampaignSchedule {
    const followUps: SmtpFollowUp[] = (schedule.followUps ?? [])
      .map((followUp): SmtpFollowUp => ({
        delayDays: Math.min(60, Math.max(0, Math.round(Number(followUp.delayDays) || 0))),
        mode: followUp.mode === "personalized" ? "personalized" : "generic",
        subject: followUp.subject ? String(followUp.subject).trim().slice(0, 200) : undefined,
        html: followUp.html ? String(followUp.html).trim() : undefined,
        brief: followUp.brief ? String(followUp.brief).trim() : undefined,
      }))
      .filter((followUp) => {
        if (followUp.mode === "personalized") return Boolean(followUp.brief);
        return Boolean(followUp.subject && followUp.html);
      })
      .slice(0, 6);
    return {
      sendAt: schedule.sendAt ? String(schedule.sendAt) : undefined,
      followUps,
    };
  }

  private scheduledStartOrNull(schedule: SmtpCampaignSchedule): Date | null {
    if (schedule.sendAt) {
      const parsed = new Date(schedule.sendAt);
      if (!Number.isNaN(parsed.getTime()) && parsed.getTime() > Date.now()) {
        return parsed;
      }
    }
    return null;
  }
}
