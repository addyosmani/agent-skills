/**
 * W3-P1 scaffold + static-guarantee tests: AC-1..AC-4, AC-14, AC-15, AC-16, AC-17.
 */
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import * as api from '../src/index.js'
import { PACKAGE_ROOT } from './helpers.js'

const DISPATCH_ROOT = join(PACKAGE_ROOT, '..', 'dispatch')

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
}

function readSrcFiles(): { readonly path: string; readonly text: string }[] {
  const files: { path: string; text: string }[] = []
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.ts'))
        files.push({ path: full, text: readFileSync(full, 'utf8') })
    }
  }
  walk(join(PACKAGE_ROOT, 'src'))
  return files
}

// ─── AC-1: package scaffold ───────────────────────────────────────────────────

test('AC-1: verification package scaffold matches the W1/W2 sibling pattern', () => {
  const pkg = readJson(join(PACKAGE_ROOT, 'package.json'))
  assert.equal(pkg.name, '@foreman-line/verification')
  assert.equal(pkg.private, true)
  assert.equal(pkg.type, 'module')
  assert.deepEqual(pkg.engines, { node: '>=24.11.1' })
  assert.deepEqual(pkg.exports, { '.': './src/index.ts' })
  const scripts = pkg.scripts as Record<string, string>
  assert.equal(scripts.typecheck, 'tsc --noEmit')
  assert.equal(scripts.test, 'tsx --test tests/*.test.ts')
  assert.equal(scripts.lint, 'biome check .')
  const deps = pkg.dependencies as Record<string, string>
  assert.deepEqual(Object.keys(deps).sort(), ['ajv', 'yaml'])
  const dispatchPkg = readJson(join(DISPATCH_ROOT, 'package.json'))
  const dispatchDeps = dispatchPkg.dependencies as Record<string, string>
  assert.equal(deps.ajv, dispatchDeps.ajv)
  assert.equal(deps.yaml, dispatchDeps.yaml)
  assert.deepEqual(pkg.devDependencies, dispatchPkg.devDependencies)
  assert.ok(existsSync(join(PACKAGE_ROOT, 'src', 'index.ts')))
  assert.ok(existsSync(join(PACKAGE_ROOT, 'src', 'harness', 'index.ts')))
})

// ─── AC-2 / AC-3: toolchain configs identical to dispatch/ ───────────────────
// The authoritative checks are `npx tsc --noEmit` and `npx biome check .`
// (run in the Verification Plan); these tests pin the configs to dispatch/'s.

test('AC-2: tsconfig compilerOptions are identical to dispatch/ (tsc --noEmit runs clean)', () => {
  const ours = readJson(join(PACKAGE_ROOT, 'tsconfig.json'))
  const dispatch = readJson(join(DISPATCH_ROOT, 'tsconfig.json'))
  assert.deepEqual(ours.compilerOptions, dispatch.compilerOptions)
  assert.deepEqual(ours.include, dispatch.include)
})

test('AC-3: biome.json is identical to dispatch/ (biome check . runs clean)', () => {
  const ours = readJson(join(PACKAGE_ROOT, 'biome.json'))
  const dispatch = readJson(join(DISPATCH_ROOT, 'biome.json'))
  assert.deepEqual(ours, dispatch)
})

// ─── AC-4: public exports ─────────────────────────────────────────────────────

test('AC-4: src/index.ts exports the three functions, VerificationError, and AC_CONVENTION_PATH', () => {
  assert.equal(typeof api.recordBuildResult, 'function')
  assert.equal(typeof api.allocateSequence, 'function')
  assert.equal(typeof api.runHarness, 'function')
  assert.equal(typeof api.VerificationError, 'function')
  assert.equal(api.AC_CONVENTION_PATH, 'plugins/foreman-line/verification/AC-CONVENTION.md')
  // Type exports are proven by compilation: these annotations fail tsc if absent.
  const testResults: api.TestResults = { passed: [], failed: [] }
  const checkResult: api.MatrixCheckResult = { passed: true, evidence: 'x' }
  const check: api.MatrixCheck = async () => checkResult
  const checkSet: api.MatrixCheckSet = { 'test-coverage.check': check }
  // Use each variable to prove tsc sees it (functions: always truthy, so use typeof)
  assert.ok(typeof testResults === 'object')
  assert.ok(typeof checkResult === 'object')
  assert.ok(typeof check === 'function')
  assert.ok(typeof checkSet === 'object')
})

// ─── AC-14: linear-time string ops (grep over src/) ──────────────────────────

test('AC-14: no backtracking-prone regex is applied to spec-body or test-name text in src/', () => {
  for (const { path, text } of readSrcFiles()) {
    assert.ok(!text.includes('new RegExp'), `${path} constructs a RegExp`)
    assert.ok(!text.includes('.match('), `${path} uses String.prototype.match`)
    assert.ok(!text.includes('.replace(/'), `${path} uses a regex replace`)
    assert.ok(!text.includes('.split(/'), `${path} uses a regex split`)
    assert.ok(!text.includes('.test('), `${path} calls a regex .test()`)
  }
})

// ─── AC-15: AC-CONVENTION.md exists and AC_CONVENTION_PATH points at it ──────

test('AC-15: AC-CONVENTION.md documents the named-test convention and matches AC_CONVENTION_PATH', () => {
  const conventionPath = join(PACKAGE_ROOT, 'AC-CONVENTION.md')
  assert.ok(existsSync(conventionPath))
  const text = readFileSync(conventionPath, 'utf8')
  assert.ok(text.includes('Authoring rule'), 'documents authoring rules')
  assert.ok(text.includes('token'), 'documents token-boundary matching')
  assert.ok(text.includes('no test references AC-N'), 'documents the per-AC reporting table')
  assert.ok(text.includes('matrix:'), 'documents matrix-check reporting')
  assert.ok(
    api.AC_CONVENTION_PATH.endsWith('verification/AC-CONVENTION.md'),
    'constant is the repo-relative path of this file',
  )
})

// ─── AC-16: every AC-N is named by at least one test (dogfood) ───────────────

/** Extract test description strings from a .test.ts source file. */
function extractTestNames(source: string): string[] {
  const names: string[] = []
  let pos = 0
  while (pos < source.length) {
    // Find 'test(' or 'test.skip(' etc — look for `test('` or `test("`
    const singleIdx = source.indexOf("test('", pos)
    const doubleIdx = source.indexOf('test("', pos)
    let idx: number
    let quote: string
    if (singleIdx === -1 && doubleIdx === -1) break
    if (singleIdx === -1) {
      idx = doubleIdx
      quote = '"'
    } else if (doubleIdx === -1) {
      idx = singleIdx
      quote = "'"
    } else if (singleIdx < doubleIdx) {
      idx = singleIdx
      quote = "'"
    } else {
      idx = doubleIdx
      quote = '"'
    }
    const nameStart = idx + 6 // past `test('`
    const nameEnd = source.indexOf(quote, nameStart)
    if (nameEnd === -1) {
      pos = idx + 1
      continue
    }
    names.push(source.slice(nameStart, nameEnd))
    pos = nameEnd + 1
  }
  return names
}

/** Token-boundary check mirroring AC-CONVENTION §4 (linear scan, no regex). */
function namesAc(text: string, acNumber: number): boolean {
  let from = 0
  while (from < text.length) {
    const idx = text.indexOf('AC-', from)
    if (idx === -1) return false
    from = idx + 3
    // Left-boundary check: reject if char before 'AC-' is alphanumeric
    if (idx > 0) {
      const prevCode = text.charCodeAt(idx - 1)
      if (
        (prevCode >= 65 && prevCode <= 90) ||
        (prevCode >= 97 && prevCode <= 122) ||
        (prevCode >= 48 && prevCode <= 57)
      ) {
        from = idx + 1
        continue
      }
    }
    let i = idx + 3
    let value = 0
    let digits = 0
    while (i < text.length && text.charCodeAt(i) >= 48 && text.charCodeAt(i) <= 57) {
      value = value * 10 + (text.charCodeAt(i) - 48)
      i += 1
      digits += 1
    }
    if (digits > 0 && value === acNumber) return true
    from = i
  }
  return false
}

test('AC-16: every AC-1..AC-17 label from the W3-P1 spec is named by at least one test', () => {
  const testsDir = join(PACKAGE_ROOT, 'tests')
  const allTestNames = readdirSync(testsDir)
    .filter((name) => name.endsWith('.test.ts'))
    .flatMap((name) => extractTestNames(readFileSync(join(testsDir, name), 'utf8')))
    .join('\n')
  for (let n = 1; n <= 17; n++) {
    assert.ok(namesAc(allTestNames, n), `no test names AC-${n}`)
  }
})

// ─── AC-17: no git / Jira / agent-session calls in src/ ──────────────────────
// Scope note (W3-P4): src/human-gate/ is the spec-mandated Stage-D.4 Jira
// surface (injected HumanGateJiraTransport; W3-P4 AC-20 owns its scope grep),
// so the W3-P1 Jira ban applies to every OTHER src/ sub-module.

test('AC-17: grep over src/ (excluding the W3-P4 human-gate sub-module) finds no git operation, Jira call, or agent-session spawn', () => {
  const forbidden = [
    'child_process',
    'execSync',
    'execFile',
    'spawnSync',
    'spawn(',
    'simple-git',
    'jira',
    'Jira',
    'JIRA',
    'atlassian',
    'agent-session',
    'claude -p',
  ]
  const humanGateDir = join(PACKAGE_ROOT, 'src', 'human-gate')
  // The barrel re-exports the W3-P4 names (AC-4 of that spec) — name-only,
  // no Jira call — so it is likewise excluded from the token ban.
  const barrelPath = join(PACKAGE_ROOT, 'src', 'index.ts')
  for (const { path, text } of readSrcFiles().filter(
    (file) => !file.path.startsWith(humanGateDir) && file.path !== barrelPath,
  )) {
    for (const token of forbidden) {
      assert.ok(!text.includes(token), `${path} contains forbidden token '${token}'`)
    }
  }
})
