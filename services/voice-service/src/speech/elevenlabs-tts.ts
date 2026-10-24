import { AppError, ErrorCode } from "@quickstart/errors";
import type {
  AudioChunk,
  SynthesisResult,
  SynthesisStreamMetrics,
  TextToSpeech,
} from "./types.js";

export type ElevenLabsTtsOptions = {
  apiKey: string;
  /** eleven_flash_v2_5 (low latency), eleven_v4, eleven_v3, ... */
  model?: string;
  /** Used when the catalog entry is `reference`. */
  voiceId?: string;
  outputFormat?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

/**
 * ElevenLabs streaming TTS. The model stays on this process; the caller only
 * sees MP3 chunks. Default is Flash v2.5 because it is the low-latency model
 * ElevenLabs recommends for realtime voice agents; set ELEVENLABS_MODEL=eleven_v4
 * when voice quality matters more than latency.
 */
export class ElevenLabsTextToSpeech implements TextToSpeech {
  readonly id = "elevenlabs-tts";

  constructor(private readonly options: ElevenLabsTtsOptions) {
    if (!options.apiKey) throw new Error("ElevenLabsTextToSpeech requires apiKey");
  }

  async synthesize(
    text: string,
    voiceId: string,
    signal?: AbortSignal,
  ): Promise<SynthesisResult> {
    const chunks: AudioChunk[] = [];
    const metrics = await this.streamSynthesize(text, voiceId, (audio) => chunks.push(audio), signal);
    const bytes = Buffer.concat(chunks.map((chunk) => chunk.bytes));
    if (bytes.length === 0) {
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: "ElevenLabs returned empty audio",
      });
    }
    return {
      audio: {
        bytes,
        encoding: "mp3",
        sampleRateHz: 44_100,
        mimeType: "audio/mpeg",
      },
      latencyMs: Math.max(1, metrics.latencyMs),
      provider: this.id,
    };
  }

  async streamSynthesize(
    text: string,
    voiceId: string,
    onAudio: (audio: AudioChunk) => void,
    signal?: AbortSignal,
  ): Promise<SynthesisStreamMetrics> {
    const started = Date.now();
    const input = text.trim();
    if (!input) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "ElevenLabs TTS requires non-empty text",
      });
    }
    const requested = voiceId.trim();
    const voice =
      requested === "reference" || requested === ""
        ? this.options.voiceId?.trim()
        : requested;
    if (!voice) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "ElevenLabs TTS requires ELEVENLABS_VOICE_ID or a catalog voice id",
      });
    }

    const model = this.options.model ?? "eleven_flash_v2_5";
    const outputFormat = this.options.outputFormat ?? "mp3_44100_128";
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
      voice,
    )}/stream?output_format=${encodeURIComponent(outputFormat)}`;

    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    else signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 20_000);

    let firstChunkLatencyMs = 0;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const res = await (this.options.fetchImpl ?? fetch)(url, {
        method: "POST",
        headers: {
          "xi-api-key": this.options.apiKey,
          "content-type": "application/json",
          accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: input.slice(0, 5000),
          model_id: model,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0,
            use_speaker_boost: true,
          },
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => "");
        const retryable = res.status === 429 || res.status >= 500;
        throw new AppError({
          code: retryable ? ErrorCode.UPSTREAM_UNAVAILABLE : ErrorCode.VALIDATION_FAILED,
          message: `ElevenLabs TTS failed (${res.status}): ${detail.slice(0, 160)}`,
        });
      }

      reader = res.body.getReader();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value || value.length === 0) continue;
        if (!firstChunkLatencyMs) firstChunkLatencyMs = Math.max(1, Date.now() - started);
        onAudio({
          bytes: Buffer.from(value),
          encoding: "mp3",
          sampleRateHz: 44_100,
          mimeType: "audio/mpeg",
        });
      }
      if (!firstChunkLatencyMs) {
        throw new AppError({
          code: ErrorCode.UPSTREAM_UNAVAILABLE,
          message: "ElevenLabs returned an empty audio stream",
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
          message: "ElevenLabs TTS timed out",
        });
      }
      if (signal?.aborted) throw new DOMException("Synthesis interrupted", "AbortError");
      if (err instanceof AppError) throw err;
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: err instanceof Error ? err.message : "ElevenLabs TTS failed",
      });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      if (reader) void reader.cancel().catch(() => undefined);
    }
  }
}
