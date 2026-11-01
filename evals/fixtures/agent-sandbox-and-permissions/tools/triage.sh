#!/bin/bash
# Called by the harness once per new issue.
# The issue URL comes straight from the tracker; anyone can open an issue.
set -euo pipefail

ISSUE_URL="$1"
echo "triaging $ISSUE_URL" >&2

git fetch --all --quiet
gh issue comment "$ISSUE_URL" --body "Reproduced on $(git rev-parse --short HEAD)"
