#!/usr/bin/env node
// agent-skills session start hook
// Injects the using-agent-skills meta-skill into every new session.
//
// Every output path must emit the standard SessionStart envelope
//   {"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": "..."}}
// Hosts that validate hook output (Codex CLI, Claude Code) reject other shapes.
//
// Node rather than bash + jq so the hook runs unchanged on Windows, where
// neither is present by default (#488). JSON.stringify does the escaping jq
// was doing, so there is no external dependency left to miss.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PREFACE =
  "agent-skills loaded. Use the skill discovery flowchart to find the right skill for your task.";

function emit(additionalContext) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext,
      },
    }) + "\n"
  );
}

// The shell hook picked between a plugin install and a `.claude/hooks` copy
// before choosing a script; exec form passes one path, so the same choice is
// made here instead. Claude Code exports both placeholders to the spawned
// process, so this works however the hook was launched.
const here = dirname(fileURLToPath(import.meta.url));
const candidates = [
  join(here, "..", "skills", "using-agent-skills", "SKILL.md"),
  process.env.CLAUDE_PLUGIN_ROOT &&
    join(process.env.CLAUDE_PLUGIN_ROOT, "skills", "using-agent-skills", "SKILL.md"),
  process.env.CLAUDE_PROJECT_DIR &&
    join(process.env.CLAUDE_PROJECT_DIR, ".claude", "skills", "using-agent-skills", "SKILL.md"),
].filter(Boolean);

function readMetaSkill() {
  for (const candidate of candidates) {
    try {
      return readFileSync(candidate, "utf8");
    } catch {
      // Try the next location.
    }
  }
  return null;
}

{
  const content = readMetaSkill();
  if (content === null) {
    // Absent or unreadable: the individual skills still load, so this is a
    // notice rather than a failure. Exiting non-zero would surface a hook
    // error on every session start for a recoverable condition.
    emit(
      "agent-skills: using-agent-skills meta-skill not found. Skills may still be available individually."
    );
  } else {
    // `$(cat …)` in the shell version strips trailing newlines; match that so
    // the payload is byte-identical to what the bash hook has always produced.
    emit(`${PREFACE}\n\n${content.replace(/\n+$/, "")}`);
  }
}
