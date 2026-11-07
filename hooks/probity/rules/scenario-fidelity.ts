import { readdirSync, readFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'

import type { Action, Rule, RuleContext, RuleResult } from '@nizos/probity'

import {
  COMMENT_OR_ANNOTATION_LINE,
  DEFAULT_TEST_FILE_PATTERN,
  OWNER_DECLARATION,
  extractCoversRefs,
  extractScenarios,
  findSpecFiles,
  findTestFiles,
  type CoversRef,
} from './spec-test-parity.js'

/**
 * Scenario fidelity (issue #120): a `Covers:`-tagged test must say what
 * the scenario it claims says. The parity rules prove the link exists
 * and the Language Test judges each side's wording; this judges the two
 * sides against each other, so a test can't claim a scenario while
 * setting up a different precondition or asserting a different outcome.
 */

const COVERS_ANY = /Covers:\s*(?:@id:[\w.-]+|[\w.-]+\.feature(?:\.md)?\s*::)/g
const MD_HEADING = /^#{1,6}\s/
const GHERKIN_BOUNDARY = /^\s*(?:@\S|(?:Scenario(?: Outline)?|Example|Rule|Background|Feature):)/
const SHARED_BODY_FILE = /Scenarios?\.\w+$/
const DEFAULT_MAX_SHARED_CHARS = 6000

/** One test that claims scenarios: its Covers refs and its source. */
type Claim = { refs: CoversRef[]; text: string }

/** A scenario's heading and steps, keyed for Covers resolution. */
type ScenarioText = { key: string; id?: string; title: string; text: string; scopes: string[]; wip: boolean }

const isSpecFile = (path: string): boolean => /\.feature(?:\.md)?$/.test(path)

/** Lines trimmed and blank lines dropped, so indentation and spacing
 *  edits don't count as changes. */
function normalize(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .join('\n')
}

/**
 * The tests in `content` that carry Covers tags. A tag belongs to the
 * next test declaration when only comments and annotations come
 * between, otherwise to the declaration it sits inside. A test runs to
 * the comments and annotations that lead into the next declaration, so
 * it never includes its neighbour's tag.
 */
export function claimedTests(testFile: string, content: string): Claim[] {
  const starts = [...content.matchAll(OWNER_DECLARATION)].map((match) => match.index ?? 0)
  const spans = new Map<number, { from: number; end: number }>()
  for (const tag of content.matchAll(COVERS_ANY)) {
    const at = tag.index ?? 0
    const lineEnd = content.indexOf('\n', at)
    const afterTag = lineEnd === -1 ? content.length : lineEnd + 1
    const next = starts.find((start) => start >= afterTag)
    const above =
      next !== undefined &&
      content.slice(afterTag, next).split('\n').slice(0, -1).every((line) => COMMENT_OR_ANNOTATION_LINE.test(line))
    const owner = above ? next! : ([...starts].reverse().find((start) => start < at) ?? at)
    const lineStart = content.lastIndexOf('\n', Math.min(at, owner)) + 1
    const span = spans.get(owner)
    if (span) {
      span.from = Math.min(span.from, lineStart)
      continue
    }
    const following = starts.find((start) => start > owner)
    const limit = following === undefined ? content.length : leadIn(content, following)
    spans.set(owner, { from: lineStart, end: Math.min(limit, testEnd(content, owner)) })
  }
  return [...spans.values()].map(({ from, end }) => {
    const text = content.slice(from, end).replace(/\s+$/, '') + '\n'
    return { refs: extractCoversRefs(testFile, text), text }
  })
}

/**
 * The end of the test declared at `owner`: past its annotations, the
 * line where its braces close again. A test that opens no braces (a
 * Kotlin expression body, a JS arrow without braces) runs while its
 * lines end mid-expression (`=`, `(`, `,`, `=>`) or the next line is
 * indented deeper than the declaration. Braces in strings are not
 * special-cased; they balance in practice.
 */
function testEnd(content: string, owner: number): number {
  let depth = 0
  let opened = false
  let lineStart = content.lastIndexOf('\n', owner - 1) + 1
  let declarationIndent: number | undefined
  for (let i = owner; i < content.length; i++) {
    const char = content[i]
    if (char === '{') {
      depth++
      opened = true
    } else if (char === '}') {
      depth--
      if (opened && depth <= 0) {
        const lineEnd = content.indexOf('\n', i)
        return lineEnd === -1 ? content.length : lineEnd + 1
      }
    } else if (char === '\n') {
      const line = content.slice(lineStart, i)
      lineStart = i + 1
      if (opened || COMMENT_OR_ANNOTATION_LINE.test(line)) continue
      declarationIndent ??= indentOf(line)
      if (/(?:[=(,]|=>)\s*$/.test(line)) continue
      const next = content.slice(i + 1).split('\n').find((candidate) => candidate.trim() !== '')
      if (next === undefined || indentOf(next) <= declarationIndent) return i + 1
    }
  }
  return content.length
}

function indentOf(line: string): number {
  return line.length - line.trimStart().length
}

/** Where the comment/annotation lines leading into a declaration begin. */
function leadIn(content: string, declaration: number): number {
  let cut = content.lastIndexOf('\n', declaration - 1) + 1
  while (cut > 0) {
    const previous = content.lastIndexOf('\n', cut - 2) + 1
    const line = content.slice(previous, cut - 1)
    if (!COMMENT_OR_ANNOTATION_LINE.test(line)) break
    cut = previous
  }
  return cut
}

/** Each scenario's heading and steps, up to the next scenario or heading. */
export function scenarioTexts(specFile: string, content: string): ScenarioText[] {
  const lines = content.split(/\r?\n/)
  const boundary = specFile.endsWith('.md') ? MD_HEADING : GHERKIN_BOUNDARY
  return extractScenarios(specFile, content).map((scenario) => {
    let end = scenario.line + 1
    while (end < lines.length && !boundary.test(lines[end]!)) end++
    return {
      key: scenario.key,
      id: scenario.id,
      title: scenario.title,
      text: lines.slice(scenario.line, end).join('\n').trim(),
      scopes: scenario.scopes,
      wip: scenario.wip,
    }
  })
}

function readSpecs(specsDir: string): ScenarioText[] {
  return findSpecFiles(specsDir).flatMap((file) => scenarioTexts(file, readFileSync(file, 'utf8')))
}

function resolver(scenarios: ScenarioText[]): (ref: CoversRef) => ScenarioText | undefined {
  const byKey = new Map(scenarios.map((scenario) => [scenario.key, scenario]))
  const byId = new Map(scenarios.filter((scenario) => scenario.id).map((scenario) => [scenario.id!, scenario]))
  return (ref) => (ref.id ? byId.get(ref.id) : byKey.get(ref.key))
}

/** The test's body without its tag, annotations or declaration line,
 *  and without closing brackets: what two drivers' tests share when
 *  they run the same scenario body. */
function bodyOf(text: string): string {
  const lines = normalize(text)
    .split('\n')
    .filter((line) => !COMMENT_OR_ANNOTATION_LINE.test(line))
  return lines
    .slice(1)
    .filter((line) => !/^[\s})\];]*$/.test(line))
    .join('\n')
}

/** Shared scenario bodies the test calls into: sibling `*Scenarios.*`
 *  files that declare a function the test calls. */
function sharedBodies(testFile: string, text: string): string[] {
  const calls = new Set([...text.matchAll(/([A-Za-z_$][\w$]*)\s*\(/g)].map((match) => match[1]!))
  const dir = dirname(testFile)
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return []
  }
  const found: string[] = []
  for (const entry of entries) {
    const path = join(dir, entry)
    if (path === testFile || !SHARED_BODY_FILE.test(entry)) continue
    let content: string
    try {
      content = readFileSync(path, 'utf8')
    } catch {
      continue
    }
    const declares = [...content.matchAll(/\b(?:fun|func|function|def)\s+`?([A-Za-z_$][\w$]*)|\b(?:const|let|val)\s+([A-Za-z_$][\w$]*)\s*=/g)].some(
      (match) => calls.has(match[1] ?? match[2] ?? ''),
    )
    if (declares) {
      const trimmed =
        content.length > DEFAULT_MAX_SHARED_CHARS ? content.slice(0, DEFAULT_MAX_SHARED_CHARS) + '\n… (truncated)' : content
      found.push(`### ${basename(path)}\n\n${trimmed}`)
    }
  }
  return found
}

const FIDELITY_RULES = `## Role

You are an acceptance-test fidelity validator. Each pair below is a
scenario from an executable specification and the test that claims to
cover it (with a \`Covers:\` tag). Judge whether the test says what the
scenario says.

## Read the test through its DSL

Tests are written in a domain-specific language: read each DSL call by
its name, as the step it states (\`shopper.hasABasket()\` establishes
"a shopper with a basket"). Don't ask what the DSL does underneath, and
don't judge wording or style: another rule does that. When a test
delegates to a shared scenario body, that body is shown under "Shared
scenario bodies"; judge the body. If the body isn't shown, judge only
what the test itself states.

## Violations

- **Different precondition:** a Given the scenario states is not
  established by the test, or the test establishes a different one
  (another state, another actor, another value that changes the rule).
- **Different action:** the test performs a different When, or none.
- **Different outcome:** a Then the scenario states is not asserted, or
  the test asserts a different one.
- **Unstated outcome:** the test asserts an outcome the scenario does
  not state. A check that only confirms the scenario's own outcome
  (proving the actor arrived where the scenario says, by observing it)
  is fine; a further behaviour is not.

Concrete example values in the test (names, amounts) are fine when they
satisfy the scenario's wording. Extra setup the scenario implies (an
account to act as) is fine. An expected-to-fail marker doesn't change
the judgement: an in-progress test must still say what its scenario
says.

Name each test and the step that differs in your reason, quoting the
scenario line.`

const RESPONSE_SPEC = `## Response format

Respond with a single JSON object of exactly this shape:
{"reason":"<your analysis>","kind":"pass"|"violation"}
Write reason FIRST and set kind to the conclusion your reason reached —
the two must agree. Keep reason brief on a clear pass ("" is fine).
Return JSON only. No prose, no code fences.`

const TIER_RULES = (scope: string) => `## Tier

Each scenario also has a tier, shown as "Tier:" in its pair. An app-tier
scenario is tagged [${scope}] and claimed by a test that builds the app
through its shipping composition root; an untagged scenario runs at the
component tier. A scenario belongs at the app tier when a bug the
component tier cannot see could change its outcome:

1. the wire decides the outcome (an external system must accept or
   decode what we send, or we decode what it returns: signed or sealed
   requests, encrypted or compressed payloads, a multi-call sequence
   whose order matters);
2. wiring decides it (which adapter, environment, endpoint or store the
   composition root picks);
3. a platform service decides it (a real key store, crypto or codec
   round trip, not a fake's echo).

Report a violation only when an untagged scenario's own text shows one
of these deciding its outcome: name the rule and say to tag the scenario
[${scope}] and claim it with an app-tier test. Never report a tagged
scenario as over-tiered: a feature's walking skeleton and scenarios
added after an escaped defect belong at the app tier for reasons the
text can't show. When unsure, pass.`

type Pair = { scenario: ScenarioText; claim: Claim; testFile: string }

function buildPrompt(rules: string, pairs: Pair[], appScope?: string): string {
  const sections = [rules]
  if (appScope) sections.push(TIER_RULES(appScope))
  pairs.forEach(({ scenario, claim, testFile }, index) => {
    const shared = sharedBodies(testFile, claim.text)
    const tier = !appScope
      ? ''
      : scenario.scopes.includes(appScope)
        ? `\n\nTier: app (tagged [${appScope}])`
        : '\n\nTier: component (untagged)'
    sections.push(
      `## Pair ${index + 1}\n\n### Scenario\n\n${scenario.text}${tier}\n\n### Test (${basename(testFile)})\n\n${claim.text}` +
        (shared.length > 0 ? `\n### Shared scenario bodies\n\n${shared.join('\n\n')}` : ''),
    )
  })
  sections.push(RESPONSE_SPEC)
  return sections.join('\n\n')
}

/**
 * AI-validated check that every changed `Covers:`-tagged test says what
 * its scenario says: the same preconditions, action and outcome, and no
 * outcome the scenario doesn't state (issue #120).
 *
 * Applies to writes of acceptance test files and of spec files. Scope
 * it with a `{ files, rules }` block to both. A test write is judged
 * only for the claimed tests it adds or changes; a spec write only for
 * the scenarios it changes that tests already claim. Nothing else costs
 * a model call:
 * - a scenario marked wip (`@wip`, `@planned`, `(wip)`) is not held to
 *   its claims, so a step both sides gain can land spec-first; its
 *   claims are judged when the marker comes off (issue #155);
 * - a write with no changed claim passes;
 * - a claim that resolves to no scenario is left to the parity rules;
 * - a test whose body is the same as another test's that claims the
 *   same scenario (a second driver running a shared body) passes.
 *
 * @param options.specsDir — where the scenarios live.
 * @param options.testRoots — where to look for other claiming tests
 *   (default: the current directory).
 * @param options.testFilePattern — which files are acceptance tests
 *   (default: any file under an `acceptance/` directory).
 * @param options.appScope — the driver scope that runs the app tier
 *   (issue #129). When set, the same judge call also checks each changed
 *   claim's tier against the acceptance-testing skill's tier rules, and
 *   reports an untagged scenario whose text shows the wire, wiring or a
 *   platform service decides its outcome. Tagged scenarios are never
 *   reported as over-tiered.
 * @param options.instructions — replaces or extends the default rules
 *   text: a string replaces it, `(defaults) => ...` extends it.
 */
export function enforceScenarioFidelity(options: {
  specsDir: string
  testRoots?: string[]
  testFilePattern?: RegExp
  appScope?: string
  instructions?: string | ((defaults: string) => string)
}): Rule {
  const rules =
    typeof options.instructions === 'function'
      ? options.instructions(FIDELITY_RULES)
      : (options.instructions ?? FIDELITY_RULES)
  const testFilePattern = options.testFilePattern ?? DEFAULT_TEST_FILE_PATTERN
  const testRoots = options.testRoots ?? [process.cwd()]

  /** Claims elsewhere in the suite, by the scenario they resolve to. */
  function otherClaims(
    exclude: string,
    resolve: (ref: CoversRef) => ScenarioText | undefined,
  ): Array<{ testFile: string; claim: Claim; scenarios: ScenarioText[] }> {
    return findTestFiles(testRoots, testFilePattern)
      .filter((file) => file !== exclude)
      .flatMap((testFile) => {
        let content: string
        try {
          content = readFileSync(testFile, 'utf8')
        } catch {
          return []
        }
        return claimedTests(testFile, content).map((claim) => ({
          testFile,
          claim,
          scenarios: claim.refs.map(resolve).filter((scenario): scenario is ScenarioText => !!scenario),
        }))
      })
  }

  function testSidePairs(action: { path: string; content: string }, before: string): Pair[] {
    const after = claimedTests(action.path, action.content)
    if (after.length === 0) return []
    const unchanged = new Set(claimedTests(action.path, before).map((claim) => normalize(claim.text)))
    const changed = after.filter((claim) => !unchanged.has(normalize(claim.text)))
    if (changed.length === 0) return []
    const resolve = resolver(readSpecs(options.specsDir))
    const candidates = changed.flatMap((claim) =>
      claim.refs
        .map(resolve)
        .filter((scenario): scenario is ScenarioText => !!scenario)
        .map((scenario) => ({ scenario, claim, testFile: action.path })),
    )
    if (candidates.length === 0) return []
    const others = otherClaims(action.path, resolve)
    return candidates.filter(
      ({ scenario, claim }) =>
        !others.some(
          (other) =>
            other.scenarios.some((s) => s.key === scenario.key) && bodyOf(other.claim.text) === bodyOf(claim.text),
        ),
    )
  }

  function specSidePairs(action: { path: string; content: string }, before: string): Pair[] {
    const previous = new Map(scenarioTexts(action.path, before).map((scenario) => [scenario.key, scenario]))
    const changed = scenarioTexts(action.path, action.content).filter((scenario) => {
      const was = previous.get(scenario.key)
      return was?.text !== scenario.text || (was.wip && !scenario.wip)
    })
    if (changed.length === 0) return []
    // A wip scenario isn't held to its claims, so a step both sides gain
    // can land spec-first; its claims are judged when the marker comes
    // off, the Gherkin tag line included (issue #155).
    const judged = changed.filter((scenario) => !scenario.wip)
    const judgedKeys = new Set(judged.map((scenario) => scenario.key))
    // Resolve against the specs as they will be after this write: the
    // changed scenarios come last, so they replace the copies on disk.
    const resolve = resolver([...readSpecs(options.specsDir), ...changed])
    return otherClaims(action.path, resolve).flatMap(({ testFile, claim, scenarios: claimed }) =>
      claimed
        .filter((scenario) => judgedKeys.has(scenario.key))
        .map((scenario) => ({ scenario: changed.find((s) => s.key === scenario.key)!, claim, testFile })),
    )
  }

  return async function enforceScenarioFidelity(action: Action, ctx?: RuleContext): Promise<RuleResult> {
    if (action.kind !== 'write') return { kind: 'pass' }
    const previous = await ctx?.readFile?.(action.path)
    const before = previous?.kind === 'present' ? previous.content : ''
    const pairs = isSpecFile(action.path) ? specSidePairs(action, before) : testSidePairs(action, before)
    if (pairs.length === 0) return { kind: 'pass' }
    if (!ctx?.agent) {
      return {
        kind: 'violation',
        reason:
          'enforceScenarioFidelity: no AI agent available; configure Config.ai or use a vendor that ships one.',
      }
    }
    const verdict = await ctx.agent.reason(buildPrompt(rules, pairs, options.appScope?.toLowerCase()))
    if (verdict.kind === 'violation') return { kind: 'violation', reason: verdict.reason }
    return { kind: 'pass', reason: verdict.reason }
  }
}
