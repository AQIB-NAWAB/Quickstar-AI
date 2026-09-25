# Gateway error examples

All errors use the platform envelope. Responses include header `x-request-id` (same value as `error.request_id`).

## 401 — Missing or invalid token

Request:

```http
GET /v1/me HTTP/1.1
Host: api.example.com
```

Response `401`:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required: missing or invalid Bearer token",
    "request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

## 403 — Forbidden (upstream / RBAC)

Gateway may return 401 for bad tokens. **403** usually comes from **workspace** when the user is authenticated but lacks permission (forwarded through gateway).

Request:

```http
PATCH /v1/workspaces/00000000-0000-0000-0000-000000000101/members/00000000-0000-0000-0000-000000000102 HTTP/1.1
Authorization: Bearer <analyst-token>
Content-Type: application/json

{"role": "admin"}
```

Response `403` (example body from workspace):

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Forbidden: Role 'analyst' lacks permission 'workspace.member.update_role'",
    "request_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901"
  }
}
```

## 429 — Rate limited (gateway)

Response `429`:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "request_id": "c3d4e5f6-a7b8-9012-cdef-123456789012"
  }
}
```

Headers may include `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` (standard rate-limit headers from gateway).
