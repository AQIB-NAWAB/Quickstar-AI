import type { ChatMessage, ModelToolCall } from "@quickstart/contracts";
import type { ProviderProfileConfig } from "../config/environment.js";
import { ProviderError } from "../domain/types.js";
import type { ProviderCompletionInput, ProviderCompletionOutput } from "../domain/types.js";
import type { ChatProvider } from "./types.js";

type OpenAiToolCall = {
  id?: string;
  type?: string;
  function?: { name?: string; arguments?: string };
};

type OpenAiChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
      reasoning_content?: string | null;
      reasoning?: string | null;
      tool_calls?: OpenAiToolCall[];
    };
    finish_reason?: string;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

function parseToolArguments(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : { value: parsed };
  } catch {
    return { raw };
  }
}

function mapToolCalls(calls: OpenAiToolCall[] | undefined): ModelToolCall[] | undefined {
  if (!calls?.length) return undefined;
  return calls
    .map((call, index) => ({
      id: call.id || `tool-call-${index + 1}`,
      name: call.function?.name ?? "",
      arguments: parseToolArguments(call.function?.arguments),
    }))
    .filter((call) => call.name.length > 0);
}

function mapMessages(messages: ChatMessage[]): Record<string, unknown>[] {
  return messages.map((message) => {
    if (message.role === "tool") {
      return {
        role: "tool",
        tool_call_id: message.tool_call_id,
        content: message.content,
        ...(message.name ? { name: message.name } : {}),
      };
    }
    if (message.role === "assistant" && message.tool_calls?.length) {
      return {
        role: "assistant",
        content: message.content || null,
        tool_calls: message.tool_calls.map((call) => ({
          id: call.id,
          type: "function",
          function: {
            name: call.name,
            arguments: JSON.stringify(call.arguments ?? {}),
          },
        })),
      };
    }
    return { role: message.role, content: message.content };
  });
}

export class OpenAiCompatibleProvider implements ChatProvider {
  readonly profileId: string;
  readonly driver: string = "openai_compatible";

  constructor(private readonly config: ProviderProfileConfig) {
    this.profileId = config.id;
    if (!config.apiKey || !config.baseUrl) {
      throw new Error(`Provider profile ${config.id} missing apiKey or baseUrl`);
    }
  }

  async complete(input: ProviderCompletionInput): Promise<ProviderCompletionOutput> {
    const body = this.buildBody(input, false);
    const response = await this.post("/chat/completions", body);
    const json = (await response.json()) as OpenAiChatResponse;
    const choice = json.choices?.[0];
    const toolCalls = mapToolCalls(choice?.message?.tool_calls);
    const finishReason =
      toolCalls?.length && choice?.finish_reason !== "tool_calls"
        ? "tool_calls"
        : (choice?.finish_reason ?? "stop");
    // Reasoning fields are private model output, never a visitor-facing reply.
    const messageContent = choice?.message?.content ?? "";
    return {
      content: messageContent,
      finishReason,
      ...(toolCalls ? { toolCalls } : {}),
      usage: {
        inputTokens: json.usage?.prompt_tokens ?? 0,
        outputTokens: json.usage?.completion_tokens ?? 0,
      },
    };
  }

  async stream(
    input: ProviderCompletionInput,
    onChunk: (delta: string) => void,
  ): Promise<ProviderCompletionOutput> {
    const body = this.buildBody(input, true);
    const response = await this.post("/chat/completions", body);
    if (!response.body) {
      throw new ProviderError("empty stream body", { retryable: true });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";
    let finishReason = "stop";
    let inputTokens = 0;
    let outputTokens = 0;

    const consumeLine = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) return;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const parsed = JSON.parse(payload) as {
          choices?: Array<{
            delta?: { content?: string; reasoning?: string; reasoning_content?: string };
            finish_reason?: string | null;
          }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          content += delta;
          onChunk(delta);
        }
        const fr = parsed.choices?.[0]?.finish_reason;
        if (fr) finishReason = fr;
        if (parsed.usage) {
          inputTokens = parsed.usage.prompt_tokens ?? inputTokens;
          outputTokens = parsed.usage.completion_tokens ?? outputTokens;
        }
      } catch {
        // Ignore malformed or non-JSON SSE data frames.
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        buffer += decoder.decode();
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) consumeLine(line);
    }
    if (buffer.trim()) consumeLine(buffer);

    return {
      content,
      finishReason,
      usage: { inputTokens, outputTokens: outputTokens || Math.max(1, Math.ceil(content.length / 4)) },
    };
  }

  private buildBody(input: ProviderCompletionInput, stream: boolean): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: input.modelId,
      messages: mapMessages(input.messages),
      stream,
    };
    if (input.temperature !== undefined) body.temperature = input.temperature;
    if (input.maxTokens !== undefined) body.max_tokens = input.maxTokens;
    if (/gpt-oss/i.test(input.modelId)) {
      body.reasoning_effort = "low";
    }
    if (input.tools?.length) {
      body.tools = input.tools.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          ...(tool.parameters ? { parameters: tool.parameters } : {}),
        },
      }));
    }
    return body;
  }

  private async post(path: string, body: Record<string, unknown>): Promise<Response> {
    const url = `${this.config.baseUrl!.replace(/\/$/, "")}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey!}`,
      "Content-Type": "application/json",
      ...this.config.defaultHeaders,
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new ProviderError("upstream network error", { retryable: true, cause: error });
    }

    if (!response.ok) {
      const errText = await response.text();
      const retryable = response.status === 429 || response.status >= 500;
      throw new ProviderError(`upstream ${response.status}: ${errText}`, {
        retryable,
        httpStatus: response.status,
      });
    }
    return response;
  }
}
