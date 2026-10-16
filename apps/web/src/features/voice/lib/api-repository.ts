import type {
  CallLogFilters,
  InboundCall,
  InboundCallDetail,
  RepositoryResult,
  VoiceRepository,
} from "./types";

function mapStatus(status: string): InboundCall["status"] {
  if (status === "live" || status === "ringing") return "live";
  if (status === "failed") return "failed";
  if (status === "transferred") return "transferred";
  return "completed";
}

function mapCall(raw: Record<string, unknown>): InboundCall {
  return {
    id: String(raw.id),
    workspaceId: String(raw.workspace_id ?? ""),
    caller: String(raw.caller ?? "unknown"),
    agentId: String(raw.agent_id ?? ""),
    agentName: String(raw.agent_id ?? "Agent"),
    startedAt: String(raw.started_at ?? new Date().toISOString()),
    endedAt: raw.ended_at ? String(raw.ended_at) : null,
    durationSeconds: Number(raw.duration_seconds ?? 0),
    status: mapStatus(String(raw.status ?? "completed")),
    timeToFirstAudioMs:
      raw.time_to_first_audio_ms == null ? null : Number(raw.time_to_first_audio_ms),
    conversationId: raw.conversation_id ? String(raw.conversation_id) : null,
  };
}

async function fetchJson(
  path: string,
  signal?: AbortSignal,
): Promise<RepositoryResult<Record<string, unknown>>> {
  try {
    const res = await fetch(path, { signal, credentials: "include" });
    if (res.status === 401 || res.status === 403) {
      return { status: "forbidden", message: "Not allowed to view voice calls." };
    }
    if (res.status === 404) {
      return { status: "not_found", message: "Call not found." };
    }
    if (!res.ok) {
      return { status: "unavailable", message: "Voice service is not available." };
    }
    return { status: "ready", data: (await res.json()) as Record<string, unknown> };
  } catch {
    return { status: "unavailable", message: "Voice service is not available." };
  }
}

export class ApiVoiceRepository implements VoiceRepository {
  async listInboundCalls(
    workspaceId: string,
    filters?: CallLogFilters,
    signal?: AbortSignal,
  ): Promise<RepositoryResult<{ calls: InboundCall[]; nextCursor?: string; prevCursor?: string }>> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.cursor) params.set("cursor", filters.cursor);
    if (filters?.q) params.set("q", filters.q);
    const qs = params.toString();
    const result = await fetchJson(
      `/api/workspaces/${encodeURIComponent(workspaceId)}/voice/inbound${qs ? `?${qs}` : ""}`,
      signal,
    );
    if (result.status !== "ready") return result;
    const calls = Array.isArray(result.data.calls)
      ? (result.data.calls as Record<string, unknown>[]).map(mapCall)
      : [];
    return {
      status: "ready",
      data: {
        calls,
        nextCursor: result.data.next_cursor ? String(result.data.next_cursor) : undefined,
      },
    };
  }

  async listLiveInboundCalls(
    workspaceId: string,
    signal?: AbortSignal,
  ): Promise<RepositoryResult<InboundCall[]>> {
    const result = await fetchJson(
      `/api/workspaces/${encodeURIComponent(workspaceId)}/voice/inbound/live`,
      signal,
    );
    if (result.status !== "ready") return result;
    const calls = Array.isArray(result.data.calls)
      ? (result.data.calls as Record<string, unknown>[]).map(mapCall)
      : [];
    return { status: "ready", data: calls };
  }

  async getInboundCall(
    workspaceId: string,
    callId: string,
    signal?: AbortSignal,
  ): Promise<RepositoryResult<InboundCallDetail>> {
    const result = await fetchJson(
      `/api/workspaces/${encodeURIComponent(workspaceId)}/voice/inbound/${encodeURIComponent(callId)}`,
      signal,
    );
    if (result.status !== "ready") return result;
    const callRaw = (result.data.call ?? result.data) as Record<string, unknown>;
    const base = mapCall(callRaw);
    const transcript = Array.isArray(callRaw.transcript)
      ? (callRaw.transcript as Record<string, unknown>[]).map((t, i) => ({
          id: String(t.id ?? i),
          sequence: Number(t.sequence ?? i),
          speaker: (t.speaker === "agent" ? "agent" : "user") as "user" | "agent",
          text: String(t.text ?? ""),
          startMs: Number(t.start_ms ?? 0),
          endMs: Number(t.end_ms ?? 0),
        }))
      : [];
    const processingTurns = Array.isArray(callRaw.processing_turns)
      ? (callRaw.processing_turns as Record<string, unknown>[]).map((t, i) => ({
          id: String(t.id ?? i),
          turnNumber: Number(t.turn_number ?? i + 1),
          sttMs: Number(t.stt_ms ?? 0),
          llmMs: Number(t.llm_ms ?? 0),
          ttsMs: Number(t.tts_ms ?? 0),
          totalMs: Number(t.total_ms ?? 0),
          isAdditive: Boolean(t.is_additive ?? true),
        }))
      : [];

    return {
      status: "ready",
      data: {
        ...base,
        recordingAvailable: Boolean(callRaw.recording_available),
        recordingUrl: callRaw.recording_available
          ? `/api/workspaces/${encodeURIComponent(workspaceId)}/voice/inbound/${encodeURIComponent(callId)}/recording`
          : null,
        callerRecordingAvailable: Boolean(callRaw.caller_recording_available),
        callerRecordingUrl: callRaw.caller_recording_available
          ? `/api/workspaces/${encodeURIComponent(workspaceId)}/voice/inbound/${encodeURIComponent(callId)}/recording?track=caller`
          : null,
        recordingOffsetMs: Number(callRaw.recording_offset_ms ?? 0),
        callerRecordingOffsetMs: Number(callRaw.caller_recording_offset_ms ?? 0),
        transcript,
        processingTurns,
        disposition: String(callRaw.disposition ?? base.status),
      },
    };
  }
}
