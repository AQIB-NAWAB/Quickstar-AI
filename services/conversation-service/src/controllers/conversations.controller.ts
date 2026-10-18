import { requestIdFromResponse, sendPlatformJson, type RequestHandler } from "@quickstart/http-server";
import type { UpsertToolCallBody, WorkspaceRole } from "@quickstart/contracts";
import { isConversationState, type ConversationState } from "../domain/conversation-state.js";
import { AppError, ErrorCode } from "@quickstart/errors";
import { toToolCallJson } from "../domain/tool-call.js";
import { toConversationJson, toMessageJson } from "../domain/types.js";
import type { ConversationsService } from "../services/conversations.service.js";
import { routeParam } from "../utils/route-param.js";

export function createConversationsController(conversations: ConversationsService) {
  return {
    createConversation: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const body = req.body as { agent_id?: string; subject_key?: string | null };

      const conversation = await conversations.createConversation(
        tenant.workspaceId,
        body?.agent_id,
        body?.subject_key,
      );

      sendPlatformJson(res, 201, {
        request_id: requestId,
        conversation: toConversationJson(conversation),
      });
    }) as RequestHandler,

    getConversation: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const conversationId = routeParam(req.params.conversationId);

      const conversation = await conversations.getConversation(
        tenant.workspaceId,
        conversationId,
      );

      sendPlatformJson(res, 200, {
        request_id: requestId,
        conversation: toConversationJson(conversation),
      });
    }) as RequestHandler,

    listConversations: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const stateRaw = req.query.state;
      let state: ConversationState | undefined;
      if (stateRaw !== undefined && stateRaw !== "") {
        const value = String(stateRaw);
        if (!isConversationState(value)) {
          throw new AppError({
            code: ErrorCode.VALIDATION_FAILED,
            message: "state must be bot, waiting, or human",
          });
        }
        state = value;
      }

      const list = await conversations.listConversations(tenant.workspaceId, { limit, state });

      sendPlatformJson(res, 200, {
        request_id: requestId,
        conversations: list.map(toConversationJson),
      });
    }) as RequestHandler,

    appendMessage: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const conversationId = routeParam(req.params.conversationId);
      const body = req.body as {
        text?: string;
        idempotency_key?: string;
        sender_type?: string;
        sender_id?: string;
        metadata?: Record<string, unknown> | null;
      };

      const result = await conversations.appendMessage({
        workspaceId: tenant.workspaceId,
        conversationId,
        text: body?.text,
        idempotencyKey: body?.idempotency_key,
        senderType: body?.sender_type ?? "user",
        senderId: body?.sender_id ?? tenant.actorId,
        actorRole: res.locals.memberRole as WorkspaceRole | undefined,
        metadata: body?.metadata ?? null,
      });

      // 200 OK for deduplicated replay, 201 Created for new message
      const status = result.deduplicated ? 200 : 201;

      sendPlatformJson(res, status, {
        request_id: requestId,
        message: toMessageJson(result.message),
        deduplicated: result.deduplicated,
      });
    }) as RequestHandler,

    listMessages: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const conversationId = routeParam(req.params.conversationId);
      const afterSeq =
        req.query.after_seq !== undefined && req.query.after_seq !== ""
          ? Number(req.query.after_seq)
          : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 50;

      const messages = await conversations.listMessages(
        tenant.workspaceId,
        conversationId,
        afterSeq,
        limit,
      );

      sendPlatformJson(res, 200, {
        request_id: requestId,
        messages: messages.map(toMessageJson),
      });
    }) as RequestHandler,

    upsertToolCall: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const conversationId = routeParam(req.params.conversationId);
      const body = req.body as UpsertToolCallBody;

      const result = await conversations.upsertToolCall(tenant.workspaceId, conversationId, body);

      sendPlatformJson(res, result.created ? 201 : 200, {
        request_id: requestId,
        tool_call: toToolCallJson(result.record),
        created: result.created,
      });
    }) as RequestHandler,

    takeHandoff: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const conversationId = routeParam(req.params.conversationId);

      const conversation = await conversations.takeHandoff(
        tenant.workspaceId,
        conversationId,
        tenant.actorId,
        requestId,
      );

      sendPlatformJson(res, 200, {
        request_id: requestId,
        conversation: toConversationJson(conversation),
      });
    }) as RequestHandler,

    requestVoiceAttention: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const conversationId = routeParam(req.params.conversationId);
      const conversation = await conversations.requestVoiceAttention(
        tenant.workspaceId,
        conversationId,
        req.body?.channel === "chat" ? "chat" : "voice",
      );
      sendPlatformJson(res, 200, {
        request_id: requestId,
        conversation: toConversationJson(conversation),
      });
    }) as RequestHandler,

    releaseHandoff: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const conversationId = routeParam(req.params.conversationId);
      const role = res.locals.memberRole;
      if (!role) {
        throw new AppError({
          code: ErrorCode.FORBIDDEN,
          message: "Workspace membership required",
        });
      }

      const conversation = await conversations.releaseHandoff(
        tenant.workspaceId,
        conversationId,
        tenant.actorId,
        role,
      );

      sendPlatformJson(res, 200, {
        request_id: requestId,
        conversation: toConversationJson(conversation),
      });
    }) as RequestHandler,

    listToolCalls: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const conversationId = routeParam(req.params.conversationId);
      const turnKey = String(req.query.turn_idempotency_key ?? "");

      const list = await conversations.listToolCalls(
        tenant.workspaceId,
        conversationId,
        turnKey,
      );

      sendPlatformJson(res, 200, {
        request_id: requestId,
        tool_calls: list.map(toToolCallJson),
      });
    }) as RequestHandler,
  };
}
