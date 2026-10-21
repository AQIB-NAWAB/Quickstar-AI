import { developerPreviewStore } from "./preview-store";
import type {
  DeliveryAttempt,
  RepositoryResult,
  WebhookDelivery,
  WebhookEndpoint,
  WebhooksRepository,
} from "./types";

type BackendEndpointItem = {
  id: string;
  workspace_id: string;
  url: string;
  events: string[];
  status: string;
  signing_secret?: string;
  last_delivery_at: string | null;
  last_delivery_status: number | null;
  consecutive_failures: number;
  created_at: string;
  updated_at: string;
};

type BackendDeliveryItem = {
  id: string;
  webhook_id: string;
  workspace_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: "success" | "failed" | "pending";
  attempts_count: number;
  last_http_status: number | null;
  last_latency_ms: number | null;
  last_error: string | null;
  created_at: string;
  attempts?: {
    id: string;
    attempt_number: number;
    http_status: number | null;
    latency_ms: number;
    outcome: "success" | "failed";
    error: string | null;
    request_headers: Record<string, string>;
    response_headers: Record<string, string>;
    response_body: string | null;
    occurred_at: string;
  }[];
};

function mapEndpoint(raw: BackendEndpointItem): WebhookEndpoint {
  return {
    id: raw.id,
    workspaceId: raw.workspace_id,
    url: raw.url,
    events: raw.events,
    status: raw.status as WebhookEndpoint["status"],
    lastDeliveryAt: raw.last_delivery_at,
    lastDeliveryStatus: raw.last_delivery_status,
    consecutiveFailures: raw.consecutive_failures,
    createdAt: raw.created_at,
  };
}

function mapDelivery(raw: BackendDeliveryItem): WebhookDelivery {
  const attemptsHistory: DeliveryAttempt[] = (raw.attempts ?? []).map((a) => ({
    attemptNumber: a.attempt_number,
    occurredAt: a.occurred_at,
    httpStatus: a.http_status,
    latencyMs: a.latency_ms,
    outcome: a.outcome,
    error: a.error ?? undefined,
  }));

  const lastAttempt = raw.attempts && raw.attempts.length > 0
    ? raw.attempts[raw.attempts.length - 1]
    : null;

  return {
    id: raw.id,
    webhookId: raw.webhook_id,
    workspaceId: raw.workspace_id,
    eventType: raw.event_type,
    attempt: raw.attempts_count,
    httpStatus: raw.last_http_status,
    latencyMs: raw.last_latency_ms ?? 0,
    timestamp: raw.created_at,
    outcome: raw.status === "success" ? "success" : "failed",
    error: raw.last_error ?? undefined,
    request: {
      headers: lastAttempt?.request_headers ?? {
        "Content-Type": "application/json",
        "User-Agent": "QuickStart-Webhooks/1.0",
      },
      body: raw.payload,
      signature: lastAttempt?.request_headers?.["X-QuickStart-Signature"] ?? "v1=hmac...",
    },
    response: lastAttempt
      ? {
          status: lastAttempt.http_status ?? 500,
          headers: lastAttempt.response_headers ?? {},
          body: lastAttempt.response_body ?? "",
        }
      : undefined,
    attemptsHistory,
  };
}

export class ProductionWebhooksRepository implements WebhooksRepository {
  async listEndpoints(
    workspaceId: string,
    signal?: AbortSignal
  ): Promise<RepositoryResult<WebhookEndpoint[]>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/webhooks`,
        { signal, cache: "no-store" }
      );
      if (!res.ok) {
        return {
          status: "unavailable",
          message: "Webhook management service is currently unavailable.",
        };
      }
      const data = (await res.json()) as { endpoints?: BackendEndpointItem[] };
      return {
        status: "ready",
        data: (data.endpoints ?? []).map(mapEndpoint),
      };
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      return {
        status: "unavailable",
        message: "Failed to connect to webhook service.",
      };
    }
  }

  async getEndpoint(
    workspaceId: string,
    webhookId: string,
    signal?: AbortSignal
  ): Promise<RepositoryResult<WebhookEndpoint>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/webhooks/${encodeURIComponent(webhookId)}`,
        { signal, cache: "no-store" }
      );
      if (!res.ok) {
        return { status: "not_found", message: "Webhook endpoint not found." };
      }
      const data = (await res.json()) as { endpoint?: BackendEndpointItem };
      if (!data.endpoint) return { status: "not_found", message: "Endpoint not found" };
      return { status: "ready", data: mapEndpoint(data.endpoint) };
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      return { status: "unavailable", message: "Failed to fetch webhook endpoint." };
    }
  }

  async registerEndpoint(
    workspaceId: string,
    data: { url: string; events: string[] }
  ): Promise<RepositoryResult<{ endpoint: WebhookEndpoint; signingSecret: string }>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/webhooks`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { status: "error", message: err.error?.message ?? "Registration failed" };
      }
      const result = (await res.json()) as {
        endpoint: BackendEndpointItem;
        signingSecret: string;
      };
      return {
        status: "ready",
        data: {
          endpoint: mapEndpoint(result.endpoint),
          signingSecret: result.signingSecret,
        },
      };
    } catch {
      return { status: "error", message: "Network error registering webhook." };
    }
  }

  async rotateSecret(
    workspaceId: string,
    webhookId: string
  ): Promise<RepositoryResult<{ signingSecret: string }>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/webhooks/${encodeURIComponent(webhookId)}/rotate-secret`,
        { method: "POST" }
      );
      if (!res.ok) {
        return { status: "error", message: "Failed to rotate secret." };
      }
      const data = (await res.json()) as { signingSecret: string };
      return { status: "ready", data };
    } catch {
      return { status: "error", message: "Network error rotating secret." };
    }
  }

  async deleteEndpoint(
    workspaceId: string,
    webhookId: string
  ): Promise<RepositoryResult<{ success: boolean }>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/webhooks/${encodeURIComponent(webhookId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        return { status: "error", message: "Failed to delete endpoint." };
      }
      return { status: "ready", data: { success: true } };
    } catch {
      return { status: "error", message: "Network error deleting endpoint." };
    }
  }

  async listDeliveries(
    workspaceId: string,
    webhookId: string,
    signal?: AbortSignal
  ): Promise<RepositoryResult<WebhookDelivery[]>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/webhooks/${encodeURIComponent(webhookId)}/deliveries`,
        { signal, cache: "no-store" }
      );
      if (!res.ok) {
        return { status: "unavailable", message: "Deliveries audit service unavailable." };
      }
      const data = (await res.json()) as { deliveries?: BackendDeliveryItem[] };
      return {
        status: "ready",
        data: (data.deliveries ?? []).map(mapDelivery),
      };
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      return { status: "unavailable", message: "Failed to fetch deliveries." };
    }
  }

  async getDelivery(
    workspaceId: string,
    webhookId: string,
    deliveryId: string,
    signal?: AbortSignal
  ): Promise<RepositoryResult<WebhookDelivery>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/webhooks/${encodeURIComponent(webhookId)}/deliveries/${encodeURIComponent(deliveryId)}`,
        { signal, cache: "no-store" }
      );
      if (!res.ok) {
        return { status: "not_found", message: "Delivery not found." };
      }
      const data = (await res.json()) as { delivery?: BackendDeliveryItem };
      if (!data.delivery) return { status: "not_found", message: "Delivery not found" };
      return { status: "ready", data: mapDelivery(data.delivery) };
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      return { status: "unavailable", message: "Failed to fetch delivery." };
    }
  }

  async redriveDelivery(
    workspaceId: string,
    webhookId: string,
    deliveryId: string
  ): Promise<RepositoryResult<WebhookDelivery>> {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/webhooks/${encodeURIComponent(webhookId)}/deliveries/${encodeURIComponent(deliveryId)}/redrive`,
        { method: "POST" }
      );
      if (!res.ok) {
        return { status: "error", message: "Failed to redrive delivery." };
      }
      const data = (await res.json()) as { delivery?: BackendDeliveryItem };
      if (!data.delivery) return { status: "error", message: "No delivery returned" };
      return { status: "ready", data: mapDelivery(data.delivery) };
    } catch {
      return { status: "error", message: "Network error executing redrive." };
    }
  }
}

export const productionWebhooksRepository = new ProductionWebhooksRepository();

export function getWebhooksRepository(isPreview = false): WebhooksRepository {
  if (isPreview) {
    return developerPreviewStore;
  }
  return productionWebhooksRepository;
}
