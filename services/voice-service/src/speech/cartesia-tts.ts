import { AppError, ErrorCode } from "@quickstart/errors";
import type { AudioChunk, SynthesisResult, TextToSpeech } from "./types.js";

export type CartesiaTtsOptions = {
  apiKey: string;
  model?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

export class CartesiaTextToSpeech implements TextToSpeech {
  readonly id = "cartesia-tts";

  constructor(private readonly options: CartesiaTtsOptions) {
    if (!options.apiKey) throw new Error("CartesiaTextToSpeech requires apiKey");
  }

  async synthesize(
    text: string,
    voiceId: string,
    signal?: AbortSignal,
    language = "en",
  ): Promise<SynthesisResult> {
    const started = Date.now();
    const input = text.trim();
    if (!input) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Cartesia TTS requires non-empty text" });
    }
    const voice = voiceId.trim();
    if (!voice) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Cartesia TTS requires a voice id" });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 20_000);
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    const fetchImpl = this.options.fetchImpl ?? fetch;
    try {
      const res = await fetchImpl("https://api.cartesia.ai/tts/bytes", {
        method: "POST",
        headers: {
          "X-API-Key": this.options.apiKey,
          "Cartesia-Version": "2024-06-10",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model_id: this.options.model ?? "sonic-3.6",
          transcript: input.slice(0, 2000),
          voice: { mode: "id", id: voice },
          output_format: { container: "mp3", sample_rate: 44100, bit_rate: 128000 },
          language: language.slice(0, 2) || "en",
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        const retryable = res.status === 429 || res.status >= 500;
        throw new AppError({
          code: retryable ? ErrorCode.UPSTREAM_UNAVAILABLE : ErrorCode.VALIDATION_FAILED,
          message: `Cartesia TTS failed (${res.status}): ${errBody.slice(0, 160)}`,
        });
      }
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.length === 0) {
        throw new AppError({ code: ErrorCode.UPSTREAM_UNAVAILABLE, message: "Cartesia TTS returned empty audio" });
      }
      const audio: AudioChunk = { bytes, encoding: "mp3", sampleRateHz: 44_100, mimeType: "audio/mpeg" };
      return { audio, latencyMs: Math.max(1, Date.now() - started), provider: this.id };
    } catch (err) {
      if (err instanceof AppError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new AppError({ code: ErrorCode.UPSTREAM_TIMEOUT, message: "Cartesia TTS timed out" });
      }
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: err instanceof Error ? err.message : "Cartesia TTS failed",
      });
    } finally {
      clearTimeout(timer);
    }
  }
}
