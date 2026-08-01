/**
 * SHA-256 hex digest over canonicalized bytes — vendored, parity-pinned copy
 * (coordinator ruling Q1). Uses only `node:crypto` (built-in, no dependency).
 */
import { createHash } from 'node:crypto'

export function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}
