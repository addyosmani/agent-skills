---
name: hol-guard-runtime-safety
description: Establishes a fail-closed HOL Guard boundary around a supported local coding-agent harness before side-effecting work. Use when an agent may execute commands, modify files, call tools or MCP servers, or perform destructive operations and HOL Guard runtime protection is requested or required.
---

# HOL Guard Runtime Safety

## Overview

Use HOL Guard as the local runtime boundary around a supported coding-agent harness before side-effecting work begins. This is tool-specific runtime enforcement, not a replacement for application security review, repository permissions, human approvals, tests, or the `security-and-hardening` skill.

## When to Use

Use this skill when:
- A local coding agent will execute commands, modify files, call tools or MCP servers, or perform other state-changing work.
- The user asks to set up, verify, or run HOL Guard protection around a supported local harness.
- A risky workflow must fail closed when runtime protection cannot be proven.

Do not use this skill for read-only security review of application code; use `security-and-hardening` for that. Do not claim that HOL Guard replaces project-specific authorization, review, testing, or service-side controls.

## Process

### 1. Preserve the existing workspace and controls

Inspect the repository state before making setup changes. Do not read `.env` files. Keep the project's own permission prompts, review gates, sandboxing, tests, and deployment controls in force.

### 2. Verify the HOL Guard CLI

Probe the actual CLI directly:

```bash
hol-guard --version
```

If it is unavailable and the task explicitly includes runtime setup, prefer an isolated install:

```bash
pipx install hol-guard
```

If `pipx` is unavailable, stop and explain the requirement rather than silently changing the user's Python environment.

### 3. Discover the supported harness

```bash
hol-guard status
hol-guard detect --json
```

Use only the exact supported harness identifier returned by `hol-guard detect --json`. Do not maintain a local list of harness names or aliases. If no supported harness is detected, stop before side-effecting work.

### 4. Bootstrap and install protection

```bash
hol-guard bootstrap
hol-guard install <harness>
```

Use Guard-owned setup commands rather than hand-editing user-level harness configuration.

### 5. Prove the protected launch path

Run the protected path in dry-run mode first:

```bash
hol-guard run <harness> --dry-run
```

If the dry run errors, reports an unexpected mutation, or cannot prove a protected path, stop. Do not fall back to launching the agent unprotected.

Then launch through HOL Guard and verify the resulting protection state:

```bash
hol-guard run <harness>
hol-guard doctor <harness> --json
hol-guard status
```

Only claim the harness is protected when current command output proves it.

### 6. Continue the original workflow without bypasses

Proceed with the intended agent task only after protection is proven. Preserve every native approval, test, review, and deployment gate. If Guard queues or blocks work, inspect the request instead of bypassing it:

```bash
hol-guard approvals
hol-guard approvals open
```

Approve or deny only after understanding the requested scope and risk.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The repository already has security guidance." | Code hardening and runtime harness enforcement are different controls. Use both when both apply. |
| "The harness is probably supported." | Support is runtime state. Use `hol-guard detect --json` and the exact identifier it returns. |
| "Dry-run failed, but I can launch normally and check afterward." | That removes the pre-execution boundary. Stop until the protected path is proven. |
| "HOL Guard is running, so native approvals are redundant." | HOL Guard complements project and provider controls; it does not replace them. |

## Red Flags

- Hard-coded harness names instead of using `hol-guard detect --json`.
- A direct harness launch after Guard setup, dry-run, or doctor fails.
- Manual edits to user-level harness configuration that Guard can own.
- Claims of protection without current `doctor` or `status` evidence.
- Skipping repository or service-specific approval, test, or deployment controls.

## Verification

Before declaring the workflow protected, confirm:
- [ ] `hol-guard --version` succeeded.
- [ ] `hol-guard detect --json` returned the exact supported harness identifier in use.
- [ ] `hol-guard bootstrap` and `hol-guard install <harness>` completed without bypasses.
- [ ] `hol-guard run <harness> --dry-run` completed without unexpected mutation or error.
- [ ] The real harness launch went through `hol-guard run <harness>`.
- [ ] `hol-guard doctor <harness> --json` and `hol-guard status` prove current protection.
- [ ] Native project permissions, review, tests, and deployment controls remain in force.
