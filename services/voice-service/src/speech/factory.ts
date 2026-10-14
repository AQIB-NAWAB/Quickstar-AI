import type { Logger } from "@quickstart/logging";
import { DeepgramSpeechToText } from "./deepgram-stt.js";
import { createFakeSpeechBundle, type SpeechBundle } from "./fake-tts.js";
import { FishAudioTextToSpeech } from "./fish-tts.js";
import { OpenAiSpeechToText } from "./openai-stt.js";
import { OpenAiTextToSpeech } from "./openai-tts.js";
import { withSpeechPolicy } from "./policy.js";
import type { SpeechUsageEmitter } from "./types.js";

export type SpeechProfile = "fake" | "openai" | "deepgram-fish";

export type CreateSpeechBundleInput = {
  profile: SpeechProfile;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  deepgramApiKey?: string;
  deepgramModel?: string;
  fishApiKey?: string;
  fishModel?: string;
  fishReferenceId?: string;
  requireRealSpeech: boolean;
  circuitFailureThreshold: number;
  circuitCooldownMs: number;
  httpTimeoutMs: number;
  logger?: Logger;
  emitUsage?: SpeechUsageEmitter;
  fetchImpl?: typeof fetch;
};

export function assertSpeechBootAllowed(input: {
  profile: SpeechProfile;
  openaiApiKey?: string;
  deepgramApiKey?: string;
  fishApiKey?: string;
  requireRealSpeech: boolean;
}): void {
  if (!input.requireRealSpeech) return;
  if (input.profile === "fake") {
    throw new Error(
      "VOICE_REQUIRE_REAL_SPEECH=1 forbids SPEECH_PROFILE=fake; set SPEECH_PROFILE=openai|deepgram-fish and keys",
    );
  }
  if (input.profile === "deepgram-fish") {
    if (!input.deepgramApiKey) {
      throw new Error("SPEECH_PROFILE=deepgram-fish requires DEEPGRAM_API_KEY");
    }
    if (!input.fishApiKey && !input.openaiApiKey) {
      throw new Error(
        "SPEECH_PROFILE=deepgram-fish requires FISH_AUDIO_API_KEY (preferred) or OPENAI_API_KEY for TTS fallback",
      );
    }
    return;
  }
  if (!input.openaiApiKey) {
    throw new Error(
      "VOICE_REQUIRE_REAL_SPEECH=1 requires SPEECH_OPENAI_API_KEY or OPENAI_API_KEY",
    );
  }
}

export function createSpeechBundle(input: CreateSpeechBundleInput): SpeechBundle {
  assertSpeechBootAllowed(input);

  if (input.profile === "fake") {
    return createFakeSpeechBundle();
  }

  const emitUsage: SpeechUsageEmitter =
    input.emitUsage ??
    ((fact) => {
      input.logger?.info("speech.usage", {
        type: fact.type,
        provider: fact.provider,
        unit: fact.unit,
        units: fact.units,
        call_id: fact.call_id,
        workspace_id: fact.workspace_id,
      });
    });

  const policyOpts = {
    failureThreshold: input.circuitFailureThreshold,
    cooldownMs: input.circuitCooldownMs,
    emitUsage,
  };

  if (input.profile === "deepgram-fish") {
    const deepgramKey = input.deepgramApiKey;
    const fishKey = input.fishApiKey;
    if (!deepgramKey) {
      throw new Error("SPEECH_PROFILE=deepgram-fish requires DEEPGRAM_API_KEY");
    }
    const rawStt = new DeepgramSpeechToText({
      apiKey: deepgramKey,
      model: input.deepgramModel,
      timeoutMs: input.httpTimeoutMs,
      fetchImpl: input.fetchImpl,
    });
    const rawTts = fishKey
      ? new FishAudioTextToSpeech({
          apiKey: fishKey,
          model: input.fishModel,
          referenceId: input.fishReferenceId,
          timeoutMs: input.httpTimeoutMs,
          fetchImpl: input.fetchImpl,
        })
      : new OpenAiTextToSpeech({
          apiKey: input.openaiApiKey!,
          baseUrl: input.openaiBaseUrl,
          timeoutMs: input.httpTimeoutMs,
          fetchImpl: input.fetchImpl,
        });
    if (!fishKey) {
      input.logger?.warn("speech.tts_fallback", {
        profile: "deepgram-fish",
        tts: "openai",
        hint: "Set FISH_AUDIO_API_KEY for Fish Audio TTS",
      });
    }
    const { stt, tts } = withSpeechPolicy(rawStt, rawTts, policyOpts);
    const fake = createFakeSpeechBundle();
    return { stt, tts, s2s: fake.s2s };
  }

  const apiKey = input.openaiApiKey;
  if (!apiKey) {
    throw new Error("SPEECH_PROFILE=openai requires SPEECH_OPENAI_API_KEY or OPENAI_API_KEY");
  }

  const rawStt = new OpenAiSpeechToText({
    apiKey,
    baseUrl: input.openaiBaseUrl,
    timeoutMs: input.httpTimeoutMs,
    fetchImpl: input.fetchImpl,
  });
  const rawTts = new OpenAiTextToSpeech({
    apiKey,
    baseUrl: input.openaiBaseUrl,
    timeoutMs: input.httpTimeoutMs,
    fetchImpl: input.fetchImpl,
  });
  const { stt, tts } = withSpeechPolicy(rawStt, rawTts, {
    failureThreshold: input.circuitFailureThreshold,
    cooldownMs: input.circuitCooldownMs,
    emitUsage,
  });

  const fake = createFakeSpeechBundle();
  return { stt, tts, s2s: fake.s2s };
}
