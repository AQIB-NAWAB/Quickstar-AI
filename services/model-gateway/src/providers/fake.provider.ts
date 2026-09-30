import type { ModelToolCall } from "@quickstart/contracts";
import { ProviderError } from "../domain/types.js";
import type { ProviderCompletionInput, ProviderCompletionOutput } from "../domain/types.js";
import type { ChatProvider } from "./types.js";

const callCounts = new Map<string, number>();
const toolRoundCounts = new Map<string, number>();

function scenario(modelId: string): string {
  if (modelId === "fake" || modelId === "default") return "ok";
  if (modelId.startsWith("fake:")) return modelId.slice("fake:".length);
  return modelId;
}

function bumpAttempt(requestId: string): number {
  const next = (callCounts.get(requestId) ?? 0) + 1;
  callCounts.set(requestId, next);
  return next;
}

export function resetFakeProviderState(): void {
  callCounts.clear();
  toolRoundCounts.clear();
}

function bumpToolRound(requestId: string): number {
  const next = (toolRoundCounts.get(requestId) ?? 0) + 1;
  toolRoundCounts.set(requestId, next);
  return next;
}

export class FakeChatProvider implements ChatProvider {
  readonly profileId = "fake";
  readonly driver = "fake";

  async complete(input: ProviderCompletionInput): Promise<ProviderCompletionOutput> {
    return this.run(input, () => {});
  }

  async stream(
    input: ProviderCompletionInput,
    onChunk: (delta: string) => void,
  ): Promise<ProviderCompletionOutput> {
    return this.run(input, onChunk);
  }

  private async run(
    input: ProviderCompletionInput,
    onChunk: (delta: string) => void,
  ): Promise<ProviderCompletionOutput> {
    const mode = scenario(input.modelId);
    const attempt = bumpAttempt(input.context.requestId);

    if (mode === "tool_once" && input.tools && input.tools.length > 0) {
      const round = bumpToolRound(input.context.requestId);
      if (round === 1) {
        const first = input.tools[0];
        const toolCalls: ModelToolCall[] = [
          {
            id: "fake-tool-call-1",
            name: first.name,
            arguments: { ping: true },
          },
        ];
        return {
          content: "",
          finishReason: "tool_calls",
          toolCalls,
          usage: { inputTokens: 12, outputTokens: 8 },
        };
      }
      const toolResult = input.messages.find((m) => m.role === "tool");
      const summary = toolResult?.content ?? "no-tool-result";
      const content = `fake-after-tool:${summary}`;
      if (onChunk) {
        onChunk(content);
      }
      return {
        content,
        finishReason: "stop",
        usage: { inputTokens: 14, outputTokens: 10 },
      };
    }

    if (mode === "hang") {
      await new Promise(() => {});
      throw new ProviderError("hang", { retryable: true });
    }

    if (mode === "fail") {
      throw new ProviderError("fake failure", { retryable: false, httpStatus: 500 });
    }

    if (mode === "429-once" && attempt === 1) {
      throw new ProviderError("rate limited", { retryable: true, httpStatus: 429 });
    }

    if (mode === "fail-before-tokens") {
      throw new ProviderError("fail before tokens", { retryable: false, httpStatus: 502 });
    }

    if (mode === "stream-fail-after") {
      onChunk("partial");
      throw new ProviderError("fail after tokens", { retryable: false, httpStatus: 500 });
    }

    const content =
      mode === "ok" || mode === "429-once"
        ? `fake-reply:${input.messages.at(-1)?.content ?? ""}`
        : `fake:${mode}`;

    if (onChunk) {
      for (const word of content.split(" ")) {
        onChunk(word + " ");
      }
    }

    return {
      content: content.trim(),
      finishReason: "stop",
      usage: { inputTokens: 10, outputTokens: 20 },
    };
  }
}
