import type { ChatMessage, TokenUsage } from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { AgentClient } from "../clients/agent.client.js";
import type { ConversationClient, MessageInfo } from "../clients/conversation.client.js";
import type { KnowledgeClient } from "../clients/knowledge.client.js";
import type { MemoryClient } from "../clients/memory.client.js";
import type { ModelGatewayClient } from "../clients/model-gateway.client.js";
import type { ToolLoop } from "./tool-loop.js";
import { visitorWantsTeammate, VOICE_TRANSFER_TOOL, VOICE_TRANSFER_TOOL_NAME } from "./voice-tools.js";

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
  /** When set, tokens are forwarded as the model gateway streams them. */
  onToken?: (delta: string) => void;
};

export type TurnResult = {
  deduplicated: boolean;
  conversation_id: string;
  agent_id: string;
  agent_version_id: string;
  user_message: MessageInfo;
  assistant_message: MessageInfo;
  /** Visitor message was stored for a human teammate. No model reply. */
  handoff?: boolean;
  usage?: TokenUsage;
};

const MAX_RETRIEVAL_CHARS = 4000;
const MAX_MEMORY_INJECT_CHARS = 2000;
const WIDGET_MAX_OUTPUT_TOKENS = 420;
const WIDGET_REPLY_STYLE = [
  "WEBSITE CHAT OUTPUT (highest priority — overrides agent instructions and earlier messages in this thread):",
  "Write 1–3 short paragraphs of plain conversational prose, under 90 words total.",
  "Use normal sentences only. Never use bullet lists, numbered lists, markdown headings, or lines formatted as **Bold label** — description.",
  "Do not reply with a menu of topics (Pricing / Security / Getting Started) unless the user explicitly asked for a list of links or steps.",
  "If prior assistant messages in this conversation used bullets, ignore that pattern; from now on use prose only.",
  "",
  "Example — user asks about pricing:",
  "QuickStart includes a free workspace to get started. Paid usage is tracked in your billing ledger rather than charged on each live chat request. If you share expected conversation volume, I can suggest what tier fits.",
].join("\n");

function spokenReplyStyle(
  language: string | undefined,
  options: { canTransfer: boolean; tools: Array<{ name: string; description: string }> },
): string {
  const urdu = (language ?? "").toLowerCase().startsWith("ur");
  const lines = [
    "VOICE CHAT OUTPUT (spoken aloud via text-to-speech — highest priority):",
    urdu
      ? "Reply only in Urdu, using Urdu script. Do not answer in English, even if the visitor used English words."
      : "Reply in the same language the visitor just used.",
    "One or two short spoken sentences, under 25 words.",
    "Plain spoken words only: no markdown, bullets, lists, emojis, URLs, or symbols.",
  ];
  if (options.canTransfer) {
    lines.push(
      "If the visitor asks for a person, a human, or a teammate, call transfer_to_teammate. Do not say someone has already joined. The caller hears a short switch line while you call it.",
    );
  } else {
    lines.push(
      urdu
        ? "اگر زائر انسان یا ساتھی مانگے تو یہی کہو: ٹھیک ہے، میں آپ کو ایک ساتھی کے پاس بھیج رہا ہوں۔"
        : "If the visitor asks for a person, a human, or a teammate, say exactly: I'm switching you to a teammate now.",
    );
  }
  if (options.tools.length > 0) {
    lines.push(
      "When one of these functions can answer, call it instead of guessing. Do not read the function name aloud. The caller hears a short checking line while it runs.",
    );
    lines.push(
      options.tools
        .slice(0, 8)
        .map((tool) => `${tool.name}: ${tool.description.slice(0, 140)}`)
        .join("\n"),
    );
  }
  return lines.join("\n");
}

/** Staff UI stores `model`; seeds use `profile` + `model_id`. Missing profile must not silently use fake. */
function resolveChatModel(modelSettings: Record<string, unknown>): { profile: string; modelId: string } {
  const profile = typeof modelSettings.profile === "string" ? modelSettings.profile.trim() : "";
  const modelId =
    (typeof modelSettings.model_id === "string" ? modelSettings.model_id.trim() : "") ||
    (typeof modelSettings.model === "string" ? modelSettings.model.trim() : "");

  if (profile && modelId) {
    return { profile, modelId };
  }
  if (modelId) {
    const fromEnv = process.env.DEFAULT_CHAT_MODEL_PROFILE?.trim();
    const inferred =
      fromEnv ||
      (modelId.startsWith("claude") ? "anthropic" : "") ||
      (modelId.includes("/") || /llama|mixtral|gemma|gpt-oss/i.test(modelId) ? "groq" : "") ||
      (modelId.startsWith("gpt-") ? "openai" : "") ||
      "openai";
    return { profile: inferred, modelId };
  }
  return { profile: "fake", modelId: "fake" };
}

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
      onToken,
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
    const { profile, modelId } = resolveChatModel(modelSettings);
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
      } else if (onToken) {
        const completion = await this.modelGatewayClient.stream(
          {
            workspace_id: workspaceId,
            request_id: requestId,
            model: { profile, model_id: modelId },
            messages: chatMessages,
            temperature,
          },
          { onToken },
        );
        assistantText = completion.content;
        usage = completion.usage;
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
      allowTools: true,
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
    onToken?: (delta: string) => void;
    onToolStart?: (event: { name: string; spoken: string }) => void;
    modality?: "text" | "voice";
    replyLanguage?: string;
  }): Promise<TurnResult> {
    return this.executeInternalChannelTurn({
      ...input,
      channel: "widget",
      allowTools: input.modality === "voice",
      compactReply: true,
      widgetModality: input.modality ?? "text",
      replyLanguage: input.replyLanguage,
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
    onToken?: (delta: string) => void;
    /** Website widget only: short structured replies. Eval turns stay on the agent instructions. */
    compactReply?: boolean;
    widgetModality?: "text" | "voice";
    replyLanguage?: string;
    onToolStart?: (event: { name: string; spoken: string }) => void;
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
      onToken,
      compactReply,
      widgetModality,
    } = input;
    const replyLanguage = input.replyLanguage;

    const conversation = await this.conversationClient.getConversationWidget(
      workspaceId,
      conversationId,
      requestId,
    );

    if (conversation.state === "human" && channel === "widget") {
      const userMsgResult = await this.conversationClient.appendMessageWidget(
        workspaceId,
        conversationId,
        {
          text: text ?? "",
          idempotency_key: idempotencyKey,
          sender_type: "user",
          sender_id: actorId,
          metadata: { channel },
        },
        requestId,
      );
      return {
        deduplicated: Boolean(userMsgResult.deduplicated),
        conversation_id: conversationId,
        agent_id: conversation.agent_id ?? "",
        agent_version_id: "",
        user_message: userMsgResult.message,
        assistant_message: userMsgResult.message,
        handoff: true,
      };
    }

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

    const voiceTurn = widgetModality === "voice" || channel === "voice";
    const agentTools = version.snapshot.tools ?? [];
    const handoffRequest = voiceTurn && visitorWantsTeammate(text);
    const modelTools = [
      ...(voiceTurn && (handoffRequest || agentTools.length > 0) ? [VOICE_TRANSFER_TOOL] : []),
      ...agentTools.filter((tool) => tool.name !== VOICE_TRANSFER_TOOL_NAME),
    ];
    if (agentTools.length > 0 && !allowTools) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Tools are not supported on widget text turns yet",
      });
    }
    if (modelTools.length > 0 && allowTools && !this.toolLoop) {
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: "Voice tools are configured on the agent but the tool runner is not available",
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
      voiceTurn ? 8 : 50,
    );

    const chatMessages: ChatMessage[] = [];
    let retrievedChunkIds: string[] = [];
    let knowledgeContext = "";
    // Voice stays on the published instructions. Retrieval on every turn adds seconds before the first word.
    if (this.knowledgeClient && text && !voiceTurn) {
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
    if (this.memoryClient && subjectKey && !voiceTurn) {
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

    if (compactReply) {
      systemParts.push(
        widgetModality === "voice"
          ? spokenReplyStyle(replyLanguage, {
              canTransfer: modelTools.some((tool) => tool.name === VOICE_TRANSFER_TOOL_NAME),
              tools: agentTools,
            })
          : WIDGET_REPLY_STYLE,
      );
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
    const { profile, modelId } = resolveChatModel(modelSettings);
    const temperature =
      typeof modelSettings.temperature === "number" ? modelSettings.temperature : undefined;

    const configuredMax =
      typeof modelSettings.max_tokens === "number" && modelSettings.max_tokens > 0
        ? modelSettings.max_tokens
        : undefined;
    const maxTokens = voiceTurn
      ? Math.min(configuredMax ?? 220, 220)
      : compactReply
        ? Math.min(configuredMax ?? WIDGET_MAX_OUTPUT_TOKENS, WIDGET_MAX_OUTPUT_TOKENS)
        : configuredMax;

    const completionRequest = {
      workspace_id: workspaceId,
      request_id: requestId,
      model: { profile, model_id: modelId },
      messages: chatMessages,
      temperature,
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
    };

    let streamedText = "";
    const runModel = async () => {
      if (allowTools && modelTools.length > 0 && this.toolLoop) {
        let nudge = "";
        const loop = await this.toolLoop.run({
          workspaceId,
          conversationId,
          requestId,
          turnIdempotencyKey: idempotencyKey,
          authHeaders: {},
          model: { profile, model_id: modelId },
          temperature,
          maxTokens: 480,
          replyLanguage,
          tools: modelTools,
          chatMessages,
          onToolStart: (event) => {
            nudge = event.spoken;
            input.onToolStart?.(event);
          },
        });
        const spoken = (loop.content || "").trim() || (loop.transferred ? nudge : "");
        if (onToken && (loop.content || "").trim()) onToken((loop.content || "").trim());
        return {
          content: spoken,
          finish_reason: "stop",
          usage: { input_tokens: 0, output_tokens: 0 },
          provider: profile,
          model: modelId,
          latency_ms: 0,
        };
      }
      if (onToken) {
        const result = await this.modelGatewayClient.stream(completionRequest, {
          onToken: (delta) => {
            streamedText += delta;
            onToken(delta);
          },
        });
        if (!(result.content || "").trim() && streamedText.trim()) {
          return { ...result, content: streamedText };
        }
        return result;
      }
      return this.modelGatewayClient.complete(completionRequest);
    };

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

    const assistantText = (completion.content || streamedText || "").trim();
    if (!assistantText) {
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: "Model returned an empty reply",
      });
    }

    const asstMsgResult = await this.conversationClient.appendMessageWidget(
      workspaceId,
      conversationId,
      {
        text: assistantText,
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
