/** Shared types for model-gateway internal API (Feature 10). */

export type ModelCredentialSource = "platform" | "workspace";

export type ModelRoutingMode = "static" | "jev";

export type ChatMessageRole = "system" | "user" | "assistant" | "tool";

export type ModelToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type ModelToolDefinition = {
  name: string;
  description: string;
  parameters?: {
    type: "object";
    properties?: Record<string, { type: string; description?: string; items?: { type: string } }>;
    required?: string[];
  };
};

export type ChatMessage = {
  role: ChatMessageRole;
  content: string;
  /** Present when role is `tool`. */
  tool_call_id?: string;
  /** Present when role is `tool` (MCP / named tool). */
  name?: string;
  /** Present when role is `assistant` and model requests tools. */
  tool_calls?: ModelToolCall[];
};

export type CompletionFinishReason = "stop" | "tool_calls";

export type ModelReference = {
  /** Named provider profile (env config). Use `fake` in tests. */
  profile: string;
  model_id: string;
};

export type CompletionRequestBody = {
  workspace_id: string;
  request_id: string;
  model: ModelReference;
  messages: ChatMessage[];
  tools?: ModelToolDefinition[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" };
  reasoning_effort?: "low" | "medium" | "high";
  fallback_model?: ModelReference;
  routing_mode?: ModelRoutingMode;
  credential_source?: ModelCredentialSource;
  credential_ref?: string;
};

export type TokenUsage = {
  input_tokens: number;
  output_tokens: number;
};

export type CompletionResponseBody = {
  content: string;
  finish_reason: CompletionFinishReason | string;
  tool_calls?: ModelToolCall[];
  usage: TokenUsage;
  provider: string;
  model: string;
  latency_ms: number;
};

export type JevQuestionType = "choice" | "score" | "noul";

export type JevQuestion = {
  id: string;
  type: JevQuestionType;
  /** OpenRouter Decisions API: judgment prompt */
  instructions?: string;
  /** Convenience alias for `instructions` */
  text?: string;
  /** Choice: option → description. Score: ordered level descriptions. */
  criteria?: Record<string, string> | string[];
  /** Choice only: shorthand; converted to `criteria` object when omitted */
  options?: string[];
};

export type DecideRequestBody = {
  workspace_id: string;
  request_id: string;
  state: string | Record<string, unknown> | unknown[];
  questions: JevQuestion[];
  jev_model?: string;
};

export type DecideResponseBody = {
  answers: Record<string, unknown>;
  usage?: Record<string, unknown>;
  model: string;
  latency_ms: number;
};
