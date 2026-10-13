import { AppError, ErrorCode } from "@quickstart/errors";
import type { AudioChunk, SynthesisResult, TextToSpeech } from "./types.js";

export type OpenAiTtsOptions = {
  apiKey: string;
  baseUrl?: string;
  model?: string;
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
    const model = this.options.model ?? "tts-1";
    const voice = voiceId?.trim() || "alloy";

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
}
