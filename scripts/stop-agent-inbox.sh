#!/usr/bin/env bash
# Stop all services associated with the Agent & Inbox stack and free memory.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
LOG_DIR="${QS_LOG_DIR:-/tmp/qs-agent-inbox-stack}"

echo "Killing any running node processes for Agent & Inbox..."
if [ -d "$LOG_DIR" ]; then
  for pidfile in "$LOG_DIR"/*.pid; do
    if [ -f "$pidfile" ]; then
      pid=$(cat "$pidfile" 2>/dev/null || true)
      if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        kill -9 "$pid" 2>/dev/null || true
        echo "  Stopped process $pid"
      fi
      rm -f "$pidfile"
    fi
  done
fi

# Kill next dev on 3015 if running
fuser -k 3015/tcp 2>/dev/null || true
# Kill backend ports if still bound
for port in 3000 3001 3002 3003 3004 3005 3006 3008; do
  fuser -k "${port}/tcp" 2>/dev/null || true
done

# Stop Postgres & Valkey containers
docker compose stop postgres valkey >/dev/null 2>&1 || true

echo "All Agent & Inbox backend + frontend services stopped. Memory released."
