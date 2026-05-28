#!/bin/bash
# agent-skills session start hook
# Injects the using-agent-skills meta-skill into every new session.
#
# SessionStart hooks add their stdout to the agent's context, so we emit plain
# text. The previous {priority, message} JSON shape is not part of Claude Code's
# SessionStart hook schema and only worked where unrecognized JSON happened to
# be treated as context; printing the content directly is the documented path
# and removes the jq dependency.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_DIR="$(dirname "$SCRIPT_DIR")/skills"
META_SKILL="$SKILLS_DIR/using-agent-skills/SKILL.md"

if [ -f "$META_SKILL" ]; then
  echo "agent-skills loaded. Use the skill discovery flowchart to find the right skill for your task."
  echo
  cat "$META_SKILL"
else
  echo "agent-skills: using-agent-skills meta-skill not found. Skills may still be available individually."
fi
