# Knowledge & Memory UI — Backend Dependencies & Contract Gaps

This document specifies the concrete backend API contracts and ingestion infrastructure currently missing in `knowledge-service` and `memory-service`. The frontend UI in `apps/web/src/features/knowledge/` cleanly encapsulates these boundaries, disabling unsupported actions and presenting honest product copy rather than simulating responses.

---

## 1. URL Ingestion Contract
* **Status:** Unavailable
* **Current reality:** `services/knowledge-service/src/controllers/sources.controller.ts` only accepts JSON with `{ name, content, type, content_type }`. If a URL is passed, it is stored as literal string content without fetching or scraping the destination page.
* **Missing Contract:**
  * Endpoint: `POST /v1/workspaces/:workspaceId/knowledge/sources` with `type: "url"` or dedicated crawl/scrape integration.
  * Ingest payload:
    ```json
    {
      "name": "Help Center",
      "type": "url",
      "url": "https://example.com/help",
      "scrape_options": {
        "depth": 1,
        "max_pages": 10
      }
    }
    ```
  * Ingestion worker: Web-fetch or Olostep crawler integration that downloads HTML, extracts markdown, and queues text chunks.

---

## 2. Binary File Upload Contract (PDF, DOCX, etc.)
* **Status:** Unavailable
* **Current reality:** Knowledge source creation requires JSON text in `content`. Attempting to read binary files as UTF-8 in the browser (`File.text()`) corrupts binary streams (PDF, DOCX).
* **Missing Contract:**
  * Multipart form-data route: `POST /v1/workspaces/:workspaceId/knowledge/sources/upload`
  * Or presigned S3 upload URL:
    * Step 1: `POST /v1/workspaces/:workspaceId/knowledge/sources/presign` returns `{ upload_url, storage_key }`.
    * Step 2: Client uploads directly to S3.
    * Step 3: `POST /v1/workspaces/:workspaceId/knowledge/sources/complete` enqueues document parser.
  * Supported MIME types, max file size limits (e.g. 25MB), and text-extraction worker (PDF parsing, OCR).

---

## 3. Workspace-Scoped Chunk Inspection Endpoint
* **Status:** Unavailable
* **Current reality:** `knowledge-service` stores indexed chunks in OpenSearch and updates `chunk_count` in Postgres. However, there is no HTTP route exposed through the gateway to retrieve the list of chunks for a source.
* **Missing Contract:**
  * Route: `GET /v1/workspaces/:workspaceId/knowledge/sources/:sourceId/chunks`
  * Query parameters: `?limit=20&offset=0` or `?cursor=...`
  * Expected response:
    ```json
    {
      "request_id": "req_...",
      "source_id": "src_...",
      "chunk_count": 24,
      "chunks": [
        {
          "id": "chk_...",
          "chunk_index": 0,
          "text": "Unopened items can be returned within 30 days...",
          "metadata": { "start_char": 0, "end_char": 240 }
        }
      ]
    }
    ```

---

## 4. Server-Side Source Search & Workspace Pagination
* **Status:** Unavailable
* **Current reality:** `GET /v1/workspaces/:workspaceId/knowledge/sources` accepts only `?limit=...` (defaulting to 20). The returned `total` field is simply `rows.length`, which represents the loaded slice rather than the total number of sources in the workspace. There are no query filters for `status`, `kind`, or `search`.
* **Missing Contract:**
  * Query parameters: `?search=terms&status=ready&type=file&limit=20&cursor=...`
  * Response envelope:
    ```json
    {
      "request_id": "req_...",
      "sources": [...],
      "next_cursor": "cur_...",
      "total_workspace_count": 142
    }
    ```

---

## 5. Memory Pagination Beyond 20-Fact Cap
* **Status:** Capped
* **Current reality:** In `services/memory-service/src/lib/limits.ts`, `MAX_FACTS_READ_LIMIT = 20`. Querying `GET /v1/workspaces/:workspaceId/memory/facts?subject_key=...` returns at most 20 facts. If a subject has more facts, subsequent facts cannot be fetched.
* **Missing Contract:**
  * Cursor-based or offset pagination parameters: `?subject_key=...&cursor=...&limit=50`.
  * Response indicating `has_more: boolean` and `next_cursor: string | null`.
