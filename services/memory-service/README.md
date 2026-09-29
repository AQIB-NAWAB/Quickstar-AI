# Memory service

Feature **14** — capped Postgres facts per end-user `subject_key`. Port **3010**.

## Local setup

```bash
make memory-migrate
export JWT_ACCESS_SECRET='local-dev-secret-at-least-32-characters-long'
export MEMORY_INTERNAL_TOKEN='local-dev-token-at-least-32-characters-long'
pnpm --filter @quickstart/service-memory dev
```

## HTTP examples

```bash
WORKSPACE_ID='00000000-0000-4000-8000-0000000000a1'
TOKEN='<access_token>'

curl -s -X POST "http://127.0.0.1:3000/v1/workspaces/$WORKSPACE_ID/memory/facts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"subject_key":"anon:visitor-1","fact_key":"channel","fact_text":"Prefers WhatsApp"}'

curl -s "http://127.0.0.1:3000/v1/workspaces/$WORKSPACE_ID/memory/facts?subject_key=anon:visitor-1" \
  -H "Authorization: Bearer $TOKEN"
```

Runtime reads facts via internal `GET /internal/workspaces/:workspaceId/memory/facts?subject_key=` when the conversation has `subject_key` set at create time.

See [docs/api/memory.md](../../docs/api/memory.md) and [docs/adr/0014-memory.md](../../docs/adr/0014-memory.md).
