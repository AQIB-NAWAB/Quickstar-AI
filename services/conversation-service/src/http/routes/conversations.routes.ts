import { WORKSPACE_PERMISSIONS } from "@quickstart/contracts";
import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { requireWorkspacePermission } from "../../middleware/require-workspace-permission.middleware.js";
import type { ConversationHttpContext } from "../context.js";

export const createConversationsRoutes: RouteModule<ConversationHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const { tenantMiddleware, workspaceAccess, conversationsCtrl } = ctx;
  const chain = tenantMiddleware;

  router.post(
    "/v1/workspaces/:workspaceId/conversations",
    ...chain,
    requireWorkspacePermission(workspaceAccess, WORKSPACE_PERMISSIONS.CONVERSATION_PARTICIPATE),
    asyncHandler(conversationsCtrl.createConversation),
  );

  router.get(
    "/v1/workspaces/:workspaceId/conversations",
    ...chain,
    requireWorkspacePermission(workspaceAccess, WORKSPACE_PERMISSIONS.CONVERSATION_READ),
    asyncHandler(conversationsCtrl.listConversations),
  );

  router.post(
    "/v1/workspaces/:workspaceId/conversations/:conversationId/take",
    ...chain,
    requireWorkspacePermission(workspaceAccess, WORKSPACE_PERMISSIONS.CONVERSATION_HANDOFF),
    asyncHandler(conversationsCtrl.takeHandoff),
  );

  router.post(
    "/v1/workspaces/:workspaceId/conversations/:conversationId/release",
    ...chain,
    requireWorkspacePermission(workspaceAccess, WORKSPACE_PERMISSIONS.CONVERSATION_HANDOFF),
    asyncHandler(conversationsCtrl.releaseHandoff),
  );

  router.get(
    "/v1/workspaces/:workspaceId/conversations/:conversationId",
    ...chain,
    requireWorkspacePermission(workspaceAccess, WORKSPACE_PERMISSIONS.CONVERSATION_READ),
    asyncHandler(conversationsCtrl.getConversation),
  );

  router.post(
    "/v1/workspaces/:workspaceId/conversations/:conversationId/messages",
    ...chain,
    requireWorkspacePermission(workspaceAccess, WORKSPACE_PERMISSIONS.CONVERSATION_PARTICIPATE),
    asyncHandler(conversationsCtrl.appendMessage),
  );

  router.get(
    "/v1/workspaces/:workspaceId/conversations/:conversationId/messages",
    ...chain,
    requireWorkspacePermission(workspaceAccess, WORKSPACE_PERMISSIONS.CONVERSATION_READ),
    asyncHandler(conversationsCtrl.listMessages),
  );

  router.put(
    "/v1/workspaces/:workspaceId/conversations/:conversationId/tool-calls",
    ...chain,
    requireWorkspacePermission(workspaceAccess, WORKSPACE_PERMISSIONS.TOOLS_RUN),
    asyncHandler(conversationsCtrl.upsertToolCall),
  );

  router.get(
    "/v1/workspaces/:workspaceId/conversations/:conversationId/tool-calls",
    ...chain,
    requireWorkspacePermission(workspaceAccess, WORKSPACE_PERMISSIONS.TOOLS_RUN),
    asyncHandler(conversationsCtrl.listToolCalls),
  );

  return router;
};
