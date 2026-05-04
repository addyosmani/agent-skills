#!/usr/bin/env bash
# 15-new-rules-shape.sh
# Validates structural invariants for the two new rules introduced in the
# agent-hardening slice (plan: docs/plans/active/2026-05-04-agent-hardening.md):
#   rules/core/no-hardcoded-magic.md
#   rules/core/model-routing.md
#
# Four checks per rule (per batuta-rule-authoring §A.4/§A.5):
#   (a) ## Anti-patterns section is present.
#   (b) ## Anti-patterns section is non-empty (has at least one non-blank line after heading).
#   (c) Line count is between 50 and 200 inclusive.
#   (d) Frontmatter does NOT contain `name:` or `description:` keys (SKILL.md-only fields).
#
# Contract introduced in v3.9 (agent-hardening PR).

set -uo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

case_name="15-new-rules-shape"
echo "[${case_name}] starting"

failed=0

ok()   { echo "  OK   $1"; }
miss() { echo "  MISS $1"; failed=1; }

# ---------------------------------------------------------------------------
# validate_rule <relative-path-from-repo-root>
# Runs the four structural checks against one rule file.
# ---------------------------------------------------------------------------
validate_rule() {
  local rel_path="$1"
  local abs_path="${REPO_ROOT}/${rel_path}"

  # File must exist (rules-builder creates it; if not, every check fails)
  if [[ ! -f "$abs_path" ]]; then
    miss "${rel_path} — file missing (rules-builder has not created it yet)"
    return
  fi

  # (a) ## Anti-patterns heading present
  if grep -q "^## Anti-patterns" "$abs_path"; then
    ok "${rel_path} — ## Anti-patterns heading present"
  else
    miss "${rel_path} — ## Anti-patterns heading missing (required per §A.4)"
  fi

  # (b) ## Anti-patterns section is non-empty
  # Strategy: grab lines after the heading, skip blanks, stop at next ## heading.
  # If at least one non-blank, non-heading line exists, the section has content.
  local after_heading
  after_heading="$(awk '/^## Anti-patterns/{found=1; next} found && /^## /{exit} found{print}' "$abs_path" \
                   | grep -v '^[[:space:]]*$' || true)"
  if [[ -n "$after_heading" ]]; then
    ok "${rel_path} — ## Anti-patterns section is non-empty"
  else
    miss "${rel_path} — ## Anti-patterns section is empty (at least one example required per §A.4)"
  fi

  # (c) Line count 50-200
  local line_count
  line_count="$(wc -l < "$abs_path")"
  if [[ "$line_count" -ge 50 && "$line_count" -le 200 ]]; then
    ok "${rel_path} — line count ${line_count} within 50-200 (§A.5)"
  else
    miss "${rel_path} — line count ${line_count} outside 50-200 range (§A.5)"
  fi

  # (d) Frontmatter must NOT contain `name:` or `description:` (SKILL.md-only fields).
  # Only inspect the YAML frontmatter block (between the first pair of --- delimiters).
  # Absence of frontmatter is fine — the check passes vacuously.
  local in_frontmatter=0
  local found_skill_key=0
  while IFS= read -r line; do
    if [[ "$in_frontmatter" -eq 0 && "$line" == "---" ]]; then
      in_frontmatter=1
      continue
    fi
    if [[ "$in_frontmatter" -eq 1 && "$line" == "---" ]]; then
      break
    fi
    if [[ "$in_frontmatter" -eq 1 ]]; then
      if echo "$line" | grep -qE "^(name|description):"; then
        found_skill_key=1
        break
      fi
    fi
  done < "$abs_path"

  if [[ "$found_skill_key" -eq 0 ]]; then
    ok "${rel_path} — frontmatter does not contain name:/description: (SKILL.md-only fields)"
  else
    miss "${rel_path} — frontmatter contains name: or description: (forbidden in rule files per §A.5; those keys belong in SKILL.md only)"
  fi
}

# ---------------------------------------------------------------------------
# Run checks for both new rules
# ---------------------------------------------------------------------------
validate_rule "rules/core/no-hardcoded-magic.md"
validate_rule "rules/core/model-routing.md"

if [[ ${failed} -eq 0 ]]; then
  echo "[${case_name}] PASS"
  exit 0
else
  echo "[${case_name}] FAIL"
  exit 1
fi
