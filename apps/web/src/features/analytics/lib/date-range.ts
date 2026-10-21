import type { DateRange } from "./types";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function getUtcTodayDateString(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseUtcDate(dateStr: string): Date | null {
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [year, month, day] = parts;
  const d = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() + 1 !== month ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  return d;
}

export function addUtcDays(dateStr: string, days: number): string {
  const d = parseUtcDate(dateStr) ?? new Date();
  d.setUTCDate(d.getUTCDate() + days);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function computePresetRange(
  preset: "7d" | "30d" | "90d",
  baseToday?: string,
): DateRange {
  const today = baseToday || getUtcTodayDateString();
  const daysOffset = preset === "7d" ? -6 : preset === "30d" ? -29 : -89;
  const from = addUtcDays(today, daysOffset);

  return {
    preset,
    from,
    to: today,
    timezone: "UTC",
  };
}

export function countInclusiveUtcDays(from: string, to: string): number {
  const fromDate = parseUtcDate(from);
  const toDate = parseUtcDate(to);
  if (!fromDate || !toDate) return 0;
  const diffMs = toDate.getTime() - fromDate.getTime();
  return Math.round(diffMs / (24 * 60 * 60 * 1000)) + 1;
}

export function formatUtcDateRange(from: string, to: string): string {
  const fromDate = parseUtcDate(from);
  const toDate = parseUtcDate(to);

  if (!fromDate || !toDate) return `${from} – ${to}`;

  const fromMonth = MONTH_NAMES[fromDate.getUTCMonth()];
  const toMonth = MONTH_NAMES[toDate.getUTCMonth()];
  const fromDay = fromDate.getUTCDate();
  const toDay = toDate.getUTCDate();
  const fromYear = fromDate.getUTCFullYear();
  const toYear = toDate.getUTCFullYear();

  if (fromYear === toYear) {
    if (fromMonth === toMonth) {
      return `${fromMonth} ${fromDay} – ${toDay}, ${toYear}`;
    }
    return `${fromMonth} ${fromDay} – ${toMonth} ${toDay}, ${toYear}`;
  }

  return `${fromMonth} ${fromDay}, ${fromYear} – ${toMonth} ${toDay}, ${toYear}`;
}

export function isValidIsoDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  return parseUtcDate(dateStr) !== null;
}

export interface DateRangeValidationResult {
  valid: boolean;
  error?: string;
  field?: "from" | "to";
}

export function validateCustomDateRange(
  from: string,
  to: string,
  today: string = getUtcTodayDateString(),
): DateRangeValidationResult {
  if (!from.trim()) {
    return { valid: false, field: "from", error: "Start date is required." };
  }
  if (!to.trim()) {
    return { valid: false, field: "to", error: "End date is required." };
  }

  if (!isValidIsoDate(from)) {
    return { valid: false, field: "from", error: "Start date must be YYYY-MM-DD." };
  }
  if (!isValidIsoDate(to)) {
    return { valid: false, field: "to", error: "End date must be YYYY-MM-DD." };
  }

  if (from > to) {
    return {
      valid: false,
      field: "from",
      error: "Start date cannot be after end date.",
    };
  }

  if (to > today) {
    return {
      valid: false,
      field: "to",
      error: "End date cannot be in the future.",
    };
  }

  const days = countInclusiveUtcDays(from, to);
  if (days > 366) {
    return {
      valid: false,
      field: "to",
      error: "Date range cannot exceed 366 days.",
    };
  }

  return { valid: true };
}

export function resolveDateRangeFromSearchParams(
  rangeParam: string | null,
  fromParam: string | null,
  toParam: string | null,
  baseToday: string = getUtcTodayDateString(),
): DateRange {
  if (rangeParam === "7d") {
    return computePresetRange("7d", baseToday);
  }

  if (rangeParam === "30d") {
    return computePresetRange("30d", baseToday);
  }

  if (rangeParam === "90d") {
    return computePresetRange("90d", baseToday);
  }

  if (rangeParam === "custom" && fromParam && toParam) {
    const validation = validateCustomDateRange(fromParam, toParam, baseToday);
    if (validation.valid) {
      return {
        preset: "custom",
        from: fromParam,
        to: toParam,
        timezone: "UTC",
      };
    }
  }

  // Default to 7d (matching Image 1)
  return computePresetRange("7d", baseToday);
}
