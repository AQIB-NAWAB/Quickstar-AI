import { AppError, ErrorCode } from "@quickstart/errors";
import { fetchWithPolicy } from "@quickstart/utilities";

export type IntegrationActionResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string; notConnected?: boolean };

/** Internal client for built-in actions on connected workspace integrations. */
export class IntegrationClient {
  constructor(
    private readonly baseUrl: string,
    private readonly internalToken: string,
    private readonly timeoutMs = 10_000,
  ) {}

  async execute(
    workspaceId: string,
    provider: string,
    action: string,
    input: Record<string, unknown>,
  ): Promise<IntegrationActionResult> {
    const base = this.baseUrl.replace(/\/$/, "");
    const url = `${base}/internal/workspaces/${encodeURIComponent(
      workspaceId,
    )}/integrations/${encodeURIComponent(provider)}/actions`;
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
          body: JSON.stringify({ action, input }),
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
      return { ok: false, error: "Integration action returned invalid JSON" };
    }
    if (!res.ok) {
      const errorBody = json.error as { message?: string } | undefined;
      return { ok: false, error: errorBody?.message ?? `Integration action failed (${res.status})` };
    }
    const result = json.result as IntegrationActionResult | undefined;
    if (!result) {
      return { ok: false, error: "Integration action returned no result" };
    }
    return result;
  }
}
