# Secrets Service

Feature **16** — workspace secrets vault with AES-256-GCM envelope encryption. Port **3011**.

## Local setup

```bash
make secrets-migrate
export JWT_ACCESS_SECRET='local-dev-secret-at-least-32-characters-long'
export ENCRYPTION_KEY='0000000000000000000000000000000000000000000000000000000000000000'
export SECRETS_INTERNAL_TOKEN='local-dev-token-at-least-32-characters-long'
pnpm --filter @quickstart/service-secrets dev
```

## HTTP examples

```bash
WORKSPACE_ID='00000000-0000-4000-8000-0000000000a1'
TOKEN='<access_token>'

# Upsert a secret
curl -s -X POST "http://127.0.0.1:3000/v1/workspaces/$WORKSPACE_ID/secrets" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"STRIPE_API_KEY","value":"sk_test_1234567890abcdef"}'

# List secret names (values and ciphertexts are never returned)
curl -s "http://127.0.0.1:3000/v1/workspaces/$WORKSPACE_ID/secrets" \
  -H "Authorization: Bearer $TOKEN"

# Delete a secret
curl -s -X DELETE "http://127.0.0.1:3000/v1/workspaces/$WORKSPACE_ID/secrets/STRIPE_API_KEY" \
  -H "Authorization: Bearer $TOKEN"
```

Runtime reads secret values via internal endpoint `GET /internal/workspaces/:workspaceId/secrets/:name/value` using `x-internal-token` header.

See [docs/api/secrets.md](../../docs/api/secrets.md) and [docs/adr/0016-secrets.md](../../docs/adr/0016-secrets.md).
