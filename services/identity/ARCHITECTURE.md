# Identity service — project structure

This layout follows common **Node.js + TypeScript microservice** practice (feature **modules**, **repository** data access, **transport** HTTP adapters). It aligns with:

- Feature-based modules (`auth`, `users`, `organizations`, `api-keys`) rather than a flat list of files at `src/` root — see [Node.js backend architecture (domain-first modules)](https://cimpleo.com/blog/nodejs-backend-architecture/).
- **Controller/service/repository** responsibilities: HTTP in `transport/`, business rules in `modules/*/…service.ts`, Postgres in `repositories/postgres/` — see [production-grade Node structure (modules per domain)](https://rajesh-biswas.medium.com/a-production-grade-node-js-typescript-project-structure-from-real-world-experience-427101b46f8f).
- **Ports and adapters**: repository interface in `domain/ports/`, implementations in `repositories/` and `infrastructure/` — see [Clean Architecture in Node (2026)](https://www.hirenodejs.com/blog/nodejs-clean-architecture-2026) and [hexagonal auth service example](https://github.com/sensitiky/nest-microservices-boilerplate) (`application/use-cases`, `infrastructure/persistence`).

## Folder map

```text
src/
  index.ts                          # Composition root (wire config, DB, modules, HTTP)

  config/
    environment.ts                  # Typed env (ServiceConfig)

  cli/
    migrate.ts                      # Database migrate command entry

  domain/
    ports/
      identity-store.repository.ts  # Repository port (interface + record types)
    types/
      auth.types.ts                 # TokenPair, AuthenticatedUser

  modules/                          # Business capabilities (one folder per REST area)
    auth/
      auth.service.ts               # Register, login, refresh, logout, validate JWT
    users/
      users.service.ts              # Profile (/v1/me)
    organizations/
      organizations.service.ts      # Org membership reads
    api-keys/
      api-keys.service.ts           # Org API keys
    index.ts                        # createIdentityModules()

  repositories/                     # Persistence adapters
    postgres/
      postgres-identity.repository.ts
    in-memory/
      in-memory-identity.repository.ts   # Unit tests

  infrastructure/                   # Technical details (not business rules)
    database/
      migration-runner.ts
    crypto/
      password-hasher.ts
    redis/
      session-revocation.adapter.ts

  transport/                        # Inbound adapters (HTTP today; gRPC later)
    http/
      create-http-server.ts         # Node HTTP server + routing
      http-request.ts
      http-response.ts

  tests/
    helpers/
      test-app.ts                   # In-memory module wiring for tests
```

## Dependency rule

```text
transport/http  →  modules/*  →  domain/ports
                      ↓
              repositories/* , infrastructure/*
```

Modules depend on the **repository port**, not on `pg` or Redis directly.

## Naming conventions

| Suffix / folder         | Meaning                           |
| ----------------------- | --------------------------------- |
| `*.service.ts`          | Business logic for one capability |
| `*.repository.ts`       | Database (or in-memory) adapter   |
| `*.adapter.ts`          | External system (Redis, etc.)     |
| `create-http-server.ts` | Builds the HTTP transport         |
| `environment.ts`        | Configuration from env vars       |

Future: add `transport/http/controllers/` if routes grow; split `auth.service.ts` into `application/use-cases/` per operation (Login, Register) as in Nest/hexagonal templates.
