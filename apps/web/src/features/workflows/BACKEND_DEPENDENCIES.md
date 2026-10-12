# Workflow Automation Backend Dependencies (Feature F8 / 20)

**Status (2026-10-12):** connected. `services/workflow-service` (:3012) is proxied by the gateway; staff UI uses BFF routes under `/api/workspaces/:id/workflows*`.

## Shipped

| Area | Contract |
| --- | --- |
| CRUD | `GET/POST /v1/workspaces/:id/workflows`, `GET/PUT/DELETE .../workflows/:workflowId` with `expected_version` optimistic concurrency |
| Catalog | `GET .../workflows/events/catalog` |
| Runs | `GET .../workflows/:id/runs`, `GET .../runs/:runId` with step traces |
| Triggers | Catalog types: `conversation.handed_off`, `conversation.released`, `message.appended`, `agent.published` |
| Conditions | Flat `and`/`or` group; operators equals/not_equals/contains/not_contains/exists/not_exists/greater_than/less_than |
| Actions | `webhook` (SSRF-safe), `update_tags`, `email_notification`, `agent_handoff` (last three persist assertable `workflow_side_effects`) |
| Permissions | `workspace.workflow.read\|edit\|activate\|delete\|runs_read` |
| Failure | Dead-letter table for poison envelopes / failed runs; run+side-effect uniqueness for at-least-once Kafka |

## Still open (not blocking Done when)

- Webhook secret name → secrets-service resolve on the worker
- Real SES/SendGrid for email; real conversation take for handoff
- Cursor pagination on long run histories
- Live SSE for run progress

See [ADR 0020](../../../../docs/adr/0020-workflows.md).
