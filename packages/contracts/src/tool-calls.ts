/** Durable tool execution records (conversation-service, Feature 15). */

export type ToolCallStatus = "pending" | "succeeded" | "failed" | "unknown";

export type ToolCallRecord = {
  id: string;
  workspace_id: string;
  conversation_id: string;
  turn_idempotency_key: string;
  tool_call_key: string;
  tool_name: string;
  status: ToolCallStatus;
  request_json: Record<string, unknown> | null;
  response_json: Record<string, unknown> | null;
  error_code: string | null;
  created_at: string;
  updated_at: string;
};

export type UpsertToolCallBody = {
  turn_idempotency_key: string;
  tool_call_key: string;
  tool_name: string;
  status: ToolCallStatus;
  request_json?: Record<string, unknown> | null;
  response_json?: Record<string, unknown> | null;
  error_code?: string | null;
};
