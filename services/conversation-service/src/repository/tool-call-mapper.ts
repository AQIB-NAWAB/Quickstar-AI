import type { ToolCallStatus } from "@quickstart/contracts";
import type { ToolCall } from "../domain/tool-call.js";

export function mapToolCallRow(row: Record<string, unknown>): ToolCall {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    conversationId: String(row.conversation_id),
    turnIdempotencyKey: String(row.turn_idempotency_key),
    toolCallKey: String(row.tool_call_key),
    toolName: String(row.tool_name),
    status: row.status as ToolCallStatus,
    requestJson: (row.request_json as Record<string, unknown> | null) ?? null,
    responseJson: (row.response_json as Record<string, unknown> | null) ?? null,
    errorCode: row.error_code != null ? String(row.error_code) : null,
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}
