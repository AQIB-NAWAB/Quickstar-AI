import type { AgentVoiceSettings, CallStageTimings } from "@quickstart/contracts";
import type { RuntimeClient } from "../clients/runtime.client.js";
import type { AudioChunk, SpeechToText, TextToSpeech } from "../speech/types.js";

export type CascadeTurnInput = {
  workspaceId: string;
  conversationId: string;
  callId: string;
  audio: AudioChunk;
  voice: AgentVoiceSettings;
  authHeaders: Record<string, string>;
  requestId: string;
  deadlineMs: number;
  spokenFallback: string;
  abortSignal?: AbortSignal;
};

export type CascadeTurnResult = {
  userText: string;
  assistantText: string;
  ttsAudio: AudioChunk;
  timings: CallStageTimings;
  agentId: string;
  agentVersionId: string;
  bargedIn: boolean;
};

export class CascadePipeline {
  constructor(
    private readonly stt: SpeechToText,
    private readonly tts: TextToSpeech,
    private readonly runtime: RuntimeClient,
  ) {}

  async runUtterance(input: CascadeTurnInput): Promise<CascadeTurnResult> {
    let bargedIn = false;
    if (input.abortSignal?.aborted) {
      bargedIn = true;
    }

    const sttResult = await this.stt.transcribe(input.audio, input.abortSignal);
    let assistantText = input.spokenFallback;
    let agentId = "";
    let agentVersionId = "";
    let runtimeMs = 0;

    try {
      const turn = await this.runtime.executeVoiceTurn({
        workspaceId: input.workspaceId,
        conversationId: input.conversationId,
        text: sttResult.text,
        callId: input.callId,
        idempotencyKey: `${input.callId}:${Date.now()}`,
        authHeaders: input.authHeaders,
        deadlineMs: input.deadlineMs,
        requestId: input.requestId,
      });
      assistantText = turn.assistant_text.slice(0, input.voice.max_response_chars);
      agentId = turn.agent_id;
      agentVersionId = turn.agent_version_id;
      runtimeMs = turn.latency_ms;
    } catch (err) {
      // Spoken fallback is for live UX only after a successful STT path is productized.
      // Do not mark simulate/Done-when success when the runtime hop failed.
      void input.spokenFallback;
      throw err;
    }

    if (input.abortSignal?.aborted) {
      bargedIn = true;
      return {
        userText: sttResult.text,
        assistantText: "",
        ttsAudio: { bytes: Buffer.alloc(0), encoding: "fake", sampleRateHz: 8000 },
        timings: {
          stt_ms: sttResult.latencyMs,
          runtime_ms: runtimeMs,
          tts_ms: 0,
          total_ms: sttResult.latencyMs + runtimeMs,
        },
        agentId,
        agentVersionId,
        bargedIn,
      };
    }

    try {
      const ttsResult = await this.tts.synthesize(
        assistantText,
        input.voice.tts_voice_id,
        input.abortSignal,
      );

      return {
        userText: sttResult.text,
        assistantText,
        ttsAudio: ttsResult.audio,
        timings: {
          stt_ms: sttResult.latencyMs,
          runtime_ms: runtimeMs,
          tts_ms: ttsResult.latencyMs,
          total_ms: sttResult.latencyMs + runtimeMs + ttsResult.latencyMs,
        },
        agentId,
        agentVersionId,
        bargedIn,
      };
    } catch (err) {
      if (input.abortSignal?.aborted) {
        return {
          userText: sttResult.text,
          assistantText: "",
          ttsAudio: { bytes: Buffer.alloc(0), encoding: "fake", sampleRateHz: 8000 },
          timings: {
            stt_ms: sttResult.latencyMs,
            runtime_ms: runtimeMs,
            tts_ms: 0,
            total_ms: sttResult.latencyMs + runtimeMs,
          },
          agentId,
          agentVersionId,
          bargedIn: true,
        };
      }
      throw err;
    }
  }
}
