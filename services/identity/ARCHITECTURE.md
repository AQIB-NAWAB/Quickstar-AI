# Identity service layout

Layered folders under `src/` — same pattern we will reuse for Workspace, Agent, etc.

```text
src/
  index.ts                 # Process entry: wiring, listen, shutdown
  cli/
    migrate.ts             # One-off schema migrate (not on HTTP start)
  config/
    env.ts                 # Environment → typed config
  http/
    server.ts              # HTTP server + routes
    request.ts             # Request id, JSON body helpers
  application/
    identity.service.ts    # Use cases: register, login, tokens, API keys
  security/
    crypto.ts              # Password hashing, token/key hashing
    session-revocation.ts  # Redis (or noop) session revoke
  persistence/
    identity-store.types.ts    # Store port (interface + records)
    postgres/
      migrate.ts           # SQL migration runner
      identity-store.ts    # Postgres adapter
    memory/
      identity-store.ts    # In-memory adapter (unit tests)
  testing/
    fixtures.ts            # Test config + in-memory stack
```

**Dependency direction:** `http` → `application` → `persistence` / `security`.  
`application` does not import `http` or `pg`.

**Naming:** `*.service.ts` = application logic; `identity-store.ts` = storage adapter; `env.ts` = configuration.
