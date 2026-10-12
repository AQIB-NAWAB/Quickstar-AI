# ADR 0022: Telephony providers (CPaaS + SIP trunk)

- **Status:** Accepted
- **Date:** 2026-10-12
- **Feature:** 21C — Telephony / BYOC

## Context

Voice-service needs PSTN/SIP ingress and egress. Customers and the platform must survive one CPaaS account being restricted or rate-limited. Enterprises also need **BYOC / SIP trunk** without rewriting the agent session core.

## Decision

### Adapter interface

All carriers implement **`TelephonyProvider`** inside `voice-service`:

- Verify inbound webhooks / SIP bridge auth
- Open media stream into the session orchestrator
- Outbound dial, status callbacks, hangup
- Transfer deferred to a later slice

Provider ids (opaque strings): `twilio`, `telnyx`, `sip`, `fake` (tests).

### Multi-provider at once

- Register **multiple** adapters concurrently.
- **TelephonyRouter** maps workspace/number → preferred provider.
- **Failover** when preferred is circuit-open, quota-limited, or unhealthy (Redis health store).
- Failover order is configured per workspace (e.g. `sip` → `twilio` → `telnyx`).

### CPaaS first (P5)

- **Twilio** and **Telnyx** are first-class CPaaS adapters.
- They terminate PSTN/SIP to the carrier and stream media (typically Media Streams WebSocket, μ-law 8 kHz) to voice-service.
- All CPaaS HTTP webhooks live on voice-service (not gateway `:3000`).

### SIP trunk / BYOC (P5b)

- SIP signaling and RTP terminate on a **separate SBC edge** (not inside Node `voice-service`).
- **Chosen SBC stack for v1:** FreeSWITCH as media gateway (SIP dialog + RTP), with an internal **media bridge** (WebSocket) into voice-service carrying PCM/μ-law frames + call metadata.
  - Alternative documented for later: Kamailio/OpenSIPS + rtpengine if we outgrow FreeSWITCH control plane.
- Provider id `sip`: outbound dial/hangup via SBC control API; inbound INVITE → bridge → same `CallSessionOrchestrator` as CPaaS.
- Trunk credentials and peer allow-lists use secrets/config (Feature 16 pattern), never git.

### What we reject

- Hard-coding a single vendor in the API gateway.
- Embedding a full SIP+RTP stack inside the Node voice process for production at 5,000+ concurrent calls.
- Blocking CPaaS ship on SBC readiness — CPaaS ships first; SIP is the next provider kind.

## Failure policy

| Condition | Behavior |
| --- | --- |
| Preferred provider unhealthy | Try next in workspace failover list |
| All providers unhealthy | Reject new dial / inbound with typed error |
| Duplicate status webhook | Idempotent no-op |

## Consequences

- Same Redis call caps apply regardless of provider.
- Number inventory UI and multi-region SBC anycast remain later work.
- Campaigns may dial via any healthy provider returned by the router.
