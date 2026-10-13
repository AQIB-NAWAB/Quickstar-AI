import { FakeSpeechToText } from "./fake-stt.js";
import type { AudioChunk, SpeechToSpeechFactory, SpeechToSpeechSession, SpeechToText, SynthesisResult, TextToSpeech } from "./types.js";

export class FakeTextToSpeech implements TextToSpeech {
  readonly id = "fake-tts";

  constructor(private readonly delayMs = 0) {}

  async synthesize(text: string, _voiceId: string, signal?: AbortSignal): Promise<SynthesisResult> {
    void _voiceId;
    const started = Date.now();
    if (signal?.aborted) {
      const err = new Error("TTS aborted");
      err.name = "AbortError";
      throw err;
    }
    if (this.delayMs > 0) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, this.delayMs);
        const onAbort = () => {
          clearTimeout(timer);
          const err = new Error("TTS aborted");
          err.name = "AbortError";
          reject(err);
        };
        if (signal) {
          signal.addEventListener("abort", onAbort, { once: true });
        }
      });
    }
    const audio: AudioChunk = {
      bytes: Buffer.from(`tts:${text}`, "utf8"),
      encoding: "fake",
      sampleRateHz: 8000,
    };
    return { audio, latencyMs: Math.max(1, Date.now() - started), provider: this.id };
  }
}

class FakeS2SSession implements SpeechToSpeechSession {
  readonly id = "fake-s2s-session";
  private lastUserText: string | null = null;
  private pendingAudio: AudioChunk | null = null;

  async pushAudio(chunk: AudioChunk): Promise<void> {
    this.lastUserText = chunk.bytes.toString("utf8") || "hello";
    this.pendingAudio = {
      bytes: Buffer.from(`s2s-reply:${this.lastUserText}`, "utf8"),
      encoding: "fake",
      sampleRateHz: 8000,
    };
  }

  async pullAudio(_signal?: AbortSignal): Promise<AudioChunk | null> {
    void _signal;
    const out = this.pendingAudio;
    this.pendingAudio = null;
    return out;
  }

  async pullTranscript(): Promise<string | null> {
    return this.lastUserText;
  }

  async close(): Promise<void> {
    this.pendingAudio = null;
  }
}

export class FakeSpeechToSpeechFactory implements SpeechToSpeechFactory {
  readonly id = "fake-s2s";

  async open(_options: { language: string; systemPrompt: string }): Promise<SpeechToSpeechSession> {
    void _options;
    return new FakeS2SSession();
  }
}

export type SpeechBundle = {
  stt: SpeechToText;
  tts: TextToSpeech;
  s2s: SpeechToSpeechFactory;
};

export function createFakeSpeechBundle(
  fixedUtterance?: string,
  opts?: { sttDelayMs?: number; ttsDelayMs?: number },
): SpeechBundle {
  return {
    stt: new FakeSpeechToText(fixedUtterance, opts?.sttDelayMs ?? 0),
    tts: new FakeTextToSpeech(opts?.ttsDelayMs ?? 0),
    s2s: new FakeSpeechToSpeechFactory(),
  };
}
