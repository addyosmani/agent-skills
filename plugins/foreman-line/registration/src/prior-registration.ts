/**
 * Prior-registration / reconcile ordering (coordinator ruling Q5 - ratified,
 * dual-review target). The write-back mutates the referenced spec `.md` files
 * (`ticket: KONE-TBD` -> real key), which changes their content hash - so a
 * naive F7 re-derivation would refuse every re-run after the first. Resolution:
 * detection runs BEFORE F7 and keys off the Stage-B RECEIPT for the same
 * `workflowId`, NOT off non-TBD ticket keys.
 *
 * The abuse this closes: reconcile mode must be unreachable for genuinely
 * unapproved content. Because the Stage-B receipt is minted only by a completed
 * first registration that itself passed F7, a caller cannot fabricate reconcile
 * mode by hand-editing `ticket:` keys into unapproved specs - there is no
 * Stage-B receipt for a workflowId that never registered. Order:
 * prior-registration(Stage-B receipt) -> else F7 -> else create.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ApprovalRecord } from '../../approval/src/index.js'
import { type ReceiptDocument, receiptPath, validateChain } from '../../receipts/src/index.js'

export type RegistrationMode = 'first' | 'reconcile'

/** The Stage-B receipt locator for a workflow (`docs/receipts/<wf>/000001-B-registration-result.json`). */
export function stageBReceiptLocator(workflowId: string): string {
  return receiptPath(workflowId, 1, 'B', 'RegistrationResult')
}

function readJsonIfExists(absPath: string): unknown {
  if (!existsSync(absPath)) return undefined
  return JSON.parse(readFileSync(absPath, 'utf8'))
}

/**
 * `reconcile` iff the Stage-B receipt for this workflowId exists AND forms a
 * valid chain with the genesis receipt from the approval record; otherwise
 * `first`. A missing/forged/broken chain falls back to `first` - which then
 * runs F7 and (on changed content) refuses, never silently reconciling.
 */
export function detectRegistrationMode(record: ApprovalRecord, repoRoot: string): RegistrationMode {
  const workflowId = record.correlation.workflowId
  const stageBAbs = join(repoRoot, ...stageBReceiptLocator(workflowId).split('/'))
  const genesisAbs = join(repoRoot, ...record.receipt.locator.split('/'))

  const stageB = readJsonIfExists(stageBAbs)
  const genesis = readJsonIfExists(genesisAbs)
  if (stageB === undefined || genesis === undefined) return 'first'

  const chain = validateChain([genesis as ReceiptDocument, stageB as ReceiptDocument])
  return chain.valid ? 'reconcile' : 'first'
}
