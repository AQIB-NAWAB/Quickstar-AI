import { AppError, ErrorCode } from "@quickstart/errors";
import type {
  AudioChunk,
  SynthesisResult,
  SynthesisStreamMetrics,
  TextToSpeech,
} from "./types.js";

export type OpenAiTtsOptions = {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  voice?: string;
  instructions?: string;
  speed?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

export class OpenAiTextToSpeech implements TextToSpeech {
  readonly id = "openai-tts";

  constructor(private readonly options: OpenAiTtsOptions) {
    if (!options.apiKey) {
      throw new Error("OpenAiTextToSpeech requires apiKey");
    }
  }

  async synthesize(text: string, voiceId: string, signal?: AbortSignal): Promise<SynthesisResult> {
    const started = Date.now();
    const baseUrl = (this.options.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");
    const model = this.options.model ?? "gpt-4o-mini-tts-2025-12-15";
    const voice = voiceId?.trim() || this.options.voice?.trim() || "marin";

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.options.timeoutMs ?? 30_000,
    );
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    const fetchImpl = this.options.fetchImpl ?? fetch;
    try {
      const res = await fetchImpl(`${baseUrl}/audio/speech`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: text,
          voice,
          ...(this.options.instructions ? { instructions: this.options.instructions } : {}),
          ...(this.options.speed ? { speed: this.options.speed } : {}),
          response_format: "mp3",
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        const retryable = res.status === 429 || res.status >= 500;
        throw new AppError({
          code: retryable ? ErrorCode.UPSTREAM_UNAVAILABLE : ErrorCode.VALIDATION_FAILED,
          message: `OpenAI TTS failed (${res.status}): ${body.slice(0, 160)}`,
        });
      }
      const ab = await res.arrayBuffer();
      const bytes = Buffer.from(ab);
      if (bytes.length === 0) {
        throw new AppError({
          code: ErrorCode.UPSTREAM_UNAVAILABLE,
          message: "OpenAI TTS returned empty audio",
        });
      }
      const audio: AudioChunk = {
        bytes,
        encoding: "mp3",
        sampleRateHz: 24_000,
      };
      return {
        audio,
        latencyMs: Math.max(1, Date.now() - started),
        provider: this.id,
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new AppError({
          code: ErrorCode.UPSTREAM_TIMEOUT,
          message: "OpenAI TTS timed out",
        });
      }
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: err instanceof Error ? err.message : "OpenAI TTS failed",
      });
    } finally {
      clearTimeout(timer);
    }
  }

  async streamSynthesize(
    text: string,
    voiceId: string,
    onAudio: (audio: AudioChunk) => void,
    signal?: AbortSignal,
  ): Promise<SynthesisStreamMetrics> {
    const started = Date.now();
    const baseUrl = (this.options.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");
    const model = this.options.model ?? "gpt-4o-mini-tts-2025-12-15";
    const voice = voiceId?.trim() || this.options.voice?.trim() || "marin";

    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    else signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 30_000);
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let firstChunkLatencyMs = 0;

    try {
      const res = await (this.options.fetchImpl ?? fetch)(`${baseUrl}/audio/speech`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: text,
          voice,
          ...(this.options.instructions ? { instructions: this.options.instructions } : {}),
          ...(this.options.speed ? { speed: this.options.speed } : {}),
          response_format: "mp3",
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const body = await res.text().catch(() => "");
        const retryable = res.status === 429 || res.status >= 500;
        throw new AppError({
          code: retryable ? ErrorCode.UPSTREAM_UNAVAILABLE : ErrorCode.VALIDATION_FAILED,
          message: `OpenAI TTS failed (${res.status}): ${body.slice(0, 160)}`,
        });
      }
      reader = res.body.getReader();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value || value.length === 0) continue;
        if (!firstChunkLatencyMs) firstChunkLatencyMs = Math.max(1, Date.now() - started);
        onAudio({ bytes: Buffer.from(value), encoding: "mp3", sampleRateHz: 24_000 });
      }
      if (!firstChunkLatencyMs) {
        throw new AppError({
          code: ErrorCode.UPSTREAM_UNAVAILABLE,
          message: "OpenAI TTS returned an empty audio stream",
        });
      }
      return {
        firstChunkLatencyMs,
        latencyMs: Math.max(1, Date.now() - started),
      };
    } catch (err) {
      if (controller.signal.aborted && !signal?.aborted) {
        throw new AppError({
          code: ErrorCode.UPSTREAM_TIMEOUT,
          message: "OpenAI TTS stream timed out",
        });
      }
      if (signal?.aborted) throw new DOMException("Synthesis interrupted", "AbortError");
      if (err instanceof AppError) throw err;
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: err instanceof Error ? err.message : "OpenAI TTS stream failed",
      });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      if (reader) void reader.cancel().catch(() => undefined);
    }
  }
}
