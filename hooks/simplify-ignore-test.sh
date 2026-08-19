#!/bin/bash
# simplify-ignore-test.sh — Tests for the simplify-ignore hook
#
# Exercises filter_file by extracting function definitions from the hook.
# Run: bash hooks/simplify-ignore-test.sh

set -euo pipefail

PASS=0 FAIL=0
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

export CACHE="$TMPDIR/cache"
mkdir -p "$CACHE"

# Extract function definitions we need
hash_cmd() {
  if command -v shasum >/dev/null 2>&1; then shasum
  elif command -v sha1sum >/dev/null 2>&1; then sha1sum
  else printf '%s\n' "error: missing shasum or sha1sum" >&2; exit 1; fi
}
file_id() { printf '%s' "$1" | hash_cmd | cut -c1-16; }
block_hash() { printf '%s' "$1" | hash_cmd | cut -c1-8; }
escape_glob() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\*/\\*}"
  s="${s//\?/\\?}"
  s="${s//\[/\\[}"
  printf '%s' "$s"
}

# Extract filter_file from the hook script (line 59 "filter_file()" to line 142 closing brace)
eval "$(sed -n '/^filter_file()/,/^}/p' hooks/simplify-ignore.sh)"

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

# ── Test 1: Single-line block produces exactly one placeholder ────────────
printf 'Test 1: Single-line block (start+end on same line)\n'
rm -f "$CACHE"/*

SRC="$TMPDIR/single-line.js"
DEST="$TMPDIR/single-line-filtered.js"
cat > "$SRC" <<'EOF'
const a = 1;
/* simplify-ignore-start */ const secret = 42; /* simplify-ignore-end */
const b = 2;
EOF

FID="test_single"
filter_file "$SRC" "$DEST" "$FID"

placeholder_count=$(grep -c 'BLOCK_' "$DEST")
assert_eq "exactly one placeholder line" "1" "$placeholder_count"
assert_eq "line before block preserved" "1" "$(grep -c 'const a = 1' "$DEST")"
assert_eq "line after block preserved" "1" "$(grep -c 'const b = 2' "$DEST")"

block_files=$(ls "$CACHE/${FID}".block.* 2>/dev/null | wc -l | tr -d ' ')
assert_eq "one block file in cache" "1" "$block_files"

block_content=$(cat "$CACHE/${FID}".block.*)
assert_eq "block content matches" \
  "/* simplify-ignore-start */ const secret = 42; /* simplify-ignore-end */" \
  "$block_content"

# ── Test 2: Multi-line block ─────────────────────────────────────────────
printf '\nTest 2: Multi-line block\n'
rm -f "$CACHE"/*

SRC="$TMPDIR/multi-line.js"
DEST="$TMPDIR/multi-line-filtered.js"
cat > "$SRC" <<'EOF'
const a = 1;
// simplify-ignore-start
const secret1 = 42;
const secret2 = 99;
// simplify-ignore-end
const b = 2;
EOF

FID="test_multi"
filter_file "$SRC" "$DEST" "$FID"

placeholder_count=$(grep -c 'BLOCK_' "$DEST")
assert_eq "exactly one placeholder for multi-line block" "1" "$placeholder_count"

output_lines=$(wc -l < "$DEST" | tr -d ' ')
assert_eq "output has 3 lines (before + placeholder + after)" "3" "$output_lines"

# ── Test 3: Multiple blocks in one file ──────────────────────────────────
printf '\nTest 3: Multiple blocks in one file\n'
rm -f "$CACHE"/*

SRC="$TMPDIR/multi-block.js"
DEST="$TMPDIR/multi-block-filtered.js"
cat > "$SRC" <<'EOF'
line1
// simplify-ignore-start
blockA
// simplify-ignore-end
line2
// simplify-ignore-start
blockB
// simplify-ignore-end
line3
EOF

FID="test_multiblock"
filter_file "$SRC" "$DEST" "$FID"

placeholder_count=$(grep -c 'BLOCK_' "$DEST")
assert_eq "two placeholders for two blocks" "2" "$placeholder_count"

block_files=$(ls "$CACHE/${FID}".block.* 2>/dev/null | wc -l | tr -d ' ')
assert_eq "two block files in cache" "2" "$block_files"

# ── Test 4: Reason string preserved ──────────────────────────────────────
printf '\nTest 4: Reason string in placeholder\n'
rm -f "$CACHE"/*

SRC="$TMPDIR/reason.js"
DEST="$TMPDIR/reason-filtered.js"
cat > "$SRC" <<'EOF'
// simplify-ignore-start: perf-critical
hot_loop();
// simplify-ignore-end
EOF

FID="test_reason"
filter_file "$SRC" "$DEST" "$FID"

assert_eq "placeholder includes reason" "1" "$(grep -c 'perf-critical' "$DEST")"

reason_files=$(ls "$CACHE/${FID}".reason.* 2>/dev/null | wc -l | tr -d ' ')
assert_eq "reason file saved" "1" "$reason_files"
assert_eq "reason content" "perf-critical" "$(cat "$CACHE/${FID}".reason.*)"

# ── Test 5: Trailing newline preservation ────────────────────────────────
printf '\nTest 5: Trailing newline preservation\n'
rm -f "$CACHE"/*

SRC="$TMPDIR/no-trailing-nl.js"
DEST="$TMPDIR/no-trailing-nl-filtered.js"
printf 'line1\n// simplify-ignore-start\nsecret\n// simplify-ignore-end' > "$SRC"

FID="test_trail"
filter_file "$SRC" "$DEST" "$FID"

# Source has no trailing newline; dest should also have no trailing newline
src_has_nl=$(tail -c 1 "$SRC" | wc -l | tr -d ' ')
dest_has_nl=$(tail -c 1 "$DEST" | wc -l | tr -d ' ')
assert_eq "dest preserves no-trailing-newline from source" "$src_has_nl" "$dest_has_nl"

# ── Test 6: No blocks → return 1 ────────────────────────────────────────
printf '\nTest 6: No blocks returns 1\n'
rm -f "$CACHE"/*

SRC="$TMPDIR/no-blocks.js"
DEST="$TMPDIR/no-blocks-filtered.js"
cat > "$SRC" <<'EOF'
const a = 1;
const b = 2;
EOF

FID="test_noblocks"
rc=0
filter_file "$SRC" "$DEST" "$FID" || rc=$?
assert_eq "returns 1 when no blocks found" "1" "$rc"

# ── Test 7: Unclosed block emits warning and flushes ─────────────────────
printf '\nTest 7: Unclosed block\n'
rm -f "$CACHE"/*

SRC="$TMPDIR/unclosed.js"
DEST="$TMPDIR/unclosed-filtered.js"
cat > "$SRC" <<'EOF'
line1
// simplify-ignore-start
orphan code
EOF

FID="test_unclosed"
stderr_out=$(filter_file "$SRC" "$DEST" "$FID" 2>&1) || true
assert_eq "warning emitted for unclosed block" "1" "$(printf '%s' "$stderr_out" | grep -c 'unclosed')"
assert_eq "orphan code flushed to output" "1" "$(grep -c 'orphan code' "$DEST")"

# ── Test 8: Single-line block with reason ────────────────────────────────
printf '\nTest 8: Single-line block with reason\n'
rm -f "$CACHE"/*

SRC="$TMPDIR/single-reason.js"
DEST="$TMPDIR/single-reason-filtered.js"
cat > "$SRC" <<'EOF'
before
/* simplify-ignore-start: hot-path */ x = compute(); /* simplify-ignore-end */
after
EOF

FID="test_single_reason"
filter_file "$SRC" "$DEST" "$FID"

placeholder_count=$(grep -c 'BLOCK_' "$DEST")
assert_eq "exactly one placeholder for single-line+reason" "1" "$placeholder_count"
assert_eq "reason in placeholder" "1" "$(grep -c 'hot-path' "$DEST")"

# ── Test 9: HTML comment syntax ──────────────────────────────────────────
printf '\nTest 9: HTML comment syntax\n'
rm -f "$CACHE"/*

SRC="$TMPDIR/html.html"
DEST="$TMPDIR/html-filtered.html"
cat > "$SRC" <<'EOF'
<div>
<!-- simplify-ignore-start -->
<secret-component />
<!-- simplify-ignore-end -->
</div>
EOF

FID="test_html"
filter_file "$SRC" "$DEST" "$FID"

placeholder_count=$(grep -c 'BLOCK_' "$DEST")
assert_eq "HTML block replaced" "1" "$placeholder_count"
assert_eq "HTML suffix preserved" "1" "$(grep -c '\-\->' "$DEST")"

# ── Test 10: JSON parsing error warning ──────────────────────────────────
printf '\nTest 10: Malformed JSON input produces warning\n'

# Without jq the hook's guard exits before parsing input. Assert whichever
# branch this machine can exercise (same pattern as session-start-test.sh).
warning_out=$(echo 'NOT_JSON{{{' | bash hooks/simplify-ignore.sh 2>&1) || true
if command -v jq >/dev/null 2>&1; then
  assert_eq "warning on bad JSON" "1" "$(printf '%s' "$warning_out" | grep -c 'Warning.*failed to parse')"
else
  assert_eq "missing-jq guard surfaced" "1" "$(printf '%s' "$warning_out" | grep -c 'error: missing jq')"
fi

# ── Tests 11-13: full-lifecycle round-trip fidelity ──────────────────────
# Run the hook end-to-end (Read → [Edit] → Stop) against an isolated
# CLAUDE_PROJECT_DIR and assert the original bytes are recovered exactly.
# These exercise the expand/restore half of the hook, which the
# function-extraction tests above cannot reach.

if command -v jq >/dev/null 2>&1; then

hook_event() {
  # hook_event <project_dir> <tool_name|""> <file_path|"">
  local proj="$1" tool="$2" fp="$3" input
  if [ -n "$tool" ]; then
    input=$(jq -n --arg t "$tool" --arg fp "$fp" \
      '{tool_name:$t, tool_input:{file_path:$fp}}')
  else
    input='{}'
  fi
  printf '%s' "$input" | CLAUDE_PROJECT_DIR="$proj" bash hooks/simplify-ignore.sh
}

# ── Test 11: Read → Stop restores the file byte-identically ──────────────
printf '\nTest 11: Round-trip Read → Stop (byte fidelity)\n'
PROJ="$TMPDIR/rt11"; mkdir -p "$PROJ"
RT="$PROJ/roundtrip.js"
cat > "$RT" <<'EOF'
const a = `template ${literal}`;
// simplify-ignore-start: perf-critical
const secret = "glob*chars? [and] \\backslashes";
hot_loop($HOME);
// simplify-ignore-end
middle line
/* simplify-ignore-start */ const inline = 1; /* simplify-ignore-end */
const b = 2;
EOF
cp "$RT" "$PROJ/roundtrip.orig"

hook_event "$PROJ" "Read" "$RT"
assert_eq "blocks hidden on disk after Read" "2" "$(grep -c 'BLOCK_' "$RT")"
assert_eq "secret absent from disk after Read" "0" "$(grep -c 'secret' "$RT")"

hook_event "$PROJ" "" ""
if cmp -s "$RT" "$PROJ/roundtrip.orig"; then
  assert_eq "Stop restores original bytes" "identical" "identical"
else
  assert_eq "Stop restores original bytes" "identical" "$(cmp "$RT" "$PROJ/roundtrip.orig" 2>&1 | head -1)"
fi

# ── Test 12: Round-trip preserves missing trailing newline ────────────────
printf '\nTest 12: Round-trip with no trailing newline\n'
PROJ="$TMPDIR/rt12"; mkdir -p "$PROJ"
RT="$PROJ/nonewline.js"
printf 'top\n// simplify-ignore-start\nhidden\n// simplify-ignore-end\nbottom' > "$RT"
cp "$RT" "$PROJ/nonewline.orig"

hook_event "$PROJ" "Read" "$RT"
assert_eq "block hidden" "1" "$(grep -c 'BLOCK_' "$RT")"
hook_event "$PROJ" "" ""
if cmp -s "$RT" "$PROJ/nonewline.orig"; then
  assert_eq "no-trailing-newline file restored byte-identically" "identical" "identical"
else
  assert_eq "no-trailing-newline file restored byte-identically" "identical" "differs"
fi

# ── Test 13: Read → model edit → Edit event → Stop keeps the edit ────────
printf '\nTest 13: Round-trip with an edit during the session\n'
PROJ="$TMPDIR/rt13"; mkdir -p "$PROJ"
RT="$PROJ/edited.js"
cat > "$RT" <<'EOF'
const a = 1;
// simplify-ignore-start
const secret = 42;
// simplify-ignore-end
const b = 2;
EOF
cp "$RT" "$PROJ/edited.orig"

hook_event "$PROJ" "Read" "$RT"
# Simulate the model editing the filtered file: append a new line.
printf '%s\n' "const added = true;" >> "$RT"
hook_event "$PROJ" "Edit" "$RT"

assert_eq "disk still placeholdered after Edit" "1" "$(grep -c 'BLOCK_' "$RT")"
assert_eq "secret still absent from disk after Edit" "0" "$(grep -c 'secret' "$RT")"
assert_eq "added line survives re-filter" "1" "$(grep -c 'const added' "$RT")"
BAK=$(ls "$PROJ/.claude/.simplify-ignore-cache"/*.bak 2>/dev/null | head -1)
assert_eq "backup holds real content" "1" "$(grep -c 'const secret = 42' "${BAK:-/dev/null}")"
assert_eq "backup holds the edit" "1" "$(grep -c 'const added' "${BAK:-/dev/null}")"

hook_event "$PROJ" "" ""
EXPECTED="$PROJ/edited.expected"
cp "$PROJ/edited.orig" "$EXPECTED"
printf '%s\n' "const added = true;" >> "$EXPECTED"
if cmp -s "$RT" "$EXPECTED"; then
  assert_eq "Stop restores original + edit byte-identically" "identical" "identical"
else
  assert_eq "Stop restores original + edit byte-identically" "identical" "differs"
fi

else
  printf '\nTests 11-13 skipped: jq not available (hook no-ops without it)\n'
fi

# ── Summary ──────────────────────────────────────────────────────────────
printf '\n══════════════════════════════════════════\n'
printf 'Results: %d passed, %d failed\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
