/** Voice platform contracts (Features 21–21C, 22). */

export const VOICE_MODES = ["cascade", "s2s"] as const;
export type VoiceMode = (typeof VOICE_MODES)[number];

export const CALL_DIRECTIONS = ["inbound", "outbound"] as const;
export type CallDirection = (typeof CALL_DIRECTIONS)[number];

export const CALL_STATES = [
  "ringing",
  "live",
  "completed",
  "failed",
  "transferred",
] as const;
export type CallState = (typeof CALL_STATES)[number];

export const TELEPHONY_PROVIDER_IDS = ["twilio", "telnyx", "sip", "fake"] as const;
export type TelephonyProviderId = (typeof TELEPHONY_PROVIDER_IDS)[number];

/** Default spoken path: STT → runtime → TTS. */
export const DEFAULT_VOICE_MODE: VoiceMode = "cascade";

/** Stricter than chat; human is waiting on the phone. */
export const DEFAULT_VOICE_DEADLINE_MS = 15_000;

export type AgentVoiceSettings = {
  voice_mode: VoiceMode;
  language: string;
  tts_voice_id: string;
  max_response_chars: number;
  turn_detection_profile_id: string;
  recording_enabled: boolean;
};

export const DEFAULT_AGENT_VOICE_SETTINGS: AgentVoiceSettings = {
  voice_mode: "cascade",
  language: "en-US",
  tts_voice_id: "default",
  max_response_chars: 500,
  turn_detection_profile_id: "default",
  recording_enabled: true,
};

/** Runtime turn from the voice edge (same idempotency rules as chat). */
export type VoiceTurnRequestBody = {
  channel: "voice";
  text: string;
  idempotency_key: string;
  call_id: string;
  deadline_ms?: number;
  voice_mode?: VoiceMode;
};

export type CallTranscriptSegment = {
  id: string;
  sequence: number;
  speaker: "user" | "agent";
  text: string;
  start_ms: number;
  end_ms: number;
  finalized: boolean;
};

export type CallStageTimings = {
  stt_ms: number;
  runtime_ms: number;
  tts_ms: number;
  total_ms: number;
};

export type CallRecord = {
  id: string;
  workspace_id: string;
  conversation_id: string | null;
  agent_id: string | null;
  agent_version_id: string | null;
  direction: CallDirection;
  state: CallState;
  voice_mode: VoiceMode;
  telephony_provider: TelephonyProviderId | string;
  caller: string | null;
  callee: string | null;
  failure_code: string | null;
  time_to_first_audio_ms: number | null;
  started_at: string;
  ended_at: string | null;
  recording_object_key: string | null;
};

export function isVoiceMode(value: unknown): value is VoiceMode {
  return typeof value === "string" && (VOICE_MODES as readonly string[]).includes(value);
}

export function isCallState(value: unknown): value is CallState {
  return typeof value === "string" && (CALL_STATES as readonly string[]).includes(value);
}

/**
 * S2S profiles may not enable tools or RAG (v1). Cascade is required for tool-heavy agents.
 */
export function s2sProfileAllowed(input: {
  voice_mode: VoiceMode;
  toolsCount: number;
  knowledgeEnabled: boolean;
}): { ok: true } | { ok: false; reason: string } {
  if (input.voice_mode !== "s2s") {
    return { ok: true };
  }
  if (input.toolsCount > 0) {
    return { ok: false, reason: "voice_mode s2s cannot be combined with tools; use cascade" };
  }
  if (input.knowledgeEnabled) {
    return { ok: false, reason: "voice_mode s2s cannot be combined with RAG; use cascade" };
  }
  return { ok: true };
}
