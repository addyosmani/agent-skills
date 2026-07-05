---
name: personal-context-setup
description: Loads personal context files that make AI agents context-aware about the developer. Use when starting with a new AI coding tool, when agents repeatedly miss individual preferences or constraints, when you want consistent behavior across all projects, or when working in multi-agent setups that need identity continuity.
---

# Personal Context Setup

## Overview

AI coding agents know the codebase. They don't know you. The project's `CLAUDE.md` captures tech stack and conventions, but nothing tells the agent your preferred patterns, your non-negotiable constraints, or how you communicate. Personal context files fill this gap — they're Markdown files that persist your identity across every project, every session, every tool.

## When to Use

- Starting fresh with Claude Code, Cursor, or any AI coding tool
- Agents repeatedly generate code that misses your style or violates your constraints
- You move between projects and want the agent to maintain consistent behavior
- Building multi-agent workflows where agents need to know who they're working for
- Your team uses AI tools and needs to capture individual contributor context

**When NOT to use:** Project-level conventions belong in `CLAUDE.md` / `.cursorrules`. Personal context is the complement — it covers the developer, not the codebase.

## The Four Personal Context Files

Structure personal context in four Markdown files under `.context/`:

```
.context/
  wiki.md           # Who you are
  mental-models.md  # How you decide
  voice.md          # How you write
  protocols.md      # Your non-negotiables
```

### wiki.md — Who Are You?

Capture the stable facts about you that matter to an AI working on your behalf:

```markdown
# Developer Wiki

## Roles
- Senior backend engineer, focusing on distributed systems
- Tech lead for the payments team (5 engineers)

## Current projects
- Project A: rewriting the settlement service in Go
- Project B: migrating from Postgres 13 → 16

## Working style
- Morning focus blocks 8–11am: deep work only, no async
- Prefer async for non-urgent decisions; sync for unblocking

## Team context
- We use linear.app for issues, Slack for async, Notion for ADRs
- Code review: prefer GitHub review over verbal; 24h turnaround expected
```

### mental-models.md — How Do You Decide?

Decision priors for when the agent needs to choose between options:

```markdown
# Decision Priors

## Code quality vs speed
- Prefer correctness over cleverness in production paths
- Accept tactical debt for experiments tagged #throwaway
- Never cut corners on auth, payments, or data integrity

## Dependency choices
- Prefer stdlib over third-party when the gap is small
- Check bundle size before adding a JS dep
- Avoid deps with <500 GitHub stars unless strategic

## Architecture
- Prefer boring technology for critical paths
- New: evaluate against the options in our team ADR template
- Changes to shared DB schema require a team review issue first
```

### voice.md — How Do You Write?

Your communication style for when the agent drafts on your behalf:

```markdown
# Communication Style

## Writing principles
- Direct and short. No throat-clearing.
- Active voice. "We shipped X" not "X was shipped."
- Use examples. Abstract claims without examples = noise.

## Examples of my writing tone
- "The cache invalidation bug is in line 142. Fix: reset TTL on write, not read."
- "Three options: (1) fast + wrong, (2) right + slow, (3) right + fast but risky. I'd pick 3."

## Anti-examples (what I don't write)
- "Great question! I think we should consider..."
- "It's worth noting that..."
- Long preamble before the point

## Channel conventions
- GitHub issues: one sentence description, steps to reproduce, expected vs actual
- Slack: bullet points, max 3, escalate to issue if complex
- PRs: short summary + "What changed" + "Why" (no "How" unless novel)
```

### protocols.md — Your Non-Negotiables

Hard rules the agent should never override without explicit permission:

```markdown
# Protocols

## Security
- Never log sensitive fields (PII, credentials, tokens) even in debug
- Auth checks on all new endpoints, no exceptions
- Always validate input at the system boundary

## Code
- Tests before merging. No coverage regression.
- `main` is always deployable. No WIP commits.
- Comment the WHY, not the WHAT

## Communication
- No commitments without checking capacity first
- Never send a draft as final without a review pass
- Escalate blockers the same day; don't sit on them
```

## Loading Personal Context

### Option 1: Import in CLAUDE.md (recommended)

Add to your global `~/.claude/CLAUDE.md`:

```markdown
@~/.context/wiki.md
@~/.context/mental-models.md
@~/.context/voice.md
@~/.context/protocols.md
```

Every session in every project starts with your personal context loaded.

### Option 2: Session-start skill

If you prefer per-project control, install a `load-context` skill that reads the files at session start and adds their content to the context window.

### Option 3: Context Kit (reference implementation)

[Context Kit](https://github.com/JDDavenport/context-kit) is an open-source starter pack that ships the four templates above plus five Claude Code skills (open-loops tracker, session digest, CRM, morning briefing, watcher).

One-command install:
```bash
curl -fsSL https://raw.githubusercontent.com/JDDavenport/context-kit/main/install.sh | bash
```

## Maintenance

Personal context files are low-churn. A quarterly review is usually enough:

- **wiki.md**: Update when roles, projects, or team structure changes
- **mental-models.md**: Update after a major decision that revealed a new prior
- **voice.md**: Rarely changes; add an example if you notice a new pattern
- **protocols.md**: Add a rule whenever you catch yourself explaining the same constraint twice

## Common Mistakes

| Mistake | Better approach |
|---|---|
| Putting project context in personal files | Project conventions → `CLAUDE.md`; personal priors → `.context/` |
| Writing aspirational rather than actual priors | Write what you actually do, not what you wish you did |
| Making files too long | If any file exceeds ~200 lines, it's covering two concerns — split it |
| Treating protocols as guidelines | If it's truly non-negotiable, say "never" or "always" explicitly |

## Verification

After setting up personal context files:

- [ ] Agent can answer "What projects am I currently focused on?" without being told
- [ ] Agent follows your decision priors when choosing between options (test with a deliberate tradeoff scenario)
- [ ] Agent writes in your voice when drafting (compare a generated message to your examples)
- [ ] Agent applies your protocols without prompting (add a new endpoint; check if auth was included automatically)
- [ ] Context loads on session start across at least two different projects
