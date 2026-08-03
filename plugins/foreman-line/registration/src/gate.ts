/**
 * The mechanical sandbox gate (charter F4; D3 as amended). Three conditions,
 * one function, asserted before any adapter create/update: (a) the project key
 * is a member of the committed allowlist (exact-string `Set.has`, linear-time,
 * lesson #19); (b) `labels` includes `mcp-test`; (c) `summary` begins with the
 * literal `[TEST] ` prefix (`startsWith`, no regex). The gate is mechanical,
 * not conventional - the package stamps the label and prefix and asserts them
 * post-injection; it does not trust the caller to have done so.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type GateFields, RegistrationGateError } from './types.js'

export const MCP_TEST_LABEL = 'mcp-test'
export const TEST_PREFIX = '[TEST] '

const ALLOWLIST_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'config',
  'project-allowlist.json',
)

/**
 * A project key is not a credential (SPEC-CONVENTION §7): the allowlist is a
 * committed, reviewable, diffable package config. Loaded once at module init.
 */
function loadAllowedProjectKeys(): ReadonlySet<string> {
  const raw = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8')) as {
    allowedProjectKeys: readonly string[]
  }
  return new Set(raw.allowedProjectKeys)
}

export const ALLOWED_PROJECT_KEYS: ReadonlySet<string> = loadAllowedProjectKeys()

/**
 * Assert all three mechanical isolation conditions. Throws a typed
 * `RegistrationGateError` naming the first violation. Every check is
 * linear-time in its input length (no regex, no backtracking).
 */
export function assertRegistrationGate(fields: GateFields): void {
  const key = fields.project.key
  if (!ALLOWED_PROJECT_KEYS.has(key)) {
    throw new RegistrationGateError(
      'project-key',
      `project key ${JSON.stringify(key)} is not in the allowlist [${[...ALLOWED_PROJECT_KEYS].join(', ')}]`,
    )
  }
  if (!fields.labels.includes(MCP_TEST_LABEL)) {
    throw new RegistrationGateError(
      'label',
      `labels must include ${JSON.stringify(MCP_TEST_LABEL)}, got ${JSON.stringify(fields.labels)}`,
    )
  }
  if (!fields.summary.startsWith(TEST_PREFIX)) {
    throw new RegistrationGateError(
      'prefix',
      `summary must begin with the literal ${JSON.stringify(TEST_PREFIX)} prefix`,
    )
  }
}
