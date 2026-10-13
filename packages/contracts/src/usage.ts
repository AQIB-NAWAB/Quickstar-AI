/** Feature 26 — usage ledger ingest / staff read contracts. */

export const USAGE_KINDS = ["model", "acquisition", "voice"] as const;
export type UsageKind = (typeof USAGE_KINDS)[number];

/**
 * Fact body for `POST /internal/v1/usage/ingest`.
 * Snake_case matches other internal APIs; producers may omit price
 * (usage-service applies a config snapshot for model/voice).
 */
export type UsageFactIngestBody = {
  workspace_id: string;
  kind: UsageKind;
  units: number;
  unit_label?: string;
  provider?: string;
  model?: string | null;
  /** When set (e.g. acquisition estimated_cost_micros), stored as price_micros. */
  price_micros?: number;
  currency?: string;
  idempotency_key: string;
  request_id: string;
  /** call_id or other source pointer */
  source_id?: string | null;
  detail?: Record<string, unknown>;
};

export type UsageEntry = {
  id: string;
  workspace_id: string;
  kind: UsageKind;
  units: number;
  unit_label: string | null;
  provider: string | null;
  model: string | null;
  price_micros: number;
  currency: string;
  idempotency_key: string;
  request_id: string;
  source_id: string | null;
  detail: Record<string, unknown>;
  created_at: string;
};

export type UsageListResponse = {
  entries: UsageEntry[];
  sum_units: number;
  sum_price_micros: number;
  count: number;
};
