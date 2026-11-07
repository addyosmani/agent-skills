/**
 * Probity rule-entry factory — Kotlin Multiplatform preset.
 *
 * Same enforcement as the Kotlin preset, recalibrated for a KMP
 * codebase with ports-and-adapters codified per feature module:
 * source sets (`commonMain`/`androidMain`/`desktopMain`/`iosMain`,
 * tests in `commonTest`/`androidHostTest`/…), core vs adapter split
 * by package (`domain`/`port`/`usecase`/`presentation` vs
 * `adapter`/`di`/`ui`), kotlin.test + hand-written fakes with NO
 * mocking library, Koin at the composition root only, and
 * acceptance tests driven through a Robot DSL with Markdown
 * Given/When/Then specs in docs/specs/. The default driver should
 * build the app through its shipping composition root and fake only
 * outbound ports; a driver that fakes at the use-case ports is a
 * component tier, not enough for releasability (see the
 * acceptance-testing skill, issue #118).
 * Adjust globs and package names to your layout.
 *
 * Probity still runs on Node: install `@nizos/probity` and this rule
 * package next to gradlew. The TDD fast-path parser ships as optional
 * dependencies of the rule package.
 */
import { join, relative, sep } from 'node:path'

import { forbidContentPattern, type RuleEntry } from '@nizos/probity'

import { enforceKotlinTdd } from '../internal/kotlin-tdd.js'
import { withExtractionUnderGreen } from '../rules/gates.js'

import type { Globs } from '../rules/scoping.js'

import {
  enforceAcceptanceLanguage,
  withAcceptanceLanguageFastPath,
} from '../rules/acceptance-language.js'
import { withExcludeGlobs } from '../rules/scoping.js'
import { withShellWriteScreen } from '../rules/shell-writes.js'
import { withJudgeTasks } from '../rules/judge-task.js'
import { type CompactJudgeFilesOptions, compactingPreset } from '../rules/compact-judge-files.js'
import { drivingAdapterBlock } from './driving-adapter.js'
import { testIsolationBlock } from './test-isolation.js'
import { fixedWaitBlock } from './fixed-waits.js'
import { scenarioFidelityBlock } from './scenario-fidelity.js'
import { vendorAdapterBlock, vendorAdapterExclusions } from './vendor-adapter.js'
import {
  enforceSpecTestParity,
  requireSpecBackedAcceptanceTest,
  surfaceScenarioLinkBreakage,
  type DriverScope,
} from '../rules/spec-test-parity.js'
import { surfaceGlossaryTermBreakage } from '../rules/ubiquitous-language.js'
import {
  enforceCharacterizationResolution,
  enforceProbeReversion,
  forbidNewAmbientEffects,
  GRADLE_TEST_COMMAND,
  KOTLIN_API_DUMP,
  KOTLIN_BOUNDARY_ADDENDUM,
  KOTLIN_DRIVING_ADAPTER_ADDENDUM,
  KOTLIN_EXPORTS,
  kotlinDomainDiscriminantPatterns,
  KOTLIN_INFRASTRUCTURE_IMPORTS,
  KOTLIN_PRODUCTION_SOURCE_PATTERN,
  KOTLIN_TEST_SOURCE_PATTERN,
  kotlinGreenRunOptions,
  MOCKING_LIBRARY_IMPORTS,
  requireGreenTestRun,
  withCharacterizationTest,
  withKotlinFastPath,
  withMutationProbe,
  withTelemetryFastPath,
  KOTLIN_FIXED_WAIT_PATTERNS,
} from '../rules/kotlin.js'
import {
  enforceAdapterObservability,
  enforcePortsBoundary,
} from '../rules/ports-and-adapters.js'

/**
 * Options for {@link kmpRuleEntries}. A superset of the factory's
 * original `{ driverScopes, defaultScopes }` second parameter, so
 * existing callers passing that shape unchanged keep working. Every
 * option defaults to the reference KMP layout's current hardcoded
 * value — a consuming project overrides only what its layout needs.
 */
export type KmpPresetOptions = {
  /** Absolute path to the specs directory. */
  specsDir?: string
  /** Spec files the traceability rules scan/scope to (Markdown
   *  `*.feature.md` by default; add `**\/*.feature` for Gherkin). */
  specGlobs?: Globs
  /** Absolute path to the ubiquitous-language glossary. */
  glossaryPath?: string
  /** Core purity scope — domain/port/usecase/presentation packages in
   *  commonMain. Adapter, DI, and Compose ui packages import vendors
   *  by design and must NOT match here. */
  coreGlobs?: Globs
  /** Test-case files that must carry a spec-backed Covers: tag. */
  acceptanceTestGlobs?: Globs
  /** Absolute paths to scan for acceptance tests (Covers: tags). */
  testRoots?: string[]
  /** Which files count as acceptance tests when scanning for Covers:
   *  tags (default: any file under an `acceptance/` directory). */
  testFilePattern?: RegExp
  /** What counts as a test-case declaration for the write-time gate
   *  (default: Kotlin/Java `@Test` or Swift `func test…`). */
  testDeclarationPattern?: RegExp
  /** Per-scenario driver mapping; see {@link DriverScope}. */
  driverScopes?: DriverScope[]
  /** Scope names every scenario must satisfy even untagged. */
  defaultScopes?: string[]
  /** Incremental-adoption baseline path for the commit-time parity gate.
   *  The default lives inside `docs/specs`; when the specs are a shared
   *  submodule, point it outside the shared tree. */
  baselinePath?: string
  /** Per-project spec-parity exclusions for a shared spec repository
   *  (issue #105): `<spec>.feature :: <title> # <reason>` per line.
   *  Default: `docs/spec-exclusions.txt`, outside the specs tree.
   *  Missing file → no exclusions. */
  exclusionsPath?: string
  /** Scenario tags that are not driver scopes in this project (shared
   *  tags another consumer uses). Unlisted unknown tags still block. */
  ignoreTags?: string[]
  /** This project's spec-parity wip list for a shared spec repository
   *  (issue #111): same format as the exclusions file, with a required
   *  note. Default: `docs/spec-wip.txt`. Missing file → no project wip. */
  wipPath?: string
  /** `'ignore'` makes the specs' own `@wip` markers informational, so
   *  `wipPath` is the only wip list. Default `'honor'`. */
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
  /** Test-infrastructure paths outside the TDD gate (issue #94), such
   *  as a device harness whose check-runners can only run in a signed
   *  app, e.g. `['harness/**']`. The TDD block (with its mutation-probe
   *  and characterization wrappers) leaves them out; every other block
   *  still covers them: core boundary, adapter observability, the
   *  shell-write screen. The judge counts their checks' device output as
   *  the red for the adapters they exercise. Default: none. */
  harnessGlobs?: string[]
  /** Vendor adapters whose success path can't be tested offline (issue
   *  #102): SDK callbacks that fire only during a live call or with a
   *  real push or token, e.g. `['**\/adapter/Twilio*.kt']`. They leave the
   *  TDD block and are held to forwarding-only by
   *  `enforceForwardingOnlyAdapter`: one-to-one forwarding between the
   *  SDK and a tested port, and holding the vendor objects that needs.
   *  Observability and the shell-write screen still apply. Default: none. */
  vendorAdapterGlobs?: readonly string[]
  /** Deny a shell command (Bash, Kiro's shell) that writes a file any
   *  files-scoped block covers, so the edit goes through the write
   *  tool and the content rules judge it (issue #79). Default: on. */
  shellWriteScreen?: boolean
  /** Send the judge a unified diff, with context, in place of a large
   *  file an edit changes, so the file isn't sent twice per verdict
   *  (issue #168). Rules still see the whole file. Default on:
   *  `{ minBytes: 8000, contextLines: 20 }`; `false` sends whole files. */
  compactJudgeFiles?: false | CompactJudgeFilesOptions
  /** Files the acceptance Language Test applies to: the spec layer
   *  and acceptance test cases, never drivers or DSL classes (default:
   *  `specGlobs` plus `**\/acceptance/**` minus `*Robot.kt`, `*Dsl.kt`,
   *  and `*Driver.kt`). */
  acceptanceLanguageGlobs?: Globs
  /** Names your canonical ambient-effect port(s) in the core
   *  clock/randomness/env screen's deny text (default: function-typed
   *  providers such as `nowEpochMillis: () -> Long`). */
  seamHint?: string
  /** Driving (inbound) adapter files held thin by
   *  `enforceThinDrivingAdapter`: Compose screens, CLI commands, route
   *  handlers. OFF unless set — a core-only module has none, so a
   *  default glob would only be a dead scope. `coreGlobs` are always
   *  excluded (so `presentation/` ViewModels stay core). Starting
   *  points:
   *  - UI in this repo: `['**\/composeApp/src/**', '**\/src/*Main/**\/ui/**', '!**\/*Preview*.kt']`
   *  - a CLI module: `['cli/src/main/**\/commands/**']`
   *  - a UI-only app on a core SDK: its `ui/` packages, plus `coreApiPaths`.
   *  Every matching write costs an AI call, before the TDD judge. */
  drivingAdapterGlobs?: readonly string[]
  /** Fields whose comparison to a domain value in a driving adapter is
   *  a domain decision (e.g. `['role', 'status']`): net-new
   *  `role == Role.ADMIN`, `when (viewer.role)` or `status is
   *  Status.Draft` block free, before the AI call. No default. */
  domainDiscriminants?: string[]
  /** Appended to the discriminant block message, e.g. where permission
   *  rules live. */
  domainHint?: string
  /** Give the thin-driving-adapter judge the public names declared in
   *  `coreGlobs` sources, so it can name the existing function a copy
   *  duplicates. Scans the tree on each judged write. */
  coreExportsInJudge?: boolean
  /** Cap on the export list the judge is given (default 16000
   *  characters; the list is truncated beyond it). */
  coreExportsMaxChars?: number
  /** For a repo that consumes the core as a library: binary-
   *  compatibility-validator dumps (`.api`, `.klib.api`), as files or
   *  directories relative to the root, whose public API the
   *  thin-driving-adapter judge is given. */
  coreApiPaths?: string[]
  /** Names your telemetry convention for the adapter-observability
   *  judge — how a boundary event is recorded in this codebase
   *  (default: a :foundation `Logger.event` or port-tap convention). */
  conventionHint?: string
}

/**
 * The rule entries, as a factory over the project root. Probity only
 * reads the default export below; the factory exists so tooling can
 * instantiate the exact same blocks against a different root — the
 * workflow eval runs them in a temp directory, and
 * `scripts/scope-report.ts` resolves their `files` scopes against the
 * real tree. Keeping the entries in one place is what lets the eval's
 * scoping stay derived from this config instead of hand-mirrored.
 *
 * Relative globs (`docs/...`) are NOT anchored here: Probity's
 * `loadConfig` anchors them against this file's directory at load
 * time, and the tooling replicates that via `rules/scoping.ts`.
 *
 * `options.driverScopes`/`options.defaultScopes` optionally switch on
 * the per-scenario driver mapping on the commit-time parity gate —
 * projects normally enable it by uncommenting the block in the
 * `enforceSpecTestParity` call below; the workflow eval passes them
 * directly so it can exercise the scope checks without changing the
 * template's default-off posture.
 */
export function kmpRuleEntries(root: string, options: KmpPresetOptions = {}): RuleEntry[] {
  // Ubiquitous-language glossary (copy GLOSSARY.template.md here).
  // The glossary-aware rules degrade gracefully while the file
  // doesn't exist yet — wiring it up front costs nothing.
  const glossary = options.glossaryPath ?? join(root, 'docs/GLOSSARY.md')
  // The glossary-drift block's files scope must track a custom
  // glossaryPath, not just the default location.
  const glossaryGlob = relative(root, glossary).split(sep).join('/')

  const specsDir = options.specsDir ?? join(root, 'docs/specs')
  const specGlobs: Globs = options.specGlobs ?? ['docs/specs/**/*.feature.md']
  const acceptanceTestGlobs: Globs = options.acceptanceTestGlobs ?? [
    '**/acceptance/**/*Spec.kt',
    '**/acceptance/**/*Test.kt',
  ]
  const testRoots = options.testRoots ?? [root]
  const baselinePath = options.baselinePath ?? join(root, 'docs/specs/.parity-baseline')
  const exclusionsPath = options.exclusionsPath ?? join(root, 'docs/spec-exclusions.txt')
  const wipPath = options.wipPath ?? join(root, 'docs/spec-wip.txt')
  const excludeGlobs = options.excludeGlobs ?? ['spikes/**', '**/build/**']
  const vendorAdapter = vendorAdapterBlock(options.vendorAdapterGlobs)
  const harnessExclusions = (options.harnessGlobs ?? []).map((glob) => (glob.startsWith('!') ? glob : `!${glob}`))

  // Core purity scope — the inside of the hexagon: domain, ports,
  // use cases, and MVI presentation in commonMain. Adapter, DI, and
  // Compose ui packages import vendors by design — excluded.
  const coreGlobs: Globs = options.coreGlobs ?? [
    '**/src/commonMain/**/domain/**',
    '**/src/commonMain/**/port/**',
    '**/src/commonMain/**/usecase/**',
    '**/src/commonMain/**/presentation/**',
  ]

  // Rule ordering principle: Probity stops at the first violation, so
  // every deterministic screen (pattern match, free, instant) is
  // listed before any AI-validated rule (a model call per matching
  // write). A write with a vendor import in core code must be
  // rejected by the free import screen, not after a TDD model call.

  // Driving adapters must be thin (issues #72, #76). Opt-in: listed
  // before the TDD block, so a denial costs one AI call, not two.
  const drivingAdapter = drivingAdapterBlock({
    globs: options.drivingAdapterGlobs ?? [],
    coreGlobs,
    domainDiscriminants: options.domainDiscriminants,
    domainHint: options.domainHint,
    patternsFor: kotlinDomainDiscriminantPatterns,
    coreExports: options.coreExportsInJudge
      ? { root, language: KOTLIN_EXPORTS, maxChars: options.coreExportsMaxChars ?? 16000 }
      : undefined,
    publishedApi: options.coreApiPaths?.length
      ? { paths: options.coreApiPaths, format: KOTLIN_API_DUMP, root }
      : undefined,
    instructions: (defaults) => defaults + KOTLIN_DRIVING_ADAPTER_ADDENDUM,
  })

  const entries: RuleEntry[] = [
    // ── Deterministic wall ───────────────────────────────────────────

    // Core import/effect screens. The import screen also catches Koin
    // here: DI stays at the composition root, never in domain code.
    {
      files: coreGlobs,
      rules: [
        forbidContentPattern({
          match: KOTLIN_INFRASTRUCTURE_IMPORTS,
          reason:
            'Core code imports an infrastructure/vendor package (this ' +
            'screen includes Koin — DI belongs at the composition ' +
            'root). The Dependency Rule: core imports nothing from ' +
            'frameworks, vendors, or OS I/O — define a port and reach ' +
            'the dependency through an adapter (see the ' +
            'ports-and-adapters skill).',
        }),
        forbidNewAmbientEffects({
          seamHint:
            options.seamHint ??
            'This codebase injects function-typed providers (e.g. ' +
            'nowEpochMillis: () -> Long) with real defaults supplied ' +
            'only in platform adapters or DI modules',
        }),
      ],
    },

    // No mocking library at all: this convention is hand-written
    // fakes substituted at ports (shared via testfixtures modules).
    {
      files: ['**/src/*Test/kotlin/**', '**/src/test/kotlin/**'],
      rules: [
        forbidContentPattern({
          match: MOCKING_LIBRARY_IMPORTS,
          reason:
            'This codebase uses no mocking library: substitute a ' +
            'hand-written fake at the port (see the shared test ' +
            'fixtures), never mock an SDK or framework type. Ports ' +
            'are the only test seam.',
        }),
      ],
    },

    // No fixed waits anywhere in the acceptance suite (issue #119):
    // drivers wait for the concluding event, never for a set time.
    // Delta-based, so waits already in a file don't block edits to it.
    ...fixedWaitBlock(options.fixedWaitGlobs, KOTLIN_FIXED_WAIT_PATTERNS),

    // Spec↔test traceability. Editing a spec must not silently break
    // the tests that claim its scenarios: removing or renaming a
    // `## Scenario:` heading still covered by a test blocks with the
    // list of affected tests, so the rename updates its Covers: tags
    // in the same change.
    {
      files: specGlobs,
      rules: [
        surfaceScenarioLinkBreakage({ testRoots, testFilePattern: options.testFilePattern, specsDir }),
      ],
    },

    // Spec-first, at write time: adding a new acceptance test case
    // requires a new Covers: tag resolving to a scenario that already
    // exists in specsDir — the feature file is written before the
    // test that claims it. Scoped to the test-case layer only
    // (*Spec.kt); drivers/DSL/scenario bodies add no @Test functions.
    {
      files: acceptanceTestGlobs,
      rules: [
        requireSpecBackedAcceptanceTest({
          specsDir,
          testDeclarationPattern: options.testDeclarationPattern,
        }),
      ],
    },

    // Ubiquitous-language drift: renaming or removing a glossary term
    // that specs, tests, or code still use blocks the glossary edit
    // with the list of users.
    {
      files: [glossaryGlob],
      rules: [surfaceGlossaryTermBreakage({ searchRoots: [root] })],
    },

    // ── AI-validated judgment layer ──────────────────────────────────

    // Inner loop: test-driven-development. `src/*Main` / `src/*Test`
    // cover every KMP source set (commonMain, androidMain, commonTest,
    // androidHostTest, …); main/test cover classic Android app modules
    // alongside them. The Kotlin fast-path keeps the most common write
    // (a single new @Test) deterministic. The mutation-probe wrapper
    // lets a write marked `// probity: mutation-probe` (a deliberate
    // break proving a retrofitted test bites) through without a
    // red-before-green demand — enforceProbeReversion below blocks
    // commits until the probe is reverted. The characterization
    // wrapper sanctions a test for behavior production already has
    // (born green, so no red can precede it): a test-source write
    // marked `// probity: characterization` passes, and
    // enforceCharacterizationResolution below blocks commits until the
    // marker comes off through a recorded red under a mutation probe.
    ...(drivingAdapter ? [drivingAdapter] : []),
    ...(vendorAdapter ? [vendorAdapter] : []),

    {
      files: [
        '**/src/*Main/kotlin/**',
        '**/src/*Test/kotlin/**',
        '**/src/main/kotlin/**',
        '**/src/test/kotlin/**',
        ...harnessExclusions,
        ...vendorAdapterExclusions(options.vendorAdapterGlobs),
      ],
      // Telemetry-only additions (a complete logger.event/breadcrumb
      // line) pass deterministically — instrumentation demanded by the
      // adapter-observability rule must not be judged as unasserted
      // behavior by the TDD gate.
      rules: [
        withCharacterizationTest(
          withMutationProbe(
            withTelemetryFastPath(
              withKotlinFastPath(
                withExtractionUnderGreen(enforceKotlinTdd(), {
                  ...kotlinGreenRunOptions(),
                  productionPattern: KOTLIN_PRODUCTION_SOURCE_PATTERN,
                  testPattern: KOTLIN_TEST_SOURCE_PATTERN,
                }),
              ),
            ),
          ),
          { filePattern: KOTLIN_TEST_SOURCE_PATTERN },
        ),
      ],
    },

    // Boundaries: ports-and-adapters. The Dependency Rule judgments
    // the import screen can't make — thin adapters, vendor types in
    // port signatures, glossary-conflicting names.
    {
      files: coreGlobs,
      rules: [
        enforcePortsBoundary({
          instructions: (defaults) => defaults + KOTLIN_BOUNDARY_ADDENDUM,
          glossaryPath: glossary,
        }),
      ],
    },

    // Adapters must be thin, but not blind: a new adapter path doing
    // external I/O carries boundary observability (structured event,
    // port tap, or span). Delta-based — legacy uninstrumented paths
    // migrate incrementally.
    {
      files: ['**/src/*Main/kotlin/**/adapter/**'],
      rules: [
        withTelemetryFastPath(
          enforceAdapterObservability({
            conventionHint:
              options.conventionHint ??
              'This codebase uses structured Logger.event(tag, event, ' +
              'level, fields) from :foundation (one greppable line: ' +
              'event=<name> k=v), and/or a recording port-tap decorator ' +
              'wired at the Koin composition root.',
          }),
        ),
      ],
    },

    // Outer loop: acceptance-testing. The Language Test on the spec
    // layer: Markdown Given/When/Then specs and the acceptance test
    // cases. Robot/DSL/driver classes are layers 2-3 (they know about
    // UiState and MVI intents) — excluded, whichever of the two
    // layouts a feature uses (merged *Robot.kt, or split *Dsl.kt +
    // *Driver.kt per the four-layer model). Shared scenario-body
    // files (*Scenarios.kt — the bodies both drivers run) are layer 1
    // and stay INCLUDED by design: they must read as pure domain
    // language.
    {
      files: options.acceptanceLanguageGlobs ?? [
        ...specGlobs,
        '**/acceptance/**',
        '!**/*Robot.kt',
        '!**/*Dsl.kt',
        '!**/*Driver.kt',
      ],
      // requireGlossaryEntry: true is the strict "glossary
      // conversation happens first" mode — turn it on once the
      // glossary has real coverage, not on day one. The fast-path
      // wrapper keeps a single-@Test write that only reuses existing
      // DSL vocabulary free of AI calls (Markdown specs always go to
      // the validator).
      rules: [
        withAcceptanceLanguageFastPath(
          enforceAcceptanceLanguage({ glossaryPath: glossary, specsDir }),
        ),
      ],
    },

    // Scenario fidelity (issue #120): a changed Covers-tagged test
    // must say what its scenario says, and a changed scenario must
    // still match the tests that claim it. Judged, but only when a
    // write changes a claim.
    // Test isolation on the acceptance DSL (issue #119): opt-in, for
    // suites whose SUT outlives a test. Judged per DSL write that adds
    // code.
    ...testIsolationBlock(options.dslIsolationGlobs),

    ...scenarioFidelityBlock(options.scenarioFidelity, [...acceptanceTestGlobs, ...specGlobs], {
      specsDir,
      testRoots,
      testFilePattern: options.testFilePattern,
      appScope: options.appScope,
    }),

    // ── Ship gates ───────────────────────────────────────────────────
    // Definition of done, made mechanical: every non-wip scenario in
    // specsDir is claimed by an acceptance test (Covers: tag), and
    // every tag resolves to a real scenario. Mark in-progress specs
    // `## Scenario (wip):`. CI mirror for human commits:
    // scripts/spec-parity.mjs.
    //
    // Brownfield adoption: a spec suite that predates the gate would
    // block every specs/acceptance commit. Generate a baseline once —
    //   node scripts/spec-parity.mjs --specs docs/specs \
    //     --baseline docs/specs/.parity-baseline --write-baseline
    // — and commit it: baselined scenarios are exempt while new ones
    // are enforced from day one; burn the file down by deleting lines
    // as coverage lands. No baseline file → full enforcement.
    //
    // Per-scenario driver mapping (optional): declare named driver
    // scopes and tag scenarios that need more than the default suite —
    // `## Scenario [system]: …` then requires a covering test whose
    // path matches that scope. Tags are floors, not ceilings; with
    // shared scenario bodies (*Scenarios.kt) the extra covering test
    // is a thin spec class calling the existing body. CALIBRATE THE
    // PATTERNS TO YOUR LAYOUT before setting `driverScopes` — a
    // pattern matching zero files makes every tagged scenario fail,
    // loudly. Tag app-tier scenarios `[app]` by the acceptance-testing
    // skill's tier rules (the wire, wiring or a platform service decides
    // the outcome; a walking skeleton per feature that reaches an
    // external system; escaped defects). Untagged scenarios need any
    // covering test, normally at the component tier (issue #118).
    // Example:
    //   driverScopes: [
    //     { name: 'component', filePattern: /[/\\]acceptance[/\\]component[/\\]/ },
    //     { name: 'app', filePattern: /[/\\]acceptance[/\\]app[/\\]/ },
    //     { name: 'system', filePattern: /[/\\]acceptance[/\\]ui[/\\]/ },
    //   ],
    enforceSpecTestParity({
      specsDir,
      testRoots,
      baselinePath,
      exclusionsPath,
      ignoreTags: options.ignoreTags,
      wipPath,
      sharedWip: options.sharedWip,
      inProgressPattern: options.inProgressPattern,
      liveTestPattern: options.liveTestPattern,
      liveFloorScopes: options.liveFloorScopes,
      dependencyClaimsPaths: options.dependencyClaimsPaths,
      testFilePattern: options.testFilePattern,
      driverScopes: options.driverScopes,
      defaultScopes: options.defaultScopes,
    }),

    // The commit half of the mutation-probe round-trip: no commit
    // while a `probity: mutation-probe` marker is still on disk —
    // reverting the mutation removes the marker with it.
    enforceProbeReversion({ roots: [root] }),

    // The commit half of the characterization round-trip: no commit
    // while a `probity: characterization` marker is still on disk —
    // the marker only comes off once the transcript records the
    // marked test failing under a mutation probe.
    enforceCharacterizationResolution({ roots: [root] }),

    // Accepts test/test...Test, :desktop:jvmTest, allTests,
    // build, and check. The latest matching run must carry BUILD
    // SUCCESSFUL or a trustworthy Kiro zero status.
    requireGreenTestRun({ command: GRADLE_TEST_COMMAND }),
  ]

  return withJudgeTasks(compactingPreset(withShellWriteScreen(withExcludeGlobs(entries, excludeGlobs), {
    root,
    enabled: options.shellWriteScreen,
  }), options))
}
