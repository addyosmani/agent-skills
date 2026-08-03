import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { mergeBase } from '../src/util/git.js'

function initRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'pcc-git-test-'))
  const run = (args: string[]) =>
    execFileSync('git', args, { cwd: dir, stdio: 'pipe', encoding: 'utf8' })
  run(['init'])
  run(['config', 'user.email', 'test@pcc.test'])
  run(['config', 'user.name', 'PCC Test'])
  return dir
}

function commit(dir: string, file: string, message: string): void {
  writeFileSync(join(dir, file), message)
  execFileSync('git', ['add', '.'], { cwd: dir, stdio: 'pipe' })
  execFileSync('git', ['commit', '-m', message], { cwd: dir, stdio: 'pipe' })
}

describe('mergeBase (AC11)', () => {
  test('returns null for a non-git directory', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pcc-no-git-'))
    try {
      assert.equal(mergeBase(dir, 'HEAD'), null)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('returns null for an unresolvable ref', () => {
    const dir = initRepo()
    try {
      commit(dir, 'a.txt', 'init')
      assert.equal(mergeBase(dir, 'nonexistent-branch-xyzzy'), null)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('returns a 40-char hex SHA for a resolvable ref', () => {
    const dir = initRepo()
    try {
      commit(dir, 'a.txt', 'first commit')
      // tag the base commit then add a second commit so HEAD != base
      execFileSync('git', ['tag', 'base-tag'], { cwd: dir, stdio: 'pipe' })
      commit(dir, 'b.txt', 'second commit')

      const sha = mergeBase(dir, 'base-tag')
      assert.ok(sha !== null, 'mergeBase must not return null for a known ref')
      assert.match(sha, /^[0-9a-f]{40}$/, 'result must be a 40-char lowercase hex SHA')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('returned SHA matches the tagged commit', () => {
    const dir = initRepo()
    try {
      commit(dir, 'a.txt', 'first commit')
      const taggedSha = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: dir,
        encoding: 'utf8',
        stdio: 'pipe',
      }).trim()
      execFileSync('git', ['tag', 'v0'], { cwd: dir, stdio: 'pipe' })
      commit(dir, 'b.txt', 'second commit')

      const sha = mergeBase(dir, 'v0')
      assert.equal(sha, taggedSha)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
