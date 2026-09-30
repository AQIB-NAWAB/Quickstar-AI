# Public HTTP API (via gateway)

External clients call the **API gateway** only (default local port **3000**). Identity and workspace ports are for local debugging.

| Doc | Contents |
| --- | -------- |
| [public-routes.md](./public-routes.md) | Route list, auth required, upstream |
| [examples/errors.md](./examples/errors.md) | 401, 403, 429 samples |
| [examples/workspace-invite.md](./examples/workspace-invite.md) | Create invite |
| [examples/workspace-member-role.md](./examples/workspace-member-role.md) | Update member role |
| [openapi.yaml](./openapi.yaml) | OpenAPI skeleton (Slot 06) |
| [memory.md](./memory.md) | End-user memory facts (Feature 14) |
| [tools.md](./tools.md) | Agent tools and tool_calls (Feature 15) |

Base URL (local): `http://127.0.0.1:3000`
