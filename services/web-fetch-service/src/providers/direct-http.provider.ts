import { fetchWithPolicy } from "@quickstart/utilities";
import type { AcquisitionProviderProfileConfig, WebFetchConfig } from "../config/environment.js";
import { ProviderError } from "../domain/types.js";
import type { ScrapeProviderInput, ScrapeProviderOutput } from "../domain/types.js";
import { extractTitle, htmlToPlainText } from "../lib/html-to-text.js";
import type { AcquisitionProvider } from "./types.js";

export class DirectHttpAcquisitionProvider implements AcquisitionProvider {
  readonly profileId: string;
  readonly driver = "direct_http";

  constructor(
    profile: AcquisitionProviderProfileConfig,
    private readonly config: WebFetchConfig,
  ) {
    this.profileId = profile.id;
  }

  async scrape(input: ScrapeProviderInput): Promise<ScrapeProviderOutput> {
    if (input.renderJs) {
      throw new ProviderError("direct_http cannot render JavaScript", {
        retryable: false,
        httpStatus: 400,
      });
    }

    try {
      const response = await fetchWithPolicy(
        input.url,
        {
          method: "GET",
          headers: {
            "user-agent": "QuickStart-WebFetch/1.0",
            accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
          },
          redirect: "follow",
        },
        { timeoutMs: this.config.scrapeTimeoutMs, maxRetries: 0 },
      );

      if (!response.ok) {
        throw new ProviderError(`direct_http status ${response.status}`, {
          retryable: response.status === 429 || response.status >= 500,
          httpStatus: response.status,
        });
      }

      const contentType = response.headers.get("content-type") ?? "";
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > this.config.directHttpMaxBytes) {
        throw new ProviderError("response too large", { retryable: false, httpStatus: 413 });
      }

      const body = new TextDecoder("utf-8", { fatal: false }).decode(buffer);

      if (contentType.includes("text/html") || body.trimStart().startsWith("<")) {
        const text = htmlToPlainText(body);
        if (!text) {
          throw new ProviderError("empty html body", { retryable: false, httpStatus: 422 });
        }
        return {
          text,
          title: extractTitle(body),
          finalUrl: response.url,
        };
      }

      if (contentType.includes("text/plain") || !contentType.includes("/")) {
        const text = body.trim();
        if (!text) {
          throw new ProviderError("empty text body", { retryable: false, httpStatus: 422 });
        }
        return { text, finalUrl: response.url };
      }

      throw new ProviderError("unsupported content type for direct_http", {
        retryable: false,
        httpStatus: 415,
      });
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }
      throw new ProviderError("direct_http fetch failed", { retryable: true });
    }
  }
}
