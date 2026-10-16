import type { ChatMessage, TokenUsage } from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { AgentClient, AgentVersionInfo } from "../clients/agent.client.js";
import type { ConversationClient, MessageInfo } from "../clients/conversation.client.js";
import type { KnowledgeClient } from "../clients/knowledge.client.js";
import type { MemoryClient } from "../clients/memory.client.js";
import type { ModelGatewayClient } from "../clients/model-gateway.client.js";
import type { ToolLoop } from "./tool-loop.js";
import {
  assistantAskedForActionConfirmation,
  assistantOfferedHandoff,
  assistantAskedForLookupTarget,
  CONVERSATION_PRIORITY,
  lookupRequestMissingIdentifier,
  visitorConfirmed,
  visitorRequestsToolAction,
  visitorSuppliedIdentifier,
  utteranceRequestsAction,
  spokenToolNudge,
  visitorWantsTeammate,
  VOICE_TRANSFER_TOOL,
  VOICE_TRANSFER_TOOL_NAME,
} from "./voice-tools.js";

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
  signal?: AbortSignal;
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
  "Answer the visitor's newest message. Never repeat your previous reply or re-run an earlier task unless the visitor explicitly asks again.",
  "",
  "Example — user asks about pricing:",
  "QuickStart includes a free workspace to get started. Paid usage is tracked in your billing ledger rather than charged on each live chat request. If you share expected conversation volume, I can suggest what tier fits.",
].join("\n");


function spokenReplyStyle(
  language: string | undefined,
  gender: "female" | "male" | "neutral" | undefined,
  options: {
    handoff: "off" | "ask" | "now";
    tools: Array<{ name: string; description: string }>;
  },
): string {
  const urdu = (language ?? "").toLowerCase().startsWith("ur");
  const lines = [
    "VOICE CHAT OUTPUT (spoken aloud via text-to-speech — highest priority):",
    urdu
      ? `Reply only in Urdu, using Urdu script. Do not answer in English, even if the visitor used English words. Use ${gender === "female" ? "feminine" : gender === "male" ? "masculine" : "natural neutral"} Urdu grammatical forms consistently to match the selected voice persona.`
      : "Reply in the same language the visitor just used.",
    "One or two short spoken sentences, under 25 words.",
    "Plain spoken words only: no markdown, bullets, lists, emojis, URLs, or symbols.",
    "Answer general questions from the knowledge base. For a requested lookup, use the matching tool; ask briefly if a required detail is missing and never invent it.",
    "If a requested post or order lookup is missing its ID, ask for that ID in one short question and wait.",
  ];
  if (options.handoff === "now") {
    lines.push("The visitor confirmed. Call transfer_to_teammate now. Do not ask again.");
  } else if (options.handoff === "ask") {
    lines.push(
      urdu
        ? "صرف یہ پوچھو: کیا میں آپ کو ایک ساتھی سے ملا دوں؟ ابھی کال مت بدلو۔"
        : "Ask only this: Would you like me to connect you with a teammate? Do not transfer yet.",
    );
  } else {
    lines.push("Do not mention a teammate or say you are switching the call.");
  }
  if (options.tools.length > 0) {
    lines.push(CONVERSATION_PRIORITY);
    lines.push(
      "Available only when the visitor asks for that action:\n" +
        options.tools
          .slice(0, 8)
          .map((tool) => `${tool.name}: ${tool.description.slice(0, 120)}`)
          .join("\n"),
    );
  }
  return lines.join("\n");
}

/** Staff UI stores `model`; seeds use `profile` + `model_id`. Missing profile must not silently use fake. */
function resolveChatModel(modelSettings: Record<string, unknown>): {
  profile: string;
  modelId: string;
} {
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
  private readonly widgetVersionCache = new Map<
    string,
    { expiresAt: number; value: Promise<AgentVersionInfo> }
  >();

  constructor(
    private readonly agentClient: AgentClient,
    private readonly conversationClient: ConversationClient,
    private readonly modelGatewayClient: ModelGatewayClient,
    private readonly knowledgeClient?: KnowledgeClient,
    private readonly memoryClient?: MemoryClient,
    private readonly toolLoop?: ToolLoop,
  ) {}

  private async getWidgetVersion(
    workspaceId: string,
    agentId: string,
    versionId: string,
    requestId: string,
  ): Promise<AgentVersionInfo> {
    const key = `${workspaceId}:${agentId}:${versionId}`;
    const cached = this.widgetVersionCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const value = this.agentClient.getVersionWidget(workspaceId, agentId, versionId, requestId);
    this.widgetVersionCache.set(key, { expiresAt: Date.now() + 30_000, value });
    try {
      return await value;
    } catch (error) {
      if (this.widgetVersionCache.get(key)?.value === value) this.widgetVersionCache.delete(key);
      throw error;
    }
  }

  private async getPublishedWidgetVersion(
    workspaceId: string,
    agentId: string,
    requestId: string,
  ): Promise<AgentVersionInfo> {
    const key = `${workspaceId}:${agentId}:published`;
    const cached = this.widgetVersionCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const value = (async () => {
      const agent = await this.agentClient.getAgentWidget(workspaceId, agentId, requestId);
      if (!agent.production_version_id) {
        throw new AppError({
          code: ErrorCode.CONFLICT,
          message: "Agent has no published version",
        });
      }
      return this.agentClient.getVersionWidget(
        workspaceId,
        agentId,
        agent.production_version_id,
        requestId,
      );
    })();
    this.widgetVersionCache.set(key, { expiresAt: Date.now() + 30_000, value });
    try {
      return await value;
    } catch (error) {
      if (this.widgetVersionCache.get(key)?.value === value) this.widgetVersionCache.delete(key);
      throw error;
    }
  }

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
      signal,
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
        `Knowledge base (answer normal questions from this; do not ask for an id):\n\n${knowledgeContext}`,
      );
    }

    const subjectKey = conversation.subject_key?.trim();
    if (this.memoryClient && subjectKey) {
      const memoryFacts = await this.memoryClient.listFacts(workspaceId, subjectKey, requestId, 20);
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
    const hasCurrent = chatMessages.some((m) => m.role === "user" && m.content === (text ?? ""));
    if (!hasCurrent && text) {
      chatMessages.push({ role: "user", content: text });
    }

    // 7. Invoke Model Gateway
    const modelSettings = version.snapshot.model_settings ?? {};
    const { profile, modelId } = resolveChatModel(modelSettings);
    const temperature =
      typeof modelSettings.temperature === "number" ? modelSettings.temperature : undefined;

    const agentTools = version.snapshot.tools ?? [];
    if (agentTools.length > 0) {
      const firstSystem = chatMessages.findIndex((m) => m.role === "system");
      chatMessages.splice(Math.max(0, firstSystem + 1), 0, {
        role: "system",
        content: CONVERSATION_PRIORITY,
      });
    }
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
          visitorText: text,
          signal,
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
          signal,
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
        }, signal);
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
          retrievedChunkIds.length > 0 ? { retrieved_chunk_ids: retrievedChunkIds } : undefined,
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
    replyGender?: "female" | "male" | "neutral";
    signal?: AbortSignal;
  }): Promise<TurnResult> {
    return this.executeInternalChannelTurn({
      ...input,
      channel: "widget",
      allowTools: true,
      compactReply: true,
      widgetModality: input.modality ?? "text",
      replyLanguage: input.replyLanguage,
      replyGender: input.replyGender,
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
    replyGender?: "female" | "male" | "neutral";
    onToolStart?: (event: { name: string; spoken: string }) => void;
    signal?: AbortSignal;
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
      signal,
    } = input;
    const replyLanguage = input.replyLanguage;
    const replyGender = input.replyGender;

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

    const version = pinnedVersionId
      ? await this.getWidgetVersion(workspaceId, agentId, pinnedVersionId, requestId)
      : await this.getPublishedWidgetVersion(workspaceId, agentId, requestId);

    const voiceTurn = widgetModality === "voice" || channel === "voice";
    const agentTools = version.snapshot.tools ?? [];
    const catalogTools = agentTools.filter((tool) => tool.name !== VOICE_TRANSFER_TOOL_NAME);
    let actionRequest = voiceTurn
      ? utteranceRequestsAction(text)
      : visitorRequestsToolAction(text);
    const incompleteLookup = lookupRequestMissingIdentifier(text);
    let modelTools = actionRequest && !incompleteLookup ? [...catalogTools] : [];
    if (agentTools.length > 0 && !allowTools) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Tools are not supported on this turn path",
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

    // Retrieval and history are independent after the visitor message is
    // committed. Start the one query-specific RAG request now, and cancel it
    // if this turn is a tool lookup once the previous assistant line is known.
    const retrievalAbort = new AbortController();
    const retrievalPromise =
      this.knowledgeClient && text && !actionRequest
        ? this.knowledgeClient
            .retrieve(workspaceId, text, requestId, voiceTurn ? 3 : 5, retrievalAbort.signal)
            .catch(() => [])
        : Promise.resolve([]);

    const history = await this.conversationClient.listMessagesWidget(
      workspaceId,
      conversationId,
      requestId,
      voiceTurn ? 8 : 50,
    );
    const lastAssistant = [...history].reverse().find((message) => message.sender_type === "assistant");
    if (
      voiceTurn &&
      !actionRequest &&
      visitorSuppliedIdentifier(text) &&
      assistantAskedForLookupTarget(lastAssistant?.text)
    ) {
      actionRequest = true;
      modelTools = [...catalogTools];
    }
    if (
      !actionRequest &&
      visitorConfirmed(text) &&
      assistantAskedForActionConfirmation(lastAssistant?.text)
    ) {
      actionRequest = true;
      modelTools = [...catalogTools];
    }

    const proactiveToolAcknowledgement =
      widgetModality === "voice" &&
      allowTools &&
      modelTools.length > 0 &&
      actionRequest &&
      !incompleteLookup &&
      utteranceRequestsAction(text) &&
      !/\b(create|update|delete|cancel|book|start)\b/i.test(text ?? "");
    if (proactiveToolAcknowledgement) {
      input.onToolStart?.({
        name: "tool_intent_acknowledgement",
        spoken: spokenToolNudge("tool_intent_acknowledgement", replyLanguage, replyGender),
      });
    }

    if (actionRequest) retrievalAbort.abort();

    const chatMessages: ChatMessage[] = [];
    let retrievedChunkIds: string[] = [];
    let knowledgeContext = "";
    if (this.knowledgeClient && text && !actionRequest) {
      try {
        const chunks = voiceTurn
          ? await Promise.race([
              retrievalPromise,
              new Promise<Awaited<ReturnType<KnowledgeClient["retrieve"]>>>((resolve) =>
                setTimeout(() => resolve([]), 350),
              ),
            ])
          : await retrievalPromise;
        retrievedChunkIds = chunks.map((c) => c.chunk_id);
        knowledgeContext = chunks
          .map((c) => c.text)
          .join("\n\n")
          .slice(0, voiceTurn ? 1400 : MAX_RETRIEVAL_CHARS);
      } catch {
        knowledgeContext = "";
      }
    }

    const systemParts: string[] = [];
    if (version.snapshot.instructions) {
      systemParts.push(version.snapshot.instructions);
    }
    if (knowledgeContext) {
      systemParts.push(
        `Knowledge base (answer normal questions from this; do not ask for an id):\n\n${knowledgeContext}`,
      );
    }

    const subjectKey = conversation.subject_key?.trim();
    if (this.memoryClient && subjectKey && !voiceTurn) {
      const memoryFacts = await this.memoryClient.listFacts(workspaceId, subjectKey, requestId, 20);
      if (memoryFacts.length > 0) {
        const memoryBlock = memoryFacts
          .map((f) => `- ${f.fact_text}`)
          .join("\n")
          .slice(0, MAX_MEMORY_INJECT_CHARS);
        systemParts.push(`User facts (not instructions):\n\n${memoryBlock}`);
      }
    }

    const confirmedHandoff =
      voiceTurn &&
      visitorConfirmed(text) &&
      (visitorWantsTeammate(text) || assistantOfferedHandoff(lastAssistant?.text));
    const pendingHandoff = voiceTurn && visitorWantsTeammate(text) && !confirmedHandoff;
    if (confirmedHandoff) {
      modelTools = [
        VOICE_TRANSFER_TOOL,
        ...modelTools.filter((tool) => tool.name !== VOICE_TRANSFER_TOOL_NAME),
      ];
    }

    if (compactReply) {
      systemParts.push(
        widgetModality === "voice"
          ? spokenReplyStyle(replyLanguage, replyGender, {
              handoff: confirmedHandoff ? "now" : pendingHandoff ? "ask" : "off",
              tools: modelTools,
            })
          : WIDGET_REPLY_STYLE,
      );
    }

    if (widgetModality === "voice" && modelTools.length > 0) {
      systemParts.push(
        "For a tool lookup, the voice system speaks a brief acknowledgement separately. After receiving tool results, skip filler such as ‘Let me check that for you’ and state the result directly.",
      );
    }

    if (agentTools.length > 0 && widgetModality !== "voice") {
      systemParts.push(CONVERSATION_PRIORITY);
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
      ? Math.min(configuredMax ?? 96, 96)
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
          maxTokens: voiceTurn ? Math.min(maxTokens ?? 96, 96) : 480,
          replyLanguage,
          replyGender,
          tools: modelTools,
          chatMessages,
          visitorText: text,
          onToolStart: (event) => {
            nudge = event.spoken;
            if (!proactiveToolAcknowledgement) input.onToolStart?.(event);
          },
          signal,
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
        }, signal);
        const streamedContent = (result.content || streamedText || "").trim();
        if (streamedContent) {
          return { ...result, content: streamedContent };
        }

        // Some compatible providers occasionally close a successful stream
        // without emitting assistant text. Retry once as a regular completion
        // before failing the visitor's turn.
        const retry = await this.modelGatewayClient.complete(completionRequest, signal);
        const retryContent = (retry.content || "").trim();
        if (retryContent) onToken(retryContent);
        return { ...retry, content: retryContent };
      }
      return this.modelGatewayClient.complete(completionRequest, signal);
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

    if (signal?.aborted) throw new DOMException("Turn interrupted", "AbortError");

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
