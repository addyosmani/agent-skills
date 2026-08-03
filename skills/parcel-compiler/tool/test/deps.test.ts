import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkgPath = path.join(toolRoot, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as Record<string, unknown>
const lockPath = path.join(toolRoot, 'package-lock.json')
const lock = JSON.parse(readFileSync(lockPath, 'utf8')) as {
  packages: Record<string, Record<string, unknown>>
}

describe('zero runtime dependencies (AC3)', () => {
  test('package.json has no "dependencies" key', () => {
    assert.ok(
      !Object.hasOwn(pkg, 'dependencies'),
      'package.json must not contain a "dependencies" key',
    )
  })

  test('package.json has devDependencies', () => {
    assert.ok(
      typeof pkg.devDependencies === 'object' && pkg.devDependencies !== null,
      'devDependencies must be present',
    )
  })

  test('devDependencies includes required tool packages', () => {
    const dev = pkg.devDependencies as Record<string, unknown>
    for (const name of ['typescript', 'tsx', '@biomejs/biome']) {
      assert.ok(Object.hasOwn(dev, name), `devDependencies must include ${name}`)
    }
  })

  test('every installed lockfile package (other than root) is dev-only', () => {
    for (const [key, entry] of Object.entries(lock.packages)) {
      if (key === '') continue
      assert.equal(entry.dev, true, `${key} must be marked "dev": true in package-lock.json`)
    }
  })
})
