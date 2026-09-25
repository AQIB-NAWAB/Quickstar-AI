# Manual testing — API gateway

Run **four processes** (or three terminals + data plane):

1. `make up`
2. Identity: `make identity-migrate` then start on 3001
3. Workspace: `make workspace-migrate` then start on 3002
4. Gateway: start on 3000

Use the same `JWT_ACCESS_SECRET` everywhere.

## 1. Gateway health

```bash
curl -s http://127.0.0.1:3000/healthz | jq .
```

Expect `service: service-gateway`.

## 2. Register + login (public, no token)

```bash
curl -s -X POST http://127.0.0.1:3000/v1/register \
  -H 'content-type: application/json' \
  -d '{"email":"gw-test@example.com","password":"Str0ng!pass","organization_name":"Gw Co"}' | jq .
```

Save `access_token` from response (or login):

```bash
export TOKEN="<access_token>"
```

## 3. Protected route — 401 without token

```bash
curl -s -w "\nHTTP %{http_code}\n" http://127.0.0.1:3000/v1/me | jq .
```

Expect **401** and JSON `error.code` = `UNAUTHORIZED`.

## 4. Protected route — 200 with token

```bash
curl -s http://127.0.0.1:3000/v1/me \
  -H "authorization: Bearer $TOKEN" | jq .
```

## 5. Workspace via gateway

Create workspace (use `org_id` from JWT or register response):

```bash
export ORG_ID="<org_uuid>"
curl -s -X POST "http://127.0.0.1:3000/v1/orgs/$ORG_ID/workspaces" \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"name":"Gateway WS","slug":"gw-ws"}' | jq .
```

## 6. Request ID

```bash
curl -s -D - -o /dev/null http://127.0.0.1:3000/healthz | grep -i x-request-id
```

## 7. Rate limit (optional)

Lower limits for test:

```bash
export HTTP_RATE_LIMIT_MAX=5
export HTTP_RATE_LIMIT_WINDOW_MS=60000
# restart gateway, then run health or /v1/me in a loop until 429
```

Expect **429** and `RATE_LIMITED`.

## 8. Upstream down

Stop identity, call `GET /v1/me` with token — expect **503** or **504** from gateway, not hang.
