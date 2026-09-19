#!/usr/bin/env bash
# Fail if known supply-chain backdoor indicators are present in the worktree.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

failed=0

fail() {
  echo "FAIL: $1" >&2
  failed=1
}

code_paths=(
  ':!docs/**'
  ':!scripts/check-supply-chain.sh'
)

if git grep -n "global\\['!'\\]" -- . "${code_paths[@]}" >/dev/null 2>&1; then
  fail "PolinRider-style global['!'] payload found"
  git grep -n "global\\['!'\\]" -- . "${code_paths[@]}" || true
fi

if git grep -n "PolinRider" -- . "${code_paths[@]}" >/dev/null 2>&1; then
  fail "PolinRider marker found"
fi

if [ -e .vscode/tasks.json ]; then
  if grep -E 'folderOpen|fa-solid-400\\.woff2|config\\.bat' .vscode/tasks.json >/dev/null 2>&1; then
    fail ".vscode/tasks.json still contains an auto-run or payload path"
  fi
fi

if [ -e .vscode/settings.json ] && grep -q 'task.allowAutomaticTasks' .vscode/settings.json; then
  fail ".vscode/settings.json enables automatic tasks"
fi

if git ls-files --error-unmatch 'apps/web/src/app/dashboard/projects/[id]/analytics/public/fonts/fa-solid-400.woff2' >/dev/null 2>&1; then
  fail "fake font payload is still tracked"
fi

gitignore="$(tr -d '\r' < .gitignore)"

if printf '%s\n' "$gitignore" | grep -Fxq 'config.bat'; then
  fail ".gitignore still contains attacker entry config.bat"
fi

if ! printf '%s\n' "$gitignore" | grep -Fxq '.env'; then
  fail ".gitignore must ignore .env"
fi

if ! printf '%s\n' "$gitignore" | grep -Fxq '.vscode/*'; then
  fail ".gitignore must ignore .vscode/* so folder-open tasks cannot be committed"
fi

if [ "$failed" -ne 0 ]; then
  echo "Supply-chain hygiene check failed." >&2
  exit 1
fi

echo "Supply-chain hygiene check passed."
