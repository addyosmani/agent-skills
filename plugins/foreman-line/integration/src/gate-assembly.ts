/**
 * GitHub gate assembly (W4-P4, AC14-AC15; the D8-bounded part). Two PURE
 * functions that compose the desired required-check set + human-review
 * requirement and PRODUCE the branch-protection/ruleset config diff as a
 * stop-and-present DATA artifact.
 *
 * D8 boundary (coordinator ruling Q3): these functions NEVER apply a ruleset,
 * call NO mutating GitHub API, and add NO required-status job. The returned
 * `BranchProtectionDiff.applied` is ALWAYS `false`. The actual ruleset
 * application + the report-only -> required-status promotion are HUMAN
 * stop-and-present steps at SCAF-P4 exit (PR4-7). The current posture is read
 * via W4-P1's `verifyBranchProtectionPosture` over an INJECTED effective-rules
 * payload (the live fetch is human-owned at exit — lesson #15/#28).
 */
import type { BranchProtectionVerdict, EffectiveRulesResponse } from './branch-protection.js'
import { verifyBranchProtectionPosture } from './branch-protection.js'

/** A candidate CI check the coordinator proposes for the required set. */
export interface CandidateCheck {
  readonly name: string
  readonly owningWorkflow: string
  /** Only blocking checks are promoted into `requiredChecks`; report-only are documented, not promoted. */
  readonly blocking: boolean
}

export interface RequiredCheckComposition {
  /** Check names that SHOULD gate the merge (the blocking candidates, in input order). */
  readonly requiredChecks: readonly string[]
  readonly requirePullRequest: boolean
  readonly requireHumanReview: boolean
  readonly rationale: readonly string[]
}

export interface BranchProtectionDiff {
  /** ALWAYS false — this is a stop-and-present artifact, never an applied change (D8). */
  readonly applied: false
  /** The current posture from `verifyBranchProtectionPosture` over the injected rules. */
  readonly currentPosture: BranchProtectionVerdict
  /** The ruleset config a human would apply (data only). */
  readonly desiredRuleset: unknown
  /** Human-readable current -> desired deltas. */
  readonly diff: readonly string[]
  /** The D8 stop-and-present steps a human performs (never the agent). */
  readonly humanChecklist: readonly string[]
}

/**
 * Compose the required-check set from candidate descriptors. Blocking
 * candidates become required checks (in input order); report-only candidates
 * are NOT promoted. A PR and a human review are always required (D6/PR4-1 — the
 * human merge is structural). Pure: no I/O, no GitHub API.
 */
export function composeRequiredChecks(
  candidates: readonly CandidateCheck[],
): RequiredCheckComposition {
  const requiredChecks = candidates.filter((c) => c.blocking).map((c) => c.name)
  const reportOnly = candidates.filter((c) => !c.blocking).map((c) => c.name)

  const rationale: string[] = [
    `${requiredChecks.length} blocking check(s) promoted to required: ${requiredChecks.join(', ') || '(none)'}`,
    'a pull request is required before merge (no direct pushes to the protected branch)',
    'a human review is required — the merge is the non-delegable human gate (charter D6/PR4-1)',
  ]
  if (reportOnly.length > 0) {
    rationale.push(
      `${reportOnly.length} report-only check(s) NOT promoted (report-only -> required is a human D8 phase, PR4-7): ${reportOnly.join(', ')}`,
    )
  }

  return {
    requiredChecks,
    requirePullRequest: true,
    requireHumanReview: true,
    rationale,
  }
}

/**
 * Produce the branch-protection diff as DATA. Reports the current posture over
 * the INJECTED effective-rules payload via `verifyBranchProtectionPosture`,
 * describes the desired ruleset, and computes the human-readable gap +
 * checklist. Applies NOTHING (`applied: false`); calls NO mutating GitHub API.
 */
export function buildBranchProtectionDiff(
  current: EffectiveRulesResponse,
  desired: RequiredCheckComposition,
  identity: string,
): BranchProtectionDiff {
  const currentPosture = verifyBranchProtectionPosture(current, identity)

  const hasPullRequestRule = current.rules.some((rule) => rule.ruleType === 'pull_request')
  const hasStatusChecksRule = current.rules.some(
    (rule) => rule.ruleType === 'required_status_checks',
  )

  const diff: string[] = []
  if (desired.requirePullRequest && !hasPullRequestRule) {
    diff.push("add a 'pull_request' rule requiring a PR (and a human review) before merge")
  }
  if (desired.requiredChecks.length > 0) {
    if (!hasStatusChecksRule) {
      diff.push(`bind a 'required_status_checks' rule with: ${desired.requiredChecks.join(', ')}`)
    } else {
      diff.push(
        `promote report-only checks to required status checks: ${desired.requiredChecks.join(', ')}`,
      )
    }
  }
  for (const actor of current.bypassActors) {
    if (actor.bypassMode !== 'none') {
      diff.push(
        `review bypass actor '${actor.actorId}' (mode ${actor.bypassMode}) — it weakens the gate`,
      )
    }
  }
  if (diff.length === 0) {
    diff.push('no changes required — the current posture already matches the desired ruleset')
  }

  const desiredRuleset: unknown = {
    target: 'branch',
    enforcement: 'active',
    rules: {
      pull_request: {
        required: desired.requirePullRequest,
        requireHumanReview: desired.requireHumanReview,
      },
      required_status_checks: {
        checks: [...desired.requiredChecks],
      },
    },
  }

  const humanChecklist: string[] = [
    'Review the desiredRuleset below — this artifact applies NOTHING (D8).',
    'A human applies the branch-protection ruleset via the GitHub UI or an authorized admin token; the agent never applies it.',
    'Promote the report-only Foreman Line CI checks to required status checks as a second human-gated phase (PR4-7).',
    `Confirm the effective-rules posture binds the identity '${identity}' (verifyBranchProtectionPosture canMerge:false) after applying.`,
  ]

  return {
    applied: false,
    currentPosture,
    desiredRuleset,
    diff,
    humanChecklist,
  }
}
