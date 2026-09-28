# ADR 0013 — Knowledge ingest and retrieval (Features 11 & 13)

## Status

Accepted

## Context

Agents need workspace-scoped documents in search before the runtime can ground answers. Ingest must not block HTTP on embedding. Retrieval must never query OpenSearch without a `workspace_id` filter.

## Decision

- **Service:** `services/knowledge-service` on port **3009**.
- **Postgres:** `knowledge_sources` metadata and status.
- **Queue:** ElasticMQ/SQS `quickstart-knowledge-ingest` for ingest and delete jobs.
- **Search:** OpenSearch index `quickstart-knowledge-chunks` with `workspace_id` on every document.
- **Embed:** `FakeEmbeddingProvider` for local/CI; optional OpenAI when `EMBEDDING_PROVIDER=openai` and key set.
- **Runtime:** calls `GET /internal/.../ready-count` and `POST /internal/retrieve` with `KNOWLEDGE_INTERNAL_TOKEN`. If ready sources exist and retrieval fails, the turn fails closed.
- **v1 sources:** `text` only; URL/site via web-fetch is a follow-up.

## Consequences

- Worker runs in-process for local dev; scale-out adds dedicated worker replicas polling the same queue.
- No reranker or citation UI in v1.
