// Coverage for issue #120: a Covers-tagged test must say what its
// scenario says. The parity rules check that the link exists; this
// judged rule checks that the test's Given/When/Then match the
// scenario's, and calls the model only when a claimed test (or a
// claimed scenario) actually changed.
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'

import type { Rule, RuleBlock, RuleContext, RuleEntry } from '@nizos/probity'

import { enforceScenarioFidelity } from './scenario-fidelity.ts'
import { isRuleBlock } from './scoping.ts'
import { jsRuleEntries } from '../presets/js.ts'
import { kmpRuleEntries } from '../presets/kmp.ts'
import { swiftRuleEntries } from '../presets/swift.ts'

const SPEC = `# Checkout

## Scenario: Placing an order
Given a shopper with a basket
When the shopper places the order
Then the shopper receives an order confirmation

## Scenario [id:refund-on-cancel]: Cancelling an order refunds it
Given a shopper with a placed order
When the shopper cancels the order
Then the shopper is refunded

## Scenario: Browsing the catalogue
Given a catalogue with products
When the shopper browses it
Then the shopper sees the products
`

const PLACING = `    // Covers: checkout.feature.md :: Scenario: Placing an order
    @Test
    fun placingAnOrder() {
        shopper.hasABasket()
        shopper.placesTheOrder()
        shopper.receivesAnOrderConfirmation()
    }
`

const CANCELLING = `    // Covers: @id:refund-on-cancel
    @Test
    fun cancellingRefunds() {
        shopper.hasAPlacedOrder()
        shopper.cancelsTheOrder()
        shopper.isRefunded()
    }
`

function specClass(...tests: string[]): string {
  return `package shop.acceptance\n\nimport kotlin.test.Test\n\nclass CheckoutSpec {\n${tests.join('\n')}}\n`
}

type World = { root: string; specsDir: string; testDir: string }

function world(files: Record<string, string> = {}): World {
  const root = mkdtempSync(join(tmpdir(), 'scenario-fidelity-test-'))
  const all: Record<string, string> = { 'docs/specs/checkout.feature.md': SPEC, ...files }
  for (const [rel, content] of Object.entries(all)) {
    const full = join(root, rel)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, content)
  }
  const testDir = join(root, 'app/src/test/kotlin/shop/acceptance')
  mkdirSync(testDir, { recursive: true })
  return { root, specsDir: join(root, 'docs/specs'), testDir }
}

function judge(verdict: 'pass' | 'violation' = 'pass', reason = 'matches') {
  const prompts: string[] = []
  const ctx = (before?: string): RuleContext =>
    ({
      readFile: async () =>
        before === undefined ? { kind: 'absent' } : { kind: 'present', content: before },
      agent: {
        reason: async (prompt: string) => {
          prompts.push(prompt)
          return { kind: verdict, reason }
        },
      },
    }) as unknown as RuleContext
  return { prompts, ctx }
}

function rule(w: World): Rule {
  return enforceScenarioFidelity({ specsDir: w.specsDir, testRoots: [w.root] })
}

function write(path: string, content: string) {
  return { kind: 'write' as const, path, content }
}

// ── Test-side writes ───────────────────────────────────────────────

test('a test write with no Covers tag passes without a model call', async () => {
  const w = world()
  const j = judge('violation')
  const result = await rule(w)(write(join(w.testDir, 'Helpers.kt'), 'fun helper() = 1\n'), j.ctx())
  assert.equal(result.kind, 'pass')
  assert.equal(j.prompts.length, 0)
})

test('a new Covers-tagged test is judged against the scenario it claims', async () => {
  const w = world()
  const j = judge('pass')
  const result = await rule(w)(write(join(w.testDir, 'CheckoutSpec.kt'), specClass(PLACING)), j.ctx())
  assert.equal(result.kind, 'pass')
  assert.equal(j.prompts.length, 1)
  assert.match(j.prompts[0]!, /Then the shopper receives an order confirmation/)
  assert.match(j.prompts[0]!, /shopper\.receivesAnOrderConfirmation\(\)/)
  assert.doesNotMatch(j.prompts[0]!, /Browsing the catalogue/, 'only the claimed scenario is sent')
})

test("the judge's violation blocks with its reason", async () => {
  const w = world()
  const j = judge('violation', 'The test asserts a receipt email; the scenario states an order confirmation.')
  const result = await rule(w)(write(join(w.testDir, 'CheckoutSpec.kt'), specClass(PLACING)), j.ctx())
  assert.equal(result.kind, 'violation')
  assert.match((result as { reason: string }).reason, /receipt email/)
})

test('an edit that leaves every claimed test unchanged is not judged', async () => {
  const w = world()
  const j = judge('violation')
  const before = specClass(PLACING)
  const after = before.replace('import kotlin.test.Test\n', 'import kotlin.test.Test\nimport shop.dsl.Shopper\n')
  const result = await rule(w)(write(join(w.testDir, 'CheckoutSpec.kt'), after), j.ctx(before))
  assert.equal(result.kind, 'pass')
  assert.equal(j.prompts.length, 0)
})

test('only the claimed test that changed is sent to the judge', async () => {
  const w = world()
  const j = judge('pass')
  const before = specClass(PLACING, CANCELLING)
  const after = before.replace('shopper.isRefunded()', 'shopper.isRefundedInFull()')
  await rule(w)(write(join(w.testDir, 'CheckoutSpec.kt'), after), j.ctx(before))
  assert.equal(j.prompts.length, 1)
  assert.match(j.prompts[0]!, /isRefundedInFull/)
  assert.match(j.prompts[0]!, /Then the shopper is refunded/, 'an @id claim resolves to its scenario')
  assert.doesNotMatch(j.prompts[0]!, /placesTheOrder/)
})

test('adding an untagged test after a claimed one leaves the claim unchanged', async () => {
  const w = world()
  const j = judge('violation')
  const before = specClass(PLACING)
  const after =
    before +
    '\nclass CheckoutSplitDriverSpec {\n    @Test\n    fun placingAnOrderViaSplitDriver() {\n        shopper.placesTheOrder()\n    }\n}\n'
  const result = await rule(w)(write(join(w.testDir, 'CheckoutSpec.kt'), after), j.ctx(before))
  assert.equal(result.kind, 'pass')
  assert.equal(j.prompts.length, 0)
})

test('a multi-line expression body is read in full', async () => {
  const w = world()
  const j = judge('pass')
  const test = `    // Covers: checkout.feature.md :: Scenario: Placing an order
    @Test
    fun placingAnOrder() =
        runTest {
            shopper.receivesAnOrderConfirmation()
        }
`
  await rule(w)(write(join(w.testDir, 'CheckoutSpec.kt'), specClass(test)), j.ctx())
  assert.match(j.prompts[0]!, /receivesAnOrderConfirmation/)
})

test('a wrapped expression body is read in full (Kotlin chained call, JS arrow without braces)', async () => {
  const w = world()
  const kotlin = `    // Covers: checkout.feature.md :: Scenario: Placing an order
    @Test
    fun placingAnOrder() = CheckoutScenarios
        .placingAnOrderThenConfirming(shopper)

    @Test
    fun unclaimed() {}
`
  const js =
    "// Covers: checkout.feature.md :: Scenario: Placing an order\n" +
    "it('places an order', () =>\n  scenarios.placingAnOrderThenConfirming(shopper))\n\nit('unclaimed', () => {})\n"
  for (const [path, content] of [
    [join(w.testDir, 'CheckoutSpec.kt'), specClass(kotlin)],
    [join(w.root, 'acceptance/checkout.test.ts'), js],
  ] as const) {
    const j = judge('pass')
    await rule(w)(write(path, content), j.ctx())
    assert.match(j.prompts[0]!, /placingAnOrderThenConfirming/, path)
    assert.doesNotMatch(j.prompts[0]!, /unclaimed/, path)
  }
})

test('a claim that resolves to no scenario is left to the parity rules', async () => {
  const w = world()
  const j = judge('violation')
  const dangling = PLACING.replace('Placing an order', 'No such scenario')
  const result = await rule(w)(write(join(w.testDir, 'CheckoutSpec.kt'), specClass(dangling)), j.ctx())
  assert.equal(result.kind, 'pass')
  assert.equal(j.prompts.length, 0)
})

test('fast path: a body another test already uses for the same scenario is not judged', async () => {
  const w = world({ 'app/src/test/kotlin/shop/acceptance/ui/CheckoutUiSpec.kt': specClass(PLACING) })
  const j = judge('violation')
  const renamed = PLACING.replace('fun placingAnOrder', 'fun placingAnOrderThroughTheViewModel')
  const result = await rule(w)(write(join(w.testDir, 'CheckoutSpec.kt'), specClass(renamed)), j.ctx())
  assert.equal(result.kind, 'pass')
  assert.equal(j.prompts.length, 0)
})

test('no fast path when the same body claims a different scenario elsewhere', async () => {
  const other = PLACING.replace('Placing an order', 'Browsing the catalogue')
  const w = world({ 'app/src/test/kotlin/shop/acceptance/ui/CheckoutUiSpec.kt': specClass(other) })
  const j = judge('pass')
  await rule(w)(write(join(w.testDir, 'CheckoutSpec.kt'), specClass(PLACING)), j.ctx())
  assert.equal(j.prompts.length, 1)
})

test('a test that delegates to a shared scenario body is judged with that body', async () => {
  const w = world({
    'app/src/test/kotlin/shop/acceptance/CheckoutScenarios.kt':
      'object CheckoutScenarios {\n    fun placingAnOrder(shopper: Shopper) {\n        shopper.placesTheOrder()\n        shopper.receivesAReceiptEmail()\n    }\n}\n',
  })
  const j = judge('pass')
  const delegating = `    // Covers: checkout.feature.md :: Scenario: Placing an order
    @Test
    fun placingAnOrder() = CheckoutScenarios.placingAnOrder(shopper)
`
  await rule(w)(write(join(w.testDir, 'CheckoutSpec.kt'), specClass(delegating)), j.ctx())
  assert.equal(j.prompts.length, 1)
  assert.match(j.prompts[0]!, /receivesAReceiptEmail/)
})

test('a JS test claiming a scenario is judged too', async () => {
  const w = world()
  const j = judge('pass')
  const content =
    "// Covers: checkout.feature.md :: Scenario: Placing an order\n" +
    "it('places an order', async () => {\n  await shopper.placesTheOrder()\n  await shopper.receivesAnOrderConfirmation()\n})\n"
  await rule(w)(write(join(w.root, 'acceptance/checkout.test.ts'), content), j.ctx())
  assert.equal(j.prompts.length, 1)
  assert.match(j.prompts[0]!, /receivesAnOrderConfirmation/)
})

test('with no model available, a write that needs judging fails closed', async () => {
  const w = world()
  const ctx = { readFile: async () => ({ kind: 'absent' }) } as unknown as RuleContext
  const result = await rule(w)(write(join(w.testDir, 'CheckoutSpec.kt'), specClass(PLACING)), ctx)
  assert.equal(result.kind, 'violation')
})

// ── Spec-side writes ───────────────────────────────────────────────

test('changing a claimed scenario judges the tests that claim it', async () => {
  const w = world({ 'app/src/test/kotlin/shop/acceptance/CheckoutSpec.kt': specClass(PLACING, CANCELLING) })
  const j = judge('violation', 'The scenario now promises an email; the test checks a confirmation.')
  const after = SPEC.replace('Then the shopper receives an order confirmation', 'Then the shopper receives an email')
  const result = await rule(w)(write(join(w.specsDir, 'checkout.feature.md'), after), j.ctx(SPEC))
  assert.equal(result.kind, 'violation')
  assert.equal(j.prompts.length, 1)
  assert.match(j.prompts[0]!, /Then the shopper receives an email/)
  assert.match(j.prompts[0]!, /receivesAnOrderConfirmation/)
  assert.doesNotMatch(j.prompts[0]!, /cancelsTheOrder/)
})

test('changing an unclaimed scenario or adding a new one is not judged', async () => {
  const w = world({ 'app/src/test/kotlin/shop/acceptance/CheckoutSpec.kt': specClass(PLACING) })
  const j = judge('violation')
  const after =
    SPEC.replace('Then the shopper sees the products', 'Then the shopper sees every product') +
    '\n## Scenario: Saving a basket\nGiven a basket\nWhen the shopper saves it\nThen it is saved\n'
  const result = await rule(w)(write(join(w.specsDir, 'checkout.feature.md'), after), j.ctx(SPEC))
  assert.equal(result.kind, 'pass')
  assert.equal(j.prompts.length, 0)
})

test('a Gherkin scenario body is read up to the next scenario', async () => {
  const gherkin =
    'Feature: Checkout\n\n  Scenario: Placing an order\n    Given a shopper with a basket\n    When the shopper places the order\n    Then the shopper receives an order confirmation\n\n  @wip\n  Scenario: Browsing the catalogue\n    Given a catalogue\n'
  const w = world({ 'docs/specs/checkout.feature': gherkin, 'docs/specs/checkout.feature.md': '# empty\n' })
  const j = judge('pass')
  const test = PLACING.replace('checkout.feature.md', 'checkout.feature')
  await rule(w)(write(join(w.testDir, 'CheckoutSpec.kt'), specClass(test)), j.ctx())
  assert.equal(j.prompts.length, 1)
  assert.match(j.prompts[0]!, /Then the shopper receives an order confirmation/)
  assert.doesNotMatch(j.prompts[0]!, /Given a catalogue/)
})

// ── Issue #155: a precondition both sides gain ─────────────────────
// A new precondition on a claimed scenario deadlocked: the test write was
// refused (the scenario doesn't state it) and the spec write was refused
// (the test doesn't establish it). A wip scenario is not held to its
// claims, and the claims are judged again when the marker comes off.

const GAINED = 'Given a shopper with a basket\nAnd the shopper has a saved address'

test('a claimed scenario marked wip may change without judging its claims', async () => {
  const w = world({ 'app/src/test/kotlin/shop/acceptance/CheckoutSpec.kt': specClass(PLACING) })
  const j = judge('violation')
  const after = SPEC.replace('## Scenario: Placing an order', '## Scenario (wip): Placing an order').replace(
    'Given a shopper with a basket',
    GAINED,
  )
  const result = await rule(w)(write(join(w.specsDir, 'checkout.feature.md'), after), j.ctx(SPEC))
  assert.equal(result.kind, 'pass', result.kind === 'violation' ? result.reason : '')
  assert.equal(j.prompts.length, 0)
})

test('a test write is still judged against a wip scenario', async () => {
  const wipSpec = SPEC.replace('## Scenario: Placing an order', '## Scenario (wip): Placing an order').replace(
    'Given a shopper with a basket',
    GAINED,
  )
  const w = world({ 'docs/specs/checkout.feature.md': wipSpec })
  const j = judge('pass')
  const test = PLACING.replace('shopper.hasABasket()', 'shopper.hasABasket()\n        shopper.hasASavedAddress()')
  await rule(w)(write(join(w.testDir, 'CheckoutSpec.kt'), specClass(test)), j.ctx(specClass(PLACING)))
  assert.equal(j.prompts.length, 1)
  assert.match(j.prompts[0]!, /And the shopper has a saved address/)
})

test('removing a Gherkin @wip tag judges the claims on that scenario', async () => {
  const steps =
    '  Scenario: Placing an order\n    Given a shopper with a basket\n    When the shopper places the order\n    Then the shopper receives an order confirmation\n'
  const before = `Feature: Checkout\n\n  @wip\n${steps}`
  const after = `Feature: Checkout\n\n${steps}`
  const test = PLACING.replace('checkout.feature.md', 'checkout.feature')
  const w = world({
    'docs/specs/checkout.feature': before,
    'docs/specs/checkout.feature.md': '# empty\n',
    'app/src/test/kotlin/shop/acceptance/CheckoutSpec.kt': specClass(test),
  })
  const j = judge('violation', 'The test does not establish the saved address.')
  const result = await rule(w)(write(join(w.specsDir, 'checkout.feature'), after), j.ctx(before))
  assert.equal(result.kind, 'violation')
  assert.equal(j.prompts.length, 1)
  assert.match(j.prompts[0]!, /receivesAnOrderConfirmation/)
})

// ── Issue #129: the tier check, when an app scope is named ─────────

test('with appScope, the prompt carries the tier rules and each scenario\'s tier', async () => {
  const tagged = SPEC.replace('## Scenario: Placing an order', '## Scenario [app]: Placing an order')
  const w = world({ 'docs/specs/checkout.feature.md': tagged })
  const j = judge('pass')
  const tiered = enforceScenarioFidelity({ specsDir: w.specsDir, testRoots: [w.root], appScope: 'app' })
  await tiered(write(join(w.testDir, 'CheckoutSpec.kt'), specClass(PLACING, CANCELLING)), j.ctx())
  assert.equal(j.prompts.length, 1, 'still one model call')
  assert.match(j.prompts[0]!, /## Tier/)
  assert.match(j.prompts[0]!, /the wire decides the outcome/i)
  assert.match(j.prompts[0]!, /Tier: app \(tagged \[app\]\)/)
  assert.match(j.prompts[0]!, /Tier: component \(untagged\)/)
})

test('without appScope, no tier check is asked for', async () => {
  const w = world()
  const j = judge('pass')
  await rule(w)(write(join(w.testDir, 'CheckoutSpec.kt'), specClass(PLACING)), j.ctx())
  assert.doesNotMatch(j.prompts[0]!, /## Tier/)
})

// ── Preset wiring ──────────────────────────────────────────────────

function fidelityBlocks(entries: readonly RuleEntry[]): RuleBlock[] {
  return entries.filter(
    (entry): entry is RuleBlock =>
      isRuleBlock(entry) && !!entry.rules?.some((rule: Rule) => /enforceScenarioFidelity/.test(rule.name)),
  )
}

test('kmpRuleEntries wires scenario fidelity on acceptance tests and specs by default', () => {
  const blocks = fidelityBlocks(kmpRuleEntries('/repo'))
  assert.equal(blocks.length, 1)
  const files = blocks[0]!.files!.join(' ')
  assert.match(files, /acceptance/)
  assert.match(files, /docs\/specs/)
})

test('swiftRuleEntries wires scenario fidelity by default', () => {
  assert.equal(fidelityBlocks(swiftRuleEntries('/repo')).length, 1)
})

test('jsRuleEntries wires scenario fidelity only once specsDir is set', () => {
  assert.equal(fidelityBlocks(jsRuleEntries()).length, 0)
  assert.equal(fidelityBlocks(jsRuleEntries({ specsDir: '/repo/specs' })).length, 1)
})

test('the presets pass appScope through to the fidelity judge', async () => {
  const w = world({ 'docs/specs/checkout.feature.md': SPEC })
  const block = fidelityBlocks(
    kmpRuleEntries(w.root, { appScope: 'app', testRoots: [w.root], driverScopes: [{ name: 'app', filePattern: /app/ }] }),
  )[0]!
  const j = judge('pass')
  await block.rules![0]!(write(join(w.testDir, 'CheckoutSpec.kt'), specClass(PLACING)), j.ctx())
  assert.match(j.prompts[0]!, /## Tier/)
})

test('scenarioFidelity: false turns it off', () => {
  assert.equal(fidelityBlocks(kmpRuleEntries('/repo', { scenarioFidelity: false })).length, 0)
  assert.equal(fidelityBlocks(swiftRuleEntries('/repo', { scenarioFidelity: false })).length, 0)
  assert.equal(fidelityBlocks(jsRuleEntries({ specsDir: '/repo/specs', scenarioFidelity: false })).length, 0)
})
