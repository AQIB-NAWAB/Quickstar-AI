import { ResearchError } from "./research-error.js";

/** Bound bytes while reading, rather than buffering an arbitrary provider response first. */
export async function responseText(response: Response, maxBytes = 300_000): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new ResearchError("PROVIDER_RESPONSE_TOO_LARGE");
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof ResearchError) throw error;
    throw new ResearchError("PROVIDER_RESPONSE_INTERRUPTED", true);
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString("utf8");
}

export function retryAfterSeconds(value: string | null): number {
  if (!value) return 0;
  const seconds = /^\d+(?:\.\d+)?$/.test(value.trim())
    ? Number(value)
    : (Date.parse(value) - Date.now()) / 1000;
  return Number.isFinite(seconds) ? Math.max(0, Math.min(Math.ceil(seconds), 3600)) : 0;
}
