# Remediation Parcel

## Gap Reference

<gate-id or scenario-id that failed and requires this remediation>

## Parcel ID

<remediation-<gap-ref>>

## Goal

<One sentence. What this parcel fixes.>

## Initiative

<initiative-id>

## Project Track

<repo/service/app track>

## Branch

<branch-prefix>/remediation-<gap-ref>

## Worktree

<C:\Repos\<repo>.remediation-<gap-ref> or platform equivalent>

## Dependencies

- <parcel-id this parcel cannot start until merged, or none>

## Integration Surfaces Affected

- <surface-id or none>

## Security Gate Affected

<none | gate-id — re-run security-review after merge>

## Allowed Files

- <exact path>

If a required file is not listed, stop and request a spec amendment before editing or creating it.

## Forbidden

- <things the agent must NOT do>
- <scope expansion beyond the specific gap>

## Out of Scope

<Explicit non-goals. This parcel addresses only the identified gap. It does not introduce new features.>

## Contract

<Inline type signatures, schema, API shape, or reference to existing contract>

## Required Tests

- <test file path or test behavior to verify>

## Acceptance Criteria

- <The failing scenario now passes in the target environment>
- <The gate status can be updated to passing with evidence>

## Verification

- <Exact commands to run>
- <What success looks like>
- <Evidence artifact to produce>

## Evidence Required

- <test output>
- <receipt or artifact path>
- <verification run record>

## Collision Risk

<Low | Medium | High>

## PR Notes

- What changed: <one-line summary>
- Gap addressed: <gate-id or scenario-id>
- Evidence produced: <artifact>

## Session Handoff

- Starting commit:
- Ending commit:
- Files changed:
- Commands run:
- Tests passed:
- Tests failed:
- Decisions needed:
- Blockers:
- Next safe action:
- Do not touch:

## Stop-and-Report Rule

If implementation requires a product decision not present in this spec, stop and report.

If the gap is larger than this parcel can address, stop and report. Do not expand scope silently.

If a security boundary is unclear, stop and request clarification before implementation.
