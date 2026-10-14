import type { SpeechProfile } from "../speech/factory.js";
import { resolveTelephonyProfile, type TelephonyProfile } from "../telephony/factory.js";

export type VoiceConfig = {
  port: number;
  databaseUrl: string;
  redisUrl: string;
  jwtAccessSecret: string;
  workspaceUrl: string;
  runtimeUrl: string;
  conversationUrl: string;
  agentUrl: string;
  knowledgeUrl: string;
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
  speechProfile: SpeechProfile;
  speechOpenaiApiKey?: string;
  speechOpenaiBaseUrl?: string;
  deepgramApiKey?: string;
  deepgramModel?: string;
  fishAudioApiKey?: string;
  fishAudioModel?: string;
  fishAudioReferenceId?: string;
  geminiApiKey?: string;
  geminiLiveModel?: string;
  requireRealSpeech: boolean;
  speechCircuitFailureThreshold: number;
  speechCircuitCooldownMs: number;
  speechHttpTimeoutMs: number;
  telephonyProfile: TelephonyProfile;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
  voicePublicBaseUrl: string;
  requireRealTelephony: boolean;
  /** Fire-and-forget ledger ingest (Feature 26). */
  usageUrl: string;
  usageInternalToken: string;
};

function parseSpeechProfile(raw: string | undefined): SpeechProfile {
  const value = (raw ?? "fake").trim().toLowerCase();
  if (value === "openai") return "openai";
  if (value === "deepgram-fish" || value === "deepgram_fish") return "deepgram-fish";
  if (value === "fake" || value === "") return "fake";
  throw new Error(`SPEECH_PROFILE must be fake|openai|deepgram-fish, got: ${raw}`);
}

export function loadVoiceConfig(): VoiceConfig {
  const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;
  if (!jwtAccessSecret || jwtAccessSecret.length < 32) {
    throw new Error("JWT_ACCESS_SECRET must be set and at least 32 characters");
  }

  const internalToken = process.env.VOICE_INTERNAL_TOKEN ?? process.env.INTERNAL_TOKEN;
  if (!internalToken || internalToken.length < 32) {
    throw new Error("VOICE_INTERNAL_TOKEN must be set and at least 32 characters");
  }

  const speechOpenaiApiKey =
    process.env.SPEECH_OPENAI_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    undefined;

  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID?.trim() || undefined;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN?.trim() || undefined;
  const voicePublicBaseUrl = (
    process.env.VOICE_PUBLIC_BASE_URL ??
    process.env.VOICE_URL ??
    "http://127.0.0.1:3008"
  ).replace(/\/$/, "");

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
    knowledgeUrl: (process.env.KNOWLEDGE_URL ?? "http://127.0.0.1:3009").replace(/\/$/, ""),
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
    speechProfile: parseSpeechProfile(process.env.SPEECH_PROFILE),
    speechOpenaiApiKey,
    speechOpenaiBaseUrl: process.env.SPEECH_OPENAI_BASE_URL?.replace(/\/$/, "") || undefined,
    deepgramApiKey: process.env.DEEPGRAM_API_KEY?.trim() || undefined,
    deepgramModel: process.env.DEEPGRAM_MODEL?.trim() || undefined,
    fishAudioApiKey: process.env.FISH_AUDIO_API_KEY?.trim() || undefined,
    fishAudioModel: process.env.FISH_AUDIO_MODEL?.trim() || undefined,
    fishAudioReferenceId: process.env.FISH_AUDIO_REFERENCE_ID?.trim() || undefined,
    geminiApiKey:
      process.env.GEMINI_API_KEY?.trim() ||
      process.env.GOOGLE_API_KEY?.trim() ||
      undefined,
    geminiLiveModel: process.env.GEMINI_LIVE_MODEL?.trim() || undefined,
    requireRealSpeech: process.env.VOICE_REQUIRE_REAL_SPEECH === "1",
    speechCircuitFailureThreshold: Number(process.env.SPEECH_CIRCUIT_FAILURE_THRESHOLD ?? 5),
    speechCircuitCooldownMs: Number(process.env.SPEECH_CIRCUIT_COOLDOWN_MS ?? 30_000),
    speechHttpTimeoutMs: Number(
      process.env.SPEECH_HTTP_TIMEOUT_MS ?? process.env.HTTP_REQUEST_TIMEOUT_MS ?? 30_000,
    ),
    telephonyProfile: resolveTelephonyProfile(
      process.env.TELEPHONY_PROFILE,
      Boolean(twilioAccountSid && twilioAuthToken),
    ),
    twilioAccountSid,
    twilioAuthToken,
    twilioFromNumber: process.env.TWILIO_FROM_NUMBER?.trim() || undefined,
    voicePublicBaseUrl,
    requireRealTelephony: process.env.TELEPHONY_REQUIRE_REAL === "1",
    usageUrl: (process.env.USAGE_URL ?? process.env.USAGE_SERVICE_URL ?? "http://127.0.0.1:3017").replace(
      /\/$/,
      "",
    ),
    usageInternalToken:
      process.env.USAGE_INTERNAL_TOKEN ?? process.env.INTERNAL_TOKEN ?? internalToken,
  };
}
