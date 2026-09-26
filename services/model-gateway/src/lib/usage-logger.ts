import type { Logger } from "@quickstart/logging";

export type UsageRecord = {
  workspace_id: string;
  request_id: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
};

export function logModelUsage(logger: Logger, record: UsageRecord): void {
  logger.info("model.usage", record);
}
