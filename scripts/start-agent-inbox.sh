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

  if [[ ! -f "$entry" ]]; then
    echo "  building ${name}…"
    pnpm --filter "$(jq -r .name "$ROOT/$dir/package.json")" build >>"$logfile" 2>&1 || true
  fi

  if [[ "$name" == "conversation" ]]; then
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

bold "1) Low-RAM Data Plane (Postgres + Valkey only)"
if ! docker info >/dev/null 2>&1; then
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
pnpm --filter @quickstart/service-voice migrate || true

bold "3) Core Backend Services"
start_svc identity services/identity-service "${IDENTITY_PORT:-3001}"
start_svc workspace services/workspace-service "${WORKSPACE_PORT:-3002}"
start_svc agent services/agent-service "${AGENT_PORT:-3003}"
start_svc conversation services/conversation-service "${CONVERSATION_PORT:-3004}"
start_svc model-gateway services/model-gateway "${MODEL_GATEWAY_PORT:-3005}"
start_svc runtime services/runtime-service "${RUNTIME_PORT:-3006}"
start_svc voice services/voice-service "${VOICE_PORT:-3008}"
start_svc gateway services/gateway-service "${GATEWAY_PORT:-3000}"

bold "4) Demo Account Seed"
node --env-file=.env scripts/seed-demo-account.mjs >/dev/null 2>&1 || true

bold "5) Starting Frontend (apps/web on port 3015)"
echo "--------------------------------------------------------"
echo "  Frontend URL:     http://localhost:3015"
echo "  Demo Credentials: quickstart@gmail.com / password"
echo "  Press Ctrl+C at any time to STOP all backends & frontend"
echo "--------------------------------------------------------"
echo ""

# Run Next.js in foreground attached to terminal; when killed, trap cleans up everything
env PORT=3015 pnpm --filter @quickstart/web exec next dev -H 0.0.0.0 -p 3015 &
WEB_PID=$!
PIDS+=("$WEB_PID")

wait "$WEB_PID"
