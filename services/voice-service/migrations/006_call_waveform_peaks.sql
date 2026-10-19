-- Migration 006: Call waveform peaks, stereo metadata, and disconnect reasons
ALTER TABLE voice_calls
  ADD COLUMN IF NOT EXISTS waveform_peaks JSONB,
  ADD COLUMN IF NOT EXISTS channel_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS stereo_available BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS disconnect_reason VARCHAR(128);

CREATE INDEX IF NOT EXISTS idx_voice_calls_workspace_direction_started
  ON voice_calls (workspace_id, direction, started_at DESC);
