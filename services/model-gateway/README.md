# Model gateway (`@quickstart/service-model-gateway`)

Internal LLM edge: chat complete/stream, optional Jev decisions. Port **3005** locally.

## Run

```bash
make up   # Redis
export MODEL_GATEWAY_INTERNAL_TOKEN='local-dev-token-at-least-32-characters-long'
pnpm --filter @quickstart/contracts build
pnpm --filter @quickstart/service-model-gateway build
pnpm --filter @quickstart/service-model-gateway start
curl -s http://127.0.0.1:3005/healthz
```

## Complete (fake profile)

```bash
curl -s http://127.0.0.1:3005/internal/complete \
  -H "Authorization: Bearer $MODEL_GATEWAY_INTERNAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "00000000-0000-0000-0000-000000000001",
    "request_id": "demo-1",
    "model": { "profile": "fake", "model_id": "fake" },
    "messages": [{ "role": "user", "content": "hello" }]
  }'
```

## Stream

```bash
curl -N http://127.0.0.1:3005/internal/stream \
  -H "Authorization: Bearer $MODEL_GATEWAY_INTERNAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "00000000-0000-0000-0000-000000000001",
    "request_id": "demo-2",
    "model": { "profile": "fake", "model_id": "fake" },
    "messages": [{ "role": "user", "content": "hello" }]
  }'
```

## Provider env

Optional platform keys (profiles auto-registered when set):

- `OPENAI_API_KEY`, `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`
- Or `PROVIDER_PROFILES_JSON` for custom profiles (see ADR 0010).

Jev decisions require `OPENROUTER_API_KEY` (`POST /internal/decide`).

## Tests

```bash
pnpm --filter @quickstart/service-model-gateway test
```

Uses the fake provider only; no vendor keys required.
