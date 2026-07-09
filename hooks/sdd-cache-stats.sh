#!/bin/bash
# sdd-cache-stats.sh — print accumulated sdd-cache savings.
#
# Reads .claude/sdd-cache/.stats.json (written by sdd-cache-pre.sh on every
# cache hit) and prints hit count + estimated tokens saved since first use.
#
# Usage: bash hooks/sdd-cache-stats.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/jsonutil.sh
source "$SCRIPT_DIR/lib/jsonutil.sh"
if [ "$JSON_TOOL" = "none" ]; then
  echo "No JSON tool available (need jq, python3, or node)."
  exit 1
fi

CACHE_DIR="${CLAUDE_PROJECT_DIR:-$PWD}/.claude/sdd-cache"
STATS_FILE="$CACHE_DIR/.stats.json"

if [ ! -f "$STATS_FILE" ]; then
  echo "No cache hits recorded yet ($STATS_FILE not found)."
  exit 0
fi

HITS=$(jf_get_file "$STATS_FILE" "hits" "0")
BYTES_SAVED=$(jf_get_file "$STATS_FILE" "bytes_saved" "0")
SINCE=$(jf_get_file "$STATS_FILE" "since" "")
LAST_HIT=$(jf_get_file "$STATS_FILE" "last_hit" "")

# ~4 bytes/token for English prose — a rough estimate, not an exact count.
TOKENS_SAVED=$((BYTES_SAVED / 4))

fmt_date() {
  date -u -r "$1" +"%Y-%m-%d %H:%M UTC" 2>/dev/null || date -u -d "@$1" +"%Y-%m-%d %H:%M UTC" 2>/dev/null || echo "unknown"
}

echo "sdd-cache savings"
echo "-----------------"
echo "Cache hits:            $HITS"
echo "Bytes served from cache: $BYTES_SAVED"
echo "Estimated tokens saved: ~$TOKENS_SAVED (at ~4 bytes/token)"
[ -n "$SINCE" ]    && echo "Tracking since:        $(fmt_date "$SINCE")"
[ -n "$LAST_HIT" ] && echo "Last cache hit:         $(fmt_date "$LAST_HIT")"
echo
echo "Note: this counts only WebFetch calls the sdd-cache hook intercepted."
echo "It does not include Anthropic's own prompt-cache savings, which are"
echo "server-side and not exposed to this hook."
