#!/usr/bin/env bash
# Slot 02 smoke test — one read/write (or produce/consume) per local store.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! docker compose ps --status running --quiet 2>/dev/null | grep -q .; then
  echo "error: data plane is not running. Run: make up" >&2
  exit 1
fi

echo "==> Postgres"
docker compose exec -T postgres psql -U quickstart -d quickstart -v ON_ERROR_STOP=1 <<'SQL'
SELECT 1 AS read_ok;
CREATE TEMP TABLE smoke_slot02 (payload text NOT NULL);
INSERT INTO smoke_slot02 (payload) VALUES ('slot-02-smoke');
SELECT payload FROM smoke_slot02;
SQL

echo "==> Valkey (Redis protocol)"
docker compose exec -T valkey valkey-cli SET quickstart:smoke:slot02 ok EX 60 >/dev/null
test "$(docker compose exec -T valkey valkey-cli GET quickstart:smoke:slot02 | tr -d '\r\n')" = "ok"

echo "==> Kafka (KRaft)"
TOPIC="quickstart.smoke.slot02"
docker compose exec -T kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 \
  --create --if-not-exists --topic "$TOPIC" --partitions 1 --replication-factor 1 >/dev/null
printf '%s' "slot-02-smoke" | docker compose exec -T kafka /opt/kafka/bin/kafka-console-producer.sh \
  --bootstrap-server localhost:9092 --topic "$TOPIC" >/dev/null
OUT="$(docker compose exec -T kafka /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 --topic "$TOPIC" --from-beginning --max-messages 1 --timeout-ms 10000 2>/dev/null | head -1 | tr -d '\r\n')"
test "$OUT" = "slot-02-smoke"

echo "==> OpenSearch"
curl -sf -X PUT "http://localhost:${OPENSEARCH_PORT:-9200}/quickstart-smoke-slot02/_doc/1" \
  -H 'content-type: application/json' \
  -d '{"message":"slot-02-smoke","slot":2}' >/dev/null
MSG="$(curl -sf "http://localhost:${OPENSEARCH_PORT:-9200}/quickstart-smoke-slot02/_doc/1" | grep -o '"message":"slot-02-smoke"')"
test -n "$MSG"

echo "==> OpenTelemetry Collector"
curl -sf "http://localhost:${OTEL_HEALTH_PORT:-13133}/health" | grep -q '"status"'

echo "==> SQS (ElasticMQ)"
QUEUE_NAME="quickstart-smoke-slot02"
ENDPOINT="http://localhost:${SQS_PORT:-9324}"
QUEUE_URL="$(
  aws --endpoint-url "$ENDPOINT" sqs create-queue --queue-name "$QUEUE_NAME" --output text --query QueueUrl
)"
aws --endpoint-url "$ENDPOINT" sqs send-message --queue-url "$QUEUE_URL" --message-body "slot-02-smoke" >/dev/null
BODY="$(
  aws --endpoint-url "$ENDPOINT" sqs receive-message --queue-url "$QUEUE_URL" --max-number-of-messages 1 \
    --output text --query 'Messages[0].Body'
)"
test "$BODY" = "slot-02-smoke"

echo ""
echo "All data plane smoke checks passed."
