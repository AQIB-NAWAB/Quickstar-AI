import type { RequestHandler } from "@quickstart/http-server";
import type { WorkspaceAccessClient } from "@quickstart/workspace-access";
import type { ReadinessProbe } from "../controllers/health.controller.js";
import type { createEvalTurnsController } from "../controllers/eval-turns.controller.js";
import type { createGraphTurnsController } from "../controllers/graph-turns.controller.js";
import type { createTurnsController } from "../controllers/turns.controller.js";
import type { createVoiceTurnsController } from "../controllers/voice-turns.controller.js";
import type { createWidgetTurnsController } from "../controllers/widget-turns.controller.js";

export type RuntimeHttpContext = {
  readinessProbes: ReadinessProbe[];
  authGuard: RequestHandler;
  graphAuthGuard: RequestHandler;
  internalAuth: RequestHandler;
  tenantMiddleware: RequestHandler[];
  turnsCtrl: ReturnType<typeof createTurnsController>;
  widgetTurnsCtrl: ReturnType<typeof createWidgetTurnsController>;
  voiceTurnsCtrl: ReturnType<typeof createVoiceTurnsController>;
  evalTurnsCtrl: ReturnType<typeof createEvalTurnsController>;
  graphTurnsCtrl: ReturnType<typeof createGraphTurnsController>;
  workspaceAccess: WorkspaceAccessClient;
};
