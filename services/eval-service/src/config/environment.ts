export type EvalConfig = {
  port: number;
  databaseUrl: string;
  redisUrl: string;
  jwtAccessSecret: string;
  workspaceUrl: string;
  runtimeUrl: string;
  httpRequestTimeoutMs: number;
  membershipCacheTtlSec: number;
  membershipCacheNegativeTtlSec: number;
  internalToken: string;
  runtimeInternalToken: string;
  maxCasesPerRun: number;
  maxRunsPerWorkspacePerDay: number;
  workerId: string;
  workerPollIntervalMs: number;
  caseTimeoutMs: number;
  openaiApiKey?: string;
  embeddingProvider: "openai" | "fake";
};

export function loadEvalConfig(): EvalConfig {
  const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;
  if (!jwtAccessSecret || jwtAccessSecret.length < 32) {
    throw new Error("JWT_ACCESS_SECRET must be set and at least 32 characters");
  }

  const internalToken = process.env.EVAL_INTERNAL_TOKEN ?? process.env.INTERNAL_TOKEN;
  if (!internalToken || internalToken.length < 32) {
    throw new Error("EVAL_INTERNAL_TOKEN must be set and at least 32 characters");
  }

  const runtimeInternalToken =
    process.env.RUNTIME_INTERNAL_TOKEN ?? process.env.INTERNAL_TOKEN ?? internalToken;

  return {
    // 3015 is staff web locally; eval-service uses 3016.
    port: Number(process.env.PORT ?? process.env.EVAL_PORT ?? 3016),
    databaseUrl:
      process.env.DATABASE_URL ?? "postgresql://quickstart:quickstart@127.0.0.1:5433/quickstart",
    redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
    jwtAccessSecret,
    workspaceUrl: (process.env.WORKSPACE_URL ?? "http://127.0.0.1:3002").replace(/\/$/, ""),
    runtimeUrl: (process.env.RUNTIME_URL ?? "http://127.0.0.1:3006").replace(/\/$/, ""),
    httpRequestTimeoutMs: Number(process.env.HTTP_REQUEST_TIMEOUT_MS ?? 30_000),
    membershipCacheTtlSec: Number(process.env.MEMBERSHIP_CACHE_TTL_SEC ?? 60),
    membershipCacheNegativeTtlSec: Number(process.env.MEMBERSHIP_CACHE_NEGATIVE_TTL_SEC ?? 30),
    internalToken,
    runtimeInternalToken,
    maxCasesPerRun: Number(process.env.EVAL_MAX_CASES_PER_RUN ?? 50),
    maxRunsPerWorkspacePerDay: Number(process.env.EVAL_MAX_RUNS_PER_WORKSPACE_PER_DAY ?? 20),
    workerId: process.env.EVAL_WORKER_ID ?? `eval-${process.pid}`,
    workerPollIntervalMs: Number(process.env.EVAL_WORKER_POLL_MS ?? 500),
    caseTimeoutMs: Number(process.env.EVAL_CASE_TIMEOUT_MS ?? 30_000),
    openaiApiKey: process.env.OPENAI_API_KEY,
    embeddingProvider: (process.env.EMBEDDING_PROVIDER ?? (process.env.OPENAI_API_KEY ? "openai" : "fake")) === "openai" ? "openai" : "fake",
  };
}
