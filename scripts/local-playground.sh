#!/usr/bin/env bash
# Interactive local walkthrough — data plane + template service.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PORT="${PORT:-3000}"
BASE="http://127.0.0.1:${PORT}"

bold() { printf '\n\033[1m%s\033[0m\n' "$1"; }

bold "1) Data plane (Docker Compose)"
if ! docker compose ps --status running --quiet 2>/dev/null | grep -q .; then
  echo "Starting compose (first run pulls images)..."
  docker compose up -d --wait
else
  docker compose ps
fi

bold "2) Postgres quick check"
docker compose exec -T postgres psql -U quickstart -d quickstart -c "SELECT 'postgres_ok' AS status, version();" | head -5

bold "3) Valkey quick check"
docker compose exec -T valkey valkey-cli SET playground:hello "from-valkey" EX 120 >/dev/null
echo "GET playground:hello => $(docker compose exec -T valkey valkey-cli GET playground:hello | tr -d '\r\n')"

bold "4) OpenSearch cluster health"
curl -sf "http://127.0.0.1:9200/_cluster/health?pretty" | head -8

bold "5) OTel collector health"
curl -sf "http://127.0.0.1:13133/health" | head -c 200
echo ""

bold "6) Build template service"
pnpm --filter @quickstart/service-template build >/dev/null

bold "7) Start template (background) on port ${PORT}"
if curl -sf "${BASE}/healthz" >/dev/null 2>&1; then
  echo "Already running at ${BASE}"
else
  OTEL_EXPORTER_OTLP_ENDPOINT="${OTEL_EXPORTER_OTLP_ENDPOINT:-http://127.0.0.1:4318}" \
    PORT="${PORT}" \
    pnpm --filter @quickstart/service-template start &
  PID=$!
  for _ in $(seq 1 30); do
    if curl -sf "${BASE}/healthz" >/dev/null 2>&1; then
      echo "Started (pid ${PID})"
      break
    fi
    sleep 0.2
  done
  if ! curl -sf "${BASE}/healthz" >/dev/null 2>&1; then
    echo "Failed to start template service" >&2
    exit 1
  fi
fi

bold "8) HTTP — health"
curl -sf "${BASE}/healthz" | jq . 2>/dev/null || curl -sf "${BASE}/healthz"
echo ""

bold "9) HTTP — platform error envelope (/demo/error) [expect HTTP 400]"
HTTP_CODE=$(curl -s -o /tmp/qs-demo-error.json -w "%{http_code}" "${BASE}/demo/error")
cat /tmp/qs-demo-error.json | jq . 2>/dev/null || cat /tmp/qs-demo-error.json
echo "HTTP ${HTTP_CODE}"
echo ""

bold "10) HTTP — outbound call with retry policy (/demo/outbound)"
curl -sf "${BASE}/demo/outbound" | jq . 2>/dev/null || curl -sf "${BASE}/demo/outbound"
echo ""

bold "11) HTTP — auth context header (stub until gateway)"
# shellcheck disable=SC2002
AUTH_HDR=$(node -e "
const { serializeAuthContext } = await import('./packages/auth/dist/index.js');
console.log(serializeAuthContext({
  tenantId: 'tenant-demo',
  actorId: 'user-demo',
  roles: ['developer'],
  requestId: 'playground-req-1',
}));
")
curl -sf -H "x-quickstart-auth-context: ${AUTH_HDR}" -H "x-request-id: playground-req-1" "${BASE}/healthz" | jq . 2>/dev/null || \
  curl -sf -H "x-quickstart-auth-context: ${AUTH_HDR}" "${BASE}/healthz"
echo ""
echo "(Check template terminal/logs for tenant_id in structured JSON logs.)"

bold "12) Traces"
echo "Recent OTel collector trace export (if any):"
docker compose logs otel-collector --tail 5 2>/dev/null || true

bold "Done"
echo "Template: ${BASE}"
echo "Stop data plane: make down"
echo "Re-run smoke:   make smoke  (needs AWS CLI for ElasticMQ)"
