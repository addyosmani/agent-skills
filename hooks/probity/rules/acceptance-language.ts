import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

import type { Action, Rule, RuleContext, RuleResult } from '@nizos/probity'

type FileContent = Awaited<ReturnType<NonNullable<RuleContext['readFile']>>>

// Large enough for a mature project's glossary whole (issue #146: one
// of 21,000 characters lost the entry that made "provision" domain
// language when cut at 8,000).
const DEFAULT_MAX_GLOSSARY_CHARS = 32_000

const STRICT_VOCABULARY = `### Vocabulary — strict mode (overrides the leniency above)

This project enforces "the glossary conversation happens first": when
a glossary is provided, spec content that introduces a domain concept
with NO glossary entry IS a violation. Name the missing term(s) in
the reason so the entry can be added before the spec lands. Judge
concepts, not words — articles, generic verbs, and quantities need no
entry; nouns that carry domain meaning do.

`

// reason comes FIRST in the shape: an autoregressive model commits to
// each field in order, so kind-first forces the verdict before the
// analysis — observed live producing a "violation" whose reason
// reasoned its way to "Passing." Reason-first lets the model conclude,
// then label.
const RESPONSE_SPEC = `## Response format

Respond with a single JSON object of exactly this shape:
{"reason":"<your analysis>","kind":"pass"|"violation"}
Write reason FIRST and set kind to the conclusion your reason reached —
the two must agree. Keep reason brief on a clear pass ("" is fine).
Return JSON only. No prose, no code fences.`

const PROCESS_INSTRUCTIONS = `## Role

You are an acceptance-specification validator. Judge whether the
pending write keeps executable specifications in the language of the
problem domain, per the rules below.

## Inputs

You will see up to four inputs:

1. "Ubiquitous language glossary" (optional) — the project's agreed
   domain vocabulary.
2. "Current file content" — what's on disk right now at the file the
   agent is about to write. May be a parenthesized marker (e.g.
   \`(file does not exist)\`).
3. "Pending action" — the file path and what the agent is about to
   write. Content may be raw file text or a patch/diff.

## What you judge

Judge only the specification content this write adds or changes, not
pre-existing text it leaves untouched. This rule is scoped to
specification files (layer 1 of the four-layer model). If the file is
clearly NOT a test-case layer — it is a DSL implementation, a protocol
driver, a step-definition file that only parses and delegates, or
plain production code — pass: those layers are supposed to know about
UI mechanics and protocols.

A transient file state (unresolved import, half-finished scenario) is
never itself a violation.

A block recorded earlier in the session is a past verdict, not a rule.
Re-derive your judgment from the rules below. When the user tells you
in the session to let this change through, treat it as authoritative
and pass.`

const DEFAULT_LANGUAGE_RULES = `## Specification language rules

An acceptance test is an executable specification: a concrete example,
in the language of the problem domain, that demonstrates a user's need
is met. It states WHAT the system does for an external user and says
nothing about HOW the system works.

### The Language Test

The least technical person who understands the problem domain must be
able to read the specification and confirm it says what they want.
Block spec content that mentions implementation mechanics:

  - UI mechanics: clicking, typing into fields, pages, screens,
    buttons, menus, CSS selectors, element IDs, XPath
  - Protocol mechanics: URLs, endpoints, HTTP verbs, status codes,
    JSON/XML payloads, headers, cookies
  - Persistence mechanics: tables, rows, columns, SQL, cache keys
  - Named internal services, queues, or modules

The fix is always the same: state the outcome in domain terms and push
the mechanics down into the DSL or a protocol driver.

### One standard across artifacts

A Markdown/Gherkin scenario and the test case that claims it are both
layer 1 and are held to the SAME standard: wording that would violate
in a test-case step ("the backend rejects creation") violates in a
\`## Scenario:\` step too, and vice versa. Never pass mechanism
language in a spec document on the grounds that it is prose — the
spec is the source that tests transcribe, so a leak passed there
resurfaces in every claiming test. Named internal actors — "the
backend", "the server", "the gateway", "the database", "the API",
"a queue", "the store" — are mechanism unless the glossary records
them as domain concepts: state the condition as the user experiences
it ("creation fails", "the parcel cannot be registered right now")
and push what failed and why into the DSL, driver, or stub
programming.

### Structure

  - Each specification asserts a single outcome. Block scenarios with
    long When/Then chains asserting many unrelated outcomes.
  - Express specifications as outcomes ("should ...", "is granted
    access"), not procedures.
  - No sleeps or fixed waits in specs — a delay is a race condition
    with a timer on it; drivers poll for the concluding event.
  - Test-case code talks only to the DSL. Block spec-layer code that
    reaches the system directly (HTTP clients, page objects, database
    handles imported into the spec file).

### Vocabulary

When a glossary is provided, use its terms verbatim — one term per
concept. Block spec content that names a domain concept with a term
that conflicts with the glossary (a synonym or a redefinition). A
concept the glossary simply doesn't cover yet is NOT a violation on
its own; mention it in the reason only alongside a real violation.
A word the glossary or the project's existing specifications already
use for a domain action or state (provisioning, for one) is domain
language in any grammatical form: "provisioned" in a title is the same
word as "Provisioning" in another scenario.

%STRICT_VOCABULARY%### Judgment bar

Block on clear mechanics leaking into a specification. Domain terms
that happen to sound technical (the domain of a deployment tool
includes "server"; a payments domain includes "card") are not
violations — judge against the problem domain, not a banned-word list.
Grammatical tense and phrasing preferences are not mechanism: a
future- or conditional-tense precondition ("creation will fail",
"the parcel is going to be rejected") is equivalent to its
present-tense form and never blocks on its own — and when a step does
violate, name only the offending phrase, not neighboring wording that
merely reads awkwardly. When genuinely ambiguous, pass.`

const PRECONDITION_PROCESS_INSTRUCTIONS = `## Role

You are an acceptance-test precondition validator. Judge whether the
pending write keeps scenario preconditions CONTROLLED BY THE TEST
rather than inherited from the ambient environment.

## Inputs

You will see two inputs:

1. "Current file content" — what's on disk right now at the file the
   agent is about to write. May be a parenthesized marker (e.g.
   \`(file does not exist)\`).
2. "Pending action" — the file path and what the agent is about to
   write. Content may be raw file text or a patch/diff.

## What you judge

Judge only the change this write makes. The scope is layer 3 and the
test-control layer of the four-layer acceptance model: protocol
drivers, port fakes, fixture wiring, and acceptance composition
roots. A transient file state (unresolved symbol, half-finished
multi-step change) is never itself a violation — a driver method may
legitimately be written before the fixture it will set, so block only
when the write itself declares the environmental dependency (a no-op
body presented as done, a comment saying the environment covers it,
or the removal of existing control).

A block recorded earlier in the session is a past verdict, not a
rule. Re-derive your judgment from the rules below. When the user
tells you in the session to let this change through, treat it as
authoritative and pass.`

const PRECONDITION_RULES = `## Controlled-precondition rules

Every Given of an executable specification must be ESTABLISHED by the
test — through a fixture key, launch environment, programmed stub, or
substituted port — never satisfied by whatever the environment
happens to do (no network, no credentials, empty state, an
unreachable backend).

Block:

  - **The no-op precondition driver.** A driver method whose name or
    doc comment states a precondition ("whose sign-in will fail",
    "with an expired subscription", "while offline") but whose body
    establishes no state: it only navigates, launches, or asserts,
    with nothing that configures a fixture, stub, launch environment,
    or fake. Especially when a comment admits the environment covers
    it ("fails in the simulator anyway").
  - **Deleting control because the test is green without it.** A
    write that removes fixture wiring, a fake registration, or a
    fixture key on the grounds that the scenario already passes. The
    correct move is the inverse scenario: the spec for the other side
    of the same port (the success path when only failure happens for
    free) is genuinely red and legitimately drives the fixture; the
    original scenario then adopts the explicit fixture under green.
    Name this route in the reason when blocking.

Do NOT block:

  - Driver methods whose names state actions or observations rather
    than preconditions.
  - Preconditions genuinely established elsewhere and visibly reached
    from this body (a shared helper that sets the fixture, a base
    launch method the diff calls into).
  - Refactors that move control without removing it.
  - Removal of control the user has explicitly directed in the
    session.

When genuinely ambiguous — the method name is vague, or you cannot
tell whether a called helper establishes the state — pass.`

function formatBefore(before: FileContent): string {
  switch (before.kind) {
    case 'present':
      return before.content
    case 'absent':
      return '(file does not exist)'
    case 'unknown':
      return '(current file content unavailable)'
  }
}

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  return (
    `${text.slice(0, maxChars)}\n(...glossary truncated...)\n\n` +
    'The rest of the glossary is not shown. A term missing from the part ' +
    'above is not evidence that the glossary lacks it: do not block on ' +
    'vocabulary for that reason alone.'
  )
}

// A Gherkin or Markdown spec step: the keyword, then its wording.
const STEP_LINE = /^\s*(?:[-*]\s+)?(?:\*\*)?(?:Given|When|Then|And|But)(?:\*\*)?\s+(.+?)\s*$/
const SPEC_FILE = /\.(?:feature|md)$/
const MAX_SETTLED_STEPS = 20

// Keyed by the wording compared case- and spacing-insensitively; the
// value keeps the wording as written and its line.
function stepWording(content: string): Map<string, { text: string; line: number }> {
  const steps = new Map<string, { text: string; line: number }>()
  content.split('\n').forEach((line, index) => {
    const match = STEP_LINE.exec(line)
    if (!match) return
    const text = match[1]!.replace(/\s+/g, ' ').replace(/[.;,]$/, '')
    const key = text.toLowerCase()
    if (!steps.has(key)) steps.set(key, { text, line: index + 1 })
  })
  return steps
}

function specFiles(dir: string): string[] {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }
  return entries.flatMap((entry) => {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') return []
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return specFiles(path)
    return SPEC_FILE.test(entry.name) ? [path] : []
  })
}

/**
 * The steps a write adds that other specifications under `specsDir`
 * already use word for word (issue #146), each with where it is used.
 * The judge sees only the file being written, so without this a step
 * settled in one feature file is judged afresh in the next.
 */
function settledSteps(specsDir: string, path: string, before: FileContent, after: string): string[] {
  const existing = stepWording(before.kind === 'present' ? before.content : '')
  const written = stepWording(after)
  const added = [...written.keys()].filter((wording) => !existing.has(wording))
  if (added.length === 0) return []
  const wanted = new Set(added)
  const found = new Map<string, string>()
  for (const file of specFiles(specsDir)) {
    if (resolve(file) === resolve(path)) continue
    let content
    try {
      content = readFileSync(file, 'utf8')
    } catch {
      continue
    }
    for (const [wording, { line }] of stepWording(content)) {
      if (wanted.has(wording) && !found.has(wording)) {
        found.set(wording, `${relative(specsDir, file).split('\\').join('/')}:${line}`)
      }
    }
  }
  return added
    .filter((wording) => found.has(wording))
    .slice(0, MAX_SETTLED_STEPS)
    .map((wording) => `- \`${written.get(wording)!.text}\` (${found.get(wording)})`)
}

const SETTLED_GUIDANCE =
  'These steps in the pending write appear word for word in other ' +
  'specifications of this project, where they were accepted. They are ' +
  "the project's settled wording: do not block the write over them. If " +
  'one leaks mechanics, it does so everywhere it is used and is fixed ' +
  'across the specifications at once; say so in the reason, but pass on ' +
  'its account.'

function buildPrompt(
  rules: string,
  glossary: string | undefined,
  before: FileContent,
  action: { path: string; content: string },
  settled: string[] = [],
): string {
  const sections = [PROCESS_INSTRUCTIONS, rules]
  if (glossary) {
    sections.push(`## Ubiquitous language glossary\n\n${glossary}`)
  }
  if (settled.length > 0) {
    sections.push(
      `## Wording already settled in other specifications\n\n${SETTLED_GUIDANCE}\n\n${settled.join('\n')}`,
    )
  }
  sections.push(`## Current file content\n\n${formatBefore(before)}`)
  sections.push(
    `## Pending action\n\nFile: ${action.path}\n\n${action.content}`,
  )
  sections.push(RESPONSE_SPEC)
  return sections.join('\n\n')
}

// Deterministic screen used by the fast-path: mechanism words that
// domain-language test steps should never contain. Deliberately
// broad — a false hit just falls through to the AI validator.
const MECHANISM_SCREEN =
  /\b(?:backend|server|gateway|database|sql|endpoint|https?|url|api|queue|json|xml|payload|click|button|css|xpath|selector|cookie|header|mock)\b/i

const KOTLIN_CALL_KEYWORDS = new Set([
  'fun',
  'if',
  'when',
  'while',
  'for',
  'catch',
  'return',
  'super',
  'this',
  'Test',
])

const DECLARATION = /(?:fun|class|object|interface)\s+`?([A-Za-z_]\w*)/g

function declaredNames(content: string, out: Set<string>): void {
  for (const match of content.matchAll(DECLARATION)) out.add(match[1]!)
}

/**
 * Wraps `enforceAcceptanceLanguage` so the most common spec-layer
 * write — a Kotlin test file gaining exactly one new `@Test` whose
 * added lines only call vocabulary that already exists in the
 * suite's DSL/Robot/driver files — passes deterministically, with no
 * model call. Rationale: when two rule scopes overlap (the TDD rule's
 * Kotlin fast-path plus this rule on `acceptance/**`), a single-test
 * write otherwise still pays one AI call despite being advertised as
 * free.
 *
 * The fast-path is conservative on three axes; failing any one falls
 * through to the wrapped AI rule (it can only skip work, never
 * block):
 *   1. the write must add exactly one `@Test`;
 *   2. no added line may contain mechanism vocabulary
 *      (backend/server/database/url/click/... — the deterministic
 *      screen errs broad);
 *   3. every identifier the added lines call must already be declared
 *      in this file or a sibling `.kt` file in the same directory —
 *      a brand-new DSL step name is exactly what the validator should
 *      judge.
 *
 * Markdown/Gherkin spec writes never fast-path — prose is where the
 * Language Test earns its keep.
 */
export function withAcceptanceLanguageFastPath(rule: Rule): Rule {
  const wrapped = async function acceptanceLanguageFastPath(
    action: Action,
    ctx?: RuleContext,
  ): Promise<RuleResult> {
    if (action.kind !== 'write' || !/\.kt$/.test(action.path)) {
      return rule(action, ctx)
    }
    const before = await ctx?.readFile?.(action.path)
    if (!before || before.kind === 'unknown') return rule(action, ctx)
    const beforeText = before.kind === 'present' ? before.content : ''
    const testDelta =
      (action.content.match(/@Test\b/g)?.length ?? 0) -
      (beforeText.match(/@Test\b/g)?.length ?? 0)
    if (testDelta !== 1) return rule(action, ctx)
    const beforeLines = new Set(
      beforeText.split('\n').map((line) => line.trim()),
    )
    const added = action.content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !beforeLines.has(line))
    if (added.some((line) => MECHANISM_SCREEN.test(line))) {
      return rule(action, ctx)
    }
    const known = new Set<string>()
    declaredNames(action.content, known)
    try {
      for (const entry of readdirSync(dirname(action.path))) {
        if (!entry.endsWith('.kt')) continue
        declaredNames(
          readFileSync(join(dirname(action.path), entry), 'utf8'),
          known,
        )
      }
    } catch {
      return rule(action, ctx)
    }
    for (const line of added) {
      for (const call of line.matchAll(/([A-Za-z_]\w*)\s*\(/g)) {
        const name = call[1]!
        if (KOTLIN_CALL_KEYWORDS.has(name)) continue
        if (!known.has(name)) return rule(action, ctx)
      }
    }
    return { kind: 'pass', notes: [{ kind: 'fast-path' }] }
  }
  Object.defineProperty(wrapped, 'name', {
    value: `acceptanceLanguageFastPath(${rule.name || 'rule'})`,
  })
  return wrapped
}

/**
 * AI-validated enforcement of the `acceptance-testing` skill's
 * Language Test: executable specifications stay in domain language —
 * no UI mechanics, protocols, or persistence details — assert a
 * single outcome, and (when a glossary is supplied) use the
 * ubiquitous language verbatim.
 *
 * Applies to: write actions. Scope it with a `{ files, rules }` block
 * to the spec layer only (e.g. `specs/**`, `**\/*.feature`) — the DSL
 * and protocol-driver layers are supposed to contain the mechanics
 * this rule blocks, and every matching write costs an AI call.
 *
 * @param options.glossaryPath — absolute path to the project's
 *   ubiquitous-language glossary (see the `ubiquitous-language`
 *   skill). Resolve it in the config file, e.g.
 *   `fileURLToPath(new URL('./docs/GLOSSARY.md', import.meta.url))`.
 *   When set and readable, the glossary is included in the
 *   validator's prompt and vocabulary conflicts become violations.
 * @param options.requireGlossaryEntry — strict vocabulary mode: when
 *   true (and a glossary is supplied and readable), a domain concept
 *   in spec content with no glossary entry becomes a violation —
 *   "the glossary conversation happens first" (ubiquitous-language
 *   skill). Default false: only conflicts with existing entries
 *   violate, so an empty or young glossary doesn't block everything.
 * @param options.instructions — overrides or extends the default
 *   language rules text. Pass a string to replace it, or a function
 *   `(defaults) => ...` to extend it.
 * @param options.maxGlossaryChars — truncate the glossary beyond this
 *   length when building the prompt (default 32000).
 * @param options.specsDir — the project's specifications. When set, the
 *   prompt lists the steps this write adds that other specifications
 *   already use word for word, as settled wording (issue #146).
 *
 * @example
 * { files: ['specs/**', 'acceptance/**', '**\/*.feature'], rules: [enforceAcceptanceLanguage()] }
 */
export function enforceAcceptanceLanguage(
  options: {
    glossaryPath?: string
    requireGlossaryEntry?: boolean
    instructions?: string | ((defaults: string) => string)
    maxGlossaryChars?: number
    specsDir?: string
  } = {},
): Rule {
  const baseRules = DEFAULT_LANGUAGE_RULES.replace(
    '%STRICT_VOCABULARY%',
    options.requireGlossaryEntry ? STRICT_VOCABULARY : '',
  )
  const rules =
    typeof options.instructions === 'function'
      ? options.instructions(baseRules)
      : (options.instructions ?? baseRules)
  const maxGlossaryChars =
    options.maxGlossaryChars ?? DEFAULT_MAX_GLOSSARY_CHARS
  return async function enforceAcceptanceLanguage(
    action: Action,
    ctx?: RuleContext,
  ): Promise<RuleResult> {
    if (action.kind !== 'write') return { kind: 'pass' }
    if (!ctx?.agent) {
      return {
        kind: 'violation',
        reason:
          'enforceAcceptanceLanguage: no AI agent available; configure Config.ai or use a vendor that ships one.',
      }
    }
    let glossary: string | undefined
    if (options.glossaryPath && ctx.readFile) {
      const file = await ctx.readFile(options.glossaryPath)
      if (file.kind === 'present') {
        glossary = truncate(file.content, maxGlossaryChars)
      }
    }
    const before: FileContent = (await ctx.readFile?.(action.path)) ?? {
      kind: 'unknown',
    }
    const settled = options.specsDir
      ? settledSteps(options.specsDir, action.path, before, action.content)
      : []
    const verdict = await ctx.agent.reason(
      buildPrompt(rules, glossary, before, action, settled),
    )
    if (verdict.kind === 'violation') {
      return { kind: 'violation', reason: verdict.reason }
    }
    return { kind: 'pass', reason: verdict.reason }
  }
}

/**
 * AI-validated enforcement of the `acceptance-testing` skill's
 * controlled-precondition principle: a scenario's Given is established
 * by the test (fixture, programmed stub, substituted port), never
 * inherited from the ambient environment. Catches the two moves that
 * silently hand a Given to the environment:
 *
 *   1. a driver method whose name states a precondition but whose body
 *      sets no fixture/stub/launch state (the no-op precondition
 *      driver), and
 *   2. removing control fixtures because the scenario passes without
 *      them — the brownfield trap where the environment produces the
 *      sad path for free, and the deleted fixture leaves the success
 *      path unspecifiable.
 *
 * Applies to: write actions. Scope it with a `{ files, rules }` block
 * to the driver and test-control layers (e.g.
 * `AcceptanceTests/Drivers/**` plus the acceptance composition root) —
 * the opposite scoping from `enforceAcceptanceLanguage`, which
 * excludes those layers. Every matching write costs an AI call.
 *
 * @param options.instructions — overrides or extends the default
 *   precondition rules text. Pass a string to replace it, or a
 *   function `(defaults) => ...` to extend it.
 */
export function enforceControlledPreconditions(
  options: {
    instructions?: string | ((defaults: string) => string)
  } = {},
): Rule {
  const rules =
    typeof options.instructions === 'function'
      ? options.instructions(PRECONDITION_RULES)
      : (options.instructions ?? PRECONDITION_RULES)
  return async function enforceControlledPreconditions(
    action: Action,
    ctx?: RuleContext,
  ): Promise<RuleResult> {
    if (action.kind !== 'write') return { kind: 'pass' }
    if (!ctx?.agent) {
      return {
        kind: 'violation',
        reason:
          'enforceControlledPreconditions: no AI agent available; configure Config.ai or use a vendor that ships one.',
      }
    }
    const before: FileContent = (await ctx.readFile?.(action.path)) ?? {
      kind: 'unknown',
    }
    const prompt = [
      PRECONDITION_PROCESS_INSTRUCTIONS,
      rules,
      `## Current file content\n\n${formatBefore(before)}`,
      `## Pending action\n\nFile: ${action.path}\n\n${action.content}`,
      RESPONSE_SPEC,
    ].join('\n\n')
    const verdict = await ctx.agent.reason(prompt)
    if (verdict.kind === 'violation') {
      return { kind: 'violation', reason: verdict.reason }
    }
    return { kind: 'pass', reason: verdict.reason }
  }
}

const ISOLATION_RULES = `## Role

You are an acceptance-test isolation validator. The file is part of the
acceptance suite's DSL (layer 2 of the four-layer model) or its test
control. Judge whether the change keeps every test functionally and
temporally isolated, so the same test can run twice, or in parallel with
itself, against one system under test.

## Inputs

"File head" shows how the file builds or reaches the system under test.
"Change" shows the lines this write adds or changes, marked \`+\`, with
a little unchanged context. Judge only the change.

## When a SUT is fresh per test

If the DSL builds a fresh system under test for each test (a new
in-process app with new fakes, constructed per test instance), tests
cannot collide: names need no aliasing and nothing needs clean-up. Pass
on aliasing and clean-up in that case. Shared writable state outside
that fresh instance (a static or global object, a companion object, a
file or database shared between tests) is still a violation.

## Violations, when the SUT outlives a test

- **Unaliased entity:** a name or identifier the test supplies for
  something it creates in the SUT (an account, an order, a sequence
  number) reaches the SUT unchanged. The DSL must map it to a value
  unique to this run, through the suite's alias or sequence helper, and
  map it back when it reads results.
- **Stub keyed on raw names:** a stub for an external system is
  programmed with the raw test name rather than the aliased one, so
  parallel tests can program each other's responses.
- **Shared writable fixture:** the test writes to a well-known record,
  account or dataset other tests also use, instead of creating its own.
- **Clean-up of test data:** deleting what the test created, resetting
  the SUT's store, or truncating tables after or before a test. Each
  test creates its own data and leaves it. Closing driver resources (a
  browser, an app process, a connection) is not clean-up of test data
  and is fine.

A transient state (a helper written before its first use) is never
itself a violation. Name each violation and the line in your reason.`

const ISOLATION_HEAD_LINES = 30
const ISOLATION_CONTEXT_LINES = 3
const NON_CODE_LINE = /^\s*(?:$|\/\/|\/\*|\*|#|import\b|package\b|from\b.*\bimport\b|using\b)/

/**
 * The lines of `after` that are new relative to `before` (by trimmed
 * text), and an excerpt of them with a few lines of context, `+`-marked.
 */
function changedExcerpt(before: string, after: string): { added: string[]; excerpt: string } {
  const previous = new Map<string, number>()
  for (const line of before.split('\n')) previous.set(line.trim(), (previous.get(line.trim()) ?? 0) + 1)
  const lines = after.split('\n')
  const changed = new Set<number>()
  lines.forEach((line, index) => {
    const left = previous.get(line.trim()) ?? 0
    if (left > 0) previous.set(line.trim(), left - 1)
    else changed.add(index)
  })
  const shown = new Set<number>()
  for (const index of changed) {
    for (let i = index - ISOLATION_CONTEXT_LINES; i <= index + ISOLATION_CONTEXT_LINES; i++) {
      if (i >= 0 && i < lines.length) shown.add(i)
    }
  }
  const out: string[] = []
  let last = -2
  for (const index of [...shown].sort((a, b) => a - b)) {
    if (index !== last + 1) out.push('…')
    out.push(`${changed.has(index) ? '+' : ' '} ${lines[index]}`)
    last = index
  }
  return { added: [...changed].map((index) => lines[index]!), excerpt: out.join('\n') }
}

/**
 * AI-validated enforcement of the `acceptance-testing` skill's isolation
 * rules on the acceptance DSL (issue #119): entities a test creates in a
 * SUT that outlives the test are aliased, stubs are keyed on aliased
 * ids, no test writes a shared fixture, and no test cleans up its data.
 * A DSL that builds a fresh SUT per test passes the aliasing and
 * clean-up checks.
 *
 * The model sees the file's head (how it reaches the SUT) and the lines
 * the write adds or changes with a little context, never the whole
 * file, and is not called when the write adds no code (only removals,
 * comments, imports).
 *
 * Applies to: write actions. Scope it to the DSL layer (e.g.
 * `**\/acceptance/dsl/**`); every write there that adds code costs one
 * AI call.
 *
 * @param options.instructions — replaces or extends the default rules
 *   text: a string replaces it, `(defaults) => ...` extends it.
 */
export function enforceTestIsolation(
  options: { instructions?: string | ((defaults: string) => string) } = {},
): Rule {
  const rules =
    typeof options.instructions === 'function'
      ? options.instructions(ISOLATION_RULES)
      : (options.instructions ?? ISOLATION_RULES)
  return async function enforceTestIsolation(action: Action, ctx?: RuleContext): Promise<RuleResult> {
    if (action.kind !== 'write') return { kind: 'pass' }
    const previous = await ctx?.readFile?.(action.path)
    const before = previous?.kind === 'present' ? previous.content : ''
    const { added, excerpt } = changedExcerpt(before, action.content)
    if (!added.some((line) => !NON_CODE_LINE.test(line))) return { kind: 'pass' }
    if (!ctx?.agent) {
      return {
        kind: 'violation',
        reason: 'enforceTestIsolation: no AI agent available; configure Config.ai or use a vendor that ships one.',
      }
    }
    const head = action.content.split('\n').slice(0, ISOLATION_HEAD_LINES).join('\n')
    const prompt = [
      rules,
      `## File head\n\nFile: ${action.path}\n\n${head}`,
      `## Change\n\n${excerpt}`,
      RESPONSE_SPEC,
    ].join('\n\n')
    const verdict = await ctx.agent.reason(prompt)
    if (verdict.kind === 'violation') return { kind: 'violation', reason: verdict.reason }
    return { kind: 'pass', reason: verdict.reason }
  }
}
