declare global {
  namespace Express {
    interface Locals {
      requestId: string;
      requestTimedOut?: boolean;
    }
  }
}

export {};
