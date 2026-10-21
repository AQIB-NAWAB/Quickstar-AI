export type WebhookStatus = "active" | "disabled" | "failing";

export interface WebhookEndpointItem {
  id: string;
  workspace_id: string;
  url: string;
  events: string[];
  status: WebhookStatus;
  signing_secret?: string;
  last_delivery_at: string | null;
  last_delivery_status: number | null;
  consecutive_failures: number;
  created_at: string;
  updated_at: string;
}

export interface WebhookDeliveryAttemptItem {
  id: string;
  delivery_id: string;
  attempt_number: number;
  http_status: number | null;
  latency_ms: number;
  outcome: "success" | "failed";
  error: string | null;
  request_headers: Record<string, string>;
  response_headers: Record<string, string>;
  response_body: string | null;
  occurred_at: string;
}

export interface WebhookDeliveryItem {
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
  attempts?: WebhookDeliveryAttemptItem[];
}

export interface WebhooksListResponse {
  endpoints: WebhookEndpointItem[];
}

export interface WebhookDeliveriesListResponse {
  deliveries: WebhookDeliveryItem[];
}
