import { requestIdFromResponse, sendPlatformJson, type RequestHandler } from "@quickstart/http-server";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { QueuePriority } from "@quickstart/contracts";
import type { OperatorQueuesService } from "../services/operator-queues.service.js";

export function createOperatorQueuesController(service: OperatorQueuesService) {
  return {
    listQueues: (async (req, res) => {
      const workspaceId = String(req.params.workspaceId ?? "");
      const queues = await service.listQueues(workspaceId);
      sendPlatformJson(res, 200, { data: queues, total: queues.length });
    }) as RequestHandler,

    getQueue: (async (req, res) => {
      const workspaceId = String(req.params.workspaceId ?? "");
      const queueId = String(req.params.queueId ?? "");
      const queue = await service.getQueue(workspaceId, queueId);
      sendPlatformJson(res, 200, { data: queue });
    }) as RequestHandler,

    createQueue: (async (req, res) => {
      const workspaceId = String(req.params.workspaceId ?? "");
      const body = (req.body ?? {}) as Record<string, unknown>;
      const queue = await service.createQueue(workspaceId, body as never);
      sendPlatformJson(res, 201, { data: queue });
    }) as RequestHandler,

    updateQueue: (async (req, res) => {
      const workspaceId = String(req.params.workspaceId ?? "");
      const queueId = String(req.params.queueId ?? "");
      const body = (req.body ?? {}) as Record<string, unknown>;
      const queue = await service.updateQueue(workspaceId, queueId, body as never);
      sendPlatformJson(res, 200, { data: queue });
    }) as RequestHandler,

    deleteQueue: (async (req, res) => {
      const workspaceId = String(req.params.workspaceId ?? "");
      const queueId = String(req.params.queueId ?? "");
      await service.deleteQueue(workspaceId, queueId);
      sendPlatformJson(res, 200, { ok: true });
    }) as RequestHandler,

    enqueueConversation: (async (req, res) => {
      const workspaceId = String(req.params.workspaceId ?? "");
      const body = (req.body ?? {}) as Record<string, unknown>;
      const queueId = String(req.params.queueId || body?.queueId || "");
      const conversationId = String(req.params.conversationId || body?.conversationId || "");

      if (!conversationId) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "conversationId is required",
          requestId: requestIdFromResponse(res),
        });
      }

      const record = await service.enqueueConversation(workspaceId, {
        conversationId,
        queueId,
        priority: body?.priority as QueuePriority | undefined,
        reason: body?.reason as string | undefined,
        internalNote: body?.internalNote as string | undefined,
        visitorMessage: body?.visitorMessage as string | undefined,
        workflowRunId: body?.workflowRunId as string | undefined,
      });

      sendPlatformJson(res, 201, { data: record });
    }) as RequestHandler,

    listQueueItems: (async (req, res) => {
      const workspaceId = String(req.params.workspaceId ?? "");
      const queueId = req.params.queueId ? String(req.params.queueId) : undefined;
      const status = req.query.status ? String(req.query.status) : undefined;
      const items = await service.listQueueItems(workspaceId, queueId, status);
      sendPlatformJson(res, 200, { data: items, total: items.length });
    }) as RequestHandler,

    claimItem: (async (req, res) => {
      const workspaceId = String(req.params.workspaceId ?? "");
      const itemId = String(req.params.itemId ?? "");
      const body = (req.body ?? {}) as Record<string, unknown>;
      const operatorId = String(body?.operatorId || res.locals?.actorUserId || "");

      if (!operatorId) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "operatorId is required to claim conversation",
          requestId: requestIdFromResponse(res),
        });
      }

      const item = await service.claimConversation(workspaceId, itemId, operatorId);
      sendPlatformJson(res, 200, { data: item });
    }) as RequestHandler,

    resolveItem: (async (req, res) => {
      const workspaceId = String(req.params.workspaceId ?? "");
      const itemId = String(req.params.itemId ?? "");
      const body = (req.body ?? {}) as Record<string, unknown>;
      const returnToBot = Boolean(body?.returnToBot);

      const item = await service.resolveConversation(workspaceId, itemId, returnToBot);
      sendPlatformJson(res, 200, { data: item });
    }) as RequestHandler,
  };
}

export type OperatorQueuesController = ReturnType<typeof createOperatorQueuesController>;
