# ADR 0002: Local and production data plane

- **Status:** Accepted
- **Date:** 2026-09-22
- **Slot:** 02 — Local data plane

## Context

QuickStart AI uses multiple storage and messaging technologies (see `project_details.md` §35). Every service must share the same connection conventions locally and in AWS. Slot 02 adds Docker Compose stand-ins with health checks and a smoke test—no product schemas yet.

## Decision

| Store              | Local (Compose)     | Production target                       | Purpose                                                                              |
| ------------------ | ------------------- | --------------------------------------- | ------------------------------------------------------------------------------------ |
| Transactional      | PostgreSQL 16       | Aurora PostgreSQL                       | Users, orgs, agents, conversations, billing, permissions—**system of record**        |
| Cache / ephemeral  | Valkey 8            | ElastiCache (Redis/Valkey)              | Cache, sessions, rate limits, idempotency keys, locks—**never sole source of truth** |
| Events             | Kafka (KRaft)       | MSK                                     | Business events, multiple consumers, replay within retention                         |
| Jobs               | ElasticMQ (SQS API) | SQS (+ DLQ)                             | Background work, retries, poison-message isolation                                   |
| Search / RAG index | OpenSearch 2        | OpenSearch Service                      | Hybrid/vector retrieval—**derived index**, rebuildable from sources                  |
| Telemetry          | OTel Collector      | Collector → CloudWatch / X-Ray / vendor | Traces, metrics, logs with shared correlation fields                                 |

Daily development uses **Docker Compose** (§52). AWS-managed services validate HA, IAM, and ops in later slots (e.g. Slot 29).

Standard env vars (see `.env.example`): `DATABASE_URL`, `REDIS_URL`, `KAFKA_BROKERS`, `OPENSEARCH_URL`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `SQS_ENDPOINT`.

## Consequences

- One `make up` / `make smoke` validates connectivity before Identity or Knowledge land.
- Services must not invent per-service database hosts.
- OpenSearch and Kafka are RAM-heavy locally; laptops may need Docker memory limits adjusted.
- Local credentials are dev-only; production uses Secrets Manager, private networking, and encryption.

## Alternatives considered

| Alternative                            | Why not for this project                                                      |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| MongoDB as primary transactional store | Weak fit for RBAC, billing, and cross-entity constraints across many services |
| Redis as conversation database         | Data loss on eviction/failure; wrong consistency model                        |
| Kafka for every background job         | Operational overhead; SQS fits job+DLQ patterns                               |
| AWS-only local dev                     | Slow feedback, cost, and violates §52 local-first workflow                    |
| LocalStack for all AWS                 | Heavier than ElasticMQ for SQS-only need in Slot 02                           |

## Failure and security notes (summary)

- **Postgres down:** services fail writes; no silent fallback to cache for authoritative data.
- **Redis down:** degrade caching/limits where designed; do not store authoritative state only in Redis.
- **Kafka lag / down:** events buffer or fail publish path; consumers must be idempotent.
- **OpenSearch down:** retrieval/RAG degrades; transactional data remains in Postgres/S3.
- **Secrets:** never commit `.env`; use `.env.example` as template only.

## References

- `docs/project_details.md` — §9, §35, §51–52
- `docs/architecture/local-data-plane.md`
- `docs/roadmap.md` — Slot 02
