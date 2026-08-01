/**
 * AC14: this package never writes to a spec's `status:` frontmatter, moves
 * no spec between `active/`/`done/`, and performs no Jira/MCP interaction of
 * any kind.
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

test('AC14: src/ never references a spec status flip, a done/ move, or Jira/MCP/Atlassian interaction', () => {
  const bannedPatterns = [
    /status\s*:\s*['"]?(active|done|draft)/i,
    /docs\/specs\/done/,
    /\bjira\b/i,
    /atlassian/i,
    /\bmcp\b/i,
  ]
  for (const file of collectTsFiles(join(packageDir, 'src'))) {
    const text = readFileSync(file, 'utf8')
    for (const pattern of bannedPatterns) {
      assert.equal(pattern.test(text), false, `${file} matches banned pattern ${pattern}`)
    }
  }
})
