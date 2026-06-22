#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
export SKILL_AGENT_ENTRYPOINT="$SCRIPT_DIR/package-skill.sh"
exec python3 "$SCRIPT_DIR/../assets/package_skill.py" "$@"
