export type WorkflowConfig = {
  port: number;
  databaseUrl: string;
  redisUrl: string;
  jwtAccessSecret: string;
  workspaceUrl: string;
  conversationUrl: string;
  secretsUrl: string;
  leadUrl: string;
  httpRequestTimeoutMs: number;
  membershipCacheTtlSec: number;
  membershipCacheNegativeTtlSec: number;
  internalToken: string;
  kafkaBrokers: string[];
  kafkaGroupId: string;
  webhookAllowHttp: boolean;
  webhookTimeoutMs: number;
  maxActionFailuresBeforeDlq: number;
  maxActiveWorkflowsPerWorkspace: number;
};

export function loadWorkflowConfig(): WorkflowConfig {
  const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;
  if (!jwtAccessSecret || jwtAccessSecret.length < 32) {
    throw new Error("JWT_ACCESS_SECRET must be set and at least 32 characters");
  }

  const internalToken = process.env.WORKFLOW_INTERNAL_TOKEN ?? process.env.INTERNAL_TOKEN;
  if (!internalToken || internalToken.length < 32) {
    throw new Error("WORKFLOW_INTERNAL_TOKEN must be set and at least 32 characters");
  }

  const brokersRaw = process.env.KAFKA_BROKERS?.trim() ?? "";
  const kafkaBrokers = brokersRaw
    ? brokersRaw.split(",").map((b) => b.trim()).filter(Boolean)
    : [];

  return {
    port: Number(process.env.PORT ?? process.env.WORKFLOW_PORT ?? 3012),
    databaseUrl:
      process.env.DATABASE_URL ?? "postgresql://quickstart:quickstart@127.0.0.1:5433/quickstart",
    redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
    jwtAccessSecret,
    workspaceUrl: (process.env.WORKSPACE_URL ?? "http://127.0.0.1:3002").replace(/\/$/, ""),
    conversationUrl: (process.env.CONVERSATION_URL ?? "http://127.0.0.1:3003").replace(/\/$/, ""),
    secretsUrl: (process.env.SECRETS_URL ?? "http://127.0.0.1:3006").replace(/\/$/, ""),
    leadUrl: (process.env.LEAD_URL ?? "http://127.0.0.1:3008").replace(/\/$/, ""),
    httpRequestTimeoutMs: Number(process.env.HTTP_REQUEST_TIMEOUT_MS ?? 30_000),
    membershipCacheTtlSec: Number(process.env.MEMBERSHIP_CACHE_TTL_SEC ?? 60),
    membershipCacheNegativeTtlSec: Number(process.env.MEMBERSHIP_CACHE_NEGATIVE_TTL_SEC ?? 30),
    internalToken,
    kafkaBrokers,
    kafkaGroupId: process.env.WORKFLOW_KAFKA_GROUP_ID ?? "quickstart-workflow-v1",
    webhookAllowHttp: process.env.WORKFLOW_WEBHOOK_ALLOW_HTTP === "true",
    webhookTimeoutMs: Number(process.env.WORKFLOW_WEBHOOK_TIMEOUT_MS ?? 10_000),
    maxActionFailuresBeforeDlq: Number(process.env.WORKFLOW_MAX_ACTION_FAILURES ?? 5),
    maxActiveWorkflowsPerWorkspace: Number(process.env.WORKFLOW_MAX_ACTIVE_PER_WORKSPACE ?? 50),
  };
}
