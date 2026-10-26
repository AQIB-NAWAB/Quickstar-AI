import { AppError, ErrorCode } from "@quickstart/errors";
import type {
  DialRequest,
  DialResult,
  TelephonyMediaHandler,
  TelephonyProvider,
} from "../types.js";
import type { TelnyxNumbersClient } from "./types.js";

/**
 * Telnyx adapter for inbound PSTN.
 *
 * Media does not flow through this adapter: Telnyx delivers SIP to LiveKit,
 * and the LiveKit inbound bridge joins the room. `attachMedia` is therefore a
 * no-op kept for interface compatibility.
 *
 * Outbound dialing through Telnyx/LiveKit is intentionally not implemented in
 * this slice; callers get a typed upstream error instead of a silent failure.
 */
export class TelnyxProvider implements TelephonyProvider {
  readonly id = "telnyx";
  private healthyFlag = true;

  constructor(
    readonly client: TelnyxNumbersClient,
    private readonly defaultFromNumber = "",
  ) {}

  setHealthy(value: boolean): void {
    this.healthyFlag = value;
  }

  async healthy(): Promise<boolean> {
    return this.healthyFlag && this.client.kind === "telnyx";
  }

  verifyWebhook(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string,
  ): boolean {
    return this.client.verifyWebhook(headers, rawBody);
  }

  async dial(req: DialRequest): Promise<DialResult> {
    void req;
    throw new AppError({
      code: ErrorCode.UPSTREAM_UNAVAILABLE,
      message:
        "Outbound dialing through Telnyx is routed by LiveKit SIP and is not enabled in this release",
    });
  }

  async hangup(providerCallSid: string): Promise<void> {
    void providerCallSid;
  }

  async attachMedia(
    providerCallSid: string,
    handler: TelephonyMediaHandler,
  ): Promise<void> {
    void providerCallSid;
    void handler;
    // LiveKit owns the media plane for Telnyx inbound calls.
  }

  get fromNumber(): string {
    return this.defaultFromNumber;
  }
}
