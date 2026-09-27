export type RuntimeConfig = {
  port: number;
  agentServiceUrl: string;
  conversationServiceUrl: string;
  modelGatewayUrl: string;
  modelGatewayInternalToken: string;
  httpRequestTimeoutMs: number;
  httpRateLimitWindowMs: number;
  httpRateLimitMax: number;
};

export function loadRuntimeConfig(): RuntimeConfig {
  return {
    port: Number(process.env.PORT ?? process.env.RUNTIME_PORT ?? 3006),
    agentServiceUrl: (process.env.AGENT_SERVICE_URL ?? process.env.AGENT_URL ?? "http://127.0.0.1:3003").replace(/\/$/, ""),
    conversationServiceUrl: (process.env.CONVERSATION_SERVICE_URL ?? process.env.CONVERSATION_URL ?? "http://127.0.0.1:3004").replace(/\/$/, ""),
    modelGatewayUrl: (process.env.MODEL_GATEWAY_URL ?? "http://127.0.0.1:3005").replace(/\/$/, ""),
    modelGatewayInternalToken: process.env.MODEL_GATEWAY_INTERNAL_TOKEN ?? "local-dev-token-at-least-32-characters-long",
    httpRequestTimeoutMs: Number(process.env.HTTP_REQUEST_TIMEOUT_MS ?? 30_000),
    httpRateLimitWindowMs: Number(process.env.HTTP_RATE_LIMIT_WINDOW_MS ?? 60_000),
    httpRateLimitMax: Number(process.env.HTTP_RATE_LIMIT_MAX ?? 300),
  };
}
