# Agent Evaluation UI — Backend Dependencies (Feature F11 / Feature 25)

Staff evaluation UI is still **preview-first**. Feature 25 shipped the v1 async harness in **eval-service** (:3016). This doc marks what is live vs still open for F11.

---

## Shipped in Feature 25 (v1 harness)

- **Service:** `services/eval-service` (port 3016); ADR [0025](../../../../../docs/adr/0025-evaluation.md).
- **Cases (dataset-lite):** `POST/GET /v1/workspaces/:workspaceId/agents/:agentId/eval/cases`
  - Fields: `name`, `input`, `expected_output` (no `expected_tools` / dataset revision yet).
- **Runs:** `POST/GET .../eval/runs`, `GET .../eval/runs/:runId`
  - Body: `agent_version_id`, optional `case_ids`, `idempotency_key`
  - Lifecycle: `queued` → `running` → `completed` | `failed` (DB claim worker, not Kafka)
  - Report includes `score` (0–100 mean of exact-match) + per-case `results`
- **Caps:** `EVAL_MAX_CASES_PER_RUN` (50), `EVAL_MAX_RUNS_PER_WORKSPACE_PER_DAY` (20)
- **Permissions:** `workspace.eval.read` | `workspace.eval.run`
- **Runtime pin:** `POST /internal/v1/workspaces/:workspaceId/eval/turns` with `agent_version_id` (not production-only)
- **Proof:** `scripts/check-eval-proof.mjs`
- **Not gated:** publish stays independent of eval (no automatic publish block)

---

## Still open (F11 / later)

### 1. Dataset CRUD, revisions & snapshots

- Monotonic dataset `revision`, frozen `snapshot_id` on run start, CSV import at scale, delete-without-purging-history.

### 2. Tool expectation scoring

- `expected_tools` criteria and `trace_coverage` flags — v1 is exact-match text only.

### 3. Scoring policies

- Named policies (`support-v1`), pass threshold config, version comparison charts wired to live API.

### 4. Side-effect isolation polish

- Tool stubbing / credential redaction beyond “tools off on internal eval turns.”

### 5. UI wiring

- F11 pages remain preview/unavailable against production repo until client maps to the endpoints above.
