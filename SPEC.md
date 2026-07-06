# Spec: Native Pi Coding Agent Integration

## Assumptions

```
ASSUMPTIONS I'M MAKING:
1. The audience is pi users who want to use agent-skills in their daily workflow
2. Pi v0.80.3 implements the Agent Skills standard natively — no plugin needed
3. Skills are auto-discovered from ~/.agents/skills/ and skills/ convention directories
4. Pi loads AGENTS.md from the project root, parent directories, and ~/.pi/agent/AGENTS.md
5. Pi's built-in tools include read (used for skill loading), not a dedicated skill tool
6. /skill:name commands are available (enableSkillCommands defaults to true)
7. The integration is pure documentation + agent instructions — no code changes to pi needed
8. No new skills are being added — only setup documentation
→ Correct me now or I'll proceed with these.
```

## Objective

Add native integration support for the [pi coding agent](https://pi.dev) to the agent-skills repository so pi users can discover, install, and use all 24 skills with zero configuration.

**Success criteria:**
- A pi user can clone the repo to `~/.agents/skills/` and have all skills auto-discover
- A pi user can run `pi install git:github.com/addyosmani/agent-skills` and have all skills available
- The setup guide explains how pi's native Agent Skills standard support works
- The AGENTS.md tells pi agents how to load and execute skills (using `read`, not a `skill` tool)
- The README lists pi alongside Claude Code, OpenCode, Cursor, etc. as a supported tool

## Non-Goals

- NOT adding a `package.json` with pi manifest (unnecessary — convention directories suffice)
- NOT creating a `.pi/` directory (no project-local config needed)
- NOT modifying any skill content, hooks, commands, or reference checklists
- NOT creating any extensions or custom tools for pi
- NOT changing the project structure counts or cosmetic metadata in README/CLAUDE.md

## Files to Change

| File | Change Type | Description |
|------|-------------|-------------|
| `docs/pi-setup.md` | **Create** | Full setup & integration guide for pi users |
| `AGENTS.md` | **Modify** | Add "Pi Integration" section after OpenCode section |
| `README.md` | **Modify** | Add Pi to native integration dropdown (between Kiro and Codex) |

## Boundaries

- **Always:** Verify every pi-specific claim against official pi documentation before committing
- **Always:** Follow the structure and tone of existing setup guides (opencode-setup.md, gemini-cli-setup.md)
- **Always:** Keep changes scoped to pi — no cosmetic or unrelated changes
- **Ask first:** Any change to skills/, references/, hooks/, .claude/, or agents/ content
- **Never:** Add deprecated or unverified claims about pi's behavior
- **Never:** Include planning artifacts (tasks/) in the final commit

## Verification

- [ ] pi discovers all 24 skills from `~/.agents/skills/addyosmani-agent-skills/`
- [ ] pi reads and follows the Pi Integration section from AGENTS.md
- [ ] `/skill:name` commands resolve correctly
- [ ] Every claim in docs/pi-setup.md is verified against pi's official documentation
- [ ] README renders correctly with the Pi section
- [ ] CLAUDE.md has zero changes (no scope creep)
- [ ] git diff from main shows exactly 3 files changed (AGENTS.md, README.md, docs/pi-setup.md)

## Open Questions

- Should the README's Pi section include a one-liner install command like the other tools? (Decision: Yes — show both clone and pi install commands)
