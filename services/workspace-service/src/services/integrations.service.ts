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
import {
  executeIntegrationAction,
  INTEGRATION_ACTION_PROVIDERS,
  type IntegrationActionResult,
} from "../integrations/integration-actions.js";

export type CalendarActionInput = {
  action: "check_availability" | "book_slot" | "cancel_event";
  calendar_id?: string;
  timezone?: string;
  date?: string;
  start?: string;
  end?: string;
  slot_minutes?: number;
  working_hours?: { start?: string; end?: string };
  max_slots?: number;
  summary?: string;
  description?: string;
  attendee_email?: string;
  event_id?: string;
};

export type CalendarActionResult = Record<string, unknown>;

class GoogleApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "GoogleApiError";
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function timezoneOffsetMs(instant: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = formatter.formatToParts(instant);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    read("hour") % 24,
    read("minute"),
    read("second"),
  );
  return asUtc - instant.getTime();
}

function zonedDateTimeToUtc(date: string, time: string, timeZone: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "Expected date YYYY-MM-DD and time HH:mm",
    });
  }
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const firstOffset = timezoneOffsetMs(new Date(guess), timeZone);
  let utc = guess - firstOffset;
  const secondOffset = timezoneOffsetMs(new Date(utc), timeZone);
  if (secondOffset !== firstOffset) utc = guess - secondOffset;
  return new Date(utc);
}

function parseCalendarTime(value: string, timeZone: string): Date {
  const trimmed = value.trim();
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Invalid start/end time" });
    }
    return parsed;
  }
  const local = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::\d{2})?$/.exec(trimmed);
  if (local) return zonedDateTimeToUtc(local[1], local[2], timeZone);
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Invalid start/end time" });
  }
  return parsed;
}

function formatLocalTime(instantMs: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(instantMs));
}

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
        internalToken: process.env.SECRETS_INTERNAL_TOKEN ?? process.env.INTERNAL_TOKEN ?? "",
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
        ...(provider === "zendesk" && tokenResult.rawPayload?.subdomain
          ? { subdomain: String(tokenResult.rawPayload.subdomain) }
          : {}),
        ...(provider === "salesforce" && tokenResult.rawPayload?.instance_url
          ? { instance_url: String(tokenResult.rawPayload.instance_url) }
          : {}),
        ...(provider === "mailchimp" && tokenResult.rawPayload?.dc
          ? { dc: String(tokenResult.rawPayload.dc) }
          : {}),
        ...(provider === "mailchimp" && tokenResult.rawPayload?.api_endpoint
          ? { api_endpoint: String(tokenResult.rawPayload.api_endpoint) }
          : {}),
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

  /**
   * Appointment actions for the built-in agent calendar tool.
   * Credentials stay in workspace-service; callers only see the calendar result.
   */
  async executeCalendarAction(
    workspaceId: string,
    input: CalendarActionInput,
  ): Promise<CalendarActionResult> {
    const provider: IntegrationProvider = "google_calendar";
    const connection = await this.repo.getByProvider(workspaceId, provider);
    if (!connection || connection.status !== "connected") {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message:
          "Google Calendar is not connected for this workspace. Connect it in Settings → Integrations.",
      });
    }

    const credentials = await this.secrets.getIntegrationSecret(workspaceId, provider);
    let accessToken =
      typeof credentials?.accessToken === "string" ? credentials.accessToken : "";
    let refreshToken =
      typeof credentials?.refreshToken === "string" ? credentials.refreshToken : "";
    if (!accessToken) {
      throw new AppError({
        code: ErrorCode.UNAUTHORIZED,
        message: "Missing stored Google Calendar credentials. Reconnect the integration.",
      });
    }

    if (this.tokenExpiring(connection.token_expires_at)) {
      const refreshed = await this.refreshProviderAccess(
        workspaceId,
        provider,
        refreshToken,
        connection.granted_scopes,
      );
      accessToken = refreshed.accessToken;
      refreshToken = refreshed.refreshToken;
    }

    const calendarId = input.calendar_id?.trim() || "primary";
    const timezone = input.timezone?.trim() || "UTC";

    try {
      return await this.runCalendarAction(accessToken, calendarId, timezone, input);
    } catch (err) {
      if (err instanceof GoogleApiError && err.status === 401 && refreshToken) {
        const refreshed = await this.refreshProviderAccess(
          workspaceId,
          provider,
          refreshToken,
          connection.granted_scopes,
        );
        return this.runCalendarAction(refreshed.accessToken, calendarId, timezone, input);
      }
      if (err instanceof GoogleApiError) {
        throw new AppError({
          code: ErrorCode.UPSTREAM_UNAVAILABLE,
          message: `Google Calendar error (${err.status || "network"}): ${err.message}`,
        });
      }
      throw err;
    }
  }

  /**
   * Execute a built-in action on a connected integration. Credentials stay in
   * workspace-service; the runtime only supplies the action and its arguments.
   */
  async executeIntegrationAction(
    workspaceId: string,
    provider: IntegrationProvider,
    action: string,
    input: Record<string, unknown>,
  ): Promise<IntegrationActionResult> {
    if (!INTEGRATION_ACTION_PROVIDERS.has(provider)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `Integration '${provider}' has no built-in agent actions`,
      });
    }
    const connection = await this.repo.getByProvider(workspaceId, provider);
    if (!connection || connection.status !== "connected") {
      return {
        ok: false,
        error: `${provider} is not connected for this workspace`,
        notConnected: true,
      };
    }

    const credentials = (await this.secrets.getIntegrationSecret(workspaceId, provider)) ?? {};
    let accessToken =
      typeof credentials.accessToken === "string" ? credentials.accessToken : undefined;
    let refreshToken =
      typeof credentials.refreshToken === "string" ? credentials.refreshToken : "";
    const adapter = this.registry.getAdapter(provider);

    if (
      accessToken &&
      refreshToken &&
      adapter.refreshToken &&
      this.tokenExpiring(connection.token_expires_at)
    ) {
      const refreshed = await this.refreshProviderAccess(
        workspaceId,
        provider,
        refreshToken,
        connection.granted_scopes,
      );
      accessToken = refreshed.accessToken;
      refreshToken = refreshed.refreshToken;
    }

    const run = () =>
      executeIntegrationAction({
        provider,
        action,
        input,
        accessToken,
        credentials,
        connection: {
          accountIdentifier: connection.account_identifier,
          accountName: connection.account_name ?? null,
          metadata: connection.metadata,
        },
      });

    let result = await run();
    if (
      !result.ok &&
      result.status === 401 &&
      refreshToken &&
      adapter.refreshToken
    ) {
      const refreshed = await this.refreshProviderAccess(
        workspaceId,
        provider,
        refreshToken,
        connection.granted_scopes,
      );
      accessToken = refreshed.accessToken;
      result = await run();
    }
    return result;
  }

  private tokenExpiring(expiresAt?: Date | null): boolean {
    if (!expiresAt) return false;
    return expiresAt.getTime() - Date.now() < 60_000;
  }

  private async refreshProviderAccess(
    workspaceId: string,
    provider: IntegrationProvider,
    refreshToken: string,
    grantedScopes: string[],
  ): Promise<{ accessToken: string; refreshToken: string }> {
    if (!refreshToken) {
      throw new AppError({
        code: ErrorCode.UNAUTHORIZED,
        message: `${provider} refresh token is missing. Reconnect the integration.`,
      });
    }
    const adapter = this.registry.getAdapter(provider);
    if (!adapter.refreshToken) {
      throw new AppError({
        code: ErrorCode.UNAUTHORIZED,
        message: `${provider} token refresh is not supported. Reconnect the integration.`,
      });
    }
    let refreshed: { accessToken: string; refreshToken?: string; expiresIn?: number };
    try {
      refreshed = await adapter.refreshToken(refreshToken);
    } catch (err) {
      throw new AppError({
        code: ErrorCode.UNAUTHORIZED,
        message: `${provider} token refresh failed: ${
          err instanceof Error ? err.message : "unknown error"
        }. Reconnect the integration.`,
      });
    }
    const nextRefreshToken = refreshed.refreshToken ?? refreshToken;
    const existing = (await this.secrets.getIntegrationSecret(workspaceId, provider)) ?? {};
    await this.secrets.storeIntegrationSecret(workspaceId, provider, {
      ...existing,
      accessToken: refreshed.accessToken,
      refreshToken: nextRefreshToken,
      storedAt: new Date().toISOString(),
    });
    await this.repo.upsertConnection({
      workspaceId,
      provider,
      status: "connected",
      grantedScopes,
      tokenExpiresAt: refreshed.expiresIn
        ? new Date(Date.now() + refreshed.expiresIn * 1000)
        : null,
    });
    return { accessToken: refreshed.accessToken, refreshToken: nextRefreshToken };
  }

  private async runCalendarAction(
    accessToken: string,
    calendarId: string,
    timezone: string,
    input: CalendarActionInput,
  ): Promise<CalendarActionResult> {
    if (input.action === "check_availability") {
      const date = input.date?.trim() ?? "";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "date must be YYYY-MM-DD for check_availability",
        });
      }
      const workStart = input.working_hours?.start?.trim() || "09:00";
      const workEnd = input.working_hours?.end?.trim() || "17:00";
      const timeMin = zonedDateTimeToUtc(date, workStart, timezone);
      const timeMax = zonedDateTimeToUtc(date, workEnd, timezone);
      if (timeMax.getTime() <= timeMin.getTime()) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "working_hours.end must be after working_hours.start",
        });
      }
      const slotMinutes = clamp(input.slot_minutes ?? 30, 5, 240);
      const maxSlots = clamp(input.max_slots ?? 6, 1, 20);

      const body = await this.googleJson(
        "https://www.googleapis.com/calendar/v3/freeBusy",
        accessToken,
        {
          method: "POST",
          body: JSON.stringify({
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            timeZone: timezone,
            items: [{ id: calendarId }],
          }),
        },
      );
      const calendars = body.calendars as
        | Record<string, { busy?: Array<{ start?: string; end?: string }> }>
        | undefined;
      const busy = (calendars?.[calendarId]?.busy ?? [])
        .map((interval) => {
          const start = interval.start ? new Date(interval.start).getTime() : NaN;
          const end = interval.end ? new Date(interval.end).getTime() : NaN;
          return Number.isFinite(start) && Number.isFinite(end) ? [start, end] : null;
        })
        .filter((interval): interval is [number, number] => interval !== null);

      const slotMs = slotMinutes * 60_000;
      const slots: Array<{ start: string; end: string; label: string }> = [];
      for (
        let start = timeMin.getTime();
        start + slotMs <= timeMax.getTime();
        start += slotMs
      ) {
        const end = start + slotMs;
        if (busy.some(([busyStart, busyEnd]) => start < busyEnd && end > busyStart)) continue;
        slots.push({
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          label: formatLocalTime(start, timezone),
        });
        if (slots.length >= maxSlots) break;
      }

      return {
        action: "check_availability",
        calendar_id: calendarId,
        timezone,
        date,
        slot_minutes: slotMinutes,
        slots,
        busy_periods: busy.length,
      };
    }

    if (input.action === "book_slot") {
      const rawStart = input.start?.trim() ?? "";
      const rawEnd = input.end?.trim() ?? "";
      if (!rawStart || !rawEnd) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "start and end are required for book_slot",
        });
      }
      const start = parseCalendarTime(rawStart, timezone);
      const end = parseCalendarTime(rawEnd, timezone);
      if (end.getTime() <= start.getTime()) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "end must be after start",
        });
      }
      const summary = input.summary?.trim() || "Appointment";
      const body = await this.googleJson(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
          calendarId,
        )}/events`,
        accessToken,
        {
          method: "POST",
          body: JSON.stringify({
            summary,
            description: input.description?.trim() || "",
            start: { dateTime: start.toISOString(), timeZone: timezone },
            end: { dateTime: end.toISOString(), timeZone: timezone },
            ...(input.attendee_email?.trim()
              ? { attendees: [{ email: input.attendee_email.trim() }] }
              : {}),
          }),
        },
      );
      return {
        action: "book_slot",
        calendar_id: calendarId,
        event_id: body.id ?? null,
        html_link: body.htmlLink ?? null,
        summary,
        start: start.toISOString(),
        end: end.toISOString(),
      };
    }

    const eventId = input.event_id?.trim();
    if (!eventId) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "event_id is required for cancel_event",
      });
    }
    await this.googleJson(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        calendarId,
      )}/events/${encodeURIComponent(eventId)}`,
      accessToken,
      { method: "DELETE" },
    );
    return {
      action: "cancel_event",
      calendar_id: calendarId,
      event_id: eventId,
      cancelled: true,
    };
  }

  private async googleJson(
    url: string,
    accessToken: string,
    init: { method: string; body?: string },
  ): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(url, {
        method: init.method,
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: init.body,
        signal: controller.signal,
      });
      const text = await res.text();
      let body: Record<string, unknown> = {};
      try {
        body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
      } catch {
        body = { raw: text.slice(0, 200) };
      }
      if (!res.ok) {
        const error = body.error as { message?: string } | string | undefined;
        const message =
          typeof error === "string" ? error : (error?.message ?? `HTTP ${res.status}`);
        throw new GoogleApiError(res.status, message);
      }
      return body;
    } catch (err) {
      if (err instanceof GoogleApiError) throw err;
      throw new GoogleApiError(
        0,
        err instanceof Error ? err.message : "Google Calendar network error",
      );
    } finally {
      clearTimeout(timer);
    }
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
