import type {
  IntegrationAuthorizeResponse,
  IntegrationCatalogItem,
  IntegrationProvider,
  IntegrationsListResponse,
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
  ): Promise<RepositoryResult<{ success: boolean; recordsSynced?: number; durationMs?: number; resources?: any[] }>>;

  getSyncHistory(
    workspaceId: string,
    provider: IntegrationProvider,
  ): Promise<RepositoryResult<Array<{ id: string; operation: string; status: string; records_synced: number; duration_ms: number; created_at: string }>>>;
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
  ): Promise<RepositoryResult<{ success: boolean; recordsSynced?: number; durationMs?: number; resources?: any[] }>> {
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
        resources?: any[];
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
  ): Promise<RepositoryResult<Array<{ id: string; operation: string; status: string; records_synced: number; duration_ms: number; created_at: string }>>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/integrations/${encodeURIComponent(provider)}/history`,
        { cache: "no-store" },
      );

      const body = (await res.json().catch(() => ({}))) as {
        history?: Array<any>;
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
}

export const apiIntegrationsRepository = new ApiIntegrationsRepository();
