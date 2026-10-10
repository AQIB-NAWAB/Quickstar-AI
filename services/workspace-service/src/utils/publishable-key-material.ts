import { createHash, randomBytes } from "node:crypto";

export function hashPublishableKey(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function publishableKeyMaterial(): { raw: string; prefix: string } {
  const body = randomBytes(24).toString("base64url");
  const raw = `pk_live_${body}`;
  return { raw, prefix: raw.slice(0, 16) };
}
