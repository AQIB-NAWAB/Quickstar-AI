# QuickStart AI — Functional Capabilities Implementation Tracker

This tracker monitors the nine functional capabilities assigned for end-to-end implementation across the QuickStart AI monorepo.

---

## Capabilities Status Matrix

| # | Capability Area | Status | Primary Services / Packages | Key Migrations / Contracts |
|---|---|---|---|---|
| 1 | Third-party Integrations | Done | `workspace-service`, `secrets-service`, `gateway-service`, `apps/web` | `006_integration_credentials_and_sync.sql`, `@quickstart/contracts/integrations.ts` |
| 2 | Workflow Actions | Done | `workflow-service`, `conversation-service`, `lead-service`, `workspace-service` | `008_conversation_operator_queues.sql`, `@quickstart/contracts/workflow-graph.ts` |
| 3 | Real Outbound Campaigns | Done | `campaign-service`, `voice-service`, `apps/web` | `003_campaign_attempts_and_reconciliation.sql`, `@quickstart/contracts/voice.ts` |
| 4 | Telephony | Done | `voice-service`, `gateway-service`, `apps/web` | `007_telephony_lifecycle_and_bindings.sql`, `@quickstart/contracts/voice.ts` |
| 5 | Billing & Reliable Usage | Done | `usage-service`, `gateway-service`, `apps/web` | `003_organization_billing_and_subscriptions.sql`, `@quickstart/contracts/billing.ts` |
| 6 | Knowledge Extraction & OCR | Done | `knowledge-service`, `apps/web` | `004_knowledge_async_extraction.sql`, `@quickstart/contracts/knowledge.ts` |
| 7 | Analytics Accuracy | Done | `usage-service`, `apps/web` | `@quickstart/contracts/analytics.ts` |
| 8 | Webhook Automation | Done | `workspace-service`, `apps/web` | `007_webhook_deliveries_queue.sql`, `@quickstart/contracts/webhooks.ts` |
| 9 | Public API & SDKs | Done | `gateway-service`, `docs/api/openapi.yaml`, `sdk/typescript`, `sdk/python` | `docs/api/openapi.yaml`, `@quickstart/sdk` |

---

## Detailed Capability Breakdown

### 1. Third-Party Integrations
- **Relevant Files:**
  - `packages/contracts/src/integrations.ts`
  - `services/workspace-service/src/services/integrations.service.ts`
  - `services/workspace-service/src/integrations/providers/` (Google Calendar, HubSpot, Salesforce, Slack, Twilio, Zendesk, Google Sheets, Notion, Mailchimp)
  - `services/workspace-service/src/repository/integrations.repository.ts`
  - `services/workspace-service/migrations/006_integration_credentials_and_sync.sql`
  - `services/secrets-service/src/services/secrets.service.ts`
  - `apps/web/src/features/integrations/components/`
- **Implemented Behavior:** Real confidential client OAuth 2.0 flow with PKCE S256, cryptographically random state tokens, token refresh leases, credential encryption via `secrets-service`, tenant isolation, and provider-specific resource synchronization.
- **External Configuration Requirements:** Provider OAuth Client IDs, Client Secrets, redirect URIs in provider developer consoles.
- **Decisions Awaiting Owner Input:** Multi-account per provider versus single default connection (configured as default connection with schema support for multiple).

### 2. Workflow Actions
- **Relevant Files:**
  - `services/workflow-service/src/engine/actions.ts`
  - `services/workflow-service/src/engine/runner.ts`
  - `services/conversation-service/src/services/operator-queues.service.ts`
  - `services/conversation-service/src/repository/operator-queues.repository.ts`
  - `services/conversation-service/migrations/008_conversation_operator_queues.sql`
  - `services/workspace-service/src/services/notifications.service.ts`
  - `apps/web/src/features/workflows/components/inspectors/`
- **Implemented Behavior:** Real tag updates against conversations and leads, multi-channel notifications (in-app, email adapter, Slack), operator queue creation and conversation handoff with bot pausing, and managed HTTP credential resolution with strict SSRF defense.
- **External Configuration Requirements:** SMTP / transactional email credentials (Postmark/SendGrid/SES).

### 3. Real Outbound Campaigns
- **Relevant Files:**
  - `services/campaign-service/src/engine/dialer.ts`
  - `services/campaign-service/src/engine/voice-dial-adapter.ts`
  - `services/campaign-service/src/services/campaigns.service.ts`
  - `services/campaign-service/src/repository/campaigns.repository.ts`
  - `services/campaign-service/migrations/003_campaign_attempts_and_reconciliation.sql`
  - `services/campaign-service/src/repository/migrate.ts`
  - `services/voice-service/src/controllers/telephony.controller.ts` (reconciliation webhook)
  - `apps/web/src/features/campaigns/components/`
- **Implemented Behavior:** Asynchronous dialer dispatch to voice-service, durable attempt lifecycle (`dispatch_pending` -> `dialing` -> `answered`/`failed`), cross-worker concurrency pacing, pre-call DNC suppression checks, recipient-local timezone holding, and AMD/voicemail outcome recording with attempt reconciliation.

### 4. Telephony
- **Relevant Files:**
  - `services/voice-service/src/telephony/media-stream-server.ts`
  - `services/voice-service/src/telephony/audio-codecs.ts`
  - `services/voice-service/src/telephony/twilio-cpaas.ts`
  - `services/voice-service/src/controllers/telephony.controller.ts`
  - `services/voice-service/src/repository/calls.repository.ts`
  - `services/voice-service/src/repository/recording.store.ts`
  - `services/voice-service/migrations/007_telephony_lifecycle_and_bindings.sql`
  - `apps/web/src/features/voice/components/`
- **Implemented Behavior:** Real TwiML stream generation, bidirectional WebSocket media protocol with mu-law <-> PCM16 audio transcoding, barge-in interruption clearing, signature verification using raw request bodies, durable call lifecycle state transitions, dual-track stereo recordings persisted to S3/MinIO.
- **External Configuration Requirements:** Twilio Account SID, Auth Token, verified E.164 phone numbers, public WebSocket base URL.

### 5. Billing & Reliable Usage
- **Relevant Files:**
  - `services/usage-service/src/billing/billing.service.ts`
  - `services/usage-service/src/billing/billing.repository.ts`
  - `services/usage-service/src/billing/plans.catalog.ts`
  - `services/usage-service/src/controllers/billing.controller.ts`
  - `services/usage-service/migrations/003_organization_billing_and_subscriptions.sql`
  - `services/gateway-service/src/http/routes/proxy-usage.routes.ts`
  - `packages/contracts/src/billing.ts`
  - `apps/web/src/app/api/organizations/[orgId]/billing/`
  - `apps/web/src/features/settings/components/billing-settings.tsx`
  - `apps/web/src/features/settings/components/workspace-settings.tsx`
- **Implemented Behavior:** Organization-level Stripe customer mappings, checkout sessions, customer billing portal, raw-body Stripe webhook handler with HMAC verification and idempotency inbox, plan catalog (Free, Starter, Growth, Enterprise), exact integer micro/cent pricing calculations.
- **External Configuration Requirements:** Stripe Secret Key, Stripe Webhook Signing Secret, Stripe Product/Price IDs.

### 6. Knowledge Extraction & OCR
- **Relevant Files:**
  - `services/knowledge-service/src/lib/extract.ts`
  - `services/knowledge-service/src/workers/extraction.worker.ts`
  - `services/knowledge-service/src/services/sources.service.ts`
  - `services/knowledge-service/src/repository/sources.repository.ts`
  - `services/knowledge-service/migrations/004_knowledge_async_extraction.sql`
  - `packages/contracts/src/knowledge.ts`
  - `apps/web/src/features/knowledge/components/`
- **Implemented Behavior:** Asynchronous ingestion pipeline; PDF parsing with Unicode mapping; DOCX XML extraction with zip bomb limits; pluggable OCR adapter with local Tesseract engine and remote provider fallback; chunk citation provenance tracking (version, page, offset).
- **External Configuration Requirements:** OCR binary path (`tesseract`) and language training packs if local OCR is enabled.

### 7. Analytics Accuracy
- **Relevant Files:**
  - `services/usage-service/src/repository/analytics.repository.ts`
  - `services/usage-service/src/services/analytics.service.ts`
  - `packages/contracts/src/analytics.ts`
  - `apps/web/src/features/analytics/components/`
- **Implemented Behavior:** Honest metric accounting: actual token splits (no 75/25 fabrication), true distinct conversation/turn IDs, real distinct voice calls, IANA timezone-correct calendar day bucketing, exact percentile calculations, explicit coverage metadata (`complete`, `partial`, `unavailable`).

### 8. Webhook Automation
- **Relevant Files:**
  - `services/workspace-service/src/events/platform-events-consumer.ts`
  - `services/workspace-service/src/services/webhooks.service.ts`
  - `services/workspace-service/src/workers/webhook-delivery.worker.ts`
  - `services/workspace-service/src/repository/webhooks.repository.ts`
  - `services/workspace-service/src/utils/ssrf.ts`
  - `services/workspace-service/migrations/007_webhook_deliveries_queue.sql`
  - `packages/contracts/src/webhooks.ts`
  - `apps/web/src/features/developer/components/webhooks/`
- **Implemented Behavior:** Kafka platform events fan-out consumer group; durable per-endpoint delivery queue with lease fencing; exponential backoff with jitter; HMAC-SHA256 timestamped signatures (`t=...,v1=...`); SSRF defense with DNS resolution checks; worker-backed manual redrive.

### 9. Public API & SDKs
- **Relevant Files:**
  - `services/gateway-service/src/middleware/api-key-auth.ts`
  - `services/identity-service/src/services/api-keys.service.ts`
  - `docs/api/openapi.yaml`
  - `sdk/typescript/` (ESM package, typed methods, SSE parsing, webhook verification, README)
  - `sdk/python/` (pyproject.toml, httpx-based sync/async client, webhook verification, README)
- **Implemented Behavior:** Machine API-key authentication (`qk_live_...`), organization scope resolution, OpenAPI 3.0 canonical specification, production-ready TypeScript and Python client SDKs.

