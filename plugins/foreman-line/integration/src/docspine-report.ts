/**
 * DocSpine CI hook live entrypoint (W4-P2). Same shape as `report.ts`:
 * acquires the live `runVerify` seam via dynamic import, calls
 * `runDocSpineHook`, prints annotations to stdout, and exits 0.
 *
 * `foreman-line-ci.yml` is BYTE-UNCHANGED this parcel (AC14). The CI wiring
 * step (`npx tsx src/docspine-report.ts`) is a human-applied diff after the
 * §7a DocSpine org-transfer. The exact job YAML snippet is the AC15 wiring
 * artifact included in the PR body.
 *
 * Guarded by `invokedDirectly()` — safe to import in tests without side-effects.
 */
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import type { DocSpineRunVerifyFn } from './docspine-hook.js'
import { runDocSpineHook } from './docspine-hook.js'

/** Injected seams — defaults touch the real live DocSpine import and git. */
export interface DocSpineReportSeams {
  readonly runVerifyFn?: DocSpineRunVerifyFn // default: live dynamic import
  readonly getRepoRoot?: () => string // default: git rev-parse
}

/** Default repo-root seam: `git rev-parse --show-toplevel`. */
function realGetRepoRoot(): string {
  return execFileSync('git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
  }).trim()
}

/**
 * Acquire the live `runVerify` function from DocSpine via dynamic import.
 *
 * PINNED: DocSpine commit 48bc338 (W1 registry wiring complete — clint-morgan/docspine).
 * CI installs via: npm install --no-save github:clint-morgan/docspine#48bc338
 * After §7a org transfer: update to github:KaseyaOne/docspine#48bc338
 */
async function getLiveRunVerifyFn(): Promise<DocSpineRunVerifyFn> {
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error — module not present at compile time; CI installs via npm install --no-save
    const { runVerify } = await import('docspine/src/pipeline/run-verify.js')
    // @ts-expect-error — module not present at compile time; CI installs via npm install --no-save
    const { registry } = await import('docspine/src/registry.js')
    return (root: string) => runVerify(root, registry)
  } catch (err) {
    // DocSpine not installed — return a function that propagates the error.
    // runDocSpineHook's try/catch will catch this and emit the resilience annotation.
    return (_root: string) => Promise.reject(err)
  }
}

/** True when this module is executed directly (not imported by a test). */
function invokedDirectly(): boolean {
  const entry = process.argv[1]
  return entry !== undefined && import.meta.url === pathToFileURL(entry).href
}

if (invokedDirectly()) {
  const seams: DocSpineReportSeams = {}
  const runVerifyFn = seams.runVerifyFn ?? (await getLiveRunVerifyFn())
  const getRepoRoot = seams.getRepoRoot ?? realGetRepoRoot
  const result = await runDocSpineHook({ runVerifyFn, getRepoRoot })
  for (const annotation of result.annotations) {
    console.log(annotation)
  }
  process.exit(result.exitCode)
}
