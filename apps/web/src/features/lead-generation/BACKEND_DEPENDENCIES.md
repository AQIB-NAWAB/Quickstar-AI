# Lead generation — backend dependencies

**Status:** staff UI wired to gateway `/v1/workspaces/:workspaceId/lead-generation/*`.

## Required APIs

| Method | Path | UI use |
|--------|------|--------|
| GET | `.../lead-generation/profile` | Profile page |
| PUT | `.../lead-generation/profile` | Save business profile (`expected_version`, `business`) |
| GET | `.../lead-generation/policy` | Guardrails on new-run form |
| GET | `.../lead-generation/runs` | Runs list |
| POST | `.../lead-generation/runs` | Create run (`Idempotency-Key` header) |
| GET | `.../lead-generation/runs/:id` | Run detail |
| GET | `.../lead-generation/runs/:id/results` | Candidate results |
| GET | `.../lead-generation/runs/:id/deliveries` | Campaign delivery tasks |
| POST | `.../lead-generation/runs/:id/cancel` | Cancel remaining research |

Permissions: `workspace.leads.read` / `workspace.leads.write`.

Service default port: **3019** (not 3012 — workflow owns 3012).
