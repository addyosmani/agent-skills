#!/bin/bash
# session-start-test.sh - Tests for the SessionStart hook JSON payload
#
# Two checks. First, the script run from the repo emits the standard envelope,
# with the meta-skill when jq is present and the jq guidance when it is not.
# Second, the same holds when the script lives under a path with a space, a
# single quote, or non-ASCII letters, and is run from an unrelated directory.
# That is the shape of a Windows home folder such as C:\Users\First Last\,
# where an unquoted expansion once word-split the path and the hook died with
# "Is a directory" (#214). The quoting is in place; this keeps it there.

set -euo pipefail

tmp_root="$(mktemp -d)"
trap 'rm -rf "$tmp_root"' EXIT

has_jq=0
if command -v jq >/dev/null 2>&1; then
  has_jq=1
fi

# check_payload <file> <label>: assert the JSON in <file> is a valid envelope.
check_payload() {
  HAS_JQ="$has_jq" PAYLOAD_PATH="$1" LABEL="$2" node <<'NODE'
const fs = require('fs');

const payload = JSON.parse(fs.readFileSync(process.env.PAYLOAD_PATH, 'utf8'));
const hasJq = process.env.HAS_JQ === '1';
const out = payload.hookSpecificOutput;

if (!out || typeof out !== 'object') {
  throw new Error('payload is missing hookSpecificOutput (hosts reject other shapes)');
}
if (out.hookEventName !== 'SessionStart') {
  throw new Error(`expected hookEventName SessionStart, got ${out.hookEventName}`);
}
if (typeof out.additionalContext !== 'string' || !out.additionalContext.trim()) {
  throw new Error('additionalContext must be a non-empty string');
}

const ctx = out.additionalContext;
if (hasJq) {
  if (!ctx.includes('agent-skills loaded.')) {
    throw new Error('additionalContext is missing startup preface');
  }
  if (!ctx.includes('# Using Agent Skills')) {
    throw new Error('additionalContext is missing using-agent-skills content');
  }
} else if (!ctx.includes('jq is required')) {
  throw new Error('additionalContext is missing jq fallback guidance');
}

console.log(`session-start JSON payload OK (${process.env.LABEL})`);
NODE
}

# ── 1. From the repo checkout ────────────────────────────────────────────────
payload="$(bash hooks/session-start.sh)"
printf '%s' "$payload" > "$tmp_root/payload.json"
check_payload "$tmp_root/payload.json" "repo checkout"

# ── 2. Path matrix: space, single quote, non-ASCII ───────────────────────────
# The script finds the meta-skill relative to its own location, so each copy
# needs hooks/ and skills/using-agent-skills/ side by side. Run from / so a
# relative lookup from the cwd would fail rather than mask a quoting bug.
i=0
for name in "with space" "it's" "ünïcödé"; do
  i=$((i + 1))
  root="$tmp_root/$name/agent-skills"
  mkdir -p "$root/hooks" "$root/skills/using-agent-skills"
  cp hooks/session-start.sh "$root/hooks/"
  cp skills/using-agent-skills/SKILL.md "$root/skills/using-agent-skills/"

  if ! payload="$(cd / && bash "$root/hooks/session-start.sh")"; then
    echo "session-start.sh exited non-zero under path: $root" >&2
    exit 1
  fi
  printf '%s' "$payload" > "$tmp_root/payload-$i.json"
  check_payload "$tmp_root/payload-$i.json" "path: $name"
done
