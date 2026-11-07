import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const SCRIPT = join(HERE, 'scope-report.ts')
const TSX = join(HERE, '..', 'node_modules', '.bin', 'tsx')

// Rule names are all the report sees, so plain named functions stand
// in for the real rules.
const CONFIG = `
function forbidContentPattern() { return { kind: 'pass' } }
export default {
  rules: [
    { files: ${JSON.stringify(['**/src/test/**'])}, rules: [forbidContentPattern] },
    { files: ${JSON.stringify(['**/src/main/**'])}, rules: [forbidContentPattern] },
  ],
}
`

function workspace(t, files) {
  const dir = mkdtempSync(join(tmpdir(), 'scope-report-test-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  for (const [rel, content] of Object.entries(files)) {
    const full = join(dir, rel)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, content)
  }
  return dir
}

function report(dir) {
  const res = spawnSync(TSX, [SCRIPT, '--root', dir, '--config', join(dir, 'probity.config.mjs')], {
    encoding: 'utf8',
  })
  return (res.stdout ?? '') + (res.stderr ?? '')
}

test('a test-wide content screen over adapter tests is not flagged as core purity', (t) => {
  const dir = workspace(t, {
    'probity.config.mjs': CONFIG,
    'sdk/src/test/kotlin/adapter/HttpAdapterTest.kt': 'class HttpAdapterTest',
    'sdk/src/test/kotlin/di/ModuleTest.kt': 'class ModuleTest',
    'sdk/src/main/kotlin/domain/PathId.kt': 'object PathId',
  })
  const out = report(dir)
  assert.match(out, /No scoping warnings\./, out)
})

test('a core-purity rule claiming production adapter code is still flagged', (t) => {
  const dir = workspace(t, {
    'probity.config.mjs': CONFIG,
    'sdk/src/test/kotlin/adapter/HttpAdapterTest.kt': 'class HttpAdapterTest',
    'sdk/src/main/kotlin/adapter/HttpAdapter.kt': 'class HttpAdapter',
  })
  const out = report(dir)
  assert.match(out, /block 2 \[forbidContentPattern\] claims 1 adapter\/DI\/UI-looking file/, out)
  assert.match(out, /src\/main\/kotlin\/adapter\/HttpAdapter\.kt/, out)
  assert.doesNotMatch(out, /block 1 \[forbidContentPattern\] claims/, out)
})

function strictReport(dir, extra = []) {
  const res = spawnSync(
    TSX,
    [SCRIPT, '--root', dir, '--config', join(dir, 'probity.config.mjs'), '--strict', ...extra],
    { encoding: 'utf8' },
  )
  return { code: res.status, out: (res.stdout ?? '') + (res.stderr ?? '') }
}

const GREENFIELD_CONFIG = `
function enforceTdd() { return { kind: 'pass' } }
export default {
  rules: [
    { files: ['src/core/**'], rules: [enforceTdd] },
    { files: ['src/adapters/**'], rules: [enforceTdd] },
  ],
}
`

test('--allow-empty lets a greenfield scope pass --strict', (t) => {
  const dir = workspace(t, {
    'probity.config.mjs': GREENFIELD_CONFIG,
    'src/core/Thing.ts': 'export {}',
  })
  const failing = strictReport(dir)
  assert.equal(failing.code, 1, failing.out)
  assert.match(failing.out, /DEAD SCOPE: block 2/, failing.out)

  const passing = strictReport(dir, ['--allow-empty', 'src/adapters/**'])
  assert.equal(passing.code, 0, passing.out)
  assert.match(passing.out, /empty \(expected, --allow-empty\)/, passing.out)
})

test('--allow-empty only exempts the block that lists the glob', (t) => {
  const dir = workspace(t, { 'probity.config.mjs': GREENFIELD_CONFIG })
  const out = strictReport(dir, ['--allow-empty', 'src/adapters/**'])
  assert.equal(out.code, 1, out.out)
  assert.match(out.out, /DEAD SCOPE: block 1/, out.out)
  assert.doesNotMatch(out.out, /DEAD SCOPE: block 2/, out.out)
})

test('a stale --allow-empty is noted without failing; a misspelt one warns', (t) => {
  const dir = workspace(t, {
    'probity.config.mjs': GREENFIELD_CONFIG,
    'src/core/Thing.ts': 'export {}',
    'src/adapters/Http.ts': 'export {}',
  })
  const stale = strictReport(dir, ['--allow-empty', 'src/adapters/**'])
  assert.equal(stale.code, 0, stale.out)
  assert.match(stale.out, /still marked --allow-empty src\/adapters\/\*\*; drop the flag/, stale.out)

  const typo = strictReport(dir, ['--allow-empty', 'src/adapter/**'])
  assert.equal(typo.code, 1, typo.out)
  assert.match(typo.out, /--allow-empty src\/adapter\/\*\* matches no block's files glob/, typo.out)
})

// Issue #72: the JS preset's thin-driving-adapter block is reported
// like any other, flagged when its globs match nothing, and not
// mistaken for a core-purity rule pointed at UI files.
const JS_PRESET_CONFIG = `
import { jsRuleEntries } from ${JSON.stringify(join(HERE, '..', 'presets', 'js.ts'))}
export default { rules: jsRuleEntries({ domainDiscriminants: ['role'] }) }
`

test('the JS preset reports its driving-adapter block, flagging it when no UI files exist', (t) => {
  const dir = workspace(t, {
    'probity.config.mjs': JS_PRESET_CONFIG,
    'src/core/timesheet.ts': 'export {}',
  })
  const out = report(dir)
  assert.match(
    out,
    /DEAD SCOPE: block \d+ \[forbidNewDomainDiscriminantChecks, enforceThinDrivingAdapter\] matches no files/,
    out,
  )
})

test('the JS preset driving-adapter block claims UI files without a core-purity warning', (t) => {
  const dir = workspace(t, {
    'probity.config.mjs': JS_PRESET_CONFIG,
    'src/core/timesheet.ts': 'export {}',
    'src/ui/TimesheetPage.tsx': 'export {}',
    'src/ui/TimesheetPage.test.tsx': 'export {}',
  })
  const out = report(dir)
  assert.doesNotMatch(out, /DEAD SCOPE: block \d+ \[forbidNewDomainDiscriminantChecks/, out)
  assert.doesNotMatch(out, /enforceThinDrivingAdapter\] claims/, out)
  assert.match(
    out,
    /\[forbidNewDomainDiscriminantChecks, enforceThinDrivingAdapter\][\s\S]*?→ 1 file\(s\)\n\s+src\/ui\/TimesheetPage\.tsx\n/,
    out,
  )
})

// Issue #76: the KMP preset's driving-adapter block is opt-in. Unset,
// a core-only repo gets no block (so no DEAD SCOPE); set to a CLI
// module, it claims the commands and not the core.
function kmpConfig(options) {
  return `
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { kmpRuleEntries } from ${JSON.stringify(join(HERE, '..', 'presets', 'kmp.ts'))}
const ROOT = dirname(fileURLToPath(import.meta.url))
export default { rules: kmpRuleEntries(ROOT, ${JSON.stringify(options)}) }
`
}

test('the KMP preset wires no driving-adapter block unless drivingAdapterGlobs is set', (t) => {
  const dir = workspace(t, {
    'probity.config.mjs': kmpConfig({}),
    'sdk/src/commonMain/kotlin/x/domain/Viewer.kt': 'class Viewer',
  })
  const out = report(dir)
  assert.doesNotMatch(out, /enforceThinDrivingAdapter/, out)
})

test('the KMP preset driving-adapter block claims CLI commands, not the core', (t) => {
  const dir = workspace(t, {
    'probity.config.mjs': kmpConfig({
      coreGlobs: ['**/src/commonMain/**/domain/**'],
      drivingAdapterGlobs: ['cli/src/main/**/commands/**'],
      domainDiscriminants: ['role'],
    }),
    'sdk/src/commonMain/kotlin/x/domain/Viewer.kt': 'class Viewer',
    'cli/src/main/kotlin/x/commands/SudosCommand.kt': 'class SudosCommand',
    'cli/src/main/kotlin/x/Composition.kt': 'interface Composition',
  })
  const out = report(dir)
  assert.match(
    out,
    /\[forbidNewDomainDiscriminantChecks, enforceThinDrivingAdapter\][\s\S]*?→ 1 file\(s\)\n\s+cli\/src\/main\/kotlin\/x\/commands\/SudosCommand\.kt\n/,
    out,
  )
  assert.doesNotMatch(out, /DEAD SCOPE: block \d+ \[forbidNewDomainDiscriminantChecks/, out)
})

// Issue #181: exemption obligations at setup time.
const REVIEWED_CONFIG = `
import { reviewedBlock } from '${join(HERE, '..', 'rules', 'review-obligations.ts')}'
function enforceKotlinTdd() { return { kind: 'pass' } }
export default {
  rules: [
    reviewedBlock({
      files: ['ui/**', { glob: '!ui/**/*Screen.kt', id: 'thin-rendering', reviewWith: 'code-reviewer', check: 'renders only', reason: 'thin' }, '!ui/**/Browser*.kt'],
      rules: [enforceKotlinTdd],
    }),
  ],
}
`

test('lists each review obligation with the files it covers', (t) => {
  const dir = workspace(t, {
    'probity.config.mjs': REVIEWED_CONFIG,
    'ui/notes/NotesScreen.kt': 'x',
    'ui/notes/NotesViewModel.kt': 'x',
  })
  const out = report(dir)
  assert.match(out, /Review obligations:\n\s+thin-rendering \(code-reviewer\): !ui\/\*\*\/\*Screen\.kt {2}\(1\)/, out)
})

test('warns about a TDD exemption that declares no review obligation', (t) => {
  const dir = workspace(t, { 'probity.config.mjs': REVIEWED_CONFIG, 'ui/notes/NotesScreen.kt': 'x' })
  const res = strictReport(dir)
  assert.equal(res.code, 1, res.out)
  assert.match(res.out, /!ui\/\*\*\/Browser\*\.kt is exempt with no review obligation/, res.out)
})
