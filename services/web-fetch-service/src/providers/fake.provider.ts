import { ProviderError } from "../domain/types.js";
import type { ScrapeProviderInput, ScrapeProviderOutput, SearchProviderInput } from "../domain/types.js";
import type { AcquisitionProvider } from "./types.js";

const callCounts = new Map<string, number>();

function bumpAttempt(requestId: string): number {
  const next = (callCounts.get(requestId) ?? 0) + 1;
  callCounts.set(requestId, next);
  return next;
}

export function resetFakeAcquisitionState(): void {
  callCounts.clear();
}

export class FakeAcquisitionProvider implements AcquisitionProvider {
  readonly driver = "fake";

  constructor(readonly profileId = "fake") {}

  async scrape(input: ScrapeProviderInput): Promise<ScrapeProviderOutput> {
    const attempt = bumpAttempt(input.context.requestId);
    const url = input.url;

    if (this.profileId === "fake_fail") {
      throw new ProviderError("fake_fail profile", { retryable: false, httpStatus: 502 });
    }

    if (url.includes("fake-hang")) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    if (url.includes("fake-fail")) {
      throw new ProviderError("fake scrape failure", { retryable: false, httpStatus: 502 });
    }

    if (url.includes("fake-429-once") && attempt === 1) {
      throw new ProviderError("fake rate limit", { retryable: true, httpStatus: 429 });
    }

    if (url.includes("fake-empty")) {
      return { text: "", finalUrl: url };
    }

    return {
      text: `fake-content:${url}`,
      title: "Fake Page",
      finalUrl: url,
    };
  }

  async search(input: SearchProviderInput): Promise<{ results: Array<{ url: string; title: string; snippet: string }> }> {
    const q = input.query;
    return {
      results: [
        {
          url: `https://example.com/search?q=${encodeURIComponent(q)}`,
          title: `Result for ${q}`,
          snippet: `fake snippet for ${q}`,
        },
      ],
    };
  }
}
