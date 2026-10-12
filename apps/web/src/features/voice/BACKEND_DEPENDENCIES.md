# Feature F5 — Backend Dependencies & API Capability Boundary

This document records the exact backend capabilities, data contracts, and architectural dependencies required before the Inbound Voice UI can connect to real production telephony workloads.

---

## 1. Call List, Detail & Live State APIs
- **Historical Inbound Logs:** Endpoint `GET /v1/workspaces/:id/voice/inbound` returning paginated call records (`caller`, `agentId`, `startedAt`, `endedAt`, `durationSeconds`, `status`, `timeToFirstAudioMs`).
- **Live Calls Active Stream / Feed:** Endpoint `GET /v1/workspaces/:id/voice/inbound/live` returning active in-flight calls with live duration counters, caller IDs, and active agents.
- **Call Detail Record (CDR):** Endpoint `GET /v1/workspaces/:id/voice/inbound/:callId` with full metadata, recording availability, transcript turns, and processing timing breakdowns.

---

## 2. Cursor-Based Pagination & Filtering
- **Cursor Tokens:** Opaque `next_cursor` and `prev_cursor` tokens for traversing high-volume call records without offset degradation.
- **Filter Semantics:** Filter queries for caller number/ID search (`q`), lifecycle status (`status=live|completed|failed|transferred`), assigned agent (`agentId`), and UTC date intervals (`from`, `to`).

---

## 3. Caller Identity & Anonymity
- **Caller ID Ingestion:** Preservation of raw caller identity as provided by upstream carrier SIP INVITE headers (E.164 phone number, SIP URI, or anonymized string).
- **Privacy & Redaction:** Contract for handling private / withheld numbers (`anonymous`, `restricted`) without synthetic number generation.

---

## 4. Call Lifecycle & Terminal States
- **State Machine Definition:** Clear state transition model:
  - `ringing` &rarr; `live` &rarr; `completed` | `failed` | `transferred`
- **Transferred Semantics:** Explicit classification of whether `transferred` represents a terminal call-leg disposition or a continuous forwarded session.
- **Failure Classification:** Structured error reason codes for failed calls (carrier gateway timeout, no speech detected, user hung up before greeting, agent runtime crash).

---

## 5. Time-to-First-Audio Measurement
- **Authoritative Metric:** Server-side millisecond timestamp recording the interval between SIP connection answer and the exact moment the first audio packet of the agent's greeting is dispatched to the carrier.
- **Distinction from LLM Latency:** Explicitly decoupled from model inference times or total pipeline turn durations.

---

## 6. Recording Storage, Authorization & Media Metadata
- **Object Storage & CDN:** Persistent storage of recorded stereo or dual-channel audio in S3/GCS.
- **Signed Short-Lived Playback URLs:** Secure, time-limited presigned URLs with refresh tokens for authorized workspace users.
- **Waveform Data:** Pre-computed normalized audio peak arrays to render accurate waveform visualizations without downloading entire audio binaries on the client.

---

## 7. Transcript Synchronization & Media Offsets
- **Millisecond Offsets:** Each transcript segment must include explicit audio offsets (`startMs`, `endMs`) mapped to recording elapsed time rather than arbitrary wall-clock timestamps.
- **Speaker Attribution:** Authoritative speaker classification (`user` vs `agent`) tied to telephony channel index (Channel 0 / Channel 1).
- **Live Finalization States:** Distinguishing partial interim speech recognitions from finalized phrases.

---

## 8. Turn Timing Stage Breakdown
- **Granular Latency Instrumentation:** Real-time logging of individual processing pipeline stages per turn:
  - **STT (Speech-to-Text):** Utterance silence detection to transcript arrival.
  - **LLM (Language Model):** Prompt dispatch to first response token (TTFT) and full turn generation.
  - **TTS (Text-to-Speech):** Text submission to first audio chunk synthesis.
- **Additive vs. Concurrent Semantics:** Clarify whether streaming stages overlap or execute sequentially.

---

## 9. Real-Time Telephony Updates
- **Transport Mechanism:** Server-Sent Events (SSE) or WebSocket channel on the voice service for live call duration ticks, speech recognition updates, and agent response streaming.
- **Drain & Disconnect Protocol:** Clean terminal events sent when calls hang up.

---

## 10. Voice RBAC & Authorization
- **Granular Voice Permissions:**
  - `voice.calls:read`: View call logs and live dashboard.
  - `voice.transcripts:read`: Access conversational transcripts.
  - `voice.recordings:listen`: Authorize signed audio recording playback.
