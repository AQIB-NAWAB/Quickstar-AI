import { DEFAULT_AGENT_VOICE_SETTINGS } from "@quickstart/contracts";
import type { RuntimeClient } from "../clients/runtime.client.js";
import type { AudioChunk, SpeechToText, TextToSpeech } from "../speech/types.js";

export type WidgetVoiceTurnInput = {
  workspaceId: string;
  conversationId: string;
  audio: AudioChunk;
  actorId: string;
  idempotencyKey: string;
  requestId: string;
};

export type WidgetVoiceTurnResult = {
  user_text: string;
  assistant_text: string;
  audio_b64: string;
  audio_mime: string;
  stt_ms: number;
  runtime_ms: number;
  tts_ms: number;
  turn: {
    deduplicated: boolean;
    conversation_id: string;
    agent_id: string;
    agent_version_id: string;
    user_message?: { id: string; text: string; seq: number };
    assistant_message: { id: string; text: string; seq: number };
  };
};

/** Plain text safe for TTS (strip markdown-ish formatting). */
export function textForSpeech(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[\s>*-]+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export class WidgetVoiceService {
  constructor(
    private readonly stt: SpeechToText,
    private readonly tts: TextToSpeech,
    private readonly runtime: RuntimeClient,
  ) {}

  async runTurn(input: WidgetVoiceTurnInput): Promise<WidgetVoiceTurnResult> {
    const sttResult = await this.stt.transcribe(input.audio);
    const turn = await this.runtime.executeWidgetTurn({
      workspaceId: input.workspaceId,
      conversationId: input.conversationId,
      text: sttResult.text,
      idempotencyKey: input.idempotencyKey,
      actorId: input.actorId,
      requestId: input.requestId,
      modality: "voice",
    });

    const assistantText = turn.assistant_text;
    const speakText = textForSpeech(assistantText).slice(
      0,
      DEFAULT_AGENT_VOICE_SETTINGS.max_response_chars,
    );
    const ttsResult = await this.tts.synthesize(
      speakText || assistantText.slice(0, DEFAULT_AGENT_VOICE_SETTINGS.max_response_chars),
      DEFAULT_AGENT_VOICE_SETTINGS.tts_voice_id,
    );

    return {
      user_text: sttResult.text,
      assistant_text: assistantText,
      audio_b64: ttsResult.audio.bytes.toString("base64"),
      audio_mime: "audio/mpeg",
      stt_ms: sttResult.latencyMs,
      runtime_ms: turn.latency_ms,
      tts_ms: ttsResult.latencyMs,
      turn: {
        deduplicated: turn.deduplicated,
        conversation_id: turn.conversation_id,
        agent_id: turn.agent_id,
        agent_version_id: turn.agent_version_id,
        user_message: turn.user_message,
        assistant_message: turn.assistant_message,
      },
    };
  }
}
