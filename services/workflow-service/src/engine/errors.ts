export type ErrorClassification = "retryable" | "permanent" | "uncertain";

export function classifyExecutionError(
  error: unknown,
  isWriteOperation = false,
): ErrorClassification {
  if (!error) return "permanent";
  const err = error as { name?: string; code?: string; message?: string; status?: number };
  const msg = (err.message || "").toLowerCase();

  // Ambiguous timeouts on writes cannot be assumed safe to replay blindly
  if (
    err.name === "TimeoutError" ||
    err.name === "AbortError" ||
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    err.code === "ETIMEDOUT" ||
    err.code === "ESOCKETTIMEDOUT"
  ) {
    if (isWriteOperation) {
      return "uncertain";
    }
    return "retryable";
  }

  // Transient HTTP statuses (rate limiting, gateway timeout, bad gateway, service unavailable)
  if (typeof err.status === "number" && [429, 502, 503, 504].includes(err.status)) {
    return "retryable";
  }

  // Network connection drops
  if (
    err.code === "ECONNRESET" ||
    err.code === "ECONNREFUSED" ||
    err.code === "EHOSTUNREACH" ||
    err.code === "ENETUNREACH"
  ) {
    return "retryable";
  }

  return "permanent";
}
