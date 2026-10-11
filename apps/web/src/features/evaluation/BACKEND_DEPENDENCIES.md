# Agent Evaluation UI — Backend Dependencies & API Contracts

This document outlines the contracts, specifications, and backend capabilities required to transition the Agent Evaluation feature from the frontend interface to a fully integrated production evaluation pipeline.

---

## 1. Dataset CRUD, Revisions & Snapshots

- **Dataset Revisions:** Every modification to a dataset's cases (creation, edit, deletion, or CSV import) MUST atomically advance its monotonic `revision` counter (e.g., `revision: 2`).
- **Snapshot Identity:** When an evaluation run starts, the worker MUST bind to a **frozen immutable snapshot** of the dataset at that exact revision (`snapshot_id: ds_support_basics_rev2`). Later edits to the dataset do NOT alter or invalidate historical evaluation run results.
- **Dataset Deletion:** Deleting a dataset from the workspace MUST NOT purge historical run logs that evaluated earlier revisions of that dataset. The snapshot metadata remains archived for auditability.

---

## 2. Test-Case Criteria & Expected Tools

### Test Case Structure:
```json
{
  "id": "case_4",
  "dataset_id": "ds_support_basics",
  "name": "Return policy boundary",
  "input": "Can I return an item after 45 days?",
  "expected_output": "Returns are accepted within 30 days.",
  "expected_tools": ["get_return_policy"],
  "created_at": "2024-10-01T10:20:00.000Z"
}
```

### Tool Expectation Semantics:
- `expected_tools: []` means **Expect no tools to be invoked**. If the agent calls a tool, the tool criterion fails.
- `expected_tools: ["get_return_policy"]` means the agent must invoke the specified tool with valid arguments during its turn loop.
- **Trace Coverage:** If tool execution logging is disabled or truncated, the backend MUST flag `trace_coverage: "unavailable"` rather than reporting an empty tool call list.

---

## 3. CSV Import Format & Limits

- **Format:** Standard RFC 4180 CSV with UTF-8 encoding.
- **Columns:**
  - `input`: Required non-empty customer utterance.
  - `expected_output`: Desired assistant response text.
  - `expected_tools`: JSON string array of tool identifiers (e.g. `["get_return_policy", "order_lookup"]`).
  - `case_name`: Optional human-readable case label.
- **Limits:** Max 5MB file size and 10,000 cases per single batch.
- **Safety:** Frontend applies spreadsheet formula injection protection (`'`, `=`, `+`, `-`, `@`).

---

## 4. Run Creation, Lifecycle & Idempotency

### Execution Endpoint:
- **Route:** `POST /v1/workspaces/{workspaceId}/agents/{agentId}/eval/runs`
- **Payload:**
  ```json
  {
    "version_id": "ver_v8",
    "dataset_id": "ds_support_basics",
    "dataset_revision": 2,
    "scoring_policy": "support-v1"
  }
  ```
- **Lifecycle States:**
  1. `queued`: Dispatched to Kafka/SQS evaluation topic.
  2. `running`: Offline worker is executing conversational turns against the agent's published version.
  3. `completed`: All cases finished and scored.
  4. `failed`: Execution infrastructure error occurred (e.g. model timeout, worker crash).
  5. `cancelled`: Aborted by authorized staff user.

- **Idempotency:** A client retry with the same `Idempotency-Key` header MUST return the existing run ID instead of launching parallel duplicate runs.

---

## 5. Scoring Policies & Aggregation

- **Policy Identifier:** Stored as an explicit versioned string (e.g. `support-v1`).
- **Score Scale:** Standard 0–100 scale (mean of per-case scores).
- **Pass/Fail Threshold:** Configurable rubric threshold (default 80/100).
- **Comparable Version Group:** Runs are only comparable on score trend charts if they share:
  - Exact same workspace
  - Exact same agent ID
  - Exact same dataset ID & revision
  - Exact same scoring policy identifier

---

## 6. Side-Effect Isolation & Redaction

- **Isolated Execution:** Evaluation runs MUST execute in a sandboxed runtime environment. External side-effect tools (e.g. `process_refund`, real email dispatch, CRM mutations) MUST be mocked or stubbed during eval turns.
- **Credential Redaction:** Actual tool arguments, API keys, customer PII, and authorization headers MUST be redacted before persisting case results to the evaluation log database.
