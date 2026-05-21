#!/usr/bin/env bash

set -eu

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
HOOKS_DIR="${REPO_DIR}/.githooks"

if [ ! -d "${HOOKS_DIR}" ]; then
  echo "Error: hooks directory not found: ${HOOKS_DIR}" >&2
  exit 1
fi

chmod +x "${HOOKS_DIR}/post-merge"
chmod +x "${HOOKS_DIR}/post-rewrite"

git -C "${REPO_DIR}" config core.hooksPath .githooks

echo "Git hooks installed with core.hooksPath=.githooks"
