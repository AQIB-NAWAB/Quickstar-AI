import type { RequestHandler } from "@quickstart/http-server";
import type { ReadinessProbe } from "../controllers/health.controller.js";
import type { createTurnsController } from "../controllers/turns.controller.js";

export type RuntimeHttpContext = {
  readinessProbes: ReadinessProbe[];
  authGuard: RequestHandler;
  tenantMiddleware: RequestHandler[];
  turnsCtrl: ReturnType<typeof createTurnsController>;
};
