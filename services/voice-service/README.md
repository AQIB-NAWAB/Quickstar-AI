# Voice Service (`@quickstart/service-voice`)

Feature **21–22 / 21B / 21C** — realtime voice edge on port **3008**.

Cascade (default): audio → STT → runtime turn → TTS. Opt-in S2S for emotional/compliance profiles (no tools/RAG). Multi-provider telephony (Twilio, Telnyx, SIP/BYOC via SBC bridge).

## Run

```bash
export JWT_ACCESS_SECRET="$(openssl rand -hex 32)"
export VOICE_INTERNAL_TOKEN="$(openssl rand -hex 32)"
pnpm --filter @quickstart/service-voice build
pnpm --filter @quickstart/service-voice migrate
pnpm --filter @quickstart/service-voice start
```

## Fake-media simulation

```http
POST /internal/v1/workspaces/:workspaceId/voice/simulate
Authorization: Bearer <VOICE_INTERNAL_TOKEN>
Content-Type: application/json

{
  "agent_id": "<uuid>",
  "conversation_id": "<uuid>",
  "utterance_audio_b64": "ZmFrZQ==",
  "direction": "inbound",
  "caller": "+15551212"
}
```

## Load / drain smoke

```bash
pnpm --filter @quickstart/service-voice voice-load-smoke
```

## Still unsafe at scale

In-memory session maps die on restart until Redis session TTL is complete; production SIP needs a real FreeSWITCH SBC; object-storage recordings are local stub until cloud credentials exist.
