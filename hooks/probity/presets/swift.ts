/**
 * Probity rule-entry factory — Swift/iOS preset.
 *
 * Same enforcement stack as the Kotlin presets (see hooks/PROBITY.md),
 * recalibrated for a native iOS app: an Xcode workspace with the
 * acceptance suite in AcceptanceTests/ following the four-layer model
 * (Specs + Component test glue / Scenarios / DSL / Drivers), XCUITest
 * plus an app-hosted component-test target, MVVM view models over
 * use-case ports, and Markdown Given/When/Then specs in docs/specs/.
 * Calibrated against a production CocoaPods + SwiftPM app — adjust
 * globs and package names to your layout.
 *
 * Probity runs on Node: `npm install -D @nizos/probity` (a
 * one-dependency package.json with `"type": "module"` next to the
 * xcworkspace is fine).
 */
import { join } from 'node:path'

import { forbidContentPattern, type RuleEntry } from '@nizos/probity'

import { drivingAdapterBlock } from './driving-adapter.js'
import { testIsolationBlock } from './test-isolation.js'
import { scenarioFidelityBlock } from './scenario-fidelity.js'
import { vendorAdapterBlock, vendorAdapterExclusions } from './vendor-adapter.js'
import type { Globs } from '../rules/scoping.js'

import {
  enforceAcceptanceLanguage,
  enforceControlledPreconditions,
} from '../rules/acceptance-language.js'
import {
  enforceCharacterizationResolution,
  enforceProbeReversion,
  requireGreenTestRun,
  withCharacterizationTest,
  withInverseScenarioGuidance,
  withMutationProbe,
  withTelemetryFastPath,
} from '../rules/kotlin.js'
import {
  enforceAdapterObservability,
  enforcePortsBoundary,
} from '../rules/ports-and-adapters.js'
import {
  enforceSpecTestParity,
  requireSpecBackedAcceptanceTest,
  surfaceScenarioLinkBreakage,
} from '../rules/spec-test-parity.js'
import {
  SWIFT_DRIVING_ADAPTER_ADDENDUM,
  SWIFT_EXPORTS,
  SWIFT_FIXED_SLEEPS,
  SWIFT_INTERFACE,
  SWIFT_PROBE_FILE_PATTERN,
  swiftDomainDiscriminantPatterns,
  XCODEBUILD_TEST_COMMAND,
  XCODEBUILD_TEST_FAILED,
  XCODEBUILD_TEST_SUCCEEDED,
  XCUITEST_MECHANICS,
} from '../rules/swift.js'
import { surfaceGlossaryTermBreakage } from '../rules/ubiquitous-language.js'
import { withShellWriteScreen } from '../rules/shell-writes.js'
import { withJudgeTasks } from '../rules/judge-task.js'
import { type CompactJudgeFilesOptions, compactingPreset } from '../rules/compact-judge-files.js'
import { enforceSwiftTdd } from '../internal/swift-tdd.js'
import {
  withJudgeFailureDiagnostics,
  withContradictionRetry,
} from '../rules/gates.js'

// Acceptance test files live under AcceptanceTests/ (capital A) — the
// parity scanners' default pattern expects a lowercase `acceptance/`
// segment, so every spec-traceability rule below overrides it.
const ACCEPTANCE_TEST_FILES = /AcceptanceTests[/\\]/

// Swift telemetry lines the fast-path recognizes as complete
// single-line instrumentation (SudoLogging-style logger calls).
const SWIFT_DETERMINISTIC_PATHS =
  'Writes that never call the judge still go through: telemetry-only ' +
  'lines, writes marked `// probity: mutation-probe`, and AcceptanceTests ' +
  'writes marked `// probity: characterization`.'

const SWIFT_TELEMETRY_LINES = [
  /^[\w.]*logger\.(?:event|info|debug|error|warning)\(.*\)$/i,
]

/**
 * Rule entries as a factory over the project root, mirroring the KMP
 * preset: Probity reads the default export; tooling (scope reports,
 * workflow evals) can instantiate the same blocks against another
 * root. Relative globs are anchored by Probity's loadConfig against
 * this file's directory.
 */
export function swiftRuleEntries(root: string, options: SwiftPresetOptions = {}): RuleEntry[] {
  return withJudgeTasks(
    compactingPreset(withShellWriteScreen(swiftEntries(root, options), { root, enabled: options.shellWriteScreen }), options),
  )
}

export type SwiftPresetOptions = {
  /** Deny a shell command (Bash, Kiro's shell) that writes a file any
   *  files-scoped block covers, so the edit goes through the write
   *  tool and the content rules judge it (issue #79). Default: on. */
  shellWriteScreen?: boolean
  /** Send the judge a unified diff, with context, in place of a large
   *  file an edit changes, so the file isn't sent twice per verdict
   *  (issue #168). Rules still see the whole file. Default on:
   *  `{ minBytes: 8000, contextLines: 20 }`; `false` sends whole files. */
  compactJudgeFiles?: false | CompactJudgeFilesOptions
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
  /** Files the TDD judge covers. Default: `App/*.swift`, `App/Sources/**`,
   *  `AcceptanceTests/**`, `VPNNetworkExtension/**`. */
  tddGlobs?: Globs
  /** Where ports and core behavior live, for the boundary judge (and the
   *  core exports the driving-adapter judge is given). Default:
   *  `App/Sources/Modules/**`, `App/Sources/Utilities/Providers/**`. */
  coreGlobs?: Globs
  /** Adapters held to boundary observability. Default:
   *  `App/Sources/**\/Adapters/**`, `App/Sources/**\/Services/**`,
   *  `App/Sources/**\/Analytics/**`. */
  adapterGlobs?: Globs
  /** SwiftUI views (driving adapters) held thin by
   *  `enforceThinDrivingAdapter` (issue #77). OFF unless set: a core-only
   *  package has no views. Views inside `coreGlobs` move to this judge
   *  and out of the boundary judge, so a view write costs one AI call
   *  there, not two. View models stay core: they are presenters. See
   *  hooks/PROBITY.md, "Driving adapters by project layout". */
  drivingAdapterGlobs?: readonly string[]
  /** Field names whose comparison to an enum case or literal in a view
   *  is a domain decision (e.g. `['role', 'status']`); blocks net-new
   *  `== .superUser`, `switch viewer.role`, `if case .draft = …` free. */
  domainDiscriminants?: string[]
  /** Appended to the discriminant screen's deny. */
  domainHint?: string
  /** Give the driving-adapter judge the names declared in `coreGlobs`
   *  Swift files (views left out). Off by default: a scan per write. */
  coreExportsInJudge?: boolean
  /** Cap on the core export list (default 16,000 characters). */
  coreExportsMaxChars?: number
  /** For a UI-only app on a core package or framework: `.swiftinterface`
   *  files or directories holding them, read as the core's public API. */
  coreApiPaths?: string[]
  /** Vendor adapters whose success path can't be tested offline (issue
   *  #102): SDK callbacks that fire only during a live call or with a
   *  real push or token, e.g. `['App/Sources/**\/Adapters/Twilio*.swift']`. They leave the
   *  TDD block and are held to forwarding-only by
   *  `enforceForwardingOnlyAdapter`: one-to-one forwarding between the
   *  SDK and a tested port, and holding the vendor objects that needs.
   *  Observability and the shell-write screen still apply. Default: none. */
  vendorAdapterGlobs?: readonly string[]
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
}

function swiftEntries(root: string, options: SwiftPresetOptions): RuleEntry[] {
  const glossary = join(root, 'docs/GLOSSARY.md')
  const tddGlobs: Globs = options.tddGlobs ?? ['App/*.swift', 'App/Sources/**', 'AcceptanceTests/**', 'VPNNetworkExtension/**']
  const coreGlobs: Globs = options.coreGlobs ?? ['App/Sources/Modules/**', 'App/Sources/Utilities/Providers/**']
  const adapterGlobs: Globs = options.adapterGlobs ?? [
    'App/Sources/**/Adapters/**',
    'App/Sources/**/Services/**',
    'App/Sources/**/Analytics/**',
  ]
  const vendorAdapter = vendorAdapterBlock(options.vendorAdapterGlobs)
  const viewExclusions = (options.drivingAdapterGlobs ?? [])
    .filter((glob) => !glob.startsWith('!'))
    .map((glob) => `!${glob}`)
  // The core minus the views: what the boundary judge covers and what
  // the driving-adapter judge is told the core exports.
  const core: Globs = [coreGlobs[0], ...coreGlobs.slice(1), ...viewExclusions]
  const drivingAdapter = drivingAdapterBlock({
    globs: options.drivingAdapterGlobs ?? [],
    coreGlobs: core,
    excludeCore: false,
    domainDiscriminants: options.domainDiscriminants,
    domainHint: options.domainHint,
    patternsFor: swiftDomainDiscriminantPatterns,
    coreExports: options.coreExportsInJudge
      ? { root, language: SWIFT_EXPORTS, maxChars: options.coreExportsMaxChars ?? 16000 }
      : undefined,
    publishedApi: options.coreApiPaths?.length
      ? { paths: options.coreApiPaths, format: SWIFT_INTERFACE, root }
      : undefined,
    instructions: (defaults) => defaults + SWIFT_DRIVING_ADAPTER_ADDENDUM,
  })

  // Rule ordering principle: Probity stops at the first violation, so
  // every deterministic screen (pattern match, free, instant) is
  // listed before any AI-validated rule (a model call per matching
  // write).

  return [
    // ── Deterministic wall ───────────────────────────────────────────

    // No fixed waits anywhere in the acceptance suite: synchronize
    // with XCTest expectations, predicates, or
    // waitForExistence(timeout:) — never sleep.
    {
      files: ['AcceptanceTests/**'],
      rules: [
        forbidContentPattern({
          match: SWIFT_FIXED_SLEEPS,
          reason:
            'Fixed waits are races: XCUITest flakiness starts here. ' +
            'Wait for the concluding observable state with XCTest ' +
            'expectations, predicate expectations, or ' +
            'waitForExistence(timeout:) (see the acceptance-testing ' +
            'and ios-development skills).',
        }),
      ],
    },

    // XCUITest mechanics belong only in the driver that owns the
    // deployed-app scope. Specs, scenario bodies, the DSL, and the
    // app-hosted component tests must stay implementation-neutral.
    {
      files: [
        'AcceptanceTests/Specs/**',
        'AcceptanceTests/Scenarios/**',
        'AcceptanceTests/DSL/**',
        'AcceptanceTests/Component/**',
      ],
      rules: [
        forbidContentPattern({
          match: XCUITEST_MECHANICS,
          reason:
            'XCUIApplication/XCUIElement outside AcceptanceTests/Drivers: ' +
            'only protocol drivers know how to reach the SUT. Move the ' +
            'mechanics into the XCUITest driver and express this layer ' +
            'in domain language (four-layer model, acceptance-testing ' +
            'skill).',
        }),
      ],
    },

    // Spec-first, at write time: adding a new acceptance test case
    // (func test…) requires a Covers: tag resolving to a
    // `## Scenario:` heading that already exists in docs/specs — the
    // feature file is written before the test that claims it. A file
    // whose existing tag already resolves may gain further driver
    // tests for the same scenario (one scenario, many drivers).
    // Scoped to the whole suite directory, not *Tests.swift: XCTest
    // only discovers `func test…` methods, so the declaration pattern
    // is the real detector and a creative filename can't dodge the
    // rule. NOTE the directory itself is the boundary — acceptance
    // tests added outside it (e.g. a new App/Tests/ target) are
    // invisible to every rule here until the globs learn the path.
    {
      files: ['AcceptanceTests/**'],
      rules: [
        requireSpecBackedAcceptanceTest({ specsDir: join(root, 'docs/specs') }),
      ],
    },

    // Editing a spec must not silently break the tests that claim its
    // scenarios: removing or renaming a covered `## Scenario:` heading
    // blocks with the list of affected tests.
    {
      files: ['docs/specs/**/*.feature.md'],
      rules: [
        surfaceScenarioLinkBreakage({
          testRoots: [root],
          testFilePattern: ACCEPTANCE_TEST_FILES,
          specsDir: join(root, 'docs/specs'),
        }),
      ],
    },

    // Ubiquitous-language drift: renaming or removing a glossary term
    // that specs, tests, or code still use blocks the glossary edit
    // with the list of users.
    {
      files: ['docs/GLOSSARY.md'],
      rules: [surfaceGlossaryTermBreakage({ searchRoots: [root] })],
    },

    // ── AI-validated judgment layer ──────────────────────────────────

    // Inner loop: test-driven-development over app sources and the
    // acceptance suite. On a project whose only suite is the
    // acceptance scheme, the observed red comes from
    // `xcodebuild … test` — the outside-in loop, not an exemption.
    // The mutation-probe wrapper lets a deliberate break marked
    // `// probity: mutation-probe` through without a red-before-green
    // demand; enforceProbeReversion below holds the commit hostage
    // until it is reverted. Telemetry-only additions pass
    // deterministically so the observability rule and the TDD gate
    // never contradict each other.
    // App/*.swift catches root-level sources (AppDelegate.swift lives
    // beside App/Sources, not inside it) — audit these globs against
    // your tree with scripts/scope-report.ts; a write no rule matches
    // is a silent free pass.
    // SwiftUI views must be thin (issue #77). Opt-in; listed before the
    // TDD block, so a denial costs one AI call, not two.
    ...(drivingAdapter ? [drivingAdapter] : []),
    ...(vendorAdapter ? [vendorAdapter] : []),

    {
      files: [tddGlobs[0], ...tddGlobs.slice(1), ...vendorAdapterExclusions(options.vendorAdapterGlobs)],
      rules: [
        // The inverse-scenario wrapper changes only the DENY TEXT, and
        // only on the test-control layer (the acceptance composition
        // root): when a fixture has no red demanding it because the
        // environment already satisfies the scenario's Given, the
        // correct move — write the inverse scenario and let its red
        // drive the fixture — is stated at the decision point instead
        // of leaving "observe a red first" to read as "delete the
        // control".
        // The characterization wrapper sanctions the FIRST test for
        // behavior that predates it (born green, so no red can be
        // observed before it exists): a test-layer write carrying
        // `// probity: characterization` passes, and the marker only
        // comes off through a proof-checked removal (a recorded run
        // where that test failed under a mutation probe). The
        // resolution gate below blocks commits while a marker is on
        // disk, so the bypass is a round-trip, not an exemption.
        withInverseScenarioGuidance(
          withCharacterizationTest(
            withMutationProbe(
              withTelemetryFastPath(
                withJudgeFailureDiagnostics(withContradictionRetry(enforceSwiftTdd()), {
                  deterministicPaths: SWIFT_DETERMINISTIC_PATHS,
                }),
                {
                  patterns: SWIFT_TELEMETRY_LINES,
                  filePattern: /\.swift$/,
                },
              ),
            ),
            { filePattern: /AcceptanceTests[/\\]/ },
          ),
          { filePattern: /App[/\\]Sources[/\\]Acceptance[/\\]/ },
        ),
      ],
    },

    // Preconditions are controlled, not observed: a driver method
    // named for a Given must establish it (fixture key, launch
    // environment, programmed fake), and control wiring is never
    // deleted just because the scenario passes without it — on a
    // brownfield system the environment produces the sad path for
    // free, which is exactly when the seam matters most (the success
    // path is unreachable until the port is controlled).
    {
      files: ['AcceptanceTests/Drivers/**', 'App/Sources/Acceptance/**'],
      rules: [enforceControlledPreconditions()],
    },

    // Boundaries: ports-and-adapters judgments the screens can't make
    // — thin adapters, vendor types in port signatures, names
    // conflicting with the glossary. Point at wherever your ports and
    // core behavior live (here: module view-models/use-cases and the
    // application-owned provider ports).
    {
      files: core,
      rules: [enforcePortsBoundary({ glossaryPath: glossary })],
    },

    // Adapters must be thin, but not blind: a new adapter path doing
    // external I/O carries boundary observability (structured event,
    // port tap, or span). Delta-based — legacy paths migrate
    // incrementally.
    {
      files: adapterGlobs,
      rules: [
        withTelemetryFastPath(
          enforceAdapterObservability({
            conventionHint:
              'This codebase uses SudoLogging (a Logger built by the ' +
              'MySudoVpn logger factories — one structured, greppable ' +
              'line per boundary call/outcome), and/or a recording ' +
              'port-tap decorator wired where the app composes its ' +
              'dependencies.',
          }),
          { patterns: SWIFT_TELEMETRY_LINES, filePattern: /\.swift$/ },
        ),
      ],
    },

    // Outer loop: acceptance-testing. The Language Test on the spec
    // layer: Markdown specs, test-case glue, scenario bodies, and the
    // DSL — everything above the drivers must read as pure domain
    // language. Drivers are layer 3 (they know accessibility
    // identifiers, hosted views, view-model ports) — excluded.
    {
      files: [
        'docs/specs/**/*.feature.md',
        'AcceptanceTests/Specs/**',
        'AcceptanceTests/Component/**',
        'AcceptanceTests/Scenarios/**',
        'AcceptanceTests/DSL/**',
      ],
      rules: [enforceAcceptanceLanguage({ glossaryPath: glossary, specsDir: join(root, 'docs/specs') })],
    },

    // Scenario fidelity (issue #120): a changed Covers-tagged test
    // must say what its scenario says, and a changed scenario must
    // still match the tests that claim it. Judged, but only when a
    // write changes a claim.
    // Test isolation on the acceptance DSL (issue #119): opt-in, for
    // suites whose SUT outlives a test. Judged per DSL write that adds
    // code.
    ...testIsolationBlock(options.dslIsolationGlobs),

    ...scenarioFidelityBlock(
      options.scenarioFidelity,
      ['AcceptanceTests/**', 'docs/specs/**/*.feature.md'],
      { specsDir: join(root, 'docs/specs'), testRoots: [root], testFilePattern: ACCEPTANCE_TEST_FILES, appScope: options.appScope },
    ),

    // ── Ship gates ───────────────────────────────────────────────────

    // Definition of done, made mechanical: every non-wip scenario in
    // docs/specs is claimed by an acceptance test (Covers: tag), and
    // every tag resolves to a real scenario. Brownfield adoption:
    // generate a baseline once with scripts/spec-parity.mjs
    // --write-baseline and burn it down (see hooks/PROBITY.md).
    // Per-scenario driver mapping (optional): declare named driver
    // scopes and tag scenarios that need more than the default suite —
    // `## Scenario [system]: …` then requires a covering test whose
    // path matches that scope. Tags are floors, not ceilings; with a
    // shared scenario layer (AcceptanceTests/Scenarios/) the extra
    // covering test is a thin spec class calling the existing body.
    // The example scopes match the calibration app's layout — the
    // XCUITest target under Specs/, the app-hosted component target
    // under Component/. CALIBRATE TO YOUR LAYOUT before uncommenting.
    enforceSpecTestParity({
      specsDir: join(root, 'docs/specs'),
      testRoots: [root],
      testFilePattern: ACCEPTANCE_TEST_FILES,
      baselinePath: join(root, 'docs/specs/.parity-baseline'),
      exclusionsPath: options.exclusionsPath ?? join(root, 'docs/spec-exclusions.txt'),
      ignoreTags: options.ignoreTags,
      wipPath: options.wipPath ?? join(root, 'docs/spec-wip.txt'),
      sharedWip: options.sharedWip,
      inProgressPattern: options.inProgressPattern,
      liveTestPattern: options.liveTestPattern,
      liveFloorScopes: options.liveFloorScopes,
      dependencyClaimsPaths: options.dependencyClaimsPaths,
      // driverScopes: [
      //   { name: 'system', filePattern: /AcceptanceTests[/\\]Specs[/\\]/ },
      //   { name: 'hosted-ui', filePattern: /AcceptanceTests[/\\]Component[/\\]/ },
      // ],
      // defaultScopes: ['hosted-ui'],
    }),

    // The commit half of the mutation-probe round-trip: no commit
    // while a `probity: mutation-probe` marker is still on disk.
    enforceProbeReversion({
      roots: [root],
      filePattern: SWIFT_PROBE_FILE_PATTERN,
    }),

    // The commit half of the characterization round-trip: no commit
    // while a `probity: characterization` marker is still on disk —
    // the marker only comes off once the transcript records the
    // marked test failing under a mutation probe.
    enforceCharacterizationResolution({
      roots: [root],
      filePattern: SWIFT_PROBE_FILE_PATTERN,
    }),

    // No commit on an unverified tree. Matches `xcodebuild … test`
    // and xcresulttool summary readbacks; the recorded output must
    // actually be green (** TEST SUCCEEDED ** or "result": "Passed"),
    // not merely exist. CALIBRATE AGAINST YOUR REAL COMMAND: a
    // `-quiet` run suppresses the verdict banner entirely (verified
    // live), so a runbook that mandates -quiet must also mandate the
    // `xcrun xcresulttool get test-results summary` readback — that
    // readback is the output this gate accepts. Run your documented
    // test command once and confirm successPattern matches what it
    // actually prints before trusting the gate.
    // Scope the commit-on-green gate to code the acceptance suite
    // actually validates; infra/docs/tooling-only commits (CI config,
    // lint config, Markdown, probity.config.ts, rules/**) aren't gated
    // on a fresh xcodebuild run. Adjust the paths to your layout.
    requireGreenTestRun({
      command: XCODEBUILD_TEST_COMMAND,
      successPattern: XCODEBUILD_TEST_SUCCEEDED,
      failurePattern: XCODEBUILD_TEST_FAILED,
      enforceForPaths: /^(?:App|AcceptanceTests|VPNNetworkExtension)\//,
    }),
  ]
}
