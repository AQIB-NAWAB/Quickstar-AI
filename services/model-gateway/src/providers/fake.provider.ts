import { ProviderError } from "../domain/types.js";
import type { ProviderCompletionInput, ProviderCompletionOutput } from "../domain/types.js";
import type { ChatProvider } from "./types.js";

const callCounts = new Map<string, number>();

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
