import { AppError, ErrorCode } from "@quickstart/errors";
import type { AudioChunk, SynthesisResult, TextToSpeech } from "./types.js";

export type UpliftTtsOptions = {
  apiKey: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

export class UpliftTextToSpeech implements TextToSpeech {
  readonly id = "uplift-tts";

  constructor(private readonly options: UpliftTtsOptions) {
    if (!options.apiKey) throw new Error("UpliftTextToSpeech requires apiKey");
  }

  async synthesize(text: string, voiceId: string, signal?: AbortSignal): Promise<SynthesisResult> {
    const started = Date.now();
    const input = text.trim();
    if (!input) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Uplift TTS requires non-empty text" });
    }
    const voice = voiceId.trim();
    if (!voice) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Uplift TTS requires a voice id" });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 20_000);
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    const fetchImpl = this.options.fetchImpl ?? fetch;
    try {
      const res = await fetchImpl("https://api.upliftai.org/v1/synthesis/text-to-speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          voiceId: voice,
          text: input.slice(0, 2500),
          outputFormat: "MP3_22050_128",
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        const retryable = res.status === 429 || res.status >= 500;
        throw new AppError({
          code: retryable ? ErrorCode.UPSTREAM_UNAVAILABLE : ErrorCode.VALIDATION_FAILED,
          message: `Uplift TTS failed (${res.status}): ${errBody.slice(0, 160)}`,
        });
      }
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.length === 0) {
        throw new AppError({ code: ErrorCode.UPSTREAM_UNAVAILABLE, message: "Uplift TTS returned empty audio" });
      }
      const audio: AudioChunk = { bytes, encoding: "mp3", sampleRateHz: 22_050, mimeType: "audio/mpeg" };
      return { audio, latencyMs: Math.max(1, Date.now() - started), provider: this.id };
    } catch (err) {
      if (err instanceof AppError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new AppError({ code: ErrorCode.UPSTREAM_TIMEOUT, message: "Uplift TTS timed out" });
      }
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: err instanceof Error ? err.message : "Uplift TTS failed",
      });
    } finally {
      clearTimeout(timer);
    }
  }
}
