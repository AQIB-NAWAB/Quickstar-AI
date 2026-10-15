import { randomUUID } from "node:crypto";
import type { Logger } from "@quickstart/logging";
import type { TextToSpeech } from "../speech/types.js";
import { textForSpeech } from "../services/widget-voice.service.js";
import { streamWidgetTurn } from "../clients/runtime-widget-stream.js";
import { BARGE_IN_ENERGY, eagerCommitDelayMs, frameEnergy } from "../turn-detection/eager-commit.js";

/** Speak the first clause as soon as it exists so TTS overlaps the rest of the reply. */
function firstSpeakableCut(pending: string): number {
  const punct = pending.search(/[.!?،۔؟]/);
  if (punct >= 4) return punct + 1;
  const words = pending.trim().split(/\s+/);
  if (words.length >= 4 && pending.endsWith(" ")) return pending.length;
  return 0;
}

export type VoiceLiveEvent =
  | { type: "ready" }
  | { type: "level"; value: number }
  | { type: "transcript"; text: string; interim: boolean }
  | { type: "thinking" }
  | { type: "assistant_token"; delta: string }
  | { type: "audio"; mime: string; data: string; encoding?: "mp3" | "pcm16"; sample_rate?: number }
  | { type: "assistant_done"; text: string }
  | { type: "interrupt" }
  | { type: "turn_done" }
  | { type: "handoff"; status: "waiting" }
  | { type: "human_joined"; name: string }
  | { type: "human_left" }
  | { type: "error"; message: string };

type Listener = (event: VoiceLiveEvent) => void;

export class WidgetVoiceLiveSession {
  private readonly listeners = new Set<Listener>();
  private dgSocket: WebSocket | null = null;
  private closed = false;
  private ready = false;
  private processingTurn = false;
  private lastProcessedText = "";
  private lastProcessedAt = 0;
  /** Finalized phrases in the current utterance. A short pause must not commit these. */
  private utteranceParts: string[] = [];
  private openInterim = "";
  private commitTimer: ReturnType<typeof setTimeout> | null = null;
  private turnAbort: AbortController | null = null;
  private bargeFrames = 0;
  private resolvedVoiceId = "uplift:v_8eelc901";
  private replyLanguage = "en";
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private dgReconnectAttempts = 0;
  private dgReconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly input: {
      workspaceId: string;
      conversationId: string;
      actorId: string;
      deepgramApiKey: string;
      deepgramModel: string;
      runtimeUrl: string;
      internalToken: string;
      tts: TextToSpeech;
      ttsVoiceId: Promise<string>;
      replyLanguage: Promise<string>;
      onTransferSpoken?: () => void;
      logger: Logger;
    },
  ) {}

  private held = false;
  private speakChain: Promise<void> = Promise.resolve();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    if (this.ready) listener({ type: "ready" });
    return () => this.listeners.delete(listener);
  }

  private emit(event: VoiceLiveEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  async start(): Promise<void> {
    const [replyLanguage, voiceId] = await Promise.all([
      this.input.replyLanguage.catch(() => "en"),
      this.input.ttsVoiceId.catch(() => this.resolvedVoiceId),
    ]);
    this.replyLanguage = replyLanguage;
    if (voiceId) this.resolvedVoiceId = voiceId;
    this.openDeepgram();
  }

  private openDeepgram(): void {
    if (this.closed) return;
    const model = this.input.deepgramModel || "nova-2";
    const params = new URLSearchParams({
      model,
      encoding: "linear16",
      sample_rate: "16000",
      channels: "1",
      interim_results: "true",
      punctuate: "true",
      smart_format: "true",
      language: this.replyLanguage.toLowerCase().startsWith("ur") ? "ur" : "en",
      endpointing: "200",
      utterance_end_ms: "1000",
      vad_events: "true",
    });
    const url = `wss://api.deepgram.com/v1/listen?${params}`;
    const dg = new WebSocket(url, ["token", this.input.deepgramApiKey]);
    this.dgSocket = dg;

    dg.addEventListener("open", () => {
      this.dgReconnectAttempts = 0;
      if (this.dgReconnectTimer) {
        clearTimeout(this.dgReconnectTimer);
        this.dgReconnectTimer = null;
      }
      this.ready = true;
      this.emit({ type: "ready" });
      if (!this.keepAliveTimer) {
        this.keepAliveTimer = setInterval(() => {
          if (this.closed || !this.dgSocket || this.dgSocket.readyState !== WebSocket.OPEN) return;
          this.dgSocket.send(JSON.stringify({ type: "KeepAlive" }));
        }, 4_000);
      }
    });

    dg.addEventListener("message", (ev) => {
      if (typeof ev.data !== "string") return;
      let msg: {
        type?: string;
        is_final?: boolean;
        channel?: { alternatives?: Array<{ transcript?: string }> };
        speech_final?: boolean;
      };
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (msg.type === "UtteranceEnd") {
        if (!this.commitTimer) this.scheduleCommit(eagerCommitDelayMs(this.currentUtterance()));
        return;
      }
      const transcript = msg.channel?.alternatives?.[0]?.transcript?.trim() ?? "";
      if (!transcript) return;
      this.cancelCommit();
      if (msg.is_final) {
        this.utteranceParts.push(transcript);
        this.openInterim = "";
      } else {
        this.openInterim = transcript;
      }
      this.emit({
        type: "transcript",
        text: this.currentUtterance(),
        interim: true,
      });
      if (msg.speech_final) {
        this.scheduleCommit(40);
      }
    });

    dg.addEventListener("error", () => {
      this.input.logger.warn("widget.voice.dg_error");
    });

    dg.addEventListener("close", (ev: Event) => {
      if (this.closed || this.dgSocket !== dg) return;
      this.ready = false;
      this.dgSocket = null;
      const close = ev as Event & { code?: number; reason?: string };
      this.input.logger.warn("widget.voice.dg_closed", {
        code: close.code,
        reason: close.reason,
      });
      this.scheduleDeepgramReconnect();
    });
  }

  private scheduleDeepgramReconnect(): void {
    if (this.closed || this.dgReconnectTimer) return;
    if (this.dgReconnectAttempts >= 6) {
      this.emit({ type: "error", message: "Live speech connection closed" });
      return;
    }
    this.dgReconnectAttempts += 1;
    this.dgReconnectTimer = setTimeout(() => {
      this.dgReconnectTimer = null;
      this.openDeepgram();
    }, 250 * this.dgReconnectAttempts);
  }

  holdModel(): void {
    this.held = true;
    this.cancelCommit();
  }

  releaseModel(): void {
    this.held = false;
  }

  sayTransfer(name: string): void {
    const safe = name.replace(/[^\p{L}\p{N} .'-]/gu, " ").trim().slice(0, 40) || "a teammate";
    const line = this.replyLanguage.toLowerCase().startsWith("ur")
      ? `ٹھیک ہے، میں آپ کو ${safe} کے پاس بھیج رہا ہوں۔`
      : `Okay, I'm switching you to ${safe}.`;
    void this.input.ttsVoiceId.then((id) => {
      if (id) this.resolvedVoiceId = id;
      this.speak(line);
    });
  }

  private speak(sentence: string, signal?: AbortSignal): void {
    const clean = textForSpeech(sentence);
    if (!clean) return;
    const voiceId = this.resolvedVoiceId;
    this.speakChain = this.speakChain
      .then(async () => {
        if (this.closed || signal?.aborted) return;
        const tts = await this.input.tts.synthesize(clean, voiceId, signal);
        if (this.closed || signal?.aborted) return;
        this.emit({
          type: "audio",
          mime: "audio/mpeg",
          data: tts.audio.bytes.toString("base64"),
        });
      })
      .catch((err) => {
        if (this.closed || signal?.aborted) return;
        this.input.logger.warn("widget.voice.tts_failed", {
          message: err instanceof Error ? err.message : "TTS failed",
        });
      });
  }

  pushPcm(int16: Buffer): void {
    if (int16.length < 2) return;
    const level = frameEnergy(int16);
    this.emit({ type: "level", value: level });
    if (this.held) return;
    if (!this.dgSocket || this.dgSocket.readyState !== WebSocket.OPEN) return;
    if (this.processingTurn) {
      if (level >= BARGE_IN_ENERGY) {
        this.bargeFrames += 1;
        if (this.bargeFrames >= 3) this.bargeIn();
      } else {
        this.bargeFrames = 0;
      }
    }
    this.dgSocket.send(int16);
  }

  private bargeIn(): void {
    this.bargeFrames = 0;
    this.turnAbort?.abort();
    this.turnAbort = null;
    this.processingTurn = false;
    this.emit({ type: "interrupt" });
  }

  private currentUtterance(): string {
    return [...this.utteranceParts, this.openInterim].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  }

  private cancelCommit(): void {
    if (this.commitTimer) {
      clearTimeout(this.commitTimer);
      this.commitTimer = null;
    }
  }

  /** Eager when the phrase looks finished; longer when it still sounds open. */
  private scheduleCommit(delayMs = 180): void {
    if (this.processingTurn || this.closed) return;
    this.cancelCommit();
    this.commitTimer = setTimeout(() => {
      this.commitTimer = null;
      void this.commitUtterance();
    }, delayMs);
  }

  private async commitUtterance(): Promise<void> {
    const text = this.currentUtterance();
    this.utteranceParts = [];
    this.openInterim = "";
    if (!text || this.processingTurn || this.closed || this.held) return;
    if (/^(um+|uh+|hmm+|ah+|er+|mm+)$/i.test(text)) return;
    const now = Date.now();
    if (text === this.lastProcessedText && now - this.lastProcessedAt < 1_500) return;
    if (text.length < 2) return;
    this.processingTurn = true;
    this.bargeFrames = 0;
    this.lastProcessedText = text;
    this.lastProcessedAt = now;
    const turnAbort = new AbortController();
    this.turnAbort = turnAbort;
    const requestId = randomUUID();
    const idempotencyKey = randomUUID();
    let assistantBuffer = "";

    this.emit({ type: "transcript", text, interim: false });
    this.emit({ type: "thinking" });

    try {
      let pending = "";
      const speak = (sentence: string) => this.speak(sentence, turnAbort.signal);

      const turn = await streamWidgetTurn(
        {
          runtimeUrl: this.input.runtimeUrl,
          internalToken: this.input.internalToken,
          workspaceId: this.input.workspaceId,
          conversationId: this.input.conversationId,
          actorId: this.input.actorId,
          text,
          idempotencyKey,
          requestId,
          modality: "voice",
          replyLanguage: this.replyLanguage,
          signal: turnAbort.signal,
          onNudge: (line) => speak(line),
          onTransfer: () => {
            this.held = true;
            this.input.onTransferSpoken?.();
          },
        },
        (delta) => {
          assistantBuffer += delta;
          pending += delta;
          this.emit({ type: "assistant_token", delta });
          const cut = firstSpeakableCut(pending);
          if (cut > 0) {
            speak(pending.slice(0, cut));
            pending = pending.slice(cut);
          }
        },
      );
      const assistantText = turn.assistant_text || assistantBuffer;
      if (pending.trim()) speak(pending);
      this.emit({ type: "assistant_done", text: assistantText });
      await this.speakChain;
      this.emit({ type: "turn_done" });
    } catch (err) {
      if (turnAbort.signal.aborted || this.closed) return;
      const message = err instanceof Error ? err.message : "Voice turn failed";
      this.input.logger.warn("widget.voice.live_turn_failed", { message });
      this.emit({ type: "error", message });
    } finally {
      if (this.turnAbort === turnAbort) {
        this.turnAbort = null;
        this.processingTurn = false;
      }
    }
  }

  close(): void {
    this.closed = true;
    this.turnAbort?.abort();
    this.turnAbort = null;
    this.processingTurn = false;
    this.cancelCommit();
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
    if (this.dgSocket && this.dgSocket.readyState === WebSocket.OPEN) {
      this.dgSocket.close();
    }
    this.dgSocket = null;
  }
}
