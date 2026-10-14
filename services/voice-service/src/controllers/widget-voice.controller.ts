import { AppError, ErrorCode } from "@quickstart/errors";
import { requestIdFromResponse, sendPlatformJson, type RequestHandler } from "@quickstart/http-server";
import type { AudioChunk } from "../speech/types.js";
import type { WidgetVoiceService } from "../services/widget-voice.service.js";
import { routeParam } from "../lib/route-param.js";

function parseAudioChunk(body: {
  audio_b64?: string;
  encoding?: string;
  mime_type?: string;
}): AudioChunk {
  const b64 = body.audio_b64?.trim();
  if (!b64) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "audio_b64 is required",
    });
  }
  let bytes: Buffer;
  try {
    bytes = Buffer.from(b64, "base64");
  } catch {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "audio_b64 must be valid base64",
    });
  }
  if (bytes.length === 0) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "audio payload is empty",
    });
  }
  const enc = (body.encoding ?? "webm").trim().toLowerCase();
  const encoding =
    enc === "mp3" || enc === "mpeg"
      ? "mp3"
      : enc === "webm"
        ? "webm"
        : enc === "wav"
          ? "pcm16"
          : "webm";
  const mimeType = body.mime_type?.trim() || undefined;
  const sampleRateHz =
    encoding === "pcm16" || mimeType?.includes("wav") ? 16_000 : 48_000;
  return { bytes, encoding, sampleRateHz, mimeType };
}

export function createWidgetVoiceController(widgetVoice: WidgetVoiceService | null) {
  return {
    executeTurn: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      if (!widgetVoice) {
        throw new AppError({
          code: ErrorCode.UPSTREAM_UNAVAILABLE,
          message:
            "Widget voice is not configured. Set DEEPGRAM_API_KEY and FISH_AUDIO_API_KEY (or OPENAI_API_KEY for TTS fallback) in the voice service environment.",
        });
      }
      const workspaceId = routeParam(req.params.workspaceId);
      const conversationId = routeParam(req.params.conversationId);
      const body = (req.body ?? {}) as {
        audio_b64?: string;
        encoding?: string;
        actor_id?: string;
        subject_key?: string;
      };
      const rawHeaderKey = req.headers["idempotency-key"];
      const headerKey = Array.isArray(rawHeaderKey) ? rawHeaderKey[0] : rawHeaderKey;
      const idempotencyKey = headerKey?.trim() || crypto.randomUUID();
      const actorId =
        body.actor_id?.trim() ||
        (body.subject_key?.trim() ? `widget:${body.subject_key.trim()}` : "widget-visitor");

      const audio = parseAudioChunk(body);
      const result = await widgetVoice.runTurn({
        workspaceId,
        conversationId,
        audio,
        actorId,
        idempotencyKey,
        requestId,
      });

      sendPlatformJson(res, 201, {
        request_id: requestId,
        ...result,
      });
    }) as RequestHandler,
  };
}
