---
name: technical-debt-audit
description: Systematic technical debt audit and prioritization. Use when assessing codebase health, identifying tech debt hotspots, estimating refactoring effort, deciding what to refactor first, or preparing a tech debt report for stakeholders. Covers structural, code, dependency, and test debt dimensions.
---

# Technical Debt Audit

## Overview

Technical debt is not "bad code" — it's a deliberate tradeoff between speed and sustainability. But left unmanaged, it compounds: every feature built on shaky foundations costs more to maintain and slows down future development.

This skill provides a systematic framework for auditing technical debt across four dimensions, quantifying its impact, and prioritizing what to fix first.

## When to Use

- Onboarding to a new codebase and need a health assessment
- Sprint planning and deciding what refactoring work to include
- Preparing a tech debt report for stakeholders
- Deciding whether to rewrite vs. refactor
- After a hackathon or rapid development period
- When development velocity starts dropping

## Core Principles

### 1. Debt Is a Cost, Not a Crime

Not all debt is bad. Strategic debt (chosen to meet a deadline) is fine. Accidental debt (crept in unnoticed) is dangerous. The audit distinguishes between:

- **Strategic debt**: documented, intentional, scheduled for repayment
- **Tactical debt**: undocumented, accidental, growing unchecked

### 2. Measure Impact, Not Just Count

A function with 100 lines of duplicated code that's never touched costs less than a 10-line function that's in the hot path and modified every week. Weight debt by:

- **Frequency of modification** (how often it's touched)
- **Criticality** (how bad a failure would be)
- **Number of dependents** (how many things break if it breaks)

### 3. Prioritize by ROI, Not Size

Big refactors aren't always high priority. Small fixes in frequently modified areas often deliver more value. Use the **"pain × frequency"** formula:

```
Priority = (Pain level × How often it hurts) / Effort to fix
```

## The Four Dimensions

### Dimension 1: Structural Debt

The architecture and organization of the codebase.

**Checklist:**

- [ ] **Dependency direction violations**: high-level modules depend on low-level details
- [ ] **Circular dependencies**: modules that depend on each other
- [ ] **Boundary leaks**: internal implementation details exposed through public interfaces
- [ ] **God classes/modules**: modules that do too many things
- [ ] **Inconsistent layering**: business logic mixed with UI or data access
- [ ] **Feature coupling**: features that can't be understood or tested independently

**How to assess:**
- Look at import graphs. Are dependencies pointing the right way?
- Check for "utility" folders that everything imports (god modules)
- Count how many files need to change to add a new feature (high = structural debt)

**Red flags:**
- "We can't add X without touching Y and Z too"
- "That's in the utils folder, everyone uses it"
- "I'm not sure how this code works, but don't touch it"

---

### Dimension 2: Code Debt

The quality of individual code units.

**Checklist:**

- [ ] **Duplicated code**: copy-pasted blocks that should be shared
- [ ] **Overly long functions**: functions longer than ~50 lines
- [ ] **Poor naming**: unclear variable/function names that require comments
- [ ] **Dead code**: code that's never called but kept "just in case"
- [ ] **Magic numbers**: unexplained literals that should be constants
- [ ] **Commented-out code**: old code that's left in place
- [ ] **Inconsistent patterns**: similar things done different ways

**How to assess:**
- Run static analysis tools (ESLint, Pylint, etc.) and look at warnings
- Look for patterns in how bugs are reported (where do they cluster?)
- Ask: "If I deleted this, would anyone notice?"

**Red flags:**
- Comments that explain "what" the code does (naming problem)
- Multiple near-identical functions with slightly different names
- "This is a known issue, we'll fix it later" comments

---

### Dimension 3: Dependency Debt

Third-party libraries and framework choices.

**Checklist:**

- [ ] **Outdated dependencies**: versions that are months or years behind
- [ ] **Vulnerable dependencies**: known CVEs that haven't been patched
- [ ] **Abandoned dependencies**: libraries no longer maintained
- [ ] **Duplicate dependencies**: multiple libraries doing the same thing
- [ ] **Heavy dependencies**: large libraries used for 10% of their functionality
- [ ] **Breaking changes pending**: major version updates coming that will break things

**How to assess:**
- Run `npm outdated` / `pip list --outdated` / similar
- Check GitHub for unmaintained repos (no commits in 1+ year)
- Look at bundle size / binary size and see where the weight is

**Red flags:**
- "We can't upgrade X because Y depends on an old version"
- "We use this library for just one function"
- "I'm not sure why we have this dependency"

---

### Dimension 4: Test Debt

The quality and coverage of tests.

**Checklist:**

- [ ] **Missing coverage**: critical paths with no tests
- [ ] **Brittle tests**: tests that break when you refactor (testing implementation, not behavior)
- [ ] **Slow tests**: test suite takes so long that people skip running it
- [ ] **Flaky tests**: tests that fail randomly and get ignored
- [ ] **Outdated tests**: tests that test old behavior no longer relevant
- [ ] **No integration tests**: unit tests pass but end-to-end flow is broken

**How to assess:**
- Look at coverage reports — are the critical paths covered?
- Count how often tests are "fixed" rather than bugs found
- Time how long the test suite takes

**Red flags:**
- "We don't run the full test suite locally"
- "That test is flaky, just rerun it"
- "We don't have tests for that, it's too risky to change"

## The Audit Process

### Step 1: Scope the Audit

Decide what you're auditing:
- Whole codebase?
- A specific module or feature area?
- A specific dimension (e.g., just dependency debt)?

Time-box the audit. A 2-hour audit of a small codebase is fine. A multi-day audit of a large codebase needs to be scoped tightly.

### Step 2: Gather Data

Collect objective data first:
- Static analysis tool output
- Dependency reports (outdated, vulnerable)
- Test coverage reports
- Git history (which files change most often?)
- Bug tracker (where are bugs concentrated?)

### Step 3: Walk the Code

For each major module:
1. Read the entry point and understand what it does
2. Follow one feature request from start to finish
3. Note where the path gets confusing or convoluted
4. Note where you find "that's weird" moments

Don't try to understand everything. Look for the 20% of code that causes 80% of the pain.

### Step 4: Score Each Item

For each debt item found, score:

| Dimension | Score (1-5) |
|-----------|-------------|
| **Pain** | How bad is this? (1 = minor annoyance, 5 = production outages) |
| **Frequency** | How often does this cause problems? (1 = rarely, 5 = every day) |
| **Effort** | How hard is it to fix? (1 = trivial, 5 = multi-week rewrite) |

**Priority score** = (Pain × Frequency) / Effort

Higher priority score = fix first.

### Step 5: Categorize and Report

Group findings by:

- **Dimension**: structural, code, dependency, test
- **Severity**: critical, high, medium, low
- **Priority**: P0 (fix now), P1 (this quarter), P2 (when we get to it), P3 (acknowledge and ignore)

## The Output

A good tech debt report has:

1. **Executive summary**: one paragraph for stakeholders
2. **Top 5 priorities**: what to fix first and why
3. **Detailed findings**: grouped by dimension, with scores
4. **Trends**: is debt getting better or worse?
5. **Recommendations**: concrete next steps

## Avoid These Pitfalls

### Don't Try to Fix Everything

Audit is not a sprint. The goal is clarity, not a clean sweep. Pick the top 3-5 items and schedule them.

### Don't Confuse Style with Debt

Tabs vs. spaces, naming conventions, formatting — these are style issues, not tech debt. Use linters to handle style automatically.

### Don't Rewrite Everything

The "rewrite from scratch" trap: it's risky, slow, and almost never as good as refactoring incrementally. Rewrite only when:
- The architecture is fundamentally wrong
- The technology stack is end-of-life
- Maintenance cost is higher than rewrite cost

### Don't Count Lines

"10,000 lines of technical debt" is meaningless. Debt is about pain, not volume. A 10-line function in the hot path matters more than 10,000 lines of dead code.

## Integration with Other Skills

- **deprecation-and-migration**: use when you've decided to remove something
- **code-simplification**: use when fixing code debt
- **constraint-driven-development**: use to set up gates that prevent new debt
- **test-driven-development**: use to pay down test debt
- **planning-and-task-breakdown**: use to schedule the repayment work
