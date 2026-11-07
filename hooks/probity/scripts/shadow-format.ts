import { summarizeShadowLog, type ShadowDisagreement, type ShadowLogEntry, type ShadowSummary, type TokensByModel } from '../rules/shadow-judge.js'

/**
 * The text `probity-shadow-report` prints for a shadow log's entries,
 * shared with `probity-shadow-replay` (issue #174) so a replay reads
 * the same: agreement, leaks and friction per candidate and per task.
 */

const REASON_EXCERPT = 300

function seconds(ms: number | null): string {
  return ms === null ? '-' : `${(ms / 1000).toFixed(1)} s`
}

function excerpt(text: string): string {
  const line = text.replace(/\s+/g, ' ').trim()
  return line.length > REASON_EXCERPT ? `${line.slice(0, REASON_EXCERPT)}…` : line
}

function tokenLines(title: string, tokens: TokensByModel): string[] {
  const models = Object.entries(tokens)
  if (models.length === 0) return [`  ${title}: none recorded`]
  const count = (n: number) => n.toLocaleString('en-US')
  return [`  ${title}:`, ...models.map(([model, t]) => `    ${model}: in ${count(t.input)}, out ${count(t.output)}`)]
}

function percent(value: number | null): string {
  return value === null ? '-' : `${(value * 100).toFixed(1)}%`
}

/** `k of n <what> (rate, up to bound at 95%)`. */
function rated(k: number, n: number, what: string, upper: number | null): string {
  return n === 0 ? `${k} of 0 ${what}` : `${k} of ${n} ${what} (${percent(k / n)}, up to ${percent(upper)} at 95%)`
}

/** `k/n (≤bound)` for the per-task table. */
function cell(k: number, n: number, upper: number | null): string {
  return n === 0 ? '-' : `${k}/${n} (≤${percent(upper)})`
}

function taskTable(rows: ShadowSummary[]): string[] {
  const width = Math.max(4, ...rows.map((row) => row.task!.length))
  const lines = [`  by task:`, `    ${'task'.padEnd(width)}  verdicts  agreed  leaks (≤95%)         friction (≤95%)`]
  for (const row of rows) {
    const verdicts = row.compared + row.unavailable + row.skipped
    const agreed = row.compared ? percent(row.agreed / row.compared) : '-'
    lines.push(
      `    ${row.task!.padEnd(width)}  ${String(verdicts).padStart(8)}  ${agreed.padStart(6)}  ` +
        `${cell(row.leaks.length, row.primaryDenials, row.leakRateUpper).padEnd(20)} ` +
        cell(row.friction.length, row.primaryPasses, row.frictionRateUpper),
    )
  }
  return lines
}

function listed(title: string, items: ShadowDisagreement[]): string[] {
  const lines = [`  ${title}:`]
  for (const item of items) {
    lines.push(`    ${item.at}  ${item.promptSha256}${item.task ? `  ${item.task}` : ''}`)
    lines.push(`      primary: ${excerpt(item.primaryReason)}`)
    lines.push(`      candidate: ${excerpt(item.candidateReason)}`)
  }
  return lines
}

export function shadowReportLines(
  entries: ShadowLogEntry[],
  { heading, unreadable = 0, show }: { heading: string; unreadable?: number; show?: string },
): string[] {
  const out: string[] = []
  const span = entries.length ? `, ${entries[0]!.at} to ${entries.at(-1)!.at}` : ''
  out.push(`${heading}: ${entries.length} verdicts${span}`)
  if (unreadable) out.push(`${unreadable} unreadable line${unreadable === 1 ? '' : 's'} skipped`)
  const unlabelled = entries.filter((entry) => !entry.task).length
  if (unlabelled) {
    out.push(
      `${unlabelled} of ${entries.length} verdicts (${percent(unlabelled / entries.length)}) have no judging task, ` +
        'so the by-task table cannot place them. Rules added outside a preset need probityConfig() in place of ' +
        'defineConfig(), or withJudgeTasks([...]) around them; verdicts logged before 0.4.50 have none.',
    )
  }
  const compacted = entries.filter((entry) => entry.compaction)
  const kb = (chars: number) => `${(chars / 1000).toFixed(1)}K chars`
  const middle = (values: number[]) => values.sort((a, b) => a - b)[Math.floor((values.length - 1) / 2)]!
  if (compacted.length) {
    out.push(
      `${compacted.length} of ${entries.length} verdicts had a compacted prompt (a diff in place of the file), median ` +
        `${kb(middle(compacted.map((entry) => entry.compaction!.fullChars)))} sent as ` +
        `${kb(middle(compacted.map((entry) => entry.compaction!.sentChars)))}`,
    )
  }
  const split = compacted.length
    ? {
        compacted: summarizeShadowLog(compacted),
        whole: summarizeShadowLog(entries.filter((entry) => !entry.compaction)),
      }
    : undefined
  function promptKindLines(candidate: string): string[] {
    if (!split) return []
    return (['compacted', 'whole'] as const).flatMap((kind) => {
      const row = split[kind].find((each) => each.candidate === candidate && each.task === undefined)
      if (!row) return []
      return [
        `  on ${kind} prompts: agreed ${row.agreed} of ${row.compared}, ` +
          `leaks ${rated(row.leaks.length, row.primaryDenials, 'primary denials', row.leakRateUpper)}, ` +
          `friction ${rated(row.friction.length, row.primaryPasses, 'primary passes', row.frictionRateUpper)}`,
      ]
    })
  }
  const rows = summarizeShadowLog(entries)
  for (const row of rows.filter((candidate) => candidate.task === undefined)) {
    const rate = row.compared ? ` (${percent(row.agreed / row.compared)})` : ''
    out.push('', `${row.candidate}, all tasks`)
    out.push(`  agreed ${row.agreed} of ${row.compared}${rate}`)
    out.push(`  leaks ${rated(row.leaks.length, row.primaryDenials, 'primary denials', row.leakRateUpper)}`)
    out.push(`  friction ${rated(row.friction.length, row.primaryPasses, 'primary passes', row.frictionRateUpper)}`)
    out.push(...promptKindLines(row.candidate))
    out.push(`  unavailable ${row.unavailable}, skipped ${row.skipped} (primary unavailable)`)
    out.push(`  median ${seconds(row.medianMs)} (primary ${seconds(row.primaryMedianMs)})`)
    out.push(...tokenLines('tokens', row.tokens), ...tokenLines('primary tokens', row.primaryTokens))
    out.push(...taskTable(rows.filter((task) => task.candidate === row.candidate && task.task !== undefined)))
    if ((show === 'leaks' || show === 'all') && row.leaks.length) out.push(...listed('leaks', row.leaks))
    if ((show === 'friction' || show === 'all') && row.friction.length) out.push(...listed('friction', row.friction))
  }
  return out
}
