import type { AudioChunk, SpeechToText, TranscriptResult } from "./types.js";

export class FakeSpeechToText implements SpeechToText {
  readonly id = "fake-stt";

  constructor(
    private readonly fixedText = "hello from caller",
    private readonly delayMs = 0,
  ) {}

  async transcribe(chunk: AudioChunk, signal?: AbortSignal): Promise<TranscriptResult> {
    const started = Date.now();
    if (signal?.aborted) {
      const err = new Error("STT aborted");
      err.name = "AbortError";
      throw err;
    }
    if (this.delayMs > 0) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, this.delayMs);
        const onAbort = () => {
          clearTimeout(timer);
          const err = new Error("STT aborted");
          err.name = "AbortError";
          reject(err);
        };
        if (signal) {
          signal.addEventListener("abort", onAbort, { once: true });
        }
      });
    }
    const decoded = chunk.bytes.toString("utf8");
    const text =
      chunk.encoding === "fake" && decoded.length > 0 ? decoded : this.fixedText;
    return { text, latencyMs: Math.max(1, Date.now() - started), provider: this.id };
  }
}
