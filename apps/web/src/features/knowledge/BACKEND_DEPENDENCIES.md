# Knowledge & Memory UI — Backend Dependencies & Capabilities

This document records the implemented backend API contracts, ingestion infrastructure, and operational parameters for `knowledge-service` and `memory-service`.

---

## 1. URL Ingestion Contract
* **Status:** Implemented
* **Implementation:** `POST /v1/workspaces/:workspaceId/knowledge/sources` with `type: "url"` and `url: "https://..."`.
* **Behavior & Safety:**
  * Uses SSRF-safe public fetch via `@quickstart/utilities` (`fetchPublicText`, `assertPublicUrl`).
  * Restricted to secure HTTPS endpoints.
  * Rejects private, loopback, link-local, cloud metadata (AWS/GCP/Azure), and multicast IP ranges.
  * DNS pinning protects against DNS rebinding across up to 3 redirects.
  * 15-second strict timeout, 5 MB response body limit.
  * Boilerplate removal strips `<script>`, `<style>`, `<nav>`, `<header>`, and `<footer>` tags before markdown/text extraction.
  * Scope: Single public page only (no recursive crawling, no login-protected pages).

---

## 2. Binary File Upload Contract (PDF, DOCX, TXT, MD)
* **Status:** Implemented
* **Implementation:** `POST /v1/workspaces/:workspaceId/knowledge/sources/upload` with `multipart/form-data` (`name` text field and `file` binary stream).
* **Behavior & Extractors:**
  * Streaming multipart parsing via `busboy` in `services/knowledge-service/src/lib/multipart.ts`.
  * Streaming multipart gateway proxy in `services/gateway-service/src/lib/proxy.ts` and BFF route in `apps/web/src/app/api/workspaces/[workspaceId]/knowledge/sources/upload/route.ts`.
  * 25 MiB maximum file size (`MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024`).
  * TXT/MD: UTF-8 decoding, CRLF normalization, BOM stripping.
  * PDF: Binary `%PDF-` header validation, stream decompression (`/FlateDecode`), font mapping and textual operator extraction (`Tj`, `TJ`, `\'`, `\"`). Detects and rejects encrypted or image-only/scanned documents without OCR promises.
  * DOCX: PKZip archive extraction of `word/document.xml`, entity decoding, zip bomb guards (decompression size limit & entry bounds).
  * 1,000,000 character extraction cap to prevent unbounded downstream embedding allocation.

---

## 3. Workspace-Scoped Chunk Inspection Endpoint
* **Status:** Implemented
* **Implementation:** `GET /v1/workspaces/:workspaceId/knowledge/sources/:sourceId/chunks?limit=20&cursor=...`.
* **Behavior:**
  * Queries actual persisted documents from OpenSearch matching `workspace_id`, `source_id`, and `source_version`.
  * Excludes high-dimensional embedding vectors (`exclude: ["vector"]`) to protect client memory and transfer bandwidth.
  * Returns deterministic contiguous coordinates: `start_char` and `end_char` matching `normalized.slice(start_char, end_char) === text`.
  * Keyset cursor pagination sorted by `chunk_index asc, id asc`.
  * Response envelope:
    ```json
    {
      "request_id": "req_...",
      "source_id": "src_...",
      "source_version": 2,
      "chunk_count": 8,
      "chunks": [
        {
          "id": "chk_4b98c7...",
          "chunk_index": 0,
          "text": "...",
          "start_char": 0,
          "end_char": 798
        }
      ],
      "next_cursor": null
    }
    ```

---

## 4. Server-Side Source Search, Status/Type Filtering, & Authoritative Counts
* **Status:** Implemented
* **Implementation:** `GET /v1/workspaces/:workspaceId/knowledge/sources?search=...&status=ready&type=file&limit=20&cursor=...`.
* **Behavior:**
  * Server-side parameterized search across `name` and `content_text` (case-insensitive `ILIKE`).
  * Composable `status` filter (`ready`, `indexing` [queued/processing], `failed`) and `type` filter (`text`, `file`, `url`).
  * Authoritative counts:
    * `total`: Matching active search and filter conditions.
    * `total_workspace_count`: Total sources in the workspace regardless of filter.
    * `status_counts`: Breakdown of workspace totals `{ ready, indexing, failed }`.
  * Keyset pagination via opaque cursor encoding `updated_at` and `id`.

---

## 5. Ingestion Worker Reliability & Concurrency
* **Status:** Implemented
* **Key Enhancements:**
  * Single-flight execution loop avoids overlapping poll ticks.
  * Bounded embedding concurrency (`mapConcurrent` with limit 2) prevents provider rate limiting.
  * Version-conditional status updates prevent stale jobs from overwriting newer source versions.
  * Superseded version chunk cleanup in OpenSearch (`deleteOlderVersions`).
  * Bulk index item-level verification checking `bulkResponse.errors`.
  * Metadata-only rename (`updateName`) avoids wasteful re-embedding when text is unchanged.

---

## 6. Memory Service Pagination (Remaining Operational Context)
* **Status:** Capped
* **Current reality:** In `services/memory-service/src/lib/limits.ts`, `MAX_FACTS_READ_LIMIT = 20`. Memory facts listing is currently capped at 20 facts per subject.
