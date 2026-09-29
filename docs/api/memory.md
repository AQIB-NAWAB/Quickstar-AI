# Memory API (Feature 14)

End-user facts are stored in Postgres, scoped by `workspace_id` and **`subject_key`** (the chatter, not staff JWT `sub`). The runtime injects facts on the turn path when the conversation was created with a `subject_key`.

## Create conversation with subject

```http
POST /v1/workspaces/:workspaceId/conversations
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "agent_id": "<uuid>",
  "subject_key": "anon:<uuid>"
}
```

Widget clients should generate `anon:{uuid}`, persist it, and send the same value here.

## List facts

- **GET** `/v1/workspaces/:workspaceId/memory/facts?subject_key=&limit=`
- Permission: `workspace.memory.read`

## Create fact

- **POST** `/v1/workspaces/:workspaceId/memory/facts`
- Permission: `workspace.memory.write`
- Body: `{ "subject_key", "fact_key?", "fact_text" }`
- Caps: 50 facts per subject, 2048 chars per `fact_text`
- Denylist rejects secret-like content (see ADR 0014)

## Update / delete

- **PATCH** `/v1/workspaces/:workspaceId/memory/facts/:factId`
- **DELETE** `/v1/workspaces/:workspaceId/memory/facts/:factId`
- **DELETE** `/v1/workspaces/:workspaceId/memory/facts?subject_key=` — erase all facts for a subject (GDPR path)

## Internal (runtime)

- **GET** `/internal/workspaces/:workspaceId/memory/facts?subject_key=&limit=`
- `Authorization: Bearer <MEMORY_INTERNAL_TOKEN>`

## Fail policy

Memory read failures on the turn path are **fail-open** (turn continues without facts). Knowledge RAG when sources exist remains fail-closed per ADR 0013.
