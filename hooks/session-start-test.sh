#!/bin/bash
# session-start-test.sh - Tests for the SessionStart hook JSON payload

set -euo pipefail

tmp_payload="$(mktemp)"
trap 'rm -f "$tmp_payload"' EXIT

has_jq=0
if command -v jq >/dev/null 2>&1; then
  has_jq=1
fi

payload="$(bash hooks/session-start.sh)"
printf '%s' "$payload" > "$tmp_payload"

HAS_JQ="$has_jq" PAYLOAD_PATH="$tmp_payload" node <<'NODE'
const fs = require('fs');

const payload = JSON.parse(fs.readFileSync(process.env.PAYLOAD_PATH, 'utf8'));
const hasJq = process.env.HAS_JQ === '1';

const out = payload.hookSpecificOutput;
if (!out || out.hookEventName !== 'SessionStart') {
  throw new Error('expected hookSpecificOutput.hookEventName === SessionStart');
}
if (typeof out.additionalContext !== 'string' || out.additionalContext.length === 0) {
  throw new Error('expected non-empty hookSpecificOutput.additionalContext');
}

const ctx = out.additionalContext;

if (hasJq) {
  if (!ctx.includes('agent-skills loaded.')) {
    throw new Error('additionalContext is missing startup preface');
  }

  if (!ctx.includes('# Using Agent Skills')) {
    throw new Error('additionalContext is missing using-agent-skills content');
  }
} else {
  if (!ctx.includes('jq is required')) {
    throw new Error('additionalContext is missing jq fallback guidance');
  }
}

console.log('session-start JSON payload OK');
NODE
