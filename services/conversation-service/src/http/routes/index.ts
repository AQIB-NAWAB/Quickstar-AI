import { createApiRouter, type Router } from "@quickstart/http-server";
import type { ConversationHttpContext } from "../context.js";
import { createConversationsRoutes } from "./conversations.routes.js";
import { createHealthRoutes } from "./health.routes.js";
import { createInternalWidgetRoutes } from "./internal-widget.routes.js";
import { createOperatorQueuesRoutes } from "./operator-queues.routes.js";

const conversationRouteModules = [
  createHealthRoutes,
  createInternalWidgetRoutes,
  createConversationsRoutes,
  createOperatorQueuesRoutes,
] as const;

export function createConversationApiRouter(context: ConversationHttpContext): Router {
  return createApiRouter(context, conversationRouteModules);
}
