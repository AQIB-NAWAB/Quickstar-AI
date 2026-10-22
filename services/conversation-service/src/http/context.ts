import type { RequestHandler } from "@quickstart/http-server";
import type { createConversationsController } from "../controllers/conversations.controller.js";
import type { OperatorQueuesController } from "../controllers/operator-queues.controller.js";
import type { ReadinessProbe } from "../controllers/health.controller.js";
import type { WorkspaceAccessClient } from "../lib/workspace-access-client.js";

export type ConversationHttpContext = {
  readinessProbes: ReadinessProbe[];
  authGuard: RequestHandler;
  internalAuth: RequestHandler;
  tenantMiddleware: RequestHandler[];
  workspaceAccess: WorkspaceAccessClient;
  conversationsCtrl: ReturnType<typeof createConversationsController>;
  operatorQueuesCtrl?: OperatorQueuesController;
};
