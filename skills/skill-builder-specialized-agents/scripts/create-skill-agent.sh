#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
export SKILL_AGENT_ENTRYPOINT="$SCRIPT_DIR/create-skill-agent.sh"
exec python3 "$SCRIPT_DIR/../assets/create_skill_agent.py" "$@"
