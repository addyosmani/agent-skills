---
name: lightweight-design-analysis
description: Analyzes code design quality across a small module or class using an evidence-based rubric and file:line findings. Use when reviewing architecture or readability, identifying refactoring opportunities, or checking whether a local design is pulling its weight.
---

# Lightweight Design Analysis

## Overview

Use this skill when you need a focused design review of a small slice of code. It is for module- and class-level analysis, not whole-repo architecture work.

The goal is not to produce generic advice. The goal is to produce a short list of evidence-backed findings that tell the author what to change and why.

## When to Use

- Reviewing a non-trivial refactor
- Evaluating readability or maintainability concerns
- Checking whether code smells are localized or structural
- Looking for concrete design improvements before merge
- Turning "this feels messy" into file:line findings

Do not use this for:

- Whole-repo architecture strategy
- Security review
- Performance profiling
- Bugs you have not understood yet

## Workflow

### Step 1: Understand the code first

Do not analyze code you have not traced.

Before writing findings:

1. Read the changed files and the nearby callers.
2. Identify the unit's responsibility.
3. Identify its inputs, outputs, and dependencies.
4. Identify what behavior the current code is preserving.

If you cannot explain the control flow in plain language, stop and read more code.

### Step 2: Evaluate eight design dimensions

Walk the code through these dimensions in order:

1. **Naming**
   - Are names intention-revealing?
   - Do names use domain language instead of generic terms like `data`, `helper`, `manager`, or `processor`?

2. **Object Calisthenics**
   - Is nesting too deep?
   - Is the method doing too much branching?
   - Would early returns or smaller helpers remove indentation?

3. **Coupling and Cohesion**
   - Does the unit have one job?
   - Is it reaching deeply into another object's internals?
   - Does it depend on concrete details it should not own?

4. **Immutability**
   - Is mutable state necessary?
   - Are values mutated in place when a new value would be clearer?

5. **Domain Integrity**
   - Does business logic live with the domain concept that owns it?
   - Are invariants enforced in the right layer?

6. **Type Boundaries**
   - Are `any`, casts, or vague optional states hiding an unclear invariant?
   - Would a stronger type make downstream branching disappear?

7. **Simplicity**
   - Is the code simpler than the alternatives, or only differently complicated?
   - Can a whole branch, mode, or wrapper disappear?

8. **Local Performance**
   - Does the design create avoidable local churn, repeated work, or unnecessary allocations?
   - Only flag this when the design itself is the cause.

### Step 3: Produce findings, not commentary

Report only findings that clear the bar.

Each finding must include:

- severity
- file:line reference
- what the problem is
- why it matters
- the structural move you recommend

Use this format:

```text
🔴 Feature envy at src/order/OrderService.ts:34
The method reaches through Customer for formatting and pricing details it does not own.
Move that logic onto Customer or a domain formatter so the service orchestrates instead of interpreting internals.
```

### Step 4: Prefer structural remedies

When you flag a problem, recommend a move:

- replace repeated conditionals with a typed model or dispatcher
- move feature-specific logic back to the owning module
- extract orchestration from business logic
- delete pass-through wrappers
- make the type boundary explicit
- split one mixed-responsibility file into focused units

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I can review the design from the diff alone." | Many design problems only show up once you trace callers and ownership boundaries. |
| "This is just style." | If a naming, coupling, or type-boundary issue changes how hard the code is to reason about, it is design, not style. |
| "I'll list everything that looks off." | A good design review is selective. Weak findings create noise and hide the real ones. |
| "Performance belongs in a different review." | True for profiling. False when the design itself creates obvious repeated work or waste. |

## Red Flags

- Findings have no file:line references
- Findings say code is "cleaner" or "better" without naming the structural change
- The review confuses preference with a real maintenance cost
- The analysis spans too much code to understand deeply
- The reviewer never traced callers before proposing a refactor

## Verification

After using this skill, confirm:

- [ ] I traced the relevant control flow before writing findings.
- [ ] Every finding has a file:line reference.
- [ ] Every finding recommends a concrete structural move.
- [ ] I separated design issues from correctness, security, and performance review.
- [ ] I kept the scope to a small set of related files.
