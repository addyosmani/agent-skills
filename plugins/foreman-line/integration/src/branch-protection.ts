/**
 * Branch-protection posture verifier (W4-P1, AC8; lesson #15, coordinator
 * ruling Q3). A read-only assertion over an effective-rules API response
 * SUPPLIED AS A PARAMETER (fixtured in tests) — the real GitHub effective-
 * rules API call is an injected seam, exercised live only at exit by the
 * coordinator/human. This module never writes/configures a ruleset.
 *
 * Posture semantics (coordinator note): `canMerge: false` is the DESIRED/OK
 * posture — the agent/coordinator identity is correctly blocked from
 * merging. `canMerge: true` is a posture FAIL.
 */
import { execFileSync } from 'node:child_process'

/** One rule as returned by GitHub's effective-rules API for a branch. */
export interface EffectiveRule {
  readonly ruleType: string
}

/** A ruleset bypass actor entry, scoped to the identity it applies to. */
export interface BypassActor {
  readonly actorId: string
  readonly bypassMode: 'always' | 'pull_request' | 'none'
}

/** Simplified effective-rules payload this verifier reads (an INPUT, never fetched itself). */
export interface EffectiveRulesResponse {
  readonly rules: readonly EffectiveRule[]
  readonly bypassActors: readonly BypassActor[]
}

export interface BranchProtectionVerdict {
  readonly canMerge: boolean
  readonly reasons: readonly string[]
}

/**
 * Read-only: asserts whether `identity` can merge given `effectiveRules`.
 * `canMerge === false` (empty `reasons`) is the OK posture — a rule set that
 * binds the identity (require-PR + required-checks, no bypass for it).
 * `canMerge === true` (non-empty `reasons`) is a posture FAIL.
 */
export function verifyBranchProtectionPosture(
  effectiveRules: EffectiveRulesResponse,
  identity: string,
): BranchProtectionVerdict {
  const reasons: string[] = []

  const requiresPullRequest = effectiveRules.rules.some((rule) => rule.ruleType === 'pull_request')
  const requiresStatusChecks = effectiveRules.rules.some(
    (rule) => rule.ruleType === 'required_status_checks',
  )
  const bypassForIdentity = effectiveRules.bypassActors.find(
    (actor) => actor.actorId === identity && actor.bypassMode !== 'none',
  )

  if (!requiresPullRequest) {
    reasons.push("no 'pull_request' rule requires a PR before merge")
  }
  if (!requiresStatusChecks) {
    reasons.push("no 'required_status_checks' rule is bound")
  }
  if (bypassForIdentity !== undefined) {
    reasons.push(
      `identity '${identity}' has a bypass actor entry (mode: ${bypassForIdentity.bypassMode})`,
    )
  }

  return { canMerge: reasons.length > 0, reasons }
}

/** Injected seam for the real, live effective-rules API call (`gh api`). */
export type FetchEffectiveRulesFn = (args: {
  readonly branch: string
  readonly repoRoot: string
}) => unknown

/**
 * Real effective-rules fetch via `gh api repos/:owner/:repo/rules/branches/:branch`
 * (lesson #15). Returns `unknown`, NOT `EffectiveRulesResponse` — raw GitHub
 * effective-rules JSON does not have this package's simplified
 * `{rules, bypassActors}` shape (RW1). The CALLER is responsible for
 * normalizing the raw GitHub JSON into an `EffectiveRulesResponse` (and
 * validating the result) before passing it to `verifyBranchProtectionPosture`
 * — that normalization is deliberately out of scope for this hermetic
 * package (Q3: it cannot be hermetically tested against the live API) and is
 * deferred to SCAF-P4's live exit wiring (see spec §Follow-ups, W4-P1-FUP-1).
 * Skipping the normalization step and passing this function's result
 * straight through would either throw at the `.rules`/`.bypassActors` access
 * or silently produce a wrong posture verdict on a security control — do not
 * do that.
 *
 * Not exercised by the hermetic test suite — every test injects
 * `fetchEffectiveRulesFn`/a fixture `EffectiveRulesResponse` directly.
 * Exported for the coordinator/human's live exit-time use only.
 */
export function fetchEffectiveRulesLive(args: {
  readonly branch: string
  readonly repoRoot: string
}): unknown {
  const stdout = execFileSync('gh', ['api', `repos/{owner}/{repo}/rules/branches/${args.branch}`], {
    cwd: args.repoRoot,
    encoding: 'utf8',
  })
  return JSON.parse(stdout) as unknown
}
