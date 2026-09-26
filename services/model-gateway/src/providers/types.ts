import type {
  ProviderCompletionInput,
  ProviderCompletionOutput,
  ProviderStreamHandler,
} from "../domain/types.js";

export interface ChatProvider {
  readonly profileId: string;
  readonly driver: string;
  complete(input: ProviderCompletionInput): Promise<ProviderCompletionOutput>;
  stream(
    input: ProviderCompletionInput,
    onChunk: ProviderStreamHandler,
  ): Promise<ProviderCompletionOutput>;
}
