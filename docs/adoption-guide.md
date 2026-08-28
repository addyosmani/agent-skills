# Adoption Guide: New Projects vs. Established Codebases

How to roll out agent-skills depends heavily on where your codebase is in its life. A greenfield project can adopt the full lifecycle from commit one. A codebase with years of history needs an incremental path that respects what already exists, its conventions, its undocumented decisions, and its lack of test coverage in places you'd rather not touch blind.

This guide covers both paths. For installation mechanics, see [getting-started.md](getting-started.md) and the per-tool setup guides. For what each skill does, see the [skill catalog in the README](../README.md#all-24-skills).

---

## Which path are you on?

| Signal                     | Greenfield                      | Brownfield                                   |
| -------------------------- | ------------------------------- | -------------------------------------------- |
| Age of codebase            | Days to weeks                   | Months to years                              |
| Test coverage              | You control it from day one     | Uneven; some areas untested                  |
| Conventions                | Defined as you go               | Established, often undocumented              |
| Team habits                | Forming                         | Entrenched (for better or worse)             |
| Risk of a bad agent change | Low blast radius                | Can break things nobody remembers how to fix |
| Adoption strategy          | **Full lifecycle, immediately** | **Incremental, verification-first**          |

If you're somewhere in between (a young project that already shipped to production), start with the brownfield path and accelerate, it converges on the same end state.

---

## Path A | Greenfield: full lifecycle from day one

A new project is the best-case scenario: there's no legacy behavior to preserve, so the skills' quality gates cost almost nothing and compound from the first commit.

### Day 0 | Install and wire up

1. Install the pack (`npx skills add addyosmani/agent-skills`, or the native integration for your tool, see [getting-started.md](getting-started.md)).
2. Load `using-agent-skills` (the meta-skill) so the agent can route work to the right skill on its own.
3. Add a short project rules file (`CLAUDE.md`, `.cursorrules`, etc.) with your stack, commands, and boundaries, `context-engineering` describes what belongs there.

### Day 0 | Define before you build

Run the lifecycle in order for the project's first real feature:

```
/spec   →  SPEC.md            (spec-driven-development)
/plan   →  tasks/plan.md      (planning-and-task-breakdown)
/build  →  one slice at a time (incremental-implementation + test-driven-development)
/review →  before every merge  (code-review-and-quality)
/ship   →  when going live     (shipping-and-launch)
```

`/build auto` is a good fit for greenfield: you approve the plan once and every task still runs test-driven and commits individually. The spec and plan artifacts (`SPEC.md`, `tasks/`) are living documents, keep them in version control while the work is in flight.

### From the start, treat these as always-on

- **test-driven-development**, coverage debt is cheapest to avoid at zero.
- **git-workflow-and-versioning**, atomic commits and ~100-line changes are habits, not retrofits.
- **security-and-hardening**, auth, input validation, and secrets handling are structural; bolting them on later is a migration project.
- **documentation-and-adrs**, the first architectural decisions are exactly the ones nobody will remember the _why_ of in two years. An ADR now prevents the brownfield archaeology described in Path B.

### Add as the project grows

| When                                | Load                                                          |
| ----------------------------------- | ------------------------------------------------------------- |
| First public API or module boundary | `api-and-interface-design`                                    |
| First UI work                       | `frontend-ui-engineering` (+ `browser-testing-with-devtools`) |
| First CI pipeline                   | `ci-cd-and-automation`                                        |
| First production deploy             | `observability-and-instrumentation`, `shipping-and-launch`    |
| Performance requirements appear     | `performance-optimization`                                    |

### Greenfield anti-patterns

- **Skipping `/spec` because "it's just a prototype."** Prototypes become products. The spec is the cheapest artifact you'll ever write for this codebase.
- **Loading all 24 skills into every session.** It wastes context and dilutes the ones that matter. Load by phase; let `using-agent-skills` route.
- **Deferring observability until "there's something to observe."** Instrument as you build, retrofitting structured logging is a Path B problem you're choosing to create.

---

## Path B | Brownfield: incremental, verification-first

In an established codebase, the risk profile inverts: the danger isn't building the wrong thing, it's _changing_ something whose behavior nobody fully specified. The adoption order therefore starts with the skills that **read and protect** the codebase, and only later moves to the skills that **change** it.

### Phase 1 | Context and read-only skills

Goal: the agent understands the codebase before it modifies anything.

1. **`context-engineering` first.** Write the project rules file describing the real conventions, the ones in the code, not the ones in the wiki. Include build/test commands, directory meaning, known landmines ("don't touch `legacy/billing`, it has no tests and three known workarounds").
2. **`code-review-and-quality` on incoming changes.** Reviewing is zero-risk and immediately valuable: the five-axis review and its severity labels (which separate what blocks a merge, Critical and Required, from what doesn't) work on any PR regardless of the codebase's state.
3. **`debugging-and-error-recovery` for the bugs you were fixing anyway.** The five-step triage (reproduce → localize → reduce → fix → guard) shines in unfamiliar code, and the "guard" step starts building the regression suite you don't have.
4. **`doubt-driven-development` as a safety net.** Legacy code is exactly the "unfamiliar code, high cost of being wrong" scenario this skill targets. Adversarial fresh-context review of the agent's claims about how the legacy system works catches confident hallucinations before they become commits.

### Phase 2 | Tests before change

Goal: every area the agent will touch gets a safety net first.

- **`test-driven-development`, applied selectively.** Don't aim for global coverage; aim for coverage _where change is planned_. For untested legacy behavior, write characterization tests, tests that pin down what the code currently does, right or wrong, before any modification. The Beyonce Rule applies: if the agent liked a behavior enough to depend on it, it should have put a test on it.
- **`code-simplification` on the worst hotspots.** Chesterton's Fence is the operative principle: the skill forces the agent to understand _why_ code exists before removing it. Behavior-preserving simplification plus characterization tests is the lowest-risk way to make legacy code changeable.
- **`git-workflow-and-versioning` everywhere.** Small atomic commits matter _more_ in brownfield: when a change to old code breaks something subtle, a ~100-line commit is bisectable; a 2,000-line "modernization" commit is not.

### Phase 3 | New work runs the full lifecycle

Goal: two-speed adoption, legacy code stays under the Phase 1–2 regime; **new features get the greenfield treatment**.

- New feature in the old codebase? `/spec → /plan → /build → /review`. The spec's boundaries section is where you declare what legacy surface the feature may and may not touch.
- **`api-and-interface-design` at the seams.** When new code must talk to old code, design the boundary contract-first. Hyrum's Law is not theoretical in a years-old codebase, someone depends on every observable behavior, including the bugs.
- **`security-and-hardening` as an audit, then a gate.** Run it once across the existing attack surface (auth, input handling, dependencies, the dependency audit alone usually pays for the exercise), file what you find, then enforce it on new changes.

### Phase 4 | Pay down, deprecate, observe

- **`deprecation-and-migration`** is the brownfield skill par excellence: code-as-liability, compulsory vs. advisory deprecation, and zombie-code removal give you a disciplined way to shrink the legacy surface instead of just wrapping it.
- **`observability-and-instrumentation`** retrofitted along the paths you actually debug: structured logging and RED metrics on the top incident sources first.
- **`performance-optimization`** when regressions matter, its measure-first rule prevents the classic legacy trap of optimizing code that was never the bottleneck.

### Brownfield anti-patterns

- **"Big bang" adoption.** Loading the full lifecycle onto a legacy codebase on day one produces specs for code that already exists and refactors without safety nets. Sequence it.
- **Letting the agent refactor untested code.** No characterization tests, no refactor. This is the single most expensive shortcut in brownfield adoption.
- **Skipping `context-engineering` because "the code is the documentation."** The agent will infer conventions from the worst file it happens to read. Tell it the real ones.
- **Treating the legacy system's behavior as wrong by default.** Chesterton's Fence: the weird retry loop may be load-bearing. Understand, then change.
- **Ratcheting nothing.** Adoption should make quality monotonically better: each phase adds a gate that doesn't come back off. If a month in you can't name what's now enforced that wasn't before, the rollout has stalled.

---

## The two paths converge

Both end in the same steady state: `/spec → /plan → /build → /review → /ship` for new work, always-on TDD and git discipline, review gates before merge, and skills loaded by phase rather than in bulk. Greenfield gets there in days; brownfield gets there in a quarter, and the difference is exactly the safety nets (context, characterization tests, boundaries) that the old codebase never had.

|                        | Greenfield                     | Brownfield                               |
| ---------------------- | ------------------------------ | ---------------------------------------- |
| First skill loaded     | `using-agent-skills` + `/spec` | `context-engineering`                    |
| First value delivered  | Spec'd, tested first feature   | Zero-risk reviews and safer bug fixes    |
| TDD posture            | Universal from commit one      | Selective: tests where change is planned |
| Refactoring rule       | Rare (little to refactor)      | Characterization tests first, always     |
| Riskiest anti-pattern  | Skipping the spec              | Refactoring untested code                |
| Time to full lifecycle | Day one                        | ~One quarter, two-speed in between       |
