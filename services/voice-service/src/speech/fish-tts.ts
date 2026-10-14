import { AppError, ErrorCode } from "@quickstart/errors";
import type { AudioChunk, SynthesisResult, TextToSpeech } from "./types.js";

export type FishTtsOptions = {
  apiKey: string;
  model?: string;
  referenceId?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

export class FishAudioTextToSpeech implements TextToSpeech {
  readonly id = "fish-tts";

  constructor(private readonly options: FishTtsOptions) {
    if (!options.apiKey) {
      throw new Error("FishAudioTextToSpeech requires apiKey");
    }
  }

  async synthesize(text: string, voiceId: string, signal?: AbortSignal): Promise<SynthesisResult> {
    const started = Date.now();
    const input = text.trim();
    if (!input) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Fish TTS requires non-empty text",
      });
    }

    const referenceId =
      (voiceId?.trim() && voiceId !== "default" ? voiceId.trim() : "") ||
      this.options.referenceId?.trim() ||
      "";

    const body: Record<string, unknown> = {
      text: input,
      format: "mp3",
      latency: "low",
      temperature: 0.5,
      top_p: 0.7,
    };
    if (referenceId) {
      body.reference_id = referenceId;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 45_000);
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    const fetchImpl = this.options.fetchImpl ?? fetch;
    const model = this.options.model ?? "s2.1-pro-free";
    try {
      const res = await fetchImpl("https://api.fish.audio/v1/tts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/json",
          model,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        const retryable = res.status === 429 || res.status >= 500;
        throw new AppError({
          code: retryable ? ErrorCode.UPSTREAM_UNAVAILABLE : ErrorCode.VALIDATION_FAILED,
          message: `Fish TTS failed (${res.status}): ${errBody.slice(0, 160)}`,
        });
      }
      const ab = await res.arrayBuffer();
      const bytes = Buffer.from(ab);
      if (bytes.length === 0) {
        throw new AppError({
          code: ErrorCode.UPSTREAM_UNAVAILABLE,
          message: "Fish TTS returned empty audio",
        });
      }
      const audio: AudioChunk = {
        bytes,
        encoding: "mp3",
        sampleRateHz: 44_100,
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
          message: "Fish TTS timed out",
        });
      }
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: err instanceof Error ? err.message : "Fish TTS failed",
      });
    } finally {
      clearTimeout(timer);
    }
  }
}
