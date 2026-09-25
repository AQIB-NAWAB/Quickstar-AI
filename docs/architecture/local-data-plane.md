# Local data plane

Development dependencies for QuickStart AI (Slot 02). Production mapping is in [ADR 0002](../adr/0002-data-plane.md).

## Quick start

```bash
cp .env.example .env   # optional, if you need custom ports
make up                # start and wait for healthchecks
make smoke             # read/write each store; exits non-zero on failure
make down              # stop containers
make logs              # follow logs
```

Requires **Docker Compose v2** (`docker compose`). Smoke test for SQS requires the **AWS CLI** (`aws`) on your PATH.

## Services and ports

| Service             | Container name   | Host port (default)                      | Env var(s)                    |
| ------------------- | ---------------- | ---------------------------------------- | ----------------------------- |
| PostgreSQL          | `postgres`       | 5433 (host; container still 5432)        | `DATABASE_URL`                |
| Valkey              | `valkey`         | 6379                                     | `REDIS_URL`                   |
| Kafka (KRaft)       | `kafka`          | 9092                                     | `KAFKA_BROKERS`               |
| OpenSearch          | `opensearch`     | 9200                                     | `OPENSEARCH_URL`              |
| OTel Collector      | `otel-collector` | 4317 (gRPC), 4318 (HTTP), 13133 (health) | `OTEL_EXPORTER_OTLP_ENDPOINT` |
| ElasticMQ (SQS API) | `elasticmq`      | 9324 (API), 9325 (UI)                    | `SQS_ENDPOINT`, `AWS_REGION`  |

Override ports in `.env` (see `.env.example`) if you have conflicts.

## Troubleshooting `make up`

**`otel-collector` or `elasticmq` unhealthy (fixed in compose):** Older healthchecks used `curl` inside images that do not ship it. Pull latest `docker-compose.yml` and recreate: `docker compose up -d --wait`.

**`Bind for 0.0.0.0:5432 failed`:** Another Postgres is already on 5432 (often another Docker project). Either stop that container, or in `.env`:

```bash
POSTGRES_PORT=5433
DATABASE_URL=postgresql://quickstart:quickstart@localhost:5433/quickstart
```

Then `make up` again. Identity and workspace use `DATABASE_URL` from your shell when you migrate and run services.

## Volumes

- `postgres_data`, `opensearch_data` — persist across restarts for faster re-up.
- For a clean slate: `docker compose down -v` (wipes local DB/search data).

## Schema (Identity and later services)

Compose only starts Postgres. **Tables are not created automatically.** After Slot 04, run Identity schema with [database migrations](./database-migrations.md) (`make identity-migrate`).

## What this is not

- Not a production topology (single broker, security disabled on OpenSearch locally).
- S3 is production object storage; optional MinIO may be added when Knowledge ingestion needs it.

## Production counterparts

| Local          | AWS (target)                           |
| -------------- | -------------------------------------- |
| PostgreSQL     | Aurora PostgreSQL + RDS Proxy          |
| Valkey         | ElastiCache                            |
| Kafka          | MSK                                    |
| OpenSearch     | OpenSearch Service                     |
| ElasticMQ      | SQS                                    |
| OTel Collector | Managed collector / CloudWatch / X-Ray |
