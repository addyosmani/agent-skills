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

if (hasJq) {
  if (payload.priority !== 'IMPORTANT') {
    throw new Error(`expected IMPORTANT priority, got ${payload.priority}`);
  }

  if (!payload.message.includes('agent-skills loaded.')) {
    throw new Error('message is missing startup preface');
  }

  if (!payload.message.includes('# Using Agent Skills')) {
    throw new Error('message is missing using-agent-skills content');
  }
} else {
  if (payload.priority !== 'INFO') {
    throw new Error(`expected INFO priority when jq is missing, got ${payload.priority}`);
  }

  if (!payload.message.includes('jq is required')) {
    throw new Error('message is missing jq fallback guidance');
  }
}

console.log('session-start JSON payload OK');
NODE
