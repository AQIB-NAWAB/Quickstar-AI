# Web fetch service (`@quickstart/service-web-fetch`)

Internal scrape, crawl, and search. Port **3007** locally. Olostep and plain HTTP are providers behind this service.

## Prerequisites

- `make up` (Postgres, Redis)
- `make web-fetch-migrate`

## Environment

| Variable | Default | Description |
| --- | --- | --- |
| `WEB_FETCH_INTERNAL_TOKEN` | (required) | Min 32 chars; `Authorization: Bearer` on `/internal/*` |
| `WEB_FETCH_PORT` / `PORT` | `3007` | Listen port |
| `DATABASE_URL` | `postgresql://quickstart:quickstart@127.0.0.1:5433/quickstart` | Job storage |
| `REDIS_URL` | `redis://127.0.0.1:6379` | In-flight cap + daily unit budget |
| `OLOSTEP_API_KEY` | — | Enables `olostep` provider profile |

Legacy names `WEB_ACQUISITION_*` still work for token and port.

## Run

```bash
export WEB_FETCH_INTERNAL_TOKEN="$(openssl rand -hex 32)"
pnpm --filter @quickstart/service-web-fetch build
pnpm --filter @quickstart/service-web-fetch start
curl -s http://127.0.0.1:3007/healthz
```

## Scrape (fake provider when no Olostep key)

```bash
curl -s http://127.0.0.1:3007/internal/scrape \
  -H "Authorization: Bearer $WEB_FETCH_INTERNAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "550e8400-e29b-41d4-a716-446655440000",
    "request_id": "demo-1",
    "url": "https://example.com/"
  }'
```

## Tests

```bash
pnpm --filter @quickstart/service-web-fetch test
```

See [ADR 0011](../../docs/adr/0011-web-fetch.md) and [error mapping](../../docs/api/web-fetch-errors.md).
