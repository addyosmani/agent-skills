/**
 * AC13 (remaining scope): no Task-tier concept (a third tier below Story)
 * appears anywhere in the shipped package source (F1).
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..')

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

// RETIRED (CLOSE-P2 spec, coordinator amendment A5; STANDING-CONSTRAINTS
// Builder #12): the "AC13: zero modification to contracts/, receipts/,
// projection/, shaping/, spec-linter/ since the branch fork point" test that
// lived here was W1-P3's parcel-time drift control shipped as a permanent
// suite member — it redded any future PR legitimately touching those five
// directories (first fired on CLOSE-P2's chartered spec-linter changes).
// Parcel-time freezes belong in the coordinator's Stage-D/E git-diff checks,
// not the shipped suite. The Task-tier invariant test below stays.

test('AC13: no Task-tier concept (a third tier below Epic/Story) appears anywhere in the shipped package source', () => {
  // Scoped to src/ (the shipped surface), not tests/ - this test file's own
  // name/prose necessarily discusses "Task-tier" as the concept being probed
  // for, which would otherwise self-trigger a false positive.
  const taskWordPattern = /\btask/i
  for (const file of collectTsFiles(join(packageDir, 'src'))) {
    const text = readFileSync(file, 'utf8')
    assert.equal(
      taskWordPattern.test(text),
      false,
      `${file} contains the word 'task' - possible Task-tier leak (F1)`,
    )
  }
})
