---
name: software-design-principles
description: Applies a practical design rubric for naming, fail-fast boundaries, dependency ownership, and small focused units. Use when writing or reviewing code that needs clearer structure, stronger invariants, or less accidental complexity.
---

# Software Design Principles

## Overview

Use this skill as a design rubric while writing, refactoring, or reviewing code. It is not a replacement for feature workflow skills. It is the set of principles you apply when deciding whether code structure is helping or hurting.

Favor changes that remove ambiguity, reduce accidental complexity, and make illegal states harder to express.

## When to Use

- Writing new domain logic
- Refactoring code that feels tangled or overgrown
- Reviewing readability and architecture findings
- Tightening type boundaries
- Deciding whether an abstraction earns its cost

Do not use this for:

- High-level product or system design
- Security-only review
- Pure formatting or style cleanup

## Workflow

### Step 1: Name the responsibility

Before changing structure, state what the unit is for.

Ask:

- What job does this class, module, or function own?
- What would a domain expert call it?
- Is the name specific enough that another engineer can predict its purpose?

Prefer domain names over generic names like:

- `data`
- `utils`
- `helpers`
- `manager`
- `handler`
- `processor`

### Step 2: Tighten the boundary

Prefer explicit boundaries over silent recovery.

Check for:

- fallback chains hiding missing required data
- `any`, casts, or optional fields masking unclear invariants
- mixed states that should be separate types

Prefer:

- fail-fast validation at boundaries
- discriminated unions or explicit variants
- small value objects for real domain concepts

### Step 3: Keep dependencies honest

The unit should own its behavior, not assemble hidden collaborators on the fly.

Check for:

- `new X()` inside business logic
- static helpers that hide real dependencies
- methods that mostly traverse another object's internals

Prefer:

- injected dependencies
- orchestration in one layer, business rules in the owning layer
- moving behavior toward the object or module that owns the data

### Step 4: Remove nesting and mixed responsibilities

Deep nesting is usually a sign that too many decisions live in one place.

Look for:

- long methods with multiple branches
- repeated conditionals on the same shape
- orchestration and business logic mixed together
- one file owning too many unrelated concepts

Prefer:

- early returns
- extracted helpers with clear names
- typed dispatch instead of branch piles
- splitting mixed-responsibility files

### Step 5: Prefer deletion over abstraction

Do not polish indirection that should not exist.

Ask:

- Does this wrapper clarify an API, or just forward calls?
- Does this abstraction remove complexity, or centralize it without reducing it?
- Is the duplication stable and harmful enough to justify sharing?

If not, delete or inline it.

## Specific Checks

Use these as a quick rubric during review:

- **Naming:** Would a new engineer understand the role from the name alone?
- **Fail-fast:** Would missing required data fail loudly and early?
- **Type safety:** Does the type system encode the real states?
- **Dependency ownership:** Are collaborators explicit and testable?
- **Feature envy:** Is behavior living with the thing it knows most about?
- **Size:** Would a smaller unit remove a whole category of confusion?

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We can keep the generic name for now." | Generic names hide responsibility and make future refactors harder, not easier. |
| "The fallback is safer." | Silent fallbacks often hide invalid state and move failures farther from the cause. |
| "A wrapper gives us flexibility later." | If it has one implementation and adds no clarity, it is cost now for imaginary benefit later. |
| "The service can own this logic for convenience." | When a service interprets another object's internals, coupling grows and the domain stays anemic. |

## Red Flags

- Generic names dominate the changed code
- The design depends on `any`, casts, or vague optional fields
- Hidden dependencies are created inside methods
- One method carries multiple levels of branching and state interpretation
- A refactor moves code around without reducing the number of concepts a reader must track

## Verification

After using this skill, confirm:

- [ ] Names reflect the domain responsibility of each changed unit.
- [ ] Required data fails fast instead of falling through silent defaults.
- [ ] Dependencies are explicit where behavior depends on them.
- [ ] I reduced nesting, mixed responsibilities, or branch count where possible.
- [ ] Any abstraction I kept clearly earns its cost.
