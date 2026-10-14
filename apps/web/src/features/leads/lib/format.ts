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

export function formatLeadTag(value: string): string {
  const label = value.replace(/[-_]+/g, " ").trim();
  return label ? label[0].toUpperCase() + label.slice(1) : value;
}

export function formatCapturedDateTime(dateStr: string | null | undefined): { date: string; time: string } | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;

  const month = MONTH_NAMES[d.getUTCMonth()];
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");

  return {
    date: `${month} ${day}, ${year}`,
    time: `${hours}:${minutes}`,
  };
}

export function formatUtcCaptured(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const month = MONTH_NAMES[d.getUTCMonth()];
  const day = d.getUTCDate();
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");

  return `${month} ${day}, ${hours}:${minutes}`;
}

export function formatFullUtcCaptured(dateStr: string | null | undefined): string {
  if (!dateStr) return "Not recorded";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Not recorded";

  const month = MONTH_NAMES[d.getUTCMonth()];
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");

  return `Captured ${month} ${day}, ${year} at ${hours}:${minutes} UTC`;
}

export function getInitials(name: string | null | undefined): string {
  if (!name || !name.trim()) return "—";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  return /^[+0-9\s\-().]{6,}$/.test(phone);
}

export function normalizePhoneForSearch(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}
