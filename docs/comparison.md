<!--
  This document is for developers evaluating the project. It is NOT a skill and
  is not meant to be loaded into an agent's context. It lives in docs/ so it
  stays out of the agent's working set.
-->

# How agent-skills compares

People often ask how **agent-skills** relates to the two other "skills for coding agents" collections they hear about most: **Superpowers** (Jesse Vincent / obra) and **Matt Pocock's skills**. All three are good, share a lot of DNA, and are worth learning from. This page is an honest map of how they are *shaped* differently, so you can pick the one that fits how you work, or borrow across all three.

> **TL;DR** — They optimize for different moments. **agent-skills** organizes the *whole product lifecycle* (Define, Plan, Build, Verify, Review, Ship) with review personas, anti-rationalization guards, and an in-repo eval framework that checks the skills actually route and behave. **Superpowers** leans into *autonomous, reasoning-heavy* runs with subagents, a strict pipeline, and worktree isolation. **Matt Pocock's skills** are a *sharp, opinionated Claude Code toolkit* distilled from one expert's daily workflow, with a signature "grill me" interrogation loop. None is "best" in the abstract; it depends on the work in front of you.

---

## At a glance

| | **agent-skills** | **Superpowers** | **Matt Pocock's skills** |
|---|---|---|---|
| **Core idea** | Encode the full senior-engineering lifecycle as skills | A complete development *methodology* built on composable skills | One expert's Claude Code workflow, open-sourced and evolving |
| **Organizing principle** | SDLC **phases** (Define to Ship) behind a meta-skill router | A single disciplined loop: brainstorm, plan, execute, review | A curated toolbox of focused, composable commands |
| **Catalog size** | 24 skills spanning the whole lifecycle | ~14 skills, deep on the inner build loop | ~30 skills, grouped into engineering / productivity / in-progress / deprecated |
| **Lifecycle coverage** | Broad: idea refinement, API and UI design, security, performance, CI/CD, observability, deprecation, ADRs, launch | Deep but narrow: TDD, debugging, planning, review, skill authoring | Define and Build heavy: grilling, PRDs, issues, TDD, architecture, bug triage, knowledge management |
| **Entry points** | Slash commands mapped 1:1 to phases (`/spec` `/plan` `/build` `/test` `/review` `/code-simplify` `/ship`, plus `/webperf`), with a `/build auto` full-plan mode | Skill-chained pipeline (`brainstorming`, `writing-plans`, `subagent-driven-development`) | Slash commands (`/grill-me`, `/tdd`, `/to-prd`, `/diagnosing-bugs`, `/grill-with-docs`) |
| **Distinctive mechanisms** | Anti-rationalization tables and Red Flags in every skill; parallel review **personas** in `/ship`; reference checklists; a **three-tier eval framework** in CI | Subagent-driven development with a task reviewer (spec + quality) and a fix loop; git-worktree isolation; skills-that-write-skills, pressure-tested | The **grilling** primitive (one question at a time, design-tree walking); seam-based TDD; explicit user-invoked vs model-invoked split; issue-tracker integration |
| **Quality measurement** | Trigger, routing, and behavioral evals run against the catalog (in-repo, some in CI) | Pressure-testing methodology is core to its philosophy; the eval suite itself now lives in a separate repo | None shipped in-repo |
| **Tooling reach** | Claude Code, Cursor, Gemini CLI, Antigravity, OpenCode, Windsurf, Copilot, Kiro, Codex, plus the `npx skills` CLI | One of the widest and most actively churned surfaces: Claude Code, Codex, Cursor, Copilot CLI, OpenCode, Kimi, Factory Droid, Antigravity, Pi | Claude Code first, distributed via `npx skills add`; other agents work with varying fidelity |
| **Governance** | Actively reviews and merges community contributions; every skill ships an eval | Largely solo-authored; a substantial backlog of unmerged community PRs | Solo-authored, self-merged, developed openly in public |
| **Best for** | Driving a feature through every phase with a human checkpoint at each | Long, autonomous, reasoning-heavy or exploratory work | A pragmatic, battle-tested daily loop, strongest at requirements and TDD |

*(We deliberately leave out star counts and adoption figures: they are cited wildly differently across blogs and change weekly. All three are actively used and maintained.)*

---

## The three projects, in their own terms

### Superpowers (obra)

A full software-development *methodology* built on composable skills. It bets on **autonomy and upfront reasoning**. A session runs a deliberately linear pipeline: Socratic brainstorming that writes a dated spec and permits exactly one handoff, detailed plans written to be executable by "an enthusiastic junior engineer with poor taste and no context," then subagent-driven execution where a fresh subagent implements each task and a task reviewer signs off on both spec compliance and code quality before it closes, with a fix loop for anything it flags and a whole-branch review on the most capable model at the end. Git worktrees keep parallel work isolated, and its `writing-skills` skill applies TDD to documentation itself: no skill ships without a failing test first.

Its strengths are real: hand off a sizable chunk and come back to a reviewed result, with strong guardrails against an agent rationalizing its way past the process. The trade-offs are the flip side of that discipline. Coverage is narrow (it is an inner-loop build methodology, not a security-to-launch lifecycle), the single pipeline can feel heavy on small changes, and the recent direction has been about paying down that cost, for example consolidating to a single task reviewer for roughly twice the speed and half the tokens. The loudest thing its community keeps asking for, multi-agent team execution, is not yet in the box.

**Repo:** <https://github.com/obra/superpowers>

### Matt Pocock's skills

Matt open-sourced the Claude Code skills he actually uses, and the collection has grown into a broad, opinionated toolbox organized in public, complete with visible `in-progress/` and `deprecated/` directories that model the discipline the skills preach. The center of gravity is not TDD, it is **grilling**: a reusable interrogation loop that asks one question at a time, walks each branch of the design tree resolving dependencies in order, offers a recommended answer per question, prefers reading the codebase over asking, and refuses to proceed until you confirm a shared understanding. `grill-me` and `grill-with-docs` are thin wrappers over it. The TDD skill is distinctive too and cheerfully heterodox ("refactoring is not part of the loop," it belongs to code review), and there is a deliberate split between user-invoked and model-invoked skills to treat agent context as a scarce budget.

Its strengths are authenticity and sharpness: this is how one very good engineer ships, not a committee's idea of a framework, and the requirements-grilling loop is genuinely excellent. The trade-offs: it is Claude Code first in practice (other agents surface reliability rough edges), there are no in-repo evals to catch regressions, lifecycle coverage past Build is thin, and some skills couple to a personal setup wizard and tracker conventions. Recent work is pushing from single-session skills toward multi-session orchestration through issue trackers (the in-progress `wayfinder`).

**Repo:** <https://github.com/mattpocock/skills> · related: <https://github.com/mattpocock/agent-rules-books>

### agent-skills (this project)

agent-skills organizes the **entire product lifecycle** as skills, with a meta-skill (`using-agent-skills`) that routes a task to the right one. Every skill carries a **Common Rationalizations** table (the excuses an agent makes to skip a step, each rebutted) and **Red Flags**. Slash commands map one-to-one to lifecycle phases; `/build auto` runs a whole approved plan in one pass; and `/ship` fans out review **personas** (`code-reviewer`, `security-auditor`, `test-engineer`, `web-performance-auditor`) in parallel, then merges them into a go/no-go. It keeps a human checkpoint at each phase, ships seven reference checklists including a Definition of Done, and runs across most major agent tools with a single-command install on several of them.

What is newer, and the current point of difference: a **three-tier eval framework** lives in the repo. Tier 1 checks structure, Tier 2 checks that each skill's description carries the vocabulary users actually say and that no two skills collide on routing (deterministic, runs in CI), and Tier 3 grades an agent's real execution trace against per-skill expectations. Neither of the other two ships that kind of in-repo, catalog-wide measurement today. The honest trade-off in the other direction: agent-skills has less of a single opinionated "run" than Superpowers, and none of the three has yet solved durable cross-session memory well.

---

## A real head-to-head: Superpowers vs. agent-skills

Om Mishra ran a controlled experiment, same model, same repo, same prompt in Claude Code, changing only the skill framework, and wrote it up:

**["Superpowers vs Agent-Skills: Faster Shipping, Safer Reasoning"](https://www.linkedin.com/pulse/superpowers-vs-agent-skills-faster-shipping-safer-reasoning-om-mishra-dzakf/)** by Om Mishra

Summarized fairly:

- **agent-skills** moved to code faster (~8 min vs ~12) and ran **more validation passes** (7 vs 5, including the full test suite). That broader validation caught a compatibility issue *outside* the immediate feature that the feature-specific tests missed. He gave it the edge on **validation depth** for that task.
- **Superpowers** invested more **upfront architectural reasoning**, which he still prefers as his daily driver for evolving production systems and exploratory work with no established pattern to follow.
- Token efficiency was effectively identical; both replanned once.

It is one developer's single-task experiment, not a benchmark, but it is a concrete illustration of the core trade-off: **broad disciplined validation versus heavy upfront reasoning**. His own conclusion is the honest one: pick the tool to the task.

---

## How to decide what to use

The at-a-glance table tells you how they are shaped. This is how to choose in practice.

### Start with the shape of your work

- **A whole feature, front to back?** agent-skills. It is the only one of the three that carries you from spec through security, performance, and launch with a checkpoint at each phase, so nothing quietly skips the review or the pre-flight.
- **A big, ambiguous chunk you want to hand off and walk away from?** Superpowers. Its pipeline and subagent review are built to run for a long time and hand back a result that has already been reviewed against the spec.
- **A fast, focused daily loop, especially getting requirements right before code?** Matt Pocock's skills. The grilling loop is the sharpest requirements tool of the three, and the toolkit stays out of your way.

### Then weight what you actually care about

- **Breadth of coverage** (security, performance, CI/CD, observability, launch): agent-skills is the clear pick; the others are inner-loop focused.
- **Autonomy over a long run**: Superpowers, by design.
- **Low ceremony on small changes**: Pocock's toolkit is lightest; agent-skills offers a middle gear (a small change can skip straight to `/test` and `/review`); Superpowers is the most process-heavy.
- **Confidence that the skills themselves work**: agent-skills is the only one with catalog-wide evals in the repo, so a description or routing regression fails CI rather than surfacing as a mysterious "why didn't the skill fire" later.
- **Requirements interrogation**: Pocock's grilling is the reference implementation; agent-skills' `interview-me` is close in spirit and gaining an opt-in collaborative mode.
- **Platform spread**: agent-skills and Superpowers both run almost everywhere; Pocock is happiest on Claude Code.
- **A human gate at each step vs. a hands-off run**: agent-skills checkpoints by default; Superpowers minimizes mid-run check-ins on purpose.

### Concrete scenarios

- *"Ship a new endpoint with auth, tests, and a security pass before merge."* agent-skills: `/spec` to `/ship`, with the security-auditor and test-engineer personas fanning out at the end.
- *"Refactor a gnarly subsystem overnight and review it in the morning."* Superpowers: hand it the plan, let subagent-driven development and the task reviewer run.
- *"I have a vague idea and keep letting the agent guess the requirements."* Pocock's `grill-me` (or agent-skills' `interview-me`) to pin down intent before any code.
- *"Fix one clear bug, test-first."* Any of them; reach for the lightest one you already have installed.
- *"Standardize how a team of engineers uses agents across a repo."* agent-skills: the phase commands, personas, and shared checklists give a team a common vocabulary, and the evals keep custom skills honest.
- *"Roll my own skills and know they trigger correctly."* agent-skills, and borrow Superpowers' pressure-testing discipline for the ones that must not be rationalized away.

### Solo vs. team

For a solo developer, taste and momentum win: pick the one whose defaults match how you already work, and the lowest-ceremony option is often the most-used one. For a team, the calculus shifts toward shared structure and guardrails you can enforce: named phases, review personas, checklists, and evals that fail CI are what keep five people (and their agents) converging on the same standard rather than five private workflows. That is the situation agent-skills is built for, though a team can absolutely adopt Superpowers' review discipline or Pocock's grilling loop within it.

### The shared frontier (true of all three)

None of these has solved **durable cross-session memory** well yet: what an agent learned in one session rarely carries cleanly into the next. All three are circling it (learnings files, handoff artifacts, tracker-backed planning maps). If that is your bottleneck, know that you are at the edge of what any of them ships today, and expect to stitch some of it yourself for now.

---

## Combining them

You do not have to choose exclusively, but combine with care. These are Markdown skills, not runtimes, so cherry-picking *individual* skills works well: pull in Pocock's `grill-me`, a Superpowers isolation pattern, or a specific checklist alongside your main setup.

What does not work is running two of them as your **active router at the same time**. Stacked meta-skills fight over command names (`/tdd` defined in two places), compete on routing logic, and pull in different TDD philosophies, so you get unpredictable behavior rather than the best of both. Pick one framework as your primary router, and borrow from the others a la carte.

---

## Sources

- Superpowers: <https://github.com/obra/superpowers>
- Matt Pocock's skills: <https://github.com/mattpocock/skills>
- Om Mishra, *Superpowers vs Agent-Skills*: <https://www.linkedin.com/pulse/superpowers-vs-agent-skills-faster-shipping-safer-reasoning-om-mishra-dzakf/>

*Spotted something inaccurate about another project here? Open an issue or PR. We would rather be fair than flattering.*
