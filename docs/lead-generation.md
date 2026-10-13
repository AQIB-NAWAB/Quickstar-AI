# Lead generation API and integration contracts

Service: `@quickstart/service-lead-generation`. Default port: `3019` (workflow owns `3012`).
Architecture, operational semantics and validation are documented in the
[service README](../services/lead-generation-service/README.md).

## Authorization

Public paths use `/v1/workspaces/{workspaceId}/lead-generation` and the platform
access JWT in `Authorization: Bearer ...`. The service verifies the JWT,
authoritative workspace organization and current workspace role. Caller-supplied
tenant headers are not trusted.

Owner/admin/developer/operator have read/write permissions. Analyst has read
permission. Shared permission keys: `workspace.leads.read`, `workspace.leads.write`.
Gateway routes use the existing access and membership middleware. Runtime tools
forward the caller JWT and fixed workspace; tool arguments cannot change the tenant.

## Workspace endpoints

| Method | Relative path                | Behavior                                                                         |
| ------ | ---------------------------- | -------------------------------------------------------------------------------- |
| GET    | `/profile`                   | Latest business profile in the current execution mode                            |
| PUT    | `/profile`                   | Versioned profile update; schedules asynchronous research                        |
| POST   | `/runs`                      | Create a background run; requires `Idempotency-Key`                              |
| GET    | `/runs`                      | Paginated run list                                                               |
| GET    | `/runs/{id}`                 | State, snapshot, counters, progress and stopping reason                          |
| GET    | `/runs/{id}/results`         | Candidate assessments, accepted/rejected/duplicate/cancelled status and evidence |
| GET    | `/runs/{id}/deliveries`      | Campaign delivery state, attempts and acknowledgements                           |
| POST   | `/runs/{id}/cancel`          | Cancel remaining research; accepted delivery tasks continue                      |
| GET    | `/leads`                     | Accepted business records in the current mode                                    |
| POST   | `/deliveries/{taskId}/retry` | Audited replay of a failed delivery                                              |
| GET    | `/policy`                    | Effective organization policy and composite version                              |
| GET    | `/tasks`                     | Task state, attempts and failure codes                                           |
| GET    | `/usage`                     | Last 31 UTC days of organization usage                                           |
| GET    | `/audit`                     | Workspace action history                                                         |

UUID lists use `after` and `limit` (maximum 100). Audit uses a numeric cursor.
Responses include `items` and `next_cursor` where applicable. Standard platform
error envelopes carry a code and request ID.

## Business profile

`PUT /profile` accepts:

```json
{
  "expected_version": 0,
  "business": {
    "name": "Appointment software provider",
    "website": "https://example.com/",
    "description": "Appointment scheduling software for service businesses",
    "offerings": ["appointment scheduling"],
    "target_categories": ["clinics"],
    "locations": ["Lahore"]
  }
}
```

The first version is zero in the request; subsequent requests use the latest
profile version. A successful update returns 202 and schedules onboarding.
Supplied facts are stored separately from researched observations/inferences.
Every run pins its profile ID and business context at creation.

The existing registration API has no website field. The onboarding caller must
invoke this profile API after collecting business details; no registration or
frontend workflow is added by this feature.

## Run creation and results

`POST /runs` accepts:

```json
{
  "categories": ["clinics", "salons"],
  "location": "Lahore",
  "target_count": 20,
  "required_contact": "email",
  "excluded_domains": ["existing-customer.example"]
}
```

Optional fields: `company_size`, `contact_role`, `instructions`, and `campaign_id`
(UUID). Required contact values: `none`, `email`, `phone`. Supply a campaign ID
only when a campaign destination is intended; otherwise accepted leads remain
stored without delivery tasks.

A new request returns 202. Replaying the same key and normalized body returns the
same run with 200; conflicting reuse returns 409. Categories and target counts
must satisfy current policy limits. A profile is required before run creation.

Results contain company identity, website, category, supported location/size/role,
validated contacts, fit score/reasons, source evidence, checked time and data origin.
Every evidence quote must occur in the supplied page and contain the extracted
value. Unsupported contact fields are discarded; unsupported required criteria
cause rejection. Summaries, reasons and fit scores are AI assessments.

Own-business and excluded domains are filtered before candidate creation and
again after redirects. Redirected duplicates do not increase the unique target
count. Contact/about redirects cannot attach another domain's content to a lead.

## Policies and admin endpoints

Admin endpoints use `/internal/lead-generation` and a distinct
`LEAD_GENERATION_ADMIN_TOKEN`. They are not proxied as customer gateway routes.
A trusted dashboard backend may supply `x-admin-actor`; this token must stay on
trusted infrastructure. Local binding is loopback by default. A container may set
`LEAD_GENERATION_HOST=0.0.0.0` only with private service networking/admin access.

| Method | Relative path             | Behavior                                                |
| ------ | ------------------------- | ------------------------------------------------------- |
| GET    | `/settings`               | Global configuration and named tier patches             |
| GET    | `/tenants/{orgId}/policy` | Effective organization policy/version                   |
| PUT    | `/settings`               | Version-checked global, tier or tenant update           |
| GET    | `/audit`                  | Previous/new values, actor, reason, time and request ID |
| GET    | `/metrics`                | Prometheus task/run counts and oldest queue age         |

Global defaults are merged with a named tier patch, then organization overrides.
Updates require `expected_version` and `reason`; stale writes return a conflict.
Example tier definition:

```json
{
  "scope": "tier",
  "name": "standard",
  "expected_version": 0,
  "policy": { "max_active_tasks": 2, "scheduling_weight": 1 },
  "reason": "Define standard execution policy"
}
```

Tenant assignment/update includes `scope: tenant`, `org_id`, `expected_version`
and optional `tier_name`/`policy`. New tenant rows begin at policy version 1.
`policy: null` clears tenant overrides. Global updates may include
`global_active_limit`. The effective version combines global, tier and tenant
versions. The application does not implement payment processing or entitlement
verification; a trusted billing backend can assign the tier.

Commercial daily-run enforcement is disabled initially. Technical safeguards
remain active: categories, backlog, per-organization/global concurrency, weighted
scheduling, provider units/tokens, request rate, rounds, candidates and deadline.
Organization limits aggregate across all workspaces. Successful usage is settled
once; unknown provider outcomes retain conservative reservations.

Operational settings are checked before claims and provider reservations. Reduced
concurrency waits for active calls to finish; targeting/qualification snapshots
remain stable. Disabling the feature blocks new research and pauses claims;
inspection and cancellation remain available, subject to request rate limits.

## Campaign ingestion contract

The shared `CampaignLeadDelivery` type is exported from `@quickstart/contracts`.
The configured destination uses `LEAD_CAMPAIGN_INGEST_URL` and
`LEAD_CAMPAIGN_TOKEN`. Delivery POST headers include the bearer token,
`Idempotency-Key`, content type and request ID. Redirects are rejected.

Payload fields: `schema_version: 1`, `workspace_id`, `campaign_id`, `run_id`,
`lead_id`, `idempotency_key`, and the evidence-backed `lead` record. Lead records
include `data_origin` and `outreach_eligible: false`. A discovered prospect is not
an automatic authorization to call or contact it.

The campaign service must verify workspace/campaign ownership and deduplicate
by delivery key. Successful acknowledgement requires:

```json
{
  "workspace_id": "same workspace UUID as the request",
  "idempotency_key": "same key as the request",
  "campaign_lead_id": "non-empty campaign record identifier"
}
```

Live delivery rejects simulated acknowledgements. Accepted lead persistence and
delivery scheduling occur in one transaction. Unavailable endpoints never discard
accepted leads. Retries are bounded; failed handoffs remain inspectable and can be
replayed explicitly. Repeated inclusion of the same lead in the same campaign is
deduplicated; updating a delivered record requires a future versioned contract.

Campaign execution, contact-status transitions and voice calling are owned by the
campaign/voice components and are not implemented here.

## Provider and chatbot integration

Live research calls existing `/internal/search`, `/internal/scrape` and
model-gateway `/internal/complete` APIs. Configure a real model profile/model ID
and matching credentials, plus an approved real search provider. The environment
template excludes fake acquisition profiles. Direct HTTP fetching performs DNS
validation/pinning, redirect revalidation, standard-port restrictions and streamed
body limits. Provider-side page handling remains subject to the provider contract.

Agent versions can register `builtin_leads` tools for `start`, `status`, `results`
and `cancel`; tool definitions are in `fixtures/lead-generation-agent-tools.json`.
Publish a new agent version after adding them. A tool call starts or inspects
background work rather than waiting for a complete research run.

Demo adapters are explicitly synthetic and mode-isolated. The retained smoke
checker exercises platform integration in demo mode and leaves generated accounts
and records in the development database. Runtime/provider tests use controlled
fixtures; live credentials and the team's campaign endpoint require integration
validation. See the service README for test results and deployment limits.
