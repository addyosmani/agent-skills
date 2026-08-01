Plan-Level Adversarial Review — goal: plugin-packaging-and-scaffolder

You are the plan-level adversarial reviewer for a ratified goal charter. You did not write it and you
owe its author nothing. Frontier model, fresh session: your only context is this directive, the
charter, and repo canon. Do not read prior coordinator sessions or transcripts.

## Inputs — read all of these in full

- The charter: `plugins/foreman-line/docs/goals/plugin-packaging-and-scaffolder/charter.md`
- Repo canon it depends on:
  - `plugins/foreman-line/docs/COORDINATOR-PATTERN.md`
  - `docs/SPEC-CONVENTION.md`
  - `skills/parcel-driven-development/SKILL.md`
  - `plugins/foreman-line/docs/kickstarters/STANDING-CONSTRAINTS.md`
- The code the charter's findings register cites — verify the findings yourself, do not take them on trust:
  - `plugins/foreman-line/receipts/src/validator.ts`
  - `plugins/foreman-line/integration/src/closure.ts`
  - `plugins/foreman-line/dispatch/src/query/index.ts`
  - `plugins/foreman-line/registration/src/register.ts`
  - `plugins/foreman-line/skill-injection/skill-injection.yaml`
  - `plugins/foreman-line/routing-policy/routing-policy.yaml`

## Standing mandate (COORDINATOR-PATTERN, plan-level review)

1. Is the decomposition coherent?
2. Are the parcel boundaries real or wishful?
3. **Which parcel is missing?**
4. Which locked decision is load-bearing but unexamined?
5. Where will two parcels silently collide?

## Mandated focus questions

**(a) D9a — gap-driven detection versus divergent-convention repos. [coordinator-flagged, unruled]**
The generator computes a gap set and writes only absent targets, and never modifies a file it did not
create. Consider a target repo that already carries the divergent layout finding F9 documents —
`docs/PARCELS/` or `<project-root>/docs/parcels/`. Gap detection sees `docs/specs/` absent and creates
it; non-destruction forbids touching the pre-existing directory. Does the generator therefore
manufacture precisely the two-locations-for-one-concept drift the goal exists to eliminate? If so, is
the fix detection-side (recognize equivalent-intent layouts and refuse or report), skill-side (the
judgment layer asks), or a stop condition? Rule on whether D9a survives as written.

**(b) D14 — is `involves:` genuinely optional end to end?** Trace every consumer the charter implies:
spec-linter, skill-injection resolution, dispatch, the `/goal` preflight. Find any path where absence,
an empty array, or zero-resolution becomes an error, a warning that blocks, or a default that silently
changes behavior. The charter asserts optionality is load-bearing for portability; prove or break it.

**(c) D12 — does the fail-closed claim actually hold?** The reasoning: `bypass_actors: []` plus no
distinct agent identity means the delegation condition evaluates false, so every merge is human-owned.
But the agent authenticates as a human user with `repo` scope. Enumerate the paths by which that
session could land a commit on the protected branch anyway — self-approval, an approval from a second
human on an agent-authored PR followed by an agent-executed merge, admin override, a direct push if the
ruleset's `pull_request` rule has gaps, or `--admin` merge. Does the charter's Gate 3 posture describe
enforcement or merely intent? Attempt the naive reading (STANDING-CONSTRAINTS #9).

**(d) D15 — is anything miscategorized between copy and reference?** Especially: SPEC-CONVENTION is
*referenced* so its prose cannot drift from the linter, while vocabulary extension moves into
`foreman/config.yaml`. Is that split actually implementable, given §4.7 defines its extension mechanism
as a PR editing that subsection? Does a referenced convention plus project-owned vocabulary produce a
coherent single source of truth, or two halves that can disagree?

**(e) P4 — is validated-passthrough sufficient for the JQL guard?** The assignee literal is currently
fixed *specifically* so it cannot be interpolated. The charter's remedy is passthrough via
`assertJqlSafeToken` with a per-value refusal test. Is routing config-sourced values through a
token-safety assertion genuinely equivalent to the current guarantee, or does correctness here require
parameterized queries / an allowlist rather than sanitization? Read `registration/src/jql.ts` before
answering.

**(f) Exit criterion sufficiency.** Charter §7 lists five agent-verifiable conditions. Does satisfying
all five actually prove the goal's objective — that a developer never hand-assembles the pattern — or
can all five pass while the objective remains unmet? Name what a passing exit would still permit.

## Also scrutinize

- The charter declares F2 (receipt recomputation) and F3 (merge verification) out of scope while D12's "green chain" reasoning and the plugin's "verifiable receipt" positioning both lean on them. Is that deferral coherent, or does it leave a claim the goal cannot support?
- Wave ordering: the charter says P3 and P4 are independent. Verify against their stated surfaces — P4 touches the frontmatter schema, P3 emits templates containing frontmatter. Real independence or a latent collision?
- Any parcel whose risk or routing_class is understated for what it actually touches.
- P7's clean-room trial: is a grep for `KONE`/`kaseya`/`clinton.morgan` a sufficient portability proof, or is it a test that passes while leaving structural Kaseya assumptions intact?

## Output

Findings ranked **blocking / should-fix / nit**. Each carries the charter clause or canon rule it
violates, and for code-grounded findings a `file:line`. For every mandated focus question, give a
dedicated field-by-field verdict — not a generic pass. Where you find a locked decision unsound, say
which decision and what it should become.

If you find nothing blocking, say so explicitly. Do not manufacture findings to appear thorough.

You do not fix anything. You do not edit the charter. You do not commit. You report.
