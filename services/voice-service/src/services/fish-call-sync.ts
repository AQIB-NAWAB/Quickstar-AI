import { createHash } from "node:crypto";
import type { Pool } from "pg";
import type { RecordingStore } from "../repository/recording.store.js";

type FishSession = {
  session_id: string;
  status?: string;
  end_reason?: string | null;
  direction?: string;
  caller_number?: string | null;
  dialed_number?: string | null;
  created_at?: string;
  started_at?: string | null;
  ended_at?: string | null;
};
type FishMessage = { type?: string; role?: string; content?: string; created_at?: string };

const API = "https://api.fish.audio/v1/agent/sessions";
const uuidFor = (value: string) => {
  const hex = createHash("sha256").update(value).digest("hex").slice(0, 32).split("");
  hex[12] = "5";
  hex[16] = ((parseInt(hex[16], 16) & 3) | 8).toString(16);
  const h = hex.join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

export function startFishCallSync(input: {
  pool: Pool;
  recordings: RecordingStore;
  apiKey: string;
  fishAgentId: string;
  workspaceId: string;
  quickstartAgentId?: string;
  intervalMs?: number;
  logger: { info: (message: string, data?: Record<string, unknown>) => void; warn: (message: string, data?: Record<string, unknown>) => void };
}) {
  let active = false;
  const headers = { Authorization: `Bearer ${input.apiKey}` };
  const fetchJson = async (url: string) => {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Fish Audio API returned ${response.status}`);
    return response.json() as Promise<Record<string, any>>;
  };
  const sync = async () => {
    if (active) return;
    active = true;
    try {
      const list = await fetchJson(`${API}?agent_id=${encodeURIComponent(input.fishAgentId)}&page_size=100`);
      const sessions = Array.isArray(list.sessions) ? list.sessions as FishSession[] : [];
      let imported = 0;
      for (const summary of sessions) {
        if (!summary.session_id) continue;
        try {
          const detail = await fetchJson(`${API}/${encodeURIComponent(summary.session_id)}`);
          const session = { ...summary, ...detail } as FishSession & { items?: FishMessage[] };
          const callId = uuidFor(`fish-audio:${summary.session_id}`);
          const started = session.started_at ?? session.created_at ?? new Date().toISOString();
          const ended = session.ended_at ?? null;
          const state = session.status === "completed" ? "completed" : session.status === "failed" ? "failed" : "live";
          await input.pool.query(
            `INSERT INTO voice_calls (id, workspace_id, agent_id, direction, state, voice_mode,
              telephony_provider, caller, callee, failure_code, started_at, ended_at, fish_session_id)
             VALUES ($1,$2,$3,$4,$5,'cascade','fish_audio',$6,$7,$8,$9,$10,$11)
             ON CONFLICT (fish_session_id) WHERE fish_session_id IS NOT NULL DO UPDATE SET
              state=EXCLUDED.state, caller=EXCLUDED.caller, callee=EXCLUDED.callee,
              failure_code=EXCLUDED.failure_code, started_at=LEAST(voice_calls.started_at, EXCLUDED.started_at),
              ended_at=COALESCE(EXCLUDED.ended_at, voice_calls.ended_at), updated_at=NOW()`,
            [callId, input.workspaceId, input.quickstartAgentId ?? null,
              session.direction === "outbound" ? "outbound" : "inbound", state,
              session.caller_number ?? null, session.dialed_number ?? null,
              session.end_reason ?? null, started, ended, summary.session_id],
          );

          const messages = (session.items ?? []).filter((item) => item.type === "message" &&
            (item.role === "user" || item.role === "assistant") && typeof item.content === "string" && item.content.trim());
          await input.pool.query("DELETE FROM voice_transcript_segments WHERE call_id=$1", [callId]);
          const startMs = Date.parse(started);
          for (let i = 0; i < messages.length; i++) {
            const message = messages[i]!;
            const time = Date.parse(message.created_at ?? started);
            const offset = Number.isFinite(time - startMs) ? Math.max(0, time - startMs) : 0;
            await input.pool.query(
              `INSERT INTO voice_transcript_segments (call_id, workspace_id, sequence, speaker, text, start_ms, end_ms, finalized)
               VALUES ($1,$2,$3,$4,$5,$6,$6,TRUE)`,
              [callId, input.workspaceId, i + 1, message.role === "user" ? "user" : "agent", message.content!.trim(), offset],
            );
          }

          const recording = await fetchJson(`${API}/${encodeURIComponent(summary.session_id)}/recording`);
          if (recording.status === "complete" && Array.isArray(recording.tracks)) {
            const existing = await input.pool.query<{ recording_object_key: string | null; caller_recording_object_key: string | null }>(
              "SELECT recording_object_key, caller_recording_object_key FROM voice_calls WHERE id=$1", [callId]);
            for (const track of recording.tracks) {
              if ((track.role !== "agent" && track.role !== "user") || track.status !== "complete" || typeof track.url !== "string") continue;
              const field = track.role === "user" ? "caller_recording_object_key" : "recording_object_key";
              const offsetField = track.role === "user" ? "caller_recording_offset_ms" : "recording_offset_ms";
              const trackStarted = Date.parse(track.started_at ?? started);
              const offsetMs = Number.isFinite(trackStarted - startMs) ? Math.max(0, trackStarted - startMs) : 0;
              if (existing.rows[0]?.[field]) {
                await input.pool.query(`UPDATE voice_calls SET ${offsetField}=$2 WHERE id=$1`, [callId, offsetMs]);
                continue;
              }
              const audio = await fetch(track.url, { signal: AbortSignal.timeout(60_000) });
              if (!audio.ok) continue;
              const bytes = Buffer.from(await audio.arrayBuffer());
              const key = await input.recordings.put(input.workspaceId, callId, bytes, "audio/ogg");
              await input.pool.query(`UPDATE voice_calls SET ${field}=$2, ${offsetField}=$3, updated_at=NOW() WHERE id=$1`, [callId, key, offsetMs]);
            }
          }
          imported++;
        } catch (error) {
          input.logger.warn("fish.calls.session_sync_failed", {
            session_id: summary.session_id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      input.logger.info("fish.calls.sync_complete", { sessions: sessions.length, imported });
    } catch (error) {
      input.logger.warn("fish.calls.sync_failed", { error: error instanceof Error ? error.message : String(error) });
    } finally {
      active = false;
    }
  };
  void sync();
  const timer = setInterval(() => void sync(), input.intervalMs ?? 30_000);
  timer.unref();
  return () => clearInterval(timer);
}
