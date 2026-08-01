/**
 * Risk-driven audit-trigger engine for Stage E (W4-P3). Two inputs, one
 * decision (FOREMAN-LINE-PLAN §6): the DECLARED risk from the parcel's
 * governing active spec (resolved in `governing-spec.ts`) and the DERIVED
 * risk computed here from the set of changed diff paths via the §6
 * path→audit-domain mapping. `decision = max(declared, derived)`.
 *
 * `triggered` and `drift` are INDEPENDENT axes (coordinator ruling OQ5):
 *   - `triggered = decision >= 'elevated'`  (the audit-suite should run)
 *   - `drift     = declaredRisk < derivedRisk`  (the spec under-declared)
 * `drift` NEVER forces `triggered:true`.
 *
 * The rich `AuditTriggerDecision` is engine-internal and is NEVER persisted.
 * `toAuditTriggerEvaluation` projects it to the frozen, read-only contract
 * `AuditTriggerEvaluation { triggered, reason? }` (consumed by W4-P1's shipped
 * `emitIntegrationReceipt`) — it returns EXACTLY those keys (frozen-contract
 * guard). Nothing here mints a `correlationId` or constructs a receipt.
 */
import type { AuditTriggerEvaluation } from '../../contracts/src/index.js'

/**
 * Ordinal risk level. Defined LOCALLY: the four-level `low < standard <
 * elevated < critical` enum is canonically SPEC-CONVENTION §4.6, but
 * `contracts/src` exports no such type and the only code copy lives in
 * `spec-linter/src`, which this package is forbidden to import (no
 * `integration → spec-linter` edge — AC1). The local definition mirrors
 * W4-P1's local `inheritCorrelation` pattern; SPEC-CONVENTION §4.6 stays the
 * canonical source so any future enum divergence is visible.
 */
export type RiskLevel = 'low' | 'standard' | 'elevated' | 'critical'

/** Ascending ordinal — index is the rank (SPEC-CONVENTION §4.6). */
const RISK_ORDER: readonly RiskLevel[] = ['low', 'standard', 'elevated', 'critical']

function riskRank(level: RiskLevel): number {
  return RISK_ORDER.indexOf(level)
}

/** `max` over the risk ordinal. */
export function maxRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  return riskRank(a) >= riskRank(b) ? a : b
}

/** `a < b` over the risk ordinal (used for the drift axis). */
export function riskLessThan(a: RiskLevel, b: RiskLevel): boolean {
  return riskRank(a) < riskRank(b)
}

/** `level >= floor` over the risk ordinal (used for the triggered axis). */
export function riskAtLeast(level: RiskLevel, floor: RiskLevel): boolean {
  return riskRank(level) >= riskRank(floor)
}

/**
 * Engine-internal decision (never persisted to a receipt). `governingSpec` is
 * the resolved active-spec path, or null when no active spec governs.
 */
export interface AuditTriggerDecision {
  readonly declaredRisk: RiskLevel
  readonly derivedRisk: RiskLevel
  readonly decision: RiskLevel
  readonly triggered: boolean
  readonly drift: boolean
  readonly governingSpec: string | null
  readonly reasons: readonly string[]
}

export interface DeriveRiskResult {
  readonly derivedRisk: RiskLevel
  readonly reasons: readonly string[]
}

/**
 * A single §6 derived-risk rule: a path predicate and the audit domain(s) it
 * implies. The table is ordered and documented; every rule that matches at
 * least one changed path contributes its domain to `reasons`. Any match at all
 * raises `derivedRisk` to `'elevated'` (§6: "the audit-suite should run"); no
 * match leaves it at `'low'`. No new runtime dependency is introduced.
 */
interface DerivedRule {
  readonly domain: string
  readonly test: (path: string) => boolean
  /** Appended verbatim to the reason when this rule matches (caveats, etc.). */
  readonly note?: string
}

/** Normalize a changed path for matching: forward slashes, lowercased. */
function normalize(path: string): string {
  return path.replace(/\\/g, '/').toLowerCase()
}

// ── §6 path→audit-domain rule table (ordered, deterministic) ────────────────
//
// (a) auth / authz / secrets / tenancy / session / crypto     → security
// (b) IaC (Pulumi/Terraform) / Dockerfiles / CI-workflow files → infra + supply-chain
// (c) lockfile / dependency-manifest changes                   → supply-chain
// (d) new external endpoint / data-egress (path heuristic)     → security + compliance
//
// Rule (d) is a CONSERVATIVE path heuristic only; its reason states the
// limitation. Deep egress analysis is deferred to the dispatched audit run
// (W4-FUP-AUDIT), per §6 / OQ resolution — the category is NOT dropped.
const DERIVED_RULES: readonly DerivedRule[] = [
  {
    domain: 'security',
    // Keywords match as a SUBSTRING WITHIN A SEGMENT (`[^/]*kw[^/]*`), not
    // delimiter-anchored — so camelCase/concatenated names (authService,
    // sessionManager, cryptoHelper, tokenStore, …) are caught, the dangerous
    // false-negative direction (RA-1/RB-1). Linear-time: segment-bounded
    // `[^/]*` around a fixed alternation, no nested quantifiers (lesson #19).
    // Bare `key` is deliberately excluded (over-matches `monkey`/`keyboard`);
    // only `apikey`/`keystore` and delimiter-bounded `key` forms qualify.
    test: (p) =>
      /(^|\/)[^/]*(auth|session|crypto|secret|tenan|credential|oauth|jwt|token|password|passwd|apikey|keystore|key-|-key|key_|_key)[^/]*(\/|$)/.test(
        p,
      ) || /(^|\/)key(\/|$)/.test(p),
  },
  {
    domain: 'infra+supply-chain',
    test: (p) =>
      /\.tf$/.test(p) ||
      /\.tfvars$/.test(p) ||
      /(^|\/)pulumi\.[^/]+$/.test(p) ||
      // `dockerfile` as a segment component: Dockerfile, Dockerfile.prod
      // (variant), api.dockerfile — not only the bare `dockerfile$` form.
      /(^|\/)[^/]*dockerfile[^/]*$/.test(p) ||
      /(^|\/)\.github\/workflows\/[^/]+\.ya?ml$/.test(p),
  },
  {
    domain: 'supply-chain',
    test: (p) =>
      /(^|\/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|package\.json|cargo\.lock|cargo\.toml|go\.sum|go\.mod|poetry\.lock|pipfile\.lock|requirements\.txt|gemfile\.lock)$/.test(
        p,
      ),
  },
  {
    domain: 'security+compliance',
    note: 'egress detection is a conservative path heuristic only; deep egress analysis is deferred to the dispatched audit run (W4-FUP-AUDIT)',
    test: (p) =>
      /(^|\/)(webhooks?|egress|outbound|endpoints?)(\/|$)/.test(p) ||
      /(^|\/)[^/]*(webhook|egress|outbound|http-?client|apiclient)[^/]*$/.test(p),
  },
]

/**
 * Derived-risk mapping (§6, deterministic). Any category match ⇒
 * `derivedRisk = 'elevated'` with the matched domain named in `reasons`; no
 * match ⇒ `'low'`. Pure — no I/O, no side effects.
 */
export function deriveRisk(changedPaths: readonly string[]): DeriveRiskResult {
  const normalized = changedPaths.map(normalize)
  const reasons: string[] = []

  for (const rule of DERIVED_RULES) {
    const matched = normalized.filter((p) => rule.test(p))
    if (matched.length > 0) {
      const base = `derived:${rule.domain} (paths: ${matched.join(', ')})`
      reasons.push(rule.note === undefined ? base : `${base} — ${rule.note}`)
    }
  }

  return { derivedRisk: reasons.length > 0 ? 'elevated' : 'low', reasons }
}

export interface EvaluateAuditTriggerInput {
  /** Declared risk from the governing active spec ('low' floor when none). */
  readonly declaredRisk: RiskLevel
  /** Changed diff paths — derived risk is computed from these via §6. */
  readonly changedPaths: readonly string[]
  /** Resolved governing active-spec path, or null (no-governing-spec). */
  readonly governingSpec?: string | null
  /** Extra reasons from governing-spec resolution (no/multi-spec notes). */
  readonly extraReasons?: readonly string[]
}

/**
 * Composes the decision: `derivedRisk` from `deriveRisk(changedPaths)`,
 * `decision = max(declared, derived)`, `triggered = decision >= 'elevated'`,
 * `drift = declared < derived`. `triggered` reflects the decision ONLY — it is
 * never set true merely because of drift. Reasons fold derived-domain matches,
 * the governing-spec note(s), and a `spec-drift` note (when drift) together.
 */
export function evaluateAuditTrigger(input: EvaluateAuditTriggerInput): AuditTriggerDecision {
  const { declaredRisk, changedPaths } = input
  const governingSpec = input.governingSpec ?? null
  const { derivedRisk, reasons: derivedReasons } = deriveRisk(changedPaths)

  const decision = maxRisk(declaredRisk, derivedRisk)
  const triggered = riskAtLeast(decision, 'elevated')
  const drift = riskLessThan(declaredRisk, derivedRisk)

  const reasons: string[] = [...derivedReasons, ...(input.extraReasons ?? [])]
  if (drift) {
    reasons.push(`spec-drift: declared '${declaredRisk}' < derived '${derivedRisk}'`)
  }

  return { declaredRisk, derivedRisk, decision, triggered, drift, governingSpec, reasons }
}

/**
 * Projects the engine-internal decision to the FROZEN, read-only contract
 * `AuditTriggerEvaluation { triggered, reason? }`. Returns EXACTLY those keys
 * (frozen-contract guard — AC7): no `drift`/`decision`/`governingSpec` key ever
 * leaks onto the receipt. `triggered` is `decision >= 'elevated'` (never true
 * merely because of drift); any drift + domain reasons fold into `reason`.
 */
export function toAuditTriggerEvaluation(decision: AuditTriggerDecision): AuditTriggerEvaluation {
  if (decision.reasons.length === 0) {
    return { triggered: decision.triggered }
  }
  return { triggered: decision.triggered, reason: decision.reasons.join('; ') }
}
