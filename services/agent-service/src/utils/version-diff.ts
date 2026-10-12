import type { AgentSnapshot, AgentVersionDiff, VersionFieldDiff } from "../domain/types.js";

const DIFF_FIELDS = [
  "name",
  "description",
  "instructions",
  "environment",
  "model_settings",
  "channels",
  "voice",
  "tools",
] as const;

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

export function diffSnapshots(
  leftId: string,
  rightId: string,
  left: AgentSnapshot,
  right: AgentSnapshot,
): AgentVersionDiff {
  const fields: Record<string, VersionFieldDiff> = {};

  for (const key of DIFF_FIELDS) {
    const before = left[key];
    const after = right[key];
    if (stableJson(before) !== stableJson(after)) {
      fields[key] = { before, after };
    }
  }

  return { leftId, rightId, fields };
}
