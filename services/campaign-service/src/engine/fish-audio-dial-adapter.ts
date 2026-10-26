import type { CampaignRecord, CampaignTarget } from "../domain/types.js";
import type { DialAdapter, DialResult } from "./dialer.js";

export type FishAudioDialAdapterOptions = {
  apiKey: string;
  agentId: string;
  phoneNumberId: string;
  fetchImpl?: typeof fetch;
};

/** Starts an outbound session in Fish Audio; completion arrives asynchronously. */
export class FishAudioDialAdapter implements DialAdapter {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: FishAudioDialAdapterOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async dial(target: CampaignTarget, campaign: CampaignRecord): Promise<DialResult> {
    const response = await this.fetchImpl("https://api.fish.audio/v1/agent/phone-calls", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.options.apiKey}`,
        "content-type": "application/json",
        "Idempotency-Key": `${campaign.id}:${target.id}:${target.attemptsCount + 1}`,
      },
      body: JSON.stringify({
        agent_id: this.options.agentId,
        phone_number_id: this.options.phoneNumberId,
        to_number: target.dialNormalized,
        metadata: {
          quickstart_campaign_id: campaign.id,
          quickstart_target_id: target.id,
          quickstart_workspace_id: target.workspaceId,
          quickstart_agent_id: campaign.agentId,
          quickstart_campaign_name: campaign.name,
        },
        dynamic_variables: {
          contact_name: target.displayName ?? "",
          ...target.attributes,
        },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const text = await response.text();
    let data: Record<string, unknown> = {};
    try {
      data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      data = { message: text };
    }
    if (!response.ok) {
      return {
        status: "failed",
        outcome: "dial_error",
        callId: null,
        durationSeconds: null,
        error: {
          code: String(data.code ?? `FISH_AUDIO_${response.status}`),
          message: String(data.message ?? text).slice(0, 500),
        },
      };
    }
    const sessionId = typeof data.session_id === "string" ? data.session_id : null;
    if (!sessionId) {
      return {
        status: "failed",
        outcome: "dial_error",
        callId: null,
        durationSeconds: null,
        error: { code: "FISH_AUDIO_MISSING_SESSION", message: "Fish Audio did not return a session_id" },
      };
    }
    return { status: "in_progress", outcome: String(data.status ?? "queued"), callId: sessionId, durationSeconds: null };
  }

  async getStatus(sessionId: string): Promise<DialResult> {
    const response = await this.fetchImpl(
      `https://api.fish.audio/v1/agent/sessions/${encodeURIComponent(sessionId)}`,
      {
        headers: { authorization: `Bearer ${this.options.apiKey}` },
        signal: AbortSignal.timeout(20_000),
      },
    );
    const text = await response.text();
    if (!response.ok) throw new Error(`Fish Audio session lookup ${response.status}: ${text.slice(0, 300)}`);
    const session = JSON.parse(text) as {
      status?: string;
      dial_status?: string;
      end_reason?: string | null;
      started_at?: string | null;
      ended_at?: string | null;
    };
    const dialStatus = (session.dial_status ?? "").toLowerCase();
    if (dialStatus === "no_answer" || dialStatus === "busy" || dialStatus === "voicemail") {
      return {
        status: dialStatus as "no_answer" | "busy" | "voicemail",
        outcome: dialStatus,
        callId: sessionId,
        durationSeconds: 0,
      };
    }
    if (session.status !== "completed" && session.status !== "failed") {
      return { status: "in_progress", outcome: "in_progress", callId: sessionId, durationSeconds: null };
    }
    const durationSeconds = session.started_at && session.ended_at
      ? Math.max(0, Math.round((Date.parse(session.ended_at) - Date.parse(session.started_at)) / 1000))
      : null;
    if (session.status === "completed") {
      return { status: "answered", outcome: "answered", callId: sessionId, durationSeconds };
    }
    return {
      status: "failed",
      outcome: session.end_reason || "dial_error",
      callId: sessionId,
      durationSeconds,
      error: { code: "FISH_AUDIO_CALL_FAILED", message: session.end_reason || "Fish Audio call failed" },
    };
  }
}
