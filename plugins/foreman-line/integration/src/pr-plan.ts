/**
 * PR-automation planner (W4-P1, AC9). Assembles the commit/push/PR-open plan
 * for a built branch and drives the actual `git`/`gh` operations through
 * injected seams (default = real, tests = mock) — mirroring `dispatch`'s
 * `dispatchWorktreeFn ?? realDispatchWorktree` pattern
 * (`dispatch/src/approval-cli/index.ts:411`).
 */
import { execFileSync } from 'node:child_process'
import { IntegrationError } from './errors.js'

export interface PrAutomationInput {
  readonly branch: string
  readonly base: string
  readonly title: string
  readonly prBody: string
  readonly repoRoot: string
}

export interface PlannedOperation {
  readonly op: 'git-push' | 'gh-pr-create'
  readonly description: string
}

/** Pure — no side effects. Assembles the ordered plan from caller inputs. */
export interface PrAutomationPlan {
  readonly branch: string
  readonly base: string
  readonly title: string
  readonly prBody: string
  readonly operations: readonly PlannedOperation[]
}

export interface GitPushArgs {
  readonly branch: string
  readonly repoRoot: string
}
export interface GitPushResult {
  readonly code: number
  readonly stdout: string
  readonly stderr: string
}
/** Injected seam for the real `git push` side effect. */
export type GitPushFn = (args: GitPushArgs) => GitPushResult

export interface GhPrCreateArgs {
  readonly branch: string
  readonly base: string
  readonly title: string
  readonly prBody: string
  readonly repoRoot: string
}
export interface GhPrCreateResult {
  readonly code: number
  readonly stdout: string
  readonly stderr: string
}
/** Injected seam for the real `gh pr create` side effect. */
export type GhPrCreateFn = (args: GhPrCreateArgs) => GhPrCreateResult

export interface PrAutomationSeams {
  readonly gitPushFn?: GitPushFn
  readonly ghPrCreateFn?: GhPrCreateFn
}

export interface PrAutomationResult {
  readonly plan: PrAutomationPlan
  readonly gitPushResult: GitPushResult
  readonly ghPrCreateResult: GhPrCreateResult
}

/** Real `git push` — invoked only when no `gitPushFn` seam is injected. */
function realGitPush(args: GitPushArgs): GitPushResult {
  try {
    const stdout = execFileSync('git', ['push', '--set-upstream', 'origin', args.branch], {
      cwd: args.repoRoot,
      encoding: 'utf8',
    })
    return { code: 0, stdout, stderr: '' }
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string }
    return { code: e.status ?? 1, stdout: e.stdout ?? '', stderr: e.stderr ?? String(err) }
  }
}

/** Real `gh pr create` — invoked only when no `ghPrCreateFn` seam is injected. */
function realGhPrCreate(args: GhPrCreateArgs): GhPrCreateResult {
  try {
    const stdout = execFileSync(
      'gh',
      [
        'pr',
        'create',
        '--base',
        args.base,
        '--head',
        args.branch,
        '--title',
        args.title,
        '--body',
        args.prBody,
      ],
      { cwd: args.repoRoot, encoding: 'utf8' },
    )
    return { code: 0, stdout, stderr: '' }
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string }
    return { code: e.status ?? 1, stdout: e.stdout ?? '', stderr: e.stderr ?? String(err) }
  }
}

function assertNonEmpty(value: string, field: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new IntegrationError(
      'PLAN_INVALID',
      `${field} must be a non-empty string, got ${JSON.stringify(value)}`,
    )
  }
}

/** Pure assembly of the commit/push/PR-open plan — no side effects. */
export function buildPrAutomationPlan(input: PrAutomationInput): PrAutomationPlan {
  assertNonEmpty(input.branch, 'branch')
  assertNonEmpty(input.base, 'base')
  assertNonEmpty(input.title, 'title')

  return {
    branch: input.branch,
    base: input.base,
    title: input.title,
    prBody: input.prBody,
    operations: [
      { op: 'git-push', description: `push '${input.branch}' to origin` },
      { op: 'gh-pr-create', description: `open a PR '${input.branch}' -> '${input.base}'` },
    ],
  }
}

/**
 * Assembles the plan (pure) and drives it through the git/gh seams
 * (default = real, tests = mock). Neither `realGitPush` nor
 * `realGhPrCreate` is exercised by the hermetic test suite — every test
 * supplies both seams as mocks.
 */
export function planPrAutomation(
  input: PrAutomationInput,
  seams: PrAutomationSeams = {},
): PrAutomationResult {
  const plan = buildPrAutomationPlan(input)

  const gitPushFn = seams.gitPushFn ?? realGitPush
  const ghPrCreateFn = seams.ghPrCreateFn ?? realGhPrCreate

  const gitPushResult = gitPushFn({ branch: plan.branch, repoRoot: input.repoRoot })
  const ghPrCreateResult = ghPrCreateFn({
    branch: plan.branch,
    base: plan.base,
    title: plan.title,
    prBody: plan.prBody,
    repoRoot: input.repoRoot,
  })

  return { plan, gitPushResult, ghPrCreateResult }
}
