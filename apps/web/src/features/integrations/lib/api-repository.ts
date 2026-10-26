import type {
  IntegrationAuthorizeResponse,
  IntegrationCatalogItem,
  IntegrationProvider,
  IntegrationsListResponse,
  MailchimpAudience,
  MailchimpCampaign,
  MailchimpCampaignDetail,
  MailchimpCampaignDraft,
  CreateMailchimpCampaignInput,
  PersonalizeEmailInput,
  PersonalizedEmail,
  InstantlyAccount,
  InstantlyCampaign,
  InstantlyCampaignDetail,
  CreateInstantlyCampaignInput,
  ConnectGoogleMailboxInput,
  ConnectGoogleMailboxResult,
  RepositoryResult,
} from "./types";

export interface IntegrationsRepository {
  listIntegrations(
    workspaceId: string,
    signal?: AbortSignal,
  ): Promise<RepositoryResult<IntegrationsListResponse>>;

  authorize(
    workspaceId: string,
    provider: IntegrationProvider,
    redirectUri?: string,
  ): Promise<RepositoryResult<IntegrationAuthorizeResponse>>;

  callback(
    workspaceId: string,
    provider: IntegrationProvider,
    code: string,
    state: string,
  ): Promise<RepositoryResult<IntegrationCatalogItem>>;

  saveCredentials(
    workspaceId: string,
    provider: IntegrationProvider,
    credentials: Record<string, string>,
  ): Promise<RepositoryResult<IntegrationCatalogItem>>;

  disconnect(
    workspaceId: string,
    provider: IntegrationProvider,
  ): Promise<RepositoryResult<IntegrationCatalogItem>>;

  sync(
    workspaceId: string,
    provider: IntegrationProvider,
    operation?: string,
    options?: Record<string, unknown>,
  ): Promise<
    RepositoryResult<{
      success: boolean;
      recordsSynced?: number;
      durationMs?: number;
      resources?: unknown[];
    }>
  >;

  getSyncHistory(
    workspaceId: string,
    provider: IntegrationProvider,
  ): Promise<
    RepositoryResult<
      Array<{
        id: string;
        operation: string;
        status: string;
        records_synced: number;
        duration_ms: number;
        created_at: string;
      }>
    >
  >;

  listMailchimpAudiences(workspaceId: string): Promise<RepositoryResult<MailchimpAudience[]>>;

  listMailchimpCampaigns(workspaceId: string): Promise<RepositoryResult<MailchimpCampaign[]>>;

  getMailchimpCampaign(
    workspaceId: string,
    campaignId: string,
  ): Promise<RepositoryResult<MailchimpCampaignDetail>>;

  createMailchimpCampaign(
    workspaceId: string,
    input: CreateMailchimpCampaignInput,
  ): Promise<RepositoryResult<MailchimpCampaignDraft>>;

  personalizeMailchimpEmail(
    workspaceId: string,
    input: PersonalizeEmailInput,
  ): Promise<RepositoryResult<PersonalizedEmail>>;

  sendMailchimpCampaign(
    workspaceId: string,
    campaignId: string,
  ): Promise<RepositoryResult<{ sent: boolean; campaignId: string }>>;

  listInstantlyAccounts(workspaceId: string): Promise<RepositoryResult<InstantlyAccount[]>>;

  connectInstantlyGoogleAccount(
    workspaceId: string,
    input: ConnectGoogleMailboxInput,
  ): Promise<RepositoryResult<ConnectGoogleMailboxResult>>;

  listInstantlyCampaigns(workspaceId: string): Promise<RepositoryResult<InstantlyCampaign[]>>;

  getInstantlyCampaign(
    workspaceId: string,
    campaignId: string,
  ): Promise<RepositoryResult<InstantlyCampaignDetail>>;

  createInstantlyCampaign(
    workspaceId: string,
    input: CreateInstantlyCampaignInput,
  ): Promise<RepositoryResult<InstantlyCampaignDetail>>;

  activateInstantlyCampaign(
    workspaceId: string,
    campaignId: string,
  ): Promise<RepositoryResult<{ activated: boolean; campaignId: string }>>;

  pauseInstantlyCampaign(
    workspaceId: string,
    campaignId: string,
  ): Promise<RepositoryResult<{ paused: boolean; campaignId: string }>>;

  resumeInstantlyCampaign(
    workspaceId: string,
    campaignId: string,
  ): Promise<RepositoryResult<{ resumed: boolean; campaignId: string }>>;

  deleteInstantlyCampaign(
    workspaceId: string,
    campaignId: string,
  ): Promise<RepositoryResult<{ deleted: boolean; campaignId: string }>>;

  personalizeEmail(
    workspaceId: string,
    input: PersonalizeEmailInput,
  ): Promise<RepositoryResult<PersonalizedEmail>>;
}

export class ApiIntegrationsRepository implements IntegrationsRepository {
  async listIntegrations(
    workspaceId: string,
    signal?: AbortSignal,
  ): Promise<RepositoryResult<IntegrationsListResponse>> {
    try {
      const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/integrations`, {
        signal,
        cache: "no-store",
      });

      const body = (await res.json().catch(() => ({}))) as IntegrationsListResponse & {
        error?: { message?: string };
      };

      if (!res.ok) {
        if (res.status === 403) {
          return { status: "forbidden", message: body.error?.message ?? "Access denied." };
        }
        return {
          status: "unavailable",
          message: body.error?.message ?? "Integrations service unavailable.",
        };
      }

      return { status: "ready", data: body };
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      return { status: "error", message: err instanceof Error ? err.message : "Network error" };
    }
  }

  async authorize(
    workspaceId: string,
    provider: IntegrationProvider,
    redirectUri?: string,
  ): Promise<RepositoryResult<IntegrationAuthorizeResponse>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/integrations/${encodeURIComponent(provider)}/authorize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ redirect_uri: redirectUri }),
        },
      );

      const body = (await res.json().catch(() => ({}))) as IntegrationAuthorizeResponse & {
        error?: { message?: string };
      };

      if (!res.ok) {
        return { status: "error", message: body.error?.message ?? "Failed to initiate OAuth" };
      }

      return { status: "ready", data: body };
    } catch (err) {
      return { status: "error", message: err instanceof Error ? err.message : "Network error" };
    }
  }

  async callback(
    workspaceId: string,
    provider: IntegrationProvider,
    code: string,
    state: string,
  ): Promise<RepositoryResult<IntegrationCatalogItem>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/integrations/${encodeURIComponent(provider)}/callback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, state }),
        },
      );

      const body = (await res.json().catch(() => ({}))) as {
        integration: IntegrationCatalogItem;
        error?: { message?: string };
      };

      if (!res.ok) {
        return { status: "error", message: body.error?.message ?? "Failed to complete connection" };
      }

      return { status: "ready", data: body.integration };
    } catch (err) {
      return { status: "error", message: err instanceof Error ? err.message : "Network error" };
    }
  }

  async saveCredentials(
    workspaceId: string,
    provider: IntegrationProvider,
    credentials: Record<string, string>,
  ): Promise<RepositoryResult<IntegrationCatalogItem>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/integrations/${encodeURIComponent(provider)}/credentials`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credentials }),
        },
      );

      const body = (await res.json().catch(() => ({}))) as {
        integration: IntegrationCatalogItem;
        error?: { message?: string };
      };

      if (!res.ok) {
        return { status: "error", message: body.error?.message ?? "Failed to save credentials" };
      }

      return { status: "ready", data: body.integration };
    } catch (err) {
      return { status: "error", message: err instanceof Error ? err.message : "Network error" };
    }
  }

  async disconnect(
    workspaceId: string,
    provider: IntegrationProvider,
  ): Promise<RepositoryResult<IntegrationCatalogItem>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/integrations/${encodeURIComponent(provider)}/connection`,
        {
          method: "DELETE",
        },
      );

      const body = (await res.json().catch(() => ({}))) as {
        integration: IntegrationCatalogItem;
        error?: { message?: string };
      };

      if (!res.ok) {
        return { status: "error", message: body.error?.message ?? "Failed to disconnect" };
      }

      return { status: "ready", data: body.integration };
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      return { status: "error", message: err instanceof Error ? err.message : "Network error" };
    }
  }

  async sync(
    workspaceId: string,
    provider: IntegrationProvider,
    operation = "manual_sync",
    options?: Record<string, unknown>,
  ): Promise<
    RepositoryResult<{
      success: boolean;
      recordsSynced?: number;
      durationMs?: number;
      resources?: unknown[];
    }>
  > {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/integrations/${encodeURIComponent(provider)}/sync`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operation, options }),
        },
      );

      const body = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        recordsSynced?: number;
        durationMs?: number;
        resources?: unknown[];
        error?: { message?: string };
      };

      if (!res.ok) {
        return { status: "error", message: body.error?.message ?? "Sync operation failed" };
      }

      return {
        status: "ready",
        data: {
          success: Boolean(body.success ?? true),
          recordsSynced: body.recordsSynced,
          durationMs: body.durationMs,
          resources: body.resources,
        },
      };
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      return { status: "error", message: err instanceof Error ? err.message : "Network error" };
    }
  }

  async getSyncHistory(
    workspaceId: string,
    provider: IntegrationProvider,
  ): Promise<
    RepositoryResult<
      Array<{
        id: string;
        operation: string;
        status: string;
        records_synced: number;
        duration_ms: number;
        created_at: string;
      }>
    >
  > {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/integrations/${encodeURIComponent(provider)}/history`,
        { cache: "no-store" },
      );

      const body = (await res.json().catch(() => ({}))) as {
        history?: Array<{
          id: string;
          operation: string;
          status: string;
          records_synced: number;
          duration_ms: number;
          created_at: string;
        }>;
        error?: { message?: string };
      };

      if (!res.ok) {
        return { status: "error", message: body.error?.message ?? "Failed to fetch sync history" };
      }

      return { status: "ready", data: body.history ?? [] };
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      return { status: "error", message: err instanceof Error ? err.message : "Network error" };
    }
  }
  async listMailchimpAudiences(
    workspaceId: string,
  ): Promise<RepositoryResult<MailchimpAudience[]>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/integrations/mailchimp/audiences`,
        { cache: "no-store" },
      );
      const body = (await res.json().catch(() => ({}))) as {
        audiences?: MailchimpAudience[];
        error?: { message?: string };
      };
      if (!res.ok) {
        return {
          status: "error",
          message: body.error?.message ?? "Failed to load Mailchimp audiences",
        };
      }
      return { status: "ready", data: body.audiences ?? [] };
    } catch (err) {
      return {
        status: "error",
        message: err instanceof Error ? err.message : "Network error",
      };
    }
  }

  async listMailchimpCampaigns(
    workspaceId: string,
  ): Promise<RepositoryResult<MailchimpCampaign[]>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/integrations/mailchimp/campaigns`,
        { cache: "no-store" },
      );
      const body = (await res.json().catch(() => ({}))) as {
        campaigns?: MailchimpCampaign[];
        error?: { message?: string };
      };
      if (!res.ok) {
        return {
          status: "error",
          message: body.error?.message ?? "Failed to load Mailchimp campaigns",
        };
      }
      return { status: "ready", data: body.campaigns ?? [] };
    } catch (err) {
      return {
        status: "error",
        message: err instanceof Error ? err.message : "Network error",
      };
    }
  }

  async getMailchimpCampaign(
    workspaceId: string,
    campaignId: string,
  ): Promise<RepositoryResult<MailchimpCampaignDetail>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/integrations/mailchimp/campaigns/${encodeURIComponent(campaignId)}`,
        { cache: "no-store" },
      );
      const body = (await res.json().catch(() => ({}))) as {
        campaign?: MailchimpCampaignDetail;
        error?: { message?: string };
      };
      if (!res.ok || !body.campaign) {
        return {
          status: "error",
          message: body.error?.message ?? "Failed to load Mailchimp campaign",
        };
      }
      return { status: "ready", data: body.campaign };
    } catch (err) {
      return {
        status: "error",
        message: err instanceof Error ? err.message : "Network error",
      };
    }
  }

  async createMailchimpCampaign(
    workspaceId: string,
    input: CreateMailchimpCampaignInput,
  ): Promise<RepositoryResult<MailchimpCampaignDraft>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/integrations/mailchimp/campaigns`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      const body = (await res.json().catch(() => ({}))) as Partial<MailchimpCampaignDraft> & {
        error?: { message?: string };
      };
      if (!res.ok || !body.campaignId) {
        return {
          status: "error",
          message: body.error?.message ?? "Failed to create Mailchimp campaign draft",
        };
      }
      return { status: "ready", data: body as MailchimpCampaignDraft };
    } catch (err) {
      return {
        status: "error",
        message: err instanceof Error ? err.message : "Network error",
      };
    }
  }

  async personalizeMailchimpEmail(
    workspaceId: string,
    input: PersonalizeEmailInput,
  ): Promise<RepositoryResult<PersonalizedEmail>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/integrations/mailchimp/personalize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      const body = (await res.json().catch(() => ({}))) as Partial<PersonalizedEmail> & {
        error?: { message?: string };
      };
      if (!res.ok || !body.subject || !body.html) {
        return {
          status: "error",
          message: body.error?.message ?? "Failed to personalize email",
        };
      }
      return {
        status: "ready",
        data: {
          subject: body.subject,
          html: body.html,
          source: body.source === "ai" ? "ai" : "fallback",
        },
      };
    } catch (err) {
      return {
        status: "error",
        message: err instanceof Error ? err.message : "Network error",
      };
    }
  }

  async listInstantlyAccounts(workspaceId: string): Promise<RepositoryResult<InstantlyAccount[]>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/integrations/instantly/accounts`,
        { cache: "no-store" },
      );
      const body = (await res.json().catch(() => ({}))) as {
        accounts?: InstantlyAccount[];
        error?: { message?: string };
      };
      if (!res.ok) {
        return {
          status: "error",
          message: body.error?.message ?? "Failed to load Instantly sending accounts",
        };
      }
      return { status: "ready", data: body.accounts ?? [] };
    } catch (err) {
      return {
        status: "error",
        message: err instanceof Error ? err.message : "Network error",
      };
    }
  }

  async connectInstantlyGoogleAccount(
    workspaceId: string,
    input: ConnectGoogleMailboxInput,
  ): Promise<RepositoryResult<ConnectGoogleMailboxResult>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/integrations/instantly/accounts/google-app-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      const body = (await res.json().catch(() => ({}))) as Partial<ConnectGoogleMailboxResult> & {
        error?: { message?: string };
      };
      if (!res.ok || !body.account || !body.message) {
        return {
          status: "error",
          message: body.error?.message ?? "Failed to connect the Google mailbox",
        };
      }
      return {
        status: "ready",
        data: {
          account: body.account,
          connected: Boolean(body.connected),
          message: body.message,
        },
      };
    } catch (err) {
      return {
        status: "error",
        message: err instanceof Error ? err.message : "Network error",
      };
    }
  }

  async listInstantlyCampaigns(
    workspaceId: string,
  ): Promise<RepositoryResult<InstantlyCampaign[]>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/integrations/instantly/campaigns`,
        { cache: "no-store" },
      );
      const body = (await res.json().catch(() => ({}))) as {
        campaigns?: InstantlyCampaign[];
        error?: { message?: string };
      };
      if (!res.ok) {
        return {
          status: "error",
          message: body.error?.message ?? "Failed to load Instantly campaigns",
        };
      }
      return { status: "ready", data: body.campaigns ?? [] };
    } catch (err) {
      return {
        status: "error",
        message: err instanceof Error ? err.message : "Network error",
      };
    }
  }

  async getInstantlyCampaign(
    workspaceId: string,
    campaignId: string,
  ): Promise<RepositoryResult<InstantlyCampaignDetail>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/integrations/instantly/campaigns/${encodeURIComponent(campaignId)}`,
        { cache: "no-store" },
      );
      const body = (await res.json().catch(() => ({}))) as {
        campaign?: InstantlyCampaignDetail;
        error?: { message?: string };
      };
      if (!res.ok || !body.campaign) {
        return {
          status: "error",
          message: body.error?.message ?? "Failed to load Instantly campaign",
        };
      }
      return { status: "ready", data: body.campaign };
    } catch (err) {
      return {
        status: "error",
        message: err instanceof Error ? err.message : "Network error",
      };
    }
  }

  async createInstantlyCampaign(
    workspaceId: string,
    input: CreateInstantlyCampaignInput,
  ): Promise<RepositoryResult<InstantlyCampaignDetail>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/integrations/instantly/campaigns`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      const body = (await res.json().catch(() => ({}))) as {
        campaign?: InstantlyCampaignDetail;
        error?: { message?: string };
      };
      if (!res.ok || !body.campaign) {
        return {
          status: "error",
          message: body.error?.message ?? "Failed to create Instantly campaign",
        };
      }
      return { status: "ready", data: body.campaign };
    } catch (err) {
      return {
        status: "error",
        message: err instanceof Error ? err.message : "Network error",
      };
    }
  }

  async activateInstantlyCampaign(
    workspaceId: string,
    campaignId: string,
  ): Promise<RepositoryResult<{ activated: boolean; campaignId: string }>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/integrations/instantly/campaigns/${encodeURIComponent(campaignId)}/activate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );
      const body = (await res.json().catch(() => ({}))) as {
        activated?: boolean;
        campaignId?: string;
        error?: { message?: string };
      };
      if (!res.ok) {
        return {
          status: "error",
          message: body.error?.message ?? "Failed to activate Instantly campaign",
        };
      }
      return {
        status: "ready",
        data: {
          activated: Boolean(body.activated),
          campaignId: body.campaignId ?? campaignId,
        },
      };
    } catch (err) {
      return {
        status: "error",
        message: err instanceof Error ? err.message : "Network error",
      };
    }
  }

  async pauseInstantlyCampaign(
    workspaceId: string,
    campaignId: string,
  ): Promise<RepositoryResult<{ paused: boolean; campaignId: string }>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/integrations/instantly/campaigns/${encodeURIComponent(campaignId)}/pause`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );
      const body = (await res.json().catch(() => ({}))) as {
        paused?: boolean;
        campaignId?: string;
        error?: { message?: string };
      };
      if (!res.ok) {
        return {
          status: "error",
          message: body.error?.message ?? "Failed to pause Instantly campaign",
        };
      }
      return {
        status: "ready",
        data: {
          paused: Boolean(body.paused),
          campaignId: body.campaignId ?? campaignId,
        },
      };
    } catch (err) {
      return {
        status: "error",
        message: err instanceof Error ? err.message : "Network error",
      };
    }
  }

  async resumeInstantlyCampaign(
    workspaceId: string,
    campaignId: string,
  ): Promise<RepositoryResult<{ resumed: boolean; campaignId: string }>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/integrations/instantly/campaigns/${encodeURIComponent(campaignId)}/resume`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );
      const body = (await res.json().catch(() => ({}))) as {
        resumed?: boolean;
        campaignId?: string;
        error?: { message?: string };
      };
      if (!res.ok) {
        return {
          status: "error",
          message: body.error?.message ?? "Failed to resume Instantly campaign",
        };
      }
      return {
        status: "ready",
        data: {
          resumed: Boolean(body.resumed),
          campaignId: body.campaignId ?? campaignId,
        },
      };
    } catch (err) {
      return {
        status: "error",
        message: err instanceof Error ? err.message : "Network error",
      };
    }
  }

  async deleteInstantlyCampaign(
    workspaceId: string,
    campaignId: string,
  ): Promise<RepositoryResult<{ deleted: boolean; campaignId: string }>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/integrations/instantly/campaigns/${encodeURIComponent(campaignId)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        },
      );
      const body = (await res.json().catch(() => ({}))) as {
        deleted?: boolean;
        campaignId?: string;
        error?: { message?: string };
      };
      if (!res.ok) {
        return {
          status: "error",
          message: body.error?.message ?? "Failed to delete Instantly campaign",
        };
      }
      return {
        status: "ready",
        data: {
          deleted: Boolean(body.deleted),
          campaignId: body.campaignId ?? campaignId,
        },
      };
    } catch (err) {
      return {
        status: "error",
        message: err instanceof Error ? err.message : "Network error",
      };
    }
  }

  async personalizeEmail(
    workspaceId: string,
    input: PersonalizeEmailInput,
  ): Promise<RepositoryResult<PersonalizedEmail>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/integrations/email/personalize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      const body = (await res.json().catch(() => ({}))) as Partial<PersonalizedEmail> & {
        error?: { message?: string };
      };
      if (!res.ok || !body.subject || !body.html) {
        return {
          status: "error",
          message: body.error?.message ?? "Failed to personalize email",
        };
      }
      return {
        status: "ready",
        data: {
          subject: body.subject,
          html: body.html,
          source: body.source === "ai" ? "ai" : "fallback",
        },
      };
    } catch (err) {
      return {
        status: "error",
        message: err instanceof Error ? err.message : "Network error",
      };
    }
  }

  async sendMailchimpCampaign(
    workspaceId: string,
    campaignId: string,
  ): Promise<RepositoryResult<{ sent: boolean; campaignId: string }>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/integrations/mailchimp/campaigns/${encodeURIComponent(campaignId)}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm: true }),
        },
      );
      const body = (await res.json().catch(() => ({}))) as {
        sent?: boolean;
        campaignId?: string;
        error?: { message?: string };
      };
      if (!res.ok) {
        return {
          status: "error",
          message: body.error?.message ?? "Failed to send Mailchimp campaign",
        };
      }
      return {
        status: "ready",
        data: { sent: Boolean(body.sent), campaignId: body.campaignId ?? campaignId },
      };
    } catch (err) {
      return {
        status: "error",
        message: err instanceof Error ? err.message : "Network error",
      };
    }
  }
}

export const apiIntegrationsRepository = new ApiIntegrationsRepository();
