<!--
  This document is for developers evaluating the project. It is NOT a skill and
  is not meant to be loaded into an agent's context. It lives in docs/ so it
  stays out of the agent's working set.
-->

# How agent-skills compares

People often ask how **agent-skills** relates to two other popular "skills for coding agents" collections: **Superpowers** (by Jesse Vincent / obra) and **Matt Pocock's skills**. All three are good, share a lot of DNA, and are worth learning from. This page is an honest map of how they're *shaped* differently so you can pick the one that fits how you work - or borrow from more than one.

> **TL;DR** - They optimize for different moments. **agent-skills** organizes the *whole product lifecycle* (Define → Plan → Build → Verify → Review → Ship) with review personas and anti-rationalization guards. **Superpowers** leans into *autonomous, reasoning-heavy* runs with subagents and worktree isolation. **Matt Pocock's skills** are a *sharp, personal Claude Code toolkit* distilled from one expert's daily workflow. None of them is "best" in the abstract - it depends on the work in front of you.

---

## At a glance

| | **agent-skills** | **Superpowers** | **Matt Pocock's skills** |
|---|---|---|---|
| **Core idea** | Encode the full senior-engineering lifecycle as skills | A complete development *methodology* built on composable skills | One expert's `.claude` workflow, open-sourced |
| **Organizing principle** | SDLC **phases** (Define→Plan→Build→Verify→Review→Ship) with a meta-skill router | Disciplined execution loop (brainstorm → plan → execute) | A curated toolbox of focused commands |
| **Lifecycle coverage** | Broad - idea refinement, API/UI design, security, performance, CI/CD, deprecation, ADRs, launch | Deep on the core build loop (TDD, debugging, planning, review) | Planning + build + tooling + knowledge mgmt, opinionated |
| **Entry points** | Slash commands mapped 1:1 to phases (`/spec` `/plan` `/build` `/test` `/review` `/code-simplify` `/ship`, plus `/webperf`) | Commands like `/brainstorming`, `/execute-plan` | Slash commands like `/tdd`, `/grill-me`, `/diagnose`, `/grill-with-docs` |
| **Tooling reach** | Multi-tool: Claude Code, Cursor, Gemini CLI, Antigravity, OpenCode, Windsurf, Copilot | Multi-tool: Claude Code, Codex, Gemini CLI, OpenCode, Cursor, Copilot CLI, Factory Droid | Claude Code-first (also usable with Codex) |
| **Distinctive mechanisms** | Anti-rationalization tables + Red Flags in every skill; review **personas** with parallel fan-out in `/ship`; reference checklists | Subagent-driven development with two-stage review; git-worktree isolation; skills-that-write-skills | "Grill me" requirement interrogation; strict agent-level TDD; pre-commit/git guardrails |
| **Best for** | Driving a feature through every phase with a human checkpoint at each | Long, autonomous, reasoning-heavy or exploratory work | A pragmatic, battle-tested daily loop for TypeScript-style projects |

*(Adoption numbers for these projects are cited wildly differently across blogs; we've left them out rather than repeat unverified figures.)*

---

## The three projects, in their own terms

### Superpowers - obra
A full software-development methodology built on composable skills. It bets on **autonomy and upfront reasoning**: Socratic brainstorming before code, fresh subagents that execute tasks and get a two-stage review (spec compliance, then code quality), and git worktrees so parallel work stays isolated. Its TDD discipline is strict - it will delete prematurely written code to hold the RED→GREEN→REFACTOR line. If you want to hand off a sizable chunk and come back to a reviewed result, this is the shape built for that.

**Repo:** <https://github.com/obra/superpowers>

### Matt Pocock's skills - mattpocock
Matt open-sourced the actual `.claude` directory he uses day to day - a tight set of focused Claude Code skills. The standouts are `/tdd` (enforces red-green-refactor at the agent level) and `/grill-me` (interrogates your requirements before any code). It also covers PRD writing, issue breakdown, interface design, architecture passes, bug triage, pre-commit/git guardrails, and knowledge management. It's personal and opinionated in the best way: it reflects how one very good engineer actually ships, rather than trying to be an exhaustive framework.

**Repo:** <https://github.com/mattpocock/skills> · related: <https://github.com/mattpocock/agent-rules-books>

### agent-skills - this project
agent-skills organizes the **entire product lifecycle** as skills, with a meta-skill (`using-agent-skills`) that routes a task to the right one. Every skill carries a **Common Rationalizations** table (the excuses an agent makes to skip a step, each rebutted) and **Red Flags**. Slash commands map one-to-one to lifecycle phases, and `/ship` fans out review **personas** - `code-reviewer`, `security-auditor`, `test-engineer`, `web-performance-auditor` - in parallel, then merges them into a go/no-go. It deliberately keeps a human checkpoint at each phase and runs across most major agent tools.

---

## A real head-to-head: Superpowers vs. agent-skills

Om Mishra ran a controlled experiment - same model (Sonnet 4.6), same repo, same prompt in Claude Code, only the skill framework changed - and wrote it up here:

**["Superpowers vs Agent-Skills: Faster Shipping, Safer Reasoning"](https://www.linkedin.com/pulse/superpowers-vs-agent-skills-faster-shipping-safer-reasoning-om-mishra-dzakf/)** - Om Mishra

His findings, summarized fairly:

- **agent-skills** moved to code faster (~8 min vs ~12) and ran **more validation passes** (7 vs 5, including the full test suite). That broader validation caught a compatibility issue *outside* the immediate feature that the feature-specific tests missed. For that task, he gave the edge to agent-skills on **validation depth**.
- **Superpowers** invested more **upfront architectural reasoning**, which he still prefers as his daily driver for evolving production systems and exploratory work where there's no established pattern to follow.
- Token efficiency was effectively identical; both replanned once.

It's one developer's single-task experiment, not a benchmark - but it's a useful, concrete illustration of the core trade-off: **broad disciplined validation vs. heavy upfront reasoning.** His own conclusion is the honest one: pick the tool to the task.

---

## When to pick which

- **Reach for agent-skills** when you want a **guided lifecycle** with a human checkpoint at each phase, parallel review/security/perf passes before merge, and coverage that extends past the build loop into security, performance, CI/CD, and launch. It also travels across the most agent tools.
- **Reach for Superpowers** when you want to **hand off long, autonomous stretches** and come back to a reviewed result, or when the work is exploratory/architectural and benefits from heavier upfront reasoning and subagent isolation.
- **Reach for Matt Pocock's skills** when you want a **sharp, low-ceremony daily toolkit** - especially the requirement-grilling and strict TDD loop - for a TypeScript-flavored Claude Code workflow.

And you don't have to choose exclusively, but combine them with care. These are Markdown skills, not runtimes, so cherry-picking *individual* skills works well: pull in Matt's `grill-me`, Superpowers' subagent isolation, or a specific checklist alongside your main setup.

What doesn't work is running two of them as your **active router at the same time**. Stacked meta-skills fight over command names (`/tdd` defined in two places), compete on routing logic, and pull in different TDD philosophies, so you get unpredictable behavior rather than the best of both. Pick one framework as your primary router, and borrow from the others à la carte.

---

## Sources

- Superpowers - <https://github.com/obra/superpowers>
- Matt Pocock's skills - <https://github.com/mattpocock/skills>
- Om Mishra, *Superpowers vs Agent-Skills* - <https://www.linkedin.com/pulse/superpowers-vs-agent-skills-faster-shipping-safer-reasoning-om-mishra-dzakf/>

*Spotted something inaccurate about another project here? Open an issue or PR - we'd rather be fair than flattering.*
