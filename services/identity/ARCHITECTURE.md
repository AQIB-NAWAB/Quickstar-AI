# Identity service layout

Simple, conventional folders — easy to navigate without extra layering jargon.

```text
src/
  index.ts                 # Start server (composition)

  config/
    environment.ts           # Env vars → ServiceConfig

  controllers/
    http.controller.ts       # HTTP routes (transport)

  services/
    auth.service.ts
    users.service.ts
    organizations.service.ts
    api-keys.service.ts
    index.ts                 # createIdentityServices()

  repository/
    identity-store.types.ts  # Repository contract + row types
    postgres.repository.ts
    memory.repository.ts     # Tests
    migration-runner.ts

  utils/
    password-hasher.ts
    session-revocation.ts
    http-request.ts
    http-response.ts
    auth.types.ts

  helpers/
    test-app.ts              # Test wiring

  tests/
    *.test.ts

  cli/
    migrate.ts               # pnpm migrate
```

**Flow:** `controllers` → `services` → `repository`.  
**Utils** = shared technical helpers. **Helpers** = test/dev setup only.
