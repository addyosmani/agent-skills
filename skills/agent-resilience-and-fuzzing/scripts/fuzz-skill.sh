#!/usr/bin/env bash
# skills/agent-resilience-and-fuzzing/scripts/fuzz-skill.sh
# Simple fuzzing helper for agent-skills that accept command-line arguments.

set -euo pipefail

usage() {
  cat <<EOF
Usage:
  $(basename "$0") --skill SKILL_MD --arg ARG_NAME --type TYPE [--fuzz-type TYPES]

Options:
  --skill      Path to the target skill's SKILL.md.
  --arg        Name of the argument to fuzz.
  --type       Type of the argument: number|string|path|url.
  --fuzz-type  Comma-separated list of fuzzing types: boundary,mismatch,overflow,invalid-format,adversarial.
               Default: boundary,mismatch,overflow.

Example:
  $(basename "$0") \\
    --skill skills/example-skill/SKILL.md \\
    --arg limit \\
    --type number \\
    --fuzz-type boundary,mismatch,overflow
EOF
}

SKILL_MD=""
ARG_NAME=""
ARG_TYPE=""
FUZZ_TYPES="boundary,mismatch,overflow"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skill) SKILL_MD="$2"; shift 2 ;;
    --arg) ARG_NAME="$2"; shift 2 ;;
    --type) ARG_TYPE="$2"; shift 2 ;;
    --fuzz-type) FUZZ_TYPES="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; usage; exit 1 ;;
  esac
done

if [[ -z "$SKILL_MD" || -z "$ARG_NAME" || -z "$ARG_TYPE" ]]; then
  echo "Error: --skill, --arg, and --type are required."
  usage
  exit 1
fi

if [[ ! -f "$SKILL_MD" ]]; then
  echo "Error: Skill file not found: $SKILL_MD"
  exit 1
fi

SKILL_DIR="$(dirname "$SKILL_MD")"
SKILL_NAME="$(basename "$SKILL_DIR")"

echo "=== Fuzzing skill: $SKILL_NAME ==="
echo "Skill file: $SKILL_MD"
echo "Argument: $ARG_NAME ($ARG_TYPE)"
echo "Fuzz types: $FUZZ_TYPES"
echo

generate_fuzz_values() {
  local arg_type="$1"
  local fuzz_types="$2"
  IFS=',' read -ra types <<< "$fuzz_types"

  case "$arg_type" in
    number)
      for ft in "${types[@]}"; do
        case "$ft" in
          boundary) echo -e "-10\n0\n999999999" ;;
          mismatch) echo -e "\"abc\"\nnull\nundefined" ;;
          overflow) echo -e "1e309\n-1e309" ;;
        esac
      done
      ;;
    string)
      for ft in "${types[@]}"; do
        case "$ft" in
          boundary) echo -e "\na\n$(printf 'a%.0s' {1..256})" ;;
          mismatch) echo -e "123\nnull\n{}" ;;
          adversarial) echo -e "<script>alert(1)</script>\n' OR '1'='1" ;;
        esac
      done
      ;;
    path)
      for ft in "${types[@]}"; do
        case "$ft" in
          boundary) echo -e "/nonexistent/path\n/dev/null" ;;
          invalid-format) echo -e "http://not-a-path\n|invalid" ;;
        esac
      done
      ;;
    url)
      for ft in "${types[@]}"; do
        case "$ft" in
          boundary) echo -e "http://0.0.0.0:0" ;;
          invalid-format) echo -e "htt://bad-url\n\"" ;;
          adversarial) echo -e "http://evil.com/<script>alert(1)</script>" ;;
        esac
      done
      ;;
    *) echo "Unsupported type: $arg_type" >&2; exit 1 ;;
  esac
}

FUZZ_VALUES=()
while IFS= read -r value; do
  [[ -n "$value" ]] && FUZZ_VALUES+=("$value")
done < <(generate_fuzz_values "$ARG_TYPE" "$FUZZ_TYPES")

if [[ ${#FUZZ_VALUES[@]} -eq 0 ]]; then
  echo "No fuzz values generated."; exit 0
fi

SKILL_SCRIPT=""
if [[ -d "$SKILL_DIR/scripts" ]]; then
  SKILL_SCRIPT="$(find "$SKILL_DIR/scripts" -maxdepth 1 -type f -name '*.sh' | head -n 1)"
fi

run_skill() {
  local arg_value="$1"
  echo "---- Running with $ARG_NAME=$arg_value ----"
  if [[ -n "$SKILL_SCRIPT" ]]; then
    if "$SKILL_SCRIPT" "--$ARG_NAME=$arg_value" 2>&1; then
      echo "Status: OK"
    else
      echo "Status: FAILED"
    fi
  else
    echo "(No executable script found; stub execution.)"
    echo "Skill: $SKILL_NAME | Arg: $ARG_NAME=$arg_value | Status: STUB"
  fi
  echo
}

for value in "${FUZZ_VALUES[@]}"; do
  run_skill "$value"
done

echo "=== Fuzzing complete for skill $SKILL_NAME ==="
