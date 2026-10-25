import { randomBytes } from "node:crypto";
import { AppError, ErrorCode } from "@quickstart/errors";
import type {
  IntegrationAuthorizeResponse,
  IntegrationCatalogItem,
  IntegrationProvider,
  IntegrationsListResponse,
  IntegrationStatus,
  IntegrationSyncRequest,
  IntegrationSyncResult,
} from "@quickstart/contracts";
import type { IntegrationsRepository, SyncLogRow } from "../repository/integrations.repository.js";
import { ProviderRegistry } from "../integrations/provider-registry.js";
import { SecretsClient } from "../clients/secrets.client.js";

const CATALOG_DEFINITIONS: Omit<IntegrationCatalogItem, "status">[] = [
  {
    id: "hubspot",
    name: "HubSpot",
    category: "crm_leads",
    categoryLabel: "CRM & Leads",
    description: "Sync contacts, deals, and activity between HubSpot and QuickStart AI.",
    connectionType: "oauth",
    requiredScopes: ["crm.objects.contacts.read", "crm.objects.deals.read"],
  },
  {
    id: "salesforce",
    name: "Salesforce",
    category: "crm_leads",
    categoryLabel: "CRM & Leads",
    description: "Sync leads, contacts, and opportunities from Salesforce.",
    connectionType: "oauth",
    requiredScopes: ["api", "refresh_token", "offline_access"],
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    category: "calendar_booking",
    categoryLabel: "Calendar & Booking",
    description: "Check availability and create appointment events in selected calendars.",
    connectionType: "oauth",
    requiredScopes: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.readonly",
    ],
  },
  {
    id: "slack",
    name: "Slack",
    category: "communication",
    categoryLabel: "Communication",
    description: "Send notifications, share updates, and collaborate with your team.",
    connectionType: "oauth",
    requiredScopes: ["chat:write", "channels:read"],
  },
  {
    id: "twilio",
    name: "Twilio",
    category: "telephony",
    categoryLabel: "Telephony",
    description: "Make and receive calls, send SMS, and manage your phone numbers.",
    connectionType: "credentials",
  },
  {
    id: "zendesk",
    name: "Zendesk",
    category: "crm_leads",
    categoryLabel: "CRM & Leads",
    description: "Sync support tickets and customer conversations.",
    connectionType: "oauth",
    requiredScopes: ["read", "write"],
  },
  {
    id: "google_sheets",
    name: "Google Sheets",
    category: "productivity",
    categoryLabel: "Data & Productivity",
    description: "Export call logs, leads, and analytics to Google Sheets.",
    connectionType: "oauth",
    requiredScopes: ["https://www.googleapis.com/auth/spreadsheets"],
  },
  {
    id: "notion",
    name: "Notion",
    category: "productivity",
    categoryLabel: "Productivity",
    description: "Sync knowledge base and documentation.",
    connectionType: "oauth",
  },
  {
    id: "mailchimp",
    name: "Mailchimp",
    category: "marketing",
    categoryLabel: "Marketing",
    description: "Sync contacts and campaigns.",
    connectionType: "oauth",
  },
  {
    id: "apify",
    name: "Apify",
    category: "crm_leads",
    categoryLabel: "CRM & Leads",
    description: "Scrape Google Maps, business directories, and web sources directly into your lead pipeline.",
    connectionType: "credentials",
  },
];

export class IntegrationsService {
  private readonly registry: ProviderRegistry;
  private readonly secrets: SecretsClient;

  constructor(
    private readonly repo: IntegrationsRepository,
    secretsClient?: SecretsClient,
    registry?: ProviderRegistry,
  ) {
    this.registry = registry ?? new ProviderRegistry();
    this.secrets =
      secretsClient ??
      new SecretsClient({
        internalToken: process.env.WORKSPACE_INTERNAL_TOKEN ?? process.env.INTERNAL_TOKEN ?? "internal-token",
      });
  }

  async listIntegrations(workspaceId: string): Promise<IntegrationsListResponse> {
    const existing = await this.repo.listByWorkspace(workspaceId);
    const existingMap = new Map(existing.map((e) => [e.provider, e]));
    const capabilitiesMap = this.registry.listCapabilities();

    let connectedCount = 0;
    const catalog: IntegrationCatalogItem[] = CATALOG_DEFINITIONS.map((def) => {
      const persisted = existingMap.get(def.id);
      const status: IntegrationStatus = (persisted?.status as IntegrationStatus) ?? "not_connected";
      if (status === "connected") {
        connectedCount += 1;
      }

      return {
        ...def,
        status,
        connectionId: persisted?.id ?? null,
        accountIdentifier: persisted?.account_identifier ?? null,
        accountEmail: persisted?.account_email ?? null,
        accountName: persisted?.account_name ?? null,
        grantedScopes: persisted?.granted_scopes ?? [],
        capabilities: capabilitiesMap[def.id],
        connectedAt: persisted?.connected_at ? persisted.connected_at.toISOString() : null,
        updatedAt: persisted?.updated_at ? persisted.updated_at.toISOString() : null,
        lastVerifiedAt: persisted?.last_verified_at ? persisted.last_verified_at.toISOString() : null,
        lastSyncAt: persisted?.last_sync_at ? persisted.last_sync_at.toISOString() : null,
        lastError: persisted?.last_error ?? null,
      };
    });

    const categories = [
      { id: "all", label: "All", count: catalog.length },
      {
        id: "crm_leads",
        label: "CRM & Leads",
        count: catalog.filter((c) => c.category === "crm_leads").length,
      },
      {
        id: "calendar_booking",
        label: "Calendar & Booking",
        count: catalog.filter((c) => c.category === "calendar_booking").length,
      },
      {
        id: "communication",
        label: "Communication",
        count: catalog.filter((c) => c.category === "communication").length,
      },
      {
        id: "telephony",
        label: "Telephony",
        count: catalog.filter((c) => c.category === "telephony").length,
      },
      {
        id: "productivity",
        label: "Productivity",
        count: catalog.filter((c) => c.category === "productivity").length,
      },
      {
        id: "marketing",
        label: "Marketing",
        count: catalog.filter((c) => c.category === "marketing").length,
      },
    ];

    return {
      connected_count: connectedCount,
      catalog,
      categories,
    };
  }

  async getIntegration(
    workspaceId: string,
    provider: IntegrationProvider,
  ): Promise<IntegrationCatalogItem> {
    const def = CATALOG_DEFINITIONS.find((d) => d.id === provider);
    if (!def) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: `Unknown integration provider '${provider}'`,
      });
    }

    const persisted = await this.repo.getByProvider(workspaceId, provider);
    const status: IntegrationStatus = (persisted?.status as IntegrationStatus) ?? "not_connected";
    const capabilities = this.registry.getAdapter(provider).capabilities;

    return {
      ...def,
      status,
      connectionId: persisted?.id ?? null,
      accountIdentifier: persisted?.account_identifier ?? null,
      accountEmail: persisted?.account_email ?? null,
      accountName: persisted?.account_name ?? null,
      grantedScopes: persisted?.granted_scopes ?? [],
      capabilities,
      connectedAt: persisted?.connected_at ? persisted.connected_at.toISOString() : null,
      updatedAt: persisted?.updated_at ? persisted.updated_at.toISOString() : null,
      lastVerifiedAt: persisted?.last_verified_at ? persisted.last_verified_at.toISOString() : null,
      lastSyncAt: persisted?.last_sync_at ? persisted.last_sync_at.toISOString() : null,
      lastError: persisted?.last_error ?? null,
    };
  }

  async initiateOAuth(
    workspaceId: string,
    userId: string,
    provider: IntegrationProvider,
    redirectUri: string,
    options?: { scopes?: string[]; subdomain?: string },
  ): Promise<IntegrationAuthorizeResponse> {
    const def = CATALOG_DEFINITIONS.find((d) => d.id === provider);
    if (!def || def.connectionType !== "oauth") {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `Provider '${provider}' does not support OAuth authorization.`,
      });
    }

    const adapter = this.registry.getAdapter(provider);
    const stateToken = randomBytes(24).toString("hex");
    const codeVerifier = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.repo.saveOAuthState({
      workspaceId,
      userId,
      provider,
      stateToken,
      codeVerifier,
      redirectUri,
      expiresAt,
    });

    const { url } = adapter.getAuthorizationUrl({
      state: stateToken,
      redirectUri,
      codeVerifier,
      scopes: options?.scopes,
      subdomain: options?.subdomain,
    });

    return {
      authorization_url: url,
      state: stateToken,
      provider,
    };
  }

  async handleOAuthCallback(
    workspaceId: string,
    userId: string,
    provider: IntegrationProvider,
    code: string,
    state: string,
    options?: { subdomain?: string },
  ): Promise<IntegrationCatalogItem> {
    const storedState = await this.repo.getOAuthState(state);
    if (!storedState) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Invalid or expired OAuth state token.",
      });
    }

    if (
      storedState.workspace_id !== workspaceId ||
      storedState.user_id !== userId ||
      storedState.provider !== provider
    ) {
      throw new AppError({
        code: ErrorCode.FORBIDDEN,
        message: "OAuth state does not match workspace or session.",
      });
    }

    // Delete one-time state token
    await this.repo.deleteOAuthState(state);

    const adapter = this.registry.getAdapter(provider);
    const tokenResult = await adapter.exchangeCode({
      code,
      redirectUri: storedState.redirect_uri,
      codeVerifier: storedState.code_verifier ?? undefined,
      subdomain: options?.subdomain,
    });

    // Store encrypted credentials in secrets-service
    await this.secrets.storeIntegrationSecret(workspaceId, provider, {
      accessToken: tokenResult.accessToken,
      refreshToken: tokenResult.refreshToken,
      tokenType: tokenResult.tokenType,
      expiresIn: tokenResult.expiresIn,
      rawPayload: tokenResult.rawPayload,
      storedAt: new Date().toISOString(),
    });

    const tokenExpiresAt = tokenResult.expiresIn
      ? new Date(Date.now() + tokenResult.expiresIn * 1000)
      : null;

    await this.repo.upsertConnection({
      workspaceId,
      provider,
      status: "connected",
      accountIdentifier: tokenResult.accountIdentifier,
      accountEmail: tokenResult.accountEmail,
      accountName: tokenResult.accountName,
      providerAccountId: tokenResult.providerAccountId,
      grantedScopes: tokenResult.grantedScopes,
      tokenExpiresAt,
      metadata: {
        connected_by_user_id: userId,
        has_refresh_token: Boolean(tokenResult.refreshToken),
      },
    });

    return this.getIntegration(workspaceId, provider);
  }

  async saveCredentials(
    workspaceId: string,
    provider: IntegrationProvider,
    credentials: Record<string, string>,
  ): Promise<IntegrationCatalogItem> {
    const def = CATALOG_DEFINITIONS.find((d) => d.id === provider);
    if (!def) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: `Unknown provider '${provider}'`,
      });
    }

    const adapter = this.registry.getAdapter(provider);
    if (!adapter.verifyCredentials) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `Provider '${provider}' does not support credential submission.`,
      });
    }

    // Verify real credentials with the provider
    const verification = await adapter.verifyCredentials(credentials);

    // Store encrypted credentials in secrets-service
    await this.secrets.storeIntegrationSecret(workspaceId, provider, {
      ...credentials,
      verifiedAt: new Date().toISOString(),
    });

    await this.repo.upsertConnection({
      workspaceId,
      provider,
      status: "connected",
      accountIdentifier: verification.accountIdentifier,
      accountEmail: verification.accountEmail,
      accountName: verification.accountName,
      providerAccountId: verification.providerAccountId,
      grantedScopes: verification.grantedScopes ?? [],
      metadata: verification.metadata ?? {},
    });

    return this.getIntegration(workspaceId, provider);
  }

  async syncIntegration(
    workspaceId: string,
    provider: IntegrationProvider,
    body: IntegrationSyncRequest,
  ): Promise<IntegrationSyncResult> {
    const connection = await this.repo.getByProvider(workspaceId, provider);
    if (!connection || connection.status !== "connected") {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `Integration '${provider}' is not connected.`,
      });
    }

    const adapter = this.registry.getAdapter(provider);
    if (!adapter.syncResource) {
      return {
        success: true,
        provider,
        recordsSynced: 0,
        durationMs: 0,
        message: `Provider '${provider}' does not support resource synchronization.`,
      };
    }

    // Retrieve decrypted token
    const creds = await this.secrets.getIntegrationSecret(workspaceId, provider);
    const token =
      (creds?.accessToken as string) ||
      (creds?.accountSid && creds?.authToken ? `${creds.accountSid}:${creds.authToken}` : "");

    if (!token) {
      throw new AppError({
        code: ErrorCode.UNAUTHORIZED,
        message: `Missing stored credentials for '${provider}'. Please reconnect.`,
      });
    }

    const start = Date.now();
    try {
      const syncResult = await adapter.syncResource({
        accessToken: token,
        operation: body.operation,
        resourceType: body.resourceType,
        options: body.options,
      });
      const durationMs = Date.now() - start;

      await this.repo.recordSyncLog({
        workspaceId,
        provider,
        operation: body.operation,
        status: "success",
        recordsSynced: syncResult.recordsSynced,
        durationMs,
        metadata: syncResult.details ?? {},
      });

      return {
        success: true,
        provider,
        recordsSynced: syncResult.recordsSynced,
        durationMs,
        resources: syncResult.resources,
      };
    } catch (err) {
      const durationMs = Date.now() - start;
      const errorMessage = err instanceof Error ? err.message : "Sync failed";

      await this.repo.recordSyncLog({
        workspaceId,
        provider,
        operation: body.operation,
        status: "failed",
        recordsSynced: 0,
        durationMs,
        errorMessage,
      });

      return {
        success: false,
        provider,
        durationMs,
        error: { code: "SYNC_FAILED", message: errorMessage },
      };
    }
  }

  async listSyncHistory(
    workspaceId: string,
    provider?: IntegrationProvider,
  ): Promise<SyncLogRow[]> {
    return this.repo.listSyncLogs(workspaceId, provider, 20);
  }

  async disconnect(
    workspaceId: string,
    provider: IntegrationProvider,
  ): Promise<IntegrationCatalogItem> {
    const creds = await this.secrets.getIntegrationSecret(workspaceId, provider);
    const token = creds?.accessToken as string | undefined;

    const adapter = this.registry.getAdapter(provider);
    if (token && adapter.revokeToken) {
      try {
        await adapter.revokeToken(token);
      } catch {
        // Best-effort remote revocation
      }
    }

    // Delete credentials from secrets-service
    await this.secrets.deleteIntegrationSecret(workspaceId, provider);

    // Update connection status in database
    await this.repo.deleteConnection(workspaceId, provider);

    return this.getIntegration(workspaceId, provider);
  }
}
