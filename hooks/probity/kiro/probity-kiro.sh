#!/usr/bin/env bash
#
# Probity <-> Kiro PreToolUse shim.
#
# Probity (github.com/nizos/probity) ships vendor adapters for
# claude-code, codex, and github-copilot -- but not Kiro. This shim lets
# the SAME probity.config.ts enforce the mysudovpn-ios workflow under Kiro
# by translating between Kiro's hook contract and the claude-code one:
#
#   1. Kiro fires `preToolUse` with an event JSON on stdin:
#        {"hook_event_name":"preToolUse","cwd":..,"tool_name":"fs_write",
#         "tool_input":{...}}
#      and BLOCKS a tool when the hook exits 2 (STDERR is returned to the LLM).
#
#   2. Probity's claude-code vendor expects a Claude-shaped payload
#        {"tool_name":"Write|Edit|Bash|..","tool_input":{..},"cwd":..,
#         "transcript_path":..}
#      and signals a block by printing a deny JSON to stdout with exit 0:
#        {"hookSpecificOutput":{"permissionDecision":"deny",
#         "permissionDecisionReason":"Probity: ..."}}
#
# The event<->payload and response<->reason translation lives in
# probity-kiro-translate.py (kept out of this script so stdin pipes
# cleanly). We attach a transduced transcript so history-based rules
# (green-gate, TDD) work, then convert a deny response into `exit 2`.
#
# Fail-safe posture: a genuine rule violation blocks (exit 2). Shim-internal
# errors (bad JSON) warn on STDERR and ALLOW (exit 0) so a tooling bug never
# wedges the session; the commit green-gate remains the correctness backstop.
# A missing Probity install is different: allowing would switch every rule off
# without a trace (issue #90). In a worktree without node_modules the shim
# uses the main worktree's install; when Probity is installed nowhere it
# blocks every call except the package install that fixes it.

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BIN_DIR="$ROOT/node_modules/.bin"
# A worktree beside the main checkout (`git worktree add ../<name>`) carries
# this shim but usually no node_modules: run the main worktree's Probity, and
# let this tree's config import the main worktree's packages through
# NODE_PATH (consulted only after this tree's own node_modules).
if [ ! -x "$BIN_DIR/probity" ] && command -v git >/dev/null 2>&1; then
  MAIN_TREE="$(git -C "$ROOT" worktree list --porcelain 2>/dev/null | sed -n '1s/^worktree //p')"
  if [ -n "$MAIN_TREE" ] && [ -x "$MAIN_TREE/node_modules/.bin/probity" ]; then
    BIN_DIR="$MAIN_TREE/node_modules/.bin"
    export NODE_PATH="${NODE_PATH:+$NODE_PATH:}$MAIN_TREE/node_modules"
  fi
fi
# probity-claude (from @jjchill/probity-rules) runs Probity in the worktree a
# call targets, including a shell write into another worktree by path, and
# guards edits to the config; the bare probity bin is the fallback for an
# install without it.
PROBITY="$BIN_DIR/probity-claude"
[ -x "$PROBITY" ] || PROBITY="$BIN_DIR/probity"
TRANSLATE="$SCRIPT_DIR/probity-kiro-translate.py"
TRANSDUCER="$SCRIPT_DIR/kiro-transcript-to-claude.py"

EVENT="$(cat)"

# Probity discovers probity.config.ts and node_modules from cwd.
cd "$ROOT" 2>/dev/null || true

# --- Transcript: transduce Kiro's session JSONL to the Anthropic shape ----
# kiro-cli 2.x keeps it at ~/.kiro/sessions/cli/$KIRO_SESSION_ID.jsonl;
# 3.x at ~/.kiro/sessions/<workspace>/sess_<id>/messages.jsonl, named by
# the event's session_id (#176). The helper finds either.
TRANSCRIPT_TMP=""
KIRO_JSONL=""
if command -v python3 >/dev/null 2>&1; then
  KIRO_JSONL="$(printf '%s' "$EVENT" | python3 "$TRANSLATE" transcript-path 2>/dev/null)"
fi
if [ -n "$KIRO_JSONL" ]; then
  if [ -f "$KIRO_JSONL" ]; then
    # Trailing X's only: BSD/macOS mktemp substitutes a run of X's solely when
    # it ends the template. A `.jsonl` suffix here would be taken literally,
    # colliding on every second invocation. Probity reads the path, not the
    # extension, so no suffix is needed.
    TRANSCRIPT_TMP="$(mktemp "${TMPDIR:-/tmp}/probity-kiro-transcript.XXXXXX")"
    if ! python3 "$TRANSDUCER" "$KIRO_JSONL" >"$TRANSCRIPT_TMP" 2>/dev/null; then
      rm -f "$TRANSCRIPT_TMP"
      TRANSCRIPT_TMP=""
    fi
  fi
fi
export TRANSCRIPT_TMP

cleanup() { [ -n "$TRANSCRIPT_TMP" ] && rm -f "$TRANSCRIPT_TMP"; }
trap cleanup EXIT

# --- Translate the Kiro event to a claude-code payload --------------------
# Empty stdout == non-mutating tool (or unparseable) -> allow, skip probity.
# A non-zero exit is a write or shell tool the translator can't express, or
# a translator failure: blocked, since allowing would skip every rule.
PAYLOAD="$(printf '%s' "$EVENT" | python3 "$TRANSLATE" event)"
TRANSLATED=$?
if [ "$TRANSLATED" -ne 0 ]; then
  printf '%s\n' "${PAYLOAD:-Probity: the Kiro shim could not translate this call (exit $TRANSLATED), so it is blocked.}" >&2
  exit 2
fi
if [ -z "$PAYLOAD" ]; then
  exit 0
fi

if [ ! -x "$PROBITY" ]; then
  if printf '%s' "$PAYLOAD" | python3 "$TRANSLATE" install; then
    exit 0
  fi
  echo "Probity: not installed in $ROOT, so no rule can judge this call. Run npm ci in $ROOT." >&2
  exit 2
fi

# --- Invoke Probity and translate its response to Kiro's exit codes -------
# kiro-cli 3.x lets a call through when its hook runs past 60 s, so on a
# 3.x event Probity gets a deadline below that and a late verdict blocks.
DEADLINE="$(printf '%s' "$EVENT" | python3 "$TRANSLATE" deadline)"
if [ -n "$DEADLINE" ]; then
  RESPONSE="$(printf '%s' "$PAYLOAD" | python3 "$TRANSLATE" run "$DEADLINE" "$PROBITY" --agent claude-code 2>/dev/null)"
  if [ $? -eq 124 ]; then
    echo "Probity took longer than ${DEADLINE}s to judge this call. kiro-cli 3.x lets a call through when its hook runs past 60 s, so the shim blocks it instead. Retry it; if this keeps happening, use a faster judge or raise PROBITY_KIRO_TIMEOUT_S (below 60)." >&2
    exit 2
  fi
else
  RESPONSE="$(printf '%s' "$PAYLOAD" | "$PROBITY" --agent claude-code 2>/dev/null)"
fi
REASON="$(printf '%s' "$RESPONSE" | python3 "$TRANSLATE" reason)"

if [ -n "$REASON" ]; then
  printf '%s\n' "$REASON" >&2
  exit 2
fi

exit 0
