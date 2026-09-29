const DENY_PATTERNS: RegExp[] = [
  /\bsk-[a-zA-Z0-9]{20,}\b/,
  /\bBearer\s+[a-zA-Z0-9._-]{20,}\b/i,
  /\bapi[_-]?key\s*[:=]\s*\S+/i,
  /\b(?:password|passwd|pwd)\s*(?:is|:|=)\s*\S+/i,
  /\b(?:secret|token)\s*(?:is|:|=)\s*\S{8,}/i,
  /\b(?:\d[ -]*?){13,19}\b/,
];

export function factTextDenied(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) {
    return false;
  }
  return DENY_PATTERNS.some((pattern) => pattern.test(normalized));
}
