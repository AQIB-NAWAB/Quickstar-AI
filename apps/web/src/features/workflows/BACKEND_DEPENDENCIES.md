# Workflow Automation Backend Dependencies (Feature F8)

This document specifies the missing backend engine contracts, event broker integrations, and API endpoints required to transition Feature F8 from frontend development preview and unavailable authenticated states to fully operational workflow automation.

> **Notice**: All TypeScript types defined in `apps/web/src/features/workflows/lib/types.ts` are **frontend local view models**. They represent UX requirements and must not be assumed to match existing backend data models.

---

## 1. Workflow Definition CRUD & Versioning
- **Endpoints Needed**:
  - `GET /v1/workspaces/:workspaceId/workflows`: List workflows with metadata (trigger, status, lastTriggeredAt, successRate7d).
  - `POST /v1/workspaces/:workspaceId/workflows`: Create new workflow draft.
  - `GET /v1/workspaces/:workspaceId/workflows/:workflowId`: Fetch single workflow definition with version/revision number.
  - `PUT /v1/workspaces/:workspaceId/workflows/:workflowId`: Update workflow draft. Must support optimistic concurrency control (e.g. `If-Match: "revision-token"` or version integer) to prevent silent overwrite of concurrent edits.
  - `DELETE /v1/workspaces/:workspaceId/workflows/:workflowId`: Soft or hard delete workflow definition.
- **Versioning Semantics**:
  - Editing an active workflow must save to an uncommitted draft revision without modifying the active executing version until explicitly published or activated.
  - Changes must display "Changes are not published" until published.

---

## 2. Event Catalog & Payload Schema Registry
- **Current declared events** (`@quickstart/contracts`):
  - `conversation.handed_off`
  - `conversation.released`
  - `message.appended`
  - `agent.published`
- **Requested future events (currently planned, not declared)**:
  - `conversation.started`
  - `lead.qualified`
  - `message.flagged`
- **Schema Contracts Needed**:
  - Endpoint `GET /v1/workspaces/:workspaceId/workflows/events/catalog` providing JSON schema definitions for each declared event envelope.
  - Field paths (e.g. `event.message.text`, `event.conversation_id`) must be validated server-side during activation against the schema registry.

---

## 3. Condition Evaluator
- **Contract Needed**:
  - Single flat condition group supporting `and` | `or` logic.
  - Supported operators: `equals`, `does_not_equal`, `contains`, `does_not_contain`, `exists`, `does_not_exist`, `greater_than`, `less_than`.
  - Type-safe evaluation: condition mismatch stops execution and records the run as `skipped`, not `failed`.

---

## 4. Supported Action Schemas & Execution Engine
1. **Webhook Dispatch**:
   - HTTP Methods: `POST`, `PUT`, `PATCH`, `GET`, `DELETE`.
   - Templated JSON body replacement without `eval()`.
   - Secret reference resolution (e.g. `SUPPORT_WEBHOOK_TOKEN` fetched from workspace secrets vault; raw token must never be sent to or displayed by browser).
   - SSRF protection: backend must enforce HTTPS and block private IP address ranges (e.g. `127.0.0.1`, `169.254.169.254`, `10.0.0.0/8`).
2. **Update Tags**:
   - Atomic tag additions/removals on target resources (`conversation`, `lead`).
3. **Email Notification**:
   - Provider abstraction (SES / SendGrid / Postmark).
   - Rate limiting and recipient validation.
4. **Agent Handoff**:
   - Explicit target validation distinguishing human operators vs AI agent instances.

---

## 5. Execution History & Telemetry
- **Endpoints Needed**:
  - `GET /v1/workspaces/:workspaceId/workflows/:workflowId/runs`: Cursor-paginated run list (`cursor`, `limit`, `status`, `from`, `to`).
  - `GET /v1/workspaces/:workspaceId/workflows/:workflowId/runs/:runId`: Full trace with ordered step runs.
- **Step Telemetry**:
  - Each step record must contain: `stepId`, `stepName`, `status` (`succeeded`, `failed`, `skipped`, `running`), `startedAt`, `completedAt`, `durationMs`, `inputs`, `output`, and structured `error` (`httpStatus`, `message`, `code`, `details`).
- **Defensive Redaction**:
  - Backend must redact Authorization headers, API keys, and secret values before persisting or serializing run diagnostics.
- **Payload Truncation**:
  - Bounded storage limit (e.g. max 64KB per payload) with an explicit truncation flag.

---

## 6. Workspace RBAC & Permissions
- Workflow-specific permission bits required in `@quickstart/contracts/workspace-permissions`:
  - `workflows:read`: View workflow list and configuration.
  - `workflows:edit`: Create and modify draft definitions.
  - `workflows:activate`: Activate, pause, or publish workflows.
  - `workflows:delete`: Delete workflows.
  - `workflows:runs_read`: View execution history and diagnostic payloads.
