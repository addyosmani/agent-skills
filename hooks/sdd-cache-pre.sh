#!/bin/bash
# sdd-cache-pre.sh — PreToolUse hook for WebFetch.
#
# HTTP resource cache keyed by URL. Freshness is delegated to the origin via
# HTTP validators; 304 Not Modified is the only signal to serve from cache.
# On hit, exits 2 and writes the cached body to stderr so Claude Code can
# deliver it to the agent in place of the WebFetch result. Otherwise exits 0.
#
# No TTL: if validators don't catch a change, nothing will. Entries without
# ETag or Last-Modified are never cached (can't revalidate).
#
# Cached bodies are prompt-shaped (WebFetch post-processes through a model),
# so the key is URL-only and the original prompt is surfaced in the hit
# message so the next agent can tell if the earlier reading still applies.
#
# Dependencies: curl, shasum (or sha256sum), and one JSON tool (jq preferred,
# falling back to python3, then node — see lib/jsonutil.sh).

set -euo pipefail

# Graceful degradation: if any dependency is missing, let the fetch through.
command -v curl >/dev/null 2>&1 || exit 0
command -v shasum >/dev/null 2>&1 || command -v sha256sum >/dev/null 2>&1 || exit 0

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/jsonutil.sh
source "$SCRIPT_DIR/lib/jsonutil.sh"
[ "$JSON_TOOL" != "none" ] || exit 0

if [ -t 0 ]; then INPUT="{}"; else INPUT=$(cat); fi

# Debug logging: active when SDD_CACHE_DEBUG=1 is set, or when a sentinel
# file exists at .claude/sdd-cache/.debug. Toggle with `touch` / `rm`.
dbg() {
  local dir="${CLAUDE_PROJECT_DIR:-$PWD}/.claude/sdd-cache"
  [ "${SDD_CACHE_DEBUG:-0}" = "1" ] || [ -f "$dir/.debug" ] || return 0
  mkdir -p "$dir"
  printf '%s [pre]  %s\n' "$(date -u +%FT%TZ)" "$*" >> "$dir/.debug.log"
}
dbg "fired"

URL=$(jf_get_input_field "$INPUT" "tool_input.url" "")
if [ -z "$URL" ]; then dbg "no url in tool_input, exit"; exit 0; fi
dbg "url=$URL"

# Cache key is sha256(URL), truncated to 128 bits.
hash_key() {
  if command -v shasum >/dev/null 2>&1; then
    printf '%s' "$1" | shasum -a 256 | cut -c1-32
  else
    printf '%s' "$1" | sha256sum | cut -c1-32
  fi
}

CACHE_DIR="${CLAUDE_PROJECT_DIR:-$PWD}/.claude/sdd-cache"
CACHE_FILE="$CACHE_DIR/$(hash_key "$URL").json"

if [ ! -f "$CACHE_FILE" ]; then dbg "no cache file at $CACHE_FILE, exit"; exit 0; fi
dbg "cache file exists: $CACHE_FILE"

FETCHED_AT=$(jf_get_file "$CACHE_FILE" "fetched_at" "0")
ORIGINAL_PROMPT=$(jf_get_file "$CACHE_FILE" "prompt" "")
ETAG=$(jf_get_file "$CACHE_FILE" "etag" "")
LAST_MOD=$(jf_get_file "$CACHE_FILE" "last_modified" "")

# No validator means we cannot verify freshness — never serve from cache.
if [ -z "$ETAG" ] && [ -z "$LAST_MOD" ]; then
  dbg "cached entry has no etag/last-modified, cannot revalidate, bypass"
  exit 0
fi

HEADERS=()
[ -n "$ETAG" ]     && HEADERS+=(-H "If-None-Match: $ETAG")
[ -n "$LAST_MOD" ] && HEADERS+=(-H "If-Modified-Since: $LAST_MOD")

STATUS=$(curl -sI -o /dev/null -w "%{http_code}" \
  --max-time 5 -L \
  "${HEADERS[@]}" \
  "$URL" 2>/dev/null || echo "000")
dbg "revalidation HEAD status=$STATUS"

if [ "$STATUS" != "304" ]; then
  dbg "not 304, letting WebFetch proceed"
  exit 0
fi

# Server confirmed content unchanged. Serve cached copy to the agent.
CONTENT=$(jf_get_file "$CACHE_FILE" "content" "")
if [ -z "$CONTENT" ]; then dbg "cache file has empty content field, bypass"; exit 0; fi
dbg "cache HIT, blocking WebFetch with ${#CONTENT} bytes of cached content"

# Record savings: a hit means WebFetch's fetch+model-postprocess round trip
# was skipped entirely. Bytes served from cache approximate the input tokens
# that avoided re-processing (~4 bytes/token for English prose). Best-effort:
# a failed stats update never blocks serving the cached content.
record_stat() {
  local stats_file="$CACHE_DIR/.stats.json" bytes="${#CONTENT}" now hits bytes_saved since
  now=$(date +%s)
  hits=$(jf_get_file "$stats_file" "hits" "0")
  bytes_saved=$(jf_get_file "$stats_file" "bytes_saved" "0")
  since=$(jf_get_file "$stats_file" "since" "")
  [ -n "$since" ] || since="$now"
  jf_write_stats_file "$stats_file" "$((hits + 1))" "$((bytes_saved + bytes))" "$since" "$now"
}
record_stat 2>/dev/null || true

VERIFIED_AT_ISO=$(date -u -r "$FETCHED_AT" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null \
              || date -u -d "@$FETCHED_AT" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null \
              || echo "unknown")

# Emit the payload with printf so $CONTENT is never interpreted by the shell
# (docs contain backticks, $vars, and backslashes in code examples; an
# unquoted heredoc would treat them as command substitution).
{
  printf '[sdd-cache] Cache hit for %s\n\n' "$URL"
  printf 'Revalidated via HTTP 304; unchanged since %s. Use the cached\n' "$VERIFIED_AT_ISO"
  printf 'content below as if WebFetch had just returned it.\n\n'
  if [ -n "$ORIGINAL_PROMPT" ]; then
    printf 'Original WebFetch prompt: "%s". If your angle differs, judge\n' "$ORIGINAL_PROMPT"
    printf 'whether this reading still covers it.\n\n'
  fi
  printf -- '----- BEGIN CACHED CONTENT -----\n'
  printf '%s\n' "$CONTENT"
  printf -- '----- END CACHED CONTENT -----\n'
} >&2
exit 2
