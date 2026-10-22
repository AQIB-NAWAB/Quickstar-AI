import { createHmac, randomBytes } from "node:crypto";
import { AppError, ErrorCode } from "@quickstart/errors";
import type {
  WebhookDeliveryItem,
  WebhookEndpointItem,
  WebhookStatus,
} from "@quickstart/contracts";
import { safeFetch } from "../utils/ssrf.js";
import type {
  WebhookDeliveryAttemptRow,
  WebhookDeliveryRow,
  WebhookEndpointRow,
  WebhooksRepository,
} from "../repository/webhooks.repository.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toEndpointItem(row: WebhookEndpointRow, includeSecret = false): WebhookEndpointItem {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    url: row.url,
    events: row.events,
    status: row.status as WebhookStatus,
    signing_secret: includeSecret ? row.signing_secret : undefined,
    last_delivery_at: row.last_delivery_at ? row.last_delivery_at.toISOString() : null,
    last_delivery_status: row.last_delivery_status,
    consecutive_failures: row.consecutive_failures,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

function toDeliveryItem(
  row: WebhookDeliveryRow & { attempts?: WebhookDeliveryAttemptRow[] },
): WebhookDeliveryItem {
  return {
    id: row.id,
    webhook_id: row.webhook_id,
    workspace_id: row.workspace_id,
    event_type: row.event_type,
    payload: row.payload,
    status: row.status as "success" | "failed" | "pending",
    attempts_count: row.attempts_count,
    last_http_status: row.last_http_status,
    last_latency_ms: row.last_latency_ms,
    last_error: row.last_error,
    created_at: row.created_at.toISOString(),
    attempts: row.attempts?.map((a) => ({
      id: a.id,
      delivery_id: a.delivery_id,
      attempt_number: a.attempt_number,
      http_status: a.http_status,
      latency_ms: a.latency_ms,
      outcome: a.outcome as "success" | "failed",
      error: a.error,
      request_headers: a.request_headers ?? {},
      response_headers: a.response_headers ?? {},
      response_body: a.response_body,
      occurred_at: a.occurred_at.toISOString(),
    })),
  };
}

export class WebhooksService {
  constructor(private readonly repo: WebhooksRepository) {}

  private validateUrl(urlStr: string): void {
    let parsed: URL;
    try {
      parsed = new URL(urlStr);
    } catch {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Invalid webhook URL format",
      });
    }

    if (process.env.NODE_ENV === "production") {
      if (parsed.protocol !== "https:") {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "Production webhooks must use HTTPS protocol",
        });
      }
      const host = parsed.hostname.toLowerCase();
      if (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "::1" ||
        host.startsWith("10.") ||
        host.startsWith("192.168.") ||
        host.startsWith("169.254.")
      ) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "Local or private IP addresses are prohibited for security",
        });
      }
    }
  }

  private generateSecret(): string {
    return `whsec_live_${randomBytes(24).toString("hex")}`;
  }

  calculateSignature(secret: string, timestamp: number, bodyJson: string): string {
    const payload = `${timestamp}.${bodyJson}`;
    const hmac = createHmac("sha256", secret).update(payload).digest("hex");
    return `t=${timestamp},v1=${hmac}`;
  }

  async listEndpoints(workspaceId: string): Promise<WebhookEndpointItem[]> {
    if (!UUID_REGEX.test(workspaceId)) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Valid workspace UUID required" });
    }
    const rows = await this.repo.listEndpoints(workspaceId);
    return rows.map((r) => toEndpointItem(r, false));
  }

  async getEndpoint(workspaceId: string, endpointId: string): Promise<WebhookEndpointItem> {
    if (!UUID_REGEX.test(workspaceId)) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Valid workspace UUID required" });
    }
    const row = await this.repo.getEndpoint(workspaceId, endpointId);
    if (!row) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: `Webhook endpoint ${endpointId} not found` });
    }
    return toEndpointItem(row, false);
  }

  async createEndpoint(
    workspaceId: string,
    data: { url: string; events: string[] },
  ): Promise<{ endpoint: WebhookEndpointItem; signingSecret: string }> {
    if (!UUID_REGEX.test(workspaceId)) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Valid workspace UUID required" });
    }
    this.validateUrl(data.url);

    if (!Array.isArray(data.events) || data.events.length === 0) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "At least one event must be selected" });
    }

    const signingSecret = this.generateSecret();
    const row = await this.repo.createEndpoint({
      workspaceId,
      url: data.url,
      events: data.events,
      signingSecret,
    });

    return {
      endpoint: toEndpointItem(row, true),
      signingSecret,
    };
  }

  async updateEndpoint(
    workspaceId: string,
    endpointId: string,
    data: { url?: string; events?: string[]; status?: string },
  ): Promise<WebhookEndpointItem> {
    if (!UUID_REGEX.test(workspaceId)) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Valid workspace UUID required" });
    }
    if (data.url) {
      this.validateUrl(data.url);
    }

    const row = await this.repo.updateEndpoint(workspaceId, endpointId, data);
    if (!row) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: `Webhook endpoint ${endpointId} not found` });
    }
    return toEndpointItem(row, false);
  }

  async rotateSecret(
    workspaceId: string,
    endpointId: string,
  ): Promise<{ signingSecret: string }> {
    if (!UUID_REGEX.test(workspaceId)) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Valid workspace UUID required" });
    }
    const newSecret = this.generateSecret();
    const row = await this.repo.updateSigningSecret(workspaceId, endpointId, newSecret);
    if (!row) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: `Webhook endpoint ${endpointId} not found` });
    }
    return { signingSecret: newSecret };
  }

  async deleteEndpoint(workspaceId: string, endpointId: string): Promise<void> {
    if (!UUID_REGEX.test(workspaceId)) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Valid workspace UUID required" });
    }
    const deleted = await this.repo.deleteEndpoint(workspaceId, endpointId);
    if (!deleted) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: `Webhook endpoint ${endpointId} not found` });
    }
  }

  async listDeliveries(
    workspaceId: string,
    webhookId?: string,
    limit?: number,
  ): Promise<WebhookDeliveryItem[]> {
    if (!UUID_REGEX.test(workspaceId)) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Valid workspace UUID required" });
    }
    const rows = await this.repo.listDeliveries(workspaceId, webhookId, limit);
    return rows.map((r) => toDeliveryItem(r));
  }

  async getDelivery(workspaceId: string, deliveryId: string): Promise<WebhookDeliveryItem> {
    if (!UUID_REGEX.test(workspaceId)) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Valid workspace UUID required" });
    }
    const row = await this.repo.getDelivery(workspaceId, deliveryId);
    if (!row) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: `Webhook delivery ${deliveryId} not found` });
    }
    return toDeliveryItem(row);
  }

  async redriveDelivery(workspaceId: string, deliveryId: string): Promise<WebhookDeliveryItem> {
    if (!UUID_REGEX.test(workspaceId)) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Valid workspace UUID required" });
    }

    const delivery = await this.repo.getDelivery(workspaceId, deliveryId);
    if (!delivery) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: `Webhook delivery ${deliveryId} not found` });
    }

    const endpoint = await this.repo.getEndpoint(workspaceId, delivery.webhook_id);
    if (!endpoint) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Associated webhook endpoint no longer exists" });
    }

    const attemptNumber = delivery.attempts.length + 1;
    const timestamp = Math.floor(Date.now() / 1000);
    const bodyStr = JSON.stringify(delivery.payload);
    const signature = this.calculateSignature(endpoint.signing_secret, timestamp, bodyStr);

    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "QuickStart-Webhooks/1.0",
      "X-QuickStart-Delivery-Id": delivery.id,
      "X-QuickStart-Event": delivery.event_type,
      "X-QuickStart-Timestamp": String(timestamp),
      "X-QuickStart-Signature": signature,
    };

    let outcome: "success" | "failed" = "failed";
    let httpStatus: number | null = null;
    let latencyMs = 0;
    let error: string | null = null;
    let responseBody: string | null = null;
    const responseHeaders: Record<string, string> = {};

    const start = performance.now();
    try {
      const res = await safeFetch(endpoint.url, {
        method: "POST",
        headers: requestHeaders,
        body: bodyStr,
        timeoutMs: 10_000,
      });

      latencyMs = Math.round(performance.now() - start);
      httpStatus = res.status;
      res.headers.forEach((v: string, k: string) => {
        responseHeaders[k] = v;
      });
      responseBody = await res.text().catch(() => "");

      if (res.ok) {
        outcome = "success";
      } else {
        outcome = "failed";
        error = `HTTP ${res.status}: ${res.statusText || "Delivery failed"}`;
      }
    } catch (err) {
      latencyMs = Math.round(performance.now() - start);
      outcome = "failed";
      error = err instanceof Error ? err.message : "Connection failed";
      httpStatus = 504;
    }

    // Record the redrive attempt
    await this.repo.createAttempt({
      deliveryId: delivery.id,
      attemptNumber,
      httpStatus,
      latencyMs,
      outcome,
      error,
      requestHeaders,
      responseHeaders,
      responseBody,
    });

    if (outcome === "success") {
      await this.repo.completeDelivery(delivery.id, httpStatus, latencyMs);
      await this.repo.updateEndpointHealth(endpoint.id, httpStatus, false);
    } else {
      await this.repo.updateEndpointHealth(endpoint.id, httpStatus ?? 500, true);
      await this.repo.retryDelivery(delivery.id, 60, httpStatus, latencyMs, error ?? "");
    }

    const updated = await this.repo.getDelivery(workspaceId, deliveryId);
    return toDeliveryItem(updated!);
  }
}
