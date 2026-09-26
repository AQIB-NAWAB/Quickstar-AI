import type { ChatMessage, ModelReference } from "@quickstart/contracts";

export type ProviderCallContext = {
  workspaceId: string;
  requestId: string;
  attempt: number;
};

export type ProviderCompletionInput = {
  modelId: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  context: ProviderCallContext;
};

export type ProviderCompletionOutput = {
  content: string;
  finishReason: string;
  usage: { inputTokens: number; outputTokens: number };
};

export type ProviderStreamHandler = (delta: string) => void;

export type ResolvedModelCall = {
  profileId: string;
  modelId: string;
  reference: ModelReference;
};

export class ProviderError extends Error {
  readonly retryable: boolean;
  readonly httpStatus?: number;

  constructor(message: string, options: { retryable: boolean; httpStatus?: number; cause?: unknown }) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "ProviderError";
    this.retryable = options.retryable;
    this.httpStatus = options.httpStatus;
  }
}
