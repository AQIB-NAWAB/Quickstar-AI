import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import type { ConversationHttpContext } from "../context.js";

export const createOperatorQueuesRoutes: RouteModule<ConversationHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const { tenantMiddleware, operatorQueuesCtrl, internalAuth } = ctx;

  if (!operatorQueuesCtrl) {
    return router;
  }

  // List operator queues in workspace
  router.get(
    "/v1/workspaces/:workspaceId/operator-queues",
    ...tenantMiddleware,
    asyncHandler(operatorQueuesCtrl.listQueues),
  );

  // Create operator queue
  router.post(
    "/v1/workspaces/:workspaceId/operator-queues",
    ...tenantMiddleware,
    asyncHandler(operatorQueuesCtrl.createQueue),
  );

  // Get specific operator queue
  router.get(
    "/v1/workspaces/:workspaceId/operator-queues/:queueId",
    ...tenantMiddleware,
    asyncHandler(operatorQueuesCtrl.getQueue),
  );

  // Update operator queue
  router.patch(
    "/v1/workspaces/:workspaceId/operator-queues/:queueId",
    ...tenantMiddleware,
    asyncHandler(operatorQueuesCtrl.updateQueue),
  );

  // Delete operator queue
  router.delete(
    "/v1/workspaces/:workspaceId/operator-queues/:queueId",
    ...tenantMiddleware,
    asyncHandler(operatorQueuesCtrl.deleteQueue),
  );

  // Enqueue conversation into queue (accessible via tenant auth or internal token from workflow runner)
  router.post(
    "/v1/workspaces/:workspaceId/operator-queues/:queueId/enqueue",
    ...tenantMiddleware,
    asyncHandler(operatorQueuesCtrl.enqueueConversation),
  );

  // Internal enqueue endpoint for workflow-service runner
  router.post(
    "/internal/v1/workspaces/:workspaceId/operator-queues/enqueue",
    internalAuth,
    asyncHandler(operatorQueuesCtrl.enqueueConversation),
  );

  // List queue items
  router.get(
    "/v1/workspaces/:workspaceId/operator-queue-items",
    ...tenantMiddleware,
    asyncHandler(operatorQueuesCtrl.listQueueItems),
  );

  router.get(
    "/v1/workspaces/:workspaceId/operator-queues/:queueId/items",
    ...tenantMiddleware,
    asyncHandler(operatorQueuesCtrl.listQueueItems),
  );

  // Claim queue item
  router.post(
    "/v1/workspaces/:workspaceId/operator-queue-items/:itemId/claim",
    ...tenantMiddleware,
    asyncHandler(operatorQueuesCtrl.claimItem),
  );

  // Resolve queue item
  router.post(
    "/v1/workspaces/:workspaceId/operator-queue-items/:itemId/resolve",
    ...tenantMiddleware,
    asyncHandler(operatorQueuesCtrl.resolveItem),
  );

  return router;
};
