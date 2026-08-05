// canonical-json.ts — RFC 8785 (JCS) canonicalization.
//
// Why: manifest_hash and per-contract content_hash are SHA-256 over the
// *canonical JSON* of the document (approval-verification.md §3, manifest.schema
// content_hash). Two semantically identical documents that differ only in key
// order or whitespace MUST hash identically, or the gate would refuse a manifest
// that is byte-for-byte equivalent to the approved one. JCS gives that determinism.
//
// Implementation notes (the RFC 8785 subset we rely on):
//  - object keys sorted by UTF-16 code units  -> JS default Array.sort() on
//    strings is exactly UTF-16-code-unit order, so plain .sort() is correct.
//  - no insignificant whitespace.
//  - numbers serialized via the ECMAScript Number->String algorithm, which is
//    what JSON.stringify emits for finite numbers (RFC 8785 §3.2.2.3). Non-finite
//    numbers are not representable in JSON and are rejected loudly.
//  - strings via JSON.stringify (minimal escaping, lowercase \uXXXX for controls).

import { CanonicalizationError } from './approval-errors.js';

/** Serialize any JSON-able value to its RFC 8785 canonical form. */
export function canonicalize(value: unknown): string {
  return serialize(value);
}

function serialize(v: unknown): string {
  if (v === null) return 'null';
  const t = typeof v;
  if (t === 'string') return JSON.stringify(v);
  if (t === 'boolean') return v ? 'true' : 'false';
  if (t === 'bigint') return (v as bigint).toString();
  if (t === 'number') {
    if (!Number.isFinite(v as number)) {
      throw new CanonicalizationError(`non-finite number is not valid JSON: ${String(v)}`);
    }
    return JSON.stringify(v);
  }
  if (Array.isArray(v)) {
    return '[' + v.map(serialize).join(',') + ']';
  }
  if (t === 'object') {
    const obj = v as Record<string, unknown>;
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort(); // UTF-16 code-unit order == JCS member ordering
    const body = keys.map((k) => JSON.stringify(k) + ':' + serialize(obj[k])).join(',');
    return '{' + body + '}';
  }
  throw new CanonicalizationError(`unsupported type for canonical JSON: ${t}`);
}
