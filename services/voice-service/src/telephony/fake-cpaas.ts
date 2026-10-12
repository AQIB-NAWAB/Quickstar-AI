import type { DialRequest, DialResult, TelephonyMediaHandler, TelephonyProvider } from "./types.js";

export class FakeCpaasProvider implements TelephonyProvider {
  readonly id: string;
  private healthyFlag = true;
  private readonly media = new Map<string, TelephonyMediaHandler>();

  constructor(id: "twilio" | "telnyx" | "fake" = "fake") {
    this.id = id;
  }

  setHealthy(value: boolean): void {
    this.healthyFlag = value;
  }

  async healthy(): Promise<boolean> {
    return this.healthyFlag;
  }

  verifyWebhook(_headers: Record<string, string | string[] | undefined>, _rawBody: string): boolean {
    void _headers;
    void _rawBody;
    return true;
  }

  async dial(req: DialRequest): Promise<DialResult> {
    if (!this.healthyFlag) {
      throw new Error(`${this.id} unhealthy`);
    }
    return { providerCallSid: `${this.id}_${req.callId}` };
  }

  async hangup(providerCallSid: string): Promise<void> {
    this.media.delete(providerCallSid);
  }

  async attachMedia(providerCallSid: string, handler: TelephonyMediaHandler): Promise<void> {
    this.media.set(providerCallSid, handler);
  }

  /** Test helper: push one fake audio frame. */
  async pushFakeAudio(providerCallSid: string, text: string): Promise<void> {
    const handler = this.media.get(providerCallSid);
    if (!handler) return;
    await handler.onAudio({
      bytes: Buffer.from(text, "utf8"),
      encoding: "fake",
      sampleRateHz: 8000,
    });
  }
}
