#!/usr/bin/env bash
# Ultra-lean stack for Workspaces testing
# Starts: Postgres, Valkey, identity-service (:3001), workspace-service (:3002), agent-service (:3003), gateway-service (:3000), and apps/web (:3015)
# Press Ctrl+C at any time to stop all services and automatically release all memory.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
LOG_DIR="${QS_LOG_DIR:-/tmp/qs-workspace-stack}"
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

  docker compose stop postgres valkey >/dev/null 2>&1 || true
  printf '\033[1;32m[✓] All services and containers stopped. RAM is fully released.\033[0m\n'
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

  node --env-file=.env "$entry" >>"$logfile" 2>&1 &
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

bold "1) Low-RAM Data Plane (Postgres + Valkey)"
if ! docker info >/dev/null 2>&1; then
  printf '\n\033[1;31m[!] Docker daemon is not running.\033[0m\n'
  echo "Please start Docker first by running: sudo systemctl start docker"
  exit 1
fi
docker compose up -d --wait postgres valkey

bold "2) Database Migrations"
export DATABASE_URL="${DATABASE_URL:-postgresql://quickstart:quickstart@localhost:5433/quickstart}"
pnpm --filter @quickstart/service-identity migrate || true
pnpm --filter @quickstart/service-workspace migrate || true
pnpm --filter @quickstart/service-agent migrate || true

bold "3) Core Backend Services"
start_svc identity services/identity-service "${IDENTITY_PORT:-3001}"
start_svc workspace services/workspace-service "${WORKSPACE_PORT:-3002}"
start_svc agent services/agent-service "${AGENT_PORT:-3003}"
start_svc gateway services/gateway-service "${GATEWAY_PORT:-3000}"

bold "4) Seed Demo Account"
node --env-file=.env scripts/seed-demo-account.mjs >/dev/null 2>&1 || true

bold "5) Starting Frontend (apps/web on port 3015)"
echo "--------------------------------------------------------"
echo "  Workspaces Hub:   http://localhost:3015/workspaces"
echo "  Demo Account:     quickstart@gmail.com / password"
echo "  Auto-cleanup:     Press Ctrl+C to stop everything & free RAM"
echo "--------------------------------------------------------"
echo ""

env PORT=3015 pnpm --filter @quickstart/web exec next dev -H 0.0.0.0 -p 3015 &
WEB_PID=$!
PIDS+=("$WEB_PID")

wait "$WEB_PID"
