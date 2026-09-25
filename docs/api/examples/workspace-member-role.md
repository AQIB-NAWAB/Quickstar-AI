# Member role change — HTTP examples

Through **gateway** (`http://127.0.0.1:3000`). Requires `workspace.member.update_role` (typically owner or admin).

## Update role — success

```http
PATCH /v1/workspaces/7b38592e-9c98-41ef-b23f-e755f527f74c/members/00000000-0000-0000-0000-000000000010 HTTP/1.1
Authorization: Bearer <owner-access-token>
Content-Type: application/json

{
  "role": "developer"
}
```

Response `200` (example):

```json
{
  "request_id": "f6a7b8c9-d0e1-2345-f012-456789012345",
  "member": {
    "userId": "00000000-0000-0000-0000-000000000010",
    "role": "developer",
    "roleUpdatedAt": "2026-09-25T12:00:00.000Z",
    "roleUpdatedBy": "00000000-0000-0000-0000-000000000001"
  }
}
```

## Update role — forbidden (analyst)

```http
PATCH /v1/workspaces/7b38592e-9c98-41ef-b23f-e755f527f74c/members/00000000-0000-0000-0000-000000000010 HTTP/1.1
Authorization: Bearer <analyst-access-token>
Content-Type: application/json

{
  "role": "admin"
}
```

Response `403`:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Forbidden: Role 'analyst' lacks permission 'workspace.member.update_role'",
    "request_id": "a7b8c9d0-e1f2-3456-0123-567890123456"
  }
}
```
