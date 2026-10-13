import { randomUUID } from "node:crypto";
import {
  DEFAULT_AGENT_VOICE_SETTINGS,
  DEFAULT_VOICE_DEADLINE_MS,
  type AgentVoiceSettings,
  type CallDirection,
  type VoiceMode,
} from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { Logger } from "@quickstart/logging";
import type { CallCaps } from "../caps/call-caps.js";
import type { RuntimeClient } from "../clients/runtime.client.js";
import { CascadePipeline } from "../pipelines/cascade.js";
import { S2SPipeline } from "../pipelines/s2s.js";
import type { CallsRepository } from "../repository/calls.repository.js";
import type { RecordingStore } from "../repository/recording.store.js";
import type { SpeechBundle } from "../speech/fake-tts.js";
import type { AudioChunk } from "../speech/types.js";
import { SilenceTurnDetector } from "../turn-detection/silence-detector.js";

export type SimulateCallInput = {
  workspaceId: string;
  conversationId: string;
  agentId?: string;
  direction: CallDirection;
  caller?: string;
  callee?: string;
  utterance: AudioChunk;
  voiceMode?: VoiceMode;
  voice?: Partial<AgentVoiceSettings>;
  telephonyProvider?: string;
  authHeaders?: Record<string, string>;
  requestId?: string;
  toolsCount?: number;
  knowledgeEnabled?: boolean;
  /** Reconnect to an existing call id. */
  callId?: string;
};

export type SimulateCallResult = {
  call_id: string;
  state: string;
  user_text: string;
  assistant_text: string;
  timings: { stt_ms: number; runtime_ms: number; tts_ms: number; total_ms: number };
  telephony_provider: string;
  voice_mode: VoiceMode;
  recording_object_key: string | null;
  barged_in: boolean;
};

export class CallSessionOrchestrator {
  private readonly cascade: CascadePipeline;
  private readonly s2s: S2SPipeline;
  private readonly activeAbort = new Map<string, AbortController>();
  private draining = false;

  constructor(
    private readonly calls: CallsRepository,
    private readonly caps: CallCaps,
    private readonly recordings: RecordingStore,
    speech: SpeechBundle,
    runtime: RuntimeClient,
    private readonly logger: Logger,
    private readonly spokenFallback: string,
    private readonly deadlineMs = DEFAULT_VOICE_DEADLINE_MS,
  ) {
    this.cascade = new CascadePipeline(speech.stt, speech.tts, runtime);
    this.s2s = new S2SPipeline(speech.s2s, speech.stt);
  }

  setDraining(value: boolean): void {
    this.draining = value;
  }

  /** Cancel in-flight TTS / turn for barge-in. */
  bargeIn(callId: string): void {
    this.activeAbort.get(callId)?.abort();
  }

  async simulateCall(input: SimulateCallInput): Promise<SimulateCallResult> {
    if (this.draining) {
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: "Voice service is draining; refusing new calls",
      });
    }

    const voice: AgentVoiceSettings = {
      ...DEFAULT_AGENT_VOICE_SETTINGS,
      ...input.voice,
      voice_mode: input.voiceMode ?? input.voice?.voice_mode ?? DEFAULT_AGENT_VOICE_SETTINGS.voice_mode,
    };
    const provider = input.telephonyProvider ?? "fake";
    const requestId = input.requestId ?? randomUUID();

    let call = input.callId
      ? await this.calls.get(input.workspaceId, input.callId)
      : null;

    const needsAcquire = !call || call.state === "completed" || call.state === "failed";
    let lease: Awaited<ReturnType<CallCaps["tryAcquire"]>> | null = null;
    if (needsAcquire) {
      lease = await this.caps.tryAcquire(input.workspaceId, input.direction);
    }

    try {
      if (!call) {
        call = await this.calls.create({
          workspaceId: input.workspaceId,
          conversationId: input.conversationId,
          agentId: input.agentId ?? null,
          direction: input.direction,
          voiceMode: voice.voice_mode,
          telephonyProvider: provider,
          caller: input.caller ?? null,
          callee: input.callee ?? null,
          id: input.callId,
        });
      }

      await this.calls.updateState(input.workspaceId, call.id, { state: "live" });

      const detector = new SilenceTurnDetector(voice.turn_detection_profile_id, { eager: true });
      detector.push({ energy: 0.8, durationMs: 300 }, false);
      detector.push({ energy: 0.0, durationMs: 400 }, false);

      const abort = new AbortController();
      this.activeAbort.set(call.id, abort);

      let userText = "";
      let assistantText = "";
      let timings = { stt_ms: 0, runtime_ms: 0, tts_ms: 0, total_ms: 0 };
      let agentVersionId: string | null = null;
      let agentId: string | null = input.agentId ?? null;
      let ttsBytes: Buffer = Buffer.alloc(0);
      let bargedIn = false;

      try {
        if (voice.voice_mode === "s2s") {
          const result = await this.s2s.runUtterance({
            audio: input.utterance,
            voice,
            toolsCount: input.toolsCount ?? 0,
            knowledgeEnabled: input.knowledgeEnabled ?? false,
            systemPrompt: "You are a helpful voice agent.",
          });
          userText = result.userText;
          assistantText = "[s2s audio reply]";
          timings = result.timings;
          ttsBytes = Buffer.from(result.assistantAudio.bytes);
        } else {
          const result = await this.cascade.runUtterance({
            workspaceId: input.workspaceId,
            conversationId: input.conversationId,
            callId: call.id,
            audio: input.utterance,
            voice,
            authHeaders: input.authHeaders ?? {},
            requestId,
            deadlineMs: this.deadlineMs,
            spokenFallback: this.spokenFallback,
            abortSignal: abort.signal,
          });
          userText = result.userText;
          assistantText = result.assistantText;
          timings = result.timings;
          agentId = result.agentId || agentId;
          agentVersionId = result.agentVersionId || null;
          ttsBytes = Buffer.from(result.ttsAudio.bytes);
          bargedIn = result.bargedIn;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "turn_failed";
        await this.calls.updateState(input.workspaceId, call.id, {
          state: "failed",
          failureCode: message.slice(0, 200),
          endedAt: new Date(),
        });
        throw err;
      } finally {
        this.activeAbort.delete(call.id);
      }

      await this.calls.addTranscript(input.workspaceId, call.id, {
        sequence: 1,
        speaker: "user",
        text: userText,
        start_ms: 0,
        end_ms: Math.max(1, timings.stt_ms),
        finalized: true,
      });
      if (assistantText && !bargedIn) {
        await this.calls.addTranscript(input.workspaceId, call.id, {
          sequence: 2,
          speaker: "agent",
          text: assistantText,
          start_ms: timings.stt_ms,
          end_ms: timings.total_ms,
          finalized: true,
        });
      }
      await this.calls.addTiming(input.workspaceId, call.id, 1, timings);

      let recordingKey: string | null = null;
      if (voice.recording_enabled) {
        const combined = Buffer.concat([input.utterance.bytes, ttsBytes]);
        recordingKey = await this.recordings.put(input.workspaceId, call.id, combined);
      }

      const ttfa = timings.stt_ms + timings.runtime_ms;
      await this.calls.updateState(input.workspaceId, call.id, {
        state: bargedIn ? "live" : "completed",
        agentId,
        agentVersionId,
        timeToFirstAudioMs: ttfa,
        recordingObjectKey: recordingKey,
        endedAt: bargedIn ? null : new Date(),
      });

      this.logger.info("voice.call.completed", {
        call_id: call.id,
        workspace_id: input.workspaceId,
        voice_mode: voice.voice_mode,
        telephony_provider: provider,
        stt_ms: timings.stt_ms,
        runtime_ms: timings.runtime_ms,
        tts_ms: timings.tts_ms,
      });

      return {
        call_id: call.id,
        state: bargedIn ? "live" : "completed",
        user_text: userText,
        assistant_text: assistantText,
        timings,
        telephony_provider: provider,
        voice_mode: voice.voice_mode,
        recording_object_key: recordingKey,
        barged_in: bargedIn,
      };
    } finally {
      if (lease) {
        await this.caps.release(lease);
      }
    }
  }
}
