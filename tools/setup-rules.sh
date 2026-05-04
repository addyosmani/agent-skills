#!/usr/bin/env bash
# setup-rules.sh — symlink batuta-agent-skills rules into a consumer project
# Usage: bash setup-rules.sh [--all | --rule <relative-path> | (interactive)]
# Run from the consumer project root.
# Requires bash >= 4 (uses `mapfile`). On macOS, default /bin/bash is 3.2 — install GNU bash via
# `brew install bash` and invoke as `/opt/homebrew/bin/bash setup-rules.sh ...`.
set -euo pipefail

if (( BASH_VERSINFO[0] < 4 )); then
  echo "ERROR: this script requires bash >= 4 (current: $BASH_VERSION)." >&2
  echo "  macOS users: brew install bash; then invoke as /opt/homebrew/bin/bash $0" >&2
  exit 5
fi

OS="$(uname -s 2>/dev/null || echo unknown)"
IS_WINDOWS=false
[[ "$OS" == MINGW* || "$OS" == MSYS* || "$OS" == CYGWIN* ]] && IS_WINDOWS=true

PLUGIN_PATH="$HOME/.claude/plugins/marketplaces/batuta-agent-skills"
if [[ ! -d "$PLUGIN_PATH/rules" || ! -f "$PLUGIN_PATH/tools/setup-rules.sh" ]]; then
  echo "ERROR: plugin not found at expected location $PLUGIN_PATH" >&2
  echo "  Install with: /plugin marketplace add jota-batuta/batuta-agent-skills && /plugin install batuta-agent-skills@batuta-agent-skills" >&2
  exit 4
fi

RULES_SRC="${PLUGIN_PATH}/rules"
RULES_DST="${PWD}/.claude/rules"

mapfile -t AVAILABLE < <(
  find "$RULES_SRC" -type f -name '*.md' -not -path '*/_meta/*' -not -name 'README.md' -not -name '.gitkeep' \
    | sed "s|${RULES_SRC}/||" | sort
)
[[ ${#AVAILABLE[@]} -eq 0 ]] && { echo "No rules found in: $RULES_SRC" >&2; exit 1; }

MODE="interactive"; SELECTED_RULE=""
if [[ $# -ge 1 ]]; then
  case "$1" in
    --all)  MODE="all" ;;
    --rule) [[ $# -lt 2 ]] && { echo "ERROR: --rule needs an argument" >&2; exit 1; }
            MODE="single"; SELECTED_RULE="$2" ;;
    *)      echo "Usage: $0 [--all | --rule <path>]" >&2; exit 1 ;;
  esac
fi

TO_LINK=()
if   [[ "$MODE" == "all"    ]]; then TO_LINK=("${AVAILABLE[@]}")
elif [[ "$MODE" == "single" ]]; then
  # Reject path traversal, absolute paths, or overly deep paths in rule name
  case "$SELECTED_RULE" in
    *..*|/*|*/*/*/*) echo "ERROR: invalid rule name '$SELECTED_RULE' (no '..', absolute paths, or >2 path segments allowed)" >&2; exit 2 ;;
  esac
  RULE_FILE="${SELECTED_RULE%.md}.md"
  [[ ! -f "${RULES_SRC}/${RULE_FILE}" ]] && { echo "ERROR: not found: ${RULES_SRC}/${RULE_FILE}" >&2; exit 1; }
  TO_LINK=("$RULE_FILE")
else
  echo "Available rules:"
  for rule in "${AVAILABLE[@]}"; do
    read -r -p "  Import '$rule'? [y/N] " ans
    [[ "$ans" =~ ^[Yy]$ ]] && TO_LINK+=("$rule")
  done
fi

[[ ${#TO_LINK[@]} -eq 0 ]] && { echo "Nothing selected. Exiting."; exit 0; }

mkdir -p "$RULES_DST"
CREATED=(); SKIPPED=(); COPIED=()

for rule in "${TO_LINK[@]}"; do
  src="${RULES_SRC}/${rule}"
  dst="${RULES_DST}/$(basename "$rule")"
  if [[ -L "$dst" ]]; then
    [[ "$(readlink "$dst")" == "$src" ]] && { SKIPPED+=("$(basename "$dst")"); continue; }
    rm "$dst"
  elif [[ -e "$dst" ]]; then
    echo "SKIP (non-symlink file exists — remove manually): $dst" >&2; continue
  fi
  # Confine resolved source path to RULES_SRC (prevent path-traversal via symlink target)
  RULES_SRC_REAL="$(cd "$RULES_SRC" && pwd -P)"
  SRC_REAL="$(cd "$(dirname "$src")" 2>/dev/null && pwd -P)/$(basename "$src")"
  case "$SRC_REAL" in
    "$RULES_SRC_REAL"/*) ;;
    *) echo "ERROR: resolved path '$SRC_REAL' escapes RULES_SRC '$RULES_SRC_REAL'" >&2; exit 3 ;;
  esac
  if ! ln -s "$src" "$dst" 2>/dev/null; then
    if $IS_WINDOWS; then
      # Windows without Developer Mode cannot create symlinks. Fall back to a
      # plain copy so the rule still ends up in .claude/rules/. The trade-off:
      # plugin upgrades will not auto-propagate to the project; the operator
      # must re-run setup-rules.sh after a plugin update. The warning at the
      # end of the script makes that explicit.
      if cp "$src" "$dst" 2>/dev/null; then
        COPIED+=("$(basename "$dst") (copied; symlink unavailable without Developer Mode)")
        continue
      else
        echo "ERROR: copy fallback also failed for $dst -> $src" >&2
        echo "  This can happen when the destination directory is read-only or the source path is invalid." >&2
        exit 1
      fi
    else
      echo "ERROR: symlink failed for $dst -> $src" >&2
      echo "  On non-Windows hosts symlink failures usually indicate a permissions or filesystem issue worth investigating before retrying." >&2
      exit 1
    fi
  fi
  CREATED+=("$(basename "$dst") -> $src")
done

echo ""
echo "setup-rules.sh complete  |  plugin: $PLUGIN_PATH  |  dest: $RULES_DST"
[[ ${#CREATED[@]} -gt 0 ]] && printf "  created : %s\n" "${CREATED[@]}"
[[ ${#COPIED[@]} -gt 0 ]] && printf "  copied  : %s\n" "${COPIED[@]}"
[[ ${#SKIPPED[@]} -gt 0 ]] && printf "  skipped : %s\n" "${SKIPPED[@]}"

if (( ${#COPIED[@]} > 0 )); then
  echo ""
  echo "WARNING: ${#COPIED[@]} rule(s) were copied instead of symlinked (Windows without Developer Mode)."
  echo "  Plugin upgrades will NOT auto-propagate to these copies. Re-run this script after"
  echo "  'claude plugin update batuta-agent-skills' to refresh."
  echo "  To enable symlinks (recommended): Settings > For Developers > Developer Mode."
fi

# Code-graph engine bootstrap is a separate operator-side step (changed in v4.0,
# ADR-0013). Coupling rule import to the engine install dragged unrelated infra
# into projects that only wanted the rule symlinks. Operators who want both run
# the two scripts in sequence; the message below makes that explicit.
echo ""
echo "Note: the code-graph engine bootstrap is a separate step. To install"
echo "      codebase-memory-mcp, run:"
echo "        bash $(dirname "$0")/setup-code-graph.sh"
