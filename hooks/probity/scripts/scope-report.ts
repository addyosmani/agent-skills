#!/usr/bin/env node
/**
 * Scoping dry-run for a Probity config: shows which files each
 * `{ files, rules }` block actually claims in YOUR repo, before the
 * first agent session finds out the hard way.
 *
 * Wrong glob scoping is the template set's main failure mode, and it
 * fails in two directions: over-scoping is loud (enforcePortsBoundary
 * pointed at adapter files blocks work those files are supposed to
 * do), but under-scoping is silent — a glob slightly too narrow for
 * your layout means enforcement simply never fires, and nothing
 * notices. This report surfaces both at setup time:
 *
 *   - DEAD SCOPE: a block whose globs match zero files
 *   - core-purity rules claiming adapter/DI/UI-looking production paths
 *   - the acceptance-language rule claiming Robot/driver/DSL files
 *
 * Globs are resolved exactly as Probity resolves them — anchoring and
 * picomatch semantics come from rules/scoping.ts, the same replica
 * the workflow eval uses.
 *
 * Usage (from your project root, next to your probity.config.ts):
 *
 *   npx probity-scope-report [--config probity.config.ts]
 *                             [--root .] [--strict]
 *
 *   npx probity-scope-report --strict --allow-empty 'src/adapters/**'
 *
 * --config defaults to probity.config.{ts,mts,js,mjs} found in
 * --root; --root defaults to the current working directory. --strict
 * exits 1 when any warning fires (for CI); otherwise warnings are
 * advisory and the exit code is 0.
 *
 * --allow-empty <glob> (repeatable) marks a block as expected to be
 * empty for now: a block listing that exact glob in its `files` is
 * reported as "empty (expected)" instead of DEAD SCOPE. This lets a
 * greenfield repository run --strict in CI from the first commit —
 * list the globs for layers that don't exist yet, and drop each flag
 * once its first file lands (the report notes a flag that has gone
 * stale). A flag naming no block's glob is a warning — a typo would
 * otherwise silently allow nothing.
 *
 * The config is loaded via jiti — the same TypeScript loader Probity
 * itself uses — rather than a bare dynamic `import()` of a .ts file,
 * so this works whether the consumer's config is .ts, .mts, .js, or
 * .mjs, with no separate build step for the config itself.
 */
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

import { createJiti } from 'jiti'

import type { Config, RuleBlock } from '@nizos/probity'

import { isWithin } from '../rules/commit-target.js'
import { obligationsOf, unreviewedExemptionsOf } from '../rules/review-obligations.js'
import { anchorGlob, buildMatcher, isRuleBlock } from '../rules/scoping.js'

const jiti = createJiti(import.meta.url)

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'build',
  '.gradle',
  'out',
  'dist',
  '.idea',
])
const SAMPLE_LIMIT = 6

// Paths a core-purity rule should normally NOT claim (adapters, DI,
// UI, platform source sets) and a spec-language rule should normally
// NOT claim (layer-2 drivers). Heuristics: a hit is a warning to
// review, not proof of misconfiguration.
const CORE_RULES = /PortsBoundary|forbidNewAmbientEffects|forbidContentPattern/
const ADAPTERISH_SEGMENT = /^(adapter|adapters|infra|infrastructure|ui|di)$/
// Core purity is about production code. Test files are skipped by that
// check: a test-wide screen (e.g. forbidContentPattern banning mocking
// libraries) is meant to cover adapter tests too, and "exclude them"
// would weaken it. Test source sets: src/test, src/<name>Test
// (commonTest, androidTest, …), Tests/__tests__ dirs, Xcode *Tests
// targets, and *Test/*Spec/*.test/*.spec files.
const TEST_DIR_SEGMENT = /^(?:tests?|__tests__|specs?|[A-Za-z0-9]+Tests?)$/
const TEST_FILE = /(?:Tests?|Spec)\.\w+$|\.(?:test|spec)\.\w+$/
const LANGUAGE_RULES = /AcceptanceLanguage/
const DRIVERISH_FILE = /(Robot|Driver|Dsl)\.\w+$|[/\\](drivers?|dsl)[/\\]/

type Args = { config?: string; root?: string; strict: boolean; allowEmpty: string[] }

function parseArgs(argv: string[]): Args {
  const out: Args = { strict: false, allowEmpty: [] }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--config') out.config = argv[++i]
    else if (argv[i] === '--root') out.root = argv[++i]
    else if (argv[i] === '--strict') out.strict = true
    else if (argv[i] === '--allow-empty') {
      const glob = argv[++i]
      if (!glob) {
        console.error('--allow-empty needs a glob')
        process.exit(2)
      }
      out.allowEmpty.push(glob)
    }
    else {
      console.error(`Unknown argument: ${argv[i]}`)
      process.exit(2)
    }
  }
  return out
}

function findConfig(dir: string): string {
  for (const ext of ['ts', 'mts', 'js', 'mjs']) {
    const candidate = join(dir, `probity.config.${ext}`)
    if (existsSync(candidate)) return candidate
  }
  console.error(`No probity.config.{ts,mts,js,mjs} in ${dir} — pass --config.`)
  process.exit(2)
}

function walk(dir: string, out: string[] = []): string[] {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(join(dir, entry.name), out)
    } else {
      out.push(join(dir, entry.name).replace(/\\/g, '/'))
    }
  }
  return out
}

function ruleNames(block: RuleBlock): string {
  return block.rules.map((rule) => rule.name || '(unnamed)').join(', ')
}

const args = parseArgs(process.argv.slice(2))
const root = resolve(args.root ?? process.cwd())
const configPath = resolve(args.config ?? findConfig(root))
const configDir = dirname(configPath)

const config = await jiti.import<Config>(configPath, { default: true })
const tree = walk(root)

console.log(`Scope report for ${configPath}`)
console.log(`Repo root: ${root} (${tree.length} files scanned)`)
// Probity anchors relative globs at the config file's directory, both
// when it finds the config and when given --config, so the report does
// too and says where (issue #186).
console.log(`Globs anchored at: ${configDir} (the config's directory, as Probity anchors them)\n`)

const warnings: string[] = []
if (!isWithin(root, configDir)) {
  warnings.push(
    `CONFIG OUTSIDE ROOT: ${configPath} is not inside ${root}. Probity anchors the same way at runtime: ` +
      `relative globs resolve under ${configDir}, so relative include globs match nothing in the repo ` +
      '(those blocks report DEAD SCOPE below) and relative `!` exclusions exclude nothing (excludeGlobs ' +
      'such as spikes/** stop applying). Keep probity.config.ts at the repo root, or write the globs as **/… ' +
      'patterns that do not depend on the anchor.',
  )
}
const claimed = new Set<string>()
const allowEmptyUsed = new Set<string>()
let flatRules = 0

for (const [index, entry] of config.rules.entries()) {
  if (!isRuleBlock(entry)) {
    flatRules++
    continue
  }
  const label = `block ${index + 1} [${ruleNames(entry)}]`
  if (!entry.files) {
    console.log(`${label}\n  files: (none) — applies to every write\n`)
    continue
  }
  // Anchor against the config's directory, exactly as loadConfig does.
  const globs = entry.files.map((glob) => anchorGlob(glob, configDir))
  const matched = tree.filter(buildMatcher(globs))
  matched.forEach((file) => claimed.add(file))

  console.log(label)
  // Per-glob counts are informational: a template can legitimately
  // carry globs for layouts a given repo doesn't use (e.g. classic
  // src/main alongside KMP source sets) — only a whole-block zero is
  // a warning.
  for (const glob of entry.files) {
    const count = glob.startsWith('!')
      ? null
      : tree.filter(buildMatcher([anchorGlob(glob, configDir)])).length
    console.log(`  ${glob}${count === null ? '' : `  (${count})`}`)
  }
  const allowedEmpty = entry.files.filter((glob) => args.allowEmpty.includes(glob))
  allowedEmpty.forEach((glob) => allowEmptyUsed.add(glob))
  const allowNote =
    allowedEmpty.length === 0
      ? ''
      : matched.length === 0
        ? ' — empty (expected, --allow-empty)'
        : ` — still marked --allow-empty ${allowedEmpty[0]}; drop the flag`
  console.log(`  → ${matched.length} file(s)${allowNote}`)
  for (const file of matched.slice(0, SAMPLE_LIMIT)) console.log(`      ${relative(root, file)}`)
  if (matched.length > SAMPLE_LIMIT) console.log(`      …and ${matched.length - SAMPLE_LIMIT} more`)
  console.log('')

  if (matched.length === 0 && allowedEmpty.length === 0) {
    warnings.push(
      `DEAD SCOPE: ${label} matches no files — these rules will never fire. ` +
        'Adjust the globs to your layout (this is the silent failure mode).',
    )
  }
  if (CORE_RULES.test(ruleNames(entry))) {
    const suspicious = matched.filter((file) => {
      const segments = relative(root, file).split(/[/\\]/)
      const isTest =
        TEST_FILE.test(segments[segments.length - 1]!) ||
        segments.slice(0, -1).some((segment) => TEST_DIR_SEGMENT.test(segment))
      return !isTest && segments.some((segment) => ADAPTERISH_SEGMENT.test(segment))
    })
    if (suspicious.length > 0) {
      warnings.push(
        `${label} claims ${suspicious.length} adapter/DI/UI-looking file(s), e.g. ` +
          `${relative(root, suspicious[0]!)} — core-purity rules pointed at adapters ` +
          'block work those files are supposed to do. Exclude them (negation globs) ' +
          'or confirm these paths really are core.',
      )
    }
  }
  if (LANGUAGE_RULES.test(ruleNames(entry))) {
    const suspicious = matched.filter((file) => DRIVERISH_FILE.test(file))
    if (suspicious.length > 0) {
      warnings.push(
        `${label} claims ${suspicious.length} driver/DSL-looking file(s), e.g. ` +
          `${relative(root, suspicious[0]!)} — layer-2 drivers are supposed to contain ` +
          'the mechanics the Language Test blocks. Exclude them (e.g. !**/*Robot.kt).',
      )
    }
  }
}

// Review obligations (issue #181): what each reviewed exemption covers,
// and exemptions that declared no reviewer to keep them safe.
const obligations = obligationsOf(config.rules)
if (obligations.length > 0) {
  console.log('Review obligations:')
  for (const obligation of obligations) {
    const covered = tree.filter(buildMatcher([anchorGlob(obligation.glob.slice(1), configDir)])).length
    console.log(`  ${obligation.id} (${obligation.reviewWith}): ${obligation.glob}  (${covered})`)
  }
  console.log('')
}
for (const { block, globs } of unreviewedExemptionsOf(config.rules)) {
  const entry = config.rules[block]
  const label = isRuleBlock(entry!) ? `block ${block + 1} [${ruleNames(entry)}]` : `block ${block + 1}`
  for (const glob of globs) {
    warnings.push(
      `${glob} is exempt with no review obligation in ${label}. Nothing keeps those files to what the ` +
        "exemption assumes; declare the review: { glob: '" + glob + "', id, reviewWith, check, reason } " +
        '(hooks/PROBITY.md, "Review obligations").',
    )
  }
}

for (const glob of args.allowEmpty.filter((glob) => !allowEmptyUsed.has(glob))) {
  warnings.push(
    `--allow-empty ${glob} matches no block's files glob exactly — check the ` +
      'spelling against the globs printed above.',
  )
}

if (flatRules > 0) {
  console.log(`${flatRules} flat rule(s) apply to every action (no files scope).\n`)
}
console.log(
  `${claimed.size}/${tree.length} files are claimed by at least one files-scoped block.\n`,
)

if (warnings.length === 0) {
  console.log('No scoping warnings.')
} else {
  console.log(`${warnings.length} warning(s):\n`)
  for (const warning of warnings) console.log(`  ⚠ ${warning}\n`)
}
process.exit(args.strict && warnings.length > 0 ? 1 : 0)
