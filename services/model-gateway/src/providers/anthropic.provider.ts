import type { ProviderProfileConfig } from "../config/environment.js";
import { ProviderError } from "../domain/types.js";
import type { ProviderCompletionInput, ProviderCompletionOutput } from "../domain/types.js";
import type { ChatProvider } from "./types.js";

type AnthropicMessageResponse = {
  content?: Array<{ type: string; text?: string }>;
  stop_reason?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
};

export class AnthropicChatProvider implements ChatProvider {
  readonly profileId: string;
  readonly driver = "anthropic";

  constructor(private readonly config: ProviderProfileConfig) {
    this.profileId = config.id;
    if (!config.apiKey) {
      throw new Error(`Provider profile ${config.id} missing apiKey`);
    }
  }

  async complete(input: ProviderCompletionInput): Promise<ProviderCompletionOutput> {
    const json = await this.request(input, false);
    const text = json.content?.find((c) => c.type === "text")?.text ?? "";
    return {
      content: text,
      finishReason: json.stop_reason ?? "end_turn",
      usage: {
        inputTokens: json.usage?.input_tokens ?? 0,
        outputTokens: json.usage?.output_tokens ?? 0,
      },
    };
  }

  async stream(
    input: ProviderCompletionInput,
    onChunk: (delta: string) => void,
  ): Promise<ProviderCompletionOutput> {
    const base = this.config.baseUrl?.replace(/\/$/, "") ?? "https://api.anthropic.com";
    const url = `${base}/v1/messages`;
    const system = input.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
    const messages = input.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));

    const body: Record<string, unknown> = {
      model: input.modelId,
      max_tokens: input.maxTokens ?? 1024,
      messages,
      stream: true,
    };
    if (system) body.system = system;
    if (input.temperature !== undefined) body.temperature = input.temperature;

    const response = await this.rawPost(url, body);
    if (!response.body) {
      throw new ProviderError("empty anthropic stream", { retryable: true });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";
    let finishReason = "end_turn";
    let inputTokens = 0;
    let outputTokens = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const event = JSON.parse(payload) as {
            type?: string;
            delta?: { type?: string; text?: string };
            message?: { usage?: { input_tokens?: number; output_tokens?: number } };
          };
          if (event.type === "content_block_delta" && event.delta?.text) {
            content += event.delta.text;
            onChunk(event.delta.text);
          }
          if (event.type === "message_delta" && event.message?.usage) {
            inputTokens = event.message.usage.input_tokens ?? inputTokens;
            outputTokens = event.message.usage.output_tokens ?? outputTokens;
          }
          if (event.type === "message_stop") {
            finishReason = "end_turn";
          }
        } catch {
          // skip
        }
      }
    }

    return {
      content,
      finishReason,
      usage: {
        inputTokens,
        outputTokens: outputTokens || Math.max(1, Math.ceil(content.length / 4)),
      },
    };
  }

  private async request(
    input: ProviderCompletionInput,
    stream: boolean,
  ): Promise<AnthropicMessageResponse> {
    const base = this.config.baseUrl?.replace(/\/$/, "") ?? "https://api.anthropic.com";
    const url = `${base}/v1/messages`;
    const system = input.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
    const messages = input.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));

    const body: Record<string, unknown> = {
      model: input.modelId,
      max_tokens: input.maxTokens ?? 1024,
      messages,
      stream,
    };
    if (system) body.system = system;
    if (input.temperature !== undefined) body.temperature = input.temperature;

    const response = await this.rawPost(url, body);
    return (await response.json()) as AnthropicMessageResponse;
  }

  private async rawPost(url: string, body: Record<string, unknown>): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "x-api-key": this.config.apiKey!,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new ProviderError("anthropic network error", { retryable: true, cause: error });
    }

    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      throw new ProviderError(`anthropic ${response.status}`, {
        retryable,
        httpStatus: response.status,
      });
    }
    return response;
  }
}
