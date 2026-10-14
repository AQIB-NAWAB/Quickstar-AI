#!/usr/bin/env bash
# Start only the services necessary for Lead Generation + Staff UI.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
LOG_DIR="${QS_LOG_DIR:-/tmp/qs-lead-gen-stack}"
mkdir -p "$LOG_DIR" "$ROOT/.run"

bold() { printf '\n\033[1m%s\033[0m\n' "$1"; }

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

  if [[ -f "$pidfile" ]] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
    echo "  ${name} process alive (pid $(cat "$pidfile")) — waiting for healthz"
  else
    local env_args=(--env-file=.env)
    if [[ -f "$ROOT/.env.leads" ]]; then
      env_args+=(--env-file=.env.leads)
    fi
    node "${env_args[@]}" "$entry" >>"$logfile" 2>&1 &
    echo $! >"$pidfile"
    echo "  started ${name} (pid $!) → ${logfile}"
  fi

  for _ in $(seq 1 60); do
    if curl -sf "http://127.0.0.1:${port}/healthz" >/dev/null 2>&1; then
      echo "  ${name} healthy on :${port}"
      return 0
    fi
    sleep 0.5
  done
  echo "  WARN: ${name} did not become healthy on :${port} (see ${logfile})" >&2
  return 0
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
  if [[ -f "$pidfile" ]] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
    echo "  ${name} process alive (pid $(cat "$pidfile")) — waiting for healthz"
  else
    node "${env_args[@]}" "$entry" >>"$logfile" 2>&1 &
    echo $! >"$pidfile"
    echo "  started ${name} (pid $!) → ${logfile}"
  fi
  for _ in $(seq 1 60); do
    if curl -sf "http://127.0.0.1:${port}/healthz" >/dev/null 2>&1; then
      echo "  ${name} healthy on :${port}"
      return 0
    fi
    sleep 0.5
  done
  echo "  WARN: ${name} did not become healthy on :${port} (see ${logfile})" >&2
  return 0
}

bold "1) Data plane (Postgres + Valkey only)"
docker compose up -d --wait postgres valkey

bold "2) Migrations (Postgres)"
export DATABASE_URL="${DATABASE_URL:-postgresql://quickstart:quickstart@localhost:5433/quickstart}"
make identity-migrate workspace-migrate web-fetch-migrate lead-migrate lead-generation-migrate || true

bold "3) Core Lead Generation Services"
start_svc identity services/identity-service "${IDENTITY_PORT:-3001}"
start_svc workspace services/workspace-service "${WORKSPACE_PORT:-3002}"
start_svc model-gateway services/model-gateway "${MODEL_GATEWAY_PORT:-3005}"
start_svc web-fetch services/web-fetch-service "${WEB_FETCH_PORT:-3007}"
start_svc lead services/lead-service "${LEAD_PORT:-3014}"
start_lead_generation
start_svc gateway services/gateway-service "${GATEWAY_PORT:-3000}"

bold "4) Staff Web UI"
if curl -sf "http://127.0.0.1:3015" >/dev/null 2>&1 || curl -sf "http://127.0.0.1:3015/login" >/dev/null 2>&1; then
  echo "  web already up on :3015"
else
  env PORT=3015 pnpm --filter @quickstart/web exec next dev -H 0.0.0.0 -p 3015 >>"$LOG_DIR/web.log" 2>&1 &
  echo $! >"$LOG_DIR/web.pid"
  echo "  started web (pid $!) → $LOG_DIR/web.log"
fi

bold "Done! Lead Generation environment is ready:"
echo "Gateway:          http://127.0.0.1:3000/healthz"
echo "Lead Generation:  http://127.0.0.1:3019/healthz"
echo "Staff UI:         http://127.0.0.1:3015"
echo "Demo Login:       http://127.0.0.1:3015/login (quickstart@gmail.com / password)"
echo "Logs:             $LOG_DIR"

bold "Services are active. Keeping process alive..."
wait
