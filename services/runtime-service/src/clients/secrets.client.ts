import { fetchWithPolicy } from "@quickstart/utilities";
import { AppError, ErrorCode } from "@quickstart/errors";

export type SecretsClientOptions = {
  baseUrl: string;
  internalToken: string;
  timeoutMs: number;
};

export class SecretsClient {
  constructor(private readonly options: SecretsClientOptions) {}

  /** Returns the plaintext value of a workspace secret, for tool auth injection. */
  async reveal(workspaceId: string, name: string, requestId: string): Promise<string> {
    const url = `${this.options.baseUrl}/internal/workspaces/${encodeURIComponent(workspaceId)}/secrets/${encodeURIComponent(name)}/value`;
    const res = await fetchWithPolicy(
      url,
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${this.options.internalToken}`,
          "x-request-id": requestId,
        },
      },
      { timeoutMs: this.options.timeoutMs, maxRetries: 0 },
    ).catch(() => {
      throw new AppError({
        code: ErrorCode.UPSTREAM_TIMEOUT,
        message: "Secrets service timed out",
      });
    });
    if (!res.ok) {
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message:
          res.status === 404
            ? `Workspace secret '${name}' was not found`
            : `Secrets service error (${res.status})`,
      });
    }
    const body = (await res.json()) as { value?: string };
    if (typeof body.value !== "string") {
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: "Secrets service returned no value",
      });
    }
    return body.value;
  }
}
