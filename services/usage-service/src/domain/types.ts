import type { UsageKind } from "@quickstart/contracts";

export type UsageEntryRow = {
  id: string;
  workspace_id: string;
  kind: UsageKind;
  units: string | number;
  unit_label: string | null;
  provider: string | null;
  model: string | null;
  price_micros: string | number;
  currency: string;
  idempotency_key: string;
  request_id: string;
  source_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: Date;
};

export type IngestFactInput = {
  workspaceId: string;
  kind: UsageKind;
  units: number;
  unitLabel?: string | null;
  provider?: string | null;
  model?: string | null;
  priceMicros: number;
  currency: string;
  idempotencyKey: string;
  requestId: string;
  sourceId?: string | null;
  detail?: Record<string, unknown>;
};
