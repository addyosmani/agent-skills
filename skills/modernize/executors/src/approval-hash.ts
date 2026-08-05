// approval-hash.ts — the two hashes the gate lives and dies by, plus the
// manifest/approval shapes (locked to manifest.schema.json + approval.schema.json).
//
// manifest_hash = "sha256:" + SHA256( canonical_json( manifest WITHOUT `approval` ) )
//   (approval-verification.md §3). Stripping `approval` resolves the chicken-and-egg
//   of a block that references the hash of its own container. Contract bodies are
//   bound transitively: each contract entry carries content_hash, those hashes are
//   inside the hashed content, so editing any approved contract changes manifest_hash.

import { createHash } from 'node:crypto';
import { canonicalize } from './canonical-json.js';

export type ApprovalMethod = 'git-signed-tag' | 'git-signed-commit' | 'detached-signature';

export interface ApprovalAnchor {
  ref: string;
  object: string;
  signing_key_fingerprint: string;
}

export interface ApprovalBlock {
  approver: string;
  approved_at: string;
  manifest_hash: string;
  method: ApprovalMethod;
  anchor: ApprovalAnchor;
  notes?: string;
}

export interface ContractEntry {
  contract_id: string;
  version: string;
  path: string;
  content_hash: string;
  linked_requirements?: string[];
}

export interface ManifestLike {
  manifest_version: string;
  contracts: ContractEntry[];
  run_id?: string;
  source_ref?: string;
  target_stack?: string;
  tombstones?: string[];
  approval?: ApprovalBlock;
  [k: string]: unknown;
}

/** Lowercase hex SHA-256 of a string or byte buffer. */
export function sha256Hex(input: string | Uint8Array): string {
  return createHash('sha256').update(input).digest('hex');
}

/** "sha256:" + hex over canonical JSON of the manifest with `approval` removed. */
export function manifestHash(manifest: Record<string, unknown>): string {
  const { approval: _approval, ...rest } = manifest;
  void _approval;
  return 'sha256:' + sha256Hex(canonicalize(rest));
}

/** "sha256:" + hex over canonical JSON of a contract file's parsed body. */
export function contractContentHash(contractBody: unknown): string {
  return 'sha256:' + sha256Hex(canonicalize(contractBody));
}
