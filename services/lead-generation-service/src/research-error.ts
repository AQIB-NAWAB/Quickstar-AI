export class ResearchError extends Error {
  constructor(
    readonly code: string,
    readonly retryable = false,
    readonly retryAfter = 0,
  ) {
    super(code);
  }
}
