// Coverage for issue #154: an ordered set of layers (atomic design
// levels, presentation over data) where each layer may reference only
// the layers below it. Deterministic and delta-based, like the other
// import screens: only a reference the write adds blocks.
import assert from 'node:assert/strict'
import test from 'node:test'

import type { RuleContext } from '@nizos/probity'

import { enforceLayeredImports } from './layered-imports.ts'

function onDisk(content: string | undefined): RuleContext {
  return {
    readFile: async () =>
      content === undefined ? { kind: 'absent' } : { kind: 'present', content },
  }
}

const write = (content: string, path = '/repo/ui/design/src/Atom.kt') =>
  ({ kind: 'write', path, content }) as const

const D = 'com.example.ui.design'
const design = enforceLayeredImports({
  layers: [
    { name: 'tokens', packages: [`${D}.tokens`] },
    { name: 'atoms', packages: [`${D}.atoms`] },
    { name: 'molecules', packages: [`${D}.molecules`] },
    { name: 'organisms', packages: [`${D}.organisms`] },
    { name: 'templates', packages: [`${D}.templates`] },
  ],
})

const kt = (pkg: string, ...body: string[]) =>
  [`package ${pkg}`, '', ...body].join('\n')

// ── Kotlin ordering ────────────────────────────────────────────────

test('an atom importing a molecule is blocked, naming the layer order', async () => {
  const result = await design(
    write(kt(`${D}.atoms`, `import ${D}.molecules.Card`, '', 'fun Badge() = Card()')),
    onDisk(undefined),
  )
  assert.equal(result.kind, 'violation')
  const reason = result.reason ?? ''
  assert.match(reason, /atoms → molecules/)
  assert.ok(reason.includes(`${D}.molecules.Card`), reason)
  assert.match(reason, /tokens → atoms → molecules → organisms → templates/)
})

test('a layer importing any layer below it passes', async () => {
  const result = await design(
    write(
      kt(`${D}.organisms`, `import ${D}.molecules.Card`, `import ${D}.tokens.Spacing`),
    ),
    onDisk(undefined),
  )
  assert.equal(result.kind, 'pass')
})

test('a reference within the same layer passes', async () => {
  const result = await design(
    write(kt(`${D}.atoms.buttons`, `import ${D}.atoms.Icon`)),
    onDisk(undefined),
  )
  assert.equal(result.kind, 'pass')
})

test('a fully-qualified upward reference without an import is blocked', async () => {
  const result = await design(
    write(kt(`${D}.atoms`, `fun Badge() = ${D}.organisms.Header()`)),
    onDisk(undefined),
  )
  assert.equal(result.kind, 'violation')
  assert.match(result.reason ?? '', /atoms → organisms/)
})

test('references in comments and strings are ignored', async () => {
  const result = await design(
    write(
      kt(
        `${D}.atoms`,
        `// see ${D}.molecules.Card`,
        `/* ${D}.organisms.Header */`,
        `val doc = "${D}.templates.Page"`,
      ),
    ),
    onDisk(undefined),
  )
  assert.equal(result.kind, 'pass')
})

test('a file whose package is in no layer passes', async () => {
  const result = await design(
    write(kt('com.example.app', `import ${D}.templates.Page`)),
    onDisk(undefined),
  )
  assert.equal(result.kind, 'pass')
})

test('the longest matching package prefix decides the layer', async () => {
  const rule = enforceLayeredImports({
    layers: [
      { name: 'design', packages: [D] },
      { name: 'screens', packages: [`${D}.screens`] },
    ],
  })
  const result = await rule(
    write(kt(`${D}.atoms`, `import ${D}.screens.Home`)),
    onDisk(undefined),
  )
  assert.equal(result.kind, 'violation')
  assert.match(result.reason ?? '', /design → screens/)
})

// ── Delta ──────────────────────────────────────────────────────────

test('an existing upward import does not block an unrelated edit', async () => {
  const before = kt(`${D}.atoms`, `import ${D}.molecules.Card`, 'fun A() = 1')
  const result = await design(
    write(kt(`${D}.atoms`, `import ${D}.molecules.Card`, 'fun A() = 2')),
    onDisk(before),
  )
  assert.equal(result.kind, 'pass')
})

test('a second upward reference beside an existing one is blocked', async () => {
  const before = kt(`${D}.atoms`, `import ${D}.molecules.Card`)
  const result = await design(
    write(kt(`${D}.atoms`, `import ${D}.molecules.Card`, `import ${D}.molecules.Row`)),
    onDisk(before),
  )
  assert.equal(result.kind, 'violation')
  assert.match(result.reason ?? '', /molecules\.Row/)
  assert.doesNotMatch(result.reason ?? '', /molecules\.Card/)
})

test('commands are not judged', async () => {
  const result = await design({ kind: 'command', command: 'ls' } as never, onDisk(undefined))
  assert.equal(result.kind, 'pass')
})

// ── Strict layering ────────────────────────────────────────────────

test('strict: a layer may reference only the layer directly below it', async () => {
  const strict = enforceLayeredImports({
    strict: true,
    layers: [
      { name: 'data', packages: ['com.example.data'] },
      { name: 'domain', packages: ['com.example.domain'] },
      { name: 'presentation', packages: ['com.example.presentation'] },
    ],
  })
  const skip = await strict(
    write(kt('com.example.presentation', 'import com.example.data.Repo')),
    onDisk(undefined),
  )
  assert.equal(skip.kind, 'violation')
  assert.match(skip.reason ?? '', /presentation → data/)
  assert.match(skip.reason ?? '', /only the layer directly below/)
  const next = await strict(
    write(kt('com.example.presentation', 'import com.example.domain.Order')),
    onDisk(undefined),
  )
  assert.equal(next.kind, 'pass')
})

// ── Siblings ───────────────────────────────────────────────────────

test('a * segment makes each matching package a sibling that may not import another', async () => {
  const rule = enforceLayeredImports({
    layers: [
      { name: 'core', packages: ['com.example.core'] },
      { name: 'feature', packages: ['com.example.feature.*'] },
    ],
  })
  const sibling = await rule(
    write(kt('com.example.feature.home', 'import com.example.feature.settings.Screen')),
    onDisk(undefined),
  )
  assert.equal(sibling.kind, 'violation')
  assert.match(sibling.reason ?? '', /feature home → feature settings/)
  assert.match(sibling.reason ?? '', /siblings/)
  const own = await rule(
    write(
      kt('com.example.feature.home.ui', 'import com.example.feature.home.Model', 'import com.example.core.Id'),
    ),
    onDisk(undefined),
  )
  assert.equal(own.kind, 'pass')
})

test('a group of layers shares one rank, and its members are siblings', async () => {
  const rule = enforceLayeredImports({
    layers: [
      { name: 'core', packages: ['com.example.core'] },
      [
        { name: 'home', packages: ['com.example.home'] },
        { name: 'settings', packages: ['com.example.settings'] },
      ],
      { name: 'app', packages: ['com.example.app'] },
    ],
  })
  const sibling = await rule(
    write(kt('com.example.home', 'import com.example.settings.Screen')),
    onDisk(undefined),
  )
  assert.equal(sibling.kind, 'violation')
  assert.match(sibling.reason ?? '', /home → settings/)
  const app = await rule(
    write(kt('com.example.app', 'import com.example.home.Screen', 'import com.example.settings.Screen')),
    onDisk(undefined),
  )
  assert.equal(app.kind, 'pass')
})

// ── Swift ──────────────────────────────────────────────────────────

const swiftLayers = enforceLayeredImports({
  layers: [
    { name: 'atoms', packages: ['Atoms'], paths: ['**/Sources/Atoms/**'] },
    { name: 'molecules', packages: ['Molecules'], paths: ['**/Sources/Molecules/**'] },
  ],
})

test('Swift: a module import from a lower layer is blocked, the file placed by path', async () => {
  const result = await swiftLayers(
    write('import SwiftUI\n@testable import Molecules\n', '/repo/Sources/Atoms/Badge.swift'),
    onDisk(undefined),
  )
  assert.equal(result.kind, 'violation')
  assert.match(result.reason ?? '', /atoms → molecules/)
})

test('Swift: importing a lower module, or a system one, passes', async () => {
  const result = await swiftLayers(
    write('import SwiftUI\nimport struct Atoms.Icon\n', '/repo/Sources/Molecules/Card.swift'),
    onDisk(undefined),
  )
  assert.equal(result.kind, 'pass')
})
