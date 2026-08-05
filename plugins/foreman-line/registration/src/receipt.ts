/**
 * Stage-B receipt (charter F8; coordinator ruling Q8). Exactly one
 * `ReceiptDocument` appended at registration: `kind:'stage'`, `stage:'B'`,
 * `sequence:1`, `prevHash` = the genesis hash from the approval record,
 * `correlation` = the approval record's (same `workflowId` - the chain key),
 * `subjectKind:'RegistrationResult'`, `subject` = the `RegistrationResult`,
 * `signature:null`, `schemaVersion:'1'`,
 * `hash = sha256Hex(canonicalize(<doc minus the hash key>))` - reusing
 * `approval`'s exported `canonicalize`/`sha256Hex` (the shipped hash domain),
 * and validated with the shipped `validateReceiptDocument` before write.
 */
import { canonicalize, type JsonValue, sha256Hex } from '../../approval/src/index.js'
import type { CorrelationContext, RegistrationResult } from '../../contracts/src/index.js'
import {
  type ReceiptDocument,
  receiptPath,
  validateReceiptDocument,
} from '../../receipts/src/index.js'

export const RECEIPT_SCHEMA_VERSION = '1'
export const STAGE_B_SUBJECT_KIND = 'RegistrationResult'

export interface MintedStageBReceipt {
  readonly document: ReceiptDocument
  readonly locator: string
}

/**
 * Mint the Stage-B `ReceiptDocument` for `result`, appended to the genesis
 * chain via `prevHash`. Throws if the minted document fails
 * `validateReceiptDocument`. The locator is the shipped
 * `receiptPath(workflowId, 1, 'B', 'RegistrationResult')`.
 */
export function mintStageBReceipt(
  correlation: CorrelationContext,
  prevHash: string,
  result: RegistrationResult,
  timestamp: string,
): MintedStageBReceipt {
  const draft = {
    schemaVersion: RECEIPT_SCHEMA_VERSION,
    kind: 'stage' as const,
    stage: 'B' as const,
    claimRef: null,
    correlation,
    sequence: 1,
    prevHash,
    timestamp,
    subjectKind: STAGE_B_SUBJECT_KIND,
    subject: result,
    signature: null,
  }
  const hash = sha256Hex(canonicalize(draft as unknown as JsonValue))
  const document = { ...draft, hash } as unknown as ReceiptDocument

  const validation = validateReceiptDocument(document)
  if (!validation.valid) {
    throw new Error(
      `mintStageBReceipt: minted document fails validateReceiptDocument: ${validation.errors.join('; ')}`,
    )
  }

  const locator = receiptPath(correlation.workflowId, 1, 'B', STAGE_B_SUBJECT_KIND)
  return { document, locator }
}
