#!/usr/bin/env bash
# 01-engines-state-roundtrip.sh
# E2E sanity: setup-code-graph.sh in skip-both mode persists state, and
# check-code-graph-engines.sh reads it back correctly.
#
# Does NOT require the claude CLI. Always runnable.

set -uo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)}"
SETUP="${REPO_ROOT}/tools/setup-code-graph.sh"
CHECK="${REPO_ROOT}/tools/check-code-graph-engines.sh"
STATE_FILE="$HOME/.claude/code-graph-engines.json"

if [[ ! -x "$SETUP" || ! -x "$CHECK" ]]; then
  echo "  PREREQ: bootstrap scripts missing or not executable"
  exit 1
fi

# Backup existing state (do not destroy operator data).
backup=""
if [[ -f "$STATE_FILE" ]]; then
  backup="$(mktemp 2>/dev/null || mktemp -t cg-state-bak)"
  cp "$STATE_FILE" "$backup"
fi
restore() {
  if [[ -n "$backup" && -f "$backup" ]]; then
    cp "$backup" "$STATE_FILE"
    rm -f "$backup"
  fi
}
trap restore EXIT

# Run with the engine skipped — exit 2 expected (engine MISSING).
# v4.0: graphify deprecated (ADR-0013), only --skip-cbm remains.
out_setup="$(bash "$SETUP" --skip-cbm 2>&1)"
rc_setup=$?
if [[ $rc_setup -ne 2 ]]; then
  echo "  FAIL setup-code-graph.sh --skip-cbm should exit 2 (got $rc_setup)"
  echo "$out_setup" | sed 's/^/    /'
  exit 1
fi
echo "  OK   setup-code-graph.sh exits 2 when engine skipped"

# State file must be readable JSON with the expected shape.
if [[ ! -f "$STATE_FILE" ]]; then
  echo "  FAIL state file not written: $STATE_FILE"
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "  PREREQ: jq required for state validation"
  exit 1
fi
if ! jq empty "$STATE_FILE" 2>/dev/null; then
  echo "  FAIL state file is not valid JSON"
  exit 1
fi
echo "  OK   state file is valid JSON"

c_status="$(jq -r '.codebase_memory_mcp.status' "$STATE_FILE")"
if [[ "$c_status" != "MISSING" ]]; then
  echo "  FAIL expected codebase_memory_mcp MISSING after skip; got codebase=$c_status"
  exit 1
fi
echo "  OK   state reports codebase-memory=MISSING"

# check-code-graph-engines.sh --field best should report 'none'.
out_check="$(bash "$CHECK" --field best 2>&1)"
rc_check=$?
if [[ $rc_check -ne 1 || "$out_check" != "none" ]]; then
  echo "  FAIL check-code-graph-engines.sh --field best should output 'none' and exit 1 (got '$out_check' exit $rc_check)"
  exit 1
fi
echo "  OK   check-code-graph-engines.sh --field best -> 'none' (exit 1)"

echo "  PASS scenario 01"
exit 0
