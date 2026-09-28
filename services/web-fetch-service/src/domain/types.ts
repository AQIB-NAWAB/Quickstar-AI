export class ProviderError extends Error {
  readonly retryable: boolean;
  readonly httpStatus?: number;

  constructor(message: string, options: { retryable: boolean; httpStatus?: number }) {
    super(message);
    this.name = "ProviderError";
    this.retryable = options.retryable;
    this.httpStatus = options.httpStatus;
  }
}

export type ProviderContext = {
  workspaceId: string;
  requestId: string;
  attempt: number;
};

export type ScrapeProviderInput = {
  url: string;
  renderJs: boolean;
  context: ProviderContext;
};

export type ScrapeProviderOutput = {
  text: string;
  title?: string;
  finalUrl?: string;
};

export type SearchProviderInput = {
  query: string;
  maxResults: number;
  context: ProviderContext;
};

export type SearchProviderOutput = {
  results: Array<{ url: string; title: string; snippet: string }>;
};
