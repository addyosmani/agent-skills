import { AsyncLocalStorage } from 'node:async_hooks'

import type { Agent, Rule, RuleContext, RuleEntry } from '@nizos/probity'

import { judgeTask } from './judge-task.js'
import { appendWholePromptRecord, sha256, type WholePromptRecordOptions } from './whole-prompt-record.js'

/**
 * Smaller judge prompts for edits to large files (issue #168).
 *
 * Why: Probity applies an edit before the rules see it, so a write action
 * always carries the whole file, and the judge prompts (Probity's
 * `enforceTdd` and this package's AI rules alike) hold it twice: the
 * current content and the pending content. A run of small edits to a
 * large file resent it every time; in mysudo-core-sdk the judge was a
 * quarter of the agent's spend.
 *
 * The wrapper changes only what the judge is sent. The rule still sees
 * the whole file, so deterministic checks are unchanged. When the prompt
 * holds the exact `## Current file content` and `## Pending action`
 * sections for this write, they are replaced with a unified diff and its
 * context lines; any other prompt is passed on as it is.
 */

export type CompactJudgeFilesOptions = {
  /** Compact only when the current or pending file is at least this many bytes. Default 8,000. */
  minBytes?: number
  /** Unchanged lines shown either side of each change. Default 20. */
  contextLines?: number
  /**
   * Record a sampled share of compacted verdicts' whole-file prompts,
   * unsent, with the verdict the compacted prompt got, for
   * `probity-shadow-replay` to check later (issue #174). Off by default.
   */
  record?: WholePromptRecordOptions
}

const DEFAULT_MIN_BYTES = 8_000
const DEFAULT_CONTEXT_LINES = 20
// Past this many changed lines a diff saves little and is hard to read, so
// the prompt is sent whole.
const MAX_EDIT_DISTANCE = 1_000
// A compacted prompt must be clearly smaller to be worth the judge reading
// a diff instead of the file.
const MAX_COMPACTED_SHARE = 0.6
// Lines that say what a file depends on (imports, package): some judges
// infer a file's role from them, so they stay in view however far they
// are from the change.
const DEPENDENCY_LINE =
  /^\s*(?:@\w+(?:\([^)]*\))?\s+)*(?:import|package|using)\b|\bfrom\s+['"]|\brequire\s*\(/
// Marks a last line with no newline after it, so a change to only that
// newline is still a change.
const NO_EOL = '\u0000'

type Op = { kind: ' ' | '-' | '+'; text: string }

function splitLines(text: string): string[] {
  if (text === '') return []
  const lines = text.split('\n')
  if (lines.at(-1) === '') lines.pop()
  else lines[lines.length - 1] += NO_EOL
  return lines
}

/**
 * Myers' shortest edit script from `a` to `b`, or null past `maxD` edits.
 * Cheap when few lines change, however long the file.
 */
function myers(a: string[], b: string[], maxD: number): Op[] | null {
  const n = a.length
  const m = b.length
  const offset = n + m + 1
  const v = new Int32Array(2 * offset + 1)
  // trace[d]: v over k in [-d, d] before step d.
  const trace: Int32Array[] = []
  for (let d = 0; d <= Math.min(n + m, maxD); d++) {
    trace.push(v.slice(offset - d, offset + d + 1))
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[offset + k - 1]! < v[offset + k + 1]!) ? v[offset + k + 1]! : v[offset + k - 1]! + 1
      let y = x - k
      while (x < n && y < m && a[x] === b[y]) {
        x++
        y++
      }
      v[offset + k] = x
      if (x >= n && y >= m) return backtrack(a, b, trace, d)
    }
  }
  return null
}

function backtrack(a: string[], b: string[], trace: Int32Array[], last: number): Op[] {
  const ops: Op[] = []
  let x = a.length
  let y = b.length
  for (let d = last; d > 0; d--) {
    const before = trace[d]!
    const at = (k: number) => before[k + d]!
    const k = x - y
    const prevK = k === -d || (k !== d && at(k - 1) < at(k + 1)) ? k + 1 : k - 1
    const prevX = at(prevK)
    const prevY = prevX - prevK
    while (x > prevX && y > prevY) {
      ops.push({ kind: ' ', text: a[--x]! })
      y--
    }
    if (x === prevX) ops.push({ kind: '+', text: b[--y]! })
    else ops.push({ kind: '-', text: a[--x]! })
  }
  while (x > 0) ops.push({ kind: ' ', text: a[--x]! })
  ops.reverse()
  // Within each run of changes, removed lines before added ones, as
  // `diff -u` shows a changed line.
  const ordered: Op[] = []
  for (let i = 0; i < ops.length; ) {
    if (ops[i]!.kind === ' ') {
      ordered.push(ops[i++]!)
      continue
    }
    const run: Op[] = []
    while (i < ops.length && ops[i]!.kind !== ' ') run.push(ops[i++]!)
    ordered.push(...run.filter((op) => op.kind === '-'), ...run.filter((op) => op.kind === '+'))
  }
  return ordered
}

/** Line operations turning `a` into `b`, or null when too much changed to diff usefully. */
function lineOps(a: string[], b: string[]): Op[] | null {
  let start = 0
  while (start < a.length && start < b.length && a[start] === b[start]) start++
  let endA = a.length
  let endB = b.length
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--
    endB--
  }
  const middle = myers(a.slice(start, endA), b.slice(start, endB), MAX_EDIT_DISTANCE)
  if (!middle) return null
  const same = (text: string): Op => ({ kind: ' ', text })
  return [...a.slice(0, start).map(same), ...middle, ...a.slice(endA).map(same)]
}

function rendered(op: Op): string {
  const text = `${op.kind}${op.text}`
  return text.endsWith(NO_EOL) ? `${text.slice(0, -1)}\n\\ No newline at end of file` : text
}

/**
 * A unified diff of `before` → `after` (hunks only, no file header), with
 * `context` unchanged lines around each change. Unchanged lines matching
 * `keep` are shown too, as context of their own. Empty when the two
 * match; null when too much changed for a diff to help.
 */
export function unifiedDiff(
  before: string,
  after: string,
  context: number,
  keep?: (line: string) => boolean,
): string | null {
  const ops = lineOps(splitLines(before), splitLines(after))
  if (!ops) return null
  const ranges: Array<[number, number]> = []
  ops.forEach((op, index) => {
    if (op.kind !== ' ') ranges.push([Math.max(0, index - context), Math.min(ops.length - 1, index + context)])
    else if (keep?.(op.text)) ranges.push([index, index])
  })
  if (!ops.some((op) => op.kind !== ' ')) return ''
  // Merge ranges that touch or overlap into one hunk.
  const hunks: Array<[number, number]> = []
  for (const [from, to] of ranges.sort((x, y) => x[0] - y[0])) {
    const last = hunks.at(-1)
    if (last && from <= last[1] + 1) last[1] = Math.max(last[1], to)
    else hunks.push([from, to])
  }
  // Line numbers before each op, 1-based.
  const oldLine: number[] = []
  const newLine: number[] = []
  let o = 1
  let n = 1
  for (const op of ops) {
    oldLine.push(o)
    newLine.push(n)
    if (op.kind !== '+') o++
    if (op.kind !== '-') n++
  }
  return hunks
    .map(([from, to]) => {
      const slice = ops.slice(from, to + 1)
      const oldCount = slice.filter((op) => op.kind !== '+').length
      const newCount = slice.filter((op) => op.kind !== '-').length
      // An empty side is numbered by the line before it, as in `diff -u`.
      const oldStart = oldCount ? oldLine[from]! : oldLine[from]! - 1
      const newStart = newCount ? newLine[from]! : newLine[from]! - 1
      return [`@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`, ...slice.map(rendered)].join('\n')
    })
    .join('\n')
}

function compacted(
  prompt: string,
  path: string,
  before: string,
  after: string,
  options: { minBytes: number; contextLines: number },
): string {
  if (Math.max(Buffer.byteLength(before), Buffer.byteLength(after)) < options.minBytes) return prompt
  const current = `## Current file content\n\n${before}`
  const pending = `## Pending action\n\nFile: ${path}\n\n${after}`
  if (prompt.split(current).length !== 2 || prompt.split(pending).length !== 2) return prompt
  const diff = unifiedDiff(before, after, options.contextLines, (line) => DEPENDENCY_LINE.test(line))
  if (!diff) return prompt
  const lineCount = splitLines(before).length
  const shortCurrent =
    `## Current file content\n\n(${path} exists, ${lineCount} lines; shown here only through the ` +
    'unchanged lines of the diff under "Pending action", to keep this prompt small. Lines the diff ' +
    'does not show are unchanged by this write.)'
  const shortPending =
    `## Pending action\n\nFile: ${path}\n\nUnified diff from the current file content to the content ` +
    `after this write, with up to ${options.contextLines} unchanged lines of context around each change, ` +
    'and the file\'s import and package lines wherever they are. Lines starting with "-" are removed, "+" ' +
    `added, " " unchanged:\n\n${diff}`
  // Functions as replacements, so `$` in source code is taken literally.
  const result = prompt.replace(pending, () => shortPending).replace(current, () => shortCurrent)
  return result.length <= prompt.length * MAX_COMPACTED_SHARE ? result : prompt
}

// The uncompacted prompt of the judge call running now, so a shadow log
// can record the saving and a `wholeFiles` candidate can be asked it.
const uncompacted = new AsyncLocalStorage<string>()

/** The whole-file prompt behind the judge call running now, if this call was compacted. */
export function compactedFrom(): string | undefined {
  return uncompacted.getStore()
}

/**
 * `candidate`, asked the uncompacted prompt whenever the primary got a
 * compacted one, and named `<name>:whole-files`. As a `shadowJudge`
 * candidate on the primary's model it measures what compaction changes:
 * each disagreement is a verdict the diff alone decided differently.
 */
export function wholeFiles(candidate: Agent): Agent {
  const name = `${(candidate as Agent & { name?: string }).name ?? 'candidate'}:whole-files`
  return new Proxy(candidate, {
    get: (target, key, receiver) => {
      if (key === 'name') return name
      if (key === 'reason') return (prompt: string) => target.reason(compactedFrom() ?? prompt)
      return Reflect.get(target, key, receiver)
    },
  })
}

// Marks a rule already wrapped, so a preset's rules wrapped again by a
// config are not compacted twice.
const COMPACTED = Symbol('compactJudgeFiles')

/** `rule`, with its judge sent a diff in place of a large file it is editing. */
export function compactJudgeFiles(rule: Rule, options: CompactJudgeFilesOptions = {}): Rule {
  if ((rule as Rule & { [COMPACTED]?: true })[COMPACTED]) return rule
  const settings = {
    minBytes: options.minBytes ?? DEFAULT_MIN_BYTES,
    contextLines: options.contextLines ?? DEFAULT_CONTEXT_LINES,
  }
  const wrapped: Rule = (action, ctx) => {
    if (action.kind !== 'write' || !ctx?.agent) return rule(action, ctx)
    const agent = ctx.agent
    const reason = async (prompt: string) => {
      // Only a prompt holding this write's file is worth reading the file for.
      if (!prompt.includes(`## Pending action\n\nFile: ${action.path}\n\n`)) return agent.reason(prompt)
      const before = await ctx.readFile?.(action.path)
      const shown =
        before?.kind === 'present' ? compacted(prompt, action.path, before.content, action.content, settings) : prompt
      if (shown === prompt) return agent.reason(prompt)
      const started = Date.now()
      const verdict = await uncompacted.run(prompt, () => agent.reason(shown))
      const record = options.record
      if (record) {
        try {
          if ((record.random ?? Math.random)() < (record.sample ?? 0.1)) {
            const task = judgeTask()
            appendWholePromptRecord(record.log, {
              at: new Date(started).toISOString(),
              ...(task && { task }),
              promptSha256: sha256(shown),
              wholePrompt: prompt,
              primary: {
                name: (agent as Agent & { name?: string }).name ?? 'primary',
                kind: verdict.kind,
                reason: verdict.reason,
                ...(verdict.meta && { meta: verdict.meta }),
                durationMs: Date.now() - started,
              },
            })
          }
        } catch {
          // Measuring must never change enforcement.
        }
      }
      return verdict
    }
    const judge = new Proxy(agent, {
      get: (target, key, receiver) => (key === 'reason' ? reason : Reflect.get(target, key, receiver)),
    })
    const judged = new Proxy(ctx, {
      get: (target, key, receiver) => (key === 'agent' ? judge : Reflect.get(target, key, receiver)),
    }) as RuleContext
    return rule(action, judged)
  }
  // Probity names a rule in its trace and deny text by `name`.
  Object.defineProperty(wrapped, 'name', { value: rule.name })
  Object.defineProperty(wrapped, COMPACTED, { value: true })
  return wrapped
}

/** `entries` with every rule, flat or in a block, wrapped by {@link compactJudgeFiles}. */
export function withCompactJudgeFiles(
  entries: readonly RuleEntry[],
  options: CompactJudgeFilesOptions = {},
): RuleEntry[] {
  return entries.map((entry) =>
    typeof entry === 'function'
      ? compactJudgeFiles(entry, options)
      : { ...entry, rules: entry.rules.map((rule) => compactJudgeFiles(rule, options)) },
  )
}

/** A preset's entries, compacted unless `compactJudgeFiles: false` (the presets' shared option). */
export function compactingPreset(
  entries: RuleEntry[],
  options: { compactJudgeFiles?: false | CompactJudgeFilesOptions },
): RuleEntry[] {
  return options.compactJudgeFiles === false ? entries : withCompactJudgeFiles(entries, options.compactJudgeFiles)
}
