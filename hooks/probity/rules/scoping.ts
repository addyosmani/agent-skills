import picomatch from 'picomatch'

import { posix } from 'node:path'
import type { Action, RuleBlock, RuleEntry } from '@nizos/probity'

/**
 * Replica of Probity's glob-scoping internals, for the tooling in
 * this template set — the workflow eval and `scripts/scope-report.ts`
 * — which must resolve `{ files, rules }` blocks exactly the way the
 * real engine does. Hand-mirrored scoping predicates were the eval's
 * main blind spot: a template glob edit could silently diverge from
 * what the eval exercised.
 *
 * Probity implements these in `src/rules/utils/match-paths.ts`
 * (`buildMatcher`, `actionMatchesFilesScope`) and `src/config.ts`
 * (`anchorGlob` inside `loadConfig`), but its package `exports` map
 * (".", "./types", "./rules") does not expose them, so they are
 * ported here verbatim — same picomatch options, same anchoring
 * convention. Pinned against @nizos/probity 1.10.0: on a Probity
 * upgrade, diff this file against those two sources; if upstream
 * starts exporting them, delete this file and import instead.
 *
 * picomatch is Probity's own matcher dependency, so the same version
 * resolves here in any project with @nizos/probity installed; if your
 * package manager doesn't hoist it, add it: `npm install -D picomatch`.
 */

/** A `Config.rules` entry that carries a `files` scope. */
export function isRuleBlock(entry: RuleEntry): entry is RuleBlock {
  return typeof entry !== 'function'
}

/**
 * The non-empty glob list `RuleBlock.files` requires. A plain
 * `string[]` (even one built from a non-empty literal) is NOT
 * assignable to it — TS can't prove non-emptiness for a general array
 * type — so preset option types and any `files:` glob list built up
 * before use should be typed `Globs`, not `string[]`.
 */
export type Globs = NonNullable<RuleBlock['files']>

/**
 * Builds a path matcher from include/exclude patterns. Patterns
 * prefixed with `!` are negations (picomatch's `ignore` option);
 * everything else is an include. An all-negations list gets `**` as
 * the default include. `dot: true` so `*`/`**` traverse dot-prefixed
 * segments — without it a scoped rule silently skips dotfiles.
 *
 * Port of @nizos/probity `src/rules/utils/match-paths.ts#buildMatcher`.
 */
export function buildMatcher(
  patterns: readonly string[],
): (path: string) => boolean {
  if (patterns.length === 0) return () => false
  const includes = patterns.filter((p) => !p.startsWith('!'))
  const ignore = patterns
    .filter((p) => p.startsWith('!'))
    .map((p) => p.slice(1))
  const matcher = picomatch(includes.length ? [...includes] : '**', {
    dot: true,
    ignore,
  })
  return (path) => matcher(path)
}

/**
 * Whether a `{ files, rules }` block applies to an action. Empty
 * `files` matches nothing; non-write actions (commands) pass the
 * block-level filter and rules self-filter by action kind; write
 * actions are matched against `files`.
 *
 * Port of @nizos/probity
 * `src/rules/utils/match-paths.ts#actionMatchesFilesScope`.
 */
export function actionMatchesFilesScope(
  files: readonly string[],
  action: Action,
): boolean {
  if (files.length === 0) return false
  if (action.kind !== 'write') return true
  return buildMatcher(files)(action.path)
}

/**
 * `**`-prefixed globs are intentional "match anywhere" patterns;
 * anchoring them at the config dir would defeat the user's intent.
 * Negations carry the same convention through the `!` prefix.
 *
 * Port of @nizos/probity `src/config.ts#anchorGlob`.
 */
export function anchorGlob(glob: string, root: string): string {
  if (glob.startsWith('!')) return '!' + anchorGlob(glob.slice(1), root)
  if (glob.startsWith('**')) return glob
  // posix.join, as Probity does: `./` and `..` segments normalise the
  // same way here as in enforcement (issue #186).
  return posix.join(root.replace(/\\/g, '/'), glob)
}

/**
 * Anchors every block's relative globs against `root`, the way
 * Probity's `loadConfig` anchors them against the config file's
 * directory — so paths in `Action.path` (absolute POSIX) match
 * regardless of where the session is rooted. Flat rules pass through.
 */
export function anchorEntries(
  entries: readonly RuleEntry[],
  root: string,
): RuleEntry[] {
  return entries.map((entry) => {
    if (!isRuleBlock(entry) || !entry.files) return entry
    const [first, ...rest] = entry.files.map((glob) => anchorGlob(glob, root))
    return { ...entry, files: [first!, ...rest] as const }
  })
}

/**
 * Appends `!`-negations for `excludeGlobs` to every `{ files, rules }`
 * block's `files` list, so a preset's exclusion option (e.g. keeping
 * `spikes/**` or `**\/build/**` out of TDD/boundary scope) applies
 * uniformly without hand-editing each block. Flat rules (command
 * actions carry no `files` scope) pass through untouched, and an
 * empty `excludeGlobs` list is a no-op — the "disable it" escape
 * hatch a preset option exposes by accepting `[]`.
 */
export function withExcludeGlobs(
  entries: readonly RuleEntry[],
  excludeGlobs: readonly string[],
): RuleEntry[] {
  if (excludeGlobs.length === 0) return [...entries]
  const negations = excludeGlobs.map((glob) => (glob.startsWith('!') ? glob : `!${glob}`))
  return entries.map((entry) => {
    if (!isRuleBlock(entry) || !entry.files) return entry
    const [first, ...rest] = [...entry.files, ...negations]
    return { ...entry, files: [first!, ...rest] as const }
  })
}
