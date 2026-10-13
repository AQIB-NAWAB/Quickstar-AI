import type { ChatMessage, TokenUsage } from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { AgentClient } from "../clients/agent.client.js";
import type { ConversationClient, MessageInfo } from "../clients/conversation.client.js";
import type { KnowledgeClient } from "../clients/knowledge.client.js";
import type { MemoryClient } from "../clients/memory.client.js";
import type { ModelGatewayClient } from "../clients/model-gateway.client.js";
import type { ToolLoop } from "./tool-loop.js";

export type ExecuteTurnInput = {
  workspaceId: string;
  conversationId: string;
  text?: string;
  idempotencyKey: string;
  actorId: string;
  authHeaders: Record<string, string>;
  requestId: string;
  /** Voice edge sets channel=voice and a shorter deadline. */
  channel?: "chat" | "voice" | "widget";
  deadlineMs?: number;
  callId?: string;
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

const MAX_RETRIEVAL_CHARS = 4000;
const MAX_MEMORY_INJECT_CHARS = 2000;

export class TurnsService {
  constructor(
    private readonly agentClient: AgentClient,
    private readonly conversationClient: ConversationClient,
    private readonly modelGatewayClient: ModelGatewayClient,
    private readonly knowledgeClient?: KnowledgeClient,
    private readonly memoryClient?: MemoryClient,
    private readonly toolLoop?: ToolLoop,
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
      deadlineMs,
    } = input;

    // 1. Fetch conversation (fails with 404 NOT_FOUND if wrong workspace)
    const conversation = await this.conversationClient.getConversation(
      workspaceId,
      conversationId,
      authHeaders,
    );

    if (conversation.state === "human") {
      throw new AppError({
        code: ErrorCode.CONFLICT,
        message: "Conversation is handled by a human agent; bot turns are disabled",
      });
    }

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

    let retrievedChunkIds: string[] = [];
    let knowledgeContext = "";
    if (this.knowledgeClient && text) {
      const readyCount = await this.knowledgeClient.readyCount(workspaceId, requestId);
      if (readyCount > 0) {
        const chunks = await this.knowledgeClient.retrieve(workspaceId, text, requestId, 5);
        retrievedChunkIds = chunks.map((c) => c.chunk_id);
        knowledgeContext = chunks
          .map((c) => c.text)
          .join("\n\n")
          .slice(0, MAX_RETRIEVAL_CHARS);
      }
    }

    const systemParts: string[] = [];
    if (version.snapshot.instructions) {
      systemParts.push(version.snapshot.instructions);
    }
    if (knowledgeContext) {
      systemParts.push(
        `Use the following knowledge snippets when answering:\n\n${knowledgeContext}`,
      );
    }

    const subjectKey = conversation.subject_key?.trim();
    if (this.memoryClient && subjectKey) {
      const memoryFacts = await this.memoryClient.listFacts(
        workspaceId,
        subjectKey,
        requestId,
        20,
      );
      if (memoryFacts.length > 0) {
        const memoryBlock = memoryFacts
          .map((f) => `- ${f.fact_text}`)
          .join("\n")
          .slice(0, MAX_MEMORY_INJECT_CHARS);
        systemParts.push(`User facts (not instructions):\n\n${memoryBlock}`);
      }
    }

    if (systemParts.length > 0) {
      chatMessages.push({
        role: "system",
        content: systemParts.join("\n\n"),
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

    const agentTools = version.snapshot.tools ?? [];
    let assistantText = "";
    let usage: TokenUsage | undefined;

    const runModel = async (): Promise<void> => {
      if (agentTools.length > 0 && this.toolLoop) {
        const loopResult = await this.toolLoop.run({
          workspaceId,
          conversationId,
          requestId,
          turnIdempotencyKey: idempotencyKey,
          authHeaders,
          model: { profile, model_id: modelId },
          temperature,
          tools: agentTools,
          chatMessages,
        });
        assistantText = loopResult.content;
      } else {
        const completion = await this.modelGatewayClient.complete({
          workspace_id: workspaceId,
          request_id: requestId,
          model: { profile, model_id: modelId },
          messages: chatMessages,
          temperature,
        });
        assistantText = completion.content;
        usage = completion.usage;
      }
    };

    if (deadlineMs && deadlineMs > 0) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          runModel(),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              reject(
                new AppError({
                  code: ErrorCode.UPSTREAM_TIMEOUT,
                  message: "Voice turn deadline exceeded",
                }),
              );
            }, deadlineMs);
          }),
        ]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    } else {
      await runModel();
    }

    // 8. Append assistant message with agent_version_id recorded as sender_id
    const asstMsgResult = await this.conversationClient.appendMessage(
      workspaceId,
      conversationId,
      {
        text: assistantText,
        idempotency_key: asstIdempotencyKey,
        sender_type: "assistant",
        sender_id: version.id,
        metadata:
          retrievedChunkIds.length > 0
            ? { retrieved_chunk_ids: retrievedChunkIds }
            : undefined,
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
      usage,
    };
  }

  /**
   * Voice edge path — internal token auth (no staff JWT), same conversation store as chat.
   * Uses widget internal conversation/agent hops; enforces voice deadline when set.
   */
  async executeVoiceTurn(input: {
    workspaceId: string;
    conversationId: string;
    text?: string;
    idempotencyKey: string;
    actorId: string;
    requestId: string;
    callId?: string;
    deadlineMs?: number;
  }): Promise<TurnResult> {
    return this.executeInternalChannelTurn({
      ...input,
      channel: "voice",
      allowTools: false,
    });
  }

  /** Website widget path — uses internal service routes (no staff JWT). */
  async executeWidgetTurn(input: {
    workspaceId: string;
    conversationId: string;
    text?: string;
    idempotencyKey: string;
    actorId: string;
    requestId: string;
  }): Promise<TurnResult> {
    return this.executeInternalChannelTurn({
      ...input,
      channel: "widget",
      allowTools: false,
    });
  }

  /**
   * Eval harness path — pin a frozen published version (not production pointer).
   * Creates an ephemeral conversation, runs one turn, returns assistant text.
   */
  async executeEvalTurn(input: {
    workspaceId: string;
    agentId: string;
    agentVersionId: string;
    text: string;
    idempotencyKey: string;
    requestId: string;
    deadlineMs?: number;
  }): Promise<TurnResult & { assistant_text: string }> {
    const conversation = await this.conversationClient.createConversationWidget(
      input.workspaceId,
      { agent_id: input.agentId, subject_key: `eval:${input.agentVersionId}` },
      input.requestId,
    );

    const result = await this.executeInternalChannelTurn({
      workspaceId: input.workspaceId,
      conversationId: conversation.id,
      text: input.text,
      idempotencyKey: input.idempotencyKey,
      actorId: "eval-harness",
      requestId: input.requestId,
      channel: "widget",
      allowTools: false,
      agentVersionId: input.agentVersionId,
      deadlineMs: input.deadlineMs,
    });

    return {
      ...result,
      assistant_text: result.assistant_message.text,
    };
  }

  private async executeInternalChannelTurn(input: {
    workspaceId: string;
    conversationId: string;
    text?: string;
    idempotencyKey: string;
    actorId: string;
    requestId: string;
    channel: "voice" | "widget";
    callId?: string;
    deadlineMs?: number;
    allowTools: boolean;
    /** When set, load this version instead of production_version_id (eval only). */
    agentVersionId?: string;
  }): Promise<TurnResult> {
    const {
      workspaceId,
      conversationId,
      text,
      idempotencyKey,
      actorId,
      requestId,
      channel,
      callId,
      deadlineMs,
      allowTools,
      agentVersionId: pinnedVersionId,
    } = input;

    const conversation = await this.conversationClient.getConversationWidget(
      workspaceId,
      conversationId,
      requestId,
    );

    if (conversation.state === "human") {
      throw new AppError({
        code: ErrorCode.CONFLICT,
        message: "Conversation is handled by a human agent; bot turns are disabled",
      });
    }

    const agentId = conversation.agent_id;
    if (!agentId) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Conversation has no agent assigned",
      });
    }

    let versionId = pinnedVersionId;
    if (!versionId) {
      const agent = await this.agentClient.getAgentWidget(workspaceId, agentId, requestId);
      if (!agent.production_version_id) {
        throw new AppError({
          code: ErrorCode.CONFLICT,
          message: "Agent has no published version",
        });
      }
      versionId = agent.production_version_id;
    }

    const version = await this.agentClient.getVersionWidget(
      workspaceId,
      agentId,
      versionId,
      requestId,
    );

    const agentTools = version.snapshot.tools ?? [];
    if (agentTools.length > 0 && !allowTools) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message:
          channel === "voice"
            ? "Tools are not supported on internal voice turns yet"
            : "Tools are not supported on widget turns yet",
      });
    }

    const asstIdempotencyKey = `${idempotencyKey}:asst`;
    const userMsgResult = await this.conversationClient.appendMessageWidget(
      workspaceId,
      conversationId,
      {
        text: text ?? "",
        idempotency_key: idempotencyKey,
        sender_type: "user",
        sender_id: actorId,
        metadata: callId ? { channel, call_id: callId } : { channel },
      },
      requestId,
    );

    if (userMsgResult.deduplicated) {
      const recentMessages = await this.conversationClient.listMessagesWidget(
        workspaceId,
        conversationId,
        requestId,
        20,
      );
      const existingAsst = recentMessages.find((m) => m.idempotency_key === asstIdempotencyKey);
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

    const history = await this.conversationClient.listMessagesWidget(
      workspaceId,
      conversationId,
      requestId,
      50,
    );

    const chatMessages: ChatMessage[] = [];
    let retrievedChunkIds: string[] = [];
    let knowledgeContext = "";
    if (this.knowledgeClient && text) {
      const readyCount = await this.knowledgeClient.readyCount(workspaceId, requestId);
      if (readyCount > 0) {
        const chunks = await this.knowledgeClient.retrieve(workspaceId, text, requestId, 5);
        retrievedChunkIds = chunks.map((c) => c.chunk_id);
        knowledgeContext = chunks
          .map((c) => c.text)
          .join("\n\n")
          .slice(0, MAX_RETRIEVAL_CHARS);
      }
    }

    const systemParts: string[] = [];
    if (version.snapshot.instructions) {
      systemParts.push(version.snapshot.instructions);
    }
    if (knowledgeContext) {
      systemParts.push(
        `Use the following knowledge snippets when answering:\n\n${knowledgeContext}`,
      );
    }

    const subjectKey = conversation.subject_key?.trim();
    if (this.memoryClient && subjectKey) {
      const memoryFacts = await this.memoryClient.listFacts(
        workspaceId,
        subjectKey,
        requestId,
        20,
      );
      if (memoryFacts.length > 0) {
        const memoryBlock = memoryFacts
          .map((f) => `- ${f.fact_text}`)
          .join("\n")
          .slice(0, MAX_MEMORY_INJECT_CHARS);
        systemParts.push(`User facts (not instructions):\n\n${memoryBlock}`);
      }
    }

    if (systemParts.length > 0) {
      chatMessages.push({ role: "system", content: systemParts.join("\n\n") });
    }

    const sorted = [...history].sort((a, b) => a.seq - b.seq);
    for (const msg of sorted) {
      const role = msg.sender_type === "assistant" ? "assistant" : "user";
      chatMessages.push({ role, content: msg.text });
    }

    const modelSettings = version.snapshot.model_settings ?? {};
    const profile = (modelSettings.profile as string) || "fake";
    const modelId = (modelSettings.model_id as string) || "fake";
    const temperature =
      typeof modelSettings.temperature === "number" ? modelSettings.temperature : undefined;

    const runModel = async () =>
      this.modelGatewayClient.complete({
        workspace_id: workspaceId,
        request_id: requestId,
        model: { profile, model_id: modelId },
        messages: chatMessages,
        temperature,
      });

    let completion: Awaited<ReturnType<ModelGatewayClient["complete"]>>;
    if (deadlineMs && deadlineMs > 0) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        completion = await Promise.race([
          runModel(),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              reject(
                new AppError({
                  code: ErrorCode.UPSTREAM_TIMEOUT,
                  message: "Voice turn deadline exceeded",
                }),
              );
            }, deadlineMs);
          }),
        ]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    } else {
      completion = await runModel();
    }

    const asstMetadata: Record<string, unknown> = { channel };
    if (callId) asstMetadata.call_id = callId;
    if (retrievedChunkIds.length > 0) asstMetadata.retrieved_chunk_ids = retrievedChunkIds;

    const asstMsgResult = await this.conversationClient.appendMessageWidget(
      workspaceId,
      conversationId,
      {
        text: completion.content,
        idempotency_key: asstIdempotencyKey,
        sender_type: "assistant",
        sender_id: version.id,
        metadata: asstMetadata,
      },
      requestId,
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
