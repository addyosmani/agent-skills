#!/usr/bin/env bash
# check-code-graph-engines.sh — read the cached engine state from setup-code-graph.sh
#
# Output formats:
#   (default)        human-readable summary
#   --json           raw JSON state (passthrough of ~/.claude/code-graph-engines.json)
#   --field <name>   a single field — one of:
#                      codebase_memory_mcp.status, codebase_memory_mcp.version, codebase_memory_mcp.binary,
#                      best   (recommended engine name based on availability)
#
# Exit codes:
#   0  the engine is OK
#   1  the engine is MISSING or BROKEN
#   2  state file does not exist (operator never ran setup-code-graph.sh)
#   3  state file is malformed
#
# History: pre-v4.0 this script tracked two engines (graphify + codebase-memory-mcp).
# graphify was deprecated in v4.0 — see ADR-0013. The state file may still carry a
# `graphify` key marked DEPRECATED for backward compat with older callers; this
# script ignores it.
#
# Source: https://github.com/jota-batuta/batuta-agent-skills (this plugin)

# NOTE on `set -uo pipefail` (no `-e`): this is a read-only status reporter and
# its caller (the skill's Step 0) interprets non-zero exit as "no engine available"
# rather than as a script error. Aborting on the first missing field would prevent
# the caller from distinguishing legitimate "MISSING" states from genuine failures.
set -uo pipefail

STATE_FILE="$HOME/.claude/code-graph-engines.json"

MODE="summary"
FIELD=""
while (( $# )); do
  case "$1" in
    --json)  MODE="json"; shift ;;
    --field) MODE="field"; FIELD="${2:-}"; shift 2 ;;
    -h|--help)
      sed -n '2,17p' "$0"
      exit 0 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

if [[ ! -f "$STATE_FILE" ]]; then
  echo "code-graph-engines.json not found at $STATE_FILE" >&2
  echo "Run: bash ~/.claude/plugins/marketplaces/batuta-agent-skills/tools/setup-code-graph.sh" >&2
  exit 2
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required to parse state. Install with:" >&2
  echo "  Windows: winget install jqlang.jq" >&2
  echo "  macOS:   brew install jq" >&2
  echo "  Linux:   apt-get install jq  (or your package manager)" >&2
  exit 3
fi

if ! jq empty "$STATE_FILE" 2>/dev/null; then
  echo "ERROR: $STATE_FILE is not valid JSON" >&2
  exit 3
fi

c_status="$(jq -r '.codebase_memory_mcp.status // "MISSING"'   "$STATE_FILE")"
c_ver="$(   jq -r '.codebase_memory_mcp.version // ""'         "$STATE_FILE")"
c_bin="$(   jq -r '.codebase_memory_mcp.binary  // ""'         "$STATE_FILE")"

# Determine the best available engine. codebase-memory-mcp is the only
# supported engine since v4.0 (see ADR-0013).
best="none"
if [[ "$c_status" == "OK" ]]; then best="codebase-memory"; fi

case "$MODE" in
  json)
    cat "$STATE_FILE" ;;
  field)
    case "$FIELD" in
      codebase_memory_mcp.status)   echo "$c_status" ;;
      codebase_memory_mcp.version)  echo "$c_ver" ;;
      codebase_memory_mcp.binary)   echo "$c_bin" ;;
      best)                         echo "$best" ;;
      *) echo "Unknown field: $FIELD" >&2; exit 1 ;;
    esac ;;
  summary)
    printf "codebase-memory-mcp  = %s  (%s)\n" "$c_status" "${c_ver:-n/a}"
    printf "best available       = %s\n" "$best"
    ;;
esac

# Exit code: 0 if the engine is OK, 1 otherwise.
[[ "$best" == "none" ]] && exit 1 || exit 0
