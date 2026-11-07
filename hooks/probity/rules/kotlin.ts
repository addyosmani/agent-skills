import { readdirSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, relative, sep } from 'node:path'

import type { Action, Rule, RuleContext, RuleResult } from '@nizos/probity'

import {
  forbidNewAmbientEffects as forbidNewAmbientEffectsGeneric,
  introducedPatterns,
  requireGreenTestRun as requireGreenTestRunGeneric,
  transcriptLimitViolation,
  type GreenRunOptions,
  type NamedPattern,
} from './gates.js'
import { isGitCommit, nestedCommitTree, splitTopLevelCommands } from './commit-target.js'
import type { ApiDumpFormat, ExportLanguage } from './ports-and-adapters.js'

/**
 * Kotlin/JVM/Android preset for the ports-and-adapters rules. The
 * JS-ecosystem screens in `ports-and-adapters.ts` (ESM imports,
 * jest/vi module mocks) never fire on Kotlin; these are their
 * Kotlin-shaped counterparts.
 *
 * Brownfield note: both rules here judge the DELTA — they block only
 * occurrences the pending write introduces, so files that already
 * carry violations can be edited freely and migrated incrementally.
 */

/**
 * Known framework/vendor/infrastructure imports that never belong in
 * core code under the Dependency Rule. Kotlin `import` syntax.
 * Extend with your stack's packages; `enforcePortsBoundary` catches
 * what this list misses.
 */
export const KOTLIN_INFRASTRUCTURE_IMPORTS =
  /import\s+(?:com\.amazonaws|aws\.sdk\.kotlin|software\.amazon\.awssdk|com\.amplifyframework|com\.apollographql|com\.google\.firebase|com\.sudoplatform|com\.twilio|okhttp3|retrofit2|androidx\.room|androidx\.work|androidx\.datastore|java\.sql|javax\.sql|io\.ktor|org\.koin|org\.springframework|org\.jetbrains\.exposed|app\.cash\.sqldelight|com\.squareup\.sqldelight|net\.zetetic)\./

/**
 * Mocking-library imports, for projects whose convention is
 * hand-written fakes at ports with no mocking library at all (pair
 * with `forbidContentPattern`). Distinct from `forbidStaticMocks`,
 * which permits the library but blocks its monkey-patching APIs.
 */
export const MOCKING_LIBRARY_IMPORTS =
  /import\s+(?:io\.mockk|org\.mockito|org\.powermock)\./

/**
 * Matches a Gradle invocation of a verification task — `test`,
 * flavored/module-qualified `test...Test` tasks (`./gradlew
 * :mysudo:testDevDebugUnitTest`), `allTests`, `jvmTest`, `build`, or
 * `check` (Gradle's `build` and `check` both run the test tasks they
 * depend on, without the literal word "test") — for the commit-on-green
 * `requireGreenTestRun` gate. Matches `gradlew`/`gradle` anywhere in a
 * piped (`./gradlew build | grep ...`) or compound
 * (`foo; ./gradlew build`) command string, not only at its start.
 * Deliberately excludes unrelated tasks such as `assemble`, which
 * builds outputs without running verification.
 */
export const GRADLE_TEST_COMMAND =
  /\bgradlew?\b[^\n;&|]*(?:\b(?:build|check|test|allTests|jvmTest)\b|\btest[A-Za-z0-9]*Test\b|\b(?:ios|macos|tvos|watchos|linux|mingw|androidNative|js|wasmJs|wasmWasi|desktop)[A-Za-z0-9]*Test\b|\b(?:connected|allDevices)[A-Za-z0-9]*(?:Test|Check)\b|\bandroidConnectedCheck\b|\b[a-z][A-Za-z0-9]*Android(?:Device)?Test\b)/

const STATIC_MOCK_PATTERNS: NamedPattern[] = [
  { label: 'Mockito.mockStatic()', pattern: /\bmockStatic\s*[(<]/g },
  { label: 'mockkStatic()', pattern: /\bmockkStatic\s*\(/g },
  { label: 'mockkObject()', pattern: /\bmockkObject\s*\(/g },
  { label: 'mockkConstructor()', pattern: /\bmockkConstructor\s*\(/g },
  { label: 'PowerMock', pattern: /import\s+org\.powermock\b/g },
]

const AMBIENT_EFFECT_PATTERNS: NamedPattern[] = [
  {
    label: 'java.time .now()',
    pattern: /\b(?:Instant|LocalDate|LocalDateTime|LocalTime|ZonedDateTime|OffsetDateTime)\.now\s*\(/g,
  },
  { label: 'System.currentTimeMillis()', pattern: /\bSystem\.currentTimeMillis\s*\(/g },
  { label: 'Date()', pattern: /\bDate\s*\(\s*\)/g },
  { label: 'UUID.randomUUID()', pattern: /\bUUID\.randomUUID\s*\(/g },
  { label: 'Random()/Math.random()', pattern: /\bRandom\s*\(|\bMath\.random\s*\(/g },
  { label: 'System.getenv', pattern: /\bSystem\.getenv\b/g },
]

/**
 * Kotlin counterpart of `forbidInternalModuleMocks`: blocks test
 * writes that introduce static/object/constructor mocking —
 * `Mockito.mockStatic`, MockK's `mockkStatic`/`mockkObject`/
 * `mockkConstructor`, PowerMock — the JVM's monkey-patching
 * equivalents. These always bypass the architecture ("Ports Are the
 * Only Test Seam"): whatever they intercept should be reached through
 * a port and replaced with a fake.
 *
 * Plain `mock<SomeInterface>()` is NOT blocked: whether the mocked
 * type is a port (fine) or an internal class (violation) isn't
 * decidable from the call site — that judgment belongs to
 * `enforcePortsBoundary` or review.
 *
 * Delta-based: pre-existing static mocks in the file don't
 * re-trigger on later edits. Applies to: write actions. No AI call.
 *
 * @example
 * { files: ['**\/src\/test\/**', '**\/src\/androidTest\/**'], rules: [forbidStaticMocks()] }
 */
export function forbidStaticMocks(): Rule {
  return async function forbidStaticMocks(
    action: Action,
    ctx?: RuleContext,
  ): Promise<RuleResult> {
    if (action.kind !== 'write') return { kind: 'pass' }
    const introduced = await introducedPatterns(
      action,
      ctx,
      STATIC_MOCK_PATTERNS,
    )
    if (introduced.length === 0) return { kind: 'pass' }
    return {
      kind: 'violation',
      reason:
        `This write introduces static/object mocking (${introduced.join(
          ', ',
        )}). Ports are the only test seam: put the intercepted ` +
        'dependency behind a port and substitute an in-memory fake ' +
        'there instead (see the ports-and-adapters skill).',
    }
  }
}

/**
 * Blocks production writes that introduce direct ambient-effect calls
 * — OS clock (`Instant.now()`, `System.currentTimeMillis()`,
 * `Date()`), randomness (`UUID.randomUUID()`, `Random()`), and
 * environment (`System.getenv`). Under ports-and-adapters these are
 * unowned OS dependencies: clock, randomness, and config are ports.
 *
 * Delta-based: the ~hundreds of pre-existing call sites in a
 * brownfield codebase don't block edits to their files; only net-new
 * occurrences do. Scope to production sources — tests and adapter
 * implementations (e.g. a `DefaultTimeProvider`) legitimately touch
 * the real OS, so exclude adapter paths via globs or negations.
 *
 * @param options.seamHint — appended to the block message to point
 *   the agent at the project's canonical seam(s), e.g.
 *   "inject com.anonyome.sudocommons.core.common.TimeProvider".
 * @param options.patterns — replaces the default pattern list; each
 *   RegExp needs the `g` flag.
 *
 * @example
 * { files: ['**\/src\/main\/**', '!**\/adapters\/**'], rules: [forbidNewAmbientEffects()] }
 */
export function forbidNewAmbientEffects(
  options: { seamHint?: string; patterns?: NamedPattern[] } = {},
): Rule {
  // Kotlin-defaulted wrapper over the language-neutral rule in
  // gates.ts (JS/TS configs use it directly with their own patterns).
  return forbidNewAmbientEffectsGeneric({
    patterns: options.patterns ?? AMBIENT_EFFECT_PATTERNS,
    seamHint: options.seamHint,
  })
}

/**
 * Fixed waits for a Kotlin/Android acceptance suite (issue #119), for
 * `forbidNewFixedWaits` in gates.ts. `delay(` is included even though
 * under `runTest` it only moves virtual time: in an acceptance test it
 * still waits a fixed amount instead of for the concluding event, and
 * a statement can't tell which dispatcher it runs on. Advance the test
 * clock instead; exempt the suite's one poll helper by glob.
 */
export const KOTLIN_FIXED_WAIT_PATTERNS: NamedPattern[] = [
  { label: 'Thread.sleep()', pattern: /\bThread\.sleep\s*\(/g },
  { label: 'TimeUnit.*.sleep()', pattern: /\bTimeUnit\.\w+\.sleep\s*\(/g },
  { label: 'SystemClock.sleep()', pattern: /\bSystemClock\.sleep\s*\(/g },
  { label: 'delay()', pattern: /\bdelay\s*\(/g },
]

type AstGrepNode = {
  ancestors(): AstGrepNode[]
  children(): AstGrepNode[]
  findAll(rule: unknown): AstGrepNode[]
  kind(): string
  range(): { start: { index: number }; end: { index: number } }
  text(): string
}
type AstGrepModule = {
  registerDynamicLanguage: (langs: Record<string, unknown>) => void
  parse: (lang: string, code: string) => { root(): AstGrepNode }
}

/**
 * ast-grep rules matching a JUnit-style test function. Kotest
 * string-invocation specs (`"does a thing" { }`) would need an
 * additional pattern; add one via `withKotlinFastPath`'s `patterns`
 * option if your suite uses them.
 */
const KOTLIN_TEST_PATTERNS: unknown[] = [
  {
    rule: {
      kind: 'function_declaration',
      has: {
        kind: 'modifiers',
        has: {
          kind: 'annotation',
          regex:
            '^@(Test|ParameterizedTest|RepeatedTest|TestFactory)(?:\\b|\\s*\\()',
        },
      },
    },
  },
]

const KOTLIN_TEST_FILE_PATTERN =
  /(?:^|\/)src\/(?:test|[A-Za-z0-9]+Test)\/(?:java|kotlin)\//

/**
 * Any Kotlin/Android test source set — classic `src/test`, and every
 * `src/<name>Test` set (androidTest, sharedTest, commonTest, jvmTest,
 * androidUnitTest, …). The boundary the Kotlin presets give
 * {@link withCharacterizationTest}: the marker only works in test code.
 */
export const KOTLIN_TEST_SOURCE_PATTERN =
  /(?:^|[/\\])src[/\\](?:test|[A-Za-z0-9]+Test)[/\\]/

let astGrep: AstGrepModule | null | undefined

function loadKotlinAstGrep(): AstGrepModule | null {
  if (astGrep !== undefined) return astGrep
  try {
    const require = createRequire(import.meta.url)
    const napi = require('@ast-grep/napi') as AstGrepModule
    const lang = require('@ast-grep/lang-kotlin') as { default?: unknown }
    napi.registerDynamicLanguage({ kotlin: lang.default ?? lang })
    astGrep = napi
  } catch {
    // Optional dependencies unavailable on this install or platform.
    astGrep = null
  }
  return astGrep
}

function findKotlinTestNodes(
  napi: AstGrepModule,
  code: string,
  patterns: unknown[],
): AstGrepNode[] {
  const root = napi.parse('kotlin', code).root()
  return patterns.flatMap((pattern) => root.findAll(pattern))
}

function kotlinTestNodes(
  napi: AstGrepModule,
  code: string,
  patterns: unknown[],
): string[] {
  return findKotlinTestNodes(napi, code, patterns).map((node) => node.text())
}

function nodeIsInside(node: AstGrepNode, insertion: Insertion): boolean {
  const range = node.range()
  return (
    range.start.index >= insertion.startByte &&
    range.end.index <= insertion.endByte
  )
}

function addedTestNode(
  beforeTests: string[],
  afterTests: AstGrepNode[],
  insertion: Insertion,
): AstGrepNode | null {
  const unmatched = [...afterTests]
  for (const beforeTest of beforeTests) {
    const index = unmatched.findIndex((node) => node.text() === beforeTest)
    if (index === -1) return null
    unmatched.splice(index, 1)
  }
  if (unmatched.length !== 1) return null
  const added = unmatched[0]!
  if (beforeTests.includes(added.text())) return null
  return nodeIsInside(added, insertion) ? added : null
}

type Insertion = { text: string; startByte: number; endByte: number }

/**
 * Every placement of the one contiguous insertion that turns `before`
 * into `after`, from the greedy (rightmost) placement leftwards. The
 * placement is ambiguous whenever the inserted text ends like the text
 * in front of it — inserting a test ABOVE an existing test shares the
 * `@Test\n  fun ` header, so the greedy prefix swallows that header and
 * the span starts mid-name (issue #43). Each placement yields the same
 * file; callers pick the one that holds the added test whole.
 */
function insertionPlacements(before: string, after: string): Insertion[] {
  if (after.length <= before.length) return []
  let prefix = 0
  while (prefix < before.length && before[prefix] === after[prefix]) {
    prefix += 1
  }
  let beforeSuffix = before.length
  let afterSuffix = after.length
  while (
    beforeSuffix > prefix &&
    before[beforeSuffix - 1] === after[afterSuffix - 1]
  ) {
    beforeSuffix -= 1
    afterSuffix -= 1
  }
  if (beforeSuffix !== prefix) return []
  const placements: Insertion[] = []
  let start = prefix
  let end = afterSuffix
  for (;;) {
    const text = after.slice(start, end)
    const startByte = Buffer.byteLength(after.slice(0, start), 'utf8')
    placements.push({ text, startByte, endByte: startByte + Buffer.byteLength(text, 'utf8') })
    // Slide left while the character leaving the span's end equals the
    // one entering at its start: the resulting file is unchanged.
    if (start === 0 || after[start - 1] !== after[end - 1]) break
    start -= 1
    end -= 1
  }
  return placements
}

function isRunnableTestNode(node: AstGrepNode): boolean {
  const ancestors = node.ancestors()
  const owner = ancestors[1]
  if (
    ancestors[0]?.kind() !== 'class_body' ||
    owner?.kind() !== 'class_declaration' ||
    ancestors[2]?.kind() !== 'source_file' ||
    !owner.children().some((child) => child.kind() === 'class')
  ) {
    return false
  }
  const bodyStart = owner.text().indexOf('{')
  const header = bodyStart === -1 ? owner.text() : owner.text().slice(0, bodyStart)
  return countMatches(header, DISABLING_TEST_CONTROL) === 0
}

function onlyCommentsAndWhitespace(code: string): boolean {
  return /^\s*$/.test(
    code.replace(/\/\/[^\r\n]*\r?\n|\/\*[\s\S]*?\*\//g, ''),
  )
}

function identifiersIn(tests: string[]): Set<string> {
  return new Set(
    tests.flatMap((test) =>
      [...test.matchAll(/`([^`]+)`|\b([A-Za-z_]\w*)\b/g)].map(
        (match) => match[1] ?? match[2]!,
      ),
    ),
  )
}

function safeExistingFileInsertion(
  napi: AstGrepModule,
  after: string,
  insertion: Insertion,
  addedTest: AstGrepNode,
  beforeTests: string[],
  patterns: unknown[],
): boolean {
  if (!nodeIsInside(addedTest, insertion)) return false
  const addedText = addedTest.text()
  const addedAt = insertion.text.indexOf(addedText)
  if (addedAt !== -1) {
    const remainder =
      insertion.text.slice(0, addedAt) +
      insertion.text.slice(addedAt + addedText.length)
    if (onlyCommentsAndWhitespace(remainder)) return true
  }

  const trimmed = insertion.text.trim()
  const priorIdentifiers = identifiersIn(beforeTests)
  const root = napi.parse('kotlin', after).root()
  return root.findAll({ rule: { kind: 'class_declaration' } }).some((node) => {
    if (node.text().trim() !== trimmed) return false
    const name = nodeName(node)
    if (name && priorIdentifiers.has(name)) return false
    const tests = patterns.flatMap((pattern) => node.findAll(pattern))
    const functions = node.findAll({ rule: { kind: 'function_declaration' } })
    return (
      tests.length === 1 &&
      tests[0]!.range().start.index === addedTest.range().start.index &&
      tests[0]!.range().end.index === addedTest.range().end.index &&
      isRunnableTestNode(addedTest) &&
      functions.length === 1
    )
  })
}

function safeNewTestFile(
  napi: AstGrepModule,
  code: string,
  addedTest: AstGrepNode,
): boolean {
  if (!isRunnableTestNode(addedTest)) return false
  const root = napi.parse('kotlin', code).root()
  return (
    root.findAll({ rule: { kind: 'class_declaration' } }).length === 1 &&
    root.findAll({ rule: { kind: 'function_declaration' } }).length === 1
  )
}

const DISABLING_TEST_CONTROL =
  /@(?:[A-Za-z_]\w*\.)*(?:Ignore|Disabled)\b|\benabled\s*=\s*false\b/g

function countMatches(code: string, pattern: RegExp): number {
  pattern.lastIndex = 0
  return [...code.matchAll(pattern)].length
}

function introducesDisablingControl(before: string, after: string): boolean {
  return (
    countMatches(after, DISABLING_TEST_CONTROL) >
    countMatches(before, DISABLING_TEST_CONTROL)
  )
}

function nodeName(node: AstGrepNode): string | null {
  const names = node
    .children()
    .filter((child) =>
      child.kind() === 'simple_identifier' || child.kind() === 'type_identifier',
    )
  const direct = names.at(-1)?.text()
  if (direct) return direct.replace(/^`|`$/g, '')
  const nested = node.findAll({ rule: { kind: 'simple_identifier' } })[0]
  return nested ? nested.text().replace(/^`|`$/g, '') : null
}

function enclosingScope(node: AstGrepNode): string {
  const container = node
    .ancestors()
    .find((ancestor) =>
      ancestor.kind() === 'class_declaration' ||
      ancestor.kind() === 'object_declaration',
    )
  return container ? (nodeName(container) ?? '<anonymous>') : '<top-level>'
}

function testScopes(
  napi: AstGrepModule,
  code: string,
  patterns: unknown[],
): Set<string> {
  const root = napi.parse('kotlin', code).root()
  const scopes = new Set<string>()
  for (const pattern of patterns) {
    for (const node of root.findAll(pattern)) scopes.add(enclosingScope(node))
  }
  return scopes
}

function containerHeaders(napi: AstGrepModule, code: string): Map<string, string> {
  const root = napi.parse('kotlin', code).root()
  const headers = new Map<string, string>()
  for (const kind of ['class_declaration', 'object_declaration']) {
    for (const node of root.findAll({ rule: { kind } })) {
      const name = nodeName(node)
      if (!name) continue
      const bodyStart = node.text().indexOf('{')
      headers.set(
        name,
        (bodyStart === -1 ? node.text() : node.text().slice(0, bodyStart)).trim(),
      )
    }
  }
  return headers
}

function changesExistingTestContainer(
  napi: AstGrepModule,
  before: string,
  after: string,
  patterns: unknown[],
): boolean {
  const scopes = testScopes(napi, before, patterns)
  const beforeHeaders = containerHeaders(napi, before)
  const afterHeaders = containerHeaders(napi, after)
  for (const scope of scopes) {
    if (scope === '<top-level>') continue
    if (beforeHeaders.get(scope) !== afterHeaders.get(scope)) return true
  }
  return false
}

type Declaration = { name: string; scope: string }

// Syntax whose declarations are local: visible only inside that body,
// so they cannot change what another test's code refers to (#45).
const LOCAL_SCOPE_KINDS = new Set([
  'function_body',
  'lambda_literal',
  'anonymous_initializer',
  'getter',
  'setter',
  'anonymous_function',
])

function isLocalDeclaration(node: AstGrepNode): boolean {
  return node.ancestors().some((ancestor) => LOCAL_SCOPE_KINDS.has(ancestor.kind()))
}

function declarations(napi: AstGrepModule, code: string): Declaration[] {
  const root = napi.parse('kotlin', code).root()
  const found: Declaration[] = []
  for (const kind of [
    'function_declaration',
    'property_declaration',
    'class_declaration',
    'object_declaration',
  ]) {
    for (const node of root.findAll({ rule: { kind } })) {
      if (isLocalDeclaration(node)) continue
      const name = nodeName(node)
      if (name) found.push({ name, scope: enclosingScope(node) })
    }
  }
  for (const node of root.findAll({ rule: { kind: 'import_header' } })) {
    const alias = node.findAll({ rule: { kind: 'type_identifier' } }).at(-1)
    const leaf = node.findAll({ rule: { kind: 'simple_identifier' } }).at(-1)
    const name = (alias ?? leaf)?.text().replace(/^`|`$/g, '')
    if (name) found.push({ name, scope: '<top-level>' })
  }
  return found
}

function introducedDeclarations(
  before: Declaration[],
  after: Declaration[],
): Declaration[] {
  const existing = new Map<string, number>()
  for (const declaration of before) {
    const key = `${declaration.scope}\u0000${declaration.name}`
    existing.set(key, (existing.get(key) ?? 0) + 1)
  }
  return after.filter((declaration) => {
    const key = `${declaration.scope}\u0000${declaration.name}`
    const remaining = existing.get(key) ?? 0
    if (remaining === 0) return true
    existing.set(key, remaining - 1)
    return false
  })
}

function shadowsExistingTestIdentifier(
  napi: AstGrepModule,
  before: string,
  after: string,
  beforeTests: string[],
  patterns: unknown[],
): boolean {
  const identifiers = new Set(
    beforeTests.flatMap((test) =>
      [...test.matchAll(/`([^`]+)`|\b([A-Za-z_]\w*)\b/g)].map(
        (match) => match[1] ?? match[2]!,
      ),
    ),
  )
  const scopes = testScopes(napi, before, patterns)
  return introducedDeclarations(
    declarations(napi, before),
    declarations(napi, after),
  ).some(
    ({ name, scope }) =>
      identifiers.has(name) &&
      (scope === '<top-level>' || scopes.has(scope)),
  )
}

function matchesTestPath(pattern: RegExp, path: string): boolean {
  pattern.lastIndex = 0
  if (pattern !== KOTLIN_TEST_FILE_PATTERN) return pattern.test(path)
  const match = pattern.exec(path)
  if (!match) return false
  const prefix = path.slice(0, match.index)
  return !/(?:^|\/)src\/(?:main|[A-Za-z0-9]+Main)\/(?:java|kotlin)\//.test(
    prefix,
  )
}

async function delegateWithFastPathUnavailable(
  rule: Rule,
  action: Action,
  ctx: RuleContext | undefined,
  detail: string,
): Promise<RuleResult> {
  const result = await rule(action, ctx)
  const diagnostic =
    `Kotlin fast path unavailable (${detail}); delegated to the wrapped rule.`
  if (result.kind === 'violation') {
    return { kind: 'violation', reason: `${result.reason} ${diagnostic}` }
  }
  return {
    ...result,
    reason: result.reason ?? diagnostic,
    notes: [
      ...(result.notes ?? []),
      { kind: 'kotlin-fast-path-unavailable' },
    ],
  }
}

/**
 * Kotlin equivalent of `enforceTdd({ fastPath: true })`, which Probity
 * only implements for TS/JS/Python/C#/Ruby/PHP: wraps a rule so that a
 * `.kt`/`.kts` write adding exactly one new test function passes
 * deterministically — no AI call for the most common write in a TDD
 * loop, adding the next red test. The write must target a Kotlin test
 * source set and add exactly one runnable test function. Existing files
 * must preserve every byte and test function and make one contiguous
 * insertion: the test (plus comments/whitespace), or a separate test
 * class with no additional functions. Brand-new files may include
 * imports and property fixtures but only the one test function.
 * Edits that target production paths, introduce disabling controls,
 * alter an existing test container's header, shadow an identifier used
 * by an existing test, or delete, disable, or weaken tests delegate to
 * the wrapped rule. Everything else (multi-test writes and non-Kotlin
 * files) delegates unchanged.
 *
 * The parser packages `@ast-grep/napi` and `@ast-grep/lang-kotlin`
 * ship as optional dependencies, so supported npm installs receive
 * them automatically. If a platform cannot install them, or the
 * current file is unavailable, or parsing fails, the wrapper falls
 * through to the wrapped rule — it can only ever skip work, never
 * block.
 *
 * Same trade-off as Probity's own fast-path: a deterministic pass on
 * every single-test addition skips the green→red refactor-readiness
 * check the AI would otherwise perform.
 *
 * @param rule — the TDD rule to wrap. Shipped presets pass their
 *   Kotlin-specialized judge; custom wrappers may supply another rule.
 * @param options.patterns — replaces the default ast-grep test-node
 *   patterns (e.g. to add a Kotest spec pattern).
 * @param options.testFilePattern — limits deterministic passes to test
 *   source paths; defaults to classic and KMP `src/*Test/{java,kotlin}`.
 */
export function withKotlinFastPath(
  rule: Rule,
  options: { patterns?: unknown[]; testFilePattern?: RegExp } = {},
): Rule {
  const patterns = options.patterns ?? KOTLIN_TEST_PATTERNS
  const testFilePattern = options.testFilePattern ?? KOTLIN_TEST_FILE_PATTERN
  const wrapped = async function kotlinFastPath(
    action: Action,
    ctx?: RuleContext,
  ): Promise<RuleResult> {
    if (
      action.kind !== 'write' ||
      !/\.kts?$/.test(action.path) ||
      !matchesTestPath(testFilePattern, action.path)
    ) {
      return rule(action, ctx)
    }
    const napi = loadKotlinAstGrep()
    if (!napi) {
      return delegateWithFastPathUnavailable(
        rule,
        action,
        ctx,
        'parser packages could not be loaded',
      )
    }
    const before = await ctx?.readFile?.(action.path)
    if (!before || before.kind === 'unknown') {
      return delegateWithFastPathUnavailable(
        rule,
        action,
        ctx,
        'current file content unavailable',
      )
    }
    const beforeText = before.kind === 'present' ? before.content : ''
    const placements =
      beforeText.length === 0
        ? [
            {
              text: action.content,
              startByte: 0,
              endByte: Buffer.byteLength(action.content, 'utf8'),
            },
          ]
        : insertionPlacements(beforeText, action.content)
    if (placements.length === 0) return rule(action, ctx)

    let fastPath = false
    try {
      const beforeTests = kotlinTestNodes(napi, beforeText, patterns)
      const afterTestNodes = findKotlinTestNodes(napi, action.content, patterns)
      let insertion = placements[0]!
      let addedTest: AstGrepNode | null = null
      for (const placement of placements) {
        addedTest = addedTestNode(beforeTests, afterTestNodes, placement)
        if (addedTest) {
          insertion = placement
          break
        }
      }
      if (addedTest) {
        const unsafeInsertion =
          introducesDisablingControl(beforeText, action.content) ||
          changesExistingTestContainer(
            napi,
            beforeText,
            action.content,
            patterns,
          ) ||
          shadowsExistingTestIdentifier(
            napi,
            beforeText,
            action.content,
            beforeTests,
            patterns,
          )
        fastPath =
          !unsafeInsertion &&
          isRunnableTestNode(addedTest) &&
          (beforeText.length === 0
            ? safeNewTestFile(napi, action.content, addedTest)
            : safeExistingFileInsertion(
                napi,
                action.content,
                insertion,
                addedTest,
                beforeTests,
                patterns,
              ))
      }
    } catch {
      return delegateWithFastPathUnavailable(
        rule,
        action,
        ctx,
        'parsing failed',
      )
    }
    if (fastPath) {
      return { kind: 'pass', notes: [{ kind: 'fast-path' }] }
    }
    return rule(action, ctx)
  }
  // Surface the wrapped rule in engine traces and block reports:
  // a block coming through the wrapper is the inner rule's verdict.
  Object.defineProperty(wrapped, 'name', {
    value: `kotlinFastPath(${rule.name || 'rule'})`,
  })
  return wrapped
}

// Kiro's tool-result envelope reports a command's outcome as JSON
// (`{"exit_status": "exit status: 0", ...}`) instead of the runner's
// own text, so a quiet/`-q` Gradle run with no "BUILD SUCCESSFUL" text
// can still be trusted via exit_status — but only when the Gradle
// invocation is provably the LAST simple command run (a pipe,
// `|| true`, or trailing command reports THAT command's status, not
// Gradle's). Kiro-specific: native Claude, or a caller supplying its
// own successPattern/failurePattern, gets no such allowance.
const KIRO_ZERO_EXIT_STATUS = 'exit status: 0'

/** Parses a Kiro envelope's `exit_status` via `JSON.parse` + a shape
 *  check, never a text regex — malformed/differently-shaped output is
 *  no evidence, never a parsed zero. */
function parseKiroExitStatus(output: string): string | null {
  const trimmed = output.trim()
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null
  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null
    }
    const record = parsed as Record<string, unknown>
    const exitStatus = record['exit_status']
    return typeof exitStatus === 'string' &&
      typeof record['stdout'] === 'string' &&
      typeof record['stderr'] === 'string'
      ? exitStatus
      : null
  } catch {
    return null
  }
}

/** True when `output` mentions an `exit_status` field but fails
 *  {@link parseKiroExitStatus}'s canonical-shape check. Distinguishes
 *  "no Kiro evidence" from a broken/non-canonical envelope, which is
 *  red even if it contains banner-like text. */
function isMalformedKiroEnvelope(output: string): boolean {
  const trimmed = output.trim()
  return (
    (trimmed.startsWith('{') || trimmed.startsWith('[')) &&
    trimmed.includes('"exit_status"') &&
    parseKiroExitStatus(output) === null
  )
}

/** True when the LAST top-level simple command is itself a genuine
 *  Gradle verification invocation — not followed by a pipe/`;`/`&&`/
 *  `||`/other command, and not merely mentioning "gradlew" as an
 *  argument (`echo gradlew`). Piped/chained runs still pass via
 *  BUILD SUCCESSFUL; this only gates the exit-status shortcut. */
function gradleInvocationIsFinalCommand(command: string): boolean {
  const segments = splitTopLevelCommands(command)
  let last = ''
  for (let i = segments.length - 1; i >= 0; i--) {
    if (segments[i]!.trim().length > 0) {
      last = segments[i]!
      break
    }
  }
  return isGradleVerificationInvocation(last)
}

// Flags consuming the FOLLOWING word as a value (`--flag value`);
// boolean flags like `--no-daemon` take none.
const VALUE_TAKING_FLAGS = new Set([
  '-P', '--project-prop', '-D', '--system-prop', '-I', '--init-script',
  '-c', '--settings-file', '-b', '--build-file', '-p', '--project-dir',
  '-g', '--gradle-user-home', '-x', '--exclude-task', '--args', '--task',
  '--configuration-cache-problems', '--priority', '--max-workers',
  '--console', '--warning-mode',
])
const EXCLUDE_TASK_FLAG = /^(?:-x(?:=?.+)?|--exclude-task(?:=.+)?)$/
const REDIRECT = /^(?:\d*|&)(?:>>?|<<?)/
const REDIRECT_WITH_SEPARATE_TARGET = /^(?:\d*|&)(?:>>?|<<?)$/

/** A Kotlin Multiplatform target's test task (`iosSimulatorArm64Test`,
 *  `macosArm64Test`, `jsNodeTest`, `wasmJsBrowserTest`, `desktopTest`,
 *  issue #94). Compile, link and `…TestBinaries` tasks run nothing and
 *  don't end in `Test`. */
const KMP_TARGET_TEST_TASK =
  /^(?:ios|macos|tvos|watchos|linux|mingw|androidNative|js|wasmJs|wasmWasi|desktop)[A-Za-z0-9]*Test$/

/** An Android Gradle Plugin device-test task (issue #95): connected
 *  devices (`connectedAndroidTest`, `connectedDebugAndroidTest`,
 *  `connectedAndroidDeviceTest`, `connectedCheck`, KMP's
 *  `androidConnectedCheck`) and Gradle Managed Devices
 *  (`atd33AndroidDeviceTest`, `allDevicesAndroidDeviceTest`,
 *  `pixel2api30DebugAndroidTest`). Tasks that only build the test APK
 *  (`assemble…`, `package…`, `compile…`) run nothing. */
const ANDROID_DEVICE_TEST_TASK =
  /^(?:connected[A-Za-z0-9]*(?:Test|Check)|androidConnectedCheck|allDevices[A-Za-z0-9]*(?:Test|Check)|[a-z][A-Za-z0-9]*Android(?:Device)?Test)$/
const ANDROID_BUILD_ONLY_TASK = /^(?:assemble|package|compile|bundle|generate|merge|process|lint|extract|install|uninstall)/

function isVerificationTask(word: string): boolean {
  const task = word.replace(/^:+/, '').split(':').pop() ?? ''
  return (
    task === 'build' ||
    task === 'check' ||
    task === 'test' ||
    task === 'allTests' ||
    task === 'jvmTest' ||
    /^test[A-Za-z0-9]*Test$/.test(task) ||
    KMP_TARGET_TEST_TASK.test(task) ||
    (ANDROID_DEVICE_TEST_TASK.test(task) && !ANDROID_BUILD_ONLY_TASK.test(task))
  )
}

/** Accepts one simple shell command as a genuine Gradle verification
 *  invocation: first word `gradlew`/`./gradlew`/`gradle`; no
 *  `--dry-run` or `-x`/`--exclude-task`; and at least one positional
 *  task (not a flag, flag value, or redirect target) on the allowlist. */
function isGradleVerificationInvocation(simpleCommand: string): boolean {
  const words = simpleCommand.trim().split(/\s+/).filter(Boolean)
  // `ANDROID_SERIAL=emulator-5554 ./gradlew …` and `env VAR=… ./gradlew …`
  // (issue #95): the environment prefix is not the command.
  if (words[0] === 'env') words.shift()
  while (words.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[0]!)) words.shift()
  if (!/^(?:\.\/|[\w./-]*\/)?gradlew?$/.test(words[0] ?? '')) return false
  if (words.some((word) => word === '--dry-run' || EXCLUDE_TASK_FLAG.test(word))) {
    return false
  }

  let skipNext = false
  for (let i = 1; i < words.length; i++) {
    const word = words[i]!
    if (skipNext) {
      skipNext = false
      continue
    }
    if (REDIRECT.test(word)) {
      skipNext = REDIRECT_WITH_SEPARATE_TARGET.test(word)
      continue
    }
    if (word.startsWith('-')) {
      skipNext = !word.includes('=') && VALUE_TAKING_FLAGS.has(word)
      continue
    }
    if (isVerificationTask(word)) return true
  }
  return false
}

/** Kotlin-default command predicate: true if ANY top-level simple
 *  command is a genuine Gradle verification invocation. */
function isKotlinDefaultGradleCommand(command: string): boolean {
  return splitTopLevelCommands(command).some(isGradleVerificationInvocation)
}

/** Kotlin-default extra-success predicate: trusts a parsed zero exit
 *  status only when the Gradle invocation is the last command run. */
function kotlinDefaultExtraSuccess(command: string, output: string): boolean {
  return (
    gradleInvocationIsFinalCommand(command) &&
    parseKiroExitStatus(output) === KIRO_ZERO_EXIT_STATUS
  )
}

const DEFAULT_SUCCESS_PATTERN = /BUILD SUCCESSFUL/
// A script/dependency-resolution failure can print `FAILURE:` without
// `BUILD FAILED`; a task failure names the task in `Execution failed
// for task ':...'`.
const DEFAULT_FAILURE_PATTERN =
  /FAILED|BUILD FAILED|^FAILURE: |Execution failed for task/m

/** Kotlin-default extra-failure predicate: a parsed non-zero exit
 *  status, or output that looks like an ATTEMPTED but malformed/
 *  non-canonical Kiro envelope, is always red — even alongside a
 *  BUILD SUCCESSFUL banner (which may be echoed/stale text, or a
 *  substring inside broken JSON, not this run's own verdict). */
function kotlinDefaultExtraFailure(output: string): boolean {
  if (isMalformedKiroEnvelope(output)) return true
  const exitStatus = parseKiroExitStatus(output)
  return exitStatus !== null && exitStatus !== KIRO_ZERO_EXIT_STATUS
}

/** Production Kotlin source sets: `src/main/` and `src/<target>Main/` (commonMain, jvmMain, ...). */
export const KOTLIN_PRODUCTION_SOURCE_PATTERN =
  /(?:^|[/\\])src[/\\](?:main|[A-Za-z0-9]+Main)[/\\]/

/**
 * The green-run options the Kotlin commit gate uses (task policy, banners,
 * Kiro exit status), for `withExtractionUnderGreen`. A custom `command`
 * keeps the banners but drops the Gradle-specific predicates, as
 * `requireGreenTestRun` does.
 */
export function kotlinGreenRunOptions(command: RegExp = GRADLE_TEST_COMMAND): GreenRunOptions {
  const isDefault = command === GRADLE_TEST_COMMAND
  return {
    command,
    commandPredicate: isDefault ? isKotlinDefaultGradleCommand : undefined,
    successPattern: DEFAULT_SUCCESS_PATTERN,
    extraSuccessPredicate: isDefault ? kotlinDefaultExtraSuccess : undefined,
    failurePattern: DEFAULT_FAILURE_PATTERN,
    extraFailurePredicate: isDefault
      ? (_command, output) => kotlinDefaultExtraFailure(output)
      : undefined,
  }
}

const DEFAULT_GRADLE_GREEN_REASON =
  'Accepted Gradle verification tasks: test/test...Test, build, or check ' +
  '(including module-qualified tasks, allTests/jvmTest and Kotlin ' +
  'Multiplatform target test tasks such as iosSimulatorArm64Test, and ' +
  'Android device tests such as connectedAndroidTest; not --dry-run ' +
  'or -x/--exclude-task). Under Kiro, a quiet run with no BUILD ' +
  'SUCCESSFUL text is accepted only when the tool result is the canonical ' +
  '{"exit_status": "exit status: 0", ...} envelope (a zero exit_status) ' +
  'AND the Gradle invocation is the LAST command run (no trailing pipe, ' +
  '`; next-command`, or `|| fallback`) — those still need the BUILD ' +
  'SUCCESSFUL banner itself.'

/**
 * Gradle/Kiro-defaulted wrapper over `requireGreenTestRun` in
 * `gates.ts` (see that export for the full option contract). The
 * Kotlin defaults (command predicate, Kiro extra success/failure
 * signal, default reason) apply ONLY when `options.command` is
 * referentially the exported {@link GRADLE_TEST_COMMAND}; any other
 * RegExp (a custom pattern, or a preset's own constant such as
 * Swift's `XCODEBUILD_TEST_COMMAND`) falls through to the
 * language-neutral behavior with the caller's own patterns/reason and
 * no default appended. The Kiro exit-status extra-success/failure
 * predicates apply only when the caller omits BOTH `successPattern`
 * and `failurePattern` — supplying either fully suppresses the Kiro
 * allowance, so a caller replacing the evidence contract gets exactly
 * what they specified, nothing more.
 */
export function requireGreenTestRun(options: {
  command: RegExp
  successPattern?: RegExp
  failurePattern?: RegExp
  enforceForPaths?: RegExp
  listCommitFiles?: (command: string, cwd: string) => string[]
  reason?: string
}): Rule {
  const isDefaultGradleCommand = options.command === GRADLE_TEST_COMMAND
  const allowKiroExtras =
    isDefaultGradleCommand && !options.successPattern && !options.failurePattern
  return requireGreenTestRunGeneric({
    command: options.command,
    commandPredicate: isDefaultGradleCommand
      ? isKotlinDefaultGradleCommand
      : undefined,
    successPattern: options.successPattern ?? DEFAULT_SUCCESS_PATTERN,
    extraSuccessPredicate: allowKiroExtras ? kotlinDefaultExtraSuccess : undefined,
    failurePattern: options.failurePattern ?? DEFAULT_FAILURE_PATTERN,
    extraFailurePredicate: allowKiroExtras
      ? (_command, output) => kotlinDefaultExtraFailure(output)
      : undefined,
    enforceForPaths: options.enforceForPaths,
    listCommitFiles: options.listCommitFiles,
    reason: isDefaultGradleCommand
      ? options.reason ?? DEFAULT_GRADLE_GREEN_REASON
      : options.reason,
  })
}

/** Complete single-line telemetry calls — the only additions the
 *  telemetry fast-path recognizes. Multi-line event calls fall
 *  through to the wrapped rule (conservative by design). */
const TELEMETRY_LINE_PATTERNS: RegExp[] = [
  /^[\w.]*logger\.event\(.*\)[,;]?$/i,
  /^breadcrumbs\.(?:action|outcome)\(.*\)[,;]?$/,
]

/**
 * Deterministic fast-path for the write the observability rules
 * encourage: adding telemetry to existing code. A `.kt`/`.kts` write
 * whose entire delta is ADDED lines, every one a complete single-line
 * telemetry call (`logger.event(...)`, `breadcrumbs.action/outcome`),
 * passes without consulting the wrapped rule — no AI call, and no
 * "over-implementation" friction from a TDD gate for instrumentation
 * the adapter-observability rule demands anyway. Anything else — a
 * removed/changed line, a multi-line event call, any non-telemetry
 * addition — falls through unchanged.
 *
 * Wrap it around both sides of the tension: the TDD rule (so
 * telemetry additions aren't judged as unasserted behavior) and
 * `enforceAdapterObservability` (a telemetry-only addition trivially
 * satisfies it).
 */
export function withTelemetryFastPath(
  rule: Rule,
  options: { patterns?: RegExp[]; filePattern?: RegExp } = {},
): Rule {
  const patterns = options.patterns ?? TELEMETRY_LINE_PATTERNS
  // The extension guard is a parameter: a config passing Swift (or
  // any non-Kotlin) telemetry patterns MUST also pass the matching
  // filePattern, or the fast path silently never fires and every
  // source write costs a model call (found live on an iOS trial).
  const filePattern = options.filePattern ?? /\.kts?$/
  const wrapped = async function telemetryFastPath(
    action: Action,
    ctx?: RuleContext,
  ): Promise<RuleResult> {
    if (action.kind !== 'write' || !filePattern.test(action.path)) {
      return rule(action, ctx)
    }
    const before = await ctx?.readFile?.(action.path)
    if (!before || before.kind !== 'present') return rule(action, ctx)
    const trim = (text: string) =>
      text.split('\n').map((line) => line.trim()).filter((line) => line.length > 0)
    const beforeLines = trim(before.content)
    const afterLines = trim(action.content)
    const beforeSet = new Set(beforeLines)
    const afterSet = new Set(afterLines)
    const removed = beforeLines.filter((line) => !afterSet.has(line))
    const added = afterLines.filter((line) => !beforeSet.has(line))
    if (removed.length > 0 || added.length === 0) return rule(action, ctx)
    const allTelemetry = added.every((line) =>
      patterns.some((pattern) => pattern.test(line)),
    )
    if (!allTelemetry) return rule(action, ctx)
    return { kind: 'pass', notes: [{ kind: 'fast-path' }] }
  }
  Object.defineProperty(wrapped, 'name', {
    value: `telemetryFastPath(${rule.name || 'rule'})`,
  })
  return wrapped
}

/**
 * Marker that declares a write a mutation probe: a deliberate,
 * temporary break of production behavior made to prove a retrofitted
 * test can fail (see acceptance-testing's mutation-check step). Put
 * it in a comment on or near the mutated line:
 *
 *   // probity: mutation-probe — proving RetrySpec bites; revert before commit
 */
export const MUTATION_PROBE_MARKER = /probity:\s*mutation-probe/

const PROBE_SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'build',
  '.gradle',
  'out',
  'dist',
  '.idea',
])

const DEFAULT_PROBE_FILE_PATTERN = /\.(?:kt|kts|java)$/

function walkFiles(dir: string, out: string[] = [], top = true): string[] {
  // A directory holding a `.git` FILE is another working tree — a
  // linked `git worktree` (Claude Code puts sub-agent worktrees at
  // .claude/worktrees/agent-<id>/) or a submodule. Its markers belong
  // to that tree's commits, never to this one's.
  if (!top && isFile(join(dir, '.git'))) return out
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!PROBE_SKIP_DIRS.has(entry.name)) walkFiles(join(dir, entry.name), out, false)
    } else {
      out.push(join(dir, entry.name))
    }
  }
  return out
}

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

/**
 * Files under the scanned roots that carry `marker`, as paths relative
 * to the tree scanned. When the commit targets a git working tree
 * nested inside a root (a linked worktree), that tree is scanned in
 * the root's place — so each worktree is gated by its own markers
 * only, and sibling worktrees never block each other.
 */
function markedFiles(
  roots: string[],
  command: string,
  filePattern: RegExp,
  marker: RegExp,
): string[] {
  return roots.flatMap((root) => {
    const scanned = nestedCommitTree(command, root) ?? root
    return walkFiles(scanned)
      .filter((file) => filePattern.test(file))
      .filter((file) => {
        try {
          return marker.test(readFileSync(file, 'utf8'))
        } catch {
          return false
        }
      })
      .map((file) => relative(scanned, file).split(sep).join('/'))
  })
}

/**
 * Wraps a TDD rule so that a write carrying the
 * {@link MUTATION_PROBE_MARKER} passes deterministically — no AI call,
 * no red-before-green demand. Mutation checks (deliberately breaking
 * production code to prove a retrofitted test fails) are *mandated* by
 * the acceptance-testing skill, and an unwrapped `enforceTdd`
 * correctly denies them: a deliberate regression has no failing test
 * in front of it and never will. Without this wrapper the only way to
 * run a mutation check is to override the gate — which trains agents
 * and humans to ignore deny decisions.
 *
 * The bypass is not free: pair this with {@link enforceProbeReversion}
 * so `git commit` is blocked while any probe marker is still on disk.
 * The pair converts an override into an enforced round-trip: mark →
 * watch the test fail → revert (the marker disappears with the
 * mutation) → commit opens again. Removing just the marker while
 * keeping the mutation is a fresh unmarked production write, judged by
 * the wrapped TDD rule as usual.
 *
 * Only the TDD rule is bypassed. Deterministic screens (vendor
 * imports, ambient effects) and the boundary validator still apply to
 * probe writes — a probe has no business introducing those.
 *
 * An unmarked write the TDD rule denies for lacking a red gets a note
 * naming the marker (issue #134): a deliberate break and untested new
 * behaviour look alike to the judge, and a test-support stub in a
 * `src/main` source set is judged as production code.
 *
 * @param rule — the wrapped TDD stack. Shipped presets supply their
 *   package-internal Kotlin-specialized judge before applying this wrapper.
 */
export function withMutationProbe(rule: Rule): Rule {
  const wrapped = async function mutationProbe(
    action: Action,
    ctx?: RuleContext,
  ): Promise<RuleResult> {
    if (action.kind === 'write' && MUTATION_PROBE_MARKER.test(action.content)) {
      return { kind: 'pass', notes: [{ kind: 'mutation-probe' }] }
    }
    const result = await rule(action, ctx)
    if (
      result.kind === 'violation' &&
      PROBE_CANDIDATE_REASON.test(result.reason ?? '') &&
      !RETROFIT_REASON.test(result.reason ?? '')
    ) {
      return { ...result, reason: `${result.reason}\n\n${PROBE_HINT}` }
    }
    return result
  }
  Object.defineProperty(wrapped, 'name', {
    value: `mutationProbe(${rule.name || 'rule'})`,
  })
  return wrapped
}

// The inverse-scenario note only helps when the denial is about a
// missing red or when the write is removing control — appended
// anywhere else it reads as boilerplate (observed live on a
// minimal-green denial about an undefined symbol).
const MISSING_RED_REASON =
  /never (?:been )?observed|not (?:been )?observed failing|no (?:clean |assertion-level |prior )*red|passe[sd] (?:all|without)|without (?:a |any )?(?:failing|red)/i

// The other recurring composition-root denial: a multi-part fixture
// (fake + fixture accessor + enum value) landed piecewise, and the
// first write is blocked for referencing a sibling it doesn't define.
const UNDEFINED_SIBLING_REASON =
  /not defined|no declaration|undefined|not declared|does not (?:add|define|declare)|isn't defined/i

// A test write denied as bending a red test to the code (issue #136).
// The judge can't tell a wrong expectation about the code from a wrong
// one about the test environment, so the denial stands and the note
// names the way through instead. Neither marker applies to this case.
const RETROFIT_REASON =
  /retrofit|weaken|loosen|bend|(?:fit|match)(?:es|ing)? (?:the )?(?:current |existing |new )?(?:production |implementation|code)|replac\w* (?:the )?(?:asserted|expected) (?:outcome|value|result)/i

const RESTART_HINT =
  'Note: if the original expectation was wrong rather than the code — ' +
  'for example about the test environment — restart the cycle so the ' +
  'corrected expectation is seen failing: revert the production change ' +
  'made since the red and the test itself (git checkout -- <files>, or ' +
  'delete a file git does not track yet), write it again as a new test ' +
  'with the corrected expectation, run it and watch it fail on that ' +
  'assertion against the unchanged code, then reapply the production ' +
  'change. Do not loosen the test or pin what the code now produces.'

// A denial for an untested change under green reads the same whether
// the write is new behaviour or a deliberate break (issue #134, a
// sabotage check on a test-support stub). The note names the
// sanctioned route for the second case.
const PROBE_CANDIDATE_REASON = new RegExp(
  `${MISSING_RED_REASON.source}|under green|no failing test|untested behaviou?r`,
  'i',
)

const PROBE_HINT =
  'Note: if this write is a deliberate break — a mutation check or ' +
  'sabotage made to watch a test or scenario fail, in production code ' +
  'or in a stub or fake used only by tests — put `// probity: ' +
  'mutation-probe` in a comment on the changed line and retry. The write ' +
  'passes; run the tests and watch them fail, then revert the file ' +
  '(git checkout -- <file>). Commits are blocked while the marker is on disk.'

const ATOMIC_FIXTURE_HINT =
  'Note: if this block cites a symbol the write references but does not ' +
  'define, the fake, its fixture key/accessor, and its enum value are ' +
  'ONE coherent unit — land them in a single atomic write instead of ' +
  'piecewise edits judged alone.'

const INVERSE_SCENARIO_GUIDANCE =
  'Note for test-control infrastructure (fixtures, fakes registered in an ' +
  'acceptance composition root): if the scenario this control serves ' +
  'passes WITHOUT it — the environment already satisfies its Given (no ' +
  'network, no credentials, empty state) — do not resolve this block by ' +
  'deleting the control. That leaves the precondition owned by the ' +
  'environment and makes the opposite precondition unspecifiable. The ' +
  'legitimate red is the INVERSE scenario on the same port (e.g. the ' +
  'success path when only failure happens for free): write that scenario, ' +
  'watch it fail, and let it drive this fixture; then move the original ' +
  'scenario onto the explicit fixture as a refactor under green. If the ' +
  'seam itself is missing, mark the scenario `## Scenario (wip):` and ' +
  'surface the seam gap to the user instead of working around it.'

/**
 * Wraps a TDD rule so that a violation on a write to the project's
 * test-control layer — acceptance composition roots, fixture/fake
 * registrations — carries the inverse-scenario escape route in its
 * deny text.
 *
 * Why: on brownfield systems the environment often produces the sad
 * path for free (a simulator with no backend fails every sign-in), so
 * a sad-path scenario never goes red and an unwrapped TDD gate appears
 * to "refuse" the control fixture. The observed failure mode is the
 * agent resolving that tension in the wrong direction — deleting the
 * control and letting the environment own the Given. The deny message
 * is what the agent reads at that decision point, so the correct move
 * (write the inverse scenario; its red drives the fixture) must be
 * stated there, not only in the skill prose.
 *
 * Pass-through everywhere else: verdicts are unchanged, only the
 * violation reason on matching paths gains a guidance paragraph — and
 * only the paragraph that applies. The inverse-scenario note is
 * appended when the denial is about a missing red (or the write
 * removes existing content — the deletion temptation); a denial citing
 * an undefined symbol gets the atomic-fixture hint instead (a
 * multi-part fixture judged piecewise). Other denials pass through
 * untouched, so the guidance never reads as boilerplate.
 *
 * @param rule — the TDD rule to wrap (already wrapped in fast-paths /
 *   mutation-probe as usual).
 * @param options.filePattern — paths that hold test-control
 *   infrastructure (e.g. /App[/\\]Sources[/\\]Acceptance[/\\]/ or a
 *   fixtures directory).
 */
export function withInverseScenarioGuidance(
  rule: Rule,
  options: { filePattern: RegExp },
): Rule {
  const wrapped = async function inverseScenarioGuidance(
    action: Action,
    ctx?: RuleContext,
  ): Promise<RuleResult> {
    const result = await rule(action, ctx)
    if (
      result.kind !== 'violation' ||
      action.kind !== 'write' ||
      !options.filePattern.test(action.path)
    ) {
      return result
    }
    const reason = result.reason ?? ''
    let removesContent = false
    const before = await ctx?.readFile?.(action.path)
    if (before?.kind === 'present') {
      const after = new Set(
        action.content.split('\n').map((line) => line.trim()),
      )
      removesContent = before.content
        .split('\n')
        .map((line) => line.trim())
        .some((line) => line.length > 0 && !after.has(line))
    }
    if (removesContent || MISSING_RED_REASON.test(reason)) {
      return { ...result, reason: `${reason}\n\n${INVERSE_SCENARIO_GUIDANCE}` }
    }
    if (UNDEFINED_SIBLING_REASON.test(reason)) {
      return { ...result, reason: `${reason}\n\n${ATOMIC_FIXTURE_HINT}` }
    }
    return result
  }
  Object.defineProperty(wrapped, 'name', {
    value: `inverseScenarioGuidance(${rule.name || 'rule'})`,
  })
  return wrapped
}

/**
 * The commit half of the mutation-probe round-trip (see
 * {@link withMutationProbe}): blocks `git commit` while any source
 * file under `roots` still contains the probe marker, listing the
 * files. Reverting the mutation (e.g. `git checkout -- <file>`)
 * removes the marker with it, so a clean tree needs no bookkeeping.
 * Deterministic filesystem scan — no AI call.
 *
 * Applies to: command actions matching `git commit`.
 *
 * @param options.roots — absolute paths to scan (the repo root is
 *   fine; node_modules/build dirs are skipped).
 * @param options.filePattern — which files can carry probes
 *   (default: `.kt`/`.kts`/`.java`).
 */
export function enforceProbeReversion(options: {
  roots: string[]
  filePattern?: RegExp
}): Rule {
  const filePattern = options.filePattern ?? DEFAULT_PROBE_FILE_PATTERN
  return function enforceProbeReversion(action: Action): RuleResult {
    if (action.kind !== 'command') return { kind: 'pass' }
    if (!isGitCommit(action.command)) return { kind: 'pass' }
    const outstanding = markedFiles(
      options.roots,
      action.command,
      filePattern,
      MUTATION_PROBE_MARKER,
    )
    if (outstanding.length === 0) return { kind: 'pass' }
    return {
      kind: 'violation',
      reason:
        'Mutation probe(s) still on disk — a deliberate break made to ' +
        'prove a test bites must be reverted before committing ' +
        '(git checkout -- <file> restores the original and removes ' +
        'the marker):\n' +
        outstanding.map((file) => `    ${file}`).join('\n'),
    }
  }
}

/**
 * Marker that declares a test a characterization test: the first test
 * for behavior that already exists in production, so no natural red
 * can precede it (the test is born green). Put it in a comment on or
 * directly above the test function:
 *
 *     // probity: characterization
 *     func testSignedInUserWithoutAnEntitlementIsOfferedPlans() async { … }
 */
export const CHARACTERIZATION_MARKER = /probity:\s*characterization\b/

// Kotlin test names are often backticked sentences
// (fun `rejects blank ids`()); capture the whole name so the removal
// proof looks for that test, not its first word.
const FUNCTION_NAME = /(?:func|fun)\s+(?:`([^`]+)`|([A-Za-z_]\w*))/

/** Test names whose characterization markers this write removes,
 *  paired with `null` when a marker can't be tied to a function. */
function removedMarkerTests(
  before: string,
  after: string,
): (string | null)[] {
  const names = (content: string): (string | null)[] => {
    const lines = content.split('\n')
    const found: (string | null)[] = []
    lines.forEach((line, index) => {
      if (!CHARACTERIZATION_MARKER.test(line)) return
      for (let scan = index; scan < Math.min(index + 6, lines.length); scan++) {
        const match = lines[scan]!.match(FUNCTION_NAME)
        if (match) {
          found.push((match[1] ?? match[2])!)
          return
        }
      }
      found.push(null)
    })
    return found
  }
  const remaining = new Set(names(after).filter(Boolean))
  return names(before).filter((name) => name === null || !remaining.has(name))
}

// A test-layer denial that asks for a red the test can never have —
// the behavior already exists, so the test is born green. Broader than
// MISSING_RED_REASON: judges phrase this as "must be observed failing
// first" or "treats this as new behavior".
const CHARACTERIZATION_CANDIDATE_REASON = new RegExp(
  `${MISSING_RED_REASON.source}|observed? (?:it |the test |to )?fail|fail(?:ing|s)? first|red first|new (?:unimplemented )?behaviou?r|existing behaviou?r|already (?:implemented|exists|passes|satisf)`,
  'i',
)

const CHARACTERIZATION_HINT =
  'Note: if this test pins behavior production ALREADY has (a ' +
  'characterization or regression test — e.g. covering a branch a ' +
  'mutation review found untested), no honest red can precede it. Put ' +
  '`// probity: characterization` in a comment directly above the test ' +
  'function and retry: the write passes, then prove the test bites — ' +
  'mutation-probe the production path (`// probity: mutation-probe`), ' +
  'run the test and watch it fail, revert the probe, remove the marker. ' +
  'Commits are blocked while the marker is on disk. Do not break ' +
  'production to manufacture a red.'

// Claude Code keeps only a 2KB preview of a large tool output in the
// transcript and saves the rest to <session>/tool-results/<id>.txt. A
// full-module Gradle run with a failing test is usually that large, and
// its FAILED line is rarely in the first 2KB.
const PERSISTED_OUTPUT = /<persisted-output>[^]*?Full output saved to: (\S+[/\\]tool-results[/\\][^\s/\\]+\.txt)/

/** A command's output, reading Claude Code's saved full output when the
 *  transcript only kept a preview. */
function fullCommandOutput(output: string): string {
  const saved = output.match(PERSISTED_OUTPUT)?.[1]
  if (!saved) return output
  try {
    return readFileSync(saved, 'utf8')
  } catch {
    return output
  }
}

/**
 * Wraps a TDD rule to sanction the **characterization round-trip** —
 * the only honest way to add the FIRST test for behavior that predates
 * it (common on brownfield systems). A test for existing behavior is
 * born green, so no red keyed to it can be observed before it exists;
 * an unwrapped TDD gate correctly denies it, and a mutation probe
 * can't help yet because a probe only fails tests that already exist.
 * Without this wrapper the only ways out are an override or leaving
 * the behavior unspecified.
 *
 * The round-trip, each step enforced:
 *
 *   1. Write the test carrying {@link CHARACTERIZATION_MARKER} — this
 *      wrapper passes it deterministically (test-layer paths only).
 *   2. Run the suite green, then mutation-probe the production path
 *      (`// probity: mutation-probe`) and observe the new test FAIL —
 *      the recorded red is the proof the test bites.
 *   3. Revert the probe. Remove the characterization marker — this
 *      wrapper allows the removal only when the session transcript
 *      records a test run in which the marked test failed.
 *   4. Commit — {@link enforceCharacterizationResolution} blocks while
 *      any marker is still on disk, so an unproven characterization
 *      test can't land.
 *
 * The bypass is confined: only writes to paths matching
 * `options.filePattern` (the test layer) skip the wrapped rule, so a
 * production write can't borrow the marker. Same inherent limit as
 * every transcript gate: reds observed in another terminal or CI are
 * invisible — run the probe in-session.
 *
 * Discoverability: when the wrapped rule denies an unmarked test-layer
 * write for lacking a red, the deny text gains a note naming the
 * marker, so an agent pinning existing behavior learns the sanctioned
 * route at the point it is blocked instead of breaking production.
 * A test-layer write denied as retrofitting (bending a red test to the
 * code) gets the restart-the-cycle note instead (issue #136), never the
 * marker: a corrected expectation is seen failing by restarting, not
 * by characterizing what the code now does.
 *
 * @param rule — the TDD rule to wrap (fast-paths/probe wrappers
 *   included as usual).
 * @param options.filePattern — paths that hold test code (e.g.
 *   /AcceptanceTests[/\\]/ or /src[/\\]\w+Test[/\\]/). Required: it is
 *   the boundary that keeps the marker useless in production files.
 */
export function withCharacterizationTest(
  rule: Rule,
  options: { filePattern: RegExp },
): Rule {
  const wrapped = async function characterizationTest(
    action: Action,
    ctx?: RuleContext,
  ): Promise<RuleResult> {
    if (action.kind !== 'write' || !options.filePattern.test(action.path)) {
      return rule(action, ctx)
    }
    const before = await ctx?.readFile?.(action.path)
    const beforeText =
      before?.kind === 'present' ? before.content : ''
    const markerRemains = CHARACTERIZATION_MARKER.test(action.content)
    const removed = removedMarkerTests(beforeText, action.content)
    if (removed.length > 0) {
      if (removed.some((name) => name === null)) {
        return {
          kind: 'violation',
          reason:
            'A characterization marker is being removed but could not ' +
            'be tied to a test function — keep the marker in a comment ' +
            'directly above the test it declares, and remove them ' +
            'together with the proof in hand.',
        }
      }
      let history
      try {
        history = (await ctx?.history?.()) ?? []
      } catch (error) {
        return transcriptLimitViolation(error)
      }
      const outputs = history.flatMap((event) =>
        event.kind === 'command' && 'output' in event && typeof event.output === 'string'
          ? [fullCommandOutput(event.output)]
          : [],
      )
      const unproven = (removed as string[]).filter(
        (name) => !outputs.some((output) => output.includes(name) && /fail/i.test(output)),
      )
      if (unproven.length > 0) {
        return {
          kind: 'violation',
          reason:
            'Characterization marker removed without a recorded red: no ' +
            'test run in this session shows the marked test(s) failing ' +
            `(${unproven.join(', ')}). Prove the test bites first — ` +
            'mutation-probe the production path it specifies ' +
            '(// probity: mutation-probe), run the suite, watch this ' +
            'test fail on its concluding assertion, revert the probe — ' +
            'then remove the marker. Working in a Claude Code sub-agent? ' +
            'The PreToolUse hook must run `probity-claude`, not the bare ' +
            '`probity` bin: the bare bin reads the parent session\'s ' +
            'transcript and cannot see a sub-agent\'s test runs.',
        }
      }
      return { kind: 'pass', notes: [{ kind: 'characterization-resolved' }] }
    }
    if (markerRemains) {
      return { kind: 'pass', notes: [{ kind: 'characterization' }] }
    }
    const result = await rule(action, ctx)
    if (result.kind === 'violation' && RETROFIT_REASON.test(result.reason ?? '')) {
      return { ...result, reason: `${result.reason}\n\n${RESTART_HINT}` }
    }
    if (
      result.kind === 'violation' &&
      CHARACTERIZATION_CANDIDATE_REASON.test(result.reason ?? '')
    ) {
      return {
        ...result,
        reason: `${result.reason}\n\n${CHARACTERIZATION_HINT}`,
      }
    }
    return result
  }
  Object.defineProperty(wrapped, 'name', {
    value: `characterizationTest(${rule.name || 'rule'})`,
  })
  return wrapped
}

/**
 * The commit half of the characterization round-trip (see
 * {@link withCharacterizationTest}): blocks `git commit` while any
 * test file under `roots` still carries the characterization marker —
 * the marker only comes off through the proof-checked removal path,
 * so a characterization test that has never been observed failing
 * cannot land. Deterministic filesystem scan — no AI call.
 *
 * Applies to: command actions matching `git commit`.
 *
 * @param options.roots — absolute paths to scan.
 * @param options.filePattern — which files can carry the marker
 *   (default: `.kt`/`.kts`/`.java`).
 */
export function enforceCharacterizationResolution(options: {
  roots: string[]
  filePattern?: RegExp
}): Rule {
  const filePattern = options.filePattern ?? DEFAULT_PROBE_FILE_PATTERN
  return function enforceCharacterizationResolution(
    action: Action,
  ): RuleResult {
    if (action.kind !== 'command') return { kind: 'pass' }
    if (!isGitCommit(action.command)) return { kind: 'pass' }
    const outstanding = markedFiles(
      options.roots,
      action.command,
      filePattern,
      CHARACTERIZATION_MARKER,
    )
    if (outstanding.length === 0) return { kind: 'pass' }
    return {
      kind: 'violation',
      reason:
        'Characterization marker(s) still on disk — a first test for ' +
        'pre-existing behavior must be proven to bite before it lands: ' +
        'mutation-probe the production path, watch the marked test ' +
        'fail, revert the probe, then remove the marker (the removal ' +
        'is checked against the recorded red):\n' +
        outstanding.map((file) => `    ${file}`).join('\n'),
    }
  }
}

/**
 * Kotlin/Android addendum for `enforcePortsBoundary` — pass as
 * `enforcePortsBoundary({ instructions: (d) => d + KOTLIN_BOUNDARY_ADDENDUM })`
 * and extend the "Project layout" section with your module/package
 * conventions.
 */
export const KOTLIN_BOUNDARY_ADDENDUM = `

### Kotlin/Android specifics

  - Ambient OS access in core code is a violation: \`Instant.now()\`
    and friends, \`System.currentTimeMillis()\`, \`Date()\`,
    \`UUID.randomUUID()\`, \`Random()\`, \`System.getenv\` — clock,
    randomness, and environment are ports.
  - Vendor/infrastructure packages (AWS SDK, Amplify, Apollo,
    Firebase, OkHttp, Retrofit, Room, WorkManager, JDBC) belong in
    adapter modules only. In core code, their types in signatures are
    leaked boundaries.
  - Dagger/DI modules, \`@Component\` definitions, and \`…di\` packages
    are composition roots: they import both core and adapters by
    design — always allowed.
  - In tests, \`mockStatic\`/\`mockkStatic\`/\`mockkObject\`/
    \`mockkConstructor\`/PowerMock are always violations. A
    mockito-kotlin \`mock<T>()\` where T is a port interface is an
    acceptable seam (though a shared fake is preferred); \`mock<T>()\`
    of a concrete internal class is a violation — the substitute
    belongs at a port.
  - Robolectric in a test signals Android-framework coupling; that is
    an adapter concern, fine in adapter/UI tests, a smell in tests of
    core logic.
  - A port need not be an interface. A function-typed constructor
    parameter injected at the composition root (e.g.
    \`nowEpochMillis: () -> Long\`, \`randomIv: () -> ByteArray\`) is a
    valid seam — but a default value that calls the real OS
    (\`= { System.currentTimeMillis() }\`) inside core/common code
    defeats it; real defaults belong in platform adapters or DI
    wiring.
  - Kotlin Multiplatform: \`commonMain\` core code is the inside of
    the hexagon; \`expect\`/\`actual\` pairs and per-platform source
    sets (\`androidMain\`, \`iosMain\`, \`desktopMain\`) implementing a
    common declaration are adapters and may touch platform APIs.`

// ── Thin driving adapters (issue #76) ────────────────────────────────

const KOTLIN_DECLARATION =
  /^([ \t]*)((?:(?:public|protected|private|internal|open|final|abstract|sealed|data|enum|value|inline|suspend|override|operator|infix|tailrec|external|const|lateinit|annotation|expect|actual|inner)\s+)*)(fun|val|var|class|interface|object|typealias)\s+(?:<[^>\n]*>\s+)?(?:([\w.<>?, ]+?)\.)?([A-Za-z_]\w*)/gm
const HIDDEN_MODIFIER = /\b(?:private|internal|protected|override)\b/

/**
 * Names a Kotlin file exposes to other modules: non-private,
 * non-internal `fun`s at any depth (extension functions as
 * `Receiver.name`), and top-level types, objects, typealiases and
 * `val`/`var`s. Overrides are skipped (they name the supertype's
 * member, not a new one).
 */
export function kotlinExportedNames(content: string): string[] {
  const names = new Set<string>()
  for (const match of content.matchAll(KOTLIN_DECLARATION)) {
    const [, indent = '', modifiers = '', kind, receiver, name] = match
    if (!name || name === 'interface' || HIDDEN_MODIFIER.test(modifiers)) continue
    // Indented properties are members or locals (alike to a regex);
    // indented types are mostly sealed-outcome cases, noise beside the
    // functions a copy would duplicate.
    if (kind !== 'fun' && indent.length > 0) continue
    names.add(kind === 'fun' && receiver ? `${receiver.replace(/<.*>/, '')}.${name}` : name)
  }
  return [...names]
}

/** Kotlin exports, for `enforceThinDrivingAdapter`'s `coreExports`. */
export const KOTLIN_EXPORTS: ExportLanguage = {
  sourceFile: /\.kt$/,
  testFile: KOTLIN_TEST_SOURCE_PATTERN,
  exportedNames: kotlinExportedNames,
}

// Generated members that say nothing about the domain: constructors,
// data-class and enum boilerplate, synthetic default-argument bridges.
const API_DUMP_NOISE =
  /^(?:<init>|component\d+|copy|equals|hashCode|toString|values|valueOf|entries|getEntries|INSTANCE|Companion|\$VALUES)$|\$/

function simpleName(qualified: string): string {
  return qualified.replace(/<.*>/, '').split(/[/.]/).pop()!.replace(/\$/g, '.')
}

/**
 * Public API, one `Owner: name, name` line per class, from a
 * binary-compatibility-validator dump: a JVM `.api` file
 * (`public final class com/x/Permissions {` with `fun canApprove (…)Z`
 * members) or a Kotlin/Native `.klib.api` file (`final class
 * com.x/Permissions {`, top-level `final fun (com.x/Viewer).com.x/canApprove()`).
 * JVM getters become property names; setters and generated members
 * are dropped. Top-level declarations are grouped under `(top level)`
 * (`…Kt` facade classes in a JVM dump).
 */
export function readKotlinApiDump(content: string): string[] {
  const owners = new Map<string, Set<string>>()
  const add = (owner: string, name: string) => {
    if (API_DUMP_NOISE.test(name)) return
    if (!owners.has(owner)) owners.set(owner, new Set())
    owners.get(owner)!.add(name)
  }
  const klib = content.startsWith('// Klib ABI Dump')
  let owner = '(top level)'
  for (const raw of content.split('\n')) {
    const line = klib ? raw.replace(/ \/\/ .*$/, '') : raw
    if (/^\s*(?:\/\/|$)/.test(line)) continue
    const indented = /^\s/.test(line)
    const type = line.match(
      klib
        ? /^(?:[a-z]+ )*(?:class|interface|object)\s+(?:<.*?>\s+)?([\w.$/]+)/
        : /^(?:public|protected) (?:[a-z]+ )*(?:class|interface)\s+([\w$/]+)/,
    )
    if (type && !indented) {
      const name = simpleName(type[1]!)
      owner = /Kt$/.test(name) && !klib ? '(top level)' : name
      continue
    }
    if (/^}/.test(line)) {
      owner = '(top level)'
      continue
    }
    if (klib) {
      const entry = line.match(/^\s+enum entry (\w+)/)
      if (entry) {
        add(owner, entry[1]!)
        continue
      }
      const member = line.match(
        /^\s*(?:[a-z]+ )*(fun|val|var)\s+(?:<.*?>\s+)?(?:\(([^)]*)\)\.)?(?:[\w.]*\/)?([\w$<>-]+)/,
      )
      if (!member || member[3]!.startsWith('<')) continue
      const where = indented ? owner : '(top level)'
      add(where, member[2] ? `${simpleName(member[2])}.${member[3]}` : member[3]!)
      continue
    }
    const field = line.match(/^\s+public (?:[a-z]+ )*field (\w+) /)
    if (field) {
      add(owner, field[1]!)
      continue
    }
    const fun = line.match(/^\s+(?:public|protected) (?:[a-z]+ )*fun ([\w$<>]+) \(/)
    if (!fun) continue
    const name = fun[1]!
    if (/^set[A-Z]/.test(name)) continue
    add(owner, /^get[A-Z]/.test(name) ? name[3]!.toLowerCase() + name.slice(4) : name)
  }
  return [...owners].map(([name, members]) => `${name}: ${[...members].join(', ')}`)
}

/** binary-compatibility-validator dumps: `*.api`, including `*.klib.api`. */
export const KOTLIN_API_DUMP: ApiDumpFormat = {
  file: /\.api$/,
  read: readKotlinApiDump,
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Kotlin forms of a domain discriminant check, one pattern per field:
 * comparison to a string literal or to an enum entry / object
 * (`role == Role.SUPER_USER`, `Role.SUPER_USER != viewer.role`), a
 * `when (viewer.role)` subject, and an `is`/`!is` type check
 * (`status is Status.Draft`). For `forbidNewDomainDiscriminantChecks`'
 * `patternsFor`.
 */
export function kotlinDomainDiscriminantPatterns(
  discriminants: readonly string[],
): NamedPattern[] {
  return discriminants.map((name) => {
    const field = escapeRegExp(name)
    const subject = String.raw`[\w.?!]*\b${field}\b`
    const value = String.raw`(?:[A-Z]\w*\.)+[A-Za-z_]\w*`
    return {
      label: `${name} compared to a domain value`,
      pattern: new RegExp(
        [
          String.raw`\b${field}\s*[!=]==?\s*(?:"|${value})`,
          String.raw`(?:"[^"\n]*"|${value})\s*[!=]==?\s*${subject}`,
          String.raw`\bwhen\s*\(\s*${subject}\s*\)`,
          String.raw`\b${field}\s+!?is\s+[A-Z]`,
        ].join('|'),
        'g',
      ),
    }
  })
}

/**
 * Kotlin addendum for `enforceThinDrivingAdapter`: what thin means for
 * a CLI command and a Compose screen. Pass as
 * `instructions: (defaults) => defaults + KOTLIN_DRIVING_ADAPTER_ADDENDUM`.
 */
export const KOTLIN_DRIVING_ADAPTER_ADDENDUM = `

### Kotlin specifics: CLI commands and Compose screens

  - A CLI command (a Clikt \`CliktCommand\`, picocli, kotlinx-cli) is a
    driving adapter. Always allowed: declaring options and arguments,
    help text, finding the selected configuration or session, calling
    one use case, and mapping its outcome to output. Mapping is
    translation even with many branches: an exhaustive \`when\` over
    the use case's sealed outcome type that turns each case into an
    exit code, an error code, a message, a hint or JSON is one branch
    per outcome the core already decided. A precondition the command
    itself needs (no configuration selected → a usage error) is
    translation too.
  - Block a command that decides something its use case's outcome
    doesn't already say: branching on domain state or a role to choose
    what happens, retrying or falling back, or calling several use
    cases where one's result decides whether or how the next runs.
    Reading one more value only to display it beside the result (e.g.
    whether the account is signed in after registering) is not
    coordination.
  - Composables: \`remember { mutableStateOf(…) }\`, \`rememberSaveable\`,
    \`collectAsState()\`/\`collectAsStateWithLifecycle()\`, a
    \`LaunchedEffect\` that forwards one intent, navigation callbacks,
    modifiers, theming and \`@Preview\` functions are view state or
    wiring — always allowed. Sending one intent to a ViewModel, or
    calling one use case per user action, is the intended pattern.
  - Composition roots — Koin modules, a \`Composition\` that builds the
    client, DI wiring — are always allowed.`
