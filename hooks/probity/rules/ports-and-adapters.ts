import { readdirSync, readFileSync, statSync } from 'node:fs'
import { isAbsolute, join, relative, sep } from 'node:path'

import type { Action, Rule, RuleContext, RuleResult } from '@nizos/probity'

import { introducedPatterns, type NamedPattern } from './gates.js'
import { buildMatcher } from './scoping.js'

type FileContent = Awaited<ReturnType<NonNullable<RuleContext['readFile']>>>

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

You are an architecture-boundary validator. Judge whether the pending
write respects the ports-and-adapters (hexagonal) rules below.

## Inputs

You will see two or three inputs:

1. "Current file content" — what's on disk right now at the file the
   agent is about to write. May be a parenthesized marker (e.g.
   \`(file does not exist)\`).
2. "Pending action" — the file path and what the agent is about to
   write. Content may be raw file text or a patch/diff.

## What you judge

Judge the change this write makes (the difference between the current
file content and the pending action), not the resulting file as a
whole. Infer the file's architectural role — core/domain, inbound or
outbound adapter, composition root, or test — from its path and
content.

A transient file state is never itself a violation: an unresolved
symbol, a dead definition, a half-finished multi-step change. Whether
the file compiles or runs is checked by the test suite, not by you.

A block recorded earlier in the session is a past verdict, not a rule.
Re-derive your judgment from the rules below. When the user tells you
in the session to let this change through, treat it as authoritative
and pass.

The bar for blocking is a clear violation of a rule below. Boundary
placement often involves judgment the agent can defend (composition
roots wire vendors by design; pure computation libraries need no
port); when the call is genuinely ambiguous, pass.`

const DEFAULT_BOUNDARY_RULES = `## Ports-and-adapters rules

The strict rule of this codebase: **an adapter is required for every
dependency the team doesn't own, and every dependency that isn't
deployed and released together with this code** — UI toolkits, web and
application frameworks, databases, third-party APIs and SDKs, message
brokers, other teams' services, and the operating system itself
(clock, filesystem, environment, randomness, network).

### The Dependency Rule (core code)

Core/domain/use-case code depends only on ports: interfaces the team
defines, named in the language of the domain, shaped by what the core
needs.

  - Core files import NOTHING from adapters, frameworks, vendor SDKs,
    ORMs, or OS I/O modules. \`new Date()\`, \`Date.now()\`,
    \`Math.random()\`, \`process.env\`, filesystem or network access in
    core code are violations — clock, config, randomness, and storage
    are ports.
  - Port signatures use core types only. A vendor type (a Stripe
    object, an ORM entity, an HTTP request/response) appearing in a
    port is a leaked boundary.
  - A module in the same repo and the same deployable unit needs no
    port; a dependency owned by another team or released on its own
    schedule does, even when "it's internal".

### Adapters must be thin

An adapter's only job is translation: port call → vendor call, vendor
result/error → core type. An adapter contains no conditional that
expresses a business rule. Mapping a vendor error code to a domain
error is translation; deciding what to do about it is core logic.
Retry policies, fallback decisions, caching rules, and validation
belong in the core behind the port — block adapter writes that add
them. Inbound adapters are equally thin: a route handler parses, calls
one use-case port, serializes the result.

### Ports are the only test seam

Test doubles are substituted at ports and nowhere else. Block test
writes that introduce module-mocking of the team's own code
(\`jest.mock('./our-module')\`, \`vi.mock('../internal')\`),
monkey-patching, or spying on internals — the substitute belongs at a
port, as an in-memory fake. Faking at a port (an \`InMemoryOrderStore\`
implementing the \`OrderStore\` port, a controlled \`Clock\`) is the
intended pattern and always passes.

### Always allowed

  - Composition roots and factory/wiring modules importing both core
    and adapters to assemble the system.
  - Adapter files importing their own vendor (that is their job).
  - Deleting code. Renames and moves that don't change dependencies.
  - Pure computation libraries with no external effects used directly.`

const GLOSSARY_RULES = `### Ubiquitous language

A glossary is provided below. Ports, domain types, use cases, and
their members name domain concepts with the glossary's terms
verbatim — one term per concept. Naming a recorded concept with a
synonym or conflicting term is a violation; a concept the glossary
does not cover is not a violation by itself.`

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

function buildPrompt(
  rules: string,
  glossary: string | undefined,
  before: FileContent,
  action: { path: string; content: string },
): string {
  const sections = [PROCESS_INSTRUCTIONS, rules]
  if (glossary) {
    sections.push(GLOSSARY_RULES, `## Glossary\n\n${glossary}`)
  }
  sections.push(
    `## Current file content\n\n${formatBefore(before)}`,
    `## Pending action\n\nFile: ${action.path}\n\n${action.content}`,
    RESPONSE_SPEC,
  )
  return sections.join('\n\n')
}

/**
 * AI-validated enforcement of the `ports-and-adapters` skill: the
 * Dependency Rule (core imports nothing from adapters, frameworks,
 * vendors, or OS I/O), thin adapters (no business conditionals), and
 * ports as the only test seam.
 *
 * Applies to: write actions. Scope it with a `{ files, rules }` block
 * to the code you care about — every matching write costs an AI call.
 * Pair it with `forbidContentPattern` blocks for known-bad imports so
 * the obvious violations are caught deterministically and free.
 *
 * @param options.instructions — overrides or extends the default
 *   boundary rules text. Pass a string to replace it, or a function
 *   `(defaults) => ...` to extend it (e.g. name your project's core
 *   and adapter directories so the validator infers roles precisely).
 * @param options.glossaryPath — absolute path to the project's
 *   ubiquitous-language glossary. When set and readable, the
 *   glossary is included in the validator's prompt and port/domain
 *   names that conflict with recorded terms become violations.
 * @param options.maxGlossaryChars — truncate the glossary beyond
 *   this length when building the prompt (default 8000).
 *
 * @example
 * { files: ['src/core/**', 'src/domain/**'], rules: [enforcePortsBoundary()] }
 *
 * @example
 * enforcePortsBoundary({
 *   instructions: (defaults) =>
 *     `${defaults}\n\n### Project layout\n\nCore lives in src/core; adapters in src/infra.`,
 * })
 */
export function enforcePortsBoundary(
  options: {
    instructions?: string | ((defaults: string) => string)
    glossaryPath?: string
    maxGlossaryChars?: number
  } = {},
): Rule {
  const rules =
    typeof options.instructions === 'function'
      ? options.instructions(DEFAULT_BOUNDARY_RULES)
      : (options.instructions ?? DEFAULT_BOUNDARY_RULES)
  const maxGlossaryChars = options.maxGlossaryChars ?? 8000
  return async function enforcePortsBoundary(
    action: Action,
    ctx?: RuleContext,
  ): Promise<RuleResult> {
    if (action.kind !== 'write') return { kind: 'pass' }
    if (!ctx?.agent) {
      return {
        kind: 'violation',
        reason:
          'enforcePortsBoundary: no AI agent available; configure Config.ai or use a vendor that ships one.',
      }
    }
    let glossary: string | undefined
    if (options.glossaryPath && ctx.readFile) {
      const file = await ctx.readFile(options.glossaryPath)
      if (file.kind === 'present') {
        glossary =
          file.content.length > maxGlossaryChars
            ? `${file.content.slice(0, maxGlossaryChars)}\n(...glossary truncated...)`
            : file.content
      }
    }
    const before: FileContent = (await ctx.readFile?.(action.path)) ?? {
      kind: 'unknown',
    }
    const verdict = await ctx.agent.reason(
      buildPrompt(rules, glossary, before, action),
    )
    if (verdict.kind === 'violation') {
      return { kind: 'violation', reason: verdict.reason }
    }
    return { kind: 'pass', reason: verdict.reason }
  }
}

const ADAPTER_OBS_INSTRUCTIONS = `## Role

You are an adapter-observability validator. Adapters are the
integration points of this codebase, and an uninstrumented
integration point is undiagnosable in the field. Judge whether the
pending write keeps new adapter code observable, per the rules below.

## Inputs

1. "Current file content" — what's on disk right now (may be a marker
   like \`(file does not exist)\`).
2. "Pending action" — the file path and what the agent is about to
   write. Content may be raw file text or a patch/diff.

## What you judge

Judge only the change this write makes (before → after), never
pre-existing code. A transient state (unresolved import, half-built
class) is never itself a violation. A block recorded earlier in the
session is a past verdict, not a rule; when the user says to let a
change through, treat that as authoritative and pass.

## Adapter observability rules

A NEW adapter code path that performs external I/O itself — it calls a
vendor SDK, an HTTP client, a database driver, the filesystem, or a
platform API (keychain/keystore, OS services) — must carry boundary
observability on that path: at least one structured telemetry
event (call made / outcome / retry, with machine-readable fields), a
recording tap/decorator around the port, or a span. The point: when
the integration misbehaves, someone can see what was sent and what
came back without attaching a debugger.

Always pass:
  - Delegation through the codebase's own abstractions: calls on an
    interface or class this codebase declares (same package, or
    imported from the project's own packages rather than a vendor or
    platform library) are not external I/O at this call site, even when
    the type's name mentions a keychain, store, client or backend. The
    implementation behind that type sits at the real boundary and owns
    the observability; judge it when it is written, not every caller.
    Block only when this file itself reaches the vendor or platform API.
  - Pure type mappers and translators with no external effect.
  - Composition roots and DI wiring (including wiring a tap decorator
    — that IS the observability).
  - Test code and test fixtures/fakes.
  - Edits that only touch existing uninstrumented paths without adding
    new external calls (delta-based: legacy migrates incrementally).
  - Files that are clearly not adapters despite the path.

Do not demand a specific API: any structured, greppable event or
tap/trace convention counts. Never punish redaction (omitting payload
fields for secrecy) — presence of an event is what matters. You judge
presence, not field safety: whether a logged field is itself too
sensitive (a uid, PII) is review's job, not yours. When genuinely
ambiguous, pass.

## When you block

Phrase the remediation concretely: name the exact call to add and
where. If a "Project convention" section is provided below, use its
vocabulary verbatim in the remediation (its API or tap pattern, not a
generic "add logging"). And remind the agent that under this
codebase's TDD gate, instrumentation should be ASSERTED in the failing
test first (a fake/recording telemetry collector) — that way the TDD
validator accepts the event as tested behavior instead of flagging it
as over-implementation.`

/**
 * AI-validated companion to `enforcePortsBoundary`, judging the
 * opposite concern: adapters must be thin, but not blind. A new
 * adapter code path performing external I/O with no boundary
 * observability — no structured event, no tap/recording decorator, no
 * span — is blocked; pure mappers, wiring, tests, and untouched
 * legacy paths pass (delta-based).
 *
 * Applies to: write actions. Scope it to adapter paths only (e.g.
 * `**\/adapter\/**`, `**\/infra\/**`) — every matching write costs an
 * AI call.
 *
 * @param options.conventionHint — appended to the validator prompt to
 *   name the project's telemetry/tap convention (e.g. "structured
 *   Logger.event(tag, event, fields); port taps wired in the demo
 *   flavor's Koin module"), so the verdict and its fix suggestion
 *   speak the project's language.
 * @param options.instructions — replaces or extends the default rules
 *   text (string, or `(defaults) => ...`).
 */
export function enforceAdapterObservability(
  options: {
    conventionHint?: string
    instructions?: string | ((defaults: string) => string)
  } = {},
): Rule {
  const base =
    typeof options.instructions === 'function'
      ? options.instructions(ADAPTER_OBS_INSTRUCTIONS)
      : (options.instructions ?? ADAPTER_OBS_INSTRUCTIONS)
  const rules = options.conventionHint
    ? `${base}\n\n### Project convention\n\n${options.conventionHint}`
    : base
  return async function enforceAdapterObservability(
    action: Action,
    ctx?: RuleContext,
  ): Promise<RuleResult> {
    if (action.kind !== 'write') return { kind: 'pass' }
    if (!ctx?.agent) {
      return {
        kind: 'violation',
        reason:
          'enforceAdapterObservability: no AI agent available; configure Config.ai or use a vendor that ships one.',
      }
    }
    const before: FileContent = (await ctx.readFile?.(action.path)) ?? {
      kind: 'unknown',
    }
    const verdict = await ctx.agent.reason(
      [
        rules,
        `## Current file content\n\n${formatBefore(before)}`,
        `## Pending action\n\nFile: ${action.path}\n\n${action.content}`,
        RESPONSE_SPEC,
      ].join('\n\n'),
    )
    if (verdict.kind === 'violation') {
      return { kind: 'violation', reason: verdict.reason }
    }
    return { kind: 'pass', reason: verdict.reason }
  }
}

const MODULE_MOCK_PATTERN =
  /\b(?:jest|vi)\.(?:mock|doMock)\(\s*(['"`])(\.\.?\/[^'"`]+)\1/g

function relativeMockSpecifiers(content: string): Set<string> {
  const specifiers = new Set<string>()
  for (const match of content.matchAll(MODULE_MOCK_PATTERN)) {
    const specifier = match[2]
    if (specifier) specifiers.add(specifier)
  }
  return specifiers
}

/**
 * Deterministic companion to `enforcePortsBoundary`: blocks test
 * writes that introduce `jest.mock()` / `vi.mock()` calls with a
 * relative specifier — mocking the team's own modules instead of
 * substituting a fake at a port ("Ports Are the Only Test Seam").
 *
 * Only newly introduced mocks are blocked: a specifier already mocked
 * in the file on disk doesn't re-trigger on later edits, so existing
 * suites can be migrated incrementally. Mocks of bare (package)
 * specifiers are ignored — vendor modules are the adapter's problem,
 * and adapter tests may legitimately isolate them.
 *
 * Applies to: write actions. No AI call; free to run broadly.
 *
 * @param options.allow — specifier pattern(s) exempt from the rule
 *   (literal substring or RegExp against the mocked path), e.g. a
 *   sanctioned test-helper module.
 *
 * @example
 * { files: ['**\/*.test.*', '**\/*.spec.*'], rules: [forbidInternalModuleMocks()] }
 */
export function forbidInternalModuleMocks(
  options: { allow?: string | RegExp } = {},
): Rule {
  const allowed = (specifier: string): boolean => {
    if (options.allow === undefined) return false
    if (typeof options.allow === 'string')
      return specifier.includes(options.allow)
    return options.allow.test(specifier)
  }
  return async function forbidInternalModuleMocks(
    action: Action,
    ctx?: RuleContext,
  ): Promise<RuleResult> {
    if (action.kind !== 'write') return { kind: 'pass' }
    const pending = relativeMockSpecifiers(action.content)
    if (pending.size === 0) return { kind: 'pass' }
    const before = await ctx?.readFile?.(action.path)
    const existing =
      before?.kind === 'present'
        ? relativeMockSpecifiers(before.content)
        : new Set<string>()
    const introduced = [...pending].filter(
      (specifier) => !existing.has(specifier) && !allowed(specifier),
    )
    if (introduced.length === 0) return { kind: 'pass' }
    return {
      kind: 'violation',
      reason:
        `This write introduces module-mocking of our own code (${introduced
          .map((s) => `'${s}'`)
          .join(', ')}). Ports are the only test seam: substitute an ` +
        'in-memory fake at the port the module sits behind instead of ' +
        'mocking the module. If no port exists yet, that is the missing ' +
        'design step — see the ports-and-adapters skill.',
    }
  }
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * One pattern per discriminant: the field compared to a string literal
 * with `===`, `!==`, `==` or `!=`, in either order
 * (`viewer.role === 'SuperUser'`, `'Draft' !== order.status`).
 */
export function domainDiscriminantPatterns(
  discriminants: readonly string[],
): NamedPattern[] {
  return discriminants.map((name) => {
    const field = escapeRegExp(name)
    const literal = String.raw`(['"\x60])[^'"\x60\n]*\1`
    return {
      label: `${name} compared to a literal`,
      pattern: new RegExp(
        String.raw`\b${field}\s*[!=]==?\s*['"\x60]|${literal}\s*[!=]==?\s*[\w$.?!]*\b${field}\b`,
        'g',
      ),
    }
  })
}

/**
 * Deterministic first screen for thin driving adapters (issue #72): a
 * UI component or other inbound adapter that compares a domain
 * discriminant — a role, a status, a plan — to a literal is deciding a
 * business rule itself. The domain should export that decision
 * (`canApprove(actor)`, `isEditable(order)`) and the adapter call
 * it.
 *
 * Delta-based, like `forbidNewAmbientEffects`: only a write that adds
 * comparisons beyond what the file on disk already has blocks, so an
 * existing thick component doesn't freeze. No AI call.
 *
 * There is no default list. `status === 'loading'` is ordinary local
 * view state in a UI, so the discriminants must be the fields that
 * carry domain meaning in YOUR model.
 *
 * Applies to: write actions. Scope it to driving-adapter files (UI
 * components, route handlers, CLI commands).
 *
 * @param options.discriminants — field names whose literal comparisons
 *   are domain decisions, e.g. `['role', 'plan']`.
 * @param options.domainHint — appended to the block message to name
 *   where the decision should go, e.g. "permission rules live in
 *   src/domain/permissions.ts".
 * @param options.patternsFor — builds the patterns from the
 *   discriminants (default {@link domainDiscriminantPatterns}, JS/TS
 *   string literals). The Kotlin presets pass
 *   `kotlinDomainDiscriminantPatterns`, which also matches enum
 *   entries, `when` subjects and `is` checks.
 *
 * @example
 * { files: ['src/ui/**'], rules: [forbidNewDomainDiscriminantChecks({ discriminants: ['role'] })] }
 */
export function forbidNewDomainDiscriminantChecks(options: {
  discriminants: readonly string[]
  domainHint?: string
  patternsFor?: (discriminants: readonly string[]) => NamedPattern[]
}): Rule {
  const patterns = (options.patternsFor ?? domainDiscriminantPatterns)(options.discriminants)
  return async function forbidNewDomainDiscriminantChecks(
    action: Action,
    ctx?: RuleContext,
  ): Promise<RuleResult> {
    if (action.kind !== 'write' || patterns.length === 0) return { kind: 'pass' }
    const introduced = await introducedPatterns(action, ctx, patterns)
    if (introduced.length === 0) return { kind: 'pass' }
    const hint = options.domainHint ? ` ${options.domainHint}.` : ''
    return {
      kind: 'violation',
      reason:
        `This write adds a domain decision to a driving adapter (${introduced.join(
          ', ',
        )}). Driving adapters (UI components, route handlers, CLI commands) render ` +
        'core-supplied state and forward user intent; they do not decide ' +
        'business rules. Add a function to the domain that makes this ' +
        'decision (e.g. `canApprove(actor)`, `isEditable(order)`), ' +
        `test it without the UI framework, and call it here.${hint} ` +
        'Existing comparisons in the file are untouched by this rule — ' +
        'only new ones are blocked.',
    }
  }
}

const EXPORT_DECLARATION =
  /^\s*export\s+(?:default\s+)?(?:declare\s+)?(?:async\s+)?(?:abstract\s+)?(?:function\*?|const|let|var|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/gm
const EXPORT_LIST = /^\s*export\s+(?:type\s+)?\{([^}]*)\}/gm
const EXPORT_SCAN_SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'build',
  'dist',
  'out',
  'coverage',
])

/**
 * How to read one language's exports from source: which files are
 * source, which of those are tests (skipped), and the exported names
 * in a file's text.
 */
export type ExportLanguage = {
  sourceFile: RegExp
  testFile: RegExp
  exportedNames: (content: string) => string[]
}

/** Names a JS/TS module exports, from its source text. */
export function exportedNames(content: string): string[] {
  const names = new Set<string>()
  for (const match of content.matchAll(EXPORT_DECLARATION)) {
    if (match[1]) names.add(match[1])
  }
  for (const match of content.matchAll(EXPORT_LIST)) {
    for (const part of (match[1] ?? '').split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop()?.replace(/^type\s+/, '').trim()
      if (name && /^[A-Za-z_$][\w$]*$/.test(name)) names.add(name)
    }
  }
  return [...names]
}

/** JS/TS exports: `export function|const|class|type…` and `export { … }`. */
export const JS_EXPORTS: ExportLanguage = {
  sourceFile: /\.(?:[cm]?[jt]sx?)$/,
  testFile: /\.(?:test|spec)\.[^./]+$/,
  exportedNames,
}

function sourceFiles(dir: string, pattern: RegExp, out: string[] = [], top = true): string[] {
  // A directory holding a `.git` FILE is another working tree (a
  // linked worktree under .claude/worktrees/, or a submodule): its
  // copies of the core are not this checkout's exports (cf. #55).
  if (!top) {
    try {
      if (statSync(join(dir, '.git')).isFile()) return out
    } catch {
      // no .git entry: an ordinary directory
    }
  }
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!EXPORT_SCAN_SKIP_DIRS.has(entry.name)) sourceFiles(join(dir, entry.name), pattern, out, false)
    } else if (entry.isFile() && pattern.test(entry.name)) {
      out.push(join(dir, entry.name))
    }
  }
  return out
}

/**
 * The core's export list, one line per module (`src/domain/roles.ts:
 * canApprove, canEdit`), for the thin-driving-adapter judge. Test files
 * are skipped. Truncated beyond `maxChars`.
 */
export function listCoreExports(options: {
  globs: readonly string[]
  root: string
  maxChars: number
  language?: ExportLanguage
}): string {
  const language = options.language ?? JS_EXPORTS
  const matches = buildMatcher(options.globs)
  const modules: [string, string[]][] = []
  for (const file of sourceFiles(options.root, language.sourceFile).sort()) {
    const rel = relative(options.root, file).split(sep).join('/')
    if (!matches(rel) || language.testFile.test(rel)) continue
    let content
    try {
      content = readFileSync(file, 'utf8')
    } catch {
      continue
    }
    const names = language.exportedNames(content)
    if (names.length > 0) modules.push([rel, names])
  }
  // Paths relative to the directory every module shares, so a deep
  // package path isn't repeated on every line of a capped list.
  const prefix = commonDirectory(modules.map(([rel]) => rel))
  const lines = modules.map(([rel, names]) => `${rel.slice(prefix.length)}: ${names.join(', ')}`)
  if (prefix && modules.length > 1) lines.unshift(`(paths under ${prefix})`)
  return capped(lines.join('\n'), options.maxChars)
}

function commonDirectory(paths: readonly string[]): string {
  if (paths.length < 2) return ''
  const split = paths.map((path) => path.split('/').slice(0, -1))
  const shared: string[] = []
  for (let i = 0; split.every((parts) => i < parts.length && parts[i] === split[0]![i]); i++) {
    shared.push(split[0]![i]!)
  }
  return shared.length ? `${shared.join('/')}/` : ''
}

function capped(text: string, maxChars: number): string {
  return text.length > maxChars
    ? `${text.slice(0, maxChars)}\n(...export list truncated...)`
    : text
}

/**
 * How to read a published-API dump: which files in a directory are
 * dumps, and the dump's text as `Owner: name, name` lines.
 */
export type ApiDumpFormat = {
  file: RegExp
  read: (content: string) => string[]
}

/**
 * The core's public API from published dumps, for a repo that consumes
 * the core as a library and has no core source to scan. Each path is a
 * dump file or a directory of them, relative to `root` or absolute.
 * Missing paths are skipped. Truncated beyond `maxChars`.
 */
export function listPublishedApi(options: {
  paths: readonly string[]
  root: string
  maxChars: number
  format: ApiDumpFormat
}): string {
  const files: string[] = []
  for (const path of options.paths) {
    const full = isAbsolute(path) ? path : join(options.root, path)
    let stat
    try {
      stat = statSync(full)
    } catch {
      continue
    }
    if (stat.isDirectory()) files.push(...sourceFiles(full, options.format.file).sort())
    else files.push(full)
  }
  const lines: string[] = []
  for (const file of files) {
    try {
      lines.push(...options.format.read(readFileSync(file, 'utf8')))
    } catch {
      continue
    }
  }
  return capped(lines.join('\n'), options.maxChars)
}

const THIN_DRIVING_ADAPTER_INSTRUCTIONS = `## Role

You are a driving-adapter thinness validator. A driving (inbound)
adapter is the code the outside world calls first: a UI component, a
page, a route handler, a CLI command. In this codebase it renders
core-supplied state and forwards user intent to the core. Business
logic in it can only be tested through the framework, drifts when it
is copied, and is invisible to headless and acceptance tests. Judge
whether the pending write keeps this adapter thin, per the rules below.

## Inputs

1. "Current file content" — what's on disk right now (may be a marker
   like \`(file does not exist)\`).
2. "Pending action" — the file path and the file content after the
   write, or, for an edit to a large file, a unified diff of it.
3. Optionally, "Core exports" — what the domain and use-case modules
   already export, one module per line.

## What you judge

Judge only what this write adds (before → after), never pre-existing
code: an existing thick component is migrated incrementally, so a
write that leaves old logic in place but adds none passes. A transient
state (an unresolved import, a half-built component) is never itself a
violation. A block recorded earlier in the session is a past verdict,
not a rule; when the user says to let a change through, treat that as
authoritative and pass. The bar is a clear violation; when genuinely
ambiguous, pass.

## Block a write that adds any of these

(a) **A decision expressed in domain terms**: eligibility, permission,
    a state transition, a validation rule, or a derived value used to
    make one (who may approve, which approver a request is routed to,
    whether an order can still be edited). Comparing a role, status or plan
    to a literal is the usual shape. Extraction target: a domain
    function the adapter calls.
(b) **Coordination of more than one port or use-case call in one
    handler**, or a policy about their outcomes (call the domain, then
    save, then notify; "a failed notification must never fail the
    submit"). That is a use case. Extraction target: a use-case
    function, tested headless with fakes at its ports, which the
    handler calls once.
(c) **A re-implementation of something the core already exports**, or
    a copy of a domain rule that already lives elsewhere (a
    display-name rule, a permission check). When "Core exports" lists
    a matching name, block and name it. Extraction target: call the
    existing export, or move the rule into the domain once and call it.
(d) **A use case filed as an adapter**: a module under a driving-
    adapter path that uses no UI or framework API and coordinates
    ports (e.g. \`startCheckout(billing, logger)\`). Extraction target:
    move it to the use-case layer.

## Always pass

  - Rendering and layout, styling, accessibility attributes.
  - Formatting for display: dates, currency, pluralization, truncation.
  - Local view state: open/closed, loading/error flags, form field
    values, the selected tab, input focus.
  - A display condition over the data the view already holds: an empty
    state, a single item, the first or last row (no "Edit order" link
    when one row is shown, no "Move up" on the first row). It decides
    what to show, not which outcome or permission applies, and a pure
    view function over the screen's state is a fine home for it. It is
    still (a) or (c) when it repeats a rule the core enforces: hiding
    "Delete" on the last admin when the core refuses that delete.
  - Parsing and shaping user input into the arguments of a call.
  - Calling ONE use case or port per user intent and showing its
    result or error.
  - Calling a domain function to make a decision (\`canApprove(actor)\`)
    — that is the intended pattern.
  - Wiring/composition (providers, DI, routing tables), test code, and
    deleting code.
  - Files that are clearly not driving adapters despite the path.

## When you block

Name the exact logic the write adds and its extraction target: a
domain function (for a decision or a duplicated rule) or a use case
(for coordination). Name the existing core export to call when there
is one. Remind the agent that under this codebase's TDD gate the
extracted function gets its failing test first, written without the UI
framework.`

/**
 * AI-validated rule for thin driving adapters (issue #72): UI
 * components, pages, route handlers and CLI commands must not add
 * business logic. The judge blocks a write that adds (a) a decision in
 * domain terms, (b) coordination of more than one port/use-case call,
 * (c) a re-implementation of something the core already exports, or
 * (d) a framework-free use case filed as an adapter — naming the
 * extraction target (domain function or use case) in the deny.
 * Rendering, display formatting, local view state and one call per
 * user intent pass. Delta-based: only what a write adds is judged.
 *
 * The other ports-and-adapters rules stop vendors getting INTO core
 * code; this one stops logic leaking OUT of it.
 *
 * Applies to: write actions. Scope it to driving-adapter files — every
 * matching write costs an AI call. Pair it with
 * `forbidNewDomainDiscriminantChecks` so the obvious cases block free.
 *
 * @param options.coreExports — when set, the judge is given the
 *   export names of every source file matching `globs` under `root`
 *   (default `process.cwd()`), truncated beyond `maxChars` (default
 *   8000), so it can spot a copy of an existing domain rule. Costs a
 *   directory scan per judged write.
 *   `language` picks how exports are read (default {@link JS_EXPORTS};
 *   the Kotlin presets pass `KOTLIN_EXPORTS`).
 * @param options.publishedApi — for a repo that consumes the core as
 *   a library: the judge is given the public API read from published
 *   dumps at `paths` (files or directories, relative to `root`), in
 *   `format` (e.g. `KOTLIN_API_DUMP` for binary-compatibility-validator
 *   `.api` files). Combined with `coreExports` when both are set.
 * @param options.instructions — replaces or extends the default rules
 *   text (string, or `(defaults) => ...`).
 *
 * @example
 * { files: ['src/ui/**', '!**\/*.test.*'], rules: [enforceThinDrivingAdapter()] }
 */
export function enforceThinDrivingAdapter(
  options: {
    coreExports?: {
      globs: readonly string[]
      root?: string
      maxChars?: number
      language?: ExportLanguage
    }
    publishedApi?: {
      paths: readonly string[]
      format: ApiDumpFormat
      root?: string
      maxChars?: number
    }
    instructions?: string | ((defaults: string) => string)
  } = {},
): Rule {
  const rules =
    typeof options.instructions === 'function'
      ? options.instructions(THIN_DRIVING_ADAPTER_INSTRUCTIONS)
      : (options.instructions ?? THIN_DRIVING_ADAPTER_INSTRUCTIONS)
  return async function enforceThinDrivingAdapter(
    action: Action,
    ctx?: RuleContext,
  ): Promise<RuleResult> {
    if (action.kind !== 'write') return { kind: 'pass' }
    if (!ctx?.agent) {
      return {
        kind: 'violation',
        reason:
          'enforceThinDrivingAdapter: no AI agent available; configure Config.ai or use a vendor that ships one.',
      }
    }
    const before: FileContent = (await ctx.readFile?.(action.path)) ?? {
      kind: 'unknown',
    }
    const sections = [
      rules,
      `## Current file content\n\n${formatBefore(before)}`,
      `## Pending action\n\nFile: ${action.path}\n\n${action.content}`,
    ]
    const exports: string[] = []
    if (options.coreExports) {
      exports.push(
        listCoreExports({
          globs: options.coreExports.globs,
          root: options.coreExports.root ?? process.cwd(),
          maxChars: options.coreExports.maxChars ?? 8000,
          language: options.coreExports.language,
        }),
      )
    }
    if (options.publishedApi) {
      exports.push(
        listPublishedApi({
          paths: options.publishedApi.paths,
          root: options.publishedApi.root ?? process.cwd(),
          maxChars: options.publishedApi.maxChars ?? 8000,
          format: options.publishedApi.format,
        }),
      )
    }
    const exportList = exports.filter(Boolean).join('\n')
    if (exportList) sections.push(`## Core exports\n\n${exportList}`)
    sections.push(RESPONSE_SPEC)
    const verdict = await ctx.agent.reason(sections.join('\n\n'))
    if (verdict.kind === 'violation') {
      return { kind: 'violation', reason: verdict.reason }
    }
    return { kind: 'pass', reason: verdict.reason }
  }
}

const FORWARDING_ONLY_ADAPTER_INSTRUCTIONS = `## Role

You are a forwarding-only validator for vendor adapters whose success
path cannot run offline. The vendor SDK calls this code back only during
a live session (a real call, an incoming push, a valid access token), so
no host or device test can go red on it, and the TDD gate does not judge
this file. That is acceptable only while the code holds nothing worth
testing: every decision lives behind the port the adapter forwards to,
in plain code that host tests drive with fakes. Judge whether the
pending write keeps this adapter that thin.

## Inputs

1. "Current file content" — what's on disk right now (may be a marker
   like \`(file does not exist)\`).
2. "Pending action" — the file path and the file content after the
   write, or, for an edit to a large file, a unified diff of it.

## What you judge

Judge only what this write adds (before → after), never pre-existing
code. A transient state (an unresolved import, a \`TODO()\` body) is not
itself a violation. A block recorded earlier in the session is a past
verdict, not a rule; when the user says to let a change through, treat
that as authoritative and pass. Because nothing tests this code, a
branch you cannot classify as a plain one-to-one mapping counts as a
decision.

## Always pass

  - Forwarding a vendor callback or event to one port method, one to
    one: \`onConnected(room)\` → \`events.joined(room.sid, …)\`,
    \`onParticipantDisconnected(room, p)\` → \`events.participantLeft(p.identity)\`.
  - Reading what the vendor objects already hold and converting it to
    the port's types: an id to a String, a vendor enum case to the
    port's case in a plain one-to-one mapping, a vendor error code
    passed on as a value, a list of vendor objects mapped field by
    field, the size of a collection the vendor object keeps (the room's
    current participants). Reading vendor state is not computation.
  - Forwarding a port call to the vendor SDK: \`leave()\` →
    \`room.disconnect()\`, \`accept(id)\` → the held invite's
    \`accept(context, listener)\`.
  - Holding and releasing the vendor objects the forwarding needs:
    storing the Room or the CallInvite when it arrives (keyed by its
    vendor id when there can be several), clearing it when it ends,
    registering and unregistering listeners, null-safe calls
    (\`room?.disconnect()\`).
  - Declarations, imports, constructors and dependency wiring; the
    boundary event or log line an observability rule asks for at a
    vendor call; comments; deleting code.

## Block a write that adds any of these

(a) **A decision**: a branch that chooses what happens from state, a
    value, a count or a vendor error (an \`if\`/\`when\`/\`switch\` beyond a
    one-to-one value mapping, an early return that skips forwarding on
    a condition).
(b) **State beyond the held vendor objects**: counters, flags,
    collections of anything else, caches, timers, a state machine.
(c) **Policy**: retries, backoff, timeouts, fallbacks, ordering or
    de-duplicating events, combining or sequencing several port or
    vendor calls in one callback.
(d) **Computation**: a value the adapter works out itself rather than
    reads from a vendor object: a count or total it keeps across
    callbacks, a duration, filtering or sorting, display formatting.

## When you block

Name the exact logic the write adds, and say where it goes: behind the
port, into the plain code the port leads to, where a host test with a
fake at the port drives it red first. The adapter then forwards to it.`

/**
 * AI-validated rule for vendor adapters whose success path can't be
 * tested offline (issue #102): SDK callbacks that fire only during a
 * live call or with a real push or token. The TDD gate can never see
 * those lines go red, so a preset takes the files out of its TDD block
 * and holds them to this rule instead: one-to-one forwarding between
 * the vendor SDK and a tested port, plus holding the vendor objects
 * that needs. A decision, extra state, policy or computation is
 * blocked, with a pointer to move it behind the port. Delta-based.
 *
 * Applies to: write actions. Scope it to the vendor adapter files only;
 * every matching write costs an AI call.
 *
 * @param options.instructions — replaces or extends the default rules
 *   text (string, or `(defaults) => ...`).
 */
export function enforceForwardingOnlyAdapter(
  options: { instructions?: string | ((defaults: string) => string) } = {},
): Rule {
  const rules =
    typeof options.instructions === 'function'
      ? options.instructions(FORWARDING_ONLY_ADAPTER_INSTRUCTIONS)
      : (options.instructions ?? FORWARDING_ONLY_ADAPTER_INSTRUCTIONS)
  return async function enforceForwardingOnlyAdapter(
    action: Action,
    ctx?: RuleContext,
  ): Promise<RuleResult> {
    if (action.kind !== 'write') return { kind: 'pass' }
    if (!ctx?.agent) {
      return {
        kind: 'violation',
        reason:
          'enforceForwardingOnlyAdapter: no AI agent available; configure Config.ai or use a vendor that ships one.',
      }
    }
    const before: FileContent = (await ctx.readFile?.(action.path)) ?? { kind: 'unknown' }
    const verdict = await ctx.agent.reason(
      [
        rules,
        `## Current file content\n\n${formatBefore(before)}`,
        `## Pending action\n\nFile: ${action.path}\n\n${action.content}`,
        RESPONSE_SPEC,
      ].join('\n\n'),
    )
    if (verdict.kind === 'violation') return { kind: 'violation', reason: verdict.reason }
    return { kind: 'pass', reason: verdict.reason }
  }
}
