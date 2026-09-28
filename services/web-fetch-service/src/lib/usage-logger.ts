import type { AcquisitionAction } from "@quickstart/contracts";
import type { Logger } from "@quickstart/logging";

export type AcquisitionUsageLog = {
  workspace_id: string;
  request_id: string;
  action: AcquisitionAction;
  provider: string;
  units: number;
  estimated_cost_micros: number;
  latency_ms: number;
};

export function logAcquisitionUsage(logger: Logger, entry: AcquisitionUsageLog): void {
  logger.info("acquisition.usage", entry);
}
