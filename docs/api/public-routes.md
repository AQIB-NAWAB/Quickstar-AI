# Public route map (gateway)

All paths below are on the **gateway** base URL (local: `http://127.0.0.1:3000`).

| Method | Path | Auth | Upstream service |
| ------ | ---- | ---- | ---------------- |
| GET | `/healthz` | No | Gateway (local) |
| GET | `/health` | No | Gateway (local) |
| POST | `/v1/register` | No | Identity |
| POST | `/v1/login` | No | Identity |
| POST | `/v1/refresh` | No | Identity |
| POST | `/v1/logout` | No | Identity |
| GET | `/v1/me` | Bearer | Identity |
| GET | `/v1/organizations` | Bearer | Identity |
| GET | `/v1/organizations/{orgId}` | Bearer | Identity |
| POST | `/v1/organizations/{orgId}/api-keys` | Bearer | Identity |
| GET | `/v1/organizations/{orgId}/api-keys` | Bearer | Identity |
| DELETE | `/v1/organizations/{orgId}/api-keys/{keyId}` | Bearer | Identity |
| POST | `/v1/orgs/{orgId}/workspaces` | Bearer | Workspace |
| GET | `/v1/orgs/{orgId}/workspaces` | Bearer | Workspace |
| GET | `/v1/workspaces/{workspaceId}` | Bearer | Workspace |
| PATCH | `/v1/workspaces/{workspaceId}` | Bearer | Workspace |
| DELETE | `/v1/workspaces/{workspaceId}` | Bearer | Workspace |
| GET | `/v1/workspaces/{workspaceId}/members` | Bearer | Workspace |
| GET | `/v1/workspaces/{workspaceId}/members/{userId}` | Bearer | Workspace |
| PATCH | `/v1/workspaces/{workspaceId}/members/{userId}` | Bearer | Workspace |
| DELETE | `/v1/workspaces/{workspaceId}/members/{userId}` | Bearer | Workspace |
| GET | `/v1/workspaces/{workspaceId}/invites` | Bearer | Workspace |
| POST | `/v1/workspaces/{workspaceId}/invites` | Bearer | Workspace |
| DELETE | `/v1/workspaces/{workspaceId}/invites/{inviteId}` | Bearer | Workspace |
| POST | `/v1/workspaces/{workspaceId}/agents` | Bearer | Agent |
| GET | `/v1/workspaces/{workspaceId}/agents` | Bearer | Agent |
| GET | `/v1/workspaces/{workspaceId}/agents/{agentId}` | Bearer | Agent |
| PATCH | `/v1/workspaces/{workspaceId}/agents/{agentId}` | Bearer | Agent |
| DELETE | `/v1/workspaces/{workspaceId}/agents/{agentId}` | Bearer | Agent |
| POST | `/v1/workspaces/{workspaceId}/agents/{agentId}/publish` | Bearer | Workspace (RBAC stub) |
| POST | `/v1/workspaces/{workspaceId}/conversations` | Bearer | Conversation |
| GET | `/v1/workspaces/{workspaceId}/conversations` | Bearer | Conversation |
| GET | `/v1/workspaces/{workspaceId}/conversations/{conversationId}` | Bearer | Conversation |
| POST | `/v1/workspaces/{workspaceId}/conversations/{conversationId}/messages` | Bearer | Conversation |
| GET | `/v1/workspaces/{workspaceId}/conversations/{conversationId}/messages` | Bearer | Conversation |

**Internal-only (dev):** `http://127.0.0.1:3001` (identity), `http://127.0.0.1:3002` (workspace), `http://127.0.0.1:3003` (agent), `http://127.0.0.1:3004` (conversation). Do not document these as the public API.
