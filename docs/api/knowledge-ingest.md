# Knowledge Ingest API (Feature 11)

Knowledge Ingestion provides durable, asynchronous processing of workspace knowledge sources (documents, FAQs, policies) into vector-searchable chunks stored in OpenSearch with strict `workspace_id` tenant isolation.

## Asynchronous Architecture Overview

Ingestion is **non-blocking** by design:
1. **HTTP Ingress**: The caller submits raw content or a document reference. The API persists a `sources` record with status `queued` and publishes an ingestion job to the SQS-shaped queue (ElasticMQ locally).
2. **Fast Response**: The HTTP request returns immediately (`202 Accepted` or `201 Created`). It does **not** hold the connection open while parsing, chunking, or embedding.
3. **Background Worker**: An async worker consumes the job:
   - Splits text into chunks.
   - Generates vector embeddings (mock/fake in CI; embedding provider in production).
   - Indexes chunks into OpenSearch with `workspace_id` and `source_id`.
   - Updates source status: `queued` → `processing` → `ready` (or `failed` with error details).

```
[ Client ]
    │
    ▼ POST /v1/workspaces/:id/knowledge/sources
[ API Gateway / Knowledge API ] ──( status: queued )──► [ Postgres ]
    │
    ├──( enqueue job )──────────────────────────────► [ SQS / ElasticMQ ]
    │
    ▼ (immediate HTTP 202/201 response)
[ Client receives { status: "queued", id: "..." } ]

    [ Ingest Worker ] ◄──( poll job )───────────────── [ SQS / ElasticMQ ]
         │
         ├── Parse & Chunk
         ├── Embed (Model Gateway / Provider)
         ├── Index with workspace_id ────────────────► [ OpenSearch :9200 ]
         └── Update status: ready / failed ──────────► [ Postgres ]
```

---

## Endpoints

All endpoints require standard `Bearer <access_token>` authentication and are scoped by `:workspaceId`.

### 1. Create Knowledge Source (Enqueue Ingest)

Submits a new knowledge source for asynchronous processing.

- **Method:** `POST`
- **Path:** `/v1/workspaces/:workspaceId/knowledge/sources`
- **Headers:**
  - `Authorization: Bearer <jwt_access_token>`
  - `Content-Type: application/json`

#### Request Body
```json
{
  "name": "Refund Policy 2026",
  "content": "Customers can request a full refund within 30 days of purchase with receipt.",
  "type": "text",
  "metadata": {
    "category": "billing",
    "version": "1.0"
  }
}
```

#### Response (`202 Accepted` or `201 Created`)
```json
{
  "request_id": "8c4e55ef-a03b-4cc7-a433-8bf5dfd9e4d8",
  "source": {
    "id": "7bacc45f-8bdc-405a-943f-a3f534e19692",
    "workspace_id": "00000000-0000-4000-8000-0000000000a1",
    "name": "Refund Policy 2026",
    "type": "text",
    "status": "queued",
    "chunk_count": 0,
    "error_message": null,
    "created_at": "2026-09-26T12:00:00.000Z",
    "updated_at": "2026-09-26T12:00:00.000Z"
  }
}
```

---

### 2. Get Knowledge Source Status

Polls the ingestion status and chunk metrics of a source.

- **Method:** `GET`
- **Path:** `/v1/workspaces/:workspaceId/knowledge/sources/:sourceId`
- **Headers:**
  - `Authorization: Bearer <jwt_access_token>`

#### Response (`200 OK` — Processing Complete)
```json
{
  "request_id": "20bb4c63-bfd2-4ab8-8946-71c35daa0ca8",
  "source": {
    "id": "7bacc45f-8bdc-405a-943f-a3f534e19692",
    "workspace_id": "00000000-0000-4000-8000-0000000000a1",
    "name": "Refund Policy 2026",
    "type": "text",
    "status": "ready",
    "chunk_count": 4,
    "error_message": null,
    "created_at": "2026-09-26T12:00:00.000Z",
    "updated_at": "2026-09-26T12:00:04.120Z"
  }
}
```

#### Status Lifecycle
| Status | Description |
| --- | --- |
| `queued` | Recorded in DB; ingest job enqueued on SQS/ElasticMQ. |
| `processing` | Worker has picked up job; parsing, chunking, and embedding. |
| `ready` | All chunks successfully embedded and indexed into OpenSearch. |
| `failed` | Error occurred during processing; `error_message` contains sanitized failure reason. |

---

### 3. List Knowledge Sources

Lists all knowledge sources belonging to the specified workspace.

- **Method:** `GET`
- **Path:** `/v1/workspaces/:workspaceId/knowledge/sources?status=ready&limit=20`
- **Headers:**
  - `Authorization: Bearer <jwt_access_token>`

#### Response (`200 OK`)
```json
{
  "request_id": "3d8d6aac-a5b5-4af8-acf3-9fb225bc11ec",
  "sources": [
    {
      "id": "7bacc45f-8bdc-405a-943f-a3f534e19692",
      "workspace_id": "00000000-0000-4000-8000-0000000000a1",
      "name": "Refund Policy 2026",
      "status": "ready",
      "chunk_count": 4,
      "created_at": "2026-09-26T12:00:00.000Z"
    }
  ],
  "total": 1
}
```

---

### 4. Delete Knowledge Source

Deletes the source record and triggers deletion of all corresponding chunks in OpenSearch.

- **Method:** `DELETE`
- **Path:** `/v1/workspaces/:workspaceId/knowledge/sources/:sourceId`
- **Headers:**
  - `Authorization: Bearer <jwt_access_token>`

#### Response (`200 OK` or `204 No Content`)
```json
{
  "request_id": "debfea4a-4337-47f6-af53-e3b59a12c704",
  "deleted": true
}
```

---

## Error Handling & Status Codes

All errors conform to the platform JSON envelope with a unique `request_id`.

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Knowledge source not found",
    "request_id": "46620054-ff37-4519-96f2-5782957f49fa"
  }
}
```

| HTTP Status | Error `code` | Scenario |
| --- | --- | --- |
| **400 Bad Request** | `VALIDATION_FAILED` | Missing source `name` or empty `content`. |
| **401 Unauthorized** | `UNAUTHORIZED` | Missing or invalid Bearer JWT token. |
| **403 Forbidden** | `FORBIDDEN` | Caller lacks workspace permission (`workspace.agent.update` or equivalent). |
| **404 Not Found** | `NOT_FOUND` | Source does not exist **OR** caller is attempting to access a source belonging to another workspace (strict anti-IDOR fail-closed). |
| **429 Too Many Requests** | `RATE_LIMITED` | Upload burst exceeds rate limit. |
| **503 Service Unavailable** | `UPSTREAM_UNAVAILABLE` | OpenSearch, SQS, or database connection is offline. |

---

## Multi-Tenant OpenSearch Query Pattern

Chunks are indexed in OpenSearch with `workspace_id`. Every search query **must** contain a `filter` clause on `workspace_id`:

```json
{
  "query": {
    "bool": {
      "filter": [
        { "term": { "workspace_id": "00000000-0000-4000-8000-0000000000a1" } }
      ],
      "must": [
        { "match": { "text": "refund policy" } }
      ]
    }
  }
}
```
*A search omitting `workspace_id` is an IDOR violation and must never be permitted in application code.*
