import type { AcquisitionAction } from "@quickstart/contracts";
import type { Logger } from "@quickstart/logging";
import type { UsageIngestClient } from "../clients/usage.client.js";

export type AcquisitionUsageLog = {
  workspace_id: string;
  request_id: string;
  action: AcquisitionAction;
  provider: string;
  units: number;
  estimated_cost_micros: number;
  latency_ms: number;
};

export function logAcquisitionUsage(
  logger: Logger,
  entry: AcquisitionUsageLog,
  ingest?: UsageIngestClient,
): void {
  logger.info("acquisition.usage", entry);
  if (!ingest) return;
  ingest.emit({
    workspace_id: entry.workspace_id,
    kind: "acquisition",
    units: entry.units,
    unit_label: entry.action,
    provider: entry.provider,
    price_micros: entry.estimated_cost_micros,
    idempotency_key: `acquisition:${entry.workspace_id}:${entry.request_id}:${entry.action}`,
    request_id: entry.request_id,
    detail: {
      action: entry.action,
      latency_ms: entry.latency_ms,
    },
  });
}
