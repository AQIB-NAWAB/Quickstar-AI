import { AppError, ErrorCode } from "@quickstart/errors";
import { fetchWithPolicy } from "@quickstart/utilities";

export type LeadCaptureInput = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  intent?: string | null;
  qualificationScore?: number | null;
  notes?: string | null;
  status?: "new" | "contacted" | "qualified" | "disqualified";
  source?: string;
  conversationId?: string | null;
  capturedFields?: Record<string, unknown>;
  idempotencyKey: string;
};

export type LeadCaptureResult =
  | { ok: true; lead: Record<string, unknown>; created: boolean }
  | { ok: false; error: string };

/** Internal client for saving a conversation as a qualified lead. */
export class LeadClient {
  constructor(
    private readonly baseUrl: string,
    private readonly internalToken: string,
    private readonly timeoutMs = 5_000,
  ) {}

  async capture(workspaceId: string, input: LeadCaptureInput): Promise<LeadCaptureResult> {
    const base = this.baseUrl.replace(/\/$/, "");
    const url = `${base}/internal/v1/workspaces/${encodeURIComponent(workspaceId)}/leads/upsert`;
    let res: Response;
    try {
      res = await fetchWithPolicy(
        url,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${this.internalToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            name: input.name ?? null,
            email: input.email ?? null,
            phone: input.phone ?? null,
            intent: input.intent ?? null,
            qualification_score: input.qualificationScore ?? null,
            status: input.status ?? "qualified",
            source: input.source ?? "agent",
            conversation_id: input.conversationId ?? null,
            notes: input.notes ?? null,
            captured_fields: input.capturedFields ?? {},
            idempotency_key: input.idempotencyKey,
            merge_on_conflict: true,
          }),
        },
        { timeoutMs: this.timeoutMs, maxRetries: 0 },
      );
    } catch (err) {
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: `Lead service unavailable: ${err instanceof Error ? err.message : "network error"}`,
      });
    }

    const text = await res.text();
    if (!res.ok) {
      return { ok: false, error: `Lead capture failed (${res.status}): ${text.slice(0, 200)}` };
    }
    try {
      const json = JSON.parse(text) as { lead?: Record<string, unknown>; created?: boolean };
      return { ok: true, lead: json.lead ?? {}, created: Boolean(json.created) };
    } catch {
      return { ok: false, error: "Lead service returned invalid JSON" };
    }
  }
}
