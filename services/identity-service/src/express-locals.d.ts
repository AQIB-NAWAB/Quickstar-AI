import type { IdentityAuthContext } from "./middleware/auth.middleware.js";

declare global {
  namespace Express {
    interface Locals {
      identityAuth?: IdentityAuthContext;
    }
  }
}

export {};
