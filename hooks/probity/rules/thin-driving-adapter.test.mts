// Coverage for issue #72: driving adapters (UI components, handlers)
// must be thin. The deterministic discriminant screen is delta-based
// and makes no AI call; the judge's control flow and prompt content
// are pinned here, its verdicts are measured with real-judge replays.
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'

import type { Rule, RuleBlock, RuleContext, RuleEntry } from '@nizos/probity'

import { jsRuleEntries } from '../presets/js.ts'
import {
  domainDiscriminantPatterns,
  enforceThinDrivingAdapter,
  exportedNames,
  forbidNewDomainDiscriminantChecks,
  listCoreExports,
} from './ports-and-adapters.ts'
import { isRuleBlock } from './scoping.ts'

function workspace(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'thin-driving-adapter-test-'))
  for (const [rel, content] of Object.entries(files)) {
    const full = join(dir, rel)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, content)
  }
  return dir
}

function onDisk(content: string | undefined): RuleContext {
  return {
    readFile: async () =>
      content === undefined ? { kind: 'absent' } : { kind: 'present', content },
  }
}

function judgeCtx(
  content: string | undefined,
  verdict: { kind: 'pass' | 'violation'; reason: string },
  prompts: string[] = [],
): RuleContext {
  return {
    ...onDisk(content),
    agent: {
      reason: async (prompt: string) => {
        prompts.push(prompt)
        return verdict
      },
    },
  } as RuleContext
}

const write = (content: string, path = '/repo/src/ui/TimesheetPage.tsx') =>
  ({ kind: 'write', path, content }) as const

// ── Discriminant patterns ──────────────────────────────────────────

test('domainDiscriminantPatterns matches a literal comparison in either order', () => {
  const [role] = domainDiscriminantPatterns(['role'])
  const hits = (text: string) => [...text.matchAll(role!.pattern)].length
  assert.equal(hits(`if (viewer.role === 'SuperUser') {}`), 1)
  assert.equal(hits(`viewer?.role !== "Manager"`), 1)
  assert.equal(hits('role == `Admin`'), 1)
  assert.equal(hits(`'SuperUser' === viewer.role`), 1)
  assert.equal(hits(`"Manager" != invitee?.role`), 1)
})

test('domainDiscriminantPatterns ignores look-alikes that are not literal comparisons', () => {
  const [role] = domainDiscriminantPatterns(['role'])
  const hits = (text: string) => [...text.matchAll(role!.pattern)].length
  assert.equal(hits(`roleName === 'x'`), 0)
  assert.equal(hits(`{ role: 'SuperUser' }`), 0)
  assert.equal(hits('viewer.role === otherViewer.role'), 0)
  assert.equal(hits(`canApprove(viewer.role)`), 0)
})

// ── forbidNewDomainDiscriminantChecks ──────────────────────────────

test('a net-new role comparison in a driving adapter is blocked, naming the fix', async () => {
  const rule = forbidNewDomainDiscriminantChecks({
    discriminants: ['role'],
    domainHint: 'permission rules live in src/domain/permissions.ts',
  })
  const result = await rule(
    write(`const canDelete = viewer.role === 'SuperUser'`),
    onDisk(undefined),
  )
  assert.equal(result.kind, 'violation')
  assert.match(result.reason ?? '', /role compared to a literal/)
  assert.match(result.reason ?? '', /Add a function to the domain/)
  assert.match(result.reason ?? '', /src\/domain\/permissions\.ts/)
})

test('an existing comparison does not block an unrelated edit (delta-based)', async () => {
  const rule = forbidNewDomainDiscriminantChecks({ discriminants: ['role'] })
  const before = `const a = viewer.role === 'SuperUser'\n`
  const result = await rule(write(`${before}const title = 'Timesheets'\n`), onDisk(before))
  assert.equal(result.kind, 'pass')
})

test('adding a second comparison to a file that already has one is blocked', async () => {
  const rule = forbidNewDomainDiscriminantChecks({ discriminants: ['role'] })
  const before = `const a = viewer.role === 'SuperUser'\n`
  const result = await rule(
    write(`${before}const b = viewer.role === 'SuperUser'\n`),
    onDisk(before),
  )
  assert.equal(result.kind, 'violation')
})

test('a field not listed as a discriminant never blocks (no default list)', async () => {
  const rule = forbidNewDomainDiscriminantChecks({ discriminants: ['role'] })
  const result = await rule(write(`if (status === 'loading') return null`), onDisk(undefined))
  assert.equal(result.kind, 'pass')
})

test('calling a domain function instead passes', async () => {
  const rule = forbidNewDomainDiscriminantChecks({ discriminants: ['role'] })
  const before = `const a = viewer.role === 'SuperUser'\n`
  const result = await rule(write(`const a = canDelete(viewer)\n`), onDisk(before))
  assert.equal(result.kind, 'pass')
})

// ── Core export list ───────────────────────────────────────────────

test('exportedNames reads declarations and export lists', () => {
  const names = exportedNames(
    [
      'export function canEdit(actor) {}',
      'export async function submit() {}',
      'export const assignableRoles = []',
      'export type Role = string',
      'export default class Timesheet {}',
      'export { displayName, formatName as fullName, type Viewer }',
      'function internal() {}',
    ].join('\n'),
  )
  assert.deepEqual(names.sort(), [
    'Role',
    'Timesheet',
    'Viewer',
    'assignableRoles',
    'canEdit',
    'displayName',
    'fullName',
    'submit',
  ])
})

test('listCoreExports lists core modules only, skipping tests and other layers', () => {
  const root = workspace({
    'src/domain/roles.ts': 'export function canApprove() {}\nexport function canEdit() {}',
    'src/domain/roles.test.ts': 'export const fixture = 1',
    'src/ui/Page.tsx': 'export function Page() {}',
    'node_modules/x/src/domain/y.ts': 'export const vendored = 1',
  })
  assert.equal(
    listCoreExports({ globs: ['src/domain/**'], root, maxChars: 8000 }),
    'src/domain/roles.ts: canApprove, canEdit',
  )
})

test('listCoreExports truncates beyond maxChars', () => {
  const root = workspace({ 'src/domain/a.ts': 'export const aVeryLongExportName = 1' })
  const text = listCoreExports({ globs: ['src/domain/**'], root, maxChars: 10 })
  assert.match(text, /^src\/domain\n\(\.\.\.export list truncated\.\.\.\)$/)
})

// ── enforceThinDrivingAdapter ──────────────────────────────────────

test('the judge fails closed without an AI agent', async () => {
  const result = await enforceThinDrivingAdapter()(write('x'), onDisk(undefined))
  assert.equal(result.kind, 'violation')
  assert.match(result.reason ?? '', /no AI agent available/)
})

test('the judge sees the rules, the before and after, and the allow-list', async () => {
  const prompts: string[] = []
  const result = await enforceThinDrivingAdapter()(
    write('const after = 1'),
    judgeCtx('const before = 1', { kind: 'pass', reason: '' }, prompts),
  )
  assert.equal(result.kind, 'pass')
  const prompt = prompts[0] ?? ''
  assert.match(prompt, /A decision expressed in domain terms/)
  assert.match(prompt, /more than one port or use-case call/)
  assert.match(prompt, /re-implementation of something the core already exports/)
  assert.match(prompt, /A use case filed as an adapter/)
  assert.match(prompt, /Calling ONE use case or port per user intent/)
  assert.match(prompt, /## Current file content\n\nconst before = 1/)
  assert.match(prompt, /File: \/repo\/src\/ui\/TimesheetPage\.tsx\n\nconst after = 1/)
  assert.doesNotMatch(prompt, /## Core exports/)
  assert.match(prompt, /"reason":"<your analysis>","kind":"pass"\|"violation"/)
})

test('the judge is told a display condition over the shown rows passes (#159)', async () => {
  const prompts: string[] = []
  await enforceThinDrivingAdapter()(
    write('const after = 1'),
    judgeCtx('', { kind: 'pass', reason: '' }, prompts),
  )
  const prompt = prompts[0] ?? ''
  assert.match(prompt, /display condition over the data the view already holds/)
  assert.match(prompt, /a single item, the first or last row/)
  assert.match(prompt, /a rule the core enforces/)
})

test('a judge violation is returned as the block reason', async () => {
  const result = await enforceThinDrivingAdapter()(
    write('x'),
    judgeCtx(undefined, { kind: 'violation', reason: 'Extract a submitTimesheet use case.' }),
  )
  assert.deepEqual(result, { kind: 'violation', reason: 'Extract a submitTimesheet use case.' })
})

test('with coreExports set, the judge is given the core export list', async () => {
  const root = workspace({ 'src/domain/roles.ts': 'export function canApprove() {}' })
  const prompts: string[] = []
  await enforceThinDrivingAdapter({ coreExports: { globs: ['src/domain/**'], root } })(
    write('x'),
    judgeCtx(undefined, { kind: 'pass', reason: '' }, prompts),
  )
  assert.match(prompts[0] ?? '', /## Core exports\n\nsrc\/domain\/roles\.ts: canApprove/)
})

test('instructions can extend the default rules', async () => {
  const prompts: string[] = []
  await enforceThinDrivingAdapter({
    instructions: (defaults) => `${defaults}\n\n### Project layout\n\nUse cases live in src/app.`,
  })(write('x'), judgeCtx(undefined, { kind: 'pass', reason: '' }, prompts))
  assert.match(prompts[0] ?? '', /A decision expressed in domain terms[\s\S]*Use cases live in src\/app/)
})

// ── JS preset wiring ───────────────────────────────────────────────

function blockIndex(entries: readonly RuleEntry[], name: string): number {
  return entries.findIndex(
    (entry) => isRuleBlock(entry) && (entry.rules ?? []).some((r: Rule) => r.name === name),
  )
}

function block(entries: readonly RuleEntry[], name: string): RuleBlock | undefined {
  const index = blockIndex(entries, name)
  return index < 0 ? undefined : (entries[index] as RuleBlock)
}

test('jsRuleEntries holds UI files thin by default, before the TDD judge', () => {
  const entries = jsRuleEntries()
  const thin = block(entries, 'enforceThinDrivingAdapter')
  assert.ok(thin, 'expected an enforceThinDrivingAdapter block')
  assert.deepEqual(
    [...(thin.files ?? [])].slice(0, 6),
    ['src/ui/**', 'src/components/**', 'src/**/*.tsx', '!**/*.test.*', '!**/*.spec.*', '!**/*.stories.*'],
  )
  assert.deepEqual(
    thin.rules?.map((r) => r.name),
    ['enforceThinDrivingAdapter'],
    'no discriminant screen without domainDiscriminants',
  )
  assert.ok(
    blockIndex(entries, 'enforceThinDrivingAdapter') < blockIndex(entries, 'enforceTdd'),
    'the thinness judge must run before the TDD judge',
  )
})

test('domainDiscriminants puts the free screen first in the block', async () => {
  const entries = jsRuleEntries({ domainDiscriminants: ['role'], domainHint: 'see src/domain' })
  const thin = block(entries, 'enforceThinDrivingAdapter')
  assert.deepEqual(thin?.rules?.map((r) => r.name), [
    'forbidNewDomainDiscriminantChecks',
    'enforceThinDrivingAdapter',
  ])
  const screen = thin!.rules![0]!
  const result = await screen(write(`viewer.role === 'SuperUser'`), onDisk(undefined))
  assert.equal(result.kind, 'violation')
  assert.match(result.reason ?? '', /see src\/domain/)
})

test('core globs are excluded from the driving-adapter block', () => {
  const thin = block(jsRuleEntries({ coreGlobs: ['src/model/**'] }), 'enforceThinDrivingAdapter')
  assert.ok(thin?.files?.includes('!src/model/**'))
})

test('drivingAdapterGlobs: [] switches the thinness rules off', () => {
  const entries = jsRuleEntries({ drivingAdapterGlobs: [] })
  assert.equal(blockIndex(entries, 'enforceThinDrivingAdapter'), -1)
})

test('excludeGlobs reach the driving-adapter block', () => {
  const thin = block(jsRuleEntries(), 'enforceThinDrivingAdapter')
  assert.ok(thin?.files?.includes('!spikes/**'))
})

test('coreExportsInJudge gives the preset judge the coreGlobs export list', async () => {
  const root = workspace({ 'src/domain/names.ts': 'export function displayName() {}' })
  const cwd = process.cwd()
  process.chdir(root)
  try {
    const thin = block(jsRuleEntries({ coreExportsInJudge: true }), 'enforceThinDrivingAdapter')
    const judge = thin!.rules!.at(-1)!
    const prompts: string[] = []
    await judge(write('x'), judgeCtx(undefined, { kind: 'pass', reason: '' }, prompts))
    assert.match(prompts[0] ?? '', /src\/domain\/names\.ts: displayName/)
  } finally {
    process.chdir(cwd)
  }
})
