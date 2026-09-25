import { requestIdFromResponse, sendPlatformJson, type RequestHandler } from "@quickstart/http-server";
import { toConversationJson, toMessageJson } from "../domain/types.js";
import type { ConversationsService } from "../services/conversations.service.js";
import { routeParam } from "../utils/route-param.js";

export function createConversationsController(conversations: ConversationsService) {
  return {
    createConversation: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const body = req.body as { agent_id?: string };

      const conversation = await conversations.createConversation(
        tenant.workspaceId,
        body?.agent_id,
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

      const list = await conversations.listConversations(tenant.workspaceId, limit);

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
      };

      const result = await conversations.appendMessage({
        workspaceId: tenant.workspaceId,
        conversationId,
        text: body?.text,
        idempotencyKey: body?.idempotency_key,
        senderType: body?.sender_type ?? "user",
        senderId: body?.sender_id ?? tenant.actorId,
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
  };
}
