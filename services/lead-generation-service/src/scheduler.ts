import * as crypto from "node:crypto";
import type { Identity, Store } from "./store.js";

/**
 * Calculates the next run timestamp based on cron expression or recurring interval.
 */
export function computeNextRunAt(expression: string, fromDate = new Date()): Date {
  const norm = expression.trim().toLowerCase();
  const next = new Date(fromDate.getTime());

  if (norm === "@hourly" || norm === "hourly") {
    next.setUTCHours(next.getUTCHours() + 1);
    next.setUTCMinutes(0, 0, 0);
    return next;
  }

  if (norm === "@daily" || norm === "daily") {
    next.setUTCDate(next.getUTCDate() + 1);
    next.setUTCHours(9, 0, 0, 0);
    return next;
  }

  if (norm === "@weekly" || norm === "weekly") {
    next.setUTCDate(next.getUTCDate() + 7);
    next.setUTCHours(9, 0, 0, 0);
    return next;
  }

  // Parse 5-part cron expression: minute hour day-of-month month day-of-week
  const parts = norm.split(/\s+/);
  if (parts.length === 5) {
    const [minPart, hourPart, domPart, monPart, dowPart] = parts;

    // Check next 7 days minute-by-minute with smart stepping
    const candidate = new Date(fromDate.getTime() + 60000); // at least 1 minute into the future
    candidate.setUTCSeconds(0, 0);

    const matchPart = (val: number, part: string): boolean => {
      if (part === "*") return true;
      if (part.includes(",")) return part.split(",").some((p) => matchPart(val, p));
      if (part.startsWith("*/")) {
        const step = parseInt(part.slice(2), 10);
        return !isNaN(step) && step > 0 && val % step === 0;
      }
      if (part.includes("-")) {
        const [start, end] = part.split("-").map((s) => parseInt(s, 10));
        return !isNaN(start) && !isNaN(end) && val >= start && val <= end;
      }
      return parseInt(part, 10) === val;
    };

    // Iterate up to 10,080 steps (7 days) to find the next matching slot
    for (let i = 0; i < 10080; i++) {
      const min = candidate.getUTCMinutes();
      const hour = candidate.getUTCHours();
      const dom = candidate.getUTCDate();
      const mon = candidate.getUTCMonth() + 1;
      const dow = candidate.getUTCDay();

      if (
        matchPart(min, minPart) &&
        matchPart(hour, hourPart) &&
        matchPart(dom, domPart) &&
        matchPart(mon, monPart) &&
        matchPart(dow, dowPart)
      ) {
        return candidate;
      }
      candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);
    }
  }

  // Default fallback: 24 hours from current
  return new Date(fromDate.getTime() + 86400000);
}

/**
 * Claims and executes all schedules currently due for dispatch across the database.
 * Uses Postgres FOR UPDATE SKIP LOCKED to ensure atomic, non-conflicting distribution
 * across concurrent worker replicas.
 */
export async function runDueSchedules(
  store: Store,
  defaultActor = "system-scheduler",
): Promise<{
  claimed: number;
  dispatched: number;
  skipped: number;
  errors: Array<{ schedule_id: string; error: string }>;
}> {
  const claimedSchedules = await store.claimDueSchedules(20);
  let dispatched = 0;
  let skipped = 0;
  const errors: Array<{ schedule_id: string; error: string }> = [];

  for (const schedule of claimedSchedules) {
    try {
      const nowIsoMinute = new Date().toISOString().slice(0, 16);
      const occurrenceKey = `${schedule.id}:${nowIsoMinute}`;

      // Prevent redundant run execution if already dispatched in this minute window
      if (schedule.last_occurrence_key === occurrenceKey) {
        skipped++;
        continue;
      }

      const identity: Identity = {
        orgId: schedule.org_id,
        workspaceId: schedule.workspace_id,
        actorId: defaultActor,
        requestId: crypto.randomUUID(),
      };

      const idempotencyKey = `schedule-run:${occurrenceKey}`;
      const brief = typeof schedule.brief === "string" ? JSON.parse(schedule.brief) : schedule.brief;
      const created = await store.createRun(identity, brief, idempotencyKey);

      // Compute next run time and record occurrence
      const nextRunAt = computeNextRunAt(schedule.cron_expression || "@daily", new Date());
      await store.recordScheduleOccurrence(schedule.id, occurrenceKey, nextRunAt, created.run.id);

      dispatched++;
    } catch (err: any) {
      errors.push({
        schedule_id: schedule.id,
        error: err?.message || String(err),
      });
    }
  }

  return {
    claimed: claimedSchedules.length,
    dispatched,
    skipped,
    errors,
  };
}
