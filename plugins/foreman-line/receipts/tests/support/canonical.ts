/**
 * AC8 test-only helper: an independent RFC 8785 (JCS) canonicalization +
 * sha256Hex implementation, written solely to validate the worked
 * hash-vector fixture against the documented hash domain. This is NOT
 * exported from `src/index.ts` and is never called by `validateReceiptDocument`
 * or `validateChain` — the shipped validator is structural only and never
 * computes a hash from bytes (that stays pcc's `receipt verify` job).
 *
 * Structurally the same algorithm as
 * `skills/parcel-compiler/tool/src/receipts/canonical.ts` / `.../util/hash.ts`,
 * written independently (not imported) per the canonicalization-authority
 * boundary in the spec's Constraints.
 */
import { createHash } from 'node:crypto'

export type JsonPrimitive = string | number | boolean | null
export interface JsonObject {
  readonly [key: string]: JsonValue
}
export type JsonArray = readonly JsonValue[]
export type JsonValue = JsonPrimitive | JsonObject | JsonArray

function serializeValue(value: JsonValue): string {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new RangeError(`canonicalize: non-finite number is not valid JSON: ${value}`)
    }
    return JSON.stringify(value)
  }
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map(serializeValue).join(',')}]`
  }
  const pairs = (Object.entries(value) as Array<[string, JsonValue]>)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${serializeValue(v)}`)
  return `{${pairs.join(',')}}`
}

export function canonicalize(value: JsonValue): Uint8Array {
  return new TextEncoder().encode(serializeValue(value))
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}
