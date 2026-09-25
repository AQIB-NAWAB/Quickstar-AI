import type { RequestHandler } from "@quickstart/http-server";
import type { IdentityServices } from "../services/index.js";
import type { ReadinessProbe } from "../controllers/health.controller.js";

export type IdentityHttpContext = {
  services: IdentityServices;
  authGuard: RequestHandler;
  authRateLimit: RequestHandler;
  readinessProbes: ReadinessProbe[];
};
