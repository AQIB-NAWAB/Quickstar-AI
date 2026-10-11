import { SAMPLE_DELIVERY_1042,SAMPLE_WEBHOOK_ENDPOINTS } from "./fixtures";
import {
type DeliveryAttempt,
type RepositoryResult,
type WebhookDelivery,
type WebhookEndpoint,
type WebhooksRepository,
} from "./types";

class DeveloperPreviewStore implements WebhooksRepository {
  private endpoints: WebhookEndpoint[] = [...SAMPLE_WEBHOOK_ENDPOINTS];
  private deliveries: Map<string, WebhookDelivery[]> = new Map([
    ["wh_demo", [{ ...SAMPLE_DELIVERY_1042 }]],
    ["wh_alerts", []],
  ]);

  async listEndpoints(
    _workspaceId: string
  ): Promise<RepositoryResult<WebhookEndpoint[]>> {
    void _workspaceId;
    return {
      status: "ready",
      data: [...this.endpoints],
    };
  }

  async getEndpoint(
    _workspaceId: string,
    webhookId: string
  ): Promise<RepositoryResult<WebhookEndpoint>> {
    void _workspaceId;
    const ep = this.endpoints.find((e) => e.id === webhookId);
    if (!ep) {
      return { status: "not_found", message: "Endpoint not found" };
    }
    return { status: "ready", data: { ...ep } };
  }

  async registerEndpoint(
    workspaceId: string,
    data: { url: string; events: string[] }
  ): Promise<
    RepositoryResult<{ endpoint: WebhookEndpoint; signingSecret: string }>
  > {
    const newEndpoint: WebhookEndpoint = {
      id: `wh_${Math.random().toString(36).substring(2, 7)}`,
      workspaceId,
      url: data.url,
      events: [...data.events],
      status: "active",
      lastDeliveryAt: null,
      createdAt: new Date().toISOString(),
    };
    this.endpoints.unshift(newEndpoint);
    this.deliveries.set(newEndpoint.id, []);

    return {
      status: "ready",
      data: {
        endpoint: newEndpoint,
        signingSecret: "example_secret_not_valid",
      },
    };
  }

  async listDeliveries(
    _workspaceId: string,
    webhookId: string
  ): Promise<RepositoryResult<WebhookDelivery[]>> {
    void _workspaceId;
    const list = this.deliveries.get(webhookId) || [];
    return {
      status: "ready",
      data: [...list],
    };
  }

  async getDelivery(
    _workspaceId: string,
    webhookId: string,
    deliveryId: string
  ): Promise<RepositoryResult<WebhookDelivery>> {
    void _workspaceId;
    const list = this.deliveries.get(webhookId) || [];
    const found = list.find((d) => d.id === deliveryId);
    if (!found) {
      return { status: "not_found", message: "Delivery not found" };
    }
    return { status: "ready", data: { ...found } };
  }

  async redriveDelivery(
    _workspaceId: string,
    webhookId: string,
    deliveryId: string
  ): Promise<RepositoryResult<WebhookDelivery>> {
    void _workspaceId;
    const list = this.deliveries.get(webhookId) || [];
    const index = list.findIndex((d) => d.id === deliveryId);
    if (index === -1) {
      return { status: "not_found", message: "Delivery not found" };
    }

    const current = list[index];
    const newAttemptNumber = current.attempt + 1;
    const newAttempt: DeliveryAttempt = {
      attemptNumber: newAttemptNumber,
      occurredAt: new Date().toISOString(),
      httpStatus: 200,
      latencyMs: 145,
      outcome: "success",
    };

    const updated: WebhookDelivery = {
      ...current,
      attempt: newAttemptNumber,
      httpStatus: 200,
      latencyMs: 145,
      timestamp: new Date().toISOString(),
      outcome: "success",
      error: undefined,
      response: {
        status: 200,
        headers: {
          "content-type": "application/json",
          server: "mock-receiver/1.0",
        },
        body: { status: "acknowledged", attempt: newAttemptNumber },
      },
      attemptsHistory: [
        ...(current.attemptsHistory || []),
        newAttempt,
      ],
    };

    list[index] = updated;
    this.deliveries.set(webhookId, list);

    return {
      status: "ready",
      data: { ...updated },
    };
  }
}

export const developerPreviewStore = new DeveloperPreviewStore();
