# UI Audit — Workflows (2026-10-18)

## Verdict — C, incomplete implementation

The supplied implementation was substantially different from the 12 approved references and contained false success states and unsafe execution behavior.
This review corrects critical execution/persistence defects and improves the workflow shell, canvas, condition inspector, settings, action picker, and activation layout.
It does **not** establish a 100% visual match or production readiness. Missing domain integrations and several reference states remain unfinished.

## Score table

| Axis | Grade | Evidence |
| --- | --- | --- |
| Hierarchy | B | `workflow-builder.tsx` now has the reference-style title/actions and separate tab row; operational summaries no longer use fabricated figures. |
| Spacing | C | Compact nodes, a 210px workflow-scoped navigation shell, docked action picker, and dedicated settings page improve composition. Outline positioning, test-drawer layout, templates and diagnostics still differ from references. |
| Typography | B | Existing project fonts retained. Node categories are subordinate to names; variable values remain monospace. Complete responsive typography acceptance is outstanding. |
| Color | B | Existing orange branding retained; dark payload panels lightened; trigger icons use orange; actual status colors are separated from draft state. |
| Consistency | C | Browser and worker now share the same condition evaluator and canonical ports. Several inspectors still apply edits immediately rather than sharing reference-style Apply/Cancel behavior. |
| Accessibility | C | Labelled condition controls, activation dialog focus handling, and navigation semantics improved. Full keyboard graph editing, smaller targets, and remaining overlay focus behavior need work. |

## Top 10 fixes

| Priority | Fix | Effort | Effect |
| --- | --- | --- | --- |
| 1 | Reject activation through generic create/update and ignore unsigned authentication context. | M | Prevents permission bypass and spoofed actor attribution. Activation uses verified JWT identity. |
| 2 | Require exact draft revisions and recheck activation under row/workspace locks. | M | Stops old version numbers overwriting drafts and prevents publishing a changed revision or racing the active-workflow quota. |
| 3 | Remove branch fallthrough in simulation and production. Validate ports and required routes. | M | Unmatched/error paths cannot silently execute another branch's actions. |
| 4 | Share recursive condition evaluation and protect variable lookup. | M | Canonical `children` and legacy `rules/groups` work; missing numbers are not coerced to zero; inherited/prototype fields and arbitrary regex execution are blocked. |
| 5 | Remove simulated 200 responses, random durations, and claimed handoff/email/tag delivery. | M | Dry-run output is explicit; unimplemented production delivery fails and blocks activation instead of returning false success. |
| 6 | Fence HTTP dispatch before I/O, pin public DNS answers, bound streaming response bytes and honor timeout settings. | L | Reduces duplicate writes, DNS-rebinding exposure and unbounded-response memory use. Does not promise exactly-once external effects. |
| 7 | Make canvas state controlled while retaining measured dimensions locally. | L | Inspector changes, moves, connections and deletions share the draft graph; nodes no longer remain hidden after measurement. |
| 8 | Protect draft save/edit races, simulation staleness and saved-revision activation. | M | Edits made during a save are preserved; failed saves remain dirty; old simulations are not restored over newer edits. |
| 9 | Restore reference-style shell/header/nodes, dock Add Step and turn Settings into a tab. | L | Improves the primary visual structure without changing unrelated pages or Agent Canvas. |
| 10 | Correct blank creation, statistics mapping, queue availability claims and disabled scope controls. | M | Blank creation persists then navigates; snake-case metrics map correctly; example online counts and unsupported event scopes are no longer presented as live capabilities. |

## Reference coverage

References inspected: `/home/hashirsajid58200p/Downloads/workflows/1.png` through `12.png`.

| Image | Area | Current outcome / remaining difference |
| --- | --- | --- |
| 1 | Builder, HTTP properties, workbench | Header, compact nodes, controlled graph, light workbench and real dry-run semantics improved. Outline/drawer composition, managed connections and full live step testing remain incomplete. |
| 2 | Overview | Summary strip and real statistics mapping corrected; fabricated `142`, `98.4`, `+18%` and decorative progress removed. Exact columns, activity data, date filters and complete server pagination remain incomplete. |
| 3 | Run history/details | Source reviewed; unsafe replay of an arbitrary step's inputs through the current draft removed. Historical-snapshot replay, full filter/pagination/live-update wiring, and exact docked details layout still need completion. |
| 4 | Creation/templates | Start-from-scratch no longer leaves the user stuck on the template page. Exact six approved templates, categories and embedded preview composition remain incomplete. |
| 5 | Trigger | Undeclared event choice and unusable specific-agent/channel choices restricted; payload area lightened. Catalog/producer normalization and exact segmented configuration still need completion. |
| 6 | Conditions | Recursive editor added, shared evaluation, explicit route selectors, missing-data and case behavior, sample-only evaluation. Browser-inspected. Further spacing and field-picker refinement needed. |
| 7 | Handoff | Fabricated queues and online counts removed. Real queue service integration is absent; activation is blocked. Layout remains partial relative to reference. |
| 8 | Add Step | Changed from centered modal to docked panel with insertion context. Preserves successor when inserting supported nodes. Per-edge insertion selection and full preview polish remain incomplete. End-node insertion cannot silently discard an existing successor. |
| 9 | Notification/email | Message alias read correctly, fake default sender removed, delivery limitation explicit. Real provider connection/recipients/delivery and exact preview remain incomplete. |
| 10 | Variable picker | Unsupported hardcoded customer/workspace/downstream values removed; light floating presentation. Search remains. Full schema tree, target/provenance preview, missing-value binding and guaranteed upstream output discovery are incomplete. |
| 11 | Settings | Dedicated tab and summary added; metadata and supported settings apply to draft. Unimplemented retry/concurrency/alert controls no longer imply real behavior. It intentionally cannot reproduce enabled controls for functionality that does not exist. |
| 12 | Activation | Wider two-column review, focus management, verified revision gating and actual blockers. Missing integrations now appear as blockers. Full per-check/node navigation and version-history comparison remain incomplete. |

## Backend changes and limits

### Corrected

- Generic create/update cannot set `active` and bypass the activation endpoint's permission checks.
- Workflow authentication verifies bearer JWTs rather than trusting an unsigned gateway context header.
- Activation audit actor comes from verified identity, not request JSON.
- Generic legacy updates adapt to draft persistence rather than independently changing execution versions.
- Draft saves require an explicit revision; published version numbers are not accepted as substitutes.
- Activation locks/rechecks the exact draft and serializes active-workflow quota checks.
- Active trigger matching reads the immutable version's event type rather than an edited draft trigger.
- Supplied simulation graphs still require access to the owning workflow.
- Sample payloads and graph shapes are bounded and validated.
- Nested condition shapes, unsupported ports/events/triggers, duplicate IDs and missing required paths produce validation errors.
- Simulation never sends external effects and does not invent HTTP status, assignment, delivery or timings.
- Both runtime paths follow only the selected output port. Invalid/cyclic/unfinished execution does not appear to succeed.
- Duplicate existing runs are not restarted from the first action.
- Canceled runs cannot be changed back to running by late progress writes; graph execution checks cancellation between steps.
- Graph run snapshots/version references are persisted.
- JSON substitutions escape quotes/newlines and retain typed bindings outside JSON strings.
- Worker captures upstream outputs under `steps.<nodeId>.output` for subsequent steps.
- HTTP respects configured seconds-based timeout, supports header array representation, rejects unsupported/raw authentication behavior, sends an idempotency key, and checkpoints before external dispatch.
- HTTP DNS answers are revalidated and pinned into the actual socket; redirect success is not accepted; response reads are capped at 64 KiB.
- Private/special-use and IPv4-mapped IPv6 addresses are blocked using the shared public-address policy.
- Config redaction is recursive and handles Authorization-style header rows.
- Run cancellation verifies that the requested run belongs to the workflow in the URL.
- Success-rate denominator excludes skipped runs.

### Still release blockers

1. **Actual domain delivery:** queue handoff, tag application, inbox notification and email were audit records only. They now fail explicitly and block activation. Implement adapters against real owning services; queue/membership infrastructure is not present in the inspected conversation service.
2. **Managed credentials:** credential resolution is not wired into workflow requests. Credential-backed requests block activation rather than transmitting a reference as a token. Existing stored raw credentials need a deliberate secure migration/rotation review; this task did not rotate credentials.
3. **Recovery/retries:** the action-journal/lease tables exist in migration 002 but are not a complete durable delivery/recovery engine. HTTP fencing is conservative: uncertain outcomes require review. Crashed runs can remain running. Automatic retries/concurrency scheduling remain incomplete.
4. **Event provenance/context:** producer payloads do not currently guarantee every pictured agent/channel/intent field. Unsupported scope choices are restricted instead of silently pretending to filter. Recursion/dedup settings still need complete normalization across every producer.
5. **Historical replay and streaming:** immutable historical replay endpoints, persisted progress event delivery/reconnect, and complete multi-worker cancellation/recovery are not implemented.
6. **Old active definitions:** workflows activated before immutable graph versions require migration/snapshot handling; live legacy records without an active-version pointer are not fully immutable.
7. **API queries/retention:** complete cursor pagination, date filters, activity series and actual retention enforcement remain unfinished.
8. **UI acceptance:** not all 12 screens are visually equivalent. Several remaining differences are structural, not one-pixel polish.

These are implementation gaps, not merely missing environment secrets. A complete release needs additional implementation and integration verification.

## Verification

User explicitly authorized targeted tests and a lightweight preview. No full stack, Docker, production migrations, real external actions, provider email, or paid calls were started.

| Check | Result |
| --- | --- |
| Contracts TypeScript build | Passed |
| Workflow service TypeScript build | Passed |
| Web TypeScript check | Passed, including after temporary preview cleanup |
| Focused workflow engine/auth/repository regressions, including existing engine tests | **26 passed, 0 failed** |
| `git diff --check` | Passed |
| Real PostgreSQL/Kafka/provider end-to-end test | Not run |
| All 12 pixel comparisons | Not completed |

Logs:
- `/tmp/workflow-review-contracts.log`
- `/tmp/workflow-review-service.log`
- `/tmp/workflow-review-web.log`
- `/tmp/workflow-review-tests.log`

Browser inspection used actual AppShell/WorkflowBuilder components in a temporary development-only fixture, including node rendering, the condition inspector and settings tab. This was not an authenticated full-stack acceptance test. The temporary route/output were removed. The preview server is no longer reachable. The browser viewport was reset; browser policy prevented reacquiring the resulting error-page tab for closure.

No commits, pushes, deployments or migration execution were performed. Existing unrelated uncommitted Agent Canvas work was preserved.

## Out of scope

Unrelated application screens and Agent Canvas were not redesigned. The workflow-scoped shell intentionally omits navigation items without verified destinations and does not hardcode screenshot user/workspace data. External provider delivery, schema rollout and production acceptance were not represented as completed work.
