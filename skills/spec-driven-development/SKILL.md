---
name: spec-driven-development
description: Write specs and PRDs with objectives, requirements, and boundaries. Use when a significant new capability lacks a specification, or a requirement needs decomposition into independently specifiable modules. Reuse adequate existing requirements.
---

# Spec-Driven Development

## Overview

Produce enough specification to guide implementation and verification without forcing a document lifecycle onto every change.

## When to Use

Use when a significant capability lacks adequate requirements or has consequential scope or interface ambiguity. Reuse existing specs and clear user requests.

## Establish what is already known

Read the user's request, prior decisions, project conventions, and relevant code. A clear request or approved plan may already specify the work. Reuse it; do not restart discovery or require another approval because this skill was loaded.

Inspect discoverable facts before asking questions. State consequential assumptions briefly. Ask only about unresolved choices that materially affect outcomes, compatibility, data exposure, cost, or irreversible actions; continue independent work while awaiting an answer. Honor user-requested review gates and the runtime's current mode. This skill does not enter or exit Plan Mode.

## Map capabilities when needed

If the request bundles independently testable capabilities with distinct consumers or data, record a compact capability map: stable module identifiers, responsibilities, dependency direction, and build order. Define shared interfaces before parallel implementation. Investigate dependency cycles rather than mechanically merging modules.

Reuse existing boundaries where they fit. Ask about a proposed boundary only if it is a material unresolved product or architecture decision. Do not gate every module on separate human approval. A single capability does not need a map or a hierarchy of specs.

## Specify the outcome

Cover only applicable areas:

- Goal, audience, observable success criteria, and material exclusions.
- Existing stack, relevant versions, interfaces, data flow, and failure behavior.
- Relevant source locations and an existing pattern to follow.
- Verification using the repository's actual commands, with required gates and meaningful behavior checks.
- Compatibility, migration, rollout, and permission constraints where relevant.
- Unresolved decisions and which work depends on them.

Derive commands from repository scripts, wrappers, and CI. Distinguish read-only checks from commands that rewrite files. Do not invent performance targets, mandatory dependencies, or approval requirements; label proposed targets and settle them when they determine success.

Keep requirements and implementation choices distinct. A supported project convention need not be replaced because current documentation shows another valid approach.

## Plan and implement

For work needing a dependency breakdown or parallel coordination, use the installed `planning-and-task-breakdown` skill. Reuse its task list and acceptance criteria rather than generating competing artifacts. Use verifiable increments for substantial implementation and meaningful regression tests for behavior changes. Do not require separate approval for specify, plan, tasks, and implementation when the task is already authorized.

If the user requested only a spec or plan, deliver that artifact and stop. If implementation is authorized and no material decision blocks it, continue implementation after the necessary specification. Respect an explicit request to review before coding.

## Persistence

Write specification files only when requested or required by project conventions. Follow existing locations and naming. For a requested spec without a convention, use `SPEC.md`; for a requested multi-module specification, use a root capability map and `SPEC-[module-id].md` files. Do not create these files for ordinary conversation-only planning.

Update an existing maintained spec when the authorized change makes it inaccurate. Keep identifiers stable and link module specs to their map. Do not create tracker items or send external messages merely because a spec mentions a tracker.

## Verification

The requirements are sufficient to implement and verify the outcome, significant decisions are resolved or explicitly blocked, and existing approvals are respected. Persisted artifacts follow the requested project convention. Do not require six sections, a new file, or a human approval round when the task does not need them.

## Common Rationalizations

“Loading a spec skill requires another approval” — retain prior decisions and authorization; ask only about material unresolved changes.

## Red Flags

Invented requirements; repeated approval stages; new files without a persistence need; implementation after a plan-only request.
