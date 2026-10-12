import type { AudioChunk, SpeechToText, TranscriptResult } from "./types.js";

export class FakeSpeechToText implements SpeechToText {
  readonly id = "fake-stt";

  constructor(private readonly fixedText = "hello from caller") {}

  async transcribe(chunk: AudioChunk, _signal?: AbortSignal): Promise<TranscriptResult> {
    void _signal;
    const started = Date.now();
    const decoded = chunk.bytes.toString("utf8");
    const text =
      chunk.encoding === "fake" && decoded.length > 0 ? decoded : this.fixedText;
    return { text, latencyMs: Math.max(1, Date.now() - started), provider: this.id };
  }
}
