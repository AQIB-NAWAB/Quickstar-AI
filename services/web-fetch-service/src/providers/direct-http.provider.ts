import { fetchPublicText } from "@quickstart/utilities";
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
      const response = await fetchPublicText(input.url, {
        timeoutMs: this.config.scrapeTimeoutMs,
        maxBytes: this.config.directHttpMaxBytes,
      });
      const contentType = response.contentType;
      const body = response.text;

      if (contentType.includes("text/html") || body.trimStart().startsWith("<")) {
        const text = htmlToPlainText(body);
        if (!text) {
          throw new ProviderError("empty html body", { retryable: false, httpStatus: 422 });
        }
        return {
          text,
          title: extractTitle(body),
          finalUrl: response.finalUrl,
        };
      }

      if (contentType.includes("text/plain") || !contentType.includes("/")) {
        const text = body.trim();
        if (!text) {
          throw new ProviderError("empty text body", { retryable: false, httpStatus: 422 });
        }
        return { text, finalUrl: response.finalUrl };
      }

      throw new ProviderError("unsupported content type for direct_http", {
        retryable: false,
        httpStatus: 415,
      });
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : "";
      const status = /^WEB_HTTP_(\d+)$/.exec(message);
      if (status) {
        const httpStatus = Number(status[1]);
        throw new ProviderError("direct_http upstream status", {
          retryable: httpStatus === 429 || httpStatus >= 500,
          httpStatus,
        });
      }
      if (
        ["UNSAFE_URL", "WEB_TOO_LARGE", "WEB_REDIRECT_LIMIT", "WEB_INVALID_REDIRECT"].includes(
          message,
        )
      ) {
        throw new ProviderError("direct_http rejected unsafe or oversized response", {
          retryable: false,
          httpStatus: 400,
        });
      }
      throw new ProviderError("direct_http fetch failed", { retryable: true });
    }
  }
}
