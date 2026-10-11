# Developer Portal — Backend Dependencies & API Contracts

This document outlines the contracts, specifications, and backend capabilities required to transition the Developer Portal and Webhook management features from frontend interfaces to fully integrated production services.

---

## 1. OpenAPI Coverage Gaps

The current `docs/api/openapi.yaml` represents a minimal gateway skeleton covering:
- `/v1/register` (POST)
- `/v1/login` (POST)
- `/v1/me` (GET)
- `/v1/orgs/{orgId}/workspaces` (GET, POST)
- `/v1/workspaces/{workspaceId}/invites` (POST)
- `/v1/workspaces/{workspaceId}/members/{userId}` (PATCH)

### Critical Coverage Gaps:
1. **Agents API:** No OpenAPI definitions exist for `/v1/workspaces/{workspaceId}/agents` (creation, compilation, publishing, tools).
2. **Conversations & Messages:** No OpenAPI definitions exist for streaming conversation endpoints, message pagination, or thread control.
3. **Knowledge & Ingestion:** Missing schema definitions for source uploads, ingestion status, and vector query endpoints.
4. **Leads & Contacts:** No endpoints defined for lead ingestion or webhook push.
5. **Campaigns & Voice:** Missing endpoints for outbound batches and Twilio/LiveKit SIP trunks.

---

## 2. Try-It Console Authentication & Transport

- **Execution Boundary:** The frontend try-it console enforces strict constraints to prevent arbitrary SSRF or credential leakage.
- **Base Gateway:** Defaults to `http://localhost:3000` (configurable via `NEXT_PUBLIC_GATEWAY_URL`). Must be constrained to allowed gateway origins.
- **Authentication:**
  - Token input is kept in component memory only (`useState`). Never persisted to `localStorage`, `sessionStorage`, or cookies.
  - The skeleton security scheme requires `Bearer <jwt_token>`. Organization API keys (`qs_live_...`) require backend validation support before being enabled.
- **Safety & Mutation Confirmation:**
  - Read operations (`GET`) execute explicitly via the "Send request" button.
  - Destructive or state-altering requests (`POST`, `PATCH`, `DELETE`) require explicit user confirmation to avoid unintended mutation of production data.

---

## 3. TypeScript SDK Availability

- As noted in `sdk/README.md`, an official `@quickstart/sdk` package is not yet published to npm.
- **Current Guidance:** Provide server-side Node.js/TypeScript REST integration patterns using `fetch` with standard bearer authorization and structured error parsing.
- **Future SDK Contract:** When generated, the SDK should support typed clients, automatic retry with exponential backoff for 429/503 responses, and streaming event generators.

---

## 4. Webhook Management & Subscriptions

### Registration Endpoint:
- **Route:** `POST /v1/workspaces/{workspaceId}/webhooks`
- **Request Payload:**
  ```json
  {
    "url": "https://hooks.example.com/events",
    "events": ["conversation.handed_off", "agent.published"],
    "description": "Optional human label"
  }
  ```
- **Response Contract (Copy-Once Secret):**
  ```json
  {
    "id": "wh_7890",
    "url": "https://hooks.example.com/events",
    "events": ["conversation.handed_off", "agent.published"],
    "status": "active",
    "signingSecret": "whsec_live_9a7b3c...",
    "createdAt": "2026-10-12T00:00:00.000Z"
  }
  ```
- **Copy-Once Semantics:** The raw `signingSecret` is returned **only once** upon successful registration. Subsequent `GET /webhooks` queries MUST omit the secret or return only a redacted prefix (`whsec_...****`).

### Event Catalog (Platform Events):
- Defined in `packages/contracts/src/platform-events.ts`:
  - `conversation.handed_off`
  - `conversation.released`
  - `message.appended`
  - `agent.published`

---

## 5. HMAC Signing Protocol

The webhook dispatch engine must implement canonical cryptographic verification:
- **Header:** `X-QuickStart-Signature` (format: `t={timestamp},v1={hex_hmac}`)
- **Timestamp Header:** Included in payload or header to prevent replay attacks (recommended window: 5 minutes / 300 seconds).
- **Algorithm:** `HMAC-SHA256` using the raw UTF-8 request body bytes and the endpoint's signing secret.
- **Verification Rule:** Consumers must use constant-time comparison (`crypto.timingSafeEqual`) to prevent timing side-channel attacks.

---

## 6. Delivery Diagnostics & Redrive Idempotency

### Delivery Trace Endpoint:
- **Route:** `GET /v1/workspaces/{workspaceId}/webhooks/{webhookId}/deliveries/{deliveryId}`
- **Metadata Returned:**
  - `attempt`: Current attempt number (1-indexed).
  - `httpStatus`: HTTP response status code (or `null` if network socket error).
  - `latencyMs`: Request round-trip time in milliseconds.
  - `request.headers`: Sanitized headers (authorization and secrets redacted).
  - `request.body`: Exact event payload dispatched.
  - `response.body`: Truncated response body (bounded to 16KB).
  - `attemptsHistory`: Chronological array of previous delivery attempts.

### Redrive Contract:
- **Route:** `POST /v1/workspaces/{workspaceId}/webhooks/{webhookId}/deliveries/{deliveryId}/redrive`
- **Idempotency Header:** `Idempotency-Key: redrive_{deliveryId}_{timestamp}`
- **Behavior:**
  - Dispatches the exact original event payload with a new delivery attempt record.
  - Does NOT mutate or delete earlier attempt logs.
  - Destination endpoints must handle potential duplicate processing via their own event ID deduplication.
