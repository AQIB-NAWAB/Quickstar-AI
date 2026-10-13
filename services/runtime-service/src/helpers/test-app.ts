import type { Server } from "node:http";
import { signAccessToken } from "@quickstart/auth";
import type {
  CompletionRequestBody,
  CompletionResponseBody,
  ToolCallRecord,
  UpsertToolCallBody,
} from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";
import { createLogger } from "@quickstart/logging";
import type { AgentClient, AgentInfo, AgentVersionInfo } from "../clients/agent.client.js";
import type {
  AppendMessageResult,
  ConversationClient,
  ConversationInfo,
  MessageInfo,
} from "../clients/conversation.client.js";
import type { ModelGatewayClient } from "../clients/model-gateway.client.js";
import type { WorkspaceRole } from "@quickstart/contracts";
import type { WorkspaceAccessClient } from "@quickstart/workspace-access";
import type { KnowledgeClient } from "../clients/knowledge.client.js";
import type { MemoryClient, MemoryFact } from "../clients/memory.client.js";
import { createHttpServer } from "../http/create-server.js";
import { ToolCallsClient } from "../clients/tool-calls.client.js";
import { McpToolRunner } from "../services/mcp-tool-runner.js";
import { ToolExecutor } from "../services/tool-executor.js";
import { ToolLoop } from "../services/tool-loop.js";
import { TurnsService } from "../services/turns.service.js";

export const TEST_JWT_SECRET = "test-secret-at-least-32-characters-long!!";

export async function createTestToken(
  userId: string = "00000000-0000-0000-0000-00000000000a",
  orgId: string = "00000000-0000-0000-0000-000000000001",
  jwtSecret: string = TEST_JWT_SECRET,
): Promise<string> {
  return signAccessToken(
    { sub: userId, org_id: orgId, sid: "session-test" },
    { secret: jwtSecret, ttlSeconds: 3600 },
  );
}

export class MockAgentClient implements Partial<AgentClient> {
  public agents = new Map<string, AgentInfo>();
  public versions = new Map<string, AgentVersionInfo>();

  async getAgent(workspaceId: string, agentId: string): Promise<AgentInfo> {
    const key = `${workspaceId}:${agentId}`;
    const agent = this.agents.get(key);
    if (!agent) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Agent not found in workspace",
      });
    }
    return agent;
  }

  async getVersion(
    workspaceId: string,
    agentId: string,
    versionId: string,
  ): Promise<AgentVersionInfo> {
    const key = `${workspaceId}:${agentId}:${versionId}`;
    const version = this.versions.get(key);
    if (!version) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Agent version not found",
      });
    }
    return version;
  }
}

export class MockConversationClient implements Partial<ConversationClient> {
  public conversations = new Map<string, ConversationInfo>();
  public messages = new Map<string, MessageInfo[]>();
  private seqCounter = 0;

  async getConversation(
    workspaceId: string,
    conversationId: string,
  ): Promise<ConversationInfo> {
    const key = `${workspaceId}:${conversationId}`;
    const conversation = this.conversations.get(key);
    if (!conversation) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Conversation not found in workspace",
      });
    }
    return conversation;
  }

  async appendMessage(
    workspaceId: string,
    conversationId: string,
    params: {
      text?: string;
      idempotency_key?: string;
      sender_type?: string;
      sender_id?: string;
    },
  ): Promise<AppendMessageResult> {
    const key = `${workspaceId}:${conversationId}`;
    if (!this.conversations.has(key)) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Conversation not found in workspace",
      });
    }

    const list = this.messages.get(key) ?? [];
    if (params.idempotency_key) {
      const existing = list.find((m) => m.idempotency_key === params.idempotency_key);
      if (existing) {
        return { message: existing, deduplicated: true };
      }
    }

    this.seqCounter += 1;
    const message: MessageInfo = {
      id: `msg-${this.seqCounter}`,
      workspace_id: workspaceId,
      conversation_id: conversationId,
      seq: this.seqCounter,
      sender_type: params.sender_type ?? "user",
      sender_id: params.sender_id ?? "unknown",
      text: params.text ?? "",
      idempotency_key: params.idempotency_key ?? `auto-${this.seqCounter}`,
      created_at: new Date().toISOString(),
    };

    list.push(message);
    this.messages.set(key, list);
    return { message, deduplicated: false };
  }

  async listMessages(
    workspaceId: string,
    conversationId: string,
  ): Promise<MessageInfo[]> {
    const key = `${workspaceId}:${conversationId}`;
    if (!this.conversations.has(key)) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Conversation not found in workspace",
      });
    }
    return [...(this.messages.get(key) ?? [])];
  }
}

export class MockWorkspaceAccess implements WorkspaceAccessClient {
  public role: WorkspaceRole = "admin";

  async resolveRole(): Promise<WorkspaceRole> {
    return this.role;
  }
}

export class MockMemoryClient implements Partial<MemoryClient> {
  public facts: MemoryFact[] = [];
  public shouldFail = false;

  async listFacts(): Promise<MemoryFact[]> {
    if (this.shouldFail) {
      return [];
    }
    return this.facts;
  }
}

export class MockKnowledgeClient implements Partial<KnowledgeClient> {
  public readyCountValue = 0;
  public chunks: Array<{ chunk_id: string; source_id: string; text: string; score: number }> = [];

  async readyCount(): Promise<number> {
    return this.readyCountValue;
  }

  async retrieve(): Promise<Array<{ chunk_id: string; source_id: string; text: string; score: number }>> {
    return this.chunks;
  }
}

export class MockToolCallsClient implements Partial<ToolCallsClient> {
  private records = new Map<string, ToolCallRecord>();

  async upsert(
    workspaceId: string,
    conversationId: string,
    body: UpsertToolCallBody,
  ): Promise<{ record: ToolCallRecord; created: boolean }> {
    const key = `${workspaceId}:${body.tool_call_key}`;
    const existing = this.records.get(key);
    const now = new Date().toISOString();
    if (existing && ["succeeded", "failed", "unknown"].includes(existing.status)) {
      return { record: existing, created: false };
    }
    const record: ToolCallRecord = {
      id: existing?.id ?? `tc-${this.records.size + 1}`,
      workspace_id: workspaceId,
      conversation_id: conversationId,
      turn_idempotency_key: body.turn_idempotency_key,
      tool_call_key: body.tool_call_key,
      tool_name: body.tool_name,
      status: body.status,
      request_json: body.request_json ?? null,
      response_json: body.response_json ?? null,
      error_code: body.error_code ?? null,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    this.records.set(key, record);
    return { record, created: !existing };
  }

  async listByTurn(
    workspaceId: string,
    conversationId: string,
    turnIdempotencyKey: string,
  ): Promise<ToolCallRecord[]> {
    return [...this.records.values()].filter(
      (r) =>
        r.workspace_id === workspaceId &&
        r.conversation_id === conversationId &&
        r.turn_idempotency_key === turnIdempotencyKey,
    );
  }
}

export class MockModelGatewayClient implements Partial<ModelGatewayClient> {
  public callCount = 0;
  public cannedResponse = "Hello! I am your agent.";
  public lastMessages: CompletionRequestBody["messages"] = [];
  private toolRounds = new Map<string, number>();

  async complete(body: CompletionRequestBody): Promise<CompletionResponseBody> {
    this.callCount += 1;
    this.lastMessages = body.messages;

    if (body.model.model_id === "fake:tool_once" && body.tools?.length) {
      const round = (this.toolRounds.get(body.request_id) ?? 0) + 1;
      this.toolRounds.set(body.request_id, round);
      if (round === 1) {
        return {
          content: "",
          finish_reason: "tool_calls",
          tool_calls: [
            { id: "tc-1", name: body.tools[0].name, arguments: { ping: true } },
          ],
          usage: { input_tokens: 10, output_tokens: 8 },
          provider: "fake",
          model: body.model.model_id,
          latency_ms: 15,
        };
      }
      const toolMsg = body.messages.find((m) => m.role === "tool");
      return {
        content: `after-tool:${toolMsg?.content ?? ""}`,
        finish_reason: "stop",
        usage: { input_tokens: 10, output_tokens: 8 },
        provider: "fake",
        model: body.model.model_id,
        latency_ms: 15,
      };
    }

    return {
      content: this.cannedResponse,
      finish_reason: "stop",
      usage: { input_tokens: 10, output_tokens: 8 },
      provider: "fake",
      model: body.model.model_id,
      latency_ms: 15,
    };
  }

  async stream(
    body: CompletionRequestBody,
    handlers: { onToken: (delta: string) => void },
  ): Promise<CompletionResponseBody> {
    const result = await this.complete(body);
    if (result.content) {
      handlers.onToken(result.content);
    }
    return result;
  }
}

export async function withRuntimeServer(
  run: (ctx: {
    port: number;
    agentClient: MockAgentClient;
    convClient: MockConversationClient;
    modelClient: MockModelGatewayClient;
    knowledgeClient: MockKnowledgeClient;
    memoryClient: MockMemoryClient;
    toolCallsClient: MockToolCallsClient;
    workspaceAccess: MockWorkspaceAccess;
    createToken: (userId?: string, orgId?: string) => Promise<string>;
  }) => Promise<void>,
): Promise<void> {
  const agentClient = new MockAgentClient();
  const convClient = new MockConversationClient();
  const modelClient = new MockModelGatewayClient();
  const knowledgeClient = new MockKnowledgeClient();
  const memoryClient = new MockMemoryClient();
  const toolCallsClient = new MockToolCallsClient();
  const workspaceAccess = new MockWorkspaceAccess();

  const toolExecutor = new ToolExecutor(undefined, new McpToolRunner(5_000));
  const toolLoop = new ToolLoop(
    modelClient as unknown as ModelGatewayClient,
    toolCallsClient as unknown as ToolCallsClient,
    toolExecutor,
  );

  const turnsService = new TurnsService(
    agentClient as unknown as AgentClient,
    convClient as unknown as ConversationClient,
    modelClient as unknown as ModelGatewayClient,
    knowledgeClient as unknown as KnowledgeClient,
    memoryClient as unknown as MemoryClient,
    toolLoop,
  );

  const logger = createLogger({ service: "service-runtime-test" });
  const app = createHttpServer({
    logger,
    turnsService,
    workspaceAccess,
    jwtSecret: TEST_JWT_SECRET,
    internalToken: "test-internal-token-at-least-32-chars!!",
  });

  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });

  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  try {
    await run({
      port,
      agentClient,
      convClient,
      modelClient,
      knowledgeClient,
      memoryClient,
      toolCallsClient,
      workspaceAccess,
      createToken: (userId, orgId) => createTestToken(userId, orgId),
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}
