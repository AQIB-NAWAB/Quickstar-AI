import { randomUUID } from "node:crypto";
import type { DataSource } from "typeorm";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { Conversation, Message } from "../../domain/types.js";
import type {
  AppendMessageInput,
  AppendMessageResult,
  ConversationStore,
  CreateConversationInput,
  ListMessagesInput,
} from "../types.js";
import { ConversationEntity, MessageEntity } from "../entities/index.js";
import { toConversation, toMessage } from "./mappers.js";

export function createTypeOrmConversationStore(dataSource: DataSource): ConversationStore {
  return {
    async createConversation(input: CreateConversationInput): Promise<Conversation> {
      const now = new Date();
      const entity = dataSource.manager.create(ConversationEntity, {
        id: randomUUID(),
        workspaceId: input.workspaceId,
        agentId: input.agentId ?? null,
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

    async listConversations(workspaceId: string, limit = 50): Promise<Conversation[]> {
      const entities = await dataSource.manager.find(ConversationEntity, {
        where: { workspaceId },
        order: { createdAt: "DESC" },
        take: limit,
      });
      return entities.map(toConversation);
    },

    async appendMessage(input: AppendMessageInput): Promise<AppendMessageResult> {
      return await dataSource.transaction(async (manager) => {
        // 1. Idempotency Check: if this idempotency key was already processed, return existing message
        const existing = await manager.findOne(MessageEntity, {
          where: { conversationId: input.conversationId, idempotencyKey: input.idempotencyKey },
        });
        if (existing) {
          if (existing.workspaceId !== input.workspaceId) {
            throw new AppError({
              code: ErrorCode.NOT_FOUND,
              message: "Conversation not found",
            });
          }
          return { message: toMessage(existing), deduplicated: true };
        }

        // 2. Atomically increment sequence counter in Postgres for this conversation
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

        // 3. Insert the message with the allocated sequence number
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
          createdAt: now,
        });

        await manager.save(msgEntity);
        return { message: toMessage(msgEntity), deduplicated: false };
      });
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
  };
}
