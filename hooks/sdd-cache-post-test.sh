#!/bin/bash
# sdd-cache-post-test.sh — Tests for the sdd-cache-post hook
#
# Run: bash hooks/sdd-cache-post-test.sh

set -euo pipefail

# Source shared library
# shellcheck source=hooks/sdd-cache-lib.sh
. "$(dirname "$0")/sdd-cache-lib.sh"

PASS=0 FAIL=0

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

# ── Test 1: get_final_headers ─────────────────────────────────────────────
printf 'Test 1: get_final_headers\n'

# Single block
HEADS="HTTP/1.1 200 OK
Content-Type: text/plain
ETag: \"foo\""
assert_eq "single block" "$HEADS" "$(get_final_headers "$HEADS")"

# Multiple blocks (redirect)
MULTI_HEADS="HTTP/1.1 301 Moved Permanently
Location: https://example.com/

HTTP/1.1 200 OK
Content-Type: text/html
ETag: \"bar\""
EXPECTED="HTTP/1.1 200 OK
Content-Type: text/html
ETag: \"bar\""
assert_eq "multiple blocks (redirect)" "$EXPECTED" "$(get_final_headers "$MULTI_HEADS")"

# ── Test 2: extract_header ────────────────────────────────────────────────
printf '\nTest 2: extract_header\n'

# We need to pass FINAL_HEADERS to extract_header
FINAL_HEADERS="HTTP/1.1 200 OK
Content-Type: text/html; charset=UTF-8
ETag: \"12345\"
Last-Modified: Wed, 21 Oct 2015 07:28:00 GMT
X-Multi-Colon: value:with:colons
Whitespace:   leading and trailing   "

assert_eq "extract ETag" "\"12345\"" "$(extract_header "$FINAL_HEADERS" "ETag")"
assert_eq "case insensitivity (lower)" "\"12345\"" "$(extract_header "$FINAL_HEADERS" "etag")"
assert_eq "case insensitivity (upper)" "\"12345\"" "$(extract_header "$FINAL_HEADERS" "ETAG")"
assert_eq "handle colons in value" "Wed, 21 Oct 2015 07:28:00 GMT" "$(extract_header "$FINAL_HEADERS" "Last-Modified")"
assert_eq "handle multiple colons in value" "value:with:colons" "$(extract_header "$FINAL_HEADERS" "X-Multi-Colon")"
assert_eq "strip whitespace" "leading and trailing" "$(extract_header "$FINAL_HEADERS" "Whitespace")"
assert_eq "non-existent header" "" "$(extract_header "$FINAL_HEADERS" "X-Missing")"

# ── Summary ──────────────────────────────────────────────────────────────
printf '\n══════════════════════════════════════════\n'
printf 'Results: %d passed, %d failed\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
