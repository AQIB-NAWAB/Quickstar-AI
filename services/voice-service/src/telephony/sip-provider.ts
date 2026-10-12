import { createHmac, timingSafeEqual } from "node:crypto";
import type { DialRequest, DialResult, TelephonyMediaHandler, TelephonyProvider } from "./types.js";

/**
 * SIP / BYOC adapter. SIP+RTP terminate on an external SBC (FreeSWITCH).
 * This provider only speaks the media-bridge control contract into voice-service.
 */
export class SipBridgeProvider implements TelephonyProvider {
  readonly id = "sip";
  private healthyFlag = true;
  private readonly media = new Map<string, TelephonyMediaHandler>();

  constructor(private readonly sharedSecret: string) {}

  setHealthy(value: boolean): void {
    this.healthyFlag = value;
  }

  async healthy(): Promise<boolean> {
    return this.healthyFlag;
  }

  verifyWebhook(headers: Record<string, string | string[] | undefined>, rawBody: string): boolean {
    const raw = headers["x-sip-bridge-signature"];
    const sig = Array.isArray(raw) ? raw[0] : raw;
    if (!sig) return false;
    const expected = createHmac("sha256", this.sharedSecret).update(rawBody).digest("hex");
    try {
      return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  async dial(req: DialRequest): Promise<DialResult> {
    if (!this.healthyFlag) {
      throw new Error("sip SBC unhealthy");
    }
    // Control-plane call to SBC would happen here; stub returns a dialog id.
    return { providerCallSid: `sip_${req.callId}` };
  }

  async hangup(providerCallSid: string): Promise<void> {
    this.media.delete(providerCallSid);
  }

  async attachMedia(providerCallSid: string, handler: TelephonyMediaHandler): Promise<void> {
    this.media.set(providerCallSid, handler);
  }
}
