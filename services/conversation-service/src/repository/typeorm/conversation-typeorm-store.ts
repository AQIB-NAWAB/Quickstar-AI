import { randomUUID } from "node:crypto";
import type { DataSource } from "typeorm";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { Conversation, Message } from "../../domain/types.js";
import type {
  AppendMessageInput,
  AppendMessageResult,
  ConversationStore,
  CreateConversationInput,
  ListConversationsOptions,
  ListMessagesInput,
  UpsertToolCallInput,
} from "../types.js";
import type { WorkspaceRole } from "@quickstart/contracts";
import { DEFAULT_CONVERSATION_STATE } from "../../domain/conversation-state.js";
import type { ToolCall } from "../../domain/tool-call.js";
import { mapToolCallRow } from "../tool-call-mapper.js";
import { ConversationEntity, MessageEntity } from "../entities/index.js";
import {
  isUniqueViolation,
  mapConversationDatastoreError,
} from "../../utils/database-error.js";
import { toConversation, toMessage } from "./mappers.js";

function deduplicatedMessage(existing: MessageEntity, workspaceId: string): AppendMessageResult {
  if (existing.workspaceId !== workspaceId) {
    throw new AppError({
      code: ErrorCode.NOT_FOUND,
      message: "Conversation not found",
    });
  }
  return { message: toMessage(existing), deduplicated: true };
}

export function createTypeOrmConversationStore(dataSource: DataSource): ConversationStore {
  return {
    async createConversation(input: CreateConversationInput): Promise<Conversation> {
      const now = new Date();
      const entity = dataSource.manager.create(ConversationEntity, {
        id: randomUUID(),
        workspaceId: input.workspaceId,
        agentId: input.agentId ?? null,
        subjectKey: input.subjectKey ?? null,
        state: DEFAULT_CONVERSATION_STATE,
        assigneeUserId: null,
        lastSeq: 0,
        createdAt: now,
        updatedAt: now,
      });
      await dataSource.manager.save(entity);
      return toConversation(entity);
    },

    async getConversation(workspaceId: string, conversationId: string): Promise<Conversation | null> {
      const entity = await dataSource.manager.findOne(ConversationEntity, {
        where: { id: conversationId, workspaceId },
      });
      return entity ? toConversation(entity) : null;
    },

    async listConversations(
      workspaceId: string,
      options: ListConversationsOptions = {},
    ): Promise<Conversation[]> {
      const limit = options.limit ?? 50;
      const where: { workspaceId: string; state?: string } = { workspaceId };
      if (options.state) {
        where.state = options.state;
      }
      const entities = await dataSource.manager.find(ConversationEntity, {
        where,
        order: { updatedAt: "DESC" },
        take: limit,
      });
      return entities.map(toConversation);
    },

    async takeHandoff(
      workspaceId: string,
      conversationId: string,
      assigneeUserId: string,
    ): Promise<Conversation> {
      const rows = await dataSource.query(
        `UPDATE conversations
         SET state = 'human', assignee_user_id = $3, updated_at = NOW()
         WHERE id = $1 AND workspace_id = $2 AND state IN ('bot', 'waiting')
         RETURNING *`,
        [conversationId, workspaceId, assigneeUserId],
      );
      if (!rows.length) {
        const existing = await dataSource.manager.findOne(ConversationEntity, {
          where: { id: conversationId, workspaceId },
        });
        if (!existing) {
          throw new AppError({
            code: ErrorCode.NOT_FOUND,
            message: "Conversation not found",
          });
        }
        throw new AppError({
          code: ErrorCode.CONFLICT,
          message: "Conversation is already assigned or not available for handoff",
        });
      }
      const updated = await dataSource.manager.findOne(ConversationEntity, {
        where: { id: conversationId, workspaceId },
      });
      return toConversation(updated!);
    },

    async releaseHandoff(
      workspaceId: string,
      conversationId: string,
      actorUserId: string,
      actorRole: WorkspaceRole,
    ): Promise<Conversation> {
      const isAdmin = actorRole === "owner" || actorRole === "admin";
      const rows = await dataSource.query(
        `UPDATE conversations
         SET state = 'bot', assignee_user_id = NULL, updated_at = NOW()
         WHERE id = $1 AND workspace_id = $2 AND state = 'human'
           AND ($4::boolean OR assignee_user_id = $3)
         RETURNING *`,
        [conversationId, workspaceId, actorUserId, isAdmin],
      );
      if (!rows.length) {
        const existing = await dataSource.manager.findOne(ConversationEntity, {
          where: { id: conversationId, workspaceId },
        });
        if (!existing) {
          throw new AppError({
            code: ErrorCode.NOT_FOUND,
            message: "Conversation not found",
          });
        }
        if (existing.state !== "human") {
          throw new AppError({
            code: ErrorCode.CONFLICT,
            message: "Conversation is not in human handoff",
          });
        }
        throw new AppError({
          code: ErrorCode.FORBIDDEN,
          message: "Only the assignee or an admin can release this conversation",
        });
      }
      const updated = await dataSource.manager.findOne(ConversationEntity, {
        where: { id: conversationId, workspaceId },
      });
      return toConversation(updated!);
    },

    async appendMessage(input: AppendMessageInput): Promise<AppendMessageResult> {
      try {
        return await dataSource.transaction(async (manager) => {
          const existing = await manager.findOne(MessageEntity, {
            where: { conversationId: input.conversationId, idempotencyKey: input.idempotencyKey },
          });
          if (existing) {
            return deduplicatedMessage(existing, input.workspaceId);
          }

          const rawResult = await manager.query(
            `UPDATE conversations
             SET last_seq = last_seq + 1, updated_at = NOW()
             WHERE id = $1 AND workspace_id = $2
             RETURNING last_seq`,
            [input.conversationId, input.workspaceId],
          );

          const rows = Array.isArray(rawResult) && Array.isArray(rawResult[0])
            ? rawResult[0]
            : Array.isArray(rawResult)
              ? rawResult
              : [];

          if (rows.length === 0 || rows[0]?.last_seq === undefined) {
            throw new AppError({
              code: ErrorCode.NOT_FOUND,
              message: "Conversation not found",
            });
          }

          const newSeq = Number(rows[0].last_seq);
          const now = new Date();
          const msgEntity = manager.create(MessageEntity, {
            id: randomUUID(),
            workspaceId: input.workspaceId,
            conversationId: input.conversationId,
            seq: newSeq,
            senderType: input.senderType,
            senderId: input.senderId,
            text: input.text,
            idempotencyKey: input.idempotencyKey,
            metadata: input.metadata ?? null,
            createdAt: now,
          });

          await manager.save(msgEntity);
          return { message: toMessage(msgEntity), deduplicated: false };
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          const existing = await dataSource.manager.findOne(MessageEntity, {
            where: {
              conversationId: input.conversationId,
              idempotencyKey: input.idempotencyKey,
            },
          });
          if (existing) {
            return deduplicatedMessage(existing, input.workspaceId);
          }
        }
        throw mapConversationDatastoreError(error);
      }
    },

    async listMessages(input: ListMessagesInput): Promise<Message[]> {
      // Must verify conversation exists in this workspace first (fail-closed IDOR protection)
      const conv = await dataSource.manager.findOne(ConversationEntity, {
        where: { id: input.conversationId, workspaceId: input.workspaceId },
      });
      if (!conv) {
        throw new AppError({
          code: ErrorCode.NOT_FOUND,
          message: "Conversation not found",
        });
      }

      const qb = dataSource.manager
        .createQueryBuilder(MessageEntity, "m")
        .where("m.workspace_id = :workspaceId AND m.conversation_id = :conversationId", {
          workspaceId: input.workspaceId,
          conversationId: input.conversationId,
        });

      if (typeof input.afterSeq === "number") {
        qb.andWhere("m.seq > :afterSeq", { afterSeq: input.afterSeq });
      }

      qb.orderBy("m.seq", "ASC");
      if (input.limit) {
        qb.take(input.limit);
      }

      const entities = await qb.getMany();
      return entities.map(toMessage);
    },

    async upsertToolCall(input: UpsertToolCallInput): Promise<{ record: ToolCall; created: boolean }> {
      const conv = await dataSource.manager.findOne(ConversationEntity, {
        where: { id: input.conversationId, workspaceId: input.workspaceId },
      });
      if (!conv) {
        throw new AppError({
          code: ErrorCode.NOT_FOUND,
          message: "Conversation not found",
        });
      }

      const existingRows = await dataSource.query(
        `SELECT * FROM tool_calls WHERE workspace_id = $1 AND tool_call_key = $2`,
        [input.workspaceId, input.body.tool_call_key],
      );
      const existing = existingRows[0] ? mapToolCallRow(existingRows[0]) : null;
      if (existing) {
        if (["succeeded", "failed", "unknown"].includes(existing.status)) {
          return { record: existing, created: false };
        }
        const updated = await dataSource.query(
          `UPDATE tool_calls SET
            status = $3,
            request_json = COALESCE($4, request_json),
            response_json = COALESCE($5, response_json),
            error_code = COALESCE($6, error_code),
            updated_at = NOW()
           WHERE workspace_id = $1 AND tool_call_key = $2
           RETURNING *`,
          [
            input.workspaceId,
            input.body.tool_call_key,
            input.body.status,
            input.body.request_json ?? null,
            input.body.response_json ?? null,
            input.body.error_code ?? null,
          ],
        );
        return { record: mapToolCallRow(updated[0]), created: false };
      }

      const inserted = await dataSource.query(
        `INSERT INTO tool_calls (
          workspace_id, conversation_id, turn_idempotency_key, tool_call_key,
          tool_name, status, request_json, response_json, error_code
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING *`,
        [
          input.workspaceId,
          input.conversationId,
          input.body.turn_idempotency_key,
          input.body.tool_call_key,
          input.body.tool_name,
          input.body.status,
          input.body.request_json ?? null,
          input.body.response_json ?? null,
          input.body.error_code ?? null,
        ],
      );
      return { record: mapToolCallRow(inserted[0]), created: true };
    },

    async listToolCalls(
      workspaceId: string,
      conversationId: string,
      turnIdempotencyKey: string,
    ): Promise<ToolCall[]> {
      const conv = await dataSource.manager.findOne(ConversationEntity, {
        where: { id: conversationId, workspaceId },
      });
      if (!conv) {
        throw new AppError({
          code: ErrorCode.NOT_FOUND,
          message: "Conversation not found",
        });
      }
      const rows = await dataSource.query(
        `SELECT * FROM tool_calls
         WHERE workspace_id = $1 AND conversation_id = $2 AND turn_idempotency_key = $3
         ORDER BY created_at ASC`,
        [workspaceId, conversationId, turnIdempotencyKey],
      );
      return rows.map((row: Record<string, unknown>) => mapToolCallRow(row));
    },
  };
}
