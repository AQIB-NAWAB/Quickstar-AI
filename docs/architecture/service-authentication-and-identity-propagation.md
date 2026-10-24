# Verified Service Authentication and Identity Propagation

**Status:** Active  
**Last Updated:** 2026-10-19  
**Specification:** Task 1 Implementation

---

## 1. Supported Caller Types

QuickStart AI supports five distinct caller identities across ingress, public, and internal boundaries:

| Caller Type | Entry Point | Primary Credential | Authorization Scope | Identity Context Injected |
|---|---|---|---|---|
| **1. Staff User** | API Gateway (`/v1/...`) | `Authorization: Bearer <JWT>` | User permissions resolved via Workspace RBAC | `principalType: "staff"`, `actorId: sub`, `orgId: org_id` |
| **2. Machine API Key** | API Gateway (`/v1/...`) | `Authorization: Bearer qs_live_...` or `X-API-Key: qs_live_...` | Key permissions scoped to owning Organization / Workspace | `principalType: "api_key"`, `actorId: keyId/createdBy`, `orgId: org_id` |
| **3. Internal Service Request** | Internal network (`/internal/...`) | `Authorization: Bearer <INTERNAL_TOKEN>` | Restricted to internal-only endpoints (e.g. secret reveal, raw vectors) | Trusted service principal; bypasses external gateway |
| **4. Widget Visitor** | API Gateway (`/v1/public/widget/...`) | `X-Publishable-Key: pk_live_...` | Ephemeral guest conversation turns in approved widget origins | Scoped to specific agent & workspace resolved from publishable key |
| **5. Provider Webhook** | Ingress endpoints (e.g. `/v1/billing/webhook`, `/v1/telephony/...`) | Provider cryptographic signature (Stripe HMAC, Twilio auth signature) | Webhook events verified against raw body bytes | Provider event context; cannot impersonate platform users |

---

## 2. Verified Identity Propagation Protocol

### Ingress Header Stripping
All public entry points (API Gateway) immediately strip untrusted identity and internal headers from caller requests:
- `x-quickstart-auth-context`
- `x-quickstart-internal-token`

Any attempt by external callers to supply these headers directly to the API Gateway is discarded before routing or proxying.

### Gateway Identity Ingestion & Signing
Once the API Gateway cryptographically verifies the caller (via Staff JWT or Machine API Key):
1. It generates a verified auth context payload containing:
   - `tenant_id`: Organization ID
   - `actor_id`: User ID or API Key principal ID
   - `principal_type`: `"staff"` | `"api_key"`
   - `workspace_id`: Resolved target workspace ID (from route `:workspaceId`, if present)
   - `request_id`: Tracing request ID
   - `aud`: `"quickstart-internal"`
   - `issued_at`: Current Unix epoch seconds
   - `exp`: Epoch seconds with 300-second (5 minute) TTL
2. The Gateway computes an HMAC-SHA256 signature using `INTERNAL_SERVICE_SECRET` (falling back to `JWT_ACCESS_SECRET` in dev):
   $$\text{signature} = \text{HMAC-SHA256}(\text{base64url}(\text{payload}), \text{secret})$$
3. The Gateway attaches the header:
   ```http
   x-quickstart-auth-context: v1.<payload_base64url>.<signature_base64url>
   ```
4. The raw Bearer token is forwarded as `Authorization: Bearer <rawToken>`.

---

## 3. Downstream Service Enforcement

All downstream services (`agent-service`, `conversation-service`, `workspace-service`, `secrets-service`, `knowledge-service`, `memory-service`, `audit-service`, `usage-service`, `campaign-service`, `voice-service`, `eval-service`, `lead-service`, `runtime-service`, `workflow-service`) require verified credentials:

1. **HMAC Signature Check:**
   When `x-quickstart-auth-context` is present, the service validates that the header begins with `v1.` and verifies the signature using `INTERNAL_SERVICE_SECRET` (or `INTERNAL_SERVICE_SECRET_PREVIOUS` during key rotation). Unsigned, tampered, or malformed headers are immediately rejected with `401 Unauthorized`.
2. **Expiration & Clock Skew:**
   Tokens older than 300 seconds or issued more than 60 seconds in the future are rejected.
3. **Workspace Isolation:**
   If `workspaceId` is bound in the verified auth context, the service verifies that the route parameter `:workspaceId` matches. Any cross-workspace request is rejected with `403 Forbidden`.
4. **Bearer Token Fallback:**
   If no service auth context header is provided, the service verifies the direct `Authorization: Bearer <jwt>` using `verifyAccessToken(token, jwtSecret)`. Direct service requests without a valid Bearer token or signed service header are rejected with `401 Unauthorized`.
5. **No Tenant Impersonation:**
   Internal credentials or headers cannot be forged to impersonate another tenant. Downstream permission checks continue to evaluate workspace membership against the authoritative workspace service.

---

## 4. Internal Service-to-Service Calls

Internal communications that bypass public Gateway proxying:
- Use dedicated `/internal/...` route prefixes.
- Require `Authorization: Bearer <INTERNAL_TOKEN>` verified via `createRequireInternalTokenMiddleware(internalToken)`.
- Internal endpoints are never exposed on external load balancers.
- Sensitive service-to-service operations (such as secret revelation in `secrets-service`) are restricted to verified internal tokens.

---

## 5. Secret Rotation Procedure

Zero-downtime rotation of `INTERNAL_SERVICE_SECRET`:
1. Generate new 32+ character secret: `openssl rand -hex 32`.
2. Deploy backend services with:
   - `INTERNAL_SERVICE_SECRET=<new_secret>`
   - `INTERNAL_SERVICE_SECRET_PREVIOUS=<old_secret>`
3. Deploy API Gateway with:
   - `INTERNAL_SERVICE_SECRET=<new_secret>`
4. Once all gateway instances are signing with `<new_secret>`, wait 10 minutes (twice the 5-minute auth context TTL).
5. Remove `INTERNAL_SERVICE_SECRET_PREVIOUS` from backend service configurations.

---

## 6. Credential Redaction

All platform logging and error responses redact credentials automatically:
- `authorization`
- `password`
- `secret`
- `api_key`
- `x-quickstart-auth-context`
- `x-quickstart-internal-token`
- `x-publishable-key`
- `client_secret`
