import type { RuleBlock, RuleEntry } from '@nizos/probity'

import { isRuleBlock, type Globs } from './scoping.js'

/**
 * Review obligations (issue #181): a path carved out of a rule (a TDD
 * exemption for thin rendering code, say) is only safe if review keeps
 * it thin. The exemption declares that review on the negation itself:
 *
 *   tddGlobs: ['ui/web/src/**', {
 *     glob: '!ui/web/src/commonMain/**\/*Screen.kt', id: 'thin-rendering',
 *     reviewWith: 'code-reviewer',
 *     check: 'no branching on domain state; only renders view-model fields',
 *     reason: 'screens are thin rendering; logic is unit-tested in the view model',
 *   }]
 *
 * The block gets the plain `!` negation, plus the obligation as metadata
 * under a registered symbol. Object spreads keep it (anchoring, excludes,
 * judge labels), and `Symbol.for` matches it across the separate module
 * copies a jiti-loaded config can end up with. The router lists the
 * obligations a diff incurs; the record must show each one addressed.
 */
export type ReviewedExemption = {
  /** The negation, e.g. `!**\/*Screen.kt` (a missing `!` is added). */
  glob: string
  /** Kebab-case name, used in the `Review-obligation:` trailer. */
  id: string
  /** Persona that must review these files (`code-reviewer`, `agent-skills:code-reviewer`). */
  reviewWith: string
  /** What that reviewer must confirm. */
  check: string
  /** Why the files are exempt from the rule. */
  reason: string
}

export type ReviewedGlob = string | ReviewedExemption
/** A non-empty reviewed glob list, like `Globs` for `files`. */
export type ReviewedGlobs = readonly [ReviewedGlob, ...ReviewedGlob[]]

const OBLIGATIONS = Symbol.for('@jjchill/probity-rules/review-obligations')
const UNREVIEWED = Symbol.for('@jjchill/probity-rules/unreviewed-exemptions')

const ID = /^[a-z0-9][a-z0-9-]*$/
const AGENT = /^(?:[a-z0-9][a-z0-9-]*:)?[a-z0-9][a-z0-9-]*$/

function validate(exemption: ReviewedExemption): ReviewedExemption {
  const fail = (what: string) => {
    throw new Error(`Invalid review obligation ${JSON.stringify(exemption.id)}: ${what}`)
  }
  if (!ID.test(exemption.id ?? '')) fail('id must be kebab-case (e.g. thin-rendering)')
  if (!AGENT.test(exemption.reviewWith ?? '')) fail('reviewWith must be a persona name (e.g. code-reviewer)')
  if (!exemption.check?.trim()) fail('check must say what the reviewer confirms')
  if (!exemption.reason?.trim()) fail('reason must say why the files are exempt')
  if (!exemption.glob?.replace(/^!/, '')) fail('glob is empty')
  return { ...exemption, glob: exemption.glob.startsWith('!') ? exemption.glob : `!${exemption.glob}` }
}

/**
 * Plain globs for a block's `files`, the obligations the objects declare,
 * and the plain `!` negations that declared none (for scope-report).
 */
export function splitReviewedGlobs(
  globs: readonly ReviewedGlob[],
  options: { requireInclude?: boolean } = {},
): {
  globs: string[]
  obligations: ReviewedExemption[]
  unreviewed: string[]
} {
  const out: string[] = []
  const obligations: ReviewedExemption[] = []
  const unreviewed: string[] = []
  for (const glob of globs) {
    if (typeof glob === 'string') {
      out.push(glob)
      if (glob.startsWith('!')) unreviewed.push(glob)
      continue
    }
    const exemption = validate(glob)
    if (obligations.some((other) => other.id === exemption.id)) {
      throw new Error(`Invalid review obligation "${exemption.id}": declared twice`)
    }
    obligations.push(exemption)
    out.push(exemption.glob)
  }
  // An all-negation `files` list means "everything except", so a tddGlobs
  // of only exemptions would widen TDD to the whole repo.
  if (options.requireInclude && !out.some((glob) => !glob.startsWith('!'))) {
    throw new Error(`The glob list needs at least one include glob, not only exemptions: ${JSON.stringify(out)}`)
  }
  return { globs: out, obligations, unreviewed }
}

/** Attaches obligations (and undeclared negations) to a rule block. */
export function withObligations<T extends RuleBlock>(
  block: T,
  obligations: readonly ReviewedExemption[],
  unreviewed: readonly string[],
): T {
  return Object.assign({ ...block }, { [OBLIGATIONS]: [...obligations], [UNREVIEWED]: [...unreviewed] })
}

/** A `{ files, rules }` block whose `files` may hold reviewed exemptions. */
export function reviewedBlock(block: Omit<RuleBlock, 'files'> & { files: readonly ReviewedGlob[] }): RuleBlock {
  const split = splitReviewedGlobs(block.files)
  if (split.globs.length === 0) throw new Error('reviewedBlock: files must not be empty')
  return withObligations({ ...block, files: split.globs as unknown as Globs } as RuleBlock, split.obligations, split.unreviewed)
}

type Tagged = { [OBLIGATIONS]?: ReviewedExemption[]; [UNREVIEWED]?: string[] }

/** Every obligation declared across a config's rule entries, first declaration per id. */
export function obligationsOf(entries: readonly RuleEntry[]): ReviewedExemption[] {
  const found = new Map<string, ReviewedExemption>()
  for (const entry of entries) {
    if (!isRuleBlock(entry)) continue
    for (const obligation of (entry as Tagged)[OBLIGATIONS] ?? []) {
      if (!found.has(obligation.id)) found.set(obligation.id, obligation)
    }
  }
  return [...found.values()]
}

/** Blocks (by index) whose reviewed-glob option carried plain `!` negations with no obligation. */
export function unreviewedExemptionsOf(entries: readonly RuleEntry[]): { block: number; globs: string[] }[] {
  return entries.flatMap((entry, block) => {
    const globs = isRuleBlock(entry) ? ((entry as Tagged)[UNREVIEWED] ?? []) : []
    return globs.length > 0 ? [{ block, globs }] : []
  })
}

/**
 * Tags the block whose `files` is exactly `files` (by identity) with the
 * split's obligations, for presets that build their TDD block inline.
 */
export function tagReviewedBlock(
  entries: RuleEntry[],
  files: readonly string[],
  split: { obligations: readonly ReviewedExemption[]; unreviewed: readonly string[] },
): RuleEntry[] {
  if (split.obligations.length === 0 && split.unreviewed.length === 0) return entries
  return entries.map((entry) =>
    isRuleBlock(entry) && entry.files === files ? withObligations(entry, split.obligations, split.unreviewed) : entry,
  )
}
