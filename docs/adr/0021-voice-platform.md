# ADR 0021: Voice platform

- **Status:** Accepted
- **Date:** 2026-10-12
- **Feature:** 21 / 21B / 22 — Voice path, speech, reliability

## Context

Chat turns run through `runtime-service`. Product needs inbound/outbound AI voice at design scale (**5,000 concurrent inbound + 5,000 concurrent outbound**). Audio is long-lived; HTTP on the API gateway must not hold media sockets. We must not fork a second agent engine for phone.

## Decision

### Service boundary

- New **`services/voice-service`** on port **3008**.
- Owns call sessions, STT/TTS/S2S adapters, turn detection, recording upload stubs, telephony adapters, Redis concurrency caps.
- Calls **`runtime-service`** for text turns (`channel: voice`, stricter `deadline_ms`). Does **not** run the agent loop itself.
- Media never traverses **gateway `:3000`**.

### Voice modes

| Mode | Path | Default? | Tools / RAG |
| --- | --- | --- | --- |
| **cascade** | STT → runtime → TTS | Yes | Allowed (same Feature 15 loop) |
| **s2s** | Speech-to-speech pipeline + **sidecar STT** for transcript | Opt-in only (emotional / compliance low-latency profiles) | **Forbidden** in v1 |

Staff pick `voice_mode` on the published agent version (`AgentVoiceSettings`). Default publish remains cascade. Reject publish/start when `s2s` is combined with tools or RAG.

### Compliance

Every call has a Postgres `calls` row, conversation messages, and transcript segments. Cascade uses STT/TTS text. S2S uses sidecar STT (or provider transcript) so compliance does not depend on the S2S vendor alone.

### Call state

- Survives restart: Postgres `calls` + Redis caps/TTL.
- May die on deploy: media socket (reconnect by `call_id` when possible).
- States: `ringing` → `live` → `completed` \| `failed` \| `transferred`.

### Reliability (Feature 22)

- Global Redis caps: 5,000 inbound / 5,000 outbound.
- Per-workspace inbound/outbound caps.
- **Atomic leases:** acquire checks global + workspace limits in one Lua EVAL, then INCR both and SET `voice:cap:lease:{leaseId}`. Release is **idempotent** — DECR only if the lease key still exists (ownership token). Memory caps mirror the same lease API for tests.
- Redis down → **refuse new calls** (fail closed). In-flight calls are not forcibly torn down by the cap store.
- Barge-in cancels in-flight TTS without duplicate assistant messages.
- Turn detection: pluggable VAD / end-of-turn (eager EOT policy).
- Proof: `scripts/check-voice-reliability-proof.mjs` + `services/voice-service/src/tests/voice-reliability.test.ts`.

### Contracts

Shared types live in `@quickstart/contracts` (`voice.ts`): `VoiceMode`, `CallState`, `VoiceTurnRequestBody`, `AgentVoiceSettings`, telephony provider ids.

## Failure policy

| Condition | Behavior |
| --- | --- |
| Runtime misses voice deadline | Spoken fallback phrase; call/turn records failure |
| STT/TTS timeout | One retry only if no billable audio committed; else fail turn |
| Cap exceeded | Reject before opening media |
| Redis unavailable | Reject **new** calls |

### 21B Speech profiles

- STT/TTS adapters live **only** in `services/voice-service` (`speech/` module). Runtime and gateway never import vendor SDKs.
- **Profiles:** `SPEECH_PROFILE=fake` (default, local + Feature 21 simulate) or `openai` (Whisper STT + OpenAI TTS).
- **Keys:** `SPEECH_OPENAI_API_KEY` or `OPENAI_API_KEY`. Never log Authorization or key material.
- **Fail-closed:** `VOICE_REQUIRE_REAL_SPEECH=1` refuses process start when profile is `fake` or the OpenAI key is missing (production honesty).
- **Retry:** one retry only when no billable STT/TTS output was committed; then fail the turn.
- **Circuit breaker:** per speech profile id (same idea as model-gateway).
- **Usage stubs:** structured `speech.usage` facts (`stt` / `tts` units) for Feature 26 — not a ledger on the call path.
- Second vendors (Deepgram, ElevenLabs, Cartesia) and streaming WebSockets are deferred.

## Consequences

- Telephony CPaaS and SIP trunk are ADR **0022**.
- Campaigns (Feature 23) start only after caps + at least one telephony path work.
- Still unsafe until Feature V1 drain proof and production object-storage recording.
