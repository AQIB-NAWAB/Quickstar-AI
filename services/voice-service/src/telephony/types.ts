import type { TelephonyProviderId } from "@quickstart/contracts";
import type { AudioChunk } from "../speech/types.js";

export type TelephonyMediaHandler = {
  onAudio(chunk: AudioChunk): Promise<void>;
  onHangup(reason: string): Promise<void>;
};

export type DialRequest = {
  workspaceId: string;
  toE164: string;
  fromE164?: string;
  callId: string;
};

export type DialResult = {
  providerCallSid: string;
};

export interface TelephonyProvider {
  readonly id: TelephonyProviderId | string;
  healthy(): Promise<boolean>;
  verifyWebhook(headers: Record<string, string | string[] | undefined>, rawBody: string): boolean;
  dial(req: DialRequest): Promise<DialResult>;
  hangup(providerCallSid: string): Promise<void>;
  /** Attach media for an accepted inbound/outbound session. */
  attachMedia(providerCallSid: string, handler: TelephonyMediaHandler): Promise<void>;
}

export type RouteDecision = {
  provider: TelephonyProvider;
  failoverFrom?: string;
};
