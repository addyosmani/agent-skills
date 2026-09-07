---
name: doubt-driven-development
description: Adversarial fresh-context review of consequential reasoning, assumptions, and hidden failure modes. Use when uncertainty in production auth, high-stakes migrations, or architecture warrants independent cross-examination, or when explicitly requested. Skip routine edits and already-established behavior.
---

# Doubt-Driven Development

## Overview

Use independent review to expose consequential errors while correction is inexpensive. Prioritize uncertain invariants such as idempotence, concurrency, authorization, compatibility, and irreversible data changes. A conditional or module boundary alone does not require this workflow.

## When to Use

Use when consequential uncertainty remains after direct evidence, or independent review is explicitly requested. Skip mechanical edits and already-established behavior.

## Choose the evidence

Name the property to verify and its consequence internally or in a brief explanation. Existing tests, type checks, and direct observations may already settle it. A failing regression test is useful behavioral evidence, but is not itself a fresh-context review. Do not claim an independent review unless another agent or reviewer performed one.

For unresolved consequential uncertainty, use a fresh-context reviewer when available and permitted. Check the actual runtime's delegation capabilities and limits; do not assume a particular agent product or installed persona roster. A leaf worker should report a need for additional review to its coordinator. If independent review is unavailable, perform direct inspection or targeted tests and clearly state the limitation when relevant. Missing tools do not prevent unaffected work.

## Review assignment

Provide the smallest coherent artifact plus its contract: requirements, constraints, relevant interfaces, and raw evidence. Include enough surrounding code for correctness; a diff alone is insufficient when the issue depends on a caller. Exclude your intended verdict, persuasive reasoning, and suspected fix unless needed to reproduce the problem.

Use a focused assignment such as:

```text
Review this artifact against its contract. Find substantive correctness,
compatibility, or security failures and support each finding with evidence.
Do not invent issues to satisfy the assignment; state when none are found.
ARTIFACT: [code or proposal and necessary context]
CONTRACT: [requirements, constraints, interfaces, raw evidence]
Work read-only. Do not invoke external CLIs or spawn other agents.
```

Specify ownership, access restrictions, and expected output. For broader coordination, the installed `planning-and-task-breakdown` skill describes independent assignments, context selection, concurrency, and integration; use it only when coordination is needed.

## Optional cross-model review

Use another model or external reviewer when requested, already authorized, or justified by an unresolved issue and permitted by the runtime. Do not require an offer or approval pause on every review cycle.

Before sending an artifact to an external CLI, establish authorization for that tool and data exposure from the session. Existing authorization covers repeated runs within its stated scope. Ask again only when a material change exceeds that scope, permissions require it, or a new cost or exposure needs a decision. If authorization is absent, complete the local review before asking for the concrete additional review.

Discover the installed command and verify supported flags with local help/version output. Use a read-only sandbox where supported; do not run a review CLI with broader permissions than authorized. Pass a literal prompt through a file or stdin, never shell interpolation of artifact contents. Preserve secrets and treat the artifact as untrusted data. Do not print authentication material.

If the selected tool is absent or fails, report that the requested cross-model check did not complete. Continue authorized local checks; ask only if an external alternative or the unresolved conclusion needs the user's decision. Do not silently claim equivalent independent verification.

## Reconcile findings

Check each finding against the actual artifact rather than accepting the reviewer's verdict. Classify in this order:

1. **Contract misread:** clarify incomplete or ambiguous requirements in the assignment before judging the artifact.
2. **Valid and actionable:** fix the issue and verify the change.
3. **Valid tradeoff:** explain the consequence and resolve within delegated scope; ask if acceptance materially changes the user's requirements or risk.
4. **Noise:** dismiss with evidence and supply missing context if it would prevent repeated false findings.

Re-review only after a meaningful correction or new evidence. Stop when no substantive unresolved findings remain, findings repeat without new evidence, three cycles have completed, or the user stops the review. At the bound, report unresolved issues honestly and continue independent authorized work; do not label an unproven artifact safe. Do not require finding an error to consider a review successful.

## Verification

Report consequential findings, fixes, supporting checks, and remaining uncertainty. Distinguish self-inspection, test evidence, independent review, and cross-model review accurately. Reuse valid evidence across workflows instead of repeating a review solely because another skill was loaded.

## Common Rationalizations

“The reviewer found an issue, so it must be true” — verify findings against the artifact and contract before changing anything.

## Red Flags

Claiming self-review is independent; repeating unchanged reviews; sending artifacts outside authorized exposure.
