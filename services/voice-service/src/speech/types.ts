export type AudioChunk = {
  /** Raw audio bytes (PCM or μ-law depending on provider). */
  bytes: Buffer;
  encoding: "pcm16" | "mulaw" | "fake";
  sampleRateHz: number;
};

export type TranscriptResult = {
  text: string;
  latencyMs: number;
  provider: string;
};

export type SynthesisResult = {
  audio: AudioChunk;
  latencyMs: number;
  provider: string;
};

export interface SpeechToText {
  readonly id: string;
  transcribe(chunk: AudioChunk, signal?: AbortSignal): Promise<TranscriptResult>;
}

export interface TextToSpeech {
  readonly id: string;
  synthesize(text: string, voiceId: string, signal?: AbortSignal): Promise<SynthesisResult>;
}

/** Optional realtime speech-to-speech session (emotional / compliance profiles). */
export interface SpeechToSpeechSession {
  readonly id: string;
  pushAudio(chunk: AudioChunk): Promise<void>;
  pullAudio(signal?: AbortSignal): Promise<AudioChunk | null>;
  /** Sidecar or provider transcript for compliance. */
  pullTranscript(): Promise<string | null>;
  close(): Promise<void>;
}

export interface SpeechToSpeechFactory {
  readonly id: string;
  open(options: { language: string; systemPrompt: string }): Promise<SpeechToSpeechSession>;
}
