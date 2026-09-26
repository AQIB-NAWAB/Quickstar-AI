import type { ProviderProfileConfig } from "../config/environment.js";
import { ProviderError } from "../domain/types.js";
import type { ProviderCompletionInput, ProviderCompletionOutput } from "../domain/types.js";
import type { ChatProvider } from "./types.js";

type OpenAiChatResponse = {
  choices?: Array<{
    message?: { content?: string };
    finish_reason?: string;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

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
    return {
      content: choice?.message?.content ?? "",
      finishReason: choice?.finish_reason ?? "stop",
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

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const parsed = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>;
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
          // skip malformed chunk
        }
      }
    }

    return {
      content,
      finishReason,
      usage: { inputTokens, outputTokens: outputTokens || Math.max(1, Math.ceil(content.length / 4)) },
    };
  }

  private buildBody(input: ProviderCompletionInput, stream: boolean): Record<string, unknown> {
    return {
      model: input.modelId,
      messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: input.temperature,
      max_tokens: input.maxTokens,
      stream,
    };
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
      const retryable = response.status === 429 || response.status >= 500;
      throw new ProviderError(`upstream ${response.status}`, {
        retryable,
        httpStatus: response.status,
      });
    }
    return response;
  }
}
