import { randomUUID } from "node:crypto";
import { AppError, ErrorCode } from "@quickstart/errors";
import {
  requestIdFromResponse,
  sendPlatformJson,
  type RequestHandler,
} from "@quickstart/http-server";
import type { CallsRepository } from "../repository/calls.repository.js";
import type { CallSessionOrchestrator } from "../session/orchestrator.js";
import type { SipBridgeProvider } from "../telephony/sip-provider.js";
import type { StatusIdempotencyStore } from "../telephony/status-idempotency.js";
import type { TelephonyRouter } from "../telephony/router.js";
import { parseWebhookParams } from "../telephony/twilio-cpaas.js";
import { routeParam } from "../lib/route-param.js";
import type { CallDirection } from "@quickstart/contracts";

function rawBodyOf(req: { body?: unknown; rawBody?: string }): string {
  if (typeof req.rawBody === "string") return req.rawBody;
  if (typeof req.body === "string") return req.body;
  if (req.body && typeof req.body === "object") {
    // Prefer form-style reconstruction for Twilio signatures when JSON-parsed.
    const entries = Object.entries(req.body as Record<string, unknown>);
    if (entries.length > 0) {
      return entries
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v ?? ""))}`)
        .join("&");
    }
  }
  return JSON.stringify(req.body ?? {});
}

export function createTelephonyController(
  router: TelephonyRouter,
  opts: {
    sip?: SipBridgeProvider;
    orchestrator: CallSessionOrchestrator;
    calls: CallsRepository;
    statusIdempotency: StatusIdempotencyStore;
    /** Default workspace for CPaaS webhooks that omit workspace_id (staging harness). */
    defaultWebhookWorkspaceId?: string;
  },
) {
  const { sip, orchestrator, calls, statusIdempotency } = opts;

  function findProvider(providerId: string) {
    return router.list().find((p) => p.id === providerId);
  }

  return {
    health: (async (_req, res) => {
      const providers = [];
      for (const p of router.list()) {
        providers.push({ id: p.id, healthy: await p.healthy() });
      }
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        providers,
      });
    }) as RequestHandler,

    /** SBC media-bridge control webhook (SIP path). */
    sipBridgeEvent: (async (req, res) => {
      const rawBody = rawBodyOf(req);
      if (sip && !sip.verifyWebhook(req.headers, rawBody)) {
        sendPlatformJson(res, 401, {
          request_id: requestIdFromResponse(res),
          error: { code: "UNAUTHORIZED", message: "Invalid SIP bridge signature" },
        });
        return;
      }
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        accepted: true,
      });
    }) as RequestHandler,

    /**
     * Public CPaaS inbound webhook (no staff JWT).
     * After signature verify, runs one orchestrator turn (fixture / staging path).
     */
    cpaasInbound: (async (req, res) => {
      const providerId = routeParam(req.params.providerId);
      const provider = findProvider(providerId);
      if (!provider) {
        sendPlatformJson(res, 404, {
          request_id: requestIdFromResponse(res),
          error: { code: "NOT_FOUND", message: "Unknown telephony provider" },
        });
        return;
      }
      const rawBody = rawBodyOf(req);
      if (!provider.verifyWebhook(req.headers, rawBody)) {
        sendPlatformJson(res, 401, {
          request_id: requestIdFromResponse(res),
          error: { code: "UNAUTHORIZED", message: "Invalid webhook signature" },
        });
        return;
      }

      const params = parseWebhookParams(rawBody);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const workspaceId =
        String(params.workspace_id ?? body.workspace_id ?? opts.defaultWebhookWorkspaceId ?? "");
      const conversationId = String(
        params.conversation_id ?? body.conversation_id ?? "",
      );
      if (!workspaceId || !conversationId) {
        sendPlatformJson(res, 400, {
          request_id: requestIdFromResponse(res),
          error: {
            code: "VALIDATION_FAILED",
            message: "workspace_id and conversation_id are required on inbound webhooks",
          },
        });
        return;
      }

      const callSid = String(params.CallSid ?? body.CallSid ?? randomUUID());
      const caller = String(params.From ?? body.From ?? "");
      const callee = String(params.To ?? body.To ?? "");
      const utteranceText = String(
        params.SpeechResult ?? params.utterance_text ?? body.utterance_text ?? "hello from caller",
      );
      const agentId = String(params.agent_id ?? body.agent_id ?? "") || undefined;

      try {
        await provider.attachMedia(callSid, {
          async onAudio() {
            /* Media Streams frames attach here in a later live slice. */
          },
          async onHangup() {
            /* no-op for fixture path */
          },
        });

        const result = await orchestrator.simulateCall({
          workspaceId,
          conversationId,
          agentId,
          direction: "inbound",
          caller: caller || undefined,
          callee: callee || undefined,
          utterance: {
            bytes: Buffer.from(utteranceText, "utf8"),
            encoding: "fake",
            sampleRateHz: 8000,
          },
          telephonyProvider: provider.id,
          callId: params.call_id ? String(params.call_id) : undefined,
          requestId: requestIdFromResponse(res),
        });

        sendPlatformJson(res, 200, {
          request_id: requestIdFromResponse(res),
          accepted: true,
          provider_call_sid: callSid,
          result,
        });
      } catch (err) {
        if (err instanceof AppError) {
          const status =
            err.code === ErrorCode.RATE_LIMITED
              ? 429
              : err.code === ErrorCode.UPSTREAM_UNAVAILABLE
                ? 503
                : 400;
          sendPlatformJson(res, status, {
            request_id: requestIdFromResponse(res),
            error: { code: err.code, message: err.message },
          });
          return;
        }
        throw err;
      }
    }) as RequestHandler,

    /** Public CPaaS status webhook — idempotent by (CallSid, CallStatus/event). */
    cpaasStatus: (async (req, res) => {
      const providerId = routeParam(req.params.providerId);
      const provider = findProvider(providerId);
      if (!provider) {
        sendPlatformJson(res, 404, {
          request_id: requestIdFromResponse(res),
          error: { code: "NOT_FOUND", message: "Unknown telephony provider" },
        });
        return;
      }
      const rawBody = rawBodyOf(req);
      if (!provider.verifyWebhook(req.headers, rawBody)) {
        sendPlatformJson(res, 401, {
          request_id: requestIdFromResponse(res),
          error: { code: "UNAUTHORIZED", message: "Invalid webhook signature" },
        });
        return;
      }

      const params = parseWebhookParams(rawBody);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const callSid = String(params.CallSid ?? body.CallSid ?? "");
      const eventType = String(
        params.CallStatus ?? params.StatusCallbackEvent ?? body.CallStatus ?? body.event ?? "status",
      );
      if (!callSid) {
        sendPlatformJson(res, 400, {
          request_id: requestIdFromResponse(res),
          error: { code: "VALIDATION_FAILED", message: "CallSid is required" },
        });
        return;
      }

      const first = await statusIdempotency.claim(callSid, eventType);
      if (!first) {
        sendPlatformJson(res, 200, {
          request_id: requestIdFromResponse(res),
          accepted: true,
          duplicate: true,
        });
        return;
      }

      const workspaceId = String(
        params.workspace_id ?? body.workspace_id ?? opts.defaultWebhookWorkspaceId ?? "",
      );
      const callId = String(params.call_id ?? body.call_id ?? "");
      if (workspaceId && callId) {
        const terminal =
          eventType === "completed" ||
          eventType === "busy" ||
          eventType === "failed" ||
          eventType === "no-answer" ||
          eventType === "canceled";
        if (terminal) {
          await calls.updateState(workspaceId, callId, {
            state: eventType === "completed" ? "completed" : "failed",
            failureCode: eventType === "completed" ? null : eventType,
            endedAt: new Date(),
          });
        }
      }

      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        accepted: true,
        duplicate: false,
        provider_call_sid: callSid,
        event: eventType,
      });
    }) as RequestHandler,

    /**
     * Internal outbound dial: router → provider.dial → one orchestrator turn.
     */
    dial: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const body = (req.body ?? {}) as {
        conversation_id?: string;
        agent_id?: string;
        to_e164?: string;
        from_e164?: string;
        preferred_provider?: string;
        utterance_text?: string;
        call_id?: string;
        direction?: CallDirection;
      };
      if (!body.conversation_id || !body.to_e164) {
        sendPlatformJson(res, 400, {
          request_id: requestIdFromResponse(res),
          error: {
            code: "VALIDATION_FAILED",
            message: "conversation_id and to_e164 are required",
          },
        });
        return;
      }

      try {
        const route = await router.route(workspaceId, body.preferred_provider);
        const callId = body.call_id ?? randomUUID();
        const dialResult = await route.provider.dial({
          workspaceId,
          toE164: body.to_e164,
          fromE164: body.from_e164,
          callId,
        });

        const utteranceText = body.utterance_text ?? "outbound hello";
        const result = await orchestrator.simulateCall({
          workspaceId,
          conversationId: body.conversation_id,
          agentId: body.agent_id,
          direction: body.direction ?? "outbound",
          caller: body.from_e164,
          callee: body.to_e164,
          utterance: {
            bytes: Buffer.from(utteranceText, "utf8"),
            encoding: "fake",
            sampleRateHz: 8000,
          },
          telephonyProvider: route.provider.id,
          callId,
          requestId: requestIdFromResponse(res),
          authHeaders: {
            authorization:
              typeof req.headers.authorization === "string" ? req.headers.authorization : "",
          },
        });

        sendPlatformJson(res, 201, {
          request_id: requestIdFromResponse(res),
          provider_call_sid: dialResult.providerCallSid,
          provider: route.provider.id,
          failover_from: route.failoverFrom,
          result,
        });
      } catch (err) {
        if (err instanceof AppError) {
          const status =
            err.code === ErrorCode.RATE_LIMITED
              ? 429
              : err.code === ErrorCode.UPSTREAM_UNAVAILABLE
                ? 503
                : 400;
          sendPlatformJson(res, status, {
            request_id: requestIdFromResponse(res),
            error: { code: err.code, message: err.message },
          });
          return;
        }
        throw err;
      }
    }) as RequestHandler,
  };
}
