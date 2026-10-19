import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "../../migrations");

const MIGRATION_FILES = [
  "001_calls.sql",
  "002_campaigns.sql",
  "003_fish_audio_sessions.sql",
  "004_call_recording_caller_track.sql",
  "005_recording_track_offsets.sql",
  "006_call_waveform_peaks.sql",
] as const;

export async function runVoiceMigrations(pool: Pool): Promise<void> {
  for (const file of MIGRATION_FILES) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    await pool.query(sql);
  }
}
