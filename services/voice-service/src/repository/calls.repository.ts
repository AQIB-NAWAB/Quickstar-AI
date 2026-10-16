import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type {
  CallDirection,
  CallStageTimings,
  CallState,
  CallTranscriptSegment,
  TelephonyProviderId,
  VoiceMode,
} from "@quickstart/contracts";

export type VoiceCallRow = {
  id: string;
  workspace_id: string;
  conversation_id: string | null;
  agent_id: string | null;
  agent_version_id: string | null;
  direction: CallDirection;
  state: CallState;
  voice_mode: VoiceMode;
  telephony_provider: string;
  caller: string | null;
  callee: string | null;
  failure_code: string | null;
  time_to_first_audio_ms: number | null;
  recording_object_key: string | null;
  caller_recording_object_key?: string | null;
  recording_offset_ms?: number;
  caller_recording_offset_ms?: number;
  started_at: Date;
  ended_at: Date | null;
};

export type CreateCallInput = {
  workspaceId: string;
  conversationId?: string | null;
  agentId?: string | null;
  agentVersionId?: string | null;
  direction: CallDirection;
  voiceMode: VoiceMode;
  telephonyProvider: TelephonyProviderId | string;
  caller?: string | null;
  callee?: string | null;
  id?: string;
};

export interface CallsRepository {
  create(input: CreateCallInput): Promise<VoiceCallRow>;
  updateState(
    workspaceId: string,
    callId: string,
    patch: Partial<{
      state: CallState;
      conversationId: string | null;
      agentId: string | null;
      agentVersionId: string | null;
      failureCode: string | null;
      timeToFirstAudioMs: number | null;
      recordingObjectKey: string | null;
      endedAt: Date | null;
    }>,
  ): Promise<VoiceCallRow | null>;
  get(workspaceId: string, callId: string): Promise<VoiceCallRow | null>;
  list(
    workspaceId: string,
    opts: { state?: string; direction?: CallDirection; limit: number; cursor?: string },
  ): Promise<{ rows: VoiceCallRow[]; nextCursor?: string }>;
  listLive(workspaceId: string, direction?: CallDirection): Promise<VoiceCallRow[]>;
  addTranscript(
    workspaceId: string,
    callId: string,
    segment: Omit<CallTranscriptSegment, "id"> & { id?: string },
  ): Promise<CallTranscriptSegment>;
  listTranscript(workspaceId: string, callId: string): Promise<CallTranscriptSegment[]>;
  addTiming(
    workspaceId: string,
    callId: string,
    turnNumber: number,
    timing: CallStageTimings,
  ): Promise<void>;
  listTimings(
    workspaceId: string,
    callId: string,
  ): Promise<Array<CallStageTimings & { turn_number: number; id: string }>>;
}

export class PgCallsRepository implements CallsRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: CreateCallInput): Promise<VoiceCallRow> {
    const id = input.id ?? randomUUID();
    const { rows } = await this.pool.query<VoiceCallRow>(
      `INSERT INTO voice_calls (
        id, workspace_id, conversation_id, agent_id, agent_version_id,
        direction, state, voice_mode, telephony_provider, caller, callee
      ) VALUES ($1,$2,$3,$4,$5,$6,'ringing',$7,$8,$9,$10)
      RETURNING *`,
      [
        id,
        input.workspaceId,
        input.conversationId ?? null,
        input.agentId ?? null,
        input.agentVersionId ?? null,
        input.direction,
        input.voiceMode,
        input.telephonyProvider,
        input.caller ?? null,
        input.callee ?? null,
      ],
    );
    return rows[0];
  }

  async updateState(
    workspaceId: string,
    callId: string,
    patch: Partial<{
      state: CallState;
      conversationId: string | null;
      agentId: string | null;
      agentVersionId: string | null;
      failureCode: string | null;
      timeToFirstAudioMs: number | null;
      recordingObjectKey: string | null;
      endedAt: Date | null;
    }>,
  ): Promise<VoiceCallRow | null> {
    const { rows } = await this.pool.query<VoiceCallRow>(
      `UPDATE voice_calls SET
        state = COALESCE($3, state),
        conversation_id = COALESCE($4, conversation_id),
        agent_id = COALESCE($5, agent_id),
        agent_version_id = COALESCE($6, agent_version_id),
        failure_code = COALESCE($7, failure_code),
        time_to_first_audio_ms = COALESCE($8, time_to_first_audio_ms),
        recording_object_key = COALESCE($9, recording_object_key),
        ended_at = COALESCE($10, ended_at),
        updated_at = NOW()
      WHERE workspace_id = $1 AND id = $2
      RETURNING *`,
      [
        workspaceId,
        callId,
        patch.state ?? null,
        patch.conversationId === undefined ? null : patch.conversationId,
        patch.agentId === undefined ? null : patch.agentId,
        patch.agentVersionId === undefined ? null : patch.agentVersionId,
        patch.failureCode === undefined ? null : patch.failureCode,
        patch.timeToFirstAudioMs === undefined ? null : patch.timeToFirstAudioMs,
        patch.recordingObjectKey === undefined ? null : patch.recordingObjectKey,
        patch.endedAt === undefined ? null : patch.endedAt,
      ],
    );
    return rows[0] ?? null;
  }

  async get(workspaceId: string, callId: string): Promise<VoiceCallRow | null> {
    const { rows } = await this.pool.query<VoiceCallRow>(
      `SELECT * FROM voice_calls WHERE workspace_id = $1 AND id = $2`,
      [workspaceId, callId],
    );
    return rows[0] ?? null;
  }

  async list(
    workspaceId: string,
    opts: { state?: string; direction?: CallDirection; limit: number; cursor?: string },
  ): Promise<{ rows: VoiceCallRow[]; nextCursor?: string }> {
    const limit = Math.min(Math.max(opts.limit, 1), 100);
    const params: unknown[] = [workspaceId, opts.direction ?? null, opts.state ?? null, limit + 1];
    let cursorClause = "";
    if (opts.cursor) {
      params.push(opts.cursor);
      cursorClause = `AND started_at < $${params.length}::timestamptz`;
    }
    const { rows } = await this.pool.query<VoiceCallRow>(
      `SELECT * FROM voice_calls
       WHERE workspace_id = $1
         AND ($2::text IS NULL OR direction = $2)
         AND ($3::text IS NULL OR state = $3)
         ${cursorClause}
       ORDER BY started_at DESC
       LIMIT $4`,
      params,
    );
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    return {
      rows: page,
      nextCursor: hasMore ? page[page.length - 1]?.started_at.toISOString() : undefined,
    };
  }

  async listLive(workspaceId: string, direction?: CallDirection): Promise<VoiceCallRow[]> {
    const { rows } = await this.pool.query<VoiceCallRow>(
      `SELECT * FROM voice_calls
       WHERE workspace_id = $1
         AND state IN ('ringing', 'live')
         AND ($2::text IS NULL OR direction = $2)
       ORDER BY started_at DESC`,
      [workspaceId, direction ?? null],
    );
    return rows;
  }

  async addTranscript(
    workspaceId: string,
    callId: string,
    segment: Omit<CallTranscriptSegment, "id"> & { id?: string },
  ): Promise<CallTranscriptSegment> {
    const id = segment.id ?? randomUUID();
    await this.pool.query(
      `INSERT INTO voice_transcript_segments (
        id, call_id, workspace_id, sequence, speaker, text, start_ms, end_ms, finalized
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        id,
        callId,
        workspaceId,
        segment.sequence,
        segment.speaker,
        segment.text,
        segment.start_ms,
        segment.end_ms,
        segment.finalized,
      ],
    );
    return { ...segment, id };
  }

  async listTranscript(workspaceId: string, callId: string): Promise<CallTranscriptSegment[]> {
    const { rows } = await this.pool.query<{
      id: string;
      sequence: number;
      speaker: "user" | "agent";
      text: string;
      start_ms: number;
      end_ms: number;
      finalized: boolean;
    }>(
      `SELECT id, sequence, speaker, text, start_ms, end_ms, finalized
       FROM voice_transcript_segments
       WHERE workspace_id = $1 AND call_id = $2
       ORDER BY sequence ASC`,
      [workspaceId, callId],
    );
    return rows;
  }

  async addTiming(
    workspaceId: string,
    callId: string,
    turnNumber: number,
    timing: CallStageTimings,
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO voice_turn_timings (
        call_id, workspace_id, turn_number, stt_ms, runtime_ms, tts_ms, total_ms
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        callId,
        workspaceId,
        turnNumber,
        timing.stt_ms,
        timing.runtime_ms,
        timing.tts_ms,
        timing.total_ms,
      ],
    );
  }

  async listTimings(
    workspaceId: string,
    callId: string,
  ): Promise<Array<CallStageTimings & { turn_number: number; id: string }>> {
    const { rows } = await this.pool.query<{
      id: string;
      turn_number: number;
      stt_ms: number;
      runtime_ms: number;
      tts_ms: number;
      total_ms: number;
    }>(
      `SELECT id, turn_number, stt_ms, runtime_ms, tts_ms, total_ms
       FROM voice_turn_timings
       WHERE workspace_id = $1 AND call_id = $2
       ORDER BY turn_number ASC`,
      [workspaceId, callId],
    );
    return rows;
  }
}

/** In-memory repo for unit tests without Postgres. */
export class MemoryCallsRepository implements CallsRepository {
  private calls = new Map<string, VoiceCallRow>();
  private transcripts = new Map<string, CallTranscriptSegment[]>();
  private timings = new Map<string, Array<CallStageTimings & { turn_number: number; id: string }>>();

  async create(input: CreateCallInput): Promise<VoiceCallRow> {
    const row: VoiceCallRow = {
      id: input.id ?? randomUUID(),
      workspace_id: input.workspaceId,
      conversation_id: input.conversationId ?? null,
      agent_id: input.agentId ?? null,
      agent_version_id: input.agentVersionId ?? null,
      direction: input.direction,
      state: "ringing",
      voice_mode: input.voiceMode,
      telephony_provider: input.telephonyProvider,
      caller: input.caller ?? null,
      callee: input.callee ?? null,
      failure_code: null,
      time_to_first_audio_ms: null,
      recording_object_key: null,
      started_at: new Date(),
      ended_at: null,
    };
    this.calls.set(row.id, row);
    return { ...row };
  }

  async updateState(
    workspaceId: string,
    callId: string,
    patch: Partial<{
      state: CallState;
      conversationId: string | null;
      agentId: string | null;
      agentVersionId: string | null;
      failureCode: string | null;
      timeToFirstAudioMs: number | null;
      recordingObjectKey: string | null;
      endedAt: Date | null;
    }>,
  ): Promise<VoiceCallRow | null> {
    const row = this.calls.get(callId);
    if (!row || row.workspace_id !== workspaceId) return null;
    if (patch.state !== undefined) row.state = patch.state;
    if (patch.conversationId !== undefined) row.conversation_id = patch.conversationId;
    if (patch.agentId !== undefined) row.agent_id = patch.agentId;
    if (patch.agentVersionId !== undefined) row.agent_version_id = patch.agentVersionId;
    if (patch.failureCode !== undefined) row.failure_code = patch.failureCode;
    if (patch.timeToFirstAudioMs !== undefined) row.time_to_first_audio_ms = patch.timeToFirstAudioMs;
    if (patch.recordingObjectKey !== undefined) row.recording_object_key = patch.recordingObjectKey;
    if (patch.endedAt !== undefined) row.ended_at = patch.endedAt;
    return { ...row };
  }

  async get(workspaceId: string, callId: string): Promise<VoiceCallRow | null> {
    const row = this.calls.get(callId);
    if (!row || row.workspace_id !== workspaceId) return null;
    return { ...row };
  }

  async list(
    workspaceId: string,
    opts: { state?: string; direction?: CallDirection; limit: number; cursor?: string },
  ): Promise<{ rows: VoiceCallRow[]; nextCursor?: string }> {
    let rows = [...this.calls.values()].filter((c) => c.workspace_id === workspaceId);
    if (opts.direction) rows = rows.filter((c) => c.direction === opts.direction);
    if (opts.state) rows = rows.filter((c) => c.state === opts.state);
    rows.sort((a, b) => b.started_at.getTime() - a.started_at.getTime());
    return { rows: rows.slice(0, opts.limit) };
  }

  async listLive(workspaceId: string, direction?: CallDirection): Promise<VoiceCallRow[]> {
    return [...this.calls.values()].filter(
      (c) =>
        c.workspace_id === workspaceId &&
        (c.state === "ringing" || c.state === "live") &&
        (!direction || c.direction === direction),
    );
  }

  async addTranscript(
    workspaceId: string,
    callId: string,
    segment: Omit<CallTranscriptSegment, "id"> & { id?: string },
  ): Promise<CallTranscriptSegment> {
    void workspaceId;
    const id = segment.id ?? randomUUID();
    const full = { ...segment, id };
    const list = this.transcripts.get(callId) ?? [];
    list.push(full);
    this.transcripts.set(callId, list);
    return full;
  }

  async listTranscript(workspaceId: string, callId: string): Promise<CallTranscriptSegment[]> {
    void workspaceId;
    return [...(this.transcripts.get(callId) ?? [])];
  }

  async addTiming(
    workspaceId: string,
    callId: string,
    turnNumber: number,
    timing: CallStageTimings,
  ): Promise<void> {
    void workspaceId;
    const list = this.timings.get(callId) ?? [];
    list.push({ ...timing, turn_number: turnNumber, id: randomUUID() });
    this.timings.set(callId, list);
  }

  async listTimings(
    workspaceId: string,
    callId: string,
  ): Promise<Array<CallStageTimings & { turn_number: number; id: string }>> {
    void workspaceId;
    return [...(this.timings.get(callId) ?? [])];
  }
}
