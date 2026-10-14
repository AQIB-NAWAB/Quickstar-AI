import { AppError, ErrorCode } from "@quickstart/errors";
import type { AudioChunk, SpeechToText, TranscriptResult } from "./types.js";

export type DeepgramSttOptions = {
  apiKey: string;
  model?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

function mimeFor(chunk: AudioChunk): string {
  if (chunk.mimeType?.trim()) {
    return chunk.mimeType.trim();
  }
  switch (chunk.encoding) {
    case "webm":
      return "audio/webm";
    case "mp3":
      return "audio/mpeg";
    case "mulaw":
    case "pcm16":
      return "audio/wav";
    case "fake":
    default:
      return "text/plain";
  }
}

export class DeepgramSpeechToText implements SpeechToText {
  readonly id = "deepgram-stt";

  constructor(private readonly options: DeepgramSttOptions) {
    if (!options.apiKey) {
      throw new Error("DeepgramSpeechToText requires apiKey");
    }
  }

  async transcribe(chunk: AudioChunk, signal?: AbortSignal): Promise<TranscriptResult> {
    const started = Date.now();
    const model = this.options.model ?? "nova-2";
    const query = new URLSearchParams({
      model,
      smart_format: "true",
      punctuate: "true",
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 30_000);
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    const fetchImpl = this.options.fetchImpl ?? fetch;
    try {
      const res = await fetchImpl(`https://api.deepgram.com/v1/listen?${query}`, {
        method: "POST",
        headers: {
          Authorization: `Token ${this.options.apiKey}`,
          "Content-Type": mimeFor(chunk),
        },
        body: Uint8Array.from(chunk.bytes),
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        const retryable = res.status === 429 || res.status >= 500;
        throw new AppError({
          code: retryable ? ErrorCode.UPSTREAM_UNAVAILABLE : ErrorCode.VALIDATION_FAILED,
          message: `Deepgram STT failed (${res.status}): ${body.slice(0, 160)}`,
        });
      }
      const json = (await res.json()) as {
        results?: { channels?: Array<{ alternatives?: Array<{ transcript?: string }> }> };
      };
      const text = (json.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "").trim();
      if (!text) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "Could not understand audio — try speaking again",
        });
      }
      return {
        text,
        latencyMs: Math.max(1, Date.now() - started),
        provider: this.id,
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new AppError({
          code: ErrorCode.UPSTREAM_TIMEOUT,
          message: "Deepgram STT timed out",
        });
      }
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: err instanceof Error ? err.message : "Deepgram STT failed",
      });
    } finally {
      clearTimeout(timer);
    }
  }
}
