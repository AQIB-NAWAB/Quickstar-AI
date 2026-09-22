# Identity service layout

```text
src/
  index.ts              # Start HTTP server (pnpm start)
  migrate.ts            # Create DB tables (pnpm migrate) — not the API

  config/environment.ts

  controllers/          # HTTP: parse request, call service, send response
    router.ts           # Matches URL → right controller
    auth.controller.ts
    users.controller.ts
    organizations.controller.ts
    api-keys.controller.ts
    health.controller.ts
    require-auth.ts

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

**Request path:** `router` → `*.controller` → `*.service` → `repository/postgres`.
