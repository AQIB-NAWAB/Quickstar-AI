export type AudioEncoding = "pcm16" | "mulaw" | "fake" | "mp3" | "webm";

export type AudioChunk = {
  /** Raw audio bytes (PCM, μ-law, mp3, or fake UTF-8 for tests). */
  bytes: Buffer;
  encoding: AudioEncoding;
  sampleRateHz: number;
  /** HTTP Content-Type for containerized audio (e.g. audio/wav, audio/webm;codecs=opus). */
  mimeType?: string;
};

export type SpeechUsageFact = {
  type: "speech.usage";
  provider: string;
  unit: "stt" | "tts";
  units: number;
  call_id?: string;
  workspace_id?: string;
};

export type SpeechUsageEmitter = (fact: SpeechUsageFact) => void;

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

export type SynthesisStreamMetrics = {
  firstChunkLatencyMs: number;
  latencyMs: number;
};

export interface SpeechToText {
  readonly id: string;
  transcribe(chunk: AudioChunk, signal?: AbortSignal): Promise<TranscriptResult>;
}

export interface TextToSpeech {
  readonly id: string;
  synthesize(text: string, voiceId: string, signal?: AbortSignal): Promise<SynthesisResult>;
  /** Optional low-latency path. Providers may emit audio before synthesis completes. */
  streamSynthesize?(
    text: string,
    voiceId: string,
    onAudio: (audio: AudioChunk) => void,
    signal?: AbortSignal,
  ): Promise<SynthesisStreamMetrics>;
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
