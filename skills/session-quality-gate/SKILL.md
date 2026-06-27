---
name: session-quality-gate
description: Verifies session quality before ending — catches rationalized incompleteness, stale learning logs, and low disk space. Use whenever ending a complex coding session. Use whenever the agent has made multiple file edits and is about to stop. Use proactively: before you close the terminal, verify you learned something. Use to build the habit of capturing insights over time.
---

# Session Quality Gate

Before you close the terminal: **did I learn something, or did I just ship and forget?**

## Quick Start

```bash
mkdir -p ~/.claude/projects/$(echo $PWD | sed 's/[\\/:]/\\-/g')/memory/growth-log
```

Done. One directory. Add other libraries as the habit builds.

## Why

Code passes tests. Thinking doesn't. `shipping-and-launch` checks production. `code-review-and-quality` checks correctness. This checks **whether you learned**.

Addy Osmani on the verification bottleneck: "As AI generates code faster than humans can read it, the primary bottleneck in software engineering is shifting from creation to code review and verification." This skill is a verification gate at session end.

## When to Use

- Complex task (3+ edits) about to stop
- Long sessions where lessons go undocumented
- Building the habit of capturing insights

## Process

### 1. Self-Audit

Four questions, fast→deep:

| # | Question |
|---|----------|
| 1 | Did I answer everything the user asked? |
| 2 | Did I contradict myself or the rules? |
| 3 | Did I show evidence, or just claim things work? |
| 4 | Am I being honest about the limits? |

Fail any → fix → re-ask. See `self-audit` (anthropics/skills).

### 2. Learning Capture

**Minimum: growth-log.** One directory is enough to start.

```
~/.claude/projects/<project>/memory/
├── growth-log/              # ← START HERE
├── ratings-tracker.md       # Optional
├── decisions/log.md         # Optional
├── output-index.md          # Optional
└── tooling_capabilities.md  # Optional
```

No memory directory → pass. Directory exists, nothing updated → flag. Addy's principle: "First do it, then do it right, then do it better." Start with one. Iterate.

### 3. Disk Check

- <15GB: Block (dev machine). CI/headless: 5GB.
- <50GB: Warn
- 50GB+: Pass

### 4. Rationalization Detection

Patterns (English; extend): "pre-existing issue", "skipping tests for now", "tests broken but we'll fix", "not addressing the failing build".

False positive rate: ~1 in 20. Tune if higher.

## Rules

- Never block without concrete reason (all 5 stale + complex)
- Disk fails open on headless
- Memory dir absent → pass (don't block unenrolled users)

## Anti-Patterns

| What | Why Wrong |
|------|----------|
| Blocking on single stale lib | Only block when all 5 are stale |
| False-alarm on headless disk | No home dir → pass silently |
| Requiring all 5 libs to start | One directory is enough to begin |

## Red Flags

- Agent stopping without self-audit
- Complex edits, no growth-log update
- Disk <15GB, no cleanup
- Same mistake across sessions (learning not captured)

## Verification

- [ ] Self-audit clear
- [ ] Growth-log updated (or dir absent)
- [ ] Disk above threshold
- [ ] No rationalization patterns

## See Also

- `shipping-and-launch` — Production readiness
- `code-review-and-quality` — Code correctness
- `doubt-driven-development` — Surface uncertainty
- `self-audit` (anthropics/skills) — Standalone framework
