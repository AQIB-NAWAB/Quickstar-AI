import type { CampaignSchedule } from "../domain/types.js";

export type ScheduleWindowEvaluation = {
  inWindow: boolean;
  held: boolean;
  heldReason?: string;
  evaluatedTimezone: string;
  currentLocalTime?: string;
  currentLocalDay?: string;
  nextWindowOpenAt?: Date;
  reason?: string;
};

/**
 * Validates if an IANA timezone identifier is supported by Intl.
 */
export function isValidIanaTimezone(tz: string): boolean {
  if (!tz || typeof tz !== "string") return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Evaluates whether an outbound call is allowed right now based on campaign schedule,
 * active weekdays, daily window, and recipient vs campaign timezone policies.
 */
export function evaluateCallingWindow(
  schedule: CampaignSchedule,
  contactTimezone?: string | null,
  now: Date = new Date(),
): ScheduleWindowEvaluation {
  const isRecipientLocal =
    schedule.timezoneMode === "recipient_local" || schedule.timezoneMode === "recipient";

  let effectiveTz = schedule.timezone || "UTC";
  if (isRecipientLocal) {
    if (!contactTimezone || !isValidIanaTimezone(contactTimezone)) {
      return {
        inWindow: false,
        held: true,
        heldReason: "unknown_timezone",
        evaluatedTimezone: contactTimezone || "unknown",
        reason: "Contact lacks a valid recipient timezone in recipient-local mode",
      };
    }
    effectiveTz = contactTimezone;
  } else if (!isValidIanaTimezone(effectiveTz)) {
    effectiveTz = "UTC";
  }

  // Format current local time and day in target timezone
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: effectiveTz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  });

  const parts = dtf.formatToParts(now);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  const localHour = partMap.hour ?? "00";
  const localMinute = partMap.minute ?? "00";
  const localTime = `${localHour}:${localMinute}`;
  const localWeekday = (partMap.weekday ?? "Mon").toLowerCase().slice(0, 3);
  const localDateStr = `${partMap.year}-${partMap.month}-${partMap.day}`;

  // 1. Check Date Range (start date & optional end date)
  if (schedule.startDate && localDateStr < schedule.startDate) {
    return {
      inWindow: false,
      held: false,
      evaluatedTimezone: effectiveTz,
      currentLocalTime: localTime,
      currentLocalDay: localWeekday,
      reason: `Campaign has not started yet (starts ${schedule.startDate})`,
    };
  }

  if (schedule.endDate && localDateStr > schedule.endDate) {
    return {
      inWindow: false,
      held: false,
      evaluatedTimezone: effectiveTz,
      currentLocalTime: localTime,
      currentLocalDay: localWeekday,
      reason: `Campaign has ended (ended ${schedule.endDate})`,
    };
  }

  const NUM_DAY_MAP: Record<number, string> = {
    0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat", 7: "sun",
  };
  const allowedWeekdays = schedule.weekdays && schedule.weekdays.length > 0
    ? schedule.weekdays.map((w) => (typeof w === "number" ? (NUM_DAY_MAP[w] ?? "mon") : String(w).toLowerCase().slice(0, 3)))
    : ["mon", "tue", "wed", "thu", "fri"];

  if (!allowedWeekdays.includes(localWeekday)) {
    return {
      inWindow: false,
      held: false,
      evaluatedTimezone: effectiveTz,
      currentLocalTime: localTime,
      currentLocalDay: localWeekday,
      reason: `Current day (${localWeekday}) is not in active campaign weekdays`,
    };
  }

  // 3. Check Daily Calling Window
  const from = schedule.dailyWindowFrom || "09:00";
  const to = schedule.dailyWindowTo || "17:00";

  // Reject overnight windows in this iteration
  if (from >= to) {
    return {
      inWindow: false,
      held: false,
      evaluatedTimezone: effectiveTz,
      currentLocalTime: localTime,
      currentLocalDay: localWeekday,
      reason: "Invalid window: overnight windows are not supported",
    };
  }

  const insideDaily = localTime >= from && localTime < to;
  if (!insideDaily) {
    return {
      inWindow: false,
      held: false,
      evaluatedTimezone: effectiveTz,
      currentLocalTime: localTime,
      currentLocalDay: localWeekday,
      reason: `Current local time ${localTime} outside daily window ${from} - ${to}`,
    };
  }

  return {
    inWindow: true,
    held: false,
    evaluatedTimezone: effectiveTz,
    currentLocalTime: localTime,
    currentLocalDay: localWeekday,
  };
}
