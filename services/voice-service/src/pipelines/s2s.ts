import { s2sProfileAllowed, type AgentVoiceSettings, type CallStageTimings } from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { AudioChunk, SpeechToSpeechFactory, SpeechToText } from "../speech/types.js";

export type S2STurnInput = {
  audio: AudioChunk;
  voice: AgentVoiceSettings;
  toolsCount: number;
  knowledgeEnabled: boolean;
  systemPrompt: string;
};

export type S2STurnResult = {
  userText: string;
  assistantAudio: AudioChunk;
  timings: CallStageTimings;
};

/**
 * Opt-in speech-to-speech path. Sidecar STT produces compliance transcript.
 * Tools/RAG are forbidden on this profile.
 */
export class S2SPipeline {
  constructor(
    private readonly s2sFactory: SpeechToSpeechFactory,
    private readonly sidecarStt: SpeechToText,
  ) {}

  async runUtterance(input: S2STurnInput): Promise<S2STurnResult> {
    const allowed = s2sProfileAllowed({
      voice_mode: input.voice.voice_mode,
      toolsCount: input.toolsCount,
      knowledgeEnabled: input.knowledgeEnabled,
    });
    if (!allowed.ok) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: allowed.reason });
    }
    if (input.voice.voice_mode !== "s2s") {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "S2S pipeline requires voice_mode=s2s",
      });
    }

    const started = Date.now();
    const session = await this.s2sFactory.open({
      language: input.voice.language,
      systemPrompt: input.systemPrompt,
    });
    try {
      const sttPromise = this.sidecarStt.transcribe(input.audio);
      await session.pushAudio(input.audio);
      const audio = await session.pullAudio();
      const sidecar = await sttPromise;
      const providerTranscript = await session.pullTranscript();
      const userText = providerTranscript ?? sidecar.text;
      const ttsMs = Math.max(1, Date.now() - started - sidecar.latencyMs);

      return {
        userText,
        assistantAudio: audio ?? {
          bytes: Buffer.from("s2s-empty", "utf8"),
          encoding: "fake",
          sampleRateHz: 8000,
        },
        timings: {
          stt_ms: sidecar.latencyMs,
          runtime_ms: 0,
          tts_ms: ttsMs,
          total_ms: Math.max(1, Date.now() - started),
        },
      };
    } finally {
      await session.close();
    }
  }
}
