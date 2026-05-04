#!/usr/bin/env bash
# 07-code-graph-skill-shape.sh
# Validates the code-graph integration. Updated for v4.0 single-engine
# (codebase-memory-mcp); graphify was deprecated in ADR-0013.
#   (a) SKILL.md frontmatter (name, description) and required sections present.
#   (b) SKILL.md does NOT contain `graphify claude install` as a positive instruction.
#       It MAY appear inside Anti-Rationalizations / Red Flags / Process step text only
#       as a prohibition. We allow occurrences only on lines that also mention
#       'forbidden', 'never', 'do not', 'block', 'kill-switch', or 'red flag' (case-
#       insensitive) — anywhere else is a positive use and fails.
#   (c) SKILL.md documents engine selection (Step 0) and references codebase-memory-mcp.
#   (d) The integrations rule exists and contains the mandatory Anti-patterns section.
#   (e) ADR-0007 exists (historical record of the dual-engine era).
#   (f) Bootstrap scripts exist, are executable, and do NOT write to .claude/settings*.
#   (g) Slash command exists with frontmatter description.
# Contract introduced in v2.8; v4.0 removed graphify-positive assertions.

set -uo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

case_name="07-code-graph-skill-shape"
echo "[${case_name}] starting"

SKILL="${REPO_ROOT}/skills/code-graph/SKILL.md"
RULE="${REPO_ROOT}/rules/integrations/code-graph-usage.md"
ADR="${REPO_ROOT}/docs/adr/0007-code-graph-dual-engine.md"
SETUP="${REPO_ROOT}/tools/setup-code-graph.sh"
CHECK="${REPO_ROOT}/tools/check-code-graph-engines.sh"
SLASH="${REPO_ROOT}/.claude/commands/code-graph.md"

failed=0

ok()   { echo "  OK   $1"; }
miss() { echo "  MISS $1"; failed=1; }
drift(){ echo "  DRIFT $1"; failed=1; }

# --- (a) SKILL.md frontmatter and sections ---
if [[ ! -f "$SKILL" ]]; then
  miss "skills/code-graph/SKILL.md missing"
else
  grep -qE '^name: code-graph$'                "$SKILL" && ok "SKILL.md frontmatter name: code-graph" || miss "SKILL.md frontmatter name: code-graph"
  grep -qE '^description: '                    "$SKILL" && ok "SKILL.md frontmatter description present"   || miss "SKILL.md frontmatter description present"
  grep -qE '^## Overview$'                     "$SKILL" && ok "SKILL.md ## Overview"                       || miss "SKILL.md ## Overview"
  grep -qE '^## When to Use$'                  "$SKILL" && ok "SKILL.md ## When to Use"                    || miss "SKILL.md ## When to Use"
  grep -qE '^## Process$'                      "$SKILL" && ok "SKILL.md ## Process"                        || miss "SKILL.md ## Process"
  grep -qE '^## Anti-Rationalizations$'        "$SKILL" && ok "SKILL.md ## Anti-Rationalizations"          || miss "SKILL.md ## Anti-Rationalizations"
  grep -qE '^## Red Flags$'                    "$SKILL" && ok "SKILL.md ## Red Flags"                      || miss "SKILL.md ## Red Flags"
  grep -qE '^## Verification$'                 "$SKILL" && ok "SKILL.md ## Verification"                   || miss "SKILL.md ## Verification"

  # --- (b) graphify claude install must only appear in negative/prohibitive context ---
  # Find every line mentioning 'graphify claude install' and assert each is on a line
  # that ALSO contains a prohibition keyword.
  bad_lines=$(grep -nE 'graphify claude install' "$SKILL" \
              | grep -ivE 'forbidden|never|do not|don.t|block|kill[- ]?switch|red flag|prohibit|refuse|MUST NOT' \
              || true)
  if [[ -z "$bad_lines" ]]; then
    ok "SKILL.md mentions of 'graphify claude install' are all in prohibitive context"
  else
    drift "SKILL.md contains 'graphify claude install' as a positive instruction:"
    echo "$bad_lines" | sed 's/^/        /'
  fi

  # --- (c) engine selection (Step 0) and engine reference documented ---
  grep -qiE 'step 0.*engine selection|engine selection.*always first' "$SKILL" \
    && ok "SKILL.md documents Step 0 engine selection" \
    || miss "SKILL.md documents Step 0 engine selection"
  grep -qE 'codebase-memory(-mcp)?' "$SKILL" \
    && ok "SKILL.md references the engine codebase-memory-mcp" \
    || miss "SKILL.md references the engine codebase-memory-mcp"
fi

# --- (d) integrations rule ---
if [[ ! -f "$RULE" ]]; then
  miss "rules/integrations/code-graph-usage.md missing"
else
  grep -qE '^title: '                  "$RULE" && ok "rule frontmatter title"          || miss "rule frontmatter title"
  grep -qE '^applies-to: '             "$RULE" && ok "rule frontmatter applies-to"     || miss "rule frontmatter applies-to"
  grep -qE '^last-reviewed: '          "$RULE" && ok "rule frontmatter last-reviewed"  || miss "rule frontmatter last-reviewed"
  grep -qE '^## Inviolable rules$'     "$RULE" && ok "rule ## Inviolable rules"        || miss "rule ## Inviolable rules"
  grep -qE '^## Anti-patterns$'        "$RULE" && ok "rule ## Anti-patterns"           || miss "rule ## Anti-patterns (mandatory per §A.4)"
  # The rule must explicitly forbid graphify claude install (rule 4 in the file).
  grep -qE 'graphify claude install' "$RULE" \
    && ok "rule names 'graphify claude install' (as forbidden)" \
    || miss "rule must name 'graphify claude install' to make the prohibition searchable"
fi

# --- (e) ADR-0007 ---
[[ -f "$ADR" ]] && ok "docs/adr/0007-code-graph-dual-engine.md exists" || miss "docs/adr/0007-code-graph-dual-engine.md missing"

# --- (f) bootstrap scripts ---
if [[ ! -f "$SETUP" ]]; then
  miss "tools/setup-code-graph.sh missing"
else
  [[ -x "$SETUP" ]] && ok "setup-code-graph.sh is executable" || miss "setup-code-graph.sh not executable (chmod +x)"
  # Must NOT write to .claude/settings*.json — that path is on the kill-switch.
  if grep -qE '\.claude/settings[^"]*\.json' "$SETUP" \
      && ! grep -qiE '#.*settings\*\.json|MUST NOT|never|kill-switch' "$SETUP"; then
    drift "setup-code-graph.sh references .claude/settings.json without a comment marking it as forbidden"
  else
    ok "setup-code-graph.sh does not write to .claude/settings*.json"
  fi
  # Must NOT invoke 'graphify claude install'
  if grep -qE 'graphify[[:space:]]+claude[[:space:]]+install' "$SETUP"; then
    drift "setup-code-graph.sh invokes 'graphify claude install' (forbidden)"
  else
    ok "setup-code-graph.sh does not invoke 'graphify claude install'"
  fi

  # v2.9 supply-chain hardening (M1 from GATE 3 audit closure):
  # codebase-memory-mcp must be release-pinned and SHA-256-verified.
  # (graphify pin removed in v4.0 — ADR-0013.)

  # Pin variables present
  grep -qE '^CBM_PIN_TAG=' "$SETUP" \
    && ok "setup-code-graph.sh declares CBM_PIN_TAG" \
    || miss "setup-code-graph.sh must declare CBM_PIN_TAG (codebase-memory-mcp release tag)"

  # codebase-memory-mcp must download release asset, NOT main-branch install.sh
  if grep -qE 'raw\.githubusercontent\.com/DeusData/codebase-memory-mcp/main/' "$SETUP"; then
    drift "setup-code-graph.sh fetches codebase-memory-mcp from raw.githubusercontent main branch (must use release-pinned URL)"
  else
    ok "setup-code-graph.sh does not fetch codebase-memory-mcp from main branch"
  fi
  grep -qE 'github\.com/DeusData/codebase-memory-mcp/releases/download' "$SETUP" \
    && ok "setup-code-graph.sh uses GitHub Release download URL for codebase-memory-mcp" \
    || miss "setup-code-graph.sh must download codebase-memory-mcp from /releases/download/"

  # SHA-256 verification block
  grep -qE 'checksums\.txt' "$SETUP" \
    && ok "setup-code-graph.sh references checksums.txt" \
    || miss "setup-code-graph.sh must download and use checksums.txt"
  grep -qE 'sha256_of|sha256sum|SHA-?256' "$SETUP" \
    && ok "setup-code-graph.sh has SHA-256 verification logic" \
    || miss "setup-code-graph.sh must verify SHA-256 of downloaded asset"
  # The verify must abort on mismatch (BROKEN status). Allow up to 6 lines after
  # the mismatch message for additional err() lines before the status set.
  if grep -A6 'SHA-256 mismatch' "$SETUP" | grep -qE 'CBM_STATUS="BROKEN"'; then
    ok "SHA-256 mismatch correctly aborts install with BROKEN status"
  else
    miss "SHA-256 mismatch must mark CBM_STATUS=BROKEN and return"
  fi

  # v3.1 hardening — gh attestation verify + graceful degrade
  grep -qE 'gh attestation verify' "$SETUP" \
    && ok "setup-code-graph.sh invokes 'gh attestation verify'" \
    || miss "setup-code-graph.sh must invoke 'gh attestation verify' (v3.1)"
  grep -qE 'gh auth status' "$SETUP" \
    && ok "setup-code-graph.sh probes 'gh auth status' before attestation verify" \
    || miss "setup-code-graph.sh must probe 'gh auth status' (graceful degrade)"
  # Attestation verify must hard-abort on failure (CBM_STATUS=BROKEN within 6 lines).
  if grep -A6 'attestation verification failed' "$SETUP" | grep -qE 'CBM_STATUS="BROKEN"'; then
    ok "attestation verify failure aborts install with BROKEN status"
  else
    miss "attestation verify failure must mark CBM_STATUS=BROKEN and return"
  fi
  # When gh is missing, the script must warn (not abort) so the SHA-256 alone
  # gate still ships the binary. This is the graceful-degrade contract.
  if grep -qE 'gh CLI not installed; skipping attestation' "$SETUP"; then
    ok "setup-code-graph.sh warns + continues when gh CLI is missing (graceful)"
  else
    miss "setup-code-graph.sh must warn + continue when gh CLI is missing (graceful degrade)"
  fi
  if grep -qE 'gh CLI present but not authenticated' "$SETUP"; then
    ok "setup-code-graph.sh warns + continues when gh is unauthenticated (graceful)"
  else
    miss "setup-code-graph.sh must warn + continue when gh is not authenticated"
  fi
fi

if [[ ! -f "$CHECK" ]]; then
  miss "tools/check-code-graph-engines.sh missing"
else
  [[ -x "$CHECK" ]] && ok "check-code-graph-engines.sh is executable" || miss "check-code-graph-engines.sh not executable"
fi

# --- (g) slash command ---
if [[ ! -f "$SLASH" ]]; then
  miss ".claude/commands/code-graph.md missing"
else
  grep -qE '^description: ' "$SLASH" && ok "slash frontmatter description present" || miss "slash frontmatter description"
  # Slash must also NOT positively reference graphify claude install
  bad_slash=$(grep -nE 'graphify claude install' "$SLASH" \
              | grep -ivE 'forbidden|never|do not|don.t|block|kill[- ]?switch|red flag|prohibit|refuse|MUST NOT' \
              || true)
  [[ -z "$bad_slash" ]] && ok "slash mentions of 'graphify claude install' are prohibitive only" \
    || { drift "slash contains 'graphify claude install' positively:"; echo "$bad_slash" | sed 's/^/        /'; }
fi

if [[ ${failed} -eq 0 ]]; then
  echo "[${case_name}] PASS"
  exit 0
else
  echo "[${case_name}] FAIL"
  exit 1
fi
