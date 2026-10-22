import { parseUtcDate } from "./date-range";

const SHORT_MONTHS = [
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

export function formatCompactNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "—";
  if (num === 0) return "0";

  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    const formatted = (abs / 1_000_000_000).toFixed(2).replace(/\.?0+$/, "");
    return `${sign}${formatted}B`;
  }
  if (abs >= 1_000_000) {
    const formatted = (abs / 1_000_000).toFixed(2).replace(/\.?0+$/, "");
    return `${sign}${formatted}M`;
  }
  if (abs >= 10_000) {
    const formatted = (abs / 1_000).toFixed(1).replace(/\.?0+$/, "");
    return `${sign}${formatted}K`;
  }
  if (abs >= 1_000) {
    return `${sign}${num.toLocaleString("en-US")}`;
  }

  return `${sign}${num.toLocaleString("en-US")}`;
}

export function formatExactNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "—";
  return num.toLocaleString("en-US");
}

export function formatSeconds(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  const sec = ms / 1000;
  if (sec >= 10) {
    return `${sec.toFixed(1)} s`;
  }
  return `${sec.toFixed(1)} s`;
}

export function formatUtcMonthDay(dateStr: string): string {
  const d = parseUtcDate(dateStr);
  if (!d) return dateStr;
  const month = SHORT_MONTHS[d.getUTCMonth()];
  const day = d.getUTCDate();
  return `${month} ${day}`;
}

export function formatPercentage(
  pct: number | null | undefined,
  decimals: number = 0,
): string {
  if (pct === null || pct === undefined || isNaN(pct) || !isFinite(pct)) {
    return "0%";
  }
  if (decimals === 0) {
    return `${Math.round(pct)}%`;
  }
  return `${pct.toFixed(decimals).replace(/\.?0+$/, "")}%`;
}

export function formatUtcFullDate(dateStr: string): string {
  const d = parseUtcDate(dateStr);
  if (!d) return dateStr;
  const month = SHORT_MONTHS[d.getUTCMonth()];
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  return `${month} ${day}, ${year}`;
}

export function formatHourIntervalUtc(hour: number): string {
  const start = String(hour % 24).padStart(2, "0");
  const end = String((hour + 1) % 24).padStart(2, "0");
  return `${start}:00–${end}:00 UTC`;
}
