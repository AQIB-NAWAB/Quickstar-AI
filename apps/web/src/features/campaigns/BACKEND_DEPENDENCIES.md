# Feature F6 — Backend Dependencies & API Capability Boundary

This document records the exact backend capabilities, data contracts, and architectural dependencies required before the Outbound Voice & Campaign Management UI can execute real calling workloads in production.

---

## 1. Campaign Definition CRUD & Versioning
- **Draft Creation & Updates:** Schema for storing campaign name, description, assigned voice agent ID, and execution configuration.
- **Optimistic Concurrency / Versioning:** `version` (or `etag`) field on campaign records to prevent overwrite conflicts during concurrent edits, status transitions, or automated state changes.
- **State Integrity:** Enforce that core campaign parameters (such as audience source and target agent) cannot be modified after launch without transitioning through a draft/clone workflow.

---

## 2. Audience Upload, Validation & Persistence
- **CSV Ingestion Pipeline:** Secure asynchronous processing of contact lists beyond the client 5MB/10,000-row preview limit.
- **Object Storage Persistence:** Direct signed upload URLs (S3/GCS/R2) for audience files instead of passing raw row payloads over HTTP BFF routes.
- **Server-Side Validation:** Authoritative normalization and validation for international E.164 phone numbers, duplicate detection within the campaign audience, and malformed records.

---

## 3. Saved Lead-List Selection
- **Workspace Lead Integration:** Contract to select pre-filtered lists from the Leads feature (Feature F7) directly as campaign audiences.
- **Snapshot Semantics:** Clarify whether a saved lead list is snapshotted at campaign launch or dynamically refreshed during execution.

---

## 4. Schedule & Timezone Semantics
- **IANA Timezone Engine:** Server-side evaluation of localized daily calling windows (e.g., `09:00` to `17:00` local recipient time vs. workspace UTC schedule).
- **Daylight Saving Transitions:** Explicit handling of ambiguous or nonexistent local wall-clock times.
- **Overnight Calling Windows:** Define whether windows crossing midnight (e.g., `22:00`–`04:00`) are rejected or queued per local regulations.

---

## 5. Workspace Concurrency & Pacing Limits
- **Active Call Semaphore:** Distributed concurrency throttling to guarantee no more than `maxConcurrentCalls` simultaneous channels across all worker nodes.
- **Rate-Limiting Token Bucket:** Pacing engine enforcing `maxCallStartsPerMinute` to prevent telephony gateway flooding and spam trigger flags.
- **Workspace-Level Caps:** Enforce hard platform and account tier concurrency limits that override campaign-level requests.

---

## 6. Retry Eligibility & Scheduling
- **Retry Scheduler Workers:** Background queue (e.g. BullMQ, Temporal, or SQS) scheduling delayed retries according to `retryIntervalMinutes`.
- **Outcome Classification:** Granular telephony outcome classification:
  - Retryable: `no_answer`, `busy`, `transient_provider_failure`.
  - Non-retryable: `answered`, `invalid_number`, `opted_out`, `suppressed`.
- **Max Attempts Cap:** Enforce `maxAttempts = 1 + maxRetries` across distributed execution workers.

---

## 7. State Transitions (Launch, Pause, Resume, Stop)
- **Lifecycle State Machine:**
  - `draft` &rarr; `scheduled` | `running`
  - `running` &harr; `paused`
  - `running` | `paused` &rarr; `completed` | `stopped` | `failed`
- **In-Flight Call Semantics:**
  - Clarify whether `pause` allows active in-flight calls to complete naturally while holding queued calls.
  - Clarify whether `stop` terminates active calls immediately or gracefully ceases scheduling new attempts.

---

## 8. Idempotent Mutation Requests
- **Idempotency Keys:** Mandatory `Idempotency-Key` headers on `/launch`, `/pause`, `/resume`, and `/stop` mutations to prevent accidental double-dialing or duplicate submissions from network retransmissions.

---

## 9. Campaign Metrics & Definitions
- **Authoritative Aggregates:** Database-computed metrics matching UI cards:
  - `eligibleContacts`: Distinct valid target recipients.
  - `completedContacts`: Unique contacts that reached a terminal outcome.
  - `answeredContacts`: Unique completed contacts that answered.
  - `answerRate`: Explicit formula (`answeredContacts / completedContacts * 100`).
  - `avgAnsweredDurationSeconds`: Mean duration across answered attempts only.
- **Call Activity Buckets:** Grouped counts of attempt starts by hour in UTC (`{ hourLabel: "14:00", attempts: 216 }`).

---

## 10. Cursor-Paginated Contacts & Attempts
- **Pagination Contracts:** Opaque cursor tokens (`next_cursor`) for scrolling through thousands of campaign contacts and dialed attempts without SQL offset penalties.
- **Filter Capabilities:** Filtering contacts by status (`pending`, `calling`, `answered`, `no_answer`, `retrying`, `opted_out`, `failed`).

---

## 11. Outbound Call & Telephony Integration
- **Carrier Gateway:** Webhook integration with telephony providers (Twilio, Retell, LiveKit, Daily, Telnyx).
- **Outbound Call Association:** Mapping each dialed attempt to a distinct `callId` with recording URLs, speaker-labelled transcripts, and latency logs.
- **Recording Authorization:** Signed, time-limited playback URLs for authorized workspace users.

---

## 12. Opt-Out & Suppression Enforcement
- **Workspace Do-Not-Call (DNC) Registry:** Authoritative suppression list checked before every dial attempt.
- **Automated Opt-Out:** In-call phrase detection (e.g. "remove me from your list") automatically tagging contact as `opted_out` and preventing future retries.

---

## 13. Campaign Authorization & Permissions
- **RBAC Policy:** Defined permissions within the workspace contract:
  - `campaigns:read`
  - `campaigns:create`
  - `campaigns:launch`
  - `campaigns:manage` (pause, resume, stop)
