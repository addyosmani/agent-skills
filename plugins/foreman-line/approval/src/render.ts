/**
 * Read-only rendering of the Epic/Story tree read from a projected
 * `ShapingResult` - Epic key + title, each Story key + title,
 * `parcelSpecRefs`. Mints nothing; safe in CI / non-TTY (`show`).
 */
import type { ShapingResult } from '../../contracts/src/index.js'

export function renderTree(result: ShapingResult): string {
  const lines: string[] = []
  lines.push(`parcelSpecRefs (${result.parcelSpecRefs.length}):`)
  for (const ref of result.parcelSpecRefs) {
    lines.push(`  - ${ref}`)
  }
  lines.push('')
  lines.push(`epics (${result.epics.length}):`)
  for (const epic of result.epics) {
    lines.push(`  Epic ${epic.key}: ${epic.title}`)
    for (const story of epic.stories) {
      lines.push(`    Story ${story.key}: ${story.title}`)
    }
  }
  return lines.join('\n')
}
