import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { DialRequest, DialResult, TelephonyMediaHandler, TelephonyProvider } from "./types.js";

export type TwilioCpaasConfig = {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  /** Public base URL used when validating X-Twilio-Signature (no trailing slash). */
  publicBaseUrl: string;
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
  /** Path suffix used to reconstruct the signed URL when header validation runs. */
  inboundPath?: string;
  statusPath?: string;
};

function headerValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower) {
      return Array.isArray(value) ? value[0] : value;
    }
  }
  return undefined;
}

/** Parse application/x-www-form-urlencoded or JSON body into string params. */
export function parseWebhookParams(rawBody: string): Record<string, string> {
  const trimmed = rawBody.trim();
  if (!trimmed) return {};
  if (trimmed.startsWith("{")) {
    try {
      const json = JSON.parse(trimmed) as Record<string, unknown>;
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(json)) {
        if (v == null) continue;
        out[k] = String(v);
      }
      return out;
    } catch {
      /* fall through to form */
    }
  }
  const out: Record<string, string> = {};
  for (const part of trimmed.split("&")) {
    if (!part) continue;
    const eq = part.indexOf("=");
    const key = decodeURIComponent(eq >= 0 ? part.slice(0, eq) : part);
    const value = decodeURIComponent(eq >= 0 ? part.slice(eq + 1) : "");
    out[key] = value;
  }
  return out;
}

/**
 * Twilio request validation: HMAC-SHA1(authToken, url + sorted key+value params) → base64.
 * @see https://www.twilio.com/docs/usage/security#validating-requests
 */
export function computeTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
): string {
  let data = url;
  for (const key of Object.keys(params).sort()) {
    data += key + params[key];
  }
  return createHmac("sha1", authToken).update(data, "utf8").digest("base64");
}

export function verifyTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string,
): boolean {
  const expected = computeTwilioSignature(authToken, url, params);
  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export class TwilioCpaasProvider implements TelephonyProvider {
  readonly id = "twilio";
  private healthyFlag = true;
  private readonly media = new Map<string, TelephonyMediaHandler>();
  private readonly fetchImpl: typeof fetch;
  private readonly apiBaseUrl: string;

  constructor(private readonly config: TwilioCpaasConfig) {
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.apiBaseUrl = (config.apiBaseUrl ?? "https://api.twilio.com").replace(/\/$/, "");
  }

  setHealthy(value: boolean): void {
    this.healthyFlag = value;
  }

  async healthy(): Promise<boolean> {
    return this.healthyFlag;
  }

  /**
   * Verify X-Twilio-Signature. Prefers `x-twilio-webhook-url` header (tests/fixtures)
   * or reconstructs `${publicBaseUrl}${path}` from `x-twilio-request-path`.
   */
  verifyWebhook(headers: Record<string, string | string[] | undefined>, rawBody: string): boolean {
    const signature = headerValue(headers, "x-twilio-signature");
    if (!signature) return false;
    const params = parseWebhookParams(rawBody);
    const explicitUrl = headerValue(headers, "x-twilio-webhook-url");
    const pathHint =
      headerValue(headers, "x-twilio-request-path") ??
      this.config.statusPath ??
      "/voice/telephony/twilio/status";
    const url = explicitUrl ?? `${this.config.publicBaseUrl}${pathHint.startsWith("/") ? pathHint : `/${pathHint}`}`;
    return verifyTwilioSignature(this.config.authToken, url, params, signature);
  }

  async dial(req: DialRequest): Promise<DialResult> {
    if (!this.healthyFlag) {
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: "Twilio provider unhealthy",
      });
    }
    const from = req.fromE164 ?? this.config.fromNumber;
    if (!from) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "TWILIO_FROM_NUMBER (or fromE164) is required to dial",
      });
    }
    const statusCallback = `${this.config.publicBaseUrl}/voice/telephony/twilio/status`;
    const voiceUrl = `${this.config.publicBaseUrl}/voice/telephony/twilio/inbound`;
    const body = new URLSearchParams({
      To: req.toE164,
      From: from,
      Url: voiceUrl,
      StatusCallback: statusCallback,
      StatusCallbackEvent: "initiated ringing answered completed",
    });
    const auth = Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString("base64");
    const res = await this.fetchImpl(
      `${this.apiBaseUrl}/2010-04-01/Accounts/${encodeURIComponent(this.config.accountSid)}/Calls.json`,
      {
        method: "POST",
        headers: {
          authorization: `Basic ${auth}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: `Twilio dial failed (${res.status}): ${text.slice(0, 200)}`,
      });
    }
    const json = (await res.json()) as { sid?: string };
    if (!json.sid) {
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: "Twilio dial response missing sid",
      });
    }
    return { providerCallSid: json.sid };
  }

  async hangup(providerCallSid: string): Promise<void> {
    this.media.delete(providerCallSid);
    const auth = Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString("base64");
    const body = new URLSearchParams({ Status: "completed" });
    try {
      await this.fetchImpl(
        `${this.apiBaseUrl}/2010-04-01/Accounts/${encodeURIComponent(this.config.accountSid)}/Calls/${encodeURIComponent(providerCallSid)}.json`,
        {
          method: "POST",
          headers: {
            authorization: `Basic ${auth}`,
            "content-type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        },
      );
    } catch {
      // best-effort hangup
    }
  }

  async attachMedia(providerCallSid: string, handler: TelephonyMediaHandler): Promise<void> {
    this.media.set(providerCallSid, handler);
  }

  /** Test/helper: push one audio frame into an attached media handler. */
  async pushMediaAudio(
    providerCallSid: string,
    chunk: { bytes: Buffer; encoding: "fake" | "mulaw" | "pcm16"; sampleRateHz: number },
  ): Promise<void> {
    const handler = this.media.get(providerCallSid);
    if (!handler) return;
    await handler.onAudio(chunk);
  }
}
