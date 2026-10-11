import type { WebhookDelivery,WebhookEndpoint } from "./types";

export const SAMPLE_WEBHOOK_ENDPOINTS: WebhookEndpoint[] = [
  {
    id: "wh_demo",
    workspaceId: "local-preview",
    url: "https://hooks.example.com/quickstart",
    events: ["conversation.handed_off", "agent.published"],
    status: "active",
    lastDeliveryAt: "2026-10-10T14:22:00.000Z",
    createdAt: "2026-10-08T10:00:00.000Z",
  },
  {
    id: "wh_alerts",
    workspaceId: "local-preview",
    url: "https://hooks.example.com/alerts",
    events: ["agent.published"],
    status: "failing",
    lastDeliveryAt: "2026-10-10T14:18:00.000Z",
    createdAt: "2026-10-09T12:00:00.000Z",
  },
];

export const SAMPLE_DELIVERY_1042: WebhookDelivery = {
  id: "dlv_1042",
  webhookId: "wh_demo",
  workspaceId: "local-preview",
  eventType: "agent.published",
  attempt: 2,
  httpStatus: 503,
  latencyMs: 240,
  timestamp: "2026-10-10T14:22:00.000Z",
  outcome: "failed",
  error: "503 Service Unavailable. Destination temporarily unavailable.",
  request: {
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "QuickStart-Webhooks/1.0",
      "X-QuickStart-Event": "agent.published",
      "X-QuickStart-Signature": "sha256=[redacted]",
    },
    body: {
      event_id: "evt_1042",
      type: "agent.published",
      workspace_id: "ws_demo",
      data: {
        agent_id: "agent_1024",
      },
    },
    signature: "sha256=[redacted]",
  },
  response: {
    status: 503,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      server: "nginx/1.24",
    },
    body: "503 Service Unavailable\nDestination temporarily unavailable.",
  },
  attemptsHistory: [
    {
      attemptNumber: 1,
      occurredAt: "2026-10-10T14:21:30.000Z",
      httpStatus: 504,
      latencyMs: 5000,
      outcome: "failed",
      error: "Gateway Timeout",
    },
    {
      attemptNumber: 2,
      occurredAt: "2026-10-10T14:22:00.000Z",
      httpStatus: 503,
      latencyMs: 240,
      outcome: "failed",
      error: "Service Unavailable",
    },
  ],
};
