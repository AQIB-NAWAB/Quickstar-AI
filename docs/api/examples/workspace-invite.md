# Workspace invite — HTTP examples

Through **gateway** (`http://127.0.0.1:3000`). Caller must be a member with `workspace.member.invite` (e.g. owner or admin).

## Create invite — success

```http
POST /v1/workspaces/7b38592e-9c98-41ef-b23f-e755f527f74c/invites HTTP/1.1
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "email": "developer@example.com",
  "role": "developer"
}
```

Response `201` (fields may vary):

```json
{
  "request_id": "d4e5f6a7-b8c9-0123-def0-234567890123",
  "invite": {
    "id": "830adad8-827f-4595-a63e-b94e58dd5c6d",
    "email": "developer@example.com",
    "role": "developer"
  },
  "raw_token": "<one-time-invite-token>"
}
```

## Create invite — forbidden (wrong role)

An **analyst** may read the workspace but cannot invite.

Response `403`:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Forbidden: Role 'analyst' lacks permission 'workspace.member.invite'",
    "request_id": "e5f6a7b8-c9d0-1234-ef01-345678901234"
  }
}
```
