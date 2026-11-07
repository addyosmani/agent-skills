// scoping.ts's anchorGlob is a port of @nizos/probity's; issue #186 found
// it concatenated where Probity joins, so `./` and `..` segments diverged.
import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'

import { anchorGlob } from './scoping.ts'

// Probity's own implementation (dist/config.js), restated.
function probityAnchor(glob: string, root: string): string {
  if (glob.startsWith('!')) return '!' + probityAnchor(glob.slice(1), root)
  if (glob.startsWith('**')) return glob
  return path.posix.join(root, glob)
}

for (const glob of ['src/**', './src/**', 'src/../lib/**', '!./spikes/**', '**/x/**', 'docs/GLOSSARY.md']) {
  for (const root of ['/repo', '/repo/']) {
    test(`should anchor ${glob} at ${root} exactly as Probity does`, () => {
      assert.equal(anchorGlob(glob, root), probityAnchor(glob, root))
    })
  }
}
