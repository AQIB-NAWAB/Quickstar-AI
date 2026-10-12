/** Normalize to a best-effort E.164 candidate (digits with leading +). */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  return hasPlus || digits.length > 10 ? `+${digits}` : `+${digits}`;
}

export function isValidE164(normalized: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(normalized);
}
