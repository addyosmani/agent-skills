#!/bin/bash
# sdd-cache-test.sh — Tests for the sdd-cache pre/post WebFetch hooks
#
# No real network traffic: a deterministic curl stub is placed first on PATH.
#   CURL_STUB_STATUS  — printed when the hook probes a status code (pre hook,
#                       invoked with -w); defaults to 000
#   CURL_STUB_HEADERS — printed for header captures (post hook, no -w)
# Every test URL is a public https:// host and every seeded cache entry uses
# a fresh fetched_at, so the suite passes both with and without the SSRF /
# TTL hardening of the hooks (issue #295).
#
# Run: bash hooks/sdd-cache-test.sh

set -euo pipefail

PASS=0 FAIL=0
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

# The hooks require jq to do anything; without it they no-op by design.
if ! command -v jq >/dev/null 2>&1; then
  printf 'SKIP: jq not available; sdd-cache hooks no-op without it\n'
  exit 0
fi

# ── curl stub ─────────────────────────────────────────────────────────────
STUB_BIN="$TMPDIR/bin"
mkdir -p "$STUB_BIN"
cat > "$STUB_BIN/curl" <<'EOF'
#!/bin/bash
# Deterministic curl replacement. -w present => status probe (pre hook),
# otherwise header capture (post hook).
has_w=0
for a in "$@"; do [ "$a" = "-w" ] && has_w=1; done
if [ $has_w -eq 1 ]; then
  printf '%s' "${CURL_STUB_STATUS:-000}"
else
  printf '%s\n' "${CURL_STUB_HEADERS:-}"
fi
exit 0
EOF
chmod +x "$STUB_BIN/curl"

hash_key() {
  if command -v shasum >/dev/null 2>&1; then
    printf '%s' "$1" | shasum -a 256 | cut -c1-32
  else
    printf '%s' "$1" | sha256sum | cut -c1-32
  fi
}

assert_eq() {
  local label="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    PASS=$((PASS + 1))
    printf '  PASS: %s\n' "$label"
  else
    FAIL=$((FAIL + 1))
    printf '  FAIL: %s\n' "$label" >&2
    printf '    expected: %s\n' "$(printf '%s' "$expected" | cat -v)" >&2
    printf '    actual:   %s\n' "$(printf '%s' "$actual" | cat -v)" >&2
  fi
}

# run_pre / run_post: invoke a hook with isolated project dir + stubbed curl.
# Usage: run_pre <project_dir> <input_json> ; rc in $RC, stderr in $ERR.
RC=0 ERR=""
run_hook() {
  local script="$1" proj="$2" input="$3"
  RC=0
  ERR=$(printf '%s' "$input" | \
    CLAUDE_PROJECT_DIR="$proj" PATH="$STUB_BIN:$PATH" \
    CURL_STUB_STATUS="${CURL_STUB_STATUS:-000}" \
    CURL_STUB_HEADERS="${CURL_STUB_HEADERS:-}" \
    bash "hooks/$script" 2>&1 >/dev/null) || RC=$?
}

# seed_entry <proj> <url> <content> [etag] — write a valid, fresh cache entry.
seed_entry() {
  # ${4-...} (not ${4:-...}): an explicitly empty etag must stay empty.
  local proj="$1" url="$2" content="$3" etag="${4-\"seed-etag\"}"
  local dir="$proj/.claude/sdd-cache"
  mkdir -p "$dir"
  jq -n \
    --arg url "$url" \
    --arg prompt "original prompt" \
    --arg etag "$etag" \
    --arg last_modified "" \
    --arg content "$content" \
    --argjson fetched_at "$(date +%s)" \
    '{url:$url, prompt:$prompt, etag:$etag, last_modified:$last_modified,
      content:$content, fetched_at:$fetched_at}' \
    > "$dir/$(hash_key "$url").json"
}

pre_input()  { jq -n --arg url "$1" '{tool_input:{url:$url}}'; }
post_input() { jq -n --arg url "$1" --arg result "$2" \
  '{tool_input:{url:$url, prompt:"test prompt"}, tool_response:{result:$result, code:200}}'; }

URL="https://docs.example.com/guide"

# ── Test 1: pre — no url in input lets WebFetch proceed ───────────────────
printf 'Test 1: pre — no url in tool_input\n'
P="$TMPDIR/t1"; mkdir -p "$P"
run_hook sdd-cache-pre.sh "$P" '{"tool_input":{}}'
assert_eq "exit 0 without url" "0" "$RC"

# ── Test 2: pre — malformed JSON input is not fatal ───────────────────────
printf '\nTest 2: pre — malformed JSON input\n'
P="$TMPDIR/t2"; mkdir -p "$P"
run_hook sdd-cache-pre.sh "$P" 'NOT_JSON{{{'
assert_eq "exit 0 on malformed JSON" "0" "$RC"

# ── Test 3: pre — no cache entry lets WebFetch proceed ────────────────────
printf '\nTest 3: pre — cache miss\n'
P="$TMPDIR/t3"; mkdir -p "$P"
run_hook sdd-cache-pre.sh "$P" "$(pre_input "$URL")"
assert_eq "exit 0 on cache miss" "0" "$RC"

# ── Test 4: pre — entry without validators is never served ────────────────
printf '\nTest 4: pre — entry lacking ETag/Last-Modified bypasses cache\n'
P="$TMPDIR/t4"; mkdir -p "$P"
seed_entry "$P" "$URL" "cached body" ""
CURL_STUB_STATUS=304 run_hook sdd-cache-pre.sh "$P" "$(pre_input "$URL")"
assert_eq "exit 0 despite 304 when no validator stored" "0" "$RC"

# ── Test 5: pre — non-304 status lets WebFetch proceed ────────────────────
printf '\nTest 5: pre — origin answers 200\n'
P="$TMPDIR/t5"; mkdir -p "$P"
seed_entry "$P" "$URL" "cached body"
CURL_STUB_STATUS=200 run_hook sdd-cache-pre.sh "$P" "$(pre_input "$URL")"
assert_eq "exit 0 on 200 (content changed)" "0" "$RC"

# ── Test 6: pre — network failure lets WebFetch proceed ───────────────────
printf '\nTest 6: pre — revalidation request fails\n'
P="$TMPDIR/t6"; mkdir -p "$P"
seed_entry "$P" "$URL" "cached body"
CURL_STUB_STATUS=000 run_hook sdd-cache-pre.sh "$P" "$(pre_input "$URL")"
assert_eq "exit 0 on network failure" "0" "$RC"

# ── Test 7: pre — 304 serves cached content byte-exactly ──────────────────
printf '\nTest 7: pre — cache hit on 304\n'
P="$TMPDIR/t7"; mkdir -p "$P"
# Content with the shell-hostile shapes the hook promises to pass through:
# backticks, $vars, backslashes, glob chars, multiple lines.
TRICKY='Line with `backticks` and $HOME and \backslash
second line: *glob* [brackets] and a "quote"
$(this must not execute)'
seed_entry "$P" "$URL" "$TRICKY"
CURL_STUB_STATUS=304 run_hook sdd-cache-pre.sh "$P" "$(pre_input "$URL")"
assert_eq "exit 2 on cache hit" "2" "$RC"
assert_eq "hit message names the URL" "1" "$(printf '%s' "$ERR" | grep -cF "$URL")"
assert_eq "hit message says revalidated" "1" "$(printf '%s' "$ERR" | grep -c 'Revalidated')"
assert_eq "original prompt surfaced" "1" "$(printf '%s' "$ERR" | grep -cF 'original prompt')"
served=$(printf '%s\n' "$ERR" | sed -n '/BEGIN CACHED CONTENT/,/END CACHED CONTENT/p' | sed '1d;$d')
assert_eq "cached content served byte-exactly" "$TRICKY" "$served"

# ── Test 8: pre — empty content field bypasses even on 304 ────────────────
printf '\nTest 8: pre — empty cached content\n'
P="$TMPDIR/t8"; mkdir -p "$P"
seed_entry "$P" "$URL" ""
CURL_STUB_STATUS=304 run_hook sdd-cache-pre.sh "$P" "$(pre_input "$URL")"
assert_eq "exit 0 when cached content empty" "0" "$RC"

# ── Test 9: post — no url in input writes nothing ─────────────────────────
printf '\nTest 9: post — no url in tool_input\n'
P="$TMPDIR/t9"; mkdir -p "$P"
run_hook sdd-cache-post.sh "$P" '{"tool_input":{},"tool_response":{"result":"body"}}'
assert_eq "exit 0 without url" "0" "$RC"
assert_eq "no cache dir created" "0" "$([ -d "$P/.claude/sdd-cache" ] && echo 1 || echo 0)"

# ── Test 10: post — unknown tool_response shape writes nothing ────────────
printf '\nTest 10: post — unextractable tool_response\n'
P="$TMPDIR/t10"; mkdir -p "$P"
run_hook sdd-cache-post.sh "$P" \
  "$(jq -n --arg url "$URL" '{tool_input:{url:$url}, tool_response:42}')"
assert_eq "exit 0 on unknown shape" "0" "$RC"
assert_eq "no cache dir created" "0" "$([ -d "$P/.claude/sdd-cache" ] && echo 1 || echo 0)"

# ── Test 11: post — caches when the origin provides an ETag ───────────────
printf '\nTest 11: post — entry written with origin validators\n'
P="$TMPDIR/t11"; mkdir -p "$P"
CURL_STUB_HEADERS='HTTP/2 200
etag: "abc123"
last-modified: Wed, 01 Jan 2026 00:00:00 GMT' \
  run_hook sdd-cache-post.sh "$P" "$(post_input "$URL" "fetched body")"
assert_eq "exit 0" "0" "$RC"
CF="$P/.claude/sdd-cache/$(hash_key "$URL").json"
assert_eq "cache file exists" "1" "$([ -f "$CF" ] && echo 1 || echo 0)"
assert_eq "url stored" "$URL" "$(jq -r '.url' "$CF")"
assert_eq "etag stored" '"abc123"' "$(jq -r '.etag' "$CF")"
assert_eq "content stored" "fetched body" "$(jq -r '.content' "$CF")"
assert_eq "prompt stored" "test prompt" "$(jq -r '.prompt' "$CF")"
assert_eq "fetched_at is numeric" "number" "$(jq -r '.fetched_at | type' "$CF")"

# ── Test 12: post — string-shaped tool_response is accepted ───────────────
printf '\nTest 12: post — string tool_response\n'
P="$TMPDIR/t12"; mkdir -p "$P"
CURL_STUB_HEADERS='HTTP/2 200
etag: "str-etag"' \
  run_hook sdd-cache-post.sh "$P" \
  "$(jq -n --arg url "$URL" '{tool_input:{url:$url}, tool_response:"plain string body"}')"
CF="$P/.claude/sdd-cache/$(hash_key "$URL").json"
assert_eq "content from string response" "plain string body" "$(jq -r '.content' "$CF" 2>/dev/null)"

# ── Test 13: post — origin without validators removes stale entry ─────────
printf '\nTest 13: post — no validators from origin\n'
P="$TMPDIR/t13"; mkdir -p "$P"
seed_entry "$P" "$URL" "stale body"
CF="$P/.claude/sdd-cache/$(hash_key "$URL").json"
CURL_STUB_HEADERS='HTTP/2 200
content-type: text/html' \
  run_hook sdd-cache-post.sh "$P" "$(post_input "$URL" "new body")"
assert_eq "exit 0" "0" "$RC"
assert_eq "stale entry removed, nothing cached" "0" "$([ -f "$CF" ] && echo 1 || echo 0)"

# ── Test 14: post — validators taken from final response block ────────────
printf '\nTest 14: post — multi-block HEAD output uses last block\n'
P="$TMPDIR/t14"; mkdir -p "$P"
CURL_STUB_HEADERS='HTTP/1.1 301 Moved Permanently
location: https://docs.example.com/new
etag: "redirect-etag"

HTTP/1.1 200 OK
etag: "final-etag"' \
  run_hook sdd-cache-post.sh "$P" "$(post_input "$URL" "body")"
CF="$P/.claude/sdd-cache/$(hash_key "$URL").json"
assert_eq "etag from final block" '"final-etag"' "$(jq -r '.etag' "$CF" 2>/dev/null)"

# ── Test 15: round-trip — post writes, pre serves the same bytes ──────────
printf '\nTest 15: round-trip post → pre\n'
P="$TMPDIR/t15"; mkdir -p "$P"
BODY='Round-trip body with `ticks`, $vars and
a second line \ with a backslash'
CURL_STUB_HEADERS='HTTP/2 200
etag: "rt-etag"' \
  run_hook sdd-cache-post.sh "$P" "$(post_input "$URL" "$BODY")"
CURL_STUB_STATUS=304 run_hook sdd-cache-pre.sh "$P" "$(pre_input "$URL")"
assert_eq "pre serves the entry post wrote (exit 2)" "2" "$RC"
served=$(printf '%s\n' "$ERR" | sed -n '/BEGIN CACHED CONTENT/,/END CACHED CONTENT/p' | sed '1d;$d')
assert_eq "round-trip content byte-exact" "$BODY" "$served"

# ── Summary ──────────────────────────────────────────────────────────────
printf '\n══════════════════════════════════════════\n'
printf 'Results: %d passed, %d failed\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
