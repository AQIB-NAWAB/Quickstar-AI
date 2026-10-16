ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS fish_session_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_voice_calls_fish_session
  ON voice_calls (fish_session_id) WHERE fish_session_id IS NOT NULL;
