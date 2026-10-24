import { VOICE_CATALOG } from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";
import { requestIdFromResponse, sendPlatformJson, type RequestHandler } from "@quickstart/http-server";
import type { CatalogTextToSpeech } from "../speech/catalog-tts.js";

export function createVoiceCatalogController(catalog: CatalogTextToSpeech | null) {
  return {
    list: ((_req, res) => {
      const voices = catalog
        ? catalog.listVoices()
        : VOICE_CATALOG.map((entry) => ({ ...entry, available: false }));
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        voices,
      });
    }) as RequestHandler,

    preview: (async (req, res) => {
      if (!catalog) {
        throw new AppError({
          code: ErrorCode.UPSTREAM_UNAVAILABLE,
          message:
            "No TTS provider key is set. Add UPLIFT_AI_API_KEY, CARTESIA_API_KEY, FISH_AUDIO_API_KEY, ELEVENLABS_API_KEY, or OPENAI_API_KEY.",
        });
      }
      const body = req.body as { voice_id?: string; text?: string };
      const voiceId = body.voice_id?.trim();
      if (!voiceId) {
        throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "voice_id is required" });
      }
      const entry = VOICE_CATALOG.find((voice) => voice.id === voiceId);
      const text = (body.text?.trim() || entry?.sample_text || "Hello, this is a voice preview.").slice(0, 400);
      const result = await catalog.synthesize(text, voiceId);
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        voice_id: voiceId,
        mime: "audio/mpeg",
        audio_b64: result.audio.bytes.toString("base64"),
        latency_ms: result.latencyMs,
        provider: result.provider,
      });
    }) as RequestHandler,
  };
}
