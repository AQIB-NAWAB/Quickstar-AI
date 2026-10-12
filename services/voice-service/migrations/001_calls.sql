CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS voice_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  conversation_id UUID,
  agent_id UUID,
  agent_version_id UUID,
  direction VARCHAR(16) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  state VARCHAR(32) NOT NULL CHECK (state IN ('ringing', 'live', 'completed', 'failed', 'transferred')),
  voice_mode VARCHAR(16) NOT NULL DEFAULT 'cascade',
  telephony_provider VARCHAR(32) NOT NULL DEFAULT 'fake',
  caller TEXT,
  callee TEXT,
  failure_code TEXT,
  time_to_first_audio_ms INTEGER,
  recording_object_key TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_calls_workspace_started
  ON voice_calls (workspace_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_voice_calls_workspace_state
  ON voice_calls (workspace_id, state);

CREATE TABLE IF NOT EXISTS voice_transcript_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES voice_calls(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  sequence INTEGER NOT NULL,
  speaker VARCHAR(16) NOT NULL CHECK (speaker IN ('user', 'agent')),
  text TEXT NOT NULL,
  start_ms INTEGER NOT NULL DEFAULT 0,
  end_ms INTEGER NOT NULL DEFAULT 0,
  finalized BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_transcript_call_seq
  ON voice_transcript_segments (call_id, sequence);

CREATE TABLE IF NOT EXISTS voice_turn_timings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES voice_calls(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  turn_number INTEGER NOT NULL,
  stt_ms INTEGER NOT NULL DEFAULT 0,
  runtime_ms INTEGER NOT NULL DEFAULT 0,
  tts_ms INTEGER NOT NULL DEFAULT 0,
  total_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_turn_timings_call
  ON voice_turn_timings (call_id, turn_number);
