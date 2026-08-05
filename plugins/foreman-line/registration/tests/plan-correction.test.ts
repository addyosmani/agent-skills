/**
 * AC17: FOREMAN-LINE-PLAN §8 correction (Q10). The proof PR changes exactly
 * the §8 W1-P4 bullet (`jira-workflow` -> `jira-integration`); the routing/
 * integration-table line 156 (`jira: [jira-workflow]`) is untouched by this
 * parcel (widening it is a stop-and-report).
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const planPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'docs',
  'FOREMAN-LINE-PLAN.md',
)

test('AC17: the §8 W1-P4 bullet now references jira-integration (not jira-workflow)', () => {
  const lines = readFileSync(planPath, 'utf8').split('\n')
  const bullet = lines.find((l) => l.startsWith('- **W1-P4**'))
  assert.ok(bullet !== undefined, 'the W1-P4 §8 bullet must exist')
  assert.ok(bullet.includes('jira-integration'), 'the bullet must reference jira-integration')
  assert.ok(!bullet.includes('jira-workflow'), 'the bullet must no longer reference jira-workflow')
})

test('AC17: the integration-table line (jira: [jira-workflow]) is untouched', () => {
  const text = readFileSync(planPath, 'utf8')
  assert.ok(
    text.includes('jira:           [jira-workflow]'),
    'the integration-table jira-workflow reference must remain (line 156, out of scope)',
  )
})
