#!/usr/bin/env bash
# Start lightweight backend services + Next.js frontend for Agent Builder & Inbox.
# Auto-cleans up on Ctrl+C: stops frontend, all background microservices, and frees RAM.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
LOG_DIR="${QS_LOG_DIR:-/tmp/qs-agent-inbox-stack}"
mkdir -p "$LOG_DIR" "$ROOT/.run"

bold() { printf '\n\033[1m%s\033[0m\n' "$1"; }

PIDS=()

cleanup() {
  printf '\n\033[1;33m[!] Stopping all services and freeing memory...\033[0m\n'
  for pid in "${PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done

  # Also kill from pidfiles
  if [ -d "$LOG_DIR" ]; then
    for pidfile in "$LOG_DIR"/*.pid; do
      if [ -f "$pidfile" ]; then
        local p
        p=$(cat "$pidfile" 2>/dev/null || true)
        if [ -n "$p" ] && kill -0 "$p" 2>/dev/null; then
          kill -9 "$p" 2>/dev/null || true
        fi
        rm -f "$pidfile"
      fi
    done
  fi

  # Stop docker containers if requested or leave stopped
  docker compose stop postgres valkey >/dev/null 2>&1 || true
  printf '\033[1;32m[✓] All services and database stopped. RAM is fully released.\033[0m\n'
}

trap cleanup EXIT INT TERM

start_svc() {
  local name="$1"
  local dir="$2"
  local port="$3"
  local pidfile="$LOG_DIR/${name}.pid"
  local logfile="$LOG_DIR/${name}.log"
  local entry="$ROOT/$dir/dist/index.js"

  if curl -sf "http://127.0.0.1:${port}/healthz" >/dev/null 2>&1; then
    echo "  ${name} already up on :${port}"
    return 0
  fi

  local needs_build=0
  if [[ ! -f "$entry" ]] || [[ "$name" == "runtime" ]]; then
    needs_build=1
  elif [[ -d "$ROOT/$dir/src" ]] && [[ -n $(find "$ROOT/$dir/src" -type f -newer "$entry" 2>/dev/null | head -n 1) ]]; then
    needs_build=1
  fi

  if [[ "$needs_build" -eq 1 ]]; then
    echo "  building ${name}…"
    pnpm --filter "$(jq -r .name "$ROOT/$dir/package.json")" build >>"$logfile" 2>&1 || true
  fi

  if [[ "$name" == "conversation" || "$name" == "workflow" || "$name" == "workspace" ]]; then
    env KAFKA_BROKERS="" node --env-file=.env "$entry" >>"$logfile" 2>&1 &
  else
    node --env-file=.env "$entry" >>"$logfile" 2>&1 &
  fi
  local pid=$!
  echo "$pid" >"$pidfile"
  PIDS+=("$pid")
  echo "  started ${name} (pid $pid) on :${port}"

  for _ in $(seq 1 40); do
    if curl -sf "http://127.0.0.1:${port}/healthz" >/dev/null 2>&1; then
      echo "  ${name} healthy on :${port}"
      return 0
    fi
    sleep 0.5
  done
  echo "  WARN: ${name} did not respond healthy on :${port} (see ${logfile})" >&2
}

start_lead_generation() {
  local name="lead-generation"
  local port="${LEAD_GENERATION_PORT:-3019}"
  local pidfile="$LOG_DIR/${name}.pid"
  local logfile="$LOG_DIR/${name}.log"
  local entry="$ROOT/services/lead-generation-service/dist/index.js"
  local env_args=(--env-file=.env)
  if [[ -f "$ROOT/.env.leads" ]]; then
    env_args+=(--env-file=.env.leads)
  fi

  if curl -sf "http://127.0.0.1:${port}/healthz" >/dev/null 2>&1; then
    echo "  ${name} already up on :${port}"
    return 0
  fi
  if [[ ! -f "$entry" ]]; then
    echo "  building ${name}…"
    pnpm --filter @quickstart/service-lead-generation build >>"$logfile" 2>&1 || true
  fi
  node "${env_args[@]}" "$entry" >>"$logfile" 2>&1 &
  local pid=$!
  echo "$pid" >"$pidfile"
  PIDS+=("$pid")
  echo "  started ${name} (pid $pid) on :${port}"
  for _ in $(seq 1 40); do
    if curl -sf "http://127.0.0.1:${port}/healthz" >/dev/null 2>&1; then
      echo "  ${name} healthy on :${port}"
      return 0
    fi
    sleep 0.5
  done
  echo "  WARN: ${name} did not respond healthy on :${port} (see ${logfile})" >&2
}

bold "1) Low-RAM Data Plane (Postgres + Valkey only)"
if ! docker ps >/dev/null 2>&1; then
  printf '\n\033[1;31m[!] Docker daemon is not running.\033[0m\n'
  echo "Please start Docker first by running: sudo systemctl start docker"
  echo ""
  exit 1
fi
docker compose up -d --wait postgres valkey

bold "2) Migrations"
export DATABASE_URL="${DATABASE_URL:-postgresql://quickstart:quickstart@localhost:5433/quickstart}"
pnpm --filter @quickstart/service-identity migrate || true
pnpm --filter @quickstart/service-workspace migrate || true
pnpm --filter @quickstart/service-agent migrate || true
pnpm --filter @quickstart/service-conversation migrate || true
pnpm --filter @quickstart/service-web-fetch migrate || true
pnpm --filter @quickstart/service-voice migrate || true
pnpm --filter @quickstart/service-knowledge migrate || true
pnpm --filter @quickstart/service-secrets migrate || true
pnpm --filter @quickstart/service-workflow migrate || true
pnpm --filter @quickstart/service-memory migrate || true
pnpm --filter @quickstart/service-campaign migrate || true
pnpm --filter @quickstart/service-lead migrate || true
pnpm --filter @quickstart/service-lead-generation migrate || true
pnpm --filter @quickstart/service-eval migrate || true
pnpm --filter @quickstart/service-usage migrate || true
pnpm --filter @quickstart/service-audit migrate || true

bold "3) Core Backend Services"
start_svc identity services/identity-service "${IDENTITY_PORT:-3001}"
start_svc workspace services/workspace-service "${WORKSPACE_PORT:-3002}"
start_svc agent services/agent-service "${AGENT_PORT:-3003}"
start_svc conversation services/conversation-service "${CONVERSATION_PORT:-3004}"
start_svc model-gateway services/model-gateway "${MODEL_GATEWAY_PORT:-3005}"
start_svc runtime services/runtime-service "${RUNTIME_PORT:-3006}"
start_svc web-fetch services/web-fetch-service "${WEB_FETCH_PORT:-3007}"
start_svc voice services/voice-service "${VOICE_PORT:-3008}"
start_svc knowledge services/knowledge-service "${KNOWLEDGE_PORT:-3009}"
start_svc memory services/memory-service "${MEMORY_PORT:-3010}"
start_svc secrets services/secrets-service "${SECRETS_PORT:-3011}"
start_svc workflow services/workflow-service "${WORKFLOW_PORT:-3012}"
start_svc campaign services/campaign-service "${CAMPAIGN_PORT:-3013}"
start_svc lead services/lead-service "${LEAD_PORT:-3014}"
start_svc eval services/eval-service "${EVAL_PORT:-3016}"
start_svc usage services/usage-service "${USAGE_PORT:-3017}"
start_svc audit services/audit-service "${AUDIT_PORT:-3018}"
start_lead_generation
start_svc gateway services/gateway-service "${GATEWAY_PORT:-3000}"

if ! curl -sf "http://127.0.0.1:4000/api/slots" >/dev/null 2>&1; then
  node fixtures/dental-clinic-portal/server.mjs >>"$LOG_DIR/clinic.log" 2>&1 &
  CLINIC_PID=$!
  echo "$CLINIC_PID" > "$LOG_DIR/clinic.pid"
  PIDS+=("$CLINIC_PID")
  echo "  started dental-clinic-portal (pid $CLINIC_PID) on :4000"
fi

bold "4) Demo Account Seed"
node --env-file=.env scripts/seed-demo-account.mjs >/dev/null 2>&1 || true

bold "5) Starting Frontend (apps/web on port 3015)"
echo "--------------------------------------------------------"
echo "  Frontend URL:     http://localhost:3015"
echo "  Workspace Panel:  http://localhost:3015/workspaces"
echo "  Demo Credentials: quickstart@gmail.com / password"
echo "  Press Ctrl+C at any time to STOP all backends & frontend"
echo "--------------------------------------------------------"
echo ""

# Free lingering port 3015 if any
if lsof -ti :3015 >/dev/null 2>&1; then
  fuser -k 3015/tcp 2>/dev/null || true
  sleep 1
fi

# Run Next.js in foreground attached to terminal; when killed, trap cleans up everything
env NODE_ENV=development PORT=3015 pnpm --filter @quickstart/web exec next dev -H 0.0.0.0 -p 3015 &
WEB_PID=$!
PIDS+=("$WEB_PID")

wait "$WEB_PID"
