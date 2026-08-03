/**
 * Shared test fixtures and helpers. Not a test file (node --test only runs
 * `*.test.ts`), so it defines no `test()` cases.
 */
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** A fresh, isolated temp directory used as a fake repo root for emit/read tests. */
export function makeTempRepoRoot(): string {
  return mkdtempSync(join(tmpdir(), 'foreman-shaping-'))
}

/** A SPEC-CONVENTION §4 v0.2-conformant draft: valid frontmatter + all five sections in order. */
export const CONFORMANT_DRAFT = `---
ticket: KONE-9001
title: Example Draft
status: draft
owner: clinton.morgan
created: 2026-07-22
updated: 2026-07-22
supersedes: null
superseded_by: null
risk: standard
surfaces: [docs/example.md]
routing_class: standard-feature
---

# Example Draft

## Intent
Produce an example outcome that matters.

## Constraints
Follow the established pattern.

## Acceptance Criteria
1. It works.

## Out of Scope
- The adjacent thing we are not doing.

## Context & References
- docs/SPEC-CONVENTION.md
`

/** Frontmatter missing the required v0.2 field `risk`. */
export const DRAFT_MISSING_RISK = CONFORMANT_DRAFT.replace('risk: standard\n', '')

/** Body missing the Constraints section entirely. */
export const DRAFT_MISSING_SECTION = CONFORMANT_DRAFT.replace(
  '## Constraints\nFollow the established pattern.\n\n',
  '',
)

/** Body with Out of Scope appearing before Acceptance Criteria (out of order). */
export const DRAFT_OUT_OF_ORDER = `---
ticket: KONE-9001
title: Example Draft
status: draft
owner: clinton.morgan
created: 2026-07-22
updated: 2026-07-22
supersedes: null
superseded_by: null
risk: standard
surfaces: [docs/example.md]
routing_class: standard-feature
---

# Example Draft

## Intent
Produce an example outcome that matters.

## Constraints
Follow the established pattern.

## Out of Scope
- The adjacent thing we are not doing.

## Acceptance Criteria
1. It works.

## Context & References
- docs/SPEC-CONVENTION.md
`

/** Body whose Out of Scope contains only the forbidden "None". */
export const DRAFT_EMPTY_OUT_OF_SCOPE = CONFORMANT_DRAFT.replace(
  '- The adjacent thing we are not doing.',
  '- None',
)

/** Out of Scope expressed as a prose paragraph (no bullet marker) - must pass. */
export const DRAFT_PROSE_OUT_OF_SCOPE = CONFORMANT_DRAFT.replace(
  '- The adjacent thing we are not doing.',
  'We deliberately do not touch the downstream projection or the registration flow.',
)

/** Out of Scope expressed as a numbered list - must pass. */
export const DRAFT_NUMBERED_OUT_OF_SCOPE = CONFORMANT_DRAFT.replace(
  '- The adjacent thing we are not doing.',
  '1. The downstream projection.\n2. The registration flow.',
)
