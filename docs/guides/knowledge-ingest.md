# Knowledge Ingest Developer & Verification Guide (Feature 11)

This guide documents the local setup, verification workflow, and multi-tenant testing for **Feature 11 — Knowledge Ingest** ([Roadmap §13](../../docs/roadmap.md)).

## Architecture Summary

Knowledge ingest is an asynchronous, non-blocking pipeline:
1. **HTTP Ingress**: Records the source document in Postgres with initial status `queued` and immediately dispatches a job to the SQS queue.
2. **Container Worker**: A background worker dequeues the job, splits text into chunks, generates vector embeddings, and indexes them into OpenSearch with a strict `workspace_id` tenant identifier.
3. **OpenSearch Index**: Stores chunk vectors (`knn_vector` 1536 dim) and chunk metadata filtered strictly by `workspace_id`.

## Local Data Plane Requirements

Start all required local data plane services:
```bash
make up
```

This starts:
- **OpenSearch** on port `9200` (Vector store & full-text search)
- **ElasticMQ / SQS** on port `9324` (Job queue)
- **PostgreSQL** on port `5433` (Source metadata & status store)
- **Valkey / Redis** on port `6379` (Distributed locks & rate limiting)

Verify all containers are healthy:
```bash
docker compose ps
```

## Environment Variables

| Variable | Local Default | Description |
| --- | --- | --- |
| `OPENSEARCH_URL` | `http://localhost:9200` | OpenSearch cluster HTTP endpoint |
| `SQS_ENDPOINT` | `http://localhost:9324` | Local ElasticMQ / AWS SQS endpoint |
| `AWS_REGION` | `us-east-1` | AWS region for SQS client |
| `AWS_ACCESS_KEY_ID` | `local` | Dummy credentials for local ElasticMQ |
| `AWS_SECRET_ACCESS_KEY` | `local` | Dummy credentials for local ElasticMQ |
| `KNOWLEDGE_INGEST_QUEUE` | `quickstart-knowledge-ingest` | SQS queue name for ingest tasks |

## Data Plane Verification (`make knowledge-smoke`)

To verify that OpenSearch cluster health, ElasticMQ message queueing, and multi-tenant document indexing work as expected:

```bash
make knowledge-smoke
```

Or execute directly:
```bash
./scripts/smoke-knowledge-data-plane.sh
```

This verifies:
1. OpenSearch is reachable and reporting green/yellow health status.
2. ElasticMQ creates test queues and supports enqueue/dequeue message operations.
3. Indexes a document chunk for `workspace_id = WS_A`.
4. Executes a search for `WS_A` (returns 1 hit) and for `WS_B` (returns 0 hits, proving tenant isolation).

## Automated Smoke & Isolation Tests

Run the automated integration test suite:
```bash
node --test tests/knowledge-ingest.smoke.test.ts
```

This test suite runs with **zero paid vendor API keys** by employing a deterministic fake vector generator (`fakeEmbed`). It asserts:
- Asynchronous non-blocking upload: caller receives `{ status: "queued" }` in <1000ms before worker execution.
- Worker parses, generates embeddings, and indexes chunks.
- Multi-tenant isolation: Workspace B is strictly barred from retrieving Workspace A's indexed chunks.

## Bruno API Collection

A complete Bruno collection is available under `docs/bruno/knowledge/`:
- `1-create-source.bru`: `POST /v1/workspaces/:workspaceId/knowledge/sources` (Enqueues ingest)
- `2-get-source-status.bru`: `GET /v1/workspaces/:workspaceId/knowledge/sources/:sourceId` (Polls status)
- `3-list-sources.bru`: `GET /v1/workspaces/:workspaceId/knowledge/sources` (Lists sources)
- `4-delete-source.bru`: `DELETE /v1/workspaces/:workspaceId/knowledge/sources/:sourceId` (Deletes source & chunks)

Refer to [Knowledge Ingest API Documentation](../../docs/api/knowledge-ingest.md) for full request/response schemas and error envelopes.

## Scope & Roadmap "Still Unsafe" Notice

- **Supported Formats**: Plain text sources are supported in this milestone. PDF parsing, document OCR, web crawling, and cross-encoder rerankers are out of scope.
- **Worker Concurrency**: Job deduplication and source versioning prevent duplicate processing if multiple worker instances pick the same job.
- **CI Safety**: Paid LLM/embedding API vendor calls are prohibited in automated tests to prevent credential leakage and CI flakiness.
