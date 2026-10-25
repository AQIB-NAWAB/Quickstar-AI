import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Unsubscribe tokens are self-describing: base64url campaignId and recipientId
 * plus an HMAC over both, signed with a service secret. They authenticate the
 * one-click unsubscribe link without a staff session and leak nothing about
 * the workspace.
 */
export function createUnsubscribeToken(
  campaignId: string,
  recipientId: string,
  secret: string,
): string {
  const payload = `${Buffer.from(campaignId).toString("base64url")}.${Buffer.from(recipientId).toString("base64url")}`;
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function parseUnsubscribeToken(
  token: string,
  secret: string,
): { campaignId: string; recipientId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [campaignEnc, recipientEnc, signature] = parts;
  const payload = `${campaignEnc}.${recipientEnc}`;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const campaignId = Buffer.from(campaignEnc, "base64url").toString("utf8");
    const recipientId = Buffer.from(recipientEnc, "base64url").toString("utf8");
    if (!campaignId || !recipientId) return null;
    return { campaignId, recipientId };
  } catch {
    return null;
  }
}

export function unsubscribeSecret(): string {
  const secret =
    process.env.EMAIL_UNSUBSCRIBE_SECRET?.trim() ||
    process.env.WORKSPACE_INTERNAL_TOKEN?.trim() ||
    process.env.INTERNAL_TOKEN?.trim();
  if (!secret) {
    throw new Error(
      "EMAIL_UNSUBSCRIBE_SECRET, WORKSPACE_INTERNAL_TOKEN, or INTERNAL_TOKEN must be set to sign unsubscribe links",
    );
  }
  return secret;
}

export function appOrigin(): string {
  return (process.env.APP_ORIGIN ?? "http://localhost:3000").replace(/\/$/, "");
}
