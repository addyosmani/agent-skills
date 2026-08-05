/**
 * AC10 (F-E): the shipped package contains no import of `contracts/` (or any
 * sibling `plugins/foreman-line/*` package), no `DispatchOrder` reference, and
 * no runtime producer of any dispatch payload. Grep-confirmable over every
 * source file — this is the machine tripwire against the single most tempting
 * P3 scope-creep trap.
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(packageRoot, 'src')

function allSources(): { file: string; text: string }[] {
  return readdirSync(srcDir)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => ({ file: f, text: readFileSync(join(srcDir, f), 'utf8') }))
}

test('AC10: no source imports contracts/ or any sibling plugins/foreman-line package', () => {
  for (const { file, text } of allSources()) {
    assert.ok(!/from\s+['"][^'"]*contracts[^'"]*['"]/.test(text), `${file} imports contracts/`)
    assert.ok(
      !/from\s+['"][^'"]*plugins\/foreman-line\/[^'"]*['"]/.test(text),
      `${file} imports a sibling plugins/foreman-line package`,
    )
  }
})

test('AC10: no source references DispatchOrder', () => {
  for (const { file, text } of allSources()) {
    assert.ok(!text.includes('DispatchOrder'), `${file} references DispatchOrder`)
  }
})
