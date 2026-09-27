import type { CompletionRequestBody, CompletionResponseBody } from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";
import { fetchWithPolicy } from "@quickstart/utilities";

export class ModelGatewayClient {
  constructor(
    private readonly baseUrl: string,
    private readonly internalToken: string,
    private readonly timeoutMs: number = 30000,
  ) {}

  async complete(body: CompletionRequestBody): Promise<CompletionResponseBody> {
    const url = `${this.baseUrl}/internal/complete`;
    const res = await fetchWithPolicy(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.internalToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      },
      { timeoutMs: this.timeoutMs, maxRetries: 0 },
    ).catch((err: Error) => {
      if (err.name === "AbortError" || err.message?.toLowerCase().includes("abort") || err.message?.toLowerCase().includes("timeout")) {
        throw new AppError({
          code: ErrorCode.UPSTREAM_TIMEOUT,
          message: "Model gateway request timed out",
        });
      }
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: `Failed to reach model gateway: ${err.message}`,
      });
    });

    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: { message?: string; code?: string } };
      if (res.status === 504) {
        throw new AppError({
          code: ErrorCode.UPSTREAM_TIMEOUT,
          message: errBody?.error?.message ?? "Model gateway timed out",
        });
      }
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: errBody?.error?.message ?? `Model gateway error with status ${res.status}`,
      });
    }

    return (await res.json()) as CompletionResponseBody;
  }
}
