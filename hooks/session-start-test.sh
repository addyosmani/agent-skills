#!/bin/bash
# session-start-test.sh - Tests for the SessionStart hook stdout payload

set -euo pipefail

tmp_payload="$(mktemp)"
trap 'rm -f "$tmp_payload"' EXIT

bash hooks/session-start.sh > "$tmp_payload"

PAYLOAD_PATH="$tmp_payload" node <<'NODE'
const fs = require('fs');

const payload = fs.readFileSync(process.env.PAYLOAD_PATH, 'utf8');

if (!payload.includes('agent-skills loaded.')) {
  throw new Error('payload is missing startup preface');
}

if (!payload.includes('# Using Agent Skills')) {
  throw new Error('payload is missing using-agent-skills content');
}

console.log('session-start stdout payload OK');
NODE
