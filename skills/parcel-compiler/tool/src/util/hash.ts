import { createHash } from 'node:crypto'

/** SHA-256 over arbitrary bytes; returns lowercase hex digest. */
export function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}
