/** Shared types for web-fetch internal API (Feature 10B). */

export type FetchAction = "scrape" | "crawl" | "search";

/** @deprecated Use FetchAction */
export type AcquisitionAction = FetchAction;

export type FetchJobStatus = "queued" | "running" | "ready" | "failed";

/** @deprecated Use FetchJobStatus */
export type AcquisitionJobStatus = FetchJobStatus;

export type FetchUsage = {
  action: FetchAction;
  units: number;
  estimated_cost_micros: number;
};

/** @deprecated Use FetchUsage */
export type AcquisitionUsage = FetchUsage;

export type ScrapeRequestBody = {
  workspace_id: string;
  request_id: string;
  idempotency_key?: string;
  url: string;
  render_js?: boolean;
};

export type ScrapeResponseBody = {
  text: string;
  title?: string;
  final_url?: string;
  provider: string;
  usage: FetchUsage;
  latency_ms: number;
};

export type CrawlRequestBody = {
  workspace_id: string;
  request_id: string;
  idempotency_key: string;
  seed_url: string;
  max_depth?: number;
  max_pages?: number;
  render_js?: boolean;
};

export type CrawlResponseBody = {
  job_id: string;
  status: FetchJobStatus;
};

export type SearchRequestBody = {
  workspace_id: string;
  request_id: string;
  query: string;
  max_results?: number;
};

export type SearchResultItem = {
  url: string;
  title: string;
  snippet: string;
};

export type SearchResponseBody = {
  results: SearchResultItem[];
  provider: string;
  usage: FetchUsage;
  latency_ms: number;
};

export type JobGetResponseBody = {
  job_id: string;
  workspace_id: string;
  status: FetchJobStatus;
  pages_fetched: number;
  error_code?: string;
  artifact_length: number;
  artifact_preview?: string;
};
