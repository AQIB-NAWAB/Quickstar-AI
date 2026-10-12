import { requestIdFromResponse, sendPlatformJson, type RequestHandler } from "@quickstart/http-server";
import type { CallsRepository } from "../repository/calls.repository.js";
import type { RecordingStore } from "../repository/recording.store.js";
import type { CallSessionOrchestrator } from "../session/orchestrator.js";
import { routeParam } from "../lib/route-param.js";
import type { CallDirection, VoiceMode } from "@quickstart/contracts";

export function createCallsController(
  calls: CallsRepository,
  orchestrator: CallSessionOrchestrator,
  recordings: RecordingStore,
) {
  return {
    listInbound: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const result = await calls.list(workspaceId, {
        direction: "inbound",
        state: typeof req.query.status === "string" ? req.query.status : undefined,
        limit: Number(req.query.limit ?? 50),
        cursor: typeof req.query.cursor === "string" ? req.query.cursor : undefined,
      });
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        calls: result.rows.map(toStaffCall),
        next_cursor: result.nextCursor,
      });
    }) as RequestHandler,

    listLiveInbound: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const rows = await calls.listLive(workspaceId, "inbound");
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        calls: rows.map(toStaffCall),
      });
    }) as RequestHandler,

    getInbound: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const callId = routeParam(req.params.callId);
      const row = await calls.get(workspaceId, callId);
      if (!row || row.direction !== "inbound") {
        sendPlatformJson(res, 404, {
          request_id: requestIdFromResponse(res),
          error: { code: "NOT_FOUND", message: "Call not found" },
        });
        return;
      }
      const transcript = await calls.listTranscript(workspaceId, callId);
      const timings = await calls.listTimings(workspaceId, callId);
      const recordingUrl = row.recording_object_key
        ? await recordings.getPlaybackUrl(row.recording_object_key)
        : null;
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        call: {
          ...toStaffCall(row),
          recording_available: Boolean(row.recording_object_key),
          recording_url: recordingUrl,
          transcript,
          processing_turns: timings.map((t) => ({
            id: t.id,
            turn_number: t.turn_number,
            stt_ms: t.stt_ms,
            llm_ms: t.runtime_ms,
            tts_ms: t.tts_ms,
            total_ms: t.total_ms,
            is_additive: true,
          })),
          disposition: row.state,
        },
      });
    }) as RequestHandler,

    listOutbound: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const result = await calls.list(workspaceId, {
        direction: "outbound",
        limit: Number(req.query.limit ?? 50),
        cursor: typeof req.query.cursor === "string" ? req.query.cursor : undefined,
      });
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        calls: result.rows.map(toStaffCall),
        next_cursor: result.nextCursor,
      });
    }) as RequestHandler,

    simulate: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const body = (req.body ?? {}) as {
        conversation_id?: string;
        agent_id?: string;
        utterance_audio_b64?: string;
        utterance_text?: string;
        direction?: CallDirection;
        caller?: string;
        voice_mode?: VoiceMode;
        telephony_provider?: string;
        call_id?: string;
        tools_count?: number;
        knowledge_enabled?: boolean;
      };
      if (!body.conversation_id) {
        sendPlatformJson(res, 400, {
          request_id: requestIdFromResponse(res),
          error: { code: "VALIDATION_FAILED", message: "conversation_id is required" },
        });
        return;
      }
      const text = body.utterance_text ?? "hello from caller";
      const bytes = body.utterance_audio_b64
        ? Buffer.from(body.utterance_audio_b64, "base64")
        : Buffer.from(text, "utf8");

      const result = await orchestrator.simulateCall({
        workspaceId,
        conversationId: body.conversation_id,
        agentId: body.agent_id,
        direction: body.direction ?? "inbound",
        caller: body.caller,
        utterance: { bytes, encoding: "fake", sampleRateHz: 8000 },
        voiceMode: body.voice_mode,
        telephonyProvider: body.telephony_provider,
        callId: body.call_id,
        toolsCount: body.tools_count,
        knowledgeEnabled: body.knowledge_enabled,
        authHeaders: {
          authorization: typeof req.headers.authorization === "string" ? req.headers.authorization : "",
        },
        requestId: requestIdFromResponse(res),
      });

      sendPlatformJson(res, 201, {
        request_id: requestIdFromResponse(res),
        result,
      });
    }) as RequestHandler,
  };
}

function toStaffCall(row: {
  id: string;
  workspace_id: string;
  conversation_id: string | null;
  agent_id: string | null;
  direction: string;
  state: string;
  caller: string | null;
  callee: string | null;
  time_to_first_audio_ms: number | null;
  started_at: Date;
  ended_at: Date | null;
}) {
  const ended = row.ended_at?.getTime() ?? Date.now();
  const durationSeconds = Math.max(0, Math.floor((ended - row.started_at.getTime()) / 1000));
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    conversation_id: row.conversation_id,
    agent_id: row.agent_id,
    direction: row.direction,
    status: row.state === "ringing" || row.state === "live" ? (row.state === "live" ? "live" : "live") : row.state,
    caller: row.caller ?? row.callee ?? "unknown",
    started_at: row.started_at.toISOString(),
    ended_at: row.ended_at?.toISOString() ?? null,
    duration_seconds: durationSeconds,
    time_to_first_audio_ms: row.time_to_first_audio_ms,
  };
}
