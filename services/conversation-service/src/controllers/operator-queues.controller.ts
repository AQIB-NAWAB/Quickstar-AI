import type { Request, Response } from "express";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { OperatorQueuesService } from "../services/operator-queues.service.js";

export function createOperatorQueuesController(service: OperatorQueuesService) {
  return {
    async listQueues(req: Request, res: Response): Promise<void> {
      const workspaceId = req.params.workspaceId as string;
      const queues = await service.listQueues(workspaceId);
      res.json({ data: queues, total: queues.length });
    },

    async getQueue(req: Request, res: Response): Promise<void> {
      const workspaceId = req.params.workspaceId as string;
      const queueId = req.params.queueId as string;
      const queue = await service.getQueue(workspaceId, queueId);
      res.json({ data: queue });
    },

    async createQueue(req: Request, res: Response): Promise<void> {
      const workspaceId = req.params.workspaceId as string;
      const queue = await service.createQueue(workspaceId, req.body ?? {});
      res.status(201).json({ data: queue });
    },

    async updateQueue(req: Request, res: Response): Promise<void> {
      const workspaceId = req.params.workspaceId as string;
      const queueId = req.params.queueId as string;
      const queue = await service.updateQueue(workspaceId, queueId, req.body ?? {});
      res.json({ data: queue });
    },

    async deleteQueue(req: Request, res: Response): Promise<void> {
      const workspaceId = req.params.workspaceId as string;
      const queueId = req.params.queueId as string;
      await service.deleteQueue(workspaceId, queueId);
      res.status(204).send();
    },

    async enqueueConversation(req: Request, res: Response): Promise<void> {
      const workspaceId = req.params.workspaceId as string;
      const queueId = (req.params.queueId || req.body?.queueId) as string;
      const conversationId = (req.params.conversationId || req.body?.conversationId) as string;

      if (!conversationId) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "conversationId is required",
        });
      }

      const record = await service.enqueueConversation(workspaceId, {
        conversationId,
        queueId,
        priority: req.body?.priority,
        reason: req.body?.reason,
        internalNote: req.body?.internalNote,
        visitorMessage: req.body?.visitorMessage,
        workflowRunId: req.body?.workflowRunId,
      });

      res.status(201).json({ data: record });
    },

    async listQueueItems(req: Request, res: Response): Promise<void> {
      const workspaceId = req.params.workspaceId as string;
      const queueId = req.params.queueId as string | undefined;
      const status = req.query.status as string | undefined;
      const items = await service.listQueueItems(workspaceId, queueId, status);
      res.json({ data: items, total: items.length });
    },

    async claimItem(req: Request, res: Response): Promise<void> {
      const workspaceId = req.params.workspaceId as string;
      const itemId = req.params.itemId as string;
      const operatorId = (req.body?.operatorId || (req as unknown as { auth?: { sub?: string } }).auth?.sub) as string;

      if (!operatorId) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "operatorId is required to claim conversation",
        });
      }

      const item = await service.claimConversation(workspaceId, itemId, operatorId);
      res.json({ data: item });
    },

    async resolveItem(req: Request, res: Response): Promise<void> {
      const workspaceId = req.params.workspaceId as string;
      const itemId = req.params.itemId as string;
      const returnToBot = Boolean(req.body?.returnToBot);

      const item = await service.resolveConversation(workspaceId, itemId, returnToBot);
      res.json({ data: item });
    },
  };
}

export type OperatorQueuesController = ReturnType<typeof createOperatorQueuesController>;
