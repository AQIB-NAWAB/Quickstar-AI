# UI Audit — Visual Agent Builder Canvas (2026-10-18)

## Verdict — B, provisional

The implementation now follows the approved orange, white, Manrope/Inter design direction and the library/canvas/inspector/workbench layout much more closely.
The review fixed substantive frontend state and backend execution defects; it did not establish pixel equivalence across all 16 reference states.
The feature still needs integrated acceptance with the real gateway, database, Redis, model/knowledge providers, and voice pipeline before release.

## Score table

| Axis | Grade | Evidence |
| --- | --- | --- |
| Hierarchy | B | `CanvasHeader`, restrained `CanvasNodeFrame`, and a docked `InspectorPanel` restore the dominant canvas and focused properties hierarchy. |
| Spacing | B | The library uses a 208px track, inspector/workbench use 400px desktop tracks, and the empty state sits directly on the canvas. Narrow layouts and every inspector scroll position need further visual acceptance. |
| Typography | B | Existing project fonts are retained; variable values use monospace. Dense editor labels are intentionally smaller than marketing body copy. |
| Color | B | Primary actions and selection use the existing orange; semantic node icons use restrained category colors. A complete measured contrast audit was not performed. |
| Consistency | B | Node handles, inspector transitions, and runtime branches now share canonical port identities. Remaining global settings/model controls differ from the approved mockup. |
| Accessibility | C | Keyboard palette activation, labelled controls, dialog focus trapping, and editable-field-aware shortcuts improved. Some compact canvas controls remain smaller than 44px; full screen-reader and keyboard connection testing remains outstanding. |

## Top 10 fixes

| Priority | What and why | Effort | Result / expected effect |
| --- | --- | --- | --- |
| 1 | Normalize editor configuration and connection ports at shared boundaries (consistency). | L | Fixed: saved UI connections can execute and branch IDs remain stable. |
| 2 | Save graph and agent defaults atomically with revision checks (consistency). | L | Fixed: settings persist; stale saves fail instead of overwriting concurrent edits. |
| 3 | Freeze preview graph/defaults and isolate sessions, trace lookup, listeners, and turn replay by workspace (consistency). | L | Fixed: edits cannot silently mutate an existing preview and tenants cannot share run lookups. |
| 4 | Remove fabricated model/API/knowledge fallback results (hierarchy and trustworthy feedback). | M | Fixed: missing dependencies produce genuine failures or configured failure branches. |
| 5 | Correct capture, waiting, confirmation, handoff and failure-edge execution (consistency). | L | Fixed: nodes suspend/resume intentionally; writes require confirmation and have a checkpoint before I/O. |
| 6 | Route production widget/voice turns through the published graph and use internal service credentials for model/knowledge calls (consistency). | L | Fixed in source; provider-connected production acceptance still required. |
| 7 | Restore compact application chrome, library rows, node sizing, inspector layout and empty-state hierarchy (spacing/hierarchy). | L | Improved and inspected in a temporary frontend fixture. |
| 8 | Connect properties, attached tools, knowledge sources, transitions, save feedback and publish blockers to real state (consistency). | L | Improved: settings no longer present fake success feedback. |
| 9 | Replace simulated voice activity and execution timelines with real browser speech events and backend trace steps (hierarchy). | M | Improved: browser speech is explicitly identified. Provider-backed preview remains outstanding. |
| 10 | Complete reference-state visual acceptance and provider/database integration (all axes). | L | Outstanding; needed before a 100% visual or production-readiness claim. |

## Reference coverage

References are the 16 numbered PNGs in `/home/hashirsajid58200p/Downloads/Canvas`.

| References | Area | Review outcome |
| --- | --- | --- |
| 1 | Main canvas and HTTP inspector | Layout, compact chrome, attached tool selection, editable parameter names/mappings and transitions corrected. Endpoint/authentication remain controlled by the existing attached tool configuration. |
| 2 | Chat test workbench | Docked panel, Markdown responses, real turn/reset failures, frozen revision, trace input/output display and active-node events connected. Full authenticated browser round trip not exercised. |
| 3 | Global agent settings | Persona, model, temperature, channels and voice settings persist; existing voice catalog reused. Exact section composition and memory controls do not fully match. |
| 4–12 | Router, capture, knowledge, handoff, response, entry, condition, AI and end inspectors | Focused inspectors and canonical outputs implemented; transitions update graph edges. Runtime regression coverage added for major execution paths. Every visual state was not screenshot-diffed. |
| 13 | Quick add menu | Context/connection insertion creates real nodes and connections. |
| 14 | Empty canvas | Centered first-flow actions, template cards, grid background and disabled empty-flow test/publish controls inspected. |
| 15 | Publish review | Wide two-column review, real validation blockers, release notes, focus management and server-returned release number. A true published-vs-draft change summary remains incomplete. |
| 16 | Voice workbench | Real browser recognition/synthesis events and cleanup replace fake timers. This is explicitly browser speech; it is not proof of configured telephony/provider voice parity. |

## Backend corrections and regression evidence

- Canvas operations require verified access tokens; unsigned gateway context cannot authorize graph writes, and a spoofed actor header cannot replace the JWT subject.
- TypeORM graph/settings updates use a conditional revision predicate rather than a read/check/save race. Real PostgreSQL concurrency was not exercised.
- Graph shape checks reject malformed nested field types; validation rejects invalid handles, multiple destinations on one output, and missing/unattached HTTP tools.
- Session snapshots retain graph and agent defaults. Redis, when configured, is authoritative; process memory is only the no-Redis fallback.
- Workspace-scoped turn replay and exclusive session locks guard retries/concurrent turns. Confirmation checkpoints fence uncertain mutating action outcomes; this does not promise exactly-once behavior across arbitrary external APIs.
- HTTP nodes use attached HTTP tools and their established host/auth policy; API errors do not produce fabricated bookings.
- AI nodes inherit the frozen persona/model settings, and internal model/knowledge clients work without a browser bearer header.
- Handoff requests reach the conversation service in production; AI execution stays suspended until authoritative release and a configured resume destination.
- Preview initialization errors propagate rather than appearing to start an empty successful session.

## Verification

Checks were run sequentially or in small bounded groups to limit memory usage. No full monorepo build, Docker stack, migration execution or paid model/voice call was started.

| Check | Result |
| --- | --- |
| Contracts TypeScript build | Passed |
| Agent service TypeScript build | Passed |
| Runtime service TypeScript build | Passed |
| Conversation service TypeScript build | Passed |
| Web `tsc --noEmit` | Passed |
| Graph runtime regressions | 19 passed, 0 failed |
| Canvas HTTP API regressions, in-memory store | 3 passed, 0 failed |
| Existing runtime suite | 18 passed, 4 failed |
| Same existing runtime suite on an isolated Git HEAD baseline | Same 18 passed, same 4 failed |
| `git diff --check` | Passed |

The four baseline failures are the duplicate-call tool-loop test, different-arguments tool-loop test, memory-after-knowledge test, and expected spoken transfer wording test. They were not hidden or rewritten to force a green report.

Test logs are in `/tmp/canvas-review-tests.log`, `/tmp/canvas-review-api-tests.log`, `/tmp/canvas-review-runtime-existing-tests.log`, and `/tmp/canvas-review-baseline-tests.log`. Temporary logs may disappear after system cleanup.

Frontend inspection used actual canvas components in a temporary development fixture. This verifies component rendering and layout, not the authenticated full application or all 16 pixel comparisons. The fixture was removed, the temporary server stopped, and the browser viewport override reset.

## Outstanding integration and fidelity limits

1. Provider-backed voice preview and terminal/hangup signaling need integration with the existing telephony pipeline. Browser speech uses browser voices.
2. PostgreSQL flow-session/trace migrations exist in the supplied implementation, but runtime session storage currently uses Redis or bounded memory; database session durability is not implemented/verified by this review.
3. Live SSE listeners are process-local. Redis-backed stored traces can be retrieved, but multi-replica event delivery and reconnect replay need additional work.
4. Ended production sessions currently reject further turns; the product must define whether a new flow session or a closed conversation is the intended next interaction.
5. Knowledge results are filtered to selected sources after retrieval; source filtering should move into the search query to avoid missing relevant selected-source matches outside the initial result window.
6. Global memory configuration, provider/model selection UI, publish change diff, richer templates, entrypoint metadata mapping, and exact inspector composition still need completion against the approved references.
7. Viewport-only changes persist with a later graph edit; internal navigation protection is less complete than browser unload protection.
8. No real database, Redis outage/lock-expiry, provider billing, telephony, multi-user or authenticated browser end-to-end acceptance was run.

## Out of scope

The review preserves the project identity and unrelated screens. It does not authorize release/deployment, execute production migrations, or replace existing product decisions with new visual concepts. No commits or pushes were made; the existing uncommitted implementation was preserved and amended.
