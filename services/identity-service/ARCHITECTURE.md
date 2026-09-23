# Identity service layout

**Monorepo path:** `services/identity-service` (deployable). **pnpm package:** `@quickstart/service-identity`.

Inside this repo, `src/services/` is the **application business layer** (not the monorepo `services/` folder). When docs say “identity service,” they mean this directory.

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

  middleware/           # Identity-only HTTP (Bearer guard)
    auth.middleware.ts
    # request id, tracing, timeout, rate limit, errors → @quickstart/http-server

  services/             # Business rules (same names as controllers)

  repository/           # Database access — see repository/README.md
    types.ts
    entities/
    typeorm/
    memory.ts
    migrate.ts

  utils/
  helpers/              # Test wiring only
  tests/
```

**HTTP stack:** Express via `@quickstart/http-server` (request id → trace → timeout → JSON body → rate limit → routes → errors). See [HTTP layers](../../docs/architecture/http-layers.md) for gateway vs service middleware.

**Request path:** platform middleware → Express routes → `*.controller` → `*.service` → `repository/postgres`.
