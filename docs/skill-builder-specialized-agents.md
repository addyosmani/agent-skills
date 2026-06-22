# Skill Builder and Specialized Agents: Chris Quick Start

This package is source-only. It creates and validates repository artifacts; it does not install a skill, change Bob's runtime, or dispatch an agent.

## Create

Run the generator without `--go` first. It prints the target files and the exact apply command while writing nothing:

```bash
skills/skill-builder-specialized-agents/scripts/create-skill-agent.sh --root "$PWD" --name example-skill --purpose "validate example release plans" --trigger "a release plan needs a repeatable safety review" --scope "source plans and fixture files only" --agent-name example-release-reviewer
```

Review the preview, then repeat its `NEXT:` command containing `--go`.

## Validate

Validate the created skill and optional specialist:

```bash
skills/skill-builder-specialized-agents/scripts/validate-skill-agent.sh --skill skills/example-skill/SKILL.md
skills/skill-builder-specialized-agents/scripts/validate-skill-agent.sh --agent agents/example-release-reviewer.md
skills/skill-builder-specialized-agents/scripts/validate-skill-agent.sh --instructions AGENTS.md
```

Preview packaging, then repeat the printed command with `--go`:

```bash
skills/skill-builder-specialized-agents/scripts/package-skill.sh --skill-dir skills/example-skill
```

Copy `skills/skill-builder-specialized-agents/templates/dispatch-contract.md` into the task's SPEC/report area. Replace every placeholder, then validate it:

```bash
skills/skill-builder-specialized-agents/scripts/validate-skill-agent.sh --contract /absolute/path/to/dispatch-contract.md
```

`FAIL` lists every contract problem. `STOP` means do not dispatch. Apply the printed `NEXT` action and rerun validation.

## Route

- Bob owns orchestration and the controlling SPEC.
- Cursor is the default build/authoring route.
- Pi/Codex handles escalation, review, and audit.
- OpenCode is valid only when Chris explicitly requested it and the contract records `oc_explicitly_requested: true`.
- Quick/read-only work may use `spec: NONE`; all non-trivial work needs an existing, non-placeholder absolute SPEC path.

## Activate later

Runtime activation is intentionally separate. A future rollout must choose either a configured external skills directory or a reviewed copy into the live Hermes skills directory, validate live discovery, and obtain explicit approval before any restart or configuration change. This package performs none of those actions.

Generation requires an assigned Git repository/worktree with `AGENTS.md`, `HANDOFF.md`, `skills/`, and `agents/`. Packaging accepts only ZIP output beneath that repository's `skills/` directory.
