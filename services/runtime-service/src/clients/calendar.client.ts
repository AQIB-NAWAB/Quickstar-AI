import { AppError, ErrorCode } from "@quickstart/errors";
import { fetchWithPolicy } from "@quickstart/utilities";

export type CalendarActionInput = {
  action: "check_availability" | "book_slot" | "cancel_event";
  calendar_id?: string;
  timezone?: string;
  date?: string;
  start?: string;
  end?: string;
  slot_minutes?: number;
  working_hours?: { start?: string; end?: string };
  max_slots?: number;
  summary?: string;
  description?: string;
  attendee_email?: string;
  event_id?: string;
};

export type CalendarActionResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string; notConnected?: boolean };

/**
 * Internal client for the workspace's connected Google Calendar.
 * Credential handling and token refresh live in workspace-service; this client
 * only sends the requested action.
 */
export class CalendarClient {
  constructor(
    private readonly baseUrl: string,
    private readonly internalToken: string,
    private readonly timeoutMs = 10_000,
  ) {}

  async execute(workspaceId: string, input: CalendarActionInput): Promise<CalendarActionResult> {
    const base = this.baseUrl.replace(/\/$/, "");
    const url = `${base}/internal/workspaces/${encodeURIComponent(
      workspaceId,
    )}/integrations/google_calendar/actions`;
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
          body: JSON.stringify(input),
        },
        { timeoutMs: this.timeoutMs, maxRetries: 0 },
      );
    } catch (err) {
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: `Workspace service unavailable: ${
          err instanceof Error ? err.message : "network error"
        }`,
      });
    }

    const text = await res.text();
    let json: Record<string, unknown> = {};
    try {
      json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      return { ok: false, error: "Calendar service returned invalid JSON" };
    }
    if (!res.ok) {
      const errorBody = json.error as { code?: string; message?: string } | undefined;
      return {
        ok: false,
        error: errorBody?.message ?? `Calendar action failed (${res.status})`,
        notConnected: errorBody?.code === "VALIDATION_FAILED",
      };
    }
    return { ok: true, data: (json.result as Record<string, unknown>) ?? json };
  }
}
