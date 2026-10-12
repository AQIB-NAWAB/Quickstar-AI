export type VoiceConfig = {
  port: number;
  databaseUrl: string;
  redisUrl: string;
  jwtAccessSecret: string;
  workspaceUrl: string;
  runtimeUrl: string;
  conversationUrl: string;
  agentUrl: string;
  httpRequestTimeoutMs: number;
  membershipCacheTtlSec: number;
  membershipCacheNegativeTtlSec: number;
  internalToken: string;
  globalInboundCap: number;
  globalOutboundCap: number;
  defaultWorkspaceInboundCap: number;
  defaultWorkspaceOutboundCap: number;
  defaultVoiceDeadlineMs: number;
  spokenFallbackPhrase: string;
  recordingDir: string;
  sipBridgeSharedSecret: string;
  draining: boolean;
};

export function loadVoiceConfig(): VoiceConfig {
  const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;
  if (!jwtAccessSecret || jwtAccessSecret.length < 32) {
    throw new Error("JWT_ACCESS_SECRET must be set and at least 32 characters");
  }

  const internalToken = process.env.VOICE_INTERNAL_TOKEN ?? process.env.INTERNAL_TOKEN;
  if (!internalToken || internalToken.length < 32) {
    throw new Error("VOICE_INTERNAL_TOKEN must be set and at least 32 characters");
  }

  return {
    port: Number(process.env.PORT ?? process.env.VOICE_PORT ?? 3008),
    databaseUrl:
      process.env.DATABASE_URL ?? "postgresql://quickstart:quickstart@127.0.0.1:5433/quickstart",
    redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
    jwtAccessSecret,
    workspaceUrl: (process.env.WORKSPACE_URL ?? "http://127.0.0.1:3002").replace(/\/$/, ""),
    runtimeUrl: (process.env.RUNTIME_URL ?? "http://127.0.0.1:3006").replace(/\/$/, ""),
    conversationUrl: (process.env.CONVERSATION_URL ?? "http://127.0.0.1:3004").replace(/\/$/, ""),
    agentUrl: (process.env.AGENT_URL ?? "http://127.0.0.1:3003").replace(/\/$/, ""),
    httpRequestTimeoutMs: Number(process.env.HTTP_REQUEST_TIMEOUT_MS ?? 30_000),
    membershipCacheTtlSec: Number(process.env.MEMBERSHIP_CACHE_TTL_SEC ?? 60),
    membershipCacheNegativeTtlSec: Number(process.env.MEMBERSHIP_CACHE_NEGATIVE_TTL_SEC ?? 30),
    internalToken,
    globalInboundCap: Number(process.env.VOICE_GLOBAL_INBOUND_CAP ?? 5000),
    globalOutboundCap: Number(process.env.VOICE_GLOBAL_OUTBOUND_CAP ?? 5000),
    defaultWorkspaceInboundCap: Number(process.env.VOICE_WORKSPACE_INBOUND_CAP ?? 100),
    defaultWorkspaceOutboundCap: Number(process.env.VOICE_WORKSPACE_OUTBOUND_CAP ?? 100),
    defaultVoiceDeadlineMs: Number(process.env.VOICE_DEADLINE_MS ?? 15_000),
    spokenFallbackPhrase:
      process.env.VOICE_SPOKEN_FALLBACK ?? "Sorry, I am having trouble right now. Please try again.",
    recordingDir: process.env.VOICE_RECORDING_DIR ?? "/tmp/quickstart-voice-recordings",
    sipBridgeSharedSecret:
      process.env.VOICE_SIP_BRIDGE_SECRET ?? internalToken.slice(0, 32).padEnd(32, "0"),
    draining: process.env.VOICE_DRAINING === "1",
  };
}
