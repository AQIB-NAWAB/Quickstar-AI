import { createHmac, timingSafeEqual } from "node:crypto";

export type WebhookVerificationOptions = {
  /** Maximum acceptable clock drift in seconds (default 300 seconds / 5 minutes) */
  toleranceSeconds?: number;
};

/**
 * Verifies the X-QuickStart-Signature header against the raw webhook body payload.
 *
 * @param signatureHeader The header string (e.g. "t=1710000000,v1=abcdef...")
 * @param rawPayload The raw JSON string or Buffer received from the request
 * @param signingSecret The webhook endpoint's shared signing secret
 * @param options Verification options including clock skew tolerance
 */
export function verifyWebhookSignature(
  signatureHeader: string | null | undefined,
  rawPayload: string | Buffer,
  signingSecret: string,
  options?: WebhookVerificationOptions,
): boolean {
  if (!signatureHeader || !signingSecret) {
    return false;
  }

  const payloadString =
    typeof rawPayload === "string" ? rawPayload : rawPayload.toString("utf8");

  const parts = signatureHeader.split(",");
  let timestampStr = "";
  let signatureHex = "";

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "t") timestampStr = value;
    if (key === "v1") signatureHex = value;
  }

  if (!timestampStr || !signatureHex) {
    return false;
  }

  const timestamp = parseInt(timestampStr, 10);
  if (Number.isNaN(timestamp)) {
    return false;
  }

  // Prevent replay attacks if tolerance is configured (default 5 minutes)
  const tolerance = options?.toleranceSeconds ?? 300;
  if (tolerance > 0) {
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > tolerance) {
      return false;
    }
  }

  const signedPayload = `${timestamp}.${payloadString}`;
  const expectedSignature = createHmac("sha256", signingSecret)
    .update(signedPayload, "utf8")
    .digest("hex");

  if (expectedSignature.length !== signatureHex.length) {
    return false;
  }

  try {
    return timingSafeEqual(
      Buffer.from(expectedSignature, "utf8"),
      Buffer.from(signatureHex, "utf8"),
    );
  } catch {
    return false;
  }
}
