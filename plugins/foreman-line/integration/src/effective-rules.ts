/**
 * W4-P1-FUP-1 (CLOSE-P1) — typed-closed normalization of raw GitHub API JSON
 * into this package's `EffectiveRulesResponse` inputs. This is the explicit
 * boundary closure of the seam `fetchEffectiveRulesLive` deliberately left
 * open (`branch-protection.ts` returns `unknown` — Builder #2): normalization
 * happens HERE, where it is tested against a REAL captured response
 * (`tests/fixtures/effective-rules-live-capture.json`), never via a cast.
 *
 * Coordinator finding + ruling (2026-07-28, FLAG-1 resolution): the
 * branch-rules endpoint (`gh api repos/:owner/:repo/rules/branches/:branch`)
 * carries NO bypass-actor field anywhere in its response — bypass actors live
 * on the RULESET endpoint (`repos/:owner/:repo/rulesets/:id`,
 * `bypass_actors` field). Two normalizers therefore ship, one per endpoint
 * shape, and the caller composes them (`composeEffectiveRules`) — bypass data
 * is NEVER invented from the branch-rules response.
 *
 * Field mapping (verified against the captured fixture):
 *   - branch-rules: each array entry's `type` (non-empty string) →
 *     `EffectiveRule.ruleType`. That is the only field the domain consumes.
 *   - ruleset: `bypass_actors` (array) → `BypassActor[]`, entry mapping
 *     `actor_id` (positive safe integer) → `actorId` (its decimal string form) and
 *     `bypass_mode` ('always' | 'pull_request') → `bypassMode`. The captured
 *     `bypass_actors` is empty; the entry-level mapping is pinned against the
 *     documented GitHub ruleset schema and fails CLOSED (typed throw) on any
 *     entry shape it has not verified — including `actor_id: null` — rather
 *     than defaulting (Builder #1/#2; guessing is a stop condition).
 *
 * Every shape mismatch throws `EffectiveRulesNormalizationError` — never a
 * cast, never a partial/defaulted result.
 */
import type { BypassActor, EffectiveRule, EffectiveRulesResponse } from './branch-protection.js'

/** Typed error for every effective-rules shape mismatch (fail-closed). */
export class EffectiveRulesNormalizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EffectiveRulesNormalizationError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Normalizes a raw BRANCH-RULES endpoint response
 * (`gh api repos/:owner/:repo/rules/branches/:branch` — a JSON array of rule
 * entries) into the domain's `EffectiveRule[]`. Bypass actors are NOT part of
 * this endpoint's shape (coordinator finding) and are NOT produced here — see
 * `normalizeRulesetBypass` + `composeEffectiveRules`.
 */
export function normalizeEffectiveRules(raw: unknown): readonly EffectiveRule[] {
  if (!Array.isArray(raw)) {
    throw new EffectiveRulesNormalizationError(
      `branch-rules response root must be a JSON array, got ${describe(raw)}`,
    )
  }
  const rules: EffectiveRule[] = []
  for (let i = 0; i < raw.length; i++) {
    const entry: unknown = raw[i]
    if (!isRecord(entry)) {
      throw new EffectiveRulesNormalizationError(
        `branch-rules entry [${i}] must be a JSON object, got ${describe(entry)}`,
      )
    }
    const ruleType = entry.type
    if (typeof ruleType !== 'string' || ruleType.length === 0) {
      throw new EffectiveRulesNormalizationError(
        `branch-rules entry [${i}] has no non-empty string 'type', got ${describe(ruleType)}`,
      )
    }
    rules.push({ ruleType })
  }
  return rules
}

/**
 * Normalizes a raw RULESET endpoint response
 * (`gh api repos/:owner/:repo/rulesets/:id` — a JSON object carrying
 * `bypass_actors`) into the domain's `BypassActor[]`. Fails closed on any
 * entry whose `actor_id` is not an integer or whose `bypass_mode` is not one
 * of the two documented values — no defaulting.
 */
export function normalizeRulesetBypass(raw: unknown): readonly BypassActor[] {
  if (!isRecord(raw)) {
    throw new EffectiveRulesNormalizationError(
      `ruleset response root must be a JSON object, got ${describe(raw)}`,
    )
  }
  const bypassActorsRaw = raw.bypass_actors
  if (!Array.isArray(bypassActorsRaw)) {
    throw new EffectiveRulesNormalizationError(
      `ruleset response has no 'bypass_actors' array, got ${describe(bypassActorsRaw)}`,
    )
  }
  const bypassActors: BypassActor[] = []
  for (let i = 0; i < bypassActorsRaw.length; i++) {
    const entry: unknown = bypassActorsRaw[i]
    if (!isRecord(entry)) {
      throw new EffectiveRulesNormalizationError(
        `bypass_actors entry [${i}] must be a JSON object, got ${describe(entry)}`,
      )
    }
    const actorId = entry.actor_id
    // R4: safe-integer AND positive — 1e21 is an "integer" per Number.isInteger
    // but stringifies as '1e+21' (not the documented decimal form), and GitHub
    // actor ids are positive; anything else fails closed.
    if (typeof actorId !== 'number' || !Number.isSafeInteger(actorId) || actorId <= 0) {
      throw new EffectiveRulesNormalizationError(
        `bypass_actors entry [${i}] has no positive safe-integer 'actor_id', got ${describe(actorId)}`,
      )
    }
    const bypassMode = entry.bypass_mode
    if (bypassMode !== 'always' && bypassMode !== 'pull_request') {
      throw new EffectiveRulesNormalizationError(
        `bypass_actors entry [${i}] 'bypass_mode' must be 'always' or 'pull_request', got ${describe(bypassMode)}`,
      )
    }
    bypassActors.push({ actorId: String(actorId), bypassMode })
  }
  return bypassActors
}

/**
 * Composes the two normalizers' outputs into the frozen
 * `EffectiveRulesResponse` shape `verifyBranchProtectionPosture` consumes —
 * the caller-side composition the coordinator ruled (the frozen type is not
 * touched; no bypass data is invented from the branch-rules response).
 */
export function composeEffectiveRules(
  rules: readonly EffectiveRule[],
  bypassActors: readonly BypassActor[],
): EffectiveRulesResponse {
  return { rules, bypassActors }
}

/** Short, non-throwing description of an unexpected value for error messages. */
function describe(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'an array'
  if (typeof value === 'object') return 'an object'
  if (typeof value === 'string') return `string ${JSON.stringify(value)}`
  return `${typeof value} ${String(value)}`
}
