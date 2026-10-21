# Agent Evaluation Suite — Backend & Full-Stack Architecture (Feature F11)

The QuickStart AI Agent Evaluation Suite is fully implemented across the entire stack:
- **Backend microservices:** `eval-service` (:4004), `runtime-service` (:4002), `gateway-service` (:4000)
- **Database layer:** PostgreSQL migration `002_eval_suite_v2.sql` with immutable snapshot revisions, run fencing, and historical comparisons
- **Frontend layer:** Next.js App Router BFF handlers (`/api/workspaces/:workspaceId/eval/*`) and React features matching the 8 approved design references

---

## Architecture & Components

### 1. Database Schema (`services/eval-service/migrations/002_eval_suite_v2.sql`)
- `eval_datasets`: Workspace-scoped datasets with monotonic `revision`, `record_version` for optimistic locking, `tags`, and soft-delete/archival (`archived_at`).
- `eval_dataset_snapshots`: Immutable snapshot frozen at run time (`cases_jsonb`), guaranteeing 100% reproducible historical evaluation metrics even if source cases are subsequently edited.
- `eval_cases`: Test cases with `name`, `input`, `expected_output`, `expected_tools` (JSONB with optional order/args), `fixture_responses` (JSONB tool mock responses), and `tags`.
- `eval_runs`: Evolved with `dataset_snapshot_id`, `dataset_revision`, `policy` (scoring method + threshold config), `token_usage`, `average_latency_ms`, `total_cost`, `lease_worker_id`, `lease_expires_at`, and `fence_token`.
- `eval_case_results`: Detailed execution traces including `actual_output`, `actual_tools`, `latency_ms`, `token_usage`, `scoring_method`, `score`, `failure_reason`, and `execution_error`.
- `eval_comparisons`: Direct delta calculations between baseline and candidate runs, classifying cases into `fixed`, `regressed`, `unchanged_passed`, and `unchanged_failed`.
- Backward-compatibility migration: Legacy `eval_cases` without `dataset_id` are deterministically linked to an automatically generated `"Default Dataset"` (rev 1).

### 2. Multi-Method Scoring Engine (`services/eval-service/src/utils/score.ts`)
- **Exact Match (`exact_match`):** Strict trimmed string equality with case-sensitivity and empty response handling.
- **Semantic Similarity (`semantic_similarity`):** Vector cosine similarity with OpenAI embeddings and deterministic fallback. Validates similarity against configurable threshold (default `0.85`).
- **Canonical Tool Trace Verification (`tool_trace`):** Recursive JSON canonicalization with sorted object keys (`canonicalizeJson`), deep equality check, support for both strict sequence ordering and permutation-invariant matching, and unexpected tool invocation detection.

### 3. Side-Effect Free Sandbox Execution (`services/runtime-service/src/services/turns.service.ts`)
- `executeEvalTurn` runs models in an isolated ephemeral execution context.
- Production tools, visitor CRM writes, email queues, and live channel dispatches are **never** executed.
- When the model emits `tool_calls`, arguments are evaluated against configured `fixture_responses`. Matches immediately receive mock return values, and captured traces are logged for evaluation without touching live customer databases.

### 4. Gateway & Next.js BFF Handlers (`apps/web/src/app/api/workspaces/[workspaceId]/eval/`)
- `summary/route.ts` — 30-day KPI aggregates (pass rate, total evals, active cases, average latency)
- `datasets/route.ts` & `datasets/[datasetId]/route.ts` — Dataset CRUD, archival, and optimistic concurrency
- `datasets/[datasetId]/cases/route.ts` & `cases/[caseId]/route.ts` — Test case CRUD
- `datasets/[datasetId]/import/route.ts` — RFC 4180 CSV and JSON batch import with auto column mapping
- `datasets/[datasetId]/export/route.ts` — Streaming CSV export with formula injection protection (`'`, `=`, `+`, `-`, `@`)
- `runs/route.ts` & `runs/[runId]/route.ts` — Run queuing, lease claim worker, and live results
- `comparisons/route.ts` & `comparisons/[comparisonId]/route.ts` — Version comparisons and regression detection

### 5. UI Implementation (`apps/web/src/features/evaluation/components/`)
- `dataset-list.tsx` — Matches **Image 1 & Image 8**: 4 KPI summary cards, tag filters, status pills, and 3 starter benchmark templates for 0-dataset empty state.
- `start-evaluation-dialog.tsx` — Matches **Image 4**: Agent selector, published version snapshot selector, dataset selector with pinned revision badge, 3 scoring policy radio cards, threshold slider, duration estimate, and isolated sandbox safety callout.
- `dataset-import-dialog.tsx` — Matches **Image 3**: Drag & drop zone, column mapping dropdowns with smart auto-detection, and 3-row preview table.
- `dataset-editor.tsx` — Matches **Image 2**: Cases table with expandable 3-panel cards (User Message, Expected Output, Expected Tool Invocations & Mock Fixtures), CSV export action, and Add/Edit Case modal.
- `run-history.tsx` — Matches **Image 5**: Status filters, pass rate progress bar, tokens/latency, and 3s live polling when runs are active.
- `run-detail.tsx` — Matches **Image 6**: Pass rate big score gauge, metric strip, side-by-side Expected vs Actual text diff, failure reason banner, and tool trace verification panel.
- `version-comparison-view.tsx` — Matches **Image 7**: Baseline/candidate selectors, delta cards, regression alert banner, breakdown tabs, and side-by-side diff modal.

---

## Manual Verification Commands

To verify and run this suite in an environment with active Docker / database containers:

```bash
# 1. Run database migration in eval-service:
cd services/eval-service
npm run migrate

# 2. Run unit tests for the scoring engine:
node --test dist/utils/score.test.js

# 3. Start services in development mode:
# Terminal 1: Gateway
npm run --workspace=@quickstart/service-gateway dev

# Terminal 2: Eval Service
npm run --workspace=@quickstart/service-eval dev

# Terminal 3: Runtime Service
npm run --workspace=@quickstart/service-runtime dev

# Terminal 4: Web Application
npm run --workspace=@quickstart/web dev
```
