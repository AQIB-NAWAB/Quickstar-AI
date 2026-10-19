# Repository cleanup — 2026-10-19

## Scope and method

Scanned the application, services, shared packages, scripts, tests, static assets, package manifests, and documentation. Traced static imports, re-exports, literal dynamic imports, and CommonJS imports from Next.js route conventions, service startup files, package entry points, tests, and scripts. Cross-checked disconnected modules against exported symbol references and non-code references before removing them.

Existing working-tree changes were treated as the source of truth. This cleanup does not remove application features or database migrations.

## Changes

- Removed **76 disconnected or duplicate files**, including old marketing illustrations, the superseded workflow UI, unused analytics charts, old agent tools/test UI, unused UI wrappers and gateway helpers, two backend modules, two static conveyor prototypes, and eight duplicate copies of brand artwork.
- Removed **50 unreferenced internal exports**, including obsolete repository stubs, unused API wrappers and formatters, deprecated internal aliases, and unused geometry helpers. Kept the shared packages’ public exports.
- Removed over **175 unused import bindings**, unused state, discarded campaign-template calculations, and unused parameter destructuring. Campaign template buttons continue opening the same wizard as before; the discarded template state was never supplied to it.
- Removed `tailwind-merge` and updated the lockfile. Kept `clsx`, React DOM, and Redis dependencies because retained code, framework requirements, or shared-library integrations still need them.
- Added the frontend `typecheck` script to the recursive workspace checks and enabled `noUnusedLocals` and `noUnusedParameters` in its TypeScript configuration.
- Removed stale generated counterparts of the deleted backend modules, normalized touched imports and EOF whitespace, and updated frontend structure documentation and the project brief.

## Intentionally retained

- Next.js convention files, public widget bundle, SQL migrations and their CLI entry points, load/smoke scripts, and ambient `.d.ts` declarations. These are not discovered through ordinary application imports.
- Preview routes and fixture stores: these are reachable features used by the application.
- Canonical brand artwork and publicly served brand assets; only duplicate source copies were removed.
- Tests, service template, operational scripts, ADRs, development fixtures, local design references, walkthrough media, private environment files, and agent configuration. Absence from the runtime import graph does not make these disposable.
- Shared package exports: those form package interfaces and were not pruned solely because no current in-repository consumer imports them.

The final module scan covers **1,317 code files**. Its 38 non-imported files are the explicit framework/configuration, migration, declaration, load-test, and public-widget entry points described above; no unexplained application modules remain in that scan.

## Validation

| Check | Result |
| --- | --- |
| Workspace typecheck, including frontend unused-code checks | Passed |
| Production build, all workspaces | Passed |
| Workspace tests with temporary local HTTP servers enabled | 335 tests: 330 passed, 5 skipped, 0 failed |
| Repository integrity scan | Passed |
| Diff whitespace check | Passed |
| ESLint comparison of edited source files | 231 errors before, 49 after; no files regressed |

The broader source lint audit still reports pre-existing errors, predominantly explicit `any` types. The cleanup does not claim a clean repository-wide lint run. Static reference analysis also does not establish production usage of API routes or externally consumed package interfaces.

## Removed files

- `apps/web/public/hairline/business-conveyor.js`
- `apps/web/public/hairline/hairline-business-conveyor.html`
- `apps/web/src/assets/logo/index.ts`
- `apps/web/src/assets/logo/quickstart-app-icon.svg`
- `apps/web/src/assets/logo/quickstart-ignition-in-context.png`
- `apps/web/src/assets/logo/quickstart-lockup-horizontal-dark.svg`
- `apps/web/src/assets/logo/quickstart-lockup-horizontal.svg`
- `apps/web/src/assets/logo/quickstart-lockup-stacked.svg`
- `apps/web/src/assets/logo/quickstart-symbol-favicon-cut.svg`
- `apps/web/src/assets/logo/quickstart-symbol-obsidian.svg`
- `apps/web/src/assets/logo/quickstart-symbol.svg`
- `apps/web/src/components/brand-logo.tsx`
- `apps/web/src/components/ui/button.tsx`
- `apps/web/src/components/ui/input.tsx`
- `apps/web/src/features/agents/canvas/index.ts`
- `apps/web/src/features/agents/components/test-chat-drawer.tsx`
- `apps/web/src/features/agents/components/tool-setup-modal.tsx`
- `apps/web/src/features/agents/components/tools-tab.tsx`
- `apps/web/src/features/analytics/components/acquisition-usage.tsx`
- `apps/web/src/features/analytics/components/chart-data-table.tsx`
- `apps/web/src/features/analytics/components/charts/donut-chart.tsx`
- `apps/web/src/features/analytics/components/charts/hourly-bars.tsx`
- `apps/web/src/features/analytics/components/charts/latency-line-chart.tsx`
- `apps/web/src/features/analytics/components/charts/line-chart.tsx`
- `apps/web/src/features/analytics/components/conversation-volume-chart.tsx`
- `apps/web/src/features/analytics/components/metric-card.tsx`
- `apps/web/src/features/analytics/components/model-breakdown-chart.tsx`
- `apps/web/src/features/analytics/components/peak-activity-chart.tsx`
- `apps/web/src/features/analytics/components/response-latency-chart.tsx`
- `apps/web/src/features/analytics/components/token-consumption-chart.tsx`
- `apps/web/src/features/auth/components/auth-card.tsx`
- `apps/web/src/features/auth/illustrations/use-illustration-motion.ts`
- `apps/web/src/features/inbox/components/inbox-waiting-badge.tsx`
- `apps/web/src/features/inbox/components/state-badge.tsx`
- `apps/web/src/features/knowledge/lib/capabilities.ts`
- `apps/web/src/features/leads/components/captured-fields.tsx`
- `apps/web/src/features/leads/components/lead-schema-editor.tsx`
- `apps/web/src/features/marketing/components/animated-tetrahedron.tsx`
- `apps/web/src/features/marketing/components/animated-wave.tsx`
- `apps/web/src/features/marketing/components/architecture-flow-illustration.tsx`
- `apps/web/src/features/marketing/components/architecture-section.tsx`
- `apps/web/src/features/marketing/components/code-playground.tsx`
- `apps/web/src/features/marketing/components/cta-workflow-illustration.tsx`
- `apps/web/src/features/marketing/components/footer-workflow-illustration.tsx`
- `apps/web/src/features/marketing/components/hero-conversation-preview.tsx`
- `apps/web/src/features/marketing/components/infrastructure-section.tsx`
- `apps/web/src/features/marketing/components/interactive-url-bar.tsx`
- `apps/web/src/features/marketing/components/metrics-section.tsx`
- `apps/web/src/features/marketing/components/model-resilience-illustration.tsx`
- `apps/web/src/features/marketing/components/pricing-illustrations.tsx`
- `apps/web/src/features/settings/lib/capabilities.ts`
- `apps/web/src/features/workflows/components/action-picker.tsx`
- `apps/web/src/features/workflows/components/actions/email-action-form.tsx`
- `apps/web/src/features/workflows/components/actions/handoff-action-form.tsx`
- `apps/web/src/features/workflows/components/actions/tag-action-form.tsx`
- `apps/web/src/features/workflows/components/actions/webhook-action-form.tsx`
- `apps/web/src/features/workflows/components/automation-chain.tsx`
- `apps/web/src/features/workflows/components/canvas/workflow-node-frame.tsx`
- `apps/web/src/features/workflows/components/condition-form.tsx`
- `apps/web/src/features/workflows/components/discard-changes-dialog.tsx`
- `apps/web/src/features/workflows/components/payload-viewer.tsx`
- `apps/web/src/features/workflows/components/step-inspector.tsx`
- `apps/web/src/features/workflows/components/step-trace.tsx`
- `apps/web/src/features/workflows/components/trigger-form.tsx`
- `apps/web/src/features/workflows/components/workflow-node.tsx`
- `apps/web/src/features/workflows/hooks/use-workflow-data.ts`
- `apps/web/src/features/workflows/hooks/use-workflow-editor.ts`
- `apps/web/src/features/workflows/lib/capabilities.ts`
- `apps/web/src/features/workflows/lib/event-catalog.ts`
- `apps/web/src/features/workflows/lib/validation.ts`
- `apps/web/src/features/workspace/components/inbox-nav-item.tsx`
- `apps/web/src/lib/client/gateway.ts`
- `apps/web/src/lib/marketing/hairline/index.ts`
- `apps/web/src/lib/utils.ts`
- `services/conversation-service/src/events/outbox-types.ts`
- `services/workspace-service/src/middleware/index.ts`
