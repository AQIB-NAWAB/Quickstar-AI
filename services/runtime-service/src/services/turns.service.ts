import type { ChatMessage, TokenUsage } from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { AgentClient } from "../clients/agent.client.js";
import type { ConversationClient, MessageInfo } from "../clients/conversation.client.js";
import type { ModelGatewayClient } from "../clients/model-gateway.client.js";

export type ExecuteTurnInput = {
  workspaceId: string;
  conversationId: string;
  text?: string;
  idempotencyKey: string;
  actorId: string;
  authHeaders: Record<string, string>;
  requestId: string;
};

export type TurnResult = {
  deduplicated: boolean;
  conversation_id: string;
  agent_id: string;
  agent_version_id: string;
  user_message: MessageInfo;
  assistant_message: MessageInfo;
  usage?: TokenUsage;
};

export class TurnsService {
  constructor(
    private readonly agentClient: AgentClient,
    private readonly conversationClient: ConversationClient,
    private readonly modelGatewayClient: ModelGatewayClient,
  ) {}

  async executeTurn(input: ExecuteTurnInput): Promise<TurnResult> {
    const {
      workspaceId,
      conversationId,
      text,
      idempotencyKey,
      actorId,
      authHeaders,
      requestId,
    } = input;

    // 1. Fetch conversation (fails with 404 NOT_FOUND if wrong workspace)
    const conversation = await this.conversationClient.getConversation(
      workspaceId,
      conversationId,
      authHeaders,
    );

    const agentId = conversation.agent_id;
    if (!agentId) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Conversation has no agent assigned",
      });
    }

    // 2. Fetch agent and verify production pointer (frozen version)
    const agent = await this.agentClient.getAgent(workspaceId, agentId, authHeaders);
    if (!agent.production_version_id) {
      throw new AppError({
        code: ErrorCode.CONFLICT,
        message: "Agent has no published version",
      });
    }

    // 3. Fetch immutable version snapshot
    const version = await this.agentClient.getVersion(
      workspaceId,
      agentId,
      agent.production_version_id,
      authHeaders,
    );

    // 4. Append user message with idempotency key
    const asstIdempotencyKey = `${idempotencyKey}:asst`;
    const userMsgResult = await this.conversationClient.appendMessage(
      workspaceId,
      conversationId,
      {
        text: text ?? "",
        idempotency_key: idempotencyKey,
        sender_type: "user",
        sender_id: actorId,
      },
      authHeaders,
    );

    // 5. Check if turn was already completed (idempotency deduplication)
    if (userMsgResult.deduplicated) {
      const recentMessages = await this.conversationClient.listMessages(
        workspaceId,
        conversationId,
        authHeaders,
        20,
      );
      const existingAsst = recentMessages.find(
        (m) => m.idempotency_key === asstIdempotencyKey,
      );
      if (existingAsst) {
        return {
          deduplicated: true,
          conversation_id: conversationId,
          agent_id: agentId,
          agent_version_id: version.id,
          user_message: userMsgResult.message,
          assistant_message: existingAsst,
        };
      }
    }

    // 6. Build chat messages from conversation history
    const history = await this.conversationClient.listMessages(
      workspaceId,
      conversationId,
      authHeaders,
      50,
    );

    const chatMessages: ChatMessage[] = [];

    // System prompt from version snapshot
    if (version.snapshot.instructions) {
      chatMessages.push({
        role: "system",
        content: version.snapshot.instructions,
      });
    }

    // Append sorted history
    const sorted = [...history].sort((a, b) => a.seq - b.seq);
    for (const msg of sorted) {
      const role = msg.sender_type === "assistant" ? "assistant" : "user";
      chatMessages.push({
        role,
        content: msg.text,
      });
    }

    // If history didn't include the newly appended user message yet, ensure it is present
    const hasCurrent = chatMessages.some(
      (m) => m.role === "user" && m.content === (text ?? ""),
    );
    if (!hasCurrent && text) {
      chatMessages.push({ role: "user", content: text });
    }

    // 7. Invoke Model Gateway
    const modelSettings = version.snapshot.model_settings ?? {};
    const profile = (modelSettings.profile as string) || "fake";
    const modelId = (modelSettings.model_id as string) || "fake";
    const temperature =
      typeof modelSettings.temperature === "number"
        ? modelSettings.temperature
        : undefined;

    const completion = await this.modelGatewayClient.complete({
      workspace_id: workspaceId,
      request_id: requestId,
      model: { profile, model_id: modelId },
      messages: chatMessages,
      temperature,
    });

    // 8. Append assistant message with agent_version_id recorded as sender_id
    const asstMsgResult = await this.conversationClient.appendMessage(
      workspaceId,
      conversationId,
      {
        text: completion.content,
        idempotency_key: asstIdempotencyKey,
        sender_type: "assistant",
        sender_id: version.id,
      },
      authHeaders,
    );

    return {
      deduplicated: false,
      conversation_id: conversationId,
      agent_id: agentId,
      agent_version_id: version.id,
      user_message: userMsgResult.message,
      assistant_message: asstMsgResult.message,
      usage: completion.usage,
    };
  }
}
