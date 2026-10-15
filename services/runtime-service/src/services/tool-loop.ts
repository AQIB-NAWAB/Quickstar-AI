import type {
  AgentToolDefinition,
  ChatMessage,
  CompletionRequestBody,
  ModelToolDefinition,
} from "@quickstart/contracts";
import { MAX_TOOL_ROUNDS_PER_TURN } from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { ModelGatewayClient } from "../clients/model-gateway.client.js";
import type { ToolCallsClient } from "../clients/tool-calls.client.js";
import { buildToolCallKey } from "../lib/tool-call-key.js";
import type { ToolExecutor } from "./tool-executor.js";
import { spokenToolNudge, VOICE_TRANSFER_TOOL_NAME } from "./voice-tools.js";

function toModelTools(tools: AgentToolDefinition[]): ModelToolDefinition[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
}

function findTool(tools: AgentToolDefinition[], name: string): AgentToolDefinition | undefined {
  return tools.find((t) => t.name === name);
}

export type ToolLoopInput = {
  workspaceId: string;
  conversationId: string;
  requestId: string;
  turnIdempotencyKey: string;
  authHeaders: Record<string, string>;
  model: CompletionRequestBody["model"];
  temperature?: number;
  tools: AgentToolDefinition[];
  chatMessages: ChatMessage[];
  maxTokens?: number;
  replyLanguage?: string;
  /** Spoken before the tool runs so the caller is not left in silence. */
  onToolStart?: (event: { name: string; spoken: string }) => void;
};

export class ToolLoop {
  constructor(
    private readonly modelClient: ModelGatewayClient,
    private readonly toolCallsClient: ToolCallsClient,
    private readonly executor: ToolExecutor,
  ) {}

  async run(
    input: ToolLoopInput,
  ): Promise<{ content: string; chatMessages: ChatMessage[]; transferred: boolean }> {
    const messages = [...input.chatMessages];
    const modelTools = input.tools.length > 0 ? toModelTools(input.tools) : undefined;
    let transferred = false;

    for (let round = 0; round < MAX_TOOL_ROUNDS_PER_TURN; round += 1) {
      const completion = await this.modelClient.complete({
        workspace_id: input.workspaceId,
        request_id: input.requestId,
        model: input.model,
        messages,
        tools: modelTools,
        temperature: input.temperature,
        ...(input.maxTokens ? { max_tokens: input.maxTokens } : {}),
      });

      if (completion.finish_reason !== "tool_calls" || !completion.tool_calls?.length) {
        return { content: completion.content, chatMessages: messages, transferred };
      }

      const primary =
        completion.tool_calls.find((call) => call.name === VOICE_TRANSFER_TOOL_NAME) ??
        completion.tool_calls[0];
      input.onToolStart?.({
        name: primary.name,
        spoken: spokenToolNudge(primary.name, input.replyLanguage),
      });

      messages.push({
        role: "assistant",
        content: completion.content ?? "",
        tool_calls: completion.tool_calls,
      });

      for (const [callIndex, call] of completion.tool_calls.entries()) {
        if (call.name === VOICE_TRANSFER_TOOL_NAME) {
          transferred = true;
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            name: call.name,
            content: JSON.stringify({
              ok: true,
              status: "waiting_for_teammate",
              instruction: "The caller already heard the switch line. Reply with an empty string.",
            }),
          });
          continue;
        }
        const tool = findTool(input.tools, call.name);
        if (!tool) {
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            name: call.name,
            content: JSON.stringify({ error: "tool not configured on agent version" }),
          });
          continue;
        }

        const toolCallKey = buildToolCallKey(
          input.turnIdempotencyKey,
          round,
          `${call.name}:${callIndex}`,
        );
        const existing = await this.listPrior(input, input.turnIdempotencyKey);
        const prior = existing.find((r) => r.tool_call_key === toolCallKey);
        if (prior && ["succeeded", "failed", "unknown"].includes(prior.status)) {
          const replay =
            prior.response_json != null
              ? JSON.stringify(prior.response_json)
              : (prior.error_code ?? prior.status);
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            name: call.name,
            content: replay,
          });
          continue;
        }

        await this.remember(input, {
          turn_idempotency_key: input.turnIdempotencyKey,
          tool_call_key: toolCallKey,
          tool_name: call.name,
          status: "pending",
          request_json: call.arguments,
        });

        const timeoutMs = tool.timeout_ms ?? 30_000;
        const result = await this.executor.execute(tool, call.arguments, {
          workspaceId: input.workspaceId,
          requestId: input.requestId,
          toolCallKey,
          timeoutMs,
          authorization: input.authHeaders.authorization,
        });

        await this.remember(input, {
          turn_idempotency_key: input.turnIdempotencyKey,
          tool_call_key: toolCallKey,
          tool_name: call.name,
          status: result.status,
          request_json: call.arguments,
          response_json: result.ok ? { content: result.content } : null,
          error_code: result.errorCode ?? null,
        });

        messages.push({
          role: "tool",
          tool_call_id: call.id,
          name: call.name,
          content: result.content,
        });
      }
    }

    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: `Exceeded maximum tool rounds (${MAX_TOOL_ROUNDS_PER_TURN})`,
    });
  }

  /** Widget voice has no staff token. A failed audit write must not block the function. */
  private async listPrior(input: ToolLoopInput, turnIdempotencyKey: string) {
    try {
      return await this.toolCallsClient.listByTurn(
        input.workspaceId,
        input.conversationId,
        turnIdempotencyKey,
        input.authHeaders,
      );
    } catch {
      return [];
    }
  }

  private async remember(
    input: ToolLoopInput,
    body: Parameters<ToolCallsClient["upsert"]>[2],
  ): Promise<void> {
    try {
      await this.toolCallsClient.upsert(
        input.workspaceId,
        input.conversationId,
        body,
        input.authHeaders,
      );
    } catch {
      /* the function result is still returned to the model */
    }
  }
}
