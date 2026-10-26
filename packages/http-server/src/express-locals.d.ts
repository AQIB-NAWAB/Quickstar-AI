declare global {
  namespace Express {
    interface Locals {
      requestId: string;
      requestTimedOut?: boolean;
    }
    interface Request {
      /** Exact request bytes, captured for webhook signature verification. */
      rawBody?: string;
    }
  }
}

export {};
