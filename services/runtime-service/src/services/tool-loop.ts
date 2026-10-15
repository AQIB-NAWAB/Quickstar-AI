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
import {
  spokenToolNudge,
  toolChangesData,
  visitorConfirmed,
  VOICE_TRANSFER_TOOL_NAME,
} from "./voice-tools.js";

function toModelTools(tools: AgentToolDefinition[]): ModelToolDefinition[] {
  return tools.map((t) => {
    const pathArgs = t.type === "http" ? [...(t.path_template ?? "").matchAll(/\{(\w+)\}/g)].map((m) => m[1]) : [];
    const properties = t.parameters?.properties ?? {};
    return {
      name: t.name,
      description: t.description,
      parameters: t.parameters
        ? { ...t.parameters, required: [...new Set([...(t.parameters.required ?? []), ...pathArgs])] }
        : pathArgs.length > 0
          ? { type: "object", properties, required: pathArgs }
          : undefined,
    };
  });
}

function findTool(tools: AgentToolDefinition[], name: string): AgentToolDefinition | undefined {
  return tools.find((t) => t.name === name);
}

/** Required parameters the model did not supply. Empty values count as missing. */
function missingRequiredArgs(tool: AgentToolDefinition, args: Record<string, unknown>): string[] {
  const pathArgs = tool.type === "http" ? [...(tool.path_template ?? "").matchAll(/\{(\w+)\}/g)].map((m) => m[1]) : [];
  const required = [...new Set([...(tool.parameters?.required ?? []), ...pathArgs])];
  return required.filter((key) => {
    const value = args[key];
    return (
      value === undefined || value === null || (typeof value === "string" && value.trim() === "")
    );
  });
}

const SPOKEN_NUMBERS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
};

function normalizeSpokenNumbers(value: string): string {
  return value.toLowerCase().replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\b/g, (word) =>
    String(SPOKEN_NUMBERS[word]),
  );
}

function normalizePathArgs(
  tool: AgentToolDefinition,
  args: Record<string, unknown>,
): Record<string, unknown> {
  if (tool.type !== "http") return args;
  const normalized = { ...args };
  for (const match of (tool.path_template ?? "").matchAll(/\{(\w+)\}/g)) {
    const key = match[1];
    const value = normalized[key];
    if (typeof value === "string") {
      const numeric = SPOKEN_NUMBERS[value.trim().toLowerCase()];
      if (numeric !== undefined) normalized[key] = String(numeric);
    }
  }
  return normalized;
}

function assistantAskedForIdentifier(messages: ChatMessage[]): boolean {
  const previousAssistant = [...messages]
    .reverse()
    .find((message) => message.role === "assistant" && !message.tool_calls?.length)?.content;
  return /\b(?:what|which|provide|give|tell me|share).{0,60}\b(?:id|identifier|number|post|order|ticket|invoice|run|record|account|shipment|booking|payment|lead|customer)\b|\b(?:id|identifier|number).{0,45}\?\s*$/i.test(
    previousAssistant ?? "",
  );
}

function inventedPathArgs(
  tool: AgentToolDefinition,
  args: Record<string, unknown>,
  visitorText: string | undefined,
  chatMessages: ChatMessage[],
): string[] {
  if (tool.type !== "http") return [];
  const text = normalizeSpokenNumbers(visitorText ?? "");
  return [...(tool.path_template ?? "").matchAll(/\{(\w+)\}/g)]
    .map((match) => match[1])
    .filter((key) => {
      const value = args[key];
      if (typeof value !== "string" && typeof value !== "number") return true;
      const normalizedValue = normalizeSpokenNumbers(String(value).trim());
      if (!text.includes(normalizedValue)) return true;
      if (!/id$/i.test(key)) return false;
      const escapedValue = normalizedValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const explicitId = new RegExp(
        `(?:\\b(?:id|number)\\s*(?:is\\s*)?#?\\s*${escapedValue}\\b|#\\s*${escapedValue}\\b|\\b(?:order|post|ticket|invoice|run|record|account|shipment|booking|payment|lead|customer)\\s+(?:id\\s+)?${escapedValue}\\b)`,
      );
      return !explicitId.test(text) && !assistantAskedForIdentifier(chatMessages);
    });
}

function toolGuardMessage(message: string): string {
  return JSON.stringify({ error: "tool_guard", instruction: message });
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
  visitorText?: string;
  signal?: AbortSignal;
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
    const executedCalls = new Map<string, number>();

    for (let round = 0; round < MAX_TOOL_ROUNDS_PER_TURN; round += 1) {
      if (input.signal?.aborted) throw new DOMException("Turn interrupted", "AbortError");
      const completion = await this.modelClient.complete({
        workspace_id: input.workspaceId,
        request_id: input.requestId,
        model: input.model,
        messages,
        tools: modelTools,
        temperature: input.temperature,
        ...(input.maxTokens ? { max_tokens: input.maxTokens } : {}),
      }, input.signal);
      if (input.signal?.aborted) throw new DOMException("Turn interrupted", "AbortError");

      if (completion.finish_reason !== "tool_calls" || !completion.tool_calls?.length) {
        return { content: completion.content, chatMessages: messages, transferred };
      }

      messages.push({
        role: "assistant",
        content: completion.content ?? "",
        tool_calls: completion.tool_calls,
      });

      for (const [callIndex, call] of completion.tool_calls.entries()) {
        if (call.name === VOICE_TRANSFER_TOOL_NAME) {
          transferred = true;
          input.onToolStart?.({
            name: call.name,
            spoken: spokenToolNudge(call.name, input.replyLanguage),
          });
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

        const args = normalizePathArgs(tool, call.arguments ?? {});
        const callFingerprint = `${call.name}:${JSON.stringify(args)}`;
        if (executedCalls.has(callFingerprint)) {
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            name: call.name,
            content: toolGuardMessage(
              `You already called ${call.name} with these arguments in this reply. Do not call it again — answer the visitor using the result you already received.`,
            ),
          });
          continue;
        }

        const missing = missingRequiredArgs(tool, args);
        const invented = inventedPathArgs(tool, args, input.visitorText, messages);
        const needsDetails = [...new Set([...missing, ...invented])];
        if (needsDetails.length > 0) {
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            name: call.name,
            content: toolGuardMessage(
              `The visitor did not give ${needsDetails.join(", ")}. If they were only asking a normal question, ignore this tool and answer from the knowledge base. If they asked you to run this action, ask one short question for that detail. Do not invent a value.`,
            ),
          });
          continue;
        }

        if (toolChangesData(tool) && !visitorConfirmed(input.visitorText)) {
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            name: call.name,
            content: toolGuardMessage(
              "This action changes data. Ask the visitor one short confirmation question and wait. Do not call this tool again until they say yes.",
            ),
          });
          continue;
        }

        executedCalls.set(callFingerprint, round);
        input.onToolStart?.({
          name: call.name,
          spoken: spokenToolNudge(call.name, input.replyLanguage),
        });

        // Barge-in can arrive while the model is choosing a tool. Never start
        // the external action after the caller has interrupted that turn.
        if (input.signal?.aborted) throw new DOMException("Turn interrupted", "AbortError");

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
          request_json: args,
        });

        const timeoutMs = tool.timeout_ms ?? 30_000;
        const result = await this.executor.execute(tool, args, {
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
          request_json: args,
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
