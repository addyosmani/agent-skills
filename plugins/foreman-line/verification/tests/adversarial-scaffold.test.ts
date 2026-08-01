/**
 * W3-P2 scaffold + probe-proxy + static-guarantee tests: AC-1..AC-4, AC-20,
 * AC-21.
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { PACKAGE_ROOT } from './helpers.js'

// ─── AC-1: headless-launch probe evidence (hermetic proxy) ───────────────────
// The probe itself is an integration/spike deliverable run outside the unit
// suite; this proxy asserts its recorded evidence exists with an explicit
// verdict line (per the spec's AC-1 hermetic-proxy clause).

test('AC-1: PROBE-HEADLESS.md exists and records an explicit Verdict: PASS or Verdict: FAIL', () => {
  const probePath = join(PACKAGE_ROOT, 'PROBE-HEADLESS.md')
  assert.ok(existsSync(probePath), 'PROBE-HEADLESS.md must exist')
  const text = readFileSync(probePath, 'utf8')
  const hasPass = text.includes('Verdict: PASS')
  const hasFail = text.includes('Verdict: FAIL')
  assert.ok(hasPass || hasFail, 'must contain an explicit Verdict: PASS or Verdict: FAIL line')
  // The evidence must be from the headless mode, fixture-isolated.
  assert.ok(text.includes('claude -p'), 'probe evidence covers headless mode')
  assert.ok(text.includes('reviewer-readonly'), 'negative control recorded')
  assert.ok(text.includes('builder-standard'), 'positive control recorded')
})

// ─── AC-2: no rescaffold — configs byte-unchanged from main ──────────────────

const hasOriginVerificationBaseline =
  spawnSync(
    'git',
    ['cat-file', '-e', 'origin/main:plugins/foreman-line/verification/package.json'],
    { cwd: PACKAGE_ROOT, stdio: 'ignore' },
  ).status === 0

test('AC-2: src/adversarial exists and package.json/tsconfig.json/biome.json are byte-unchanged from origin/main', {
  skip: !hasOriginVerificationBaseline,
}, () => {
  assert.ok(existsSync(join(PACKAGE_ROOT, 'src', 'adversarial', 'index.ts')))
  for (const name of ['package.json', 'tsconfig.json', 'biome.json']) {
    // origin/main, not a possibly-stale local main (RB-4 / amended AC-2).
    const mainVersion = spawnSync(
      'git',
      ['show', `origin/main:plugins/foreman-line/verification/${name}`],
      { cwd: PACKAGE_ROOT, encoding: 'utf8' },
    )
    assert.equal(mainVersion.status, 0, `git show origin/main:${name} must succeed`)
    const current = readFileSync(join(PACKAGE_ROOT, name), 'utf8')
    assert.equal(current, mainVersion.stdout, `${name} must be byte-identical to origin/main`)
  }
})

// ─── AC-3 / AC-4: toolchain gates (config-pinned proxies) ────────────────────
// The authoritative checks are `npx tsc --noEmit` and `npx biome check .`,
// run in the deterministic pass; AC-2 above pins both configs to main.

test('AC-3: tsconfig is unchanged (authoritative check: npx tsc --noEmit passes in the deterministic pass)', () => {
  const ours = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'tsconfig.json'), 'utf8')) as Record<
    string,
    unknown
  >
  assert.ok(ours.compilerOptions, 'tsconfig still declares compilerOptions')
})

test('AC-4: biome config is unchanged (authoritative check: npx biome check . passes in the deterministic pass)', () => {
  const ours = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'biome.json'), 'utf8')) as Record<
    string,
    unknown
  >
  assert.ok(ours.linter, 'biome.json still declares the linter block')
})

// ─── AC-20: scope greps over src/adversarial ─────────────────────────────────

test('AC-20: src/adversarial performs no git operation, Jira call, verdict assembly, or findings triage', () => {
  const dir = join(PACKAGE_ROOT, 'src', 'adversarial')
  const forbidden = [
    'child_process',
    'execSync',
    'execFile',
    'spawnSync',
    'spawn(',
    'simple-git',
    'git commit',
    'git push',
    'git checkout',
    'jira',
    'Jira',
    'JIRA',
    'atlassian',
    'reworkSignal',
    'verdict:',
  ]
  for (const name of readdirSync(dir)) {
    const text = readFileSync(join(dir, name), 'utf8')
    for (const token of forbidden) {
      assert.ok(
        !text.includes(token),
        `src/adversarial/${name} contains forbidden token '${token}'`,
      )
    }
  }
})

// ─── AC-21: dogfood — every AC-1..AC-21 named by at least one test ───────────

/** Token-boundary check mirroring AC-CONVENTION §4 (linear scan, no regex). */
function namesAc(text: string, acNumber: number): boolean {
  let from = 0
  while (from < text.length) {
    const idx = text.indexOf('AC-', from)
    if (idx === -1) return false
    from = idx + 3
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

test('AC-21: every AC-1..AC-29 label from the W3-P2 spec (as amended) is named by at least one adversarial test', () => {
  const testsDir = join(PACKAGE_ROOT, 'tests')
  const adversarialTestText = readdirSync(testsDir)
    .filter((name) => name.startsWith('adversarial-') && name.endsWith('.test.ts'))
    .map((name) => readFileSync(join(testsDir, name), 'utf8'))
    .join('\n')
  for (let n = 1; n <= 29; n++) {
    assert.ok(namesAc(adversarialTestText, n), `no adversarial test names AC-${n}`)
  }
})
