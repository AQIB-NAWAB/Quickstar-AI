import { randomUUID } from "node:crypto";
import type { Logger } from "@quickstart/logging";
import type { TextToSpeech } from "../speech/types.js";
import { WidgetVoiceLiveSession, type VoiceLiveEvent } from "./live-session.js";
import { GeminiLiveSession } from "./gemini-live-session.js";
import { OpenAiRealtimeLiveSession } from "./openai-realtime-session.js";
import { loadWidgetVoiceBrief } from "./agent-brief.js";
import type { CallsRepository } from "../repository/calls.repository.js";
import type { RecordingStore } from "../repository/recording.store.js";

export type LiveSessionBind = {
  workspaceId: string;
  conversationId: string;
  actorId: string;
  /** Provider label for call rows created by this session (default widget). */
  provider?: string;
  /** Reuse an existing call row instead of creating a widget call. */
  callId?: string;
  caller?: string | null;
  agentId?: string | null;
};

type BridgedSession = {
  start(): Promise<void>;
  pushPcm(pcm: Buffer): void;
  subscribe(listener: (event: VoiceLiveEvent) => void): () => void;
  close(): void;
  sayTransfer?(name: string): void;
  holdModel?(): void;
  releaseModel?(): void;
};

type SessionMode = "model" | "holding" | "human";

type SessionRecord = {
  session: BridgedSession;
  bind: LiveSessionBind;
  callId: string;
  startedAtMs: number;
  transcriptSequence: number;
  persistChain: Promise<void>;
  recordingObjectKey: string | null;
  recordingSequence: number;
  started: boolean;
  mode: SessionMode;
  needsHuman: boolean;
  transferSpoken: boolean;
  human: { userId: string; name: string } | null;
  visitorBridge: Set<(event: VoiceLiveEvent) => void>;
  agentBridge: Set<(event: VoiceLiveEvent) => void>;
};

export type WidgetLiveCall = {
  conversation_id: string;
  needs_human: boolean;
  mode: SessionMode;
  human_name: string | null;
};

export class WidgetVoiceLiveSessionManager {
  private readonly sessions = new Map<string, SessionRecord>();

  constructor(
    private readonly deps: {
      deepgramApiKey?: string;
      deepgramModel: string;
      deepgramEndpointingMs?: number;
      speechTailMs?: number;
      runtimeUrl: string;
      internalToken: string;
      conversationUrl: string;
      agentUrl: string;
      knowledgeUrl: string;
      geminiApiKey?: string;
      geminiLiveModel?: string;
      openaiApiKey?: string;
      openaiRealtimeModel?: string;
      elevenLabsApiKey?: string;
      elevenLabsRealtimeModel?: string;
      elevenLabsVoiceId?: string;
      /** auto = cascade when configured, else best available S2S provider. */
      s2sProvider?: "auto" | "gemini" | "openai" | "elevenlabs" | "none";
      tts: TextToSpeech | null;
      /** When set, live widget voice uses STT → runtime → the selected catalog voice. */
      preferCascade: boolean;
      /** Overall turn budget for live voice (defaults to 20s). */
      turnTimeoutMs?: number;
      /** Spoken when a live turn times out. */
      spokenFallback?: string;
      calls: CallsRepository;
      recordings: RecordingStore;
      logger: Logger;
    },
  ) {}

  async create(bind: LiveSessionBind): Promise<string> {
    let callId: string;
    if (bind.callId) {
      const existing = await this.deps.calls.get(bind.workspaceId, bind.callId);
      if (!existing) {
        throw new Error(`Call ${bind.callId} not found for live voice session`);
      }
      callId = existing.id;
      await this.deps.calls.updateState(bind.workspaceId, callId, {
        state: "live",
        conversationId: bind.conversationId,
        agentId: bind.agentId ?? existing.agent_id,
        caller: bind.caller ?? existing.caller,
      });
    } else {
      const call = await this.deps.calls.create({
        workspaceId: bind.workspaceId,
        conversationId: bind.conversationId,
        agentId: bind.agentId ?? null,
        direction: "inbound",
        voiceMode: "cascade",
        telephonyProvider: bind.provider ?? "widget",
        caller: bind.caller ?? "Website visitor",
      });
      await this.deps.calls.updateState(bind.workspaceId, call.id, { state: "live" });
      callId = call.id;
    }
    const id = randomUUID();
    const pack = loadWidgetVoiceBrief({
      workspaceId: bind.workspaceId,
      conversationId: bind.conversationId,
      conversationUrl: this.deps.conversationUrl,
      agentUrl: this.deps.agentUrl,
      knowledgeUrl: this.deps.knowledgeUrl,
      internalToken: this.deps.internalToken,
      logger: this.deps.logger,
    });
    const brief = pack.then((loaded) => loaded.brief);
    const provider = this.deps.s2sProvider ?? "auto";
    const canCascade = Boolean(this.deps.tts && this.deps.deepgramApiKey);
    const canGemini = Boolean(this.deps.geminiApiKey);
    const canOpenAi = Boolean(this.deps.openaiApiKey);
    const canElevenLabs = Boolean(
      this.deps.elevenLabsApiKey && this.deps.elevenLabsVoiceId,
    );

    const requireProvider = (name: string, available: boolean) => {
      if (!available) {
        throw new Error(
          `VOICE_S2S_PROVIDER=${name} requires the matching API key; configure ${name} or use auto/none`,
        );
      }
    };
    if (provider === "gemini") requireProvider("gemini", canGemini);
    if (provider === "openai") requireProvider("openai", canOpenAi);
    if (provider === "elevenlabs") {
      if (!canElevenLabs) {
        throw new Error(
          "VOICE_S2S_PROVIDER=elevenlabs requires ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID",
        );
      }
    }
    if (provider === "none" && !canCascade) {
      throw new Error(
        "VOICE_S2S_PROVIDER=none requires a cascade STT/TTS configuration (Deepgram + a TTS provider)",
      );
    }

    const useCascade =
      provider === "none" ||
      (provider === "auto" && this.deps.preferCascade && canCascade) ||
      (provider === "auto" && !canGemini && !canOpenAi && !canElevenLabs && canCascade);
    const useGemini = !useCascade && (provider === "gemini" || (provider === "auto" && canGemini));
    const useOpenAi =
      !useCascade &&
      !useGemini &&
      (provider === "openai" || (provider === "auto" && canOpenAi));
    const useElevenLabs =
      !useCascade &&
      !useGemini &&
      !useOpenAi &&
      (provider === "elevenlabs" || (provider === "auto" && canElevenLabs));

    if (!useCascade && !useGemini && !useOpenAi && !useElevenLabs) {
      throw new Error(
        "No live voice model is configured. Set DEEPGRAM_API_KEY + a TTS key, GEMINI_API_KEY, OPENAI_API_KEY, or ELEVENLABS_API_KEY.",
      );
    }

    const session = useCascade
      ? new WidgetVoiceLiveSession({
          workspaceId: bind.workspaceId,
          conversationId: bind.conversationId,
          actorId: bind.actorId,
          deepgramApiKey: this.deps.deepgramApiKey ?? "",
          deepgramModel: this.deps.deepgramModel,
          runtimeUrl: this.deps.runtimeUrl,
          internalToken: this.deps.internalToken,
          tts: this.deps.tts!,
          ttsVoiceId: pack.then((loaded) => loaded.ttsVoiceId),
          replyLanguage: pack.then((loaded) => loaded.language),
          turnTimeoutMs: this.deps.turnTimeoutMs,
          endpointingMs: this.deps.deepgramEndpointingMs,
          speechTailMs: this.deps.speechTailMs,
          spokenFallback: this.deps.spokenFallback,
          onTransferSpoken: () => this.onTransferSpoken(id),
          logger: this.deps.logger,
        })
      : useGemini
        ? new GeminiLiveSession({
            apiKey: this.deps.geminiApiKey!,
            model: this.deps.geminiLiveModel ?? "gemini-3.8-live",
            workspaceId: bind.workspaceId,
            conversationId: bind.conversationId,
            actorId: bind.actorId,
            conversationUrl: this.deps.conversationUrl,
            internalToken: this.deps.internalToken,
            logger: this.deps.logger,
            brief,
            onTransferSpoken: () => this.onTransferSpoken(id),
          })
        : useElevenLabs
          ? new OpenAiRealtimeLiveSession({
              apiKey: this.deps.elevenLabsApiKey!,
              model: this.deps.elevenLabsRealtimeModel ?? "eleven_realtime_v1_mini",
              url: `wss://api.elevenlabs.io/v1/realtime?model=${encodeURIComponent(
                this.deps.elevenLabsRealtimeModel ?? "eleven_realtime_v1_mini",
              )}`,
              headers: {
                "xi-api-key": this.deps.elevenLabsApiKey!,
              },
              voice: this.deps.elevenLabsVoiceId,
              instructions: brief,
              workspaceId: bind.workspaceId,
              conversationId: bind.conversationId,
              actorId: bind.actorId,
              conversationUrl: this.deps.conversationUrl,
              internalToken: this.deps.internalToken,
              logger: this.deps.logger,
            })
          : new OpenAiRealtimeLiveSession({
              apiKey: this.deps.openaiApiKey!,
              model: this.deps.openaiRealtimeModel ?? "gpt-realtime-2.1",
              instructions: brief,
              workspaceId: bind.workspaceId,
              conversationId: bind.conversationId,
              actorId: bind.actorId,
              conversationUrl: this.deps.conversationUrl,
              internalToken: this.deps.internalToken,
              logger: this.deps.logger,
            });
    const previous = this.findByConversation(bind.workspaceId, bind.conversationId);
    if (previous) await this.close(previous);
    const record: SessionRecord = {
      session,
      bind,
      callId,
      startedAtMs: Date.now(),
      transcriptSequence: 0,
      persistChain: Promise.resolve(),
      recordingObjectKey: null,
      recordingSequence: 0,
      started: false,
      mode: "model",
      needsHuman: false,
      transferSpoken: false,
      human: null,
      visitorBridge: new Set(),
      agentBridge: new Set(),
    };
    session.subscribe((event) => this.persistCallEvent(record, event));
    this.sessions.set(id, record);
    return id;
  }

  private persistCallEvent(record: SessionRecord, event: VoiceLiveEvent): void {
    const text = event.type === "transcript" && !event.interim
      ? event.text.trim()
      : event.type === "assistant_done"
        ? event.text.trim()
        : "";
    if (!text) return;
    const speaker = event.type === "assistant_done" ? "agent" : "user";
    const startMs = Math.max(0, Date.now() - record.startedAtMs);
    const sequence = ++record.transcriptSequence;
    record.persistChain = record.persistChain.then(async () => {
      await this.deps.calls.addTranscript(record.bind.workspaceId, record.callId, {
        sequence,
        speaker,
        text,
        start_ms: startMs,
        end_ms: startMs,
        finalized: true,
      });
    }).catch((err) => {
      this.deps.logger.warn("widget.voice.transcript_persist_failed", {
        call_id: record.callId,
        message: err instanceof Error ? err.message : "transcript persistence failed",
      });
    });
  }

  async startRecording(id: string, workspaceId: string, contentType: string): Promise<void> {
    const record = this.sessions.get(id);
    if (!record || record.bind.workspaceId !== workspaceId || record.recordingObjectKey) return;
    const normalizedType = contentType.split(";")[0]?.trim().toLowerCase();
    if (normalizedType !== "audio/webm") throw new Error("Widget call recordings must use audio/webm");
    record.recordingObjectKey = await this.deps.recordings.begin(
      record.bind.workspaceId,
      record.callId,
      normalizedType,
    );
  }

  async appendRecording(id: string, workspaceId: string, bytes: Buffer): Promise<void> {
    const record = this.sessions.get(id);
    if (!record || record.bind.workspaceId !== workspaceId || !record.recordingObjectKey || bytes.length === 0) return;
    await this.deps.recordings.append(record.recordingObjectKey, record.recordingSequence++, bytes);
  }

  async finishRecording(id: string, workspaceId: string): Promise<void> {
    const record = this.sessions.get(id);
    if (!record || record.bind.workspaceId !== workspaceId || !record.recordingObjectKey) return;
    const key = record.recordingObjectKey;
    await this.deps.recordings.finish(key);
    await this.deps.calls.updateState(record.bind.workspaceId, record.callId, {
      recordingObjectKey: key,
    });
  }

  private ensureStarted(record: SessionRecord): void {
    if (record.started) return;
    record.started = true;
    void record.session.start();
  }

  get(id: string): SessionRecord | undefined {
    return this.sessions.get(id);
  }

  pushAudio(id: string, pcm: Buffer): void {
    const record = this.sessions.get(id);
    if (!record) return;
    this.ensureStarted(record);
    if (record.mode === "human") {
      this.emit(record.agentBridge, pcmEvent(pcm));
      return;
    }
    record.session.pushPcm(pcm);
  }

  subscribe(id: string, listener: (event: VoiceLiveEvent) => void): (() => void) | null {
    const record = this.sessions.get(id);
    if (!record) return null;
    this.ensureStarted(record);
    record.visitorBridge.add(listener);
    if (record.mode === "human" && record.human) {
      listener({ type: "human_joined", name: record.human.name });
    } else if (record.mode === "holding" || record.transferSpoken) {
      listener({ type: "handoff", status: "waiting" });
    }
    const unsub = record.session.subscribe((event) => {
      if (record.mode === "human" && (event.type === "audio" || event.type === "assistant_token")) return;
      listener(event);
      if (event.type === "turn_done" && record.transferSpoken && record.mode !== "human") {
        record.mode = record.human ? "human" : "holding";
      }
    });
    return () => {
      unsub();
      record.visitorBridge.delete(listener);
    };
  }

  list(workspaceId: string): WidgetLiveCall[] {
    const calls = new Map<string, WidgetLiveCall>();
    for (const record of this.sessions.values()) {
      if (record.bind.workspaceId !== workspaceId) continue;
      calls.set(record.bind.conversationId, {
        conversation_id: record.bind.conversationId,
        needs_human: record.needsHuman && record.mode !== "human",
        mode: record.mode,
        human_name: record.human?.name ?? null,
      });
    }
    return [...calls.values()];
  }

  findByConversation(workspaceId: string, conversationId: string): string | null {
    let found: string | null = null;
    for (const [id, record] of this.sessions) {
      if (record.bind.workspaceId === workspaceId && record.bind.conversationId === conversationId) {
        found = id;
      }
    }
    return found;
  }

  describe(workspaceId: string, conversationId: string): WidgetLiveCall | null {
    const id = this.findByConversation(workspaceId, conversationId);
    if (!id) return null;
    const record = this.sessions.get(id);
    if (!record) return null;
    return {
      conversation_id: conversationId,
      needs_human: record.needsHuman && record.mode !== "human",
      mode: record.mode,
      human_name: record.human?.name ?? null,
    };
  }

  join(workspaceId: string, conversationId: string, human: { userId: string; name: string }): "missing" | "conflict" | "ok" {
    const id = this.findByConversation(workspaceId, conversationId);
    const record = id ? this.sessions.get(id) : undefined;
    if (!id || !record) return "missing";
    if (record.human && record.human.userId !== human.userId) return "conflict";
    record.human = human;
    record.session.sayTransfer?.(human.name);
    this.onTransferSpoken(id);
    return "ok";
  }

  leave(workspaceId: string, conversationId: string, userId: string): boolean {
    const id = this.findByConversation(workspaceId, conversationId);
    const record = id ? this.sessions.get(id) : undefined;
    if (!record?.human || record.human.userId !== userId) return false;
    record.human = null;
    record.mode = "model";
    record.needsHuman = false;
    record.transferSpoken = false;
    record.session.releaseModel?.();
    this.emit(record.visitorBridge, { type: "human_left" });
    return true;
  }

  pushHumanAudio(workspaceId: string, conversationId: string, userId: string, pcm: Buffer): boolean {
    const id = this.findByConversation(workspaceId, conversationId);
    const record = id ? this.sessions.get(id) : undefined;
    if (!record || record.human?.userId !== userId) return false;
    if (record.mode !== "human" && !record.transferSpoken) return false;
    this.emit(record.visitorBridge, pcmEvent(pcm));
    return true;
  }

  subscribeAgent(
    workspaceId: string,
    conversationId: string,
    userId: string,
    listener: (event: VoiceLiveEvent) => void,
  ): (() => void) | null {
    const id = this.findByConversation(workspaceId, conversationId);
    const record = id ? this.sessions.get(id) : undefined;
    if (!record || record.human?.userId !== userId) return null;
    record.agentBridge.add(listener);
    return () => record.agentBridge.delete(listener);
  }

  private onTransferSpoken(id: string): void {
    const record = this.sessions.get(id);
    if (!record) return;
    record.transferSpoken = true;
    record.needsHuman = true;
    record.mode = record.human ? "human" : "holding";
    record.session.holdModel?.();
    void this.markWaiting(record);
    if (record.human) {
      this.emit(record.visitorBridge, { type: "human_joined", name: record.human.name });
    } else {
      this.emit(record.visitorBridge, { type: "handoff", status: "waiting" });
    }
  }

  private emit(listeners: Set<(event: VoiceLiveEvent) => void>, event: VoiceLiveEvent): void {
    for (const listener of listeners) listener(event);
  }

  private async markWaiting(record: SessionRecord): Promise<void> {
    const url = `${this.deps.conversationUrl}/internal/workspaces/${encodeURIComponent(record.bind.workspaceId)}/widget/conversations/${encodeURIComponent(record.bind.conversationId)}/voice-attention`;
    try {
      await fetch(url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.deps.internalToken}`,
          "content-type": "application/json",
        },
        body: "{}",
      });
    } catch (err) {
      this.deps.logger.warn("widget.voice.attention_failed", {
        message: err instanceof Error ? err.message : "attention failed",
      });
    }
  }

  async close(id: string): Promise<void> {
    const record = this.sessions.get(id);
    if (!record) return;
    record.session.close();
    this.sessions.delete(id);
    await record.persistChain;
    await this.deps.calls.updateState(record.bind.workspaceId, record.callId, {
      state: record.transferSpoken ? "transferred" : "completed",
      endedAt: new Date(),
    });
  }
}

function pcmEvent(pcm: Buffer): VoiceLiveEvent {
  return {
    type: "audio",
    mime: "audio/pcm",
    data: pcm.toString("base64"),
    encoding: "pcm16",
    sample_rate: 16000,
  };
}
