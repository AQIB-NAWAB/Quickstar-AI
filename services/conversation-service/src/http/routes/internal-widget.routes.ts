import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { requireWidgetInternalTenant } from "../../middleware/widget-internal-tenant.middleware.js";
import type { ConversationHttpContext } from "../context.js";

export const createInternalWidgetRoutes: RouteModule<ConversationHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const tenant = requireWidgetInternalTenant();
  const { internalAuth, conversationsCtrl } = ctx;

  router.post(
    "/internal/workspaces/:workspaceId/widget/conversations",
    internalAuth,
    tenant,
    asyncHandler(conversationsCtrl.createConversation),
  );
  router.get(
    "/internal/workspaces/:workspaceId/widget/conversations/:conversationId",
    internalAuth,
    tenant,
    asyncHandler(conversationsCtrl.getConversation),
  );
  router.get(
    "/internal/workspaces/:workspaceId/widget/conversations/:conversationId/messages",
    internalAuth,
    tenant,
    asyncHandler(conversationsCtrl.listMessages),
  );
  router.post(
    "/internal/workspaces/:workspaceId/widget/conversations/:conversationId/messages",
    internalAuth,
    tenant,
    asyncHandler(conversationsCtrl.appendMessage),
  );

  return router;
};
