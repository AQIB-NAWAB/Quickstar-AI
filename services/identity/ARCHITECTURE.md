# Identity service layout

```text
src/
  index.ts              # Start HTTP server (pnpm start)
  migrate.ts            # Create DB tables (pnpm migrate) — not the API

  config/environment.ts

  controllers/          # HTTP handlers (parse body, call service)
    router.ts
    auth.controller.ts
    users.controller.ts
    organizations.controller.ts
    api-keys.controller.ts
    health.controller.ts

  middleware/           # Cross-cutting HTTP concerns
    auth.middleware.ts
    request-id.middleware.ts
    tracing.middleware.ts
    error.middleware.ts

  services/             # Business rules (same names as controllers)

  repository/           # Database access — see repository/README.md
    types.ts
    postgres.ts
    memory.ts
    migrate.ts

  utils/
  helpers/              # Test wiring only
  tests/
```

**Request path:** `middleware` (trace, request id) → `router` → `*.controller` → `*.service` → `repository/postgres`.
