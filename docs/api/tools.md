# Tools API (Feature 15)

Tool **definitions** live on the agent draft and are frozen in the published version snapshot. Tool **executions** are recorded in conversation-service (`tool_calls` table) during `POST .../turns`.

## Configure tools on an agent

```http
PATCH /v1/workspaces/:workspaceId/agents/:agentId
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "expected_version": 1,
  "tools": [
    {
      "id": "uuid",
      "name": "get_status",
      "type": "http",
      "description": "Fetch order status from customer API",
      "method": "GET",
      "base_url": "https://api.customer.com/v1",
      "allowed_hosts": ["api.customer.com"],
      "timeout_ms": 15000,
      "idempotent": true
    }
  ]
}
```

Publish the agent so the runtime reads tools from the immutable snapshot.

### Tool types

| `type` | Purpose |
| --- | --- |
| `http` | Allow-listed outbound HTTP to customer APIs |
| `builtin_web` | `action: scrape \| search` via web-fetch-service (internal) |
| `mcp` | MCP `tools/call` to `server_url` with `allowed_tool_names` |

## Run tools (runtime turn)

```http
POST /v1/workspaces/:workspaceId/conversations/:conversationId/turns
Authorization: Bearer <access_token>
Idempotency-Key: <turn-key>
Content-Type: application/json

{ "message": "Check my order" }
```

Requires `workspace.conversation.participate` and `workspace.tools.run`.

The runtime loops: model → optional `tool_calls` → execute → model until `stop` or max 5 rounds.

## Tool call records (conversation-service)

Runtime writes rows via:

```http
PUT /v1/workspaces/:workspaceId/conversations/:conversationId/tool-calls
Authorization: Bearer <access_token>
```

Body (`UpsertToolCallBody`): `turn_idempotency_key`, `tool_call_key`, `tool_name`, `status` (`pending` \| `succeeded` \| `failed` \| `unknown`), optional `request_json`, `response_json`, `error_code`.

List for a turn:

```http
GET /v1/workspaces/:workspaceId/conversations/:conversationId/tool-calls?turn_idempotency_key=<turn-key>
```

`tool_call_key` format: `{turnIdempotencyKey}:tool:{round}:{toolName}`.

## Fail policy

- Non-idempotent HTTP tools: timeout → `unknown`, no blind retry on turn replay.
- Web-fetch budget exceeded → typed `RATE_LIMITED` on tool step; runtime does not retry vendor.
- Terminal `tool_calls` rows replay on turn idempotency retry without re-executing outbound I/O.

See [ADR 0015](../adr/0015-tools.md).
