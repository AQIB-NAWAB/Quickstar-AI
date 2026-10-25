import { fetchWithPolicy } from "@quickstart/utilities";
import type { AcquisitionProviderProfileConfig } from "../config/environment.js";
import { ProviderError } from "../domain/types.js";
import type { ScrapeProviderInput, ScrapeProviderOutput } from "../domain/types.js";
import type { AcquisitionProvider } from "./types.js";

type ApifyWebFetchItem = {
  url?: string;
  markdown?: string | null;
  text?: string | null;
  content?: string | null;
  metadata?: {
    canonicalUrl?: string | null;
    title?: string | null;
    description?: string | null;
    languageCode?: string | null;
  };
  fetch?: {
    httpStatusCode?: number;
    loadedUrl?: string;
  };
};

export class ApifyAcquisitionProvider implements AcquisitionProvider {
  readonly profileId: string;
  readonly driver = "apify";
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(profile: AcquisitionProviderProfileConfig, timeoutMs: number) {
    this.profileId = profile.id;
    const key = profile.apiKey;
    if (!key) {
      throw new Error(`Apify profile ${profile.id} missing API key`);
    }
    this.apiKey = key;
    this.baseUrl = (profile.baseUrl ?? "https://api.apify.com").replace(/\/$/, "");
    this.timeoutMs = timeoutMs;
  }

  async scrape(input: ScrapeProviderInput): Promise<ScrapeProviderOutput> {
    // Apify official web-fetch actor: fast, renders pages, bypasses anti-bot/Cloudflare, returns LLM markdown
    const endpoint = `${this.baseUrl}/v2/acts/apify~web-fetch/run-sync-get-dataset-items?token=${encodeURIComponent(this.apiKey)}`;

    const response = await fetchWithPolicy(
      endpoint,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          url: input.url,
        }),
      },
      { timeoutMs: this.timeoutMs, maxRetries: 0 },
    );

    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      throw new ProviderError(`apify scrape status ${response.status}`, {
        retryable,
        httpStatus: response.status,
      });
    }

    const items = (await response.json()) as ApifyWebFetchItem[];
    if (!Array.isArray(items) || items.length === 0) {
      throw new ProviderError("apify returned empty dataset", {
        retryable: false,
        httpStatus: 422,
      });
    }

    const item = items[0];
    const text = item.markdown?.trim() || item.text?.trim() || item.content?.trim() || "";
    if (!text) {
      throw new ProviderError("apify returned empty content for url", {
        retryable: false,
        httpStatus: 422,
      });
    }

    const finalUrl = item.metadata?.canonicalUrl ?? item.fetch?.loadedUrl ?? item.url ?? input.url;

    return {
      text,
      title: item.metadata?.title ?? undefined,
      finalUrl,
    };
  }

  async search(input: import("../domain/types.js").SearchProviderInput): Promise<import("../domain/types.js").SearchProviderOutput> {
    const endpoint = `${this.baseUrl}/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=${encodeURIComponent(this.apiKey)}`;

    const response = await fetchWithPolicy(
      endpoint,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          queries: input.query,
          maxPagesPerQuery: 1,
          resultsPerPage: Math.min(input.maxResults, 10),
        }),
      },
      { timeoutMs: this.timeoutMs, maxRetries: 0 },
    );

    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      throw new ProviderError(`apify search status ${response.status}`, {
        retryable,
        httpStatus: response.status,
      });
    }

    const items = (await response.json()) as Array<{
      organicResults?: Array<{ url?: string; title?: string; description?: string }>;
    }>;

    const results: Array<{ url: string; title: string; snippet: string }> = [];
    if (Array.isArray(items)) {
      for (const item of items) {
        for (const org of item.organicResults ?? []) {
          if (org.url) {
            results.push({
              url: org.url,
              title: org.title ?? "",
              snippet: org.description ?? "",
            });
          }
        }
      }
    }

    return { results: results.slice(0, input.maxResults) };
  }

  async enrichBusinessProfile(input: {
    businessName: string;
    location?: string;
    website?: string;
  }): Promise<EnrichedBusinessProfile | null> {
    const query = `${input.businessName} ${input.location ?? ""}`.trim();
    const endpoint = `${this.baseUrl}/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?token=${encodeURIComponent(this.apiKey)}&timeout=25`;

    try {
      const response = await fetchWithPolicy(
        endpoint,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            searchStringsArray: [query],
            maxCrawledPlacesPerSearch: 1,
            language: "en",
          }),
        },
        { timeoutMs: 30000, maxRetries: 0 },
      );

      if (!response.ok) {
        return null;
      }

      const items = (await response.json()) as any[];
      if (!Array.isArray(items) || items.length === 0) {
        return null;
      }

      const item = items[0];
      return {
        title: item.title ?? undefined,
        address: item.address ?? undefined,
        street: item.street ?? undefined,
        city: item.city ?? undefined,
        state: item.state ?? undefined,
        postalCode: item.postalCode ?? undefined,
        countryCode: item.countryCode ?? undefined,
        phone: item.phone ?? item.phoneUnformatted ?? undefined,
        website: item.website ?? undefined,
        categoryName: item.categoryName ?? undefined,
        categories: Array.isArray(item.categories) ? item.categories : undefined,
        totalScore: typeof item.totalScore === "number" ? item.totalScore : undefined,
        reviewsCount: typeof item.reviewsCount === "number" ? item.reviewsCount : undefined,
        instagram: typeof item.instagram === "string" ? item.instagram : undefined,
      };
    } catch {
      return null;
    }
  }
}

export type EnrichedBusinessProfile = {
  title?: string;
  address?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  countryCode?: string;
  phone?: string;
  website?: string;
  categoryName?: string;
  categories?: string[];
  totalScore?: number;
  reviewsCount?: number;
  instagram?: string;
};
