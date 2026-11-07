/**
 * Probity rule-entry factory — plain JS/TS preset.
 *
 * Turns three of the agent-skills catalog's prose disciplines into
 * hard PreToolUse gates via https://github.com/nizos/probity :
 *
 *   test-driven-development  → enforceJsTdd (built-in enforceTdd + addendum)
 *   ports-and-adapters       → enforcePortsBoundary + forbidInternalModuleMocks
 *                              + a deterministic import screen
 *                              + enforceThinDrivingAdapter on UI/inbound
 *                                adapter files
 *   acceptance-testing       → enforceAcceptanceLanguage
 *
 * `jsRuleEntries(options?)` reproduces exactly what the shipped
 * `probity.config.ts` template wires by default — every option below
 * defaults to that template's current value. A consuming project
 * copies the thin template (which calls this factory) and overrides
 * only the options its layout needs.
 */
import { basename } from 'node:path'

import { forbidContentPattern, type RuleEntry } from '@nizos/probity'

import { enforceAcceptanceLanguage } from '../rules/acceptance-language.js'
import {
  forbidNewAmbientEffects,
  JS_AMBIENT_EFFECT_PATTERNS,
  isJsTestInvocation,
  requireGreenTestRun,
  withJudgeFailureDiagnostics,
  withContradictionRetry,
  JS_FIXED_WAIT_PATTERNS,
} from '../rules/gates.js'
import { enforceJsTdd } from '../rules/js-tdd.js'
import {
  enforcePortsBoundary,
  forbidInternalModuleMocks,
} from '../rules/ports-and-adapters.js'
import type { Globs } from '../rules/scoping.js'
import { withExcludeGlobs } from '../rules/scoping.js'
import { withShellWriteScreen } from '../rules/shell-writes.js'
import { withJudgeTasks } from '../rules/judge-task.js'
import { type CompactJudgeFilesOptions, compactingPreset } from '../rules/compact-judge-files.js'
import { drivingAdapterBlock } from './driving-adapter.js'
import { testIsolationBlock } from './test-isolation.js'
import { scenarioFidelityBlock } from './scenario-fidelity.js'
import { fixedWaitBlock } from './fixed-waits.js'
import {
  enforceSpecTestParity,
  JS_TEST_DECLARATION,
  requireSpecBackedAcceptanceTest,
  surfaceScenarioLinkBreakage,
  type DriverScope,
} from '../rules/spec-test-parity.js'
import { surfaceGlossaryTermBreakage } from '../rules/ubiquitous-language.js'

/**
 * Deterministic first line of defense for the Dependency Rule: known
 * framework/vendor/OS-I/O imports never belong in core code, so block
 * them without spending an AI call. Extend with your stack's usual
 * suspects; enforcePortsBoundary catches what this list misses.
 */
export const KNOWN_INFRASTRUCTURE_IMPORTS =
  /from\s+['"](?:node:(?:fs|http|https|net|child_process|process)|fs|http|https|express|fastify|@nestjs\/[^'"]+|next\/[^'"]+|pg|mysql2?|mongodb|mongoose|redis|ioredis|@prisma\/client|typeorm|knex|axios|node-fetch|got|undici|stripe|@aws-sdk\/[^'"]+|aws-sdk|firebase-admin)['"]/

export type JsPresetOptions = {
  /** Core/domain globs — adapters and composition roots import
   *  vendors by design and must NOT match here. */
  coreGlobs?: Globs
  /** The deterministic infrastructure-import screen for core code. */
  infrastructureImports?: RegExp
  /** Point at your canonical ports once they exist, e.g. "inject the
   *  Clock port from src/ports/clock.ts". */
  seamHint?: string
  /** Driving (inbound) adapter files — UI components, pages, route
   *  handlers, CLI commands — held thin by `enforceThinDrivingAdapter`
   *  (an AI call per matching write). Default: `src/ui/**`,
   *  `src/components/**` and every `.tsx` under `src/`, minus tests
   *  and stories. Pass `[]` to switch
   *  the thinness rules off. */
  drivingAdapterGlobs?: readonly string[]
  /** Field names whose comparison to a literal in a driving adapter is
   *  a domain decision (e.g. `['role', 'plan']`). OFF by default —
   *  `status === 'loading'` is ordinary view state, so only your model
   *  knows which fields carry domain meaning. Set it to block net-new
   *  comparisons free, before the AI call. */
  domainDiscriminants?: string[]
  /** Appended to the discriminant block message, e.g. "permission
   *  rules live in src/domain/permissions.ts". */
  domainHint?: string
  /** Give the thin-driving-adapter judge the export names of every
   *  module under `coreGlobs`, so it can spot a copy of an existing
   *  domain rule. Off by default: it costs a directory scan per judged
   *  write. */
  coreExportsInJudge?: boolean
  /** Files where internal-module mocking is forbidden (the only test
   *  seam is a port). */
  mockGlobs?: Globs
  /** Files the TDD gate (the expensive, AI-validated rule) applies
   *  to — scope this to the code you actually TDD. */
  tddGlobs?: Globs
  /** The spec/acceptance layer the Language Test applies to. Do NOT
   *  widen this to DSL or protocol-driver files. */
  specGlobs?: Globs
  /** Absolute path to a glossary (ubiquitous-language skill) to hold
   *  specs to. */
  glossaryPath?: string
  /**
   * The real test command your commit gate should look for. It is
   * matched against the whole shell command, so anchor it
   * (`/^\s*make check\b/`): an unanchored pattern also matches a
   * command that only mentions it, like an issue body. The default
   * counts only a command that starts npm/pnpm/yarn test, vitest or
   * jest ({@link isJsTestInvocation}).
   */
  commitCommand?: RegExp
  /** Your runner's green summary line. */
  commitSuccessPattern?: RegExp
  /** Your runner's failure summary line. */
  commitFailurePattern?: RegExp
  /**
   * Absolute path to the specs directory (e.g. `docs/specs`). OFF by
   * default — no behavior change until set. Setting it switches on
   * spec-to-test traceability, the same set the KMP/Kotlin presets
   * wire: `requireSpecBackedAcceptanceTest` on `acceptanceTestGlobs`
   * (deterministic, write-time, ordered before every AI-validated
   * rule below), `surfaceScenarioLinkBreakage` on `specGlobs`, and
   * `enforceSpecTestParity` as a commit gate. `surfaceGlossaryTermBreakage`
   * on `glossaryPath` is added too, once that option is also set.
   */
  specsDir?: string
  /** Test-case files that must carry a spec-backed Covers: tag. */
  acceptanceTestGlobs?: Globs
  /** Absolute paths to scan for acceptance tests (Covers: tags);
   *  defaults to `[process.cwd()]` — Probity hook processes are
   *  anchored to the project root. */
  testRoots?: string[]
  /** Which files count as acceptance tests when scanning for Covers:
   *  tags (default: any file under an `acceptance/` directory). */
  testFilePattern?: RegExp
  /** What counts as a test-case declaration for the write-time gate
   *  (default: {@link JS_TEST_DECLARATION} — vitest/jest/mocha
   *  `it(`/`test(` and their `.only`/`.skip`/`.each(...)( `/
   *  `.concurrent` variants). */
  testDeclarationPattern?: RegExp
  /** Per-scenario driver mapping; see {@link DriverScope}. */
  driverScopes?: DriverScope[]
  /** Scope names every scenario must satisfy even untagged. */
  defaultScopes?: string[]
  /** Incremental-adoption baseline path for the commit-time parity gate. */
  parityBaselinePath?: string
  /** Per-project spec-parity exclusions for a shared spec repository
   *  (issue #105): `<spec>.feature :: <title> # <reason>` per line. No
   *  default, like `parityBaselinePath`. */
  parityExclusionsPath?: string
  /** This project's spec-parity wip list for a shared spec repository
   *  (issue #111): same format as the exclusions file, with a required
   *  note. No default, like `parityBaselinePath`. */
  parityWipPath?: string
  /** `'ignore'` makes the specs' own `@wip` markers informational, so
   *  `parityWipPath` is the only wip list. Default `'honor'`. */
  sharedWip?: 'honor' | 'ignore'
  /** Expected-to-fail marker for in-progress acceptance tests (issue #115);
   *  default `DEFAULT_IN_PROGRESS_PATTERN` (`= inProgress {`, `test.failing`,
   *  `test.fails`, `withKnownIssue`, `XCTExpectFailure`). */
  inProgressPattern?: RegExp
  /** Live test files (issue #112): their claims count, and the CLI lists
   *  scenarios covered by live tests only. */
  liveTestPattern?: RegExp
  /** Scope tags whose scenarios need a non-live claim (issue #112). */
  liveFloorScopes?: string[]
  /** Dependency claim lists (issue #114), written by a dependency that
   *  consumes the same specs with `spec-parity.mjs --write-claims` and
   *  committed here. Default: none. */
  dependencyClaimsPaths?: string[]
  /** Scenario tags that are not driver scopes in this project (shared
   *  tags another consumer uses). Unlisted unknown tags still block. */
  ignoreTags?: string[]
  /** Globs excluded (as `!`-negations) from every files-scoped block —
   *  spikes and build output by default. Pass `[]` to disable. */
  /** Judge each changed Covers-tagged test against the scenario it
   *  claims (issue #120): same Given/When/Then, no unstated outcome.
   *  One model call per write that changes a claim. Default: on. */
  /** Acceptance DSL files judged for test isolation (issue #119):
   *  aliased entities, stubs keyed on aliased ids, no shared writable
   *  fixtures, no clean-up of test data. Off by default; worth turning on
   *  when the suite runs against a SUT that outlives a test. One model
   *  call per DSL write that adds code. */
  dslIsolationGlobs?: Globs
  scenarioFidelity?: boolean
  /** The driver scope that runs the app tier (issue #129): the
   *  fidelity judge also checks each changed claim's tier against the
   *  acceptance-testing skill's tier rules. Pair with `driverScopes`. */
  appScope?: string
  excludeGlobs?: string[]
  /** Acceptance code screened for new fixed waits (issue #119): the
   *  whole suite, DSL and drivers included. Exempt the suite's one
   *  poll-for-concluding-event helper with a `!` glob. Default
   *  `['**\/acceptance/**']`; pass `[]` to turn the screen off. */
  fixedWaitGlobs?: Globs
  /** Deny a shell command (Bash, Kiro's shell) that writes a file any
   *  files-scoped block covers, so the edit goes through the write
   *  tool and the content rules judge it (issue #79). Default: on. */
  shellWriteScreen?: boolean
  /** Send the judge a unified diff, with context, in place of a large
   *  file an edit changes, so the file isn't sent twice per verdict
   *  (issue #168). Rules still see the whole file. Default on:
   *  `{ minBytes: 8000, contextLines: 20 }`; `false` sends whole files. */
  compactJudgeFiles?: false | CompactJudgeFilesOptions
}

/**
 * Rule entries for a plain JS/TS project. Probity stops at the first
 * violation, so deterministic screens (pattern match, free, instant)
 * are ordered before AI-validated rules (a model call per matching
 * write): a vendor import in core code is rejected free by the
 * import screen, never after a TDD model call.
 */
export function jsRuleEntries(options: JsPresetOptions = {}): RuleEntry[] {
  const coreGlobs: Globs = options.coreGlobs ?? ['src/core/**', 'src/domain/**']
  const mockGlobs: Globs = options.mockGlobs ?? ['**/*.test.*', '**/*.spec.*', 'test/**', 'tests/**']
  const tddGlobs: Globs = options.tddGlobs ?? ['src/**', 'test/**', 'tests/**']
  const specGlobs: Globs = options.specGlobs ?? ['specs/**', 'acceptance/**', '**/*.feature']
  const excludeGlobs = options.excludeGlobs ?? ['spikes/**', '**/build/**']
  const drivingAdapterGlobs: readonly string[] = options.drivingAdapterGlobs ?? [
    'src/ui/**',
    'src/components/**',
    'src/**/*.tsx',
    '!**/*.test.*',
    '!**/*.spec.*',
    '!**/*.stories.*',
  ]

  const entries: RuleEntry[] = [
    // ── Boundaries: ports-and-adapters ──────────────────────────────
    // Core purity. Point these globs at your core/domain/use-case
    // code only — adapters and composition roots import vendors by
    // design and must NOT match here.
    {
      files: coreGlobs,
      rules: [
        forbidContentPattern({
          match: options.infrastructureImports ?? KNOWN_INFRASTRUCTURE_IMPORTS,
          reason:
            'Core code imports an infrastructure module. The Dependency ' +
            'Rule: core imports nothing from adapters, frameworks, ' +
            'vendors, or OS I/O — define a port in the core and reach ' +
            'the dependency through an adapter (see the ' +
            'ports-and-adapters skill).',
        }),
        // Clock, randomness, and environment are ports too. Delta-based:
        // existing call sites don't block; net-new ones do. Point
        // seamHint at your canonical ports once they exist.
        forbidNewAmbientEffects({
          patterns: JS_AMBIENT_EFFECT_PATTERNS,
          seamHint: options.seamHint,
        }),
        enforcePortsBoundary(),
      ],
    },

    // Ports are the only test seam: no jest.mock()/vi.mock() of our
    // own modules anywhere in the suite. Deterministic — free to run
    // broadly.
    {
      files: mockGlobs,
      rules: [forbidInternalModuleMocks()],
    },

    // No fixed waits anywhere in the acceptance suite (issue #119):
    // drivers wait for the concluding event, never for a set time.
    // Delta-based, so waits already in a file don't block edits to it.
    ...fixedWaitBlock(options.fixedWaitGlobs, JS_FIXED_WAIT_PATTERNS),
  ]

  // Driving adapters must be thin (issue #72). The core-purity block
  // above stops vendors getting INTO core code; this stops business
  // logic leaking OUT of it into UI components and handlers, which the
  // TDD gate alone never questions (a component test makes the logic
  // "tested"). The free discriminant screen runs first when
  // configured; the judge runs before the TDD judge, so a denial here
  // costs one AI call, not two.
  const drivingAdapter = drivingAdapterBlock({
    globs: drivingAdapterGlobs,
    coreGlobs,
    domainDiscriminants: options.domainDiscriminants,
    domainHint: options.domainHint,
    coreExports: options.coreExportsInJudge ? {} : undefined,
  })
  if (drivingAdapter) entries.push(drivingAdapter)

  // Spec-to-test traceability (issue #18): OFF by default, so a
  // project that hasn't opted in sees no behavior change. Setting
  // `specsDir` wires the same set the KMP preset wires — deterministic
  // rules, ordered before the AI-validated TDD/Language Test rules
  // below (Probity stops at the first violation, so a tagless
  // acceptance test is rejected free, never after a model call).
  if (options.specsDir) {
    const specsDir = options.specsDir
    const acceptanceTestGlobs: Globs = options.acceptanceTestGlobs ?? [
      'acceptance/**/*.test.*',
      'acceptance/**/*.spec.*',
    ]
    const testRoots = options.testRoots ?? [process.cwd()]

    // Spec↔test traceability. Editing a spec must not silently break
    // the tests that claim its scenarios: removing or renaming a
    // `## Scenario:` heading still covered by a test blocks with the
    // list of affected tests, so the rename updates its Covers: tags
    // in the same change.
    entries.push({
      files: specGlobs,
      rules: [
        surfaceScenarioLinkBreakage({
          testRoots,
          testFilePattern: options.testFilePattern,
          specsDir: options.specsDir,
        }),
      ],
    })

    // Spec-first, at write time: adding a new test case (it(/test(,
    // see JS_TEST_DECLARATION) requires a new Covers: tag resolving to
    // a scenario that already exists in specsDir — the feature file is
    // written before the test that claims it.
    entries.push({
      files: acceptanceTestGlobs,
      rules: [
        requireSpecBackedAcceptanceTest({
          specsDir,
          testDeclarationPattern: options.testDeclarationPattern ?? JS_TEST_DECLARATION,
        }),
      ],
    })

    // Scenario fidelity (issue #120): a changed Covers-tagged test
    // must say what its scenario says, and a changed scenario must
    // still match the tests that claim it. Judged, but only when a
    // write changes a claim.
    entries.push(
      ...scenarioFidelityBlock(options.scenarioFidelity, [...acceptanceTestGlobs, ...specGlobs], {
        specsDir,
        testRoots,
        testFilePattern: options.testFilePattern,
        appScope: options.appScope,
      }),
    )

    if (options.glossaryPath) {
      // Ubiquitous-language drift: renaming or removing a glossary
      // term that specs, tests, or code still use blocks the glossary
      // edit with the list of users. The JS preset has no `root` to
      // anchor a relative glob against (unlike the KMP/Kotlin
      // presets), so this scopes by basename anywhere in the tree —
      // broader than an exact path, but safe regardless of where
      // `glossaryPath` (an absolute path) points.
      entries.push({
        files: [`**/${basename(options.glossaryPath)}`],
        rules: [surfaceGlossaryTermBreakage({ searchRoots: testRoots })],
      })
    }
  }

  // ── Inner loop: test-driven-development ─────────────────────────
  // Red → Green → Refactor on all production and test code. This is
  // the expensive rule (AI call per matching write) — scope it to
  // the code you actually TDD. Listed AFTER the deterministic
  // screens above: Probity stops at the first violation, so a
  // vendor import in core code is rejected free by the import
  // screen, never after a model call.
  entries.push({
    files: tddGlobs,
    rules: [enforceJsTdd()],
  })

  // ── Outer loop: acceptance-testing ──────────────────────────────
  // The Language Test on the spec layer only. Do NOT widen this to
  // DSL or protocol-driver files — those layers are supposed to
  // contain the mechanics this rule blocks. To hold specs to your
  // glossary (ubiquitous-language skill), pass glossaryPath as an
  // absolute path, e.g.:
  //   enforceAcceptanceLanguage({
  //     glossaryPath: fileURLToPath(new URL('./docs/GLOSSARY.md', import.meta.url)),
  //   })
  entries.push({
    files: specGlobs,
    rules: [enforceAcceptanceLanguage({ glossaryPath: options.glossaryPath, specsDir: options.specsDir })],
  })

  // Test isolation on the acceptance DSL (issue #119): opt-in, for
  // suites whose SUT outlives a test. Judged per DSL write that adds
  // code.
  entries.push(...testIsolationBlock(options.dslIsolationGlobs))

  if (options.specsDir) {
    // ── Ship gate: spec↔test parity ─────────────────────────────────
    // Definition of done, made mechanical: every non-wip scenario in
    // specsDir is claimed by an acceptance test (Covers: tag), and
    // every tag resolves to a real scenario. Mark in-progress specs
    // `## Scenario (wip):`.
    entries.push(
      enforceSpecTestParity({
        specsDir: options.specsDir,
        testRoots: options.testRoots ?? [process.cwd()],
        testFilePattern: options.testFilePattern,
        baselinePath: options.parityBaselinePath,
        exclusionsPath: options.parityExclusionsPath,
        ignoreTags: options.ignoreTags,
        wipPath: options.parityWipPath,
        sharedWip: options.sharedWip,
      inProgressPattern: options.inProgressPattern,
      liveTestPattern: options.liveTestPattern,
      liveFloorScopes: options.liveFloorScopes,
      dependencyClaimsPaths: options.dependencyClaimsPaths,
        driverScopes: options.driverScopes,
        defaultScopes: options.defaultScopes,
      }),
    )
  }

  // ── Ship gate: green tests ──────────────────────────────────────
  // No commit on an unverified tree — and the recorded run must be
  // GREEN. Probity's built-in requireCommand only checks that a test
  // command ran after the last write; a run whose output was all
  // failures would still unlock the commit. Match your real test
  // command and your runner's summary lines (defaults below cover
  // vitest and jest).
  entries.push(
    requireGreenTestRun({
      command: options.commitCommand ?? /npm (run )?test|vitest|jest/,
      // The default regex finds runner names anywhere, issue bodies
      // included (#150); only a command that starts the runner counts.
      commandPredicate: options.commitCommand ? undefined : isJsTestInvocation,
      successPattern:
        options.commitSuccessPattern ?? /Test Files\s+\d+ passed|Tests:\s+.*\b\d+ passed/,
      failurePattern: options.commitFailurePattern ?? /\d+ failed|FAIL\s/,
    }),
  )

  return withJudgeTasks(compactingPreset(withShellWriteScreen(withExcludeGlobs(entries, excludeGlobs), {
    enabled: options.shellWriteScreen,
  }), options))
}
