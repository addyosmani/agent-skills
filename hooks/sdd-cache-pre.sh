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
# Dependencies: jq, curl, shasum (or sha256sum).

set -euo pipefail

# Graceful degradation: if any dependency is missing, let the fetch through.
command -v jq   >/dev/null 2>&1 || exit 0
command -v curl >/dev/null 2>&1 || exit 0
command -v shasum >/dev/null 2>&1 || command -v sha256sum >/dev/null 2>&1 || exit 0

# is_url_safe: reject non-https URLs and internal/loopback/metadata hosts to
# prevent SSRF. Returns 0 (safe) or 1 (unsafe). Must be called before any curl.
is_url_safe() {
  local url="$1"
  # Require https:// scheme
  case "$url" in https://*) ;; *) return 1 ;; esac
  # Extract host (strip scheme, path, port)
  local host="${url#https://}"
  host="${host%%/*}"
  host="${host%%:*}"
  # Reject common internal/loopback/metadata hosts
  case "$host" in
    localhost|127.*|0.0.0.0|169.254.169.254|10.*|172.1[6-9].*|172.2[0-9].*|172.3[01].*|192.168.*|::1|[fF][cCdD]??:*) return 1 ;;
  esac
  return 0
}

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

URL=$(printf '%s' "$INPUT" | jq -r '.tool_input.url // empty' 2>/dev/null || true)
if [ -z "$URL" ]; then dbg "no url in tool_input, exit"; exit 0; fi
if ! is_url_safe "$URL"; then dbg "url rejected by is_url_safe, exit"; exit 0; fi
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

FETCHED_AT=$(jq -r '.fetched_at // 0' "$CACHE_FILE" 2>/dev/null || echo 0)
ORIGINAL_PROMPT=$(jq -r '.prompt // empty' "$CACHE_FILE" 2>/dev/null || true)
ETAG=$(jq -r '.etag // empty' "$CACHE_FILE" 2>/dev/null || true)
LAST_MOD=$(jq -r '.last_modified // empty' "$CACHE_FILE" 2>/dev/null || true)

# No validator means we cannot verify freshness — never serve from cache.
if [ -z "$ETAG" ] && [ -z "$LAST_MOD" ]; then
  dbg "cached entry has no etag/last-modified, cannot revalidate, bypass"
  exit 0
fi

HEADERS=()
[ -n "$ETAG" ]     && HEADERS+=(-H "If-None-Match: $ETAG")
[ -n "$LAST_MOD" ] && HEADERS+=(-H "If-Modified-Since: $LAST_MOD")

STATUS=$(curl -sI -o /dev/null -w "%{http_code}" \
  --max-time 5 \
  "${HEADERS[@]}" \
  "$URL" 2>/dev/null || echo "000")
dbg "revalidation HEAD status=$STATUS"

if [ "$STATUS" != "304" ]; then
  dbg "not 304, letting WebFetch proceed"
  exit 0
fi

# TTL cap: even on 304, reject entries older than SDD_CACHE_MAX_AGE seconds
# (default 86400 = 24h). Prevents a compromised origin from serving stale
# 304s indefinitely (cache poisoning).
SDD_CACHE_MAX_AGE="${SDD_CACHE_MAX_AGE:-86400}"
NOW=$(date +%s)
AGE=$((NOW - FETCHED_AT))
if [ "$AGE" -gt "$SDD_CACHE_MAX_AGE" ]; then
  dbg "cache entry age ${AGE}s exceeds max-age ${SDD_CACHE_MAX_AGE}s, bypass"
  rm -f "$CACHE_FILE"
  exit 0
fi

# Server confirmed content unchanged. Serve cached copy to the agent.
CONTENT=$(jq -r '.content // empty' "$CACHE_FILE" 2>/dev/null || true)
if [ -z "$CONTENT" ]; then dbg "cache file has empty content field, bypass"; exit 0; fi
dbg "cache HIT, blocking WebFetch with ${#CONTENT} bytes of cached content"

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
