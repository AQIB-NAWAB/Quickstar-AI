# ADR 0025 — Evaluation harness (eval-service)

## Status

Accepted

## Context

Feature 25 needs an offline way to score a **published agent version** against fixed cases. Putting those model calls inside publish times out and couples two unfinished systems (ADR 0009 already rejects eval-gated publish). Runtime turns today always load `production_version_id`, so scoring a frozen version requires an explicit pin.

## Decision

1. **`services/eval-service` (port 3016)** owns `eval_cases`, `eval_runs`, and `eval_case_results` in Postgres. (Staff web uses 3015 locally.)
2. **Async claim worker:** `POST .../eval/runs` inserts `queued` and returns immediately. A dialer-style poller claims with `FOR UPDATE SKIP LOCKED`, runs cases, writes results, sets `completed`/`failed`. Safe with two replicas (correctness in the row, not process memory).
3. **Version pin:** runtime exposes `POST /internal/v1/workspaces/:workspaceId/eval/turns` (`RUNTIME_INTERNAL_TOKEN`) with `agent_id`, `agent_version_id`, `message`, `idempotency_key`. Public/widget/voice turns stay production-pointer-only.
4. **Scoring (v1):** trimmed exact-match of assistant text vs `expected_output`. Done-when proof uses model profile `fake` (`fake-reply:<user>`).
5. **Caps:** `EVAL_MAX_CASES_PER_RUN` (default 50), `EVAL_MAX_RUNS_PER_WORKSPACE_PER_DAY` (default 20).
6. **Auth:** staff JWT via gateway; worker calls runtime with internal bearer.
7. **Permissions:** `workspace.eval.read` | `workspace.eval.run`.
8. **Not in this slice:** eval-gated publish, F11 full UI wiring, human labeling, tool-trace scoring, Kafka outbox for `eval.*`.

## Consequences

- Gateway proxies `/v1/workspaces/:id/agents/:agentId/eval*` to eval-service.
- Publish remains fast and unaware of eval.
- Report always stores `agent_version_id` so we know what was scored.
- Proof: `scripts/check-eval-proof.mjs`.

## Scale / still unsafe

At 10k org / high concurrency, uncapped runs are a cost amplifier. Still unsafe without: human labeling UI, automatic publish block, per-tenant spend ledger (Feature 26), tool-expectation scoring.
