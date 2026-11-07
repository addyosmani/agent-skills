/**
 * Probity rule-entry factory — Kotlin/JVM/Android preset.
 *
 * Same enforcement as the JS preset (see hooks/PROBITY.md) with the
 * deterministic layer swapped to Kotlin-shaped rules from
 * '../rules/kotlin.js'. Calibrated against a multi-module Android
 * codebase (Gradle per project, `<module>-core` / `<module>-ui`
 * split, Mockito-kotlin + JUnit 4, AWS/Amplify/Apollo/OkHttp/
 * Retrofit/Room vendor stack) — every option below defaults to that
 * calibration; a consuming project overrides what its layout needs.
 *
 * Note Probity itself still runs on Node: the consuming Kotlin
 * project needs `npm install -D @nizos/probity` (a one-dependency
 * package.json next to gradlew is fine).
 */
import { join } from 'node:path'

import { forbidContentPattern, type RuleEntry } from '@nizos/probity'

import { enforceKotlinTdd } from '../internal/kotlin-tdd.js'
import { withExtractionUnderGreen } from '../rules/gates.js'

import {
  enforceAcceptanceLanguage,
  withAcceptanceLanguageFastPath,
} from '../rules/acceptance-language.js'
import {
  enforceCharacterizationResolution,
  enforceProbeReversion,
  forbidNewAmbientEffects,
  forbidStaticMocks,
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
import { requireSpecBackedAcceptanceTest } from '../rules/spec-test-parity.js'
import type { Globs } from '../rules/scoping.js'
import { withExcludeGlobs } from '../rules/scoping.js'
import { withShellWriteScreen } from '../rules/shell-writes.js'
import { withJudgeTasks } from '../rules/judge-task.js'
import { type CompactJudgeFilesOptions, compactingPreset } from '../rules/compact-judge-files.js'
import { drivingAdapterBlock } from './driving-adapter.js'
import { testIsolationBlock } from './test-isolation.js'
import { fixedWaitBlock } from './fixed-waits.js'
import { vendorAdapterBlock, vendorAdapterExclusions } from './vendor-adapter.js'
import { surfaceGlossaryTermBreakage } from '../rules/ubiquitous-language.js'

export type KotlinPresetOptions = {
  /** Absolute path to the ubiquitous-language glossary. Defaults to
   *  `<root>/docs/GLOSSARY.md`; glossary-aware rules degrade
   *  gracefully while it doesn't exist yet. */
  glossaryPath?: string
  /** Core purity scope — point at your core modules (e.g. the
   *  `*-core` modules of a core/ui split); DI wiring and adapter
   *  packages import vendors by design and must be excluded. */
  coreGlobs?: Globs
  /** Deterministic infrastructure/vendor import screen for core code. */
  infrastructureImports?: RegExp
  /** Point at the project's canonical ambient-effect port(s). */
  seamHint?: string
  /** Names your telemetry convention for the adapter-observability
   *  judge — how a boundary event is recorded in this codebase
   *  (default: the judge's generic structured-event/port-tap/span
   *  guidance). */
  conventionHint?: string
  /** Test source sets where static/object/constructor mocking is
   *  forbidden — ports are the only test seam. */
  staticMockGlobs?: Globs
  /** Test-case files that must carry a spec-backed Covers: tag. */
  acceptanceTestGlobs?: Globs
  /** Files the Language Test applies to (acceptance test globs plus
   *  any Gherkin feature files). */
  acceptanceLanguageGlobs?: Globs
  /** Source sets the TDD gate applies to. */
  tddGlobs?: Globs
  /** Adapter/data packages that must carry boundary observability. */
  adapterGlobs?: Globs
  /** Driving (inbound) adapter files held thin by
   *  `enforceThinDrivingAdapter`: Compose screens, CLI commands, route
   *  handlers. OFF unless set — a core-only module has none, so a
   *  default glob would only be a dead scope. `coreGlobs` are always
   *  excluded, so whether a ViewModel is an adapter or a presenter in
   *  the core is decided by which of the two scopes its package
   *  matches. Starting points:
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
  /** The real Gradle test task your commit gate should look for. */
  commitCommand?: RegExp
  /** Globs excluded (as `!`-negations) from every files-scoped block —
   *  spikes and build output by default. Pass `[]` to disable. */
  /** Acceptance DSL files judged for test isolation (issue #119):
   *  aliased entities, stubs keyed on aliased ids, no shared writable
   *  fixtures, no clean-up of test data. Off by default; worth turning on
   *  when the suite runs against a SUT that outlives a test. One model
   *  call per DSL write that adds code. */
  dslIsolationGlobs?: Globs
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
}

/**
 * Rule entries for a Kotlin/JVM/Android project, as a factory over the
 * project root. Rule ordering principle: Probity stops at the first
 * violation, so every deterministic screen (pattern match, free,
 * instant) is listed before any AI-validated rule (a model call per
 * matching write). A write with a vendor import in core code must be
 * rejected by the free import screen, not after a TDD model call.
 */
export function kotlinRuleEntries(root: string, options: KotlinPresetOptions = {}): RuleEntry[] {
  const glossary = options.glossaryPath ?? join(root, 'docs/GLOSSARY.md')

  const coreGlobs: Globs = options.coreGlobs ?? [
    '**/*-core/src/main/**',
    '!**/*-core/src/main/**/di/**',
    '!**/*-core/src/main/**/data/**',
  ]
  const staticMockGlobs: Globs = options.staticMockGlobs ?? [
    '**/src/test/**',
    '**/src/androidTest/**',
    '**/src/sharedTest/**',
  ]
  const acceptanceTestGlobs: Globs = options.acceptanceTestGlobs ?? [
    '**/acceptance/**/*Spec.kt',
    '**/acceptance/**/*Test.kt',
  ]
  const acceptanceLanguageGlobs: Globs = options.acceptanceLanguageGlobs ?? [
    ...acceptanceTestGlobs,
    '**/*.feature',
  ]
  const tddGlobs: Globs = options.tddGlobs ?? [
    '**/src/main/java/**',
    '**/src/main/kotlin/**',
    '**/src/test/**',
    '**/src/sharedTest/**',
  ]
  const adapterGlobs: Globs = options.adapterGlobs ?? [
    '**/src/main/**/adapter/**',
    '**/src/main/**/adapters/**',
    '**/src/main/**/data/**',
  ]
  const excludeGlobs = options.excludeGlobs ?? ['spikes/**', '**/build/**']
  const vendorAdapter = vendorAdapterBlock(options.vendorAdapterGlobs)
  const harnessExclusions = (options.harnessGlobs ?? []).map((glob) => (glob.startsWith('!') ? glob : `!${glob}`))

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

    // Core import/effect screens.
    {
      files: coreGlobs,
      rules: [
        forbidContentPattern({
          match: options.infrastructureImports ?? KOTLIN_INFRASTRUCTURE_IMPORTS,
          reason:
            'Core code imports an infrastructure package. The ' +
            'Dependency Rule: core imports nothing from frameworks, ' +
            'vendors, or OS I/O — define a port in the core and reach ' +
            'the dependency through an adapter (see the ' +
            'ports-and-adapters skill).',
        }),
        // Delta-based: only NEW ambient calls block, so the existing
        // Instant.now()/UUID.randomUUID() sites in a brownfield
        // codebase don't freeze their files. Point seamHint at your
        // canonical port(s).
        forbidNewAmbientEffects({
          seamHint:
            options.seamHint ??
            'This codebase has a TimeProvider port (sudocommons-core) — inject it rather than reading the OS clock',
        }),
      ],
    },

    // Ports are the only test seam: no new static/object/constructor
    // mocking anywhere in the suite.
    {
      files: staticMockGlobs,
      rules: [forbidStaticMocks()],
    },

    // No fixed waits anywhere in the acceptance suite (issue #119):
    // drivers wait for the concluding event, never for a set time.
    // Delta-based, so waits already in a file don't block edits to it.
    ...fixedWaitBlock(options.fixedWaitGlobs, KOTLIN_FIXED_WAIT_PATTERNS),

    // Ubiquitous-language drift: renaming or removing a glossary term
    // that specs, tests, or code still use blocks the glossary edit
    // with the list of users.
    {
      files: ['docs/GLOSSARY.md'],
      rules: [surfaceGlossaryTermBreakage({ searchRoots: [root] })],
    },

    // Spec-first, at write time: adding a new acceptance test case
    // requires a new Covers: tag resolving to a `## Scenario:` that
    // already exists in docs/specs — the feature file is written
    // before the test that claims it. Deterministic; the pattern also
    // matches Swift XCTest (`func test…`), so an XCUITest acceptance
    // glob works here unchanged.
    {
      files: acceptanceTestGlobs,
      rules: [
        requireSpecBackedAcceptanceTest({ specsDir: join(root, 'docs/specs') }),
      ],
    },

    // ── AI-validated judgment layer ──────────────────────────────────

    // Inner loop: test-driven-development. Android source sets
    // commonly keep .kt under src/main/java, so match both. Probity
    // has no built-in Kotlin fast-path; withKotlinFastPath supplies
    // one — a test-source write adding exactly one @Test function
    // while preserving all prior source (additive test scaffolding is
    // allowed) passes without an AI call. Its parser ships as optional
    // dependencies; unavailable parser support delegates to
    // enforceKotlinTdd with an explicit diagnostic and a bounded history.
    // The characterization wrapper sanctions a test for behavior
    // production already has (born green): a test-source write marked
    // `// probity: characterization` passes, and the commit gate below
    // holds the marker until a mutation probe shows that test failing.
    ...(drivingAdapter ? [drivingAdapter] : []),
    ...(vendorAdapter ? [vendorAdapter] : []),

    {
      files: [tddGlobs[0], ...tddGlobs.slice(1), ...harnessExclusions, ...vendorAdapterExclusions(options.vendorAdapterGlobs)],
      // Telemetry-only additions pass deterministically — see the
      // KMP preset's note on the TDD/observability tension.
      rules: [
        withCharacterizationTest(
          withMutationProbe(
            withTelemetryFastPath(
              withKotlinFastPath(
                withExtractionUnderGreen(enforceKotlinTdd(), {
                  ...kotlinGreenRunOptions(options.commitCommand ?? GRADLE_TEST_COMMAND),
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
    // port tap, or span). Point the globs at your adapter/data
    // packages. Delta-based — legacy paths migrate incrementally.
    {
      files: adapterGlobs,
      rules: [
        withTelemetryFastPath(
          enforceAdapterObservability({ conventionHint: options.conventionHint }),
        ),
      ],
    },

    // Outer loop: acceptance-testing. The Language Test on the spec
    // layer only. Point at wherever your executable specifications
    // live (e.g. an acceptance package under androidTest, or Gherkin
    // features); protocol drivers and test infrastructure must NOT
    // match.
    {
      files: acceptanceLanguageGlobs,
      rules: [
        withAcceptanceLanguageFastPath(
          enforceAcceptanceLanguage({ glossaryPath: glossary, specsDir: join(root, 'docs/specs') }),
        ),
      ],
    },

    // Test isolation on the acceptance DSL (issue #119): opt-in, for
    // suites whose SUT outlives a test. Judged per DSL write that adds
    // code.
    ...testIsolationBlock(options.dslIsolationGlobs),

    // ── Ship gates ───────────────────────────────────────────────────

    // The commit half of the mutation-probe round-trip: no commit
    // while a `probity: mutation-probe` marker is still on disk —
    // reverting the mutation removes the marker with it.
    enforceProbeReversion({ roots: [root] }),

    // The commit half of the characterization round-trip: no commit
    // while a `probity: characterization` marker is still on disk —
    // the marker only comes off once the transcript records the
    // marked test failing under a mutation probe.
    enforceCharacterizationResolution({ roots: [root] }),

    // No commit on an unverified tree. The default accepts test/
    // test...Test, allTests, jvmTest, build, and check; a custom
    // commitCommand replaces that task policy. The latest matching run
    // must carry BUILD SUCCESSFUL or a trustworthy Kiro zero status.
    requireGreenTestRun({ command: options.commitCommand ?? GRADLE_TEST_COMMAND }),
  ]

  return withJudgeTasks(compactingPreset(withShellWriteScreen(withExcludeGlobs(entries, excludeGlobs), {
    root,
    enabled: options.shellWriteScreen,
  }), options))
}
