import { randomUUID } from "node:crypto";
import type { Logger } from "@quickstart/logging";
import type { VoiceLiveEvent } from "./live-session.js";

type Listener = (event: VoiceLiveEvent) => void;

/** Linear resample 16 kHz PCM16 → 24 kHz PCM16 (OpenAI Realtime input rate). */
export function resamplePcm16(input: Buffer, fromRate: number, toRate: number): Buffer {
  if (fromRate === toRate) return input;
  const inSamples = Math.floor(input.length / 2);
  if (inSamples < 2) return Buffer.alloc(0);
  const outSamples = Math.max(1, Math.floor((inSamples * toRate) / fromRate));
  const out = Buffer.alloc(outSamples * 2);
  for (let i = 0; i < outSamples; i++) {
    const src = (i * fromRate) / toRate;
    const i0 = Math.min(inSamples - 1, Math.floor(src));
    const i1 = Math.min(inSamples - 1, i0 + 1);
    const frac = src - i0;
    const s0 = input.readInt16LE(i0 * 2);
    const s1 = input.readInt16LE(i1 * 2);
    const sample = Math.round(s0 + (s1 - s0) * frac);
    out.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), i * 2);
  }
  return out;
}

/**
 * Speech-to-speech session. Browser PCM is forwarded to OpenAI Realtime and
 * audio deltas come back on the same SSE channel. The model key stays on this process.
 */
export class OpenAiRealtimeLiveSession {
  private readonly listeners = new Set<Listener>();
  private socket: WebSocket | null = null;
  private closed = false;
  private ready = false;
  private assistantText = "";

  constructor(
    private readonly input: {
      apiKey: string;
      model: string;
      workspaceId: string;
      conversationId: string;
      actorId: string;
      conversationUrl: string;
      internalToken: string;
      logger: Logger;
      /** Override for OpenAI-compatible realtime providers such as ElevenLabs. */
      url?: string;
      headers?: Record<string, string>;
      voice?: string;
      transcriptionModel?: string;
      instructions?: string | Promise<string>;
    },
  ) {}

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    if (this.ready) listener({ type: "ready" });
    return () => this.listeners.delete(listener);
  }

  private emit(event: VoiceLiveEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  async start(): Promise<void> {
    const model = this.input.model || "gpt-live-1";
    const url =
      this.input.url ??
      `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`;
    const headers = this.input.headers ?? {
      Authorization: `Bearer ${this.input.apiKey}`,
    };
    const socket = new WebSocket(url, {
      headers,
    } as unknown as string[]);
    this.socket = socket;

    socket.addEventListener("open", () => {
      void (async () => {
        const fallback =
          "You are QuickStart's website voice agent. Answer in one or two short spoken sentences. No markdown, lists, or stage directions.";
        const instructions = await Promise.resolve(
          this.input.instructions ?? fallback,
        ).catch(() => fallback);
        if (this.closed || socket.readyState !== WebSocket.OPEN) return;
        socket.send(
          JSON.stringify({
            type: "session.update",
            session: {
              type: "realtime",
              model,
              output_modalities: ["audio"],
              instructions,
              audio: {
                input: {
                  format: { type: "audio/pcm", rate: 24000 },
                  transcription: {
                    model: this.input.transcriptionModel ?? "gpt-4o-transcribe",
                  },
                  turn_detection: { type: "semantic_vad" },
                },
                output: {
                  format: { type: "audio/pcm", rate: 24000 },
                  voice: this.input.voice ?? "marin",
                },
              },
            },
          }),
        );
        this.ready = true;
        this.emit({ type: "ready" });
      })();
    });

    socket.addEventListener("message", (ev) => {
      if (typeof ev.data !== "string") return;
      let msg: {
        type?: string;
        delta?: string;
        transcript?: string;
        error?: { message?: string };
      };
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      switch (msg.type) {
        case "conversation.item.input_audio_transcription.completed":
          if (msg.transcript?.trim()) {
            const text = msg.transcript.trim();
            this.emit({ type: "transcript", text, interim: false });
            void this.persist("user", text);
          }
          break;
        case "response.created":
          this.assistantText = "";
          this.emit({ type: "thinking" });
          break;
        case "response.output_audio_transcript.delta":
        case "response.audio_transcript.delta":
          if (msg.delta) {
            this.assistantText += msg.delta;
            this.emit({ type: "assistant_token", delta: msg.delta });
          }
          break;
        case "response.output_audio.delta":
        case "response.audio.delta":
          if (msg.delta) {
            this.emit({
              type: "audio",
              mime: "audio/pcm",
              data: msg.delta,
              encoding: "pcm16",
              sample_rate: 24000,
            });
          }
          break;
        case "response.output_audio_transcript.done":
        case "response.audio_transcript.done":
          if (msg.transcript?.trim()) {
            this.assistantText = msg.transcript.trim();
            this.emit({ type: "assistant_done", text: this.assistantText });
            void this.persist("assistant", this.assistantText);
          }
          break;
        case "response.done":
          this.emit({ type: "turn_done" });
          break;
        case "error":
          this.emit({
            type: "error",
            message: msg.error?.message || "Realtime voice failed",
          });
          this.input.logger.warn("widget.voice.realtime_error", {
            message: msg.error?.message || "unknown",
          });
          break;
        default:
          break;
      }
    });

    socket.addEventListener("error", () => {
      this.emit({ type: "error", message: "Realtime voice connection failed" });
    });
    socket.addEventListener("close", () => {
      if (!this.closed) this.emit({ type: "error", message: "Realtime voice connection closed" });
    });
  }

  pushPcm(int16: Buffer): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const pcm24 = resamplePcm16(int16, 16_000, 24_000);
    if (pcm24.length < 2) return;
    this.socket.send(
      JSON.stringify({
        type: "input_audio_buffer.append",
        audio: pcm24.toString("base64"),
      }),
    );
  }

  close(): void {
    this.closed = true;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) this.socket.close();
    this.socket = null;
  }

  private async persist(sender: "user" | "assistant", text: string): Promise<void> {
    const url = `${this.input.conversationUrl}/internal/workspaces/${encodeURIComponent(this.input.workspaceId)}/widget/conversations/${encodeURIComponent(this.input.conversationId)}/messages`;
    try {
      await fetch(url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.input.internalToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          text,
          sender_type: sender,
          sender_id: this.input.actorId,
          idempotency_key: randomUUID(),
          metadata: { channel: "widget", modality: "openai-realtime" },
        }),
      });
    } catch (err) {
      this.input.logger.warn("widget.voice.persist_failed", {
        message: err instanceof Error ? err.message : "persist failed",
      });
    }
  }
}
