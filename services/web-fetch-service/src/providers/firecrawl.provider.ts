import { fetchWithPolicy } from "@quickstart/utilities";
import type { AcquisitionProviderProfileConfig } from "../config/environment.js";
import { ProviderError } from "../domain/types.js";
import type { ScrapeProviderInput, ScrapeProviderOutput, SearchProviderInput } from "../domain/types.js";
import type { AcquisitionProvider } from "./types.js";

type FirecrawlScrapeResponse = {
  success?: boolean;
  error?: string;
  data?: {
    markdown?: string | null;
    content?: string | null;
    metadata?: {
      title?: string | null;
      url?: string | null;
      sourceURL?: string | null;
    };
  };
};

type FirecrawlSearchResponse = {
  success?: boolean;
  error?: string;
  data?: Array<{
    url?: string;
    title?: string;
    description?: string;
    markdown?: string;
  }>;
};

export class FirecrawlAcquisitionProvider implements AcquisitionProvider {
  readonly profileId: string;
  readonly driver = "firecrawl";
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(profile: AcquisitionProviderProfileConfig, timeoutMs: number) {
    this.profileId = profile.id;
    const key = profile.apiKey;
    if (!key) {
      throw new Error(`Firecrawl profile ${profile.id} missing API key`);
    }
    this.apiKey = key;
    this.baseUrl = (profile.baseUrl ?? "https://api.firecrawl.dev").replace(/\/$/, "");
    this.timeoutMs = timeoutMs;
  }

  async scrape(input: ScrapeProviderInput): Promise<ScrapeProviderOutput> {
    const response = await fetchWithPolicy(
      `${this.baseUrl}/v1/scrape`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          url: input.url,
          formats: ["markdown"],
          onlyMainContent: false,
        }),
      },
      { timeoutMs: this.timeoutMs, maxRetries: 0 },
    );

    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      throw new ProviderError(`firecrawl scrape status ${response.status}`, {
        retryable,
        httpStatus: response.status,
      });
    }

    const json = (await response.json()) as FirecrawlScrapeResponse;
    if (json.success === false) {
      throw new ProviderError(json.error ?? "firecrawl scrape failed", {
        retryable: false,
        httpStatus: 422,
      });
    }

    const text = json.data?.markdown?.trim() || json.data?.content?.trim() || "";
    if (!text) {
      throw new ProviderError("firecrawl returned empty content", {
        retryable: false,
        httpStatus: 422,
      });
    }

    const finalUrl = json.data?.metadata?.url ?? json.data?.metadata?.sourceURL ?? input.url;

    return {
      text,
      title: json.data?.metadata?.title ?? undefined,
      finalUrl,
    };
  }

  async search(input: SearchProviderInput): Promise<{
    results: Array<{ url: string; title: string; snippet: string }>;
  }> {
    const response = await fetchWithPolicy(
      `${this.baseUrl}/v1/search`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          query: input.query,
          limit: input.maxResults,
        }),
      },
      { timeoutMs: this.timeoutMs, maxRetries: 0 },
    );

    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      throw new ProviderError(`firecrawl search status ${response.status}`, {
        retryable,
        httpStatus: response.status,
      });
    }

    const json = (await response.json()) as FirecrawlSearchResponse;
    const raw = json.data ?? [];
    const results = raw.slice(0, input.maxResults).flatMap((item) => {
      const url = item.url;
      if (!url || !/^https?:\/\//i.test(url)) return [];
      return [
        {
          url,
          title: item.title ?? "Untitled",
          snippet: item.description ?? (item.markdown ? item.markdown.slice(0, 300) : ""),
        },
      ];
    });

    return { results };
  }
}
