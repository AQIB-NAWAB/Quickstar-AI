import { randomUUID } from "node:crypto";
import type { CampaignRecord, CampaignTarget } from "../domain/types.js";
import type { DialAdapter, DialResult } from "./dialer.js";

export type VoiceDialAdapterOptions = {
  voiceUrl: string;
  conversationUrl: string;
  internalToken: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

/**
 * DialAdapter that places one outbound turn through voice-service internal simulate
 * (Feature 21 test double). Campaign-service never owns media sockets.
 */
export class VoiceDialAdapter implements DialAdapter {
  private readonly voiceUrl: string;
  private readonly conversationUrl: string;
  private readonly internalToken: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: VoiceDialAdapterOptions) {
    this.voiceUrl = options.voiceUrl.replace(/\/$/, "");
    this.conversationUrl = options.conversationUrl.replace(/\/$/, "");
    this.internalToken = options.internalToken;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async dial(target: CampaignTarget, campaign: CampaignRecord): Promise<DialResult> {
    const conversationId = await this.createConversation(
      target.workspaceId,
      campaign.agentId,
      target.id,
    );

    const utteranceText = `campaign dial ${target.dialNormalized}`;
    const res = await this.fetchImpl(
      `${this.voiceUrl}/internal/v1/workspaces/${encodeURIComponent(target.workspaceId)}/voice/simulate`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.internalToken}`,
          "content-type": "application/json",
          "x-request-id": randomUUID(),
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          agent_id: campaign.agentId,
          utterance_text: utteranceText,
          direction: "outbound",
          caller: undefined,
          callee: target.dialNormalized,
          telephony_provider: "fake",
          voice_mode: "cascade",
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      },
    );

    const text = await res.text();
    let data: Record<string, unknown> = {};
    try {
      data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      return {
        status: "failed",
        outcome: "dial_error",
        callId: null,
        durationSeconds: null,
        error: {
          code: "VOICE_SIMULATE_FAILED",
          message: `voice simulate ${res.status}: ${text.slice(0, 200)}`,
        },
      };
    }

    const result = (data.result ?? data) as {
      call_id?: string;
      state?: string;
      timings?: { total_ms?: number };
    };
    const callId = result.call_id ?? null;
    if (!callId || String(callId).startsWith("stub-")) {
      return {
        status: "failed",
        outcome: "dial_error",
        callId,
        durationSeconds: null,
        error: {
          code: "VOICE_SIMULATE_NO_CALL",
          message: "voice simulate did not return a real call_id",
        },
      };
    }

    const durationSeconds =
      typeof result.timings?.total_ms === "number"
        ? Math.max(1, Math.round(result.timings.total_ms / 1000))
        : 1;

    if (result.state === "completed" || result.state === "live") {
      return {
        status: "answered",
        outcome: "answered",
        callId,
        durationSeconds,
      };
    }

    return {
      status: "failed",
      outcome: "dial_error",
      callId,
      durationSeconds,
      error: {
        code: "VOICE_SIMULATE_BAD_STATE",
        message: `unexpected call state: ${result.state ?? "unknown"}`,
      },
    };
  }

  private async createConversation(
    workspaceId: string,
    agentId: string,
    targetId: string,
  ): Promise<string> {
    const res = await this.fetchImpl(
      `${this.conversationUrl}/internal/workspaces/${encodeURIComponent(workspaceId)}/widget/conversations`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.internalToken}`,
          "content-type": "application/json",
          "x-request-id": randomUUID(),
        },
        body: JSON.stringify({
          agent_id: agentId,
          subject_key: `campaign-target:${targetId}`,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      },
    );
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`conversation create failed (${res.status}): ${text.slice(0, 200)}`);
    }
    const data = JSON.parse(text) as {
      conversation?: { id?: string };
      conversation_id?: string;
    };
    const id = data.conversation?.id ?? data.conversation_id;
    if (!id) {
      throw new Error("conversation create response missing id");
    }
    return id;
  }
}
