/**
 * AC16: credential + secret hygiene (§7/F10). No token, OAuth secret, base
 * URL, or connection string literal appears in the package or fixtures. (A
 * public github.com permalink host is not a credential and is allowed - it is
 * the SPEC-CONVENTION §5 link target.)
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..')

function collectFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...collectFiles(full))
    else if (/\.(ts|json)$/.test(entry.name)) out.push(full)
  }
  return out
}

const FORBIDDEN: readonly RegExp[] = [
  /jira_api_token/i,
  /jira_base_url/i,
  /client_secret/i,
  /authorization:\s*(bearer|basic)/i,
  /password\s*[:=]/i,
  // credentials embedded in a URL (user:pass@host)
  /:\/\/[^\s/@]+:[^\s/@]+@/i,
]

// The coordinator ratified pinning the PUBLIC site-selection selector
// `kaseya.atlassian.net` for cloudId discovery (a discovery selector, not a
// credential or REST connection base). It is stripped before the residual
// base-URL check, so any OTHER `atlassian.net` reference (or a REST base URL)
// still fails hygiene.
const RATIFIED_SITE_SELECTOR = 'kaseya.atlassian.net'
const RESIDUAL_BASE_URL = /atlassian\.net/i

test('AC16: no credential/secret/base-URL/connection-string literal in the package or fixtures', () => {
  for (const file of collectFiles(packageDir)) {
    if (file.includes('package-lock.json')) continue
    // This probe file necessarily contains the very patterns it scans for.
    if (file.endsWith('credential-hygiene.test.ts')) continue
    const text = readFileSync(file, 'utf8')
    for (const pattern of FORBIDDEN) {
      assert.equal(pattern.test(text), false, `${file} matches forbidden secret pattern ${pattern}`)
    }
    const residual = text.split(RATIFIED_SITE_SELECTOR).join('')
    assert.equal(
      RESIDUAL_BASE_URL.test(residual),
      false,
      `${file} references an atlassian.net base URL other than the ratified site selector`,
    )
  }
})
