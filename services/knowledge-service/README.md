# Knowledge Service (`@quickstart/service-knowledge`)

Feature **11** ingest and **13** internal retrieval. Port **3009**.

## Commands

```bash
make up
make knowledge-migrate
export JWT_ACCESS_SECRET=dev-only-change-me-min-32-characters-long!!
export KNOWLEDGE_INTERNAL_TOKEN=local-dev-token-at-least-32-characters-long
pnpm --filter @quickstart/service-knowledge start
```

## Public API (via gateway :3000)

- `POST /v1/workspaces/:id/knowledge/sources` — enqueue text/document ingest
- `PATCH /v1/workspaces/:id/knowledge/sources/:sourceId` — update name or content (re-ingest)
- `GET /v1/workspaces/:id/knowledge/sources/:sourceId`
- `GET /v1/workspaces/:id/knowledge/sources`
- `DELETE /v1/workspaces/:id/knowledge/sources/:sourceId`

## Internal (runtime)

- `GET /internal/workspaces/:workspaceId/knowledge/ready-count`
- `POST /internal/retrieve`

## Object storage (S3 / MinIO)

When `KNOWLEDGE_S3_BUCKET`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY` are set, source bytes are stored in S3 (local MinIO via `make up`, port **9000**). Set `S3_ENDPOINT=http://127.0.0.1:9000` and `S3_FORCE_PATH_STYLE=true` for MinIO. Without S3, content is stored inline in Postgres `content_text` (dev only).

See [docs/api/knowledge-ingest.md](../../docs/api/knowledge-ingest.md).
