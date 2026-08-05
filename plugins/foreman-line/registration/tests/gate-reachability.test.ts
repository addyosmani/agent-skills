/**
 * AC2: adapter-injection + gate-reachability. The package exports a
 * registration function taking an injected `JiraTransport`, and there is NO
 * code path that calls `adapter.createIssue`/`updateIssue`/`addRemoteLink`
 * without `assertRegistrationGate` having run first - the raw adapter is
 * reachable only through the gated wrapper. Proven structurally over `src/`
 * plus behaviourally (a fake recording adapter drives a full run; no network).
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { register } from '../src/register.js'
import { FakeAdapter, singleStoryFixture } from './helpers.js'

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(packageDir, 'src')

function collectTsFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...collectTsFiles(full))
    else if (entry.name.endsWith('.ts')) out.push(full)
  }
  return out
}

const MUTATING_CALL = /\.(createIssue|updateIssue|addRemoteLink)\s*\(/g

test('AC2: every mutating adapter call in src lives ONLY in gated-transport.ts', () => {
  for (const file of collectTsFiles(srcDir)) {
    const text = readFileSync(file, 'utf8')
    const matches = text.match(MUTATING_CALL) ?? []
    if (matches.length > 0) {
      assert.ok(
        file.endsWith('gated-transport.ts'),
        `${file} calls a mutating adapter method (${matches.join(', ')}) outside the gated wrapper`,
      )
    }
  }
})

test('AC2: in the gated wrapper, every mutating adapter call is matched by a gate assertion', () => {
  const text = readFileSync(join(srcDir, 'gated-transport.ts'), 'utf8')
  const mutating = (text.match(MUTATING_CALL) ?? []).length
  const gates = (text.match(/assertRegistrationGate\s*\(/g) ?? []).length
  assert.ok(mutating > 0, 'expected mutating adapter calls in the gated wrapper')
  assert.equal(
    gates,
    mutating,
    `expected one assertRegistrationGate per mutating call (gates=${gates}, mutating=${mutating})`,
  )
})

test('AC2: a fake recording adapter drives a full registration with no network', async () => {
  const fx = singleStoryFixture()
  const adapter = new FakeAdapter()
  const outcome = await register({
    slug: fx.slug,
    repoRoot: fx.repoRoot,
    adapter,
    timestamp: '2026-07-22T12:00:00Z',
  })
  assert.equal(outcome.mode, 'first')
  assert.ok(adapter.createCalls.length >= 2) // epic + story, recorded in-memory
  assert.ok(adapter.linkCalls.length >= 1)
})
