export interface OpenApiParameter {
  name: string;
  in: "path" | "query" | "header";
  required: boolean;
  description?: string;
  schema?: {
    type?: string;
    default?: unknown;
  };
}

export interface OpenApiOperation {
  id: string;
  method: "get" | "post" | "patch" | "delete" | "put";
  path: string;
  summary: string;
  description?: string;
  tags: string[];
  security?: string[];
  parameters?: OpenApiParameter[];
  hasSpecCoverage: boolean;
}

export type WebhookStatus = "active" | "disabled" | "failing";

export interface WebhookEndpoint {
  id: string;
  workspaceId: string;
  url: string;
  events: string[];
  status: WebhookStatus;
  lastDeliveryAt: string | null;
  createdAt: string;
}

export interface DeliveryAttempt {
  attemptNumber: number;
  occurredAt: string;
  httpStatus: number | null;
  latencyMs: number;
  outcome: "success" | "failed";
  error?: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  workspaceId: string;
  eventType: string;
  attempt: number;
  httpStatus: number | null;
  latencyMs: number;
  timestamp: string; // ISO UTC
  outcome: "success" | "failed";
  error?: string;
  request: {
    headers: Record<string, string>;
    body: Record<string, unknown>;
    signature: string;
  };
  response?: {
    status: number;
    headers: Record<string, string>;
    body: Record<string, unknown> | string;
  };
  attemptsHistory?: DeliveryAttempt[];
}

export type RepositoryResult<T> =
  | { status: "ready"; data: T }
  | { status: "unavailable"; message: string }
  | { status: "forbidden"; message: string }
  | { status: "not_found"; message: string }
  | { status: "error"; message: string };

export interface WebhooksRepository {
  listEndpoints(
    workspaceId: string,
    signal?: AbortSignal
  ): Promise<RepositoryResult<WebhookEndpoint[]>>;

  getEndpoint(
    workspaceId: string,
    webhookId: string,
    signal?: AbortSignal
  ): Promise<RepositoryResult<WebhookEndpoint>>;

  registerEndpoint(
    workspaceId: string,
    data: { url: string; events: string[] }
  ): Promise<RepositoryResult<{ endpoint: WebhookEndpoint; signingSecret: string }>>;

  listDeliveries(
    workspaceId: string,
    webhookId: string,
    signal?: AbortSignal
  ): Promise<RepositoryResult<WebhookDelivery[]>>;

  getDelivery(
    workspaceId: string,
    webhookId: string,
    deliveryId: string,
    signal?: AbortSignal
  ): Promise<RepositoryResult<WebhookDelivery>>;

  redriveDelivery(
    workspaceId: string,
    webhookId: string,
    deliveryId: string
  ): Promise<RepositoryResult<WebhookDelivery>>;
}
