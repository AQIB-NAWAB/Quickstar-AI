# Leads Management Backend Dependencies (Feature F7)

This document details the missing backend services, data models, and API contracts required to transition Feature F7 from a development preview with ephemeral fixtures and honest unavailable authenticated states to fully operational lead management.

> **Notice**: All TypeScript types defined in `apps/web/src/features/leads/lib/types.ts` are **frontend local view models**. They represent UI and interaction requirements and must not be assumed to reflect existing backend database or response schemas.

---

## 1. Workspace-Scoped Lead List & Detail APIs
- **Endpoints Needed**:
  - `GET /v1/workspaces/:workspaceId/leads`: List captured leads with support for filtering and pagination.
  - `GET /v1/workspaces/:workspaceId/leads/:leadId`: Retrieve complete lead detail, including captured custom fields, qualification breakdown, and linked conversation ID.
  - `PATCH /v1/workspaces/:workspaceId/leads/:leadId/status`: Transition lead status with optimistic concurrency checks (`version` or `ETag`).
- **Response Shape Requirements**:
  - `id`: Unique lead identifier (e.g. `lead_1042`).
  - `name`, `email`, `phone`: Verified or extracted contact credentials.
  - `status`: Lifecycle status (`new`, `contacted`, `qualified`, `disqualified`).
  - `qualificationScore` & `qualificationMax`: Explicit numerical score with defined scale boundaries.
  - `sentiment`: Extracted conversation sentiment (`positive`, `neutral`, `negative`, `unknown`).
  - `intent`: Extracted topic or goal statement.
  - `tags`: Array of tag strings.
  - `source`: Attribution channel (e.g. `Website chat`, `Inbound email`, `Help center widget`).
  - `capturedAt`: ISO 8601 UTC timestamp.

---

## 2. Search, Status, and Tag Filtering
- **Server Filtering**:
  - `q`: Substring search matching contact name, email, and normalized phone numbers.
  - `status`: Single or multi-status filter.
  - `tag`: Filter by assigned tag identifier.
- **Scope Contract**:
  - Responses must clearly declare whether the total count represents workspace-wide matches or only the current loaded slice.

---

## 3. Cursor Pagination
- **Contract Needed**:
  - Cursor-based pagination (`cursor`, `limit`, `nextCursor`).
  - Frontend must not fabricate page counts or total items without backend metadata.

---

## 4. Status Transition Semantics
- Allowed status lifecycle transitions:
  - `new` &rarr; `contacted`, `qualified`, `disqualified`
  - `contacted` &rarr; `qualified`, `disqualified`
  - `qualified` &rarr; `contacted`, `disqualified`
  - `disqualified` &rarr; `new` (re-evaluation)
- Concurrency Handling:
  - Prevent silent overwrites when a lead's status is modified simultaneously by another team member or automated workflow.

---

## 5. Qualification Score Scale & Provenance
- The qualification score scale must be explicitly returned by the backend (e.g. `max: 100`).
- The backend should supply provenance metadata (e.g. which extraction rules, tool calls, or AI evaluations produced the score).

---

## 6. Captured Fields Schema
- Dynamic key-value pairs captured during conversation turns (e.g. `Company`, `Team size`, `Interest`).
- Safe serialization preserving numbers, strings, and booleans without requiring arbitrary unstructured schema interpretation in frontend.

---

## 7. Originating Conversation Association & Transcripts
- Direct linkage to `conversationId` in `@quickstart/service-conversation`.
- Read access verification for conversation transcripts:
  - Role-based authorization verifying that the user viewing the lead has permission to read the originating conversation transcript.
  - Sanitized transcript events distinguishing user speech from agent replies.

---

## 8. Export Authorization & Scope
- Endpoint `POST /v1/workspaces/:workspaceId/leads/export`:
  - Streaming CSV or asynchronous export job for large datasets.
  - Granular RBAC permission check (e.g. `leads:export`).
  - Server-side formula sanitization and customer PII auditing.
