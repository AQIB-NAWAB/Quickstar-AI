export function isRetrySafe(method: string, hasIdempotencyKey: boolean): boolean {
  const normalized = method.toUpperCase();
  if (normalized === "GET" || normalized === "HEAD" || normalized === "OPTIONS") {
    return true;
  }
  if (normalized === "PUT" || normalized === "DELETE") {
    return true;
  }
  if (normalized === "POST" && hasIdempotencyKey) {
    return true;
  }
  return false;
}

export function computeBackoffMs(attempt: number, baseMs: number, maxMs: number): number {
  const exp = Math.min(maxMs, baseMs * 2 ** attempt);
  const jitter = Math.floor(Math.random() * baseMs);
  return exp + jitter;
}

export type FetchWithPolicyOptions = {
  timeoutMs: number;
  maxRetries?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
  hasIdempotencyKey?: boolean;
};

export async function fetchWithPolicy(
  input: string | URL,
  init: RequestInit,
  options: FetchWithPolicyOptions,
): Promise<Response> {
  const method = init.method ?? "GET";
  const maxRetries = options.maxRetries ?? 2;
  const baseBackoffMs = options.baseBackoffMs ?? 100;
  const maxBackoffMs = options.maxBackoffMs ?? 2_000;
  const retrySafe = isRetrySafe(method, options.hasIdempotencyKey ?? false);

  let attempt = 0;
  while (true) {
    const controller = new AbortController();
    const externalSignal = init.signal;
    const abortFromCaller = () => controller.abort(externalSignal?.reason);
    if (externalSignal?.aborted) controller.abort(externalSignal.reason);
    else externalSignal?.addEventListener("abort", abortFromCaller, { once: true });
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      clearTimeout(timeout);
      externalSignal?.removeEventListener("abort", abortFromCaller);

      const retryableStatus = response.status >= 500 || response.status === 429;
      if (!retrySafe || !retryableStatus || attempt >= maxRetries) {
        return response;
      }
    } catch (error) {
      clearTimeout(timeout);
      externalSignal?.removeEventListener("abort", abortFromCaller);
      if (externalSignal?.aborted) throw error;
      if (!retrySafe || attempt >= maxRetries) {
        throw error;
      }
    }

    attempt += 1;
    await new Promise((resolve) =>
      setTimeout(resolve, computeBackoffMs(attempt - 1, baseBackoffMs, maxBackoffMs)),
    );
  }
}
