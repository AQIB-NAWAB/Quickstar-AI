import { AppError, ErrorCode } from "@quickstart/errors";
import type { AudioChunk, SynthesisResult, SynthesisStreamMetrics, TextToSpeech } from "./types.js";

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

  async streamSynthesize(
    text: string,
    voiceId: string,
    onAudio: (audio: AudioChunk) => void,
    signal?: AbortSignal,
  ): Promise<SynthesisStreamMetrics> {
    const started = Date.now();
    const input = text.trim();
    const voice = voiceId.trim();
    if (!input) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Uplift TTS requires non-empty text" });
    }
    if (!voice) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Uplift TTS requires a voice id" });
    }

    const controller = new AbortController();
    const abortFromCaller = () => controller.abort();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 20_000);
    if (signal?.aborted) controller.abort();
    else signal?.addEventListener("abort", abortFromCaller, { once: true });

    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let firstChunkLatencyMs = 0;
    let pending = Buffer.alloc(0);
    const frameBytes = 4_410; // about 100 ms of mono PCM16 at 22.05 kHz
    const emit = (bytes: Buffer) => {
      if (!bytes.length || controller.signal.aborted) return;
      if (!firstChunkLatencyMs) firstChunkLatencyMs = Math.max(1, Date.now() - started);
      onAudio({ bytes, encoding: "pcm16", sampleRateHz: 22_050, mimeType: "audio/pcm" });
    };

    try {
      const response = await (this.options.fetchImpl ?? fetch)(
        "https://api.upliftai.org/v1/synthesis/text-to-speech/stream",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.options.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            voiceId: voice,
            text: input.slice(0, 2500),
            outputFormat: "PCM_22050_16",
          }),
          signal: controller.signal,
        },
      );
      if (!response.ok || !response.body) {
        const errBody = await response.text().catch(() => "");
        throw new AppError({
          code: response.status === 429 || response.status >= 500 ? ErrorCode.UPSTREAM_UNAVAILABLE : ErrorCode.VALIDATION_FAILED,
          message: `Uplift TTS stream failed (${response.status}): ${errBody.slice(0, 160)}`,
        });
      }
      reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        pending = Buffer.concat([pending, Buffer.from(value)]);
        while (pending.length >= frameBytes) {
          // PCM16 samples must end on a whole two-byte sample.
          const chunkSize = frameBytes - (frameBytes % 2);
          emit(pending.subarray(0, chunkSize));
          pending = pending.subarray(chunkSize);
        }
      }
      if (pending.length % 2) pending = pending.subarray(0, pending.length - 1);
      emit(pending);
      if (!firstChunkLatencyMs) {
        throw new AppError({ code: ErrorCode.UPSTREAM_UNAVAILABLE, message: "Uplift TTS returned an empty stream" });
      }
      return { firstChunkLatencyMs, latencyMs: Math.max(1, Date.now() - started) };
    } catch (err) {
      if (err instanceof AppError) throw err;
      if (controller.signal.aborted) {
        if (signal?.aborted) throw new DOMException("Synthesis interrupted", "AbortError");
        throw new AppError({ code: ErrorCode.UPSTREAM_TIMEOUT, message: "Uplift TTS stream timed out" });
      }
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: err instanceof Error ? err.message : "Uplift TTS stream failed",
      });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abortFromCaller);
      if (reader) void reader.cancel().catch(() => undefined);
    }
  }
}
