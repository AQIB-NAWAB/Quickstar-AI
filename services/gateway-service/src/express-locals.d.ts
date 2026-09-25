import type { VerifiedAccessToken } from "./middleware/require-access-token.js";

declare global {
  namespace Express {
    interface Locals {
      requestId?: string;
      accessToken?: VerifiedAccessToken;
      rawBearerToken?: string;
    }
  }
}

export {};
