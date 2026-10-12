ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS voice JSONB NOT NULL DEFAULT '{
    "voice_mode": "cascade",
    "language": "en-US",
    "tts_voice_id": "default",
    "max_response_chars": 500,
    "turn_detection_profile_id": "default",
    "recording_enabled": true
  }'::jsonb;
