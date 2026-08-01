/**
 * Ticket-frontmatter back-fill (coordinator ruling Q9). Edits ONLY the
 * `ticket:` frontmatter line (`KONE-TBD` -> the real key) in a referenced spec
 * draft. Never flips `status:`, never moves a spec between folders, never
 * touches spec body content - so the approved content hash is affected only by
 * the single `ticket:` line change, which is exactly what marks the spec
 * registered. Linear-time (line split + `startsWith`; no regex).
 */
import { readFileSync, writeFileSync } from 'node:fs'

const TICKET_PREFIX = 'ticket:'

/** Snapshot of a file's bytes, for rollback if a subsequent commit fails. */
export interface FileSnapshot {
  readonly absPath: string
  readonly original: string
}

/**
 * Rewrite the first `ticket:` frontmatter line to `ticket: <ticketKey>`,
 * returning a snapshot of the pre-edit content. Throws if the spec has no
 * `ticket:` line. Only that one line changes; every other byte is preserved.
 */
export function backfillTicketLine(absSpecPath: string, ticketKey: string): FileSnapshot {
  const original = readFileSync(absSpecPath, 'utf8')
  const lines = original.split('\n')
  let edited = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line?.startsWith(TICKET_PREFIX)) {
      lines[i] = `${TICKET_PREFIX} ${ticketKey}`
      edited = true
      break
    }
  }
  if (!edited) {
    throw new Error(`backfillTicketLine: no '${TICKET_PREFIX}' frontmatter line in ${absSpecPath}`)
  }
  writeFileSync(absSpecPath, lines.join('\n'), 'utf8')
  return { absPath: absSpecPath, original }
}

/** Restore snapshots to disk (rollback of back-fill writes when a commit fails). */
export function restoreSnapshots(snapshots: readonly FileSnapshot[]): void {
  for (const snap of snapshots) {
    writeFileSync(snap.absPath, snap.original, 'utf8')
  }
}
