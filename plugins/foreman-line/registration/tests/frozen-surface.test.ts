/**
 * AC15 (remaining scope): no Task-tier concept (a third tier below Epic/Story,
 * charter F1) anywhere in the shipped package source.
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(packageDir, 'src')

// RETIRED (CLOSE-P2 spec, coordinator amendment A6; STANDING-CONSTRAINTS
// Builder #12): the "AC15: zero modification to the frozen contract + shipped
// packages" test that lived here was this parcel's shipped-and-closed drift
// control pinning contracts/, approval/, receipts/, projection/, shaping/,
// and spec-linter/ to the branch fork point — it redded any future PR
// legitimately touching those packages (fired on CLOSE-P2's chartered
// spec-linter changes and A5's approval deletion). Parcel-time freezes belong
// in the coordinator's Stage-D/E git-diff checks, not the shipped suite. The
// Task-tier invariant test below stays.

test('AC15: no Task-tier concept (a third tier below Epic/Story) in src (F1)', () => {
  const taskWord = /\btask/i
  for (const name of readdirSync(srcDir)) {
    if (!name.endsWith('.ts')) continue
    const text = readFileSync(join(srcDir, name), 'utf8')
    assert.equal(taskWord.test(text), false, `${name} contains 'task' - possible Task-tier leak`)
  }
})
