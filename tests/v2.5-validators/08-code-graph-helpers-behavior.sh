#!/usr/bin/env bash
# 08-code-graph-helpers-behavior.sh
# Behavior tests for the helper functions in tools/setup-code-graph.sh
# (closes the GATE 1 non-blocking finding from the v2.9 audit).
#
# Sources the script with SOURCING_FOR_TESTS=1 so the install logic does not
# run; tests detect_platform_tag() and sha256_of() against fixed inputs.
# Contract introduced in v3.0.

set -uo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
SETUP="${REPO_ROOT}/tools/setup-code-graph.sh"

case_name="08-code-graph-helpers-behavior"
echo "[${case_name}] starting"

if [[ ! -f "$SETUP" ]]; then
  echo "  MISS $SETUP not found"
  echo "[${case_name}] FAIL"
  exit 1
fi

# Source the script — the guard at the bottom should short-circuit before any
# install logic runs. We need bash subshell isolation because the script also
# `set -uo pipefail` and defines globals.
# shellcheck disable=SC1090
SOURCING_FOR_TESTS=1 source "$SETUP"

failed=0
pass_count=0

assert_eq() {
  local label="$1"
  local actual="$2"
  local expected="$3"
  if [[ "$actual" == "$expected" ]]; then
    echo "  OK   $label"
    pass_count=$((pass_count + 1))
  else
    echo "  FAIL $label  expected='$expected' actual='$actual'"
    failed=1
  fi
}

# Override uname for testing detect_platform_tag without spawning real uname.
# The function references $(uname -s 2>/dev/null) and $(uname -m 2>/dev/null).
# Easiest test is to wrap and re-define a uname function in this scope.
# But the function has already captured the real `uname` resolution. Solution:
# call detect_platform_tag with a sub-shell where we shadow uname.

run_with_uname() {
  local fake_s="$1"
  local fake_m="$2"
  uname() {
    case "$1" in
      -s) printf '%s\n' "$fake_s" ;;
      -m) printf '%s\n' "$fake_m" ;;
      *)  return 1 ;;
    esac
  }
  detect_platform_tag
  unset -f uname
}

# --- detect_platform_tag fixtures ---
echo ""
echo "  detect_platform_tag table:"
assert_eq "linux/x86_64        -> linux-amd64"   "$(run_with_uname 'Linux'        'x86_64' )" "linux-amd64"
assert_eq "linux/aarch64       -> linux-arm64"   "$(run_with_uname 'Linux'        'aarch64')" "linux-arm64"
assert_eq "darwin/arm64        -> darwin-arm64"  "$(run_with_uname 'Darwin'       'arm64'  )" "darwin-arm64"
assert_eq "darwin/x86_64       -> darwin-amd64"  "$(run_with_uname 'Darwin'       'x86_64' )" "darwin-amd64"
assert_eq "MINGW64_NT/x86_64   -> windows-amd64" "$(run_with_uname 'MINGW64_NT-10.0-26200' 'x86_64')" "windows-amd64"
assert_eq "windows/arm64       -> empty (unsupported)" "$(run_with_uname 'MINGW64_NT-10.0' 'aarch64')" ""
assert_eq "freebsd/x86_64      -> empty (unsupported OS)" "$(run_with_uname 'FreeBSD' 'x86_64')" ""
assert_eq "linux/i686          -> empty (unsupported arch)" "$(run_with_uname 'Linux' 'i686')" ""

# --- sha256_of consistency across backends (skips the test if a backend is unavailable) ---
echo ""
echo "  sha256_of consistency:"
fixture="$(mktemp 2>/dev/null || mktemp -t fixture)"
printf 'batuta-agent-skills v3.0 fixture\n' > "$fixture"
expected_sha="38a7d02480b1c9659a6907811da0ad8ade125eacd79aaa362bb137d2b72dd7c6"

actual_sha="$(sha256_of "$fixture")"
assert_eq "sha256_of() returns the expected hex digest for fixture" "$actual_sha" "$expected_sha"

# Verify each available backend independently produces the same digest.
if command -v sha256sum >/dev/null 2>&1; then
  s1="$(sha256sum "$fixture" | awk '{print $1}')"
  assert_eq "sha256sum backend matches expected" "$s1" "$expected_sha"
fi
if command -v shasum >/dev/null 2>&1; then
  s2="$(shasum -a 256 "$fixture" | awk '{print $1}')"
  assert_eq "shasum backend matches expected" "$s2" "$expected_sha"
fi
if command -v certutil >/dev/null 2>&1; then
  s3="$(certutil -hashfile "$fixture" SHA256 2>/dev/null | awk 'NR==2 {print $1}' | tr -d '\r ')"
  if [[ -n "$s3" ]]; then
    assert_eq "certutil backend matches expected" "$s3" "$expected_sha"
  else
    echo "  SKIP certutil backend (no output — likely on non-Windows host)"
  fi
fi

rm -f "$fixture"

# --- Pin variables present after sourcing ---
# v4.0: GRAPHIFY_PIN removed (graphify deprecated, ADR-0013). Only CBM_PIN_TAG remains.
echo ""
echo "  pin variables:"
assert_eq "CBM_PIN_TAG is set after sourcing" "${CBM_PIN_TAG:-UNSET}" "v0.6.0"

echo ""
echo "  pass=$pass_count fail=$failed"
if [[ ${failed} -eq 0 ]]; then
  echo "[${case_name}] PASS"
  exit 0
else
  echo "[${case_name}] FAIL"
  exit 1
fi
