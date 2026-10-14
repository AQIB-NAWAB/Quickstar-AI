import { randomUUID } from "node:crypto";
import type { Logger } from "@quickstart/logging";
import type { VoiceLiveEvent } from "./live-session.js";

type Listener = (event: VoiceLiveEvent) => void;

type GeminiServerMessage = {
  setupComplete?: Record<string, unknown>;
  error?: { message?: string };
  serverContent?: {
    interrupted?: boolean;
    turnComplete?: boolean;
    generationComplete?: boolean;
    inputTranscription?: { text?: string };
    interimInputTranscription?: { text?: string };
    outputTranscription?: { text?: string };
    modelTurn?: {
      parts?: Array<{
        text?: string;
        inlineData?: { mimeType?: string; data?: string };
      }>;
    };
  };
};

/**
 * Speech-to-speech session on Gemini Live.
 * Browser audio is already 16 kHz PCM, which is the Live API input rate.
 * Spoken replies come back as 24 kHz PCM.
 */
export class GeminiLiveSession {
  private readonly listeners = new Set<Listener>();
  private socket: WebSocket | null = null;
  private closed = false;
  private ready = false;
  private assistantText = "";
  private userText = "";
  /** Audio that arrived before setup finished. Capped at about two seconds. */
  private pendingAudio: Buffer[] = [];
  private pendingAudioBytes = 0;
  private held = false;
  private transferSpoken = false;
  private pendingTransferName: string | null = null;

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
      brief: Promise<string>;
      onTransferSpoken?: () => void;
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
    const model = this.input.model || "gemini-3.8-live";
    const instruction = await this.input.brief;
    if (this.closed) return;
    const url =
      "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=" +
      encodeURIComponent(this.input.apiKey);
    const socket = new WebSocket(url);
    this.socket = socket;

    socket.addEventListener("open", () => {
      this.input.logger.info("widget.voice.gemini_socket", { event: "open", model });
      socket.send(
        JSON.stringify({
          setup: {
            model: `models/${model}`,
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
              },
            },
            systemInstruction: {
              parts: [{ text: instruction }],
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            realtimeInputConfig: {
              automaticActivityDetection: {
                silenceDurationMs: 320,
                prefixPaddingMs: 120,
                endOfSpeechSensitivity: "END_SENSITIVITY_HIGH",
              },
            },
          },
        }),
      );
    });

    socket.addEventListener("message", (ev) => {
      void this.onSocketMessage(ev.data);
    });

    socket.addEventListener("error", () => {
      this.emit({ type: "error", message: "Gemini Live connection failed" });
      this.input.logger.warn("widget.voice.gemini_socket", { event: "error" });
    });
    socket.addEventListener("close", (ev) => {
      const close = ev as { code?: number; reason?: string };
      const reason = String(close.reason || "");
      this.input.logger.warn("widget.voice.gemini_socket", {
        event: "close",
        code: close.code ?? 0,
        reason: reason.slice(0, 300),
      });
      if (!this.closed && !this.ready) {
        this.emit({
          type: "error",
          message: reason || "Gemini Live connection closed",
        });
      }
    });
  }

  private async onSocketMessage(data: unknown): Promise<void> {
    let raw = "";
    if (typeof data === "string") raw = data;
    else if (data instanceof ArrayBuffer) raw = Buffer.from(data).toString("utf8");
    else if (ArrayBuffer.isView(data)) raw = Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("utf8");
    else if (data && typeof (data as Blob).text === "function") raw = await (data as Blob).text();
    if (!raw) return;
    let msg: GeminiServerMessage;
    try {
      msg = JSON.parse(raw) as GeminiServerMessage;
    } catch {
      return;
    }
    if (msg.setupComplete) {
        this.ready = true;
        this.input.logger.info("widget.voice.gemini_socket", { event: "setup_complete" });
        const queued = this.pendingAudio;
        this.pendingAudio = [];
        this.pendingAudioBytes = 0;
        for (const chunk of queued) this.sendPcm(chunk);
        this.flushTransfer();
        this.emit({ type: "ready" });
        return;
      }
      if (msg.error?.message) {
        this.emit({ type: "error", message: msg.error.message });
        this.input.logger.warn("widget.voice.gemini_error", { message: msg.error.message });
        return;
      }
      const content = msg.serverContent;
      if (!content) return;

      if (content.interrupted) {
        this.assistantText = "";
        this.emit({ type: "interrupt" });
      }

      const interim = content.interimInputTranscription?.text?.trim();
      if (interim) this.emit({ type: "transcript", text: interim, interim: true });

      const heard = content.inputTranscription?.text?.trim();
      if (heard && heard !== this.userText) {
        this.userText = heard;
        this.emit({ type: "transcript", text: heard, interim: false });
        void this.persist("user", heard);
      }

      const spoken = content.outputTranscription?.text ?? "";
      if (spoken) {
        const delta = spoken.startsWith(this.assistantText)
          ? spoken.slice(this.assistantText.length)
          : spoken;
        this.assistantText = spoken.startsWith(this.assistantText) ? spoken : this.assistantText + spoken;
        if (delta) this.emit({ type: "assistant_token", delta });
        this.noteTransfer(this.assistantText);
      }

      for (const part of content.modelTurn?.parts ?? []) {
        if (part.inlineData?.data) {
          this.emit({
            type: "audio",
            mime: part.inlineData.mimeType || "audio/pcm",
            data: part.inlineData.data,
            encoding: "pcm16",
            sample_rate: 24000,
          });
        }
      }

      if (content.turnComplete) {
        if (this.assistantText.trim()) {
          this.emit({ type: "assistant_done", text: this.assistantText.trim() });
          void this.persist("assistant", this.assistantText.trim());
        }
        this.assistantText = "";
        this.userText = "";
        this.emit({ type: "turn_done" });
      }
  }

  sayTransfer(name: string): void {
    const safe = name.replace(/[\r\n"]/g, " ").trim().slice(0, 80) || "a teammate";
    this.pendingTransferName = safe;
    this.flushTransfer();
  }

  holdModel(): void {
    this.held = true;
  }

  releaseModel(): void {
    this.held = false;
    this.transferSpoken = false;
  }

  private noteTransfer(text: string): void {
    if (this.transferSpoken) return;
    if (!/switching you/i.test(text)) return;
    this.transferSpoken = true;
    this.held = true;
    this.input.onTransferSpoken?.();
  }

  private flushTransfer(): void {
    const name = this.pendingTransferName;
    if (!name || !this.ready || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.pendingTransferName = null;
    this.socket.send(
      JSON.stringify({
        clientContent: {
          turns: [
            {
              role: "user",
              parts: [
                {
                  text: `A human teammate named ${name} is joining this call. Say exactly: I'm switching you to ${name} now.`,
                },
              ],
            },
          ],
          turnComplete: true,
        },
      }),
    );
  }

  pushPcm(int16: Buffer): void {
    if (this.held || int16.length < 2) return;
    if (!this.ready || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.pendingAudio.push(int16);
      this.pendingAudioBytes += int16.length;
      while (this.pendingAudioBytes > 64_000 && this.pendingAudio.length > 1) {
        const dropped = this.pendingAudio.shift();
        if (dropped) this.pendingAudioBytes -= dropped.length;
      }
      return;
    }
    this.sendPcm(int16);
  }

  private sendPcm(int16: Buffer): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(
      JSON.stringify({
        realtimeInput: {
          audio: {
            data: int16.toString("base64"),
            mimeType: "audio/pcm;rate=16000",
          },
        },
      }),
    );
  }

  close(): void {
    this.closed = true;
    this.ready = false;
    this.pendingAudio = [];
    this.pendingAudioBytes = 0;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
      this.socket.close();
    }
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
          metadata: { channel: "widget", modality: "gemini-live" },
        }),
      });
    } catch (err) {
      this.input.logger.warn("widget.voice.persist_failed", {
        message: err instanceof Error ? err.message : "persist failed",
      });
    }
  }
}
