const SENSITIVE_KEYS = new Set([
  "authorization",
  "password",
  "secret",
  "api_key",
  "apikey",
  "token",
  "access_token",
  "refresh_token",
  "cookie",
  "x-quickstart-auth-context",
  "x-quickstart-internal-token",
  "x-api-key",
  "x-publishable-key",
  "client_secret",
]);

const REDACTED = "[REDACTED]";

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (SENSITIVE_KEYS.has(lower)) {
    return true;
  }
  return lower.includes("password") || lower.includes("secret") || lower.includes("token");
}

export function redactValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }
  if (typeof value === "object") {
    return redactRecord(value as Record<string, unknown>);
  }
  return value;
}

export function redactRecord(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (isSensitiveKey(key)) {
      out[key] = REDACTED;
      continue;
    }
    out[key] = redactValue(value);
  }
  return out;
}
