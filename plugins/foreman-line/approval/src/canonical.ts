/**
 * RFC 8785 (JCS) canonical JSON serialization — vendored, parity-pinned copy
 * (coordinator ruling Q1). Objects: keys sorted by Unicode code unit order,
 * no whitespace. Values: standard JSON encoding (`JSON.stringify` handles
 * numbers/strings/booleans/null).
 *
 * Structurally identical to `skills/parcel-compiler/tool/src/receipts/canonical.ts`,
 * written independently (not imported) per the canonicalization-authority
 * boundary this parcel's spec Constraints establish — that package is cited
 * by reference only, never imported cross-plugin. Drift from the authority is
 * caught mechanically by `tests/canonical-parity.test.ts` reproducing the
 * `receipts` package's frozen worked vector.
 */

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
