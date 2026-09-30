import type { ScrapeResponseBody, SearchResponseBody } from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";
import { fetchWithPolicy } from "@quickstart/utilities";

export class WebFetchClient {
  constructor(
    private readonly baseUrl: string,
    private readonly internalToken: string,
    private readonly timeoutMs: number,
  ) {}

  async scrape(
    workspaceId: string,
    requestId: string,
    url: string,
    idempotencyKey: string,
  ): Promise<ScrapeResponseBody> {
    const res = await fetchWithPolicy(
      `${this.baseUrl}/internal/scrape`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.internalToken}`,
          "content-type": "application/json",
          "x-request-id": requestId,
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          request_id: requestId,
          idempotency_key: idempotencyKey,
          url,
        }),
      },
      { timeoutMs: this.timeoutMs, maxRetries: 0 },
    );
    if (res.status === 429) {
      throw new AppError({
        code: ErrorCode.RATE_LIMITED,
        message: "Acquisition budget exceeded",
        requestId,
      });
    }
    if (!res.ok) {
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: "Web fetch scrape failed",
        requestId,
      });
    }
    return (await res.json()) as ScrapeResponseBody;
  }

  async search(
    workspaceId: string,
    requestId: string,
    query: string,
    idempotencyKey: string,
  ): Promise<SearchResponseBody> {
    const res = await fetchWithPolicy(
      `${this.baseUrl}/internal/search`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.internalToken}`,
          "content-type": "application/json",
          "x-request-id": requestId,
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          request_id: requestId,
          idempotency_key: idempotencyKey,
          query,
          max_results: 5,
        }),
      },
      { timeoutMs: this.timeoutMs, maxRetries: 0 },
    );
    if (res.status === 429) {
      throw new AppError({
        code: ErrorCode.RATE_LIMITED,
        message: "Acquisition budget exceeded",
        requestId,
      });
    }
    if (!res.ok) {
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: "Web fetch search failed",
        requestId,
      });
    }
    return (await res.json()) as SearchResponseBody;
  }
}
