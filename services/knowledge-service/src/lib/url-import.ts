import { assertPublicUrl, fetchPublicText } from "@quickstart/utilities";
import { AppError, ErrorCode } from "@quickstart/errors";
import { MAX_EXTRACTED_CHARACTERS } from "./extract.js";

export const MAX_URL_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MiB
export const URL_FETCH_TIMEOUT_MS = 15_000; // 15 seconds
export const MAX_REDIRECTS = 3;

export interface UrlImportResult {
  title: string;
  url: string;
  text: string;
  charCount: number;
}

/**
 * Safely fetches a public HTTPS web page with SSRF protection, DNS pinning,
 * response bounding, and HTML boilerplate removal.
 */
export async function importPublicUrl(rawUrl: string): Promise<UrlImportResult> {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "Web page URL is required",
    });
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new AppError({
      code: "INVALID_URL" as any,
      message: "Invalid URL format. Please provide a full HTTPS URL (e.g. https://myclinic.com/faq)",
    });
  }

  if (parsed.protocol !== "https:") {
    throw new AppError({
      code: "INVALID_URL" as any,
      message: "Only public HTTPS web pages can be imported",
    });
  }

  if (parsed.username || parsed.password) {
    throw new AppError({
      code: "INVALID_URL" as any,
      message: "URLs containing embedded credentials are not allowed",
    });
  }

  if (parsed.port && parsed.port !== "443") {
    throw new AppError({
      code: "INVALID_URL" as any,
      message: "Only standard HTTPS port (443) is supported",
    });
  }

  // Pre-validate through public-web policy
  try {
    await assertPublicUrl(parsed.href);
  } catch (err) {
    throw new AppError({
      code: "FORBIDDEN_URL" as any,
      message: "Cannot import URL: The requested address is private, local, or restricted",
    });
  }

  let fetched: { text: string; finalUrl: string; contentType: string };
  try {
    fetched = await fetchPublicText(parsed.href, {
      timeoutMs: URL_FETCH_TIMEOUT_MS,
      maxBytes: MAX_URL_RESPONSE_BYTES,
      maxRedirects: MAX_REDIRECTS,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("UNSAFE_URL")) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Cannot import URL: The destination redirects to a private or restricted address",
      });
    }
    if (msg.includes("WEB_TIMEOUT") || msg.includes("timeout")) {
      throw new AppError({
        code: ErrorCode.UPSTREAM_TIMEOUT,
        message: "Cannot import URL: Request timed out while fetching the web page",
      });
    }
    if (msg.includes("WEB_TOO_LARGE")) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Cannot import URL: Web page exceeds the 5 MB download limit",
      });
    }
    if (msg.includes("WEB_HTTP_401") || msg.includes("WEB_HTTP_403")) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Cannot import URL: Page requires authentication or login",
      });
    }
    if (msg.includes("WEB_REDIRECT_LIMIT")) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Cannot import URL: Too many redirects (maximum 3 allowed)",
      });
    }
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "Cannot import URL: Failed to fetch the requested web page",
    });
  }

  const isHtml =
    fetched.contentType.includes("text/html") ||
    fetched.text.includes("<html") ||
    fetched.text.includes("<!DOCTYPE") ||
    fetched.text.includes("<body");

  let cleanedText: string;
  let pageTitle = "";

  if (isHtml) {
    pageTitle = extractHtmlTitle(fetched.text);
    cleanedText = cleanHtmlToPlainText(fetched.text);
  } else {
    cleanedText = fetched.text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  }

  if (!cleanedText) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "Cannot import URL: No extractable text content found on the page",
    });
  }

  if (cleanedText.length > MAX_EXTRACTED_CHARACTERS) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: `Extracted page text exceeds the maximum limit of ${MAX_EXTRACTED_CHARACTERS.toLocaleString()} characters`,
    });
  }

  return {
    title: pageTitle || parsed.hostname,
    url: fetched.finalUrl,
    text: cleanedText,
    charCount: cleanedText.length,
  };
}

function extractHtmlTitle(html: string): string {
  const match = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
  if (!match) return "";
  return match[1]
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Strips script, style, nav, footer, header, comments, forms, and converts HTML to clean formatted plain text.
 */
export function cleanHtmlToPlainText(html: string): string {
  let cleaned = html
    // Remove DOCTYPE, comments, scripts, styles, iframes, svgs, noscripts
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<!--[\s\S]*?-->/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    // Remove header/nav/footer boilerplate if present
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    // Replace headings, paragraphs, and list items with newlines
    .replace(/<\/(h[1-6]|p|div|section|article|li|tr)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    // Preserve link text with URL
    .replace(/<a\s+[^>]*href=["'](https?:\/\/[^"'>\s]+)["'][^>]*>([\s\S]*?)<\/a>/gi, " $2 ")
    // Strip remaining tags
    .replace(/<[^>]+>/g, " ")
    // Decode HTML entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  // Normalize consecutive whitespace while preserving paragraph breaks
  const lines = cleaned
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean);

  return lines.join("\n\n").trim();
}

export const importPublicUrlText = importPublicUrl;
