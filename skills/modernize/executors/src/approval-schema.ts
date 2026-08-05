// approval-schema.ts — focused validator for the `approval` block (gate check #2).
//
// Deliberately NOT a general JSON-Schema engine: this is one small, fixed schema
// (approval.schema.json) and a hand-mirror of it is more auditable, zero-dependency,
// and impossible to silently weaken than wiring a full validator for a single object.
// If the schema grows or more documents need validating, swap to ajv — isolated here.
// Mirrors approval.schema.json EXACTLY, including additionalProperties:false.

import type { ApprovalBlock } from './approval-hash.js';

const METHODS = ['git-signed-tag', 'git-signed-commit', 'detached-signature'] as const;
const HASH_RE = /^sha256:[a-f0-9]{64}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const ALLOWED = new Set(['approver', 'approved_at', 'manifest_hash', 'method', 'anchor', 'notes']);
const ANCHOR_ALLOWED = new Set(['ref', 'object', 'signing_key_fingerprint']);

export interface ApprovalSchemaResult {
  valid: boolean;
  errors: string[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Validate an `approval` block against approval.schema.json. Pure; never throws. */
export function validateApprovalBlock(approval: unknown): ApprovalSchemaResult {
  const e: string[] = [];
  if (!isRecord(approval)) return { valid: false, errors: ['approval: must be an object'] };

  if (typeof approval.approver !== 'string' || approval.approver.length < 1) {
    e.push('approver: required non-empty string');
  }
  if (typeof approval.approved_at !== 'string' || !ISO_RE.test(approval.approved_at)) {
    e.push('approved_at: required ISO 8601 date-time');
  }
  if (typeof approval.manifest_hash !== 'string' || !HASH_RE.test(approval.manifest_hash)) {
    e.push('manifest_hash: required, must match sha256:<64 lowercase hex>');
  }
  if (typeof approval.method !== 'string' || !(METHODS as readonly string[]).includes(approval.method)) {
    e.push(`method: required, one of ${METHODS.join(' | ')}`);
  }

  const anchor = approval.anchor;
  if (!isRecord(anchor)) {
    e.push('anchor: required object');
  } else {
    if (typeof anchor.ref !== 'string' || anchor.ref.length < 1) e.push('anchor.ref: required non-empty string');
    if (typeof anchor.object !== 'string' || anchor.object.length < 7) e.push('anchor.object: required string (>=7 chars)');
    if (typeof anchor.signing_key_fingerprint !== 'string' || anchor.signing_key_fingerprint.length < 8) {
      e.push('anchor.signing_key_fingerprint: required string (>=8 chars)');
    }
    for (const k of Object.keys(anchor)) if (!ANCHOR_ALLOWED.has(k)) e.push(`anchor: unexpected property '${k}'`);
  }

  if ('notes' in approval && typeof approval.notes !== 'string') e.push('notes: must be a string when present');
  for (const k of Object.keys(approval)) if (!ALLOWED.has(k)) e.push(`approval: unexpected property '${k}'`);

  return { valid: e.length === 0, errors: e };
}

/** Narrow to ApprovalBlock once validated (caller has already checked .valid). */
export function asApprovalBlock(approval: unknown): ApprovalBlock {
  return approval as ApprovalBlock;
}
