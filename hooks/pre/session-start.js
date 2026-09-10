import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const skillPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "skills",
  "using-agent-skills",
  "SKILL.md",
);

/**
 * Oh My Pi session-start extension. Injects the using-agent-skills meta-skill
 * on the next user turn (silent custom message). Claude Code keeps using
 * hooks/session-start.sh via hooks.json — this file is OMP-only.
 *
 * @param {{ on: Function, sendMessage: Function }} pi
 */
export default function agentSkillsSessionStart(pi) {
  pi.on("session_start", async () => {
    let content;
    if (fs.existsSync(skillPath)) {
      content =
        "agent-skills loaded. Use the skill discovery flowchart to find the right skill for your task.\n\n" +
        fs.readFileSync(skillPath, "utf8");
    } else {
      content =
        "agent-skills: using-agent-skills meta-skill not found. Skills may still be available individually.";
    }

    pi.sendMessage(
      {
        customType: "agent-skills.meta",
        content,
        display: false,
        attribution: "user",
      },
      { deliverAs: "nextTurn" },
    );
  });
}
