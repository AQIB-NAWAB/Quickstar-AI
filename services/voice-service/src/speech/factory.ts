import type { Logger } from "@quickstart/logging";
import { createFakeSpeechBundle, type SpeechBundle } from "./fake-tts.js";
import { OpenAiSpeechToText } from "./openai-stt.js";
import { OpenAiTextToSpeech } from "./openai-tts.js";
import { withSpeechPolicy } from "./policy.js";
import type { SpeechUsageEmitter } from "./types.js";

export type SpeechProfile = "fake" | "openai";

export type CreateSpeechBundleInput = {
  profile: SpeechProfile;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
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
  requireRealSpeech: boolean;
}): void {
  if (!input.requireRealSpeech) return;
  if (input.profile === "fake") {
    throw new Error(
      "VOICE_REQUIRE_REAL_SPEECH=1 forbids SPEECH_PROFILE=fake; set SPEECH_PROFILE=openai and a key",
    );
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

  const apiKey = input.openaiApiKey;
  if (!apiKey) {
    throw new Error("SPEECH_PROFILE=openai requires SPEECH_OPENAI_API_KEY or OPENAI_API_KEY");
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
