import { fetchWithPolicy } from "@quickstart/utilities";
import type { AcquisitionProviderProfileConfig } from "../config/environment.js";
import { ProviderError } from "../domain/types.js";
import type { ScrapeProviderInput, ScrapeProviderOutput, SearchProviderInput } from "../domain/types.js";
import type { AcquisitionProvider } from "./types.js";

type OlostepScrapeResult = {
  markdown_content?: string | null;
  text_content?: string | null;
  html_content?: string | null;
};

type OlostepScrapeResponse = {
  result?: OlostepScrapeResult;
  scrape?: {
    result?: OlostepScrapeResult;
  };
};

export class OlostepAcquisitionProvider implements AcquisitionProvider {
  readonly profileId: string;
  readonly driver = "olostep";
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(profile: AcquisitionProviderProfileConfig, timeoutMs: number) {
    this.profileId = profile.id;
    const key = profile.apiKey;
    if (!key) {
      throw new Error(`Olostep profile ${profile.id} missing API key`);
    }
    this.apiKey = key;
    this.baseUrl = (profile.baseUrl ?? "https://api.olostep.com").replace(/\/$/, "");
    this.timeoutMs = timeoutMs;
  }

  async scrape(input: ScrapeProviderInput): Promise<ScrapeProviderOutput> {
    const response = await fetchWithPolicy(
      `${this.baseUrl}/v1/scrapes`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          url_to_scrape: input.url,
          formats: ["markdown", "text"],
          wait_before_scraping: input.renderJs ? 1500 : 0,
        }),
      },
      { timeoutMs: this.timeoutMs, maxRetries: 0 },
    );

    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      throw new ProviderError(`olostep scrape status ${response.status}`, {
        retryable,
        httpStatus: response.status,
      });
    }

    const json = (await response.json()) as OlostepScrapeResponse;
    const result = json.result ?? json.scrape?.result;
    const text =
      result?.markdown_content?.trim() ||
      result?.text_content?.trim() ||
      result?.html_content?.trim() ||
      "";

    if (!text) {
      throw new ProviderError("olostep returned empty content", { retryable: false, httpStatus: 422 });
    }

    return {
      text,
      finalUrl: input.url,
    };
  }

  async search(input: SearchProviderInput): Promise<{
    results: Array<{ url: string; title: string; snippet: string }>;
  }> {
    const response = await fetchWithPolicy(
      `${this.baseUrl}/v1/searches`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          query: input.query,
          max_results: input.maxResults,
        }),
      },
      { timeoutMs: this.timeoutMs, maxRetries: 0 },
    );

    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      throw new ProviderError(`olostep search status ${response.status}`, {
        retryable,
        httpStatus: response.status,
      });
    }

    const json = (await response.json()) as {
      results?: Array<{ url?: string; link?: string; title?: string; snippet?: string; description?: string }>;
      search?: {
        results?: Array<{ url?: string; link?: string; title?: string; snippet?: string; description?: string }>;
      };
      result?: {
        links?: Array<{ url?: string; link?: string; title?: string; snippet?: string; description?: string }>;
      };
    };
    const raw = json.results ?? json.search?.results ?? json.result?.links ?? [];
    const results = raw.slice(0, input.maxResults).flatMap((item) => {
      const url = item.url ?? item.link;
      if (!url || !/^https?:\/\//i.test(url)) return [];
      return [
        {
          url,
          title: item.title ?? "Untitled",
          snippet: item.snippet ?? item.description ?? "",
        },
      ];
    });

    return { results };
  }
}
