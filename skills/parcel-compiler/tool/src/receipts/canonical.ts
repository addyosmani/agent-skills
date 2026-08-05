/**
 * RFC 8785 (JCS) canonical JSON serialization.
 * Objects: keys sorted by Unicode code unit order, no whitespace.
 * Values: standard JSON encoding (JSON.stringify handles numbers/strings/booleans/null).
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
