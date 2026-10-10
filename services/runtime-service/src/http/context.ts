import type { RequestHandler } from "@quickstart/http-server";
import type { WorkspaceAccessClient } from "@quickstart/workspace-access";
import type { ReadinessProbe } from "../controllers/health.controller.js";
import type { createTurnsController } from "../controllers/turns.controller.js";
import type { createWidgetTurnsController } from "../controllers/widget-turns.controller.js";

export type RuntimeHttpContext = {
  readinessProbes: ReadinessProbe[];
  authGuard: RequestHandler;
  internalAuth: RequestHandler;
  tenantMiddleware: RequestHandler[];
  turnsCtrl: ReturnType<typeof createTurnsController>;
  widgetTurnsCtrl: ReturnType<typeof createWidgetTurnsController>;
  workspaceAccess: WorkspaceAccessClient;
};
