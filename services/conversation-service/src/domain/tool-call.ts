import type { ToolCallStatus } from "@quickstart/contracts";

export type ToolCall = {
  id: string;
  workspaceId: string;
  conversationId: string;
  turnIdempotencyKey: string;
  toolCallKey: string;
  toolName: string;
  status: ToolCallStatus;
  requestJson: Record<string, unknown> | null;
  responseJson: Record<string, unknown> | null;
  errorCode: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function toToolCallJson(row: ToolCall) {
  return {
    id: row.id,
    workspace_id: row.workspaceId,
    conversation_id: row.conversationId,
    turn_idempotency_key: row.turnIdempotencyKey,
    tool_call_key: row.toolCallKey,
    tool_name: row.toolName,
    status: row.status,
    request_json: row.requestJson,
    response_json: row.responseJson,
    error_code: row.errorCode,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}
