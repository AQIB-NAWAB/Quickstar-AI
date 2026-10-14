import { randomUUID } from "node:crypto";
import type { Logger } from "@quickstart/logging";
import type { TextToSpeech } from "../speech/types.js";
import { textForSpeech } from "../services/widget-voice.service.js";
import { streamWidgetTurn } from "../clients/runtime-widget-stream.js";

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
  /** Finalized phrases in the current utterance. A short pause must not commit these. */
  private utteranceParts: string[] = [];
  private openInterim = "";
  private commitTimer: ReturnType<typeof setTimeout> | null = null;

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
      logger: Logger;
    },
  ) {}

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
    const model = this.input.deepgramModel || "nova-2";
    const params = new URLSearchParams({
      model,
      encoding: "linear16",
      sample_rate: "16000",
      channels: "1",
      interim_results: "true",
      punctuate: "true",
      smart_format: "true",
      endpointing: "450",
      utterance_end_ms: "900",
      vad_events: "true",
    });
    const url = `wss://api.deepgram.com/v1/listen?${params}`;
    const dg = new WebSocket(url, ["token", this.input.deepgramApiKey]);
    this.dgSocket = dg;

    dg.addEventListener("open", () => {
      this.ready = true;
      this.emit({ type: "ready" });
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
        this.scheduleCommit();
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
    });

    dg.addEventListener("error", () => {
      this.emit({ type: "error", message: "Live speech connection failed" });
    });

    dg.addEventListener("close", () => {
      if (!this.closed) {
        this.emit({ type: "error", message: "Live speech connection closed" });
      }
    });
  }

  pushPcm(int16: Buffer): void {
    if (this.processingTurn) return;
    if (!this.dgSocket || this.dgSocket.readyState !== WebSocket.OPEN) return;
    if (int16.length < 2) return;
    let sum = 0;
    for (let i = 0; i < int16.length; i += 2) {
      sum += Math.abs(int16.readInt16LE(i));
    }
    const level = Math.min(1, sum / (int16.length / 2) / 8000);
    this.emit({ type: "level", value: level });
    this.dgSocket.send(int16);
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

  /** Wait past the Deepgram utterance end so a mid-sentence pause does not start a reply. */
  private scheduleCommit(): void {
    if (this.processingTurn || this.closed) return;
    this.cancelCommit();
    this.commitTimer = setTimeout(() => {
      this.commitTimer = null;
      void this.commitUtterance();
    }, 250);
  }

  private async commitUtterance(): Promise<void> {
    const text = this.currentUtterance();
    this.utteranceParts = [];
    this.openInterim = "";
    if (!text || this.processingTurn || this.closed) return;
    if (text === this.lastProcessedText) return;
    if (text.length < 2) return;
    this.processingTurn = true;
    this.lastProcessedText = text;
    const requestId = randomUUID();
    const idempotencyKey = randomUUID();
    let assistantBuffer = "";

    this.emit({ type: "transcript", text, interim: false });
    this.emit({ type: "thinking" });

    try {
      let pending = "";
      let speakChain = Promise.resolve();
      const speak = (sentence: string) => {
        const clean = textForSpeech(sentence);
        if (!clean) return;
        speakChain = speakChain.then(async () => {
          if (this.closed) return;
          const tts = await this.input.tts.synthesize(clean, "default");
          this.emit({
            type: "audio",
            mime: "audio/mpeg",
            data: tts.audio.bytes.toString("base64"),
          });
        });
      };

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
        },
        (delta) => {
          assistantBuffer += delta;
          pending += delta;
          this.emit({ type: "assistant_token", delta });
          let match = pending.match(/^([\s\S]*?[.!?])\s+/);
          if (!match && pending.length > 70) {
            const cut = pending.lastIndexOf(" ", 70);
            if (cut > 20) match = [pending.slice(0, cut + 1), pending.slice(0, cut)];
          }
          if (match) {
            speak(match[1]);
            pending = pending.slice(match[0].length);
          }
        },
      );
      const assistantText = turn.assistant_text || assistantBuffer;
      if (pending.trim()) speak(pending);
      this.emit({ type: "assistant_done", text: assistantText });
      await speakChain;
      this.emit({ type: "turn_done" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Voice turn failed";
      this.input.logger.warn("widget.voice.live_turn_failed", { message });
      this.emit({ type: "error", message });
    } finally {
      this.processingTurn = false;
    }
  }

  close(): void {
    this.closed = true;
    this.cancelCommit();
    if (this.dgSocket && this.dgSocket.readyState === WebSocket.OPEN) {
      this.dgSocket.close();
    }
    this.dgSocket = null;
  }
}
