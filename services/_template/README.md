# Service template

Copy this folder when adding a new QuickStart service (do not deploy `_template` itself).

## Layout

- `src/` — application code
- `openapi.yaml` — API contract stub
- `Dockerfile` — container build (expects monorepo root as build context)

## Local run

From the repository root:

```bash
pnpm install
pnpm --filter @quickstart/contracts build
pnpm --filter @quickstart/service-template build
PORT=3000 pnpm --filter @quickstart/service-template start
curl http://127.0.0.1:3000/healthz
```

## Routes

- `GET /healthz` — liveness JSON `{ "status": "ok", "service": "service-template" }`
- `GET /demo/error` — sample platform error envelope (400)
- `GET /demo/outbound` — traced outbound GET to `/healthz` via `fetchWithPolicy`

## Platform libraries

Uses `@quickstart/errors`, `logging`, `tracing`, `auth`, and `utilities`. Start the local OTel collector (`make up`) to export traces when running this service.
