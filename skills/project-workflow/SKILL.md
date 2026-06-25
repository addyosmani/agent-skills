---
name: project-workflow
description: Guides full-lifecycle engineering projects through a six-phase gate-controlled process (Define→Plan→Build→Verify→Review→Ship) with mandatory human checkpoints between each phase. Use when starting a new project ("帮我写个项目", "build me a project"), adding a feature ("加个功能", "add a feature"), fixing a bug ("修个 bug", "fix a bug"), or making any non-trivial engineering change. Use as a single-entry orchestrator that automatically maps the request to the correct sub-skills from the agent-skills library, enforces phase gates, and surfaces decisions until ~95% confidence is reached.
---

# Project Workflow — 项目工程工作流

## Overview

A unified, gate-controlled engineering lifecycle that orchestrates all sub-skills from the agent-skills library. Instead of the agent deciding which skill to invoke at which point, this meta-skill provides a single entry point for any engineering task: say "帮我写个项目" or "fix this bug", and the agent follows a deterministic six-phase pipeline with human checkpoints at every transition.

The three design principles that govern all behavior within this skill:

- **Surface Assumptions** — Before any non-trivial implementation, explicitly list your assumptions and let the user correct them. Never fill in ambiguity silently.
- **Manage Confusion Actively** — When requirements conflict, stop, name the confusion, present tradeoffs, and wait for resolution. Do not guess.
- **Push Back When Warranted** — You are not a yes-machine. When an approach has clear problems, quantify the downside, propose alternatives, and accept override only when the user has full information.

## When to Use

- Starting a new project from scratch (prompts like "帮我写个网站", "写个项目", "build a project")
- Adding a feature to an existing codebase ("加个功能", "add a feature", "implement X")
- Fixing a bug ("修个 bug", "fix a bug", "something broke")
- Making any non-trivial change that touches multiple files or modules
- Any task where you're unsure which sub-skill to use — this skill routes to the correct one

**When NOT to use:** Trivial one-line fixes, typo corrections, pure configuration changes, or operations where requirements are unambiguous and self-contained. These don't need the full lifecycle overhead.

## The Six-Phase Lifecycle

```
  +-------------------------------------------------------------+
  |                                                             |
  |  DEFINE -> PLAN -> BUILD -> VERIFY -> REVIEW -> SHIP        |
  |    |         |         |          |          |         |     |
  |    v         v         v          v          v         v     |
  |  Human    Human     Human      Human      Human     Human    |
  |  gate     gate      gate       gate       gate      gate     |
  |                                                             |
  +-------------------------------------------------------------+
```

Every phase produces concrete evidence and requires explicit human confirmation before progressing. No phase gate is skipped.

### Phase 1: DEFINE

**Goal:** Reach ~95% confidence about what to build before any code is written.

**Route by confidence level:**

| Confidence | Sub-skill to invoke | Trigger phrases |
|------------|---------------------|-----------------|
| <40% — vague idea, no clear user/outcome | interview-me | "我想做个东西", "have an idea" |
| 40-70% — rough concept, needs refinement | idea-refine, then spec-driven-development | "帮我梳理一下这个想法", "refine this" |
| 70-95% — clear concept, needs written spec | spec-driven-development | "加个功能", "implement feature X" |
| Bug report (clear repro steps) | Skip to VERIFY -> test-driven-development (Prove-It) | "修个 bug", "fix this bug" |

**Evidence required before gate:**
- [ ] Assumptions are surfaced and confirmed
- [ ] Confusion (if any) is resolved with explicit decisions
- [ ] A written spec (SPEC.md) exists and is reviewed by the user (for projects/features >= 30 min of work)
- [ ] Success criteria are specific and testable
- [ ] Boundaries are defined (Always / Ask First / Never)
- [ ] User confirms: "Yes, proceed to PLAN"

### Phase 2: PLAN

**Goal:** Break the spec into small, independently verifiable vertical slices.

**Sub-skill:** planning-and-task-breakdown

**Output:** A task list where each task is:
- A thin vertical slice (~100 lines of change)
- Complete end-to-end (DB -> API -> UI if applicable)
- Independently verifiable (has acceptance criteria and verification command)
- Ordered by dependency (not by perceived importance)

**Evidence required before gate:**
- [ ] Task list written to tasks/plan.md (or equivalent)
- [ ] Each task has: description, acceptance criteria, verification step, file list
- [ ] Dependency order is explicit
- [ ] User confirms: "Yes, proceed to BUILD"

### Phase 3: BUILD

**Goal:** Implement each vertical slice incrementally, with tests written first.

**Sub-skills (invoked in order for each slice):**
1. test-driven-development — write failing test first (RED -> GREEN -> REFACTOR)
2. incremental-implementation — implement the slice (~100 lines), verify, commit

**Auto-activating sub-skills (triggered by context):**

| When the task involves | Auto-activate |
|------------------------|---------------|
| UI work (React, Vue, CSS, layout) | frontend-ui-engineering |
| API or module boundary design | api-and-interface-design |
| Security-sensitive operations | security-and-hardening |
| Documentation or ADRs | documentation-and-adrs |
| Observability (logging, metrics, tracing) | observability-and-instrumentation |
| Performance requirements | performance-optimization |
| High-risk or unfamiliar code paths | doubt-driven-development |
| CI/CD setup or modification | ci-cd-and-automation |
| Framework-specific code | source-driven-development |

**Evidence required before gate (per slice):**
- [ ] Test passes (RED -> GREEN cycle completed)
- [ ] All existing tests still pass
- [ ] Build succeeds
- [ ] Change is committed with a descriptive message
- [ ] No scope creep (only what the task required)
- [ ] User confirms: "Proceed to next slice" or "Proceed to VERIFY"

When all slices are complete:
- [ ] Full test suite passes
- [ ] Build succeeds
- [ ] No uncommitted changes
- [ ] User confirms: "Yes, proceed to VERIFY"

### Phase 4: VERIFY

**Goal:** Prove the implementation works correctly via tests and runtime verification.

**Sub-skills:**
- test-driven-development — test pyramid: ~80% unit, ~15% integration, ~5% E2E
- debugging-and-error-recovery — only if something fails (reproduce -> localize -> fix -> guard)
- browser-testing-with-devtools — for browser-based features (real DOM, console, network inspection)

**Principles:**
- Tests assert behavior (Beyonce Rule), not implementation details
- DAMP over DRY in tests (each test tells a complete story)
- Bug fixes include a Prove-It reproduction test that failed before the fix

**Evidence required before gate:**
- [ ] Test pyramid ratio maintained (80/15/5)
- [ ] All tests pass
- [ ] Edge cases covered (null, empty, boundary, error paths)
- [ ] If UI: browser verification done (no console errors, correct layout)
- [ ] If bug fix: Prove-It test exists and fails without the fix
- [ ] User confirms: "Yes, proceed to REVIEW"

### Phase 5: REVIEW

**Goal:** Five-axis code review before merging.

**Sub-skill:** code-review-and-quality

**The five axes:**

| Axis | Key questions |
|------|---------------|
| Correctness | Matches spec? Edge cases handled? Error paths covered? |
| Readability | Clear names? Straightforward flow? No clever tricks? |
| Architecture | Fits existing patterns? Clean boundaries? No circular deps? |
| Security | Input validated? No injection vulnerabilities? Auth in place? |
| Performance | No N+1 patterns? No unbounded operations? Pagination? |

**Evidence required before gate:**
- [ ] Five-axis review completed
- [ ] All Critical and Required issues addressed
- [ ] If complexity flagged: code-simplification applied
- [ ] User confirms: "Yes, proceed to SHIP"

### Phase 6: SHIP

**Goal:** Deploy safely with monitoring, rollback plan, and documentation.

**Sub-skills:**
- git-workflow-and-versioning — atomic commits, trunk-based or feature branch
- shipping-and-launch — pre-launch checklist, staging, canary, staged rollout
- documentation-and-adrs — ADR for each architecture decision
- ci-cd-and-automation — quality gate pipelines, failure feedback loops

**Evidence required before gate:**
- [ ] Pre-launch checklist completed (code quality, security, performance, accessibility, infrastructure, documentation)
- [ ] Rollback plan documented
- [ ] Feature flag strategy defined (if applicable)
- [ ] Monitoring and alerting configured
- [ ] ADRs written for architectural decisions
- [ ] User confirms: "Yes, ship it"

## Bottom-Line Principles

These are non-negotiable. Violating any of them means the task is not done.

1. **Spec before code** — No code is written without a confirmed spec. "It's obvious" is not a valid reason to skip.
2. **Tests are proof** — Without tests, code is not complete. "I'll add them later" never happens.
3. **Thin vertical slices** — Each increment is ~100 lines of change, end-to-end. No big-bang commits.
4. **Verification is non-negotiable** — Every phase gate produces evidence (test output, build output, user confirmation). "Looks right" is not evidence.
5. **Progressive disclosure** — Load sub-skill references on demand, not all at once. Don't flood context.
6. **No Yes-machine** — Push back on bad ideas with quantification. Sycophancy is a failure mode.

## Usage

This skill is primarily an interactive workflow. The agent drives the lifecycle conversationally. To trigger it:

**English triggers:**
- "Build me a project" -> starts from DEFINE, auto-detects scope
- "Add a feature: [description]" -> starts from DEFINE, writes spec
- "Fix this bug: [description]" -> starts from VERIFY (Prove-It pattern)

**Chinese triggers:**
- "帮我写个项目" -> starts from DEFINE, auto-detects scope
- "加个功能：[description]" -> starts from DEFINE, writes spec
- "修个 bug：[description]" -> starts from VERIFY (Prove-It pattern)

The agent will say something like:

```
I'll follow the 6-phase project workflow for this.
Starting at DEFINE.

HYPOTHESIS: You want to [one-sentence read].
CONFIDENCE: ~X% — still missing: [what's unclear].

Q: [one focused question]
GUESS: [my best guess]
```

## Artifacts

| Artifact | Location | Created in |
|----------|----------|------------|
| Spec | SPEC.md | DEFINE phase |
| Task plan | tasks/plan.md | PLAN phase |
| Implementation | Source files | BUILD phase |
| Tests | Test files | BUILD + VERIFY phases |
| Review report | In conversation or PR | REVIEW phase |
| ADR (if needed) | docs/adr/ | SHIP phase |

## How It Differs From Using agent-skills Alone

| Dimension | Using agent-skills alone | Using this skill |
|-----------|--------------------------|------------------|
| Entry point | Must know which skill to invoke for each task | One sentence triggers the right phase |
| Phase gating | No enforced human checkpoints between skills | Every phase gate requires user confirmation with evidence |
| Scope detection | Agent guesses which phase applies | Deterministic routing by confidence level and task type |
| Sub-skill orchestration | Manual — user or agent must chain skills | Automatic — each phase routes to the correct sub-skills |
| Principles | Skills have individual rationalizations, no shared code of conduct | Three core operating principles + six bottom-line rules govern all work |
| Chinese-friendly | English skill names and descriptions | Full Chinese trigger support, bilingual workflow |
| Zig-zag prevention | No guard against jumping between phases without completing one | Phase gates prevent advancing until evidence is produced |

## Common Rationalizations

| Rationalization | Reality |
|----------------|---------|
| "This is too small to need all six phases" | Small tasks flow through faster — a bug fix skips directly to VERIFY. The gates adapt to scope. |
| "I can just use the individual skills directly" | Without phase gates, the agent may skip verification or merge without review. This skill adds the safety rails. |
| "The user just asked for a quick fix, they don't want all this process" | A quick fix that breaks something else isn't quick. The process catches that. |
| "I know exactly what they want, no need for DEFINE" | Confidence without evidence is the most expensive kind of mistake. Surface assumptions first. |
| "I'll just write the spec as I implement, it's faster" | A spec written during implementation documents what you did, not what you agreed to build. Different thing. |
| "The tests pass, so we can skip REVIEW" | Tests catch correctness bugs. Review catches architecture, security, and readability issues tests miss. |
| "I already know the sub-skill routing" | This meta-skill ensures consistent routing even across different agents, contexts, and session states. |

## Red Flags

- Starting to write code before the DEFINE phase produces a confirmed spec
- Implementing speculative features ("this seems useful") outside the spec
- Merging without completing REVIEW phase
- Skipping VERIFY phase gates ("the tests pass anyway")
- Deploying without a rollback plan
- Letting a slice exceed ~100 lines without splitting
- Accepting "whatever you think is best" as phase gate confirmation
- Advancing to the next phase without the corresponding evidence checklist

## Verification

After completing all six phases:

- [ ] Phase 1 (DEFINE): Spec written and user-confirmed. Assumptions surfaced.
- [ ] Phase 2 (PLAN): Task list with vertical slices, each with acceptance criteria.
- [ ] Phase 3 (BUILD): Each slice implemented incrementally. Tests written first (TDD).
- [ ] Phase 4 (VERIFY): Test pyramid maintained. All tests pass. Edge cases covered.
- [ ] Phase 5 (REVIEW): Five-axis review completed. Critical and Required issues addressed.
- [ ] Phase 6 (SHIP): Pre-launch checklist done. Rollback plan ready. ADRs written.
- [ ] Every phase gate had explicit user confirmation before proceeding.
- [ ] Three core operating principles were observed throughout.
- [ ] Six bottom-line principles were never violated.
