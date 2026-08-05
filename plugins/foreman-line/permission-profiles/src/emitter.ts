/**
 * Dispatch-time permission-profile emitter (permission-profile-registry goal,
 * P3). Adds the `dispatch-worktree` verb's engine to P1's package: resolve a
 * named profile against the shipped registry, project its envelope into a
 * worktree-local `.claude/settings.local.json`, and create the git worktree +
 * branch it belongs to — all before any builder/reviewer session launches.
 *
 * This is NOT a dispatch-order producer (charter F-E / decision #4): it emits
 * `settings.local.json` and prints a plain operator audit line, and has no
 * import of the P2 contracts package or any sibling package. It consumes only P1's own
 * exports (`validateRegistry`, `PROFILE_NAMES`, types) and reads its own
 * shipped `permission-profiles.yaml` — P3 *is* this package growing a second
 * verb, not a cross-package dependency.
 *
 * Fail-fast ordering (spec Operation order): the profile is resolved and the
 * registry validated BEFORE any git mutation, so a bad profile or a broken
 * registry leaves no git state to roll back.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import type { PermissionEnvelope, PermissionMode, PermissionProfile } from './types.js'
import { PROFILE_NAMES } from './types.js'
import { validateRegistry } from './validator.js'

/** The package's own shipped registry document — the resolution authority. */
export const SHIPPED_REGISTRY_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'permission-profiles.yaml',
)

/**
 * The projected `permissions` object, matching Claude Code's live
 * `settings.local.json` shape. `allow` and `network` are deliberately absent
 * (decision #7 / D9 / F-L): the emitted enforced artifact is purely
 * restrictive, so no reader mistakes an `allow` line for the restriction
 * mechanism.
 */
export interface ProjectedPermissions {
  readonly deny: readonly string[]
  readonly ask: readonly string[]
  readonly defaultMode?: PermissionMode
  readonly additionalDirectories?: readonly string[]
}

export interface ProjectedSettings {
  readonly permissions: ProjectedPermissions
}

/**
 * Project a resolved envelope into the emitted `settings.local.json` object.
 *
 * - `deny` / `ask`: projected verbatim (deny is THE restriction mechanism).
 * - `defaultMode`: only if the profile declares one (never `bypassPermissions`
 *   — P1's schema cannot express it, so it can never reach here).
 * - `additionalDirectories`: only if declared.
 * - `allow` / `network`: NOT projected (documentation-only).
 */
export function projectEnvelope(envelope: PermissionEnvelope): ProjectedSettings {
  const permissions: {
    deny: readonly string[]
    ask: readonly string[]
    defaultMode?: PermissionMode
    additionalDirectories?: readonly string[]
  } = {
    deny: [...envelope.deny],
    ask: [...envelope.ask],
  }
  if (envelope.defaultMode !== undefined) {
    permissions.defaultMode = envelope.defaultMode
  }
  if (envelope.additionalDirectories !== undefined) {
    permissions.additionalDirectories = [...envelope.additionalDirectories]
  }
  return { permissions }
}

export interface ResolveResult {
  readonly profile?: PermissionProfile
  /** Populated only on failure; each entry is one operator-facing reason. */
  readonly errors: readonly string[]
}

/**
 * Resolve a profile name against a registry document. Always runs
 * `validateRegistry` first (AC3: a resolution path that does not first
 * validate the registry is a defect); a registry that fails validation yields
 * every violation as an error and no profile. The name is assumed already
 * checked against `PROFILE_NAMES` by the caller (a bad name is a usage error,
 * code 2, handled upstream) — but indexing is still guarded.
 */
export function resolveProfile(
  profileName: string,
  registryPath: string = SHIPPED_REGISTRY_PATH,
): ResolveResult {
  let raw: string
  try {
    raw = readFileSync(registryPath, 'utf8')
  } catch (err) {
    return { errors: [`cannot read registry '${registryPath}': ${(err as Error).message}`] }
  }

  let doc: unknown
  try {
    doc = parse(raw)
  } catch (err) {
    return {
      errors: [`cannot parse registry '${registryPath}' as YAML: ${(err as Error).message}`],
    }
  }

  const result = validateRegistry(doc)
  if (!result.valid) {
    return { errors: result.errors }
  }

  // The registry is valid, so invariant 1 guarantees `profiles` has exactly
  // PROFILE_NAMES as keys; indexing a known name cannot miss.
  const profiles = (doc as { profiles: Record<string, PermissionProfile> }).profiles
  const profile = profiles[profileName]
  if (profile === undefined) {
    return {
      errors: [`profile '${profileName}' is not present in the resolved registry`],
    }
  }
  return { profile, errors: [] }
}

export interface DispatchOptions {
  readonly parcel: string
  readonly profile: string
  readonly path: string
  /** Directory the git worktree command runs in. Default: `process.cwd()`. */
  readonly cwd?: string
  /** Registry document to resolve against. Default: the shipped registry. */
  readonly registryPath?: string
}

export interface DispatchResult {
  readonly code: 0 | 1 | 2
  readonly stdout: string
  readonly stderr: string
}

/** Derive the branch name from the parcel ref (lesson #9 convention). */
export function branchForParcel(parcel: string): string {
  return `feat/foreman-line-${parcel}`
}

/**
 * The `dispatch-worktree` engine. Pure with respect to argv/stdout/stderr: it
 * returns the exit code and the text to emit, so the CLI stays a trivial
 * pass-through and the exit-code contract is unit-testable without a
 * subprocess. Side effects (git worktree creation, file writes) happen against
 * `cwd` / the real filesystem.
 *
 * Operation order (fail-fast):
 *   1. Validate the profile name against PROFILE_NAMES (bad value → 2).
 *   2. Resolve + validate the registry, index the profile (broken → 1).
 *   3. Pre-flight the target path (parent must exist; path must not) (→ 1).
 *   4. `git worktree add <path> -b <branch>` (git failure → 1).
 *   5. Refuse to overwrite an existing settings.local.json (→ 1).
 *   6. Write the projected settings; on write failure report the created
 *      worktree and exit 1 (no automatic `git worktree remove`).
 *   7. Print the audit line; exit 0.
 */
export function dispatchWorktree(options: DispatchOptions): DispatchResult {
  const { parcel, profile, path } = options
  const cwd = options.cwd ?? process.cwd()
  const registryPath = options.registryPath ?? SHIPPED_REGISTRY_PATH

  // Step 1 — unknown profile name is a usage error (bad argument value),
  // caught before any git mutation.
  if (!(PROFILE_NAMES as readonly string[]).includes(profile)) {
    return {
      code: 2,
      stdout: '',
      stderr: `error: unknown --profile '${profile}'; must be one of: ${PROFILE_NAMES.join(', ')}\n`,
    }
  }

  // Step 2 — resolve against the registry (validateRegistry gate first).
  const resolved = resolveProfile(profile, registryPath)
  if (resolved.profile === undefined) {
    return {
      code: 1,
      stdout: '',
      stderr: `${resolved.errors.map((e) => `error: ${e}`).join('\n')}\n`,
    }
  }

  const branch = branchForParcel(parcel)

  // Step 3 — pre-flight the target path (decision #6 create semantics).
  if (existsSync(path)) {
    return {
      code: 1,
      stdout: '',
      stderr: `error: --path '${path}' already exists; the wrapper creates a new worktree and will not clobber an existing path\n`,
    }
  }
  const parent = dirname(path)
  if (!existsSync(parent)) {
    return {
      code: 1,
      stdout: '',
      stderr: `error: parent directory '${parent}' of --path does not exist; create it before dispatching\n`,
    }
  }

  // Step 4 — create the worktree + branch (the sole git mutation).
  const git = spawnSync('git', ['worktree', 'add', path, '-b', branch], {
    cwd,
    encoding: 'utf8',
  })
  if (git.status !== 0) {
    const detail = (git.stderr || git.stdout || (git.error as Error | undefined)?.message || '')
      .toString()
      .trim()
    return {
      code: 1,
      stdout: '',
      stderr: `error: 'git worktree add ${path} -b ${branch}' failed${detail ? `: ${detail}` : ''}\n`,
    }
  }

  // Step 5 — refuse to overwrite an existing settings.local.json.
  const settingsPath = join(path, '.claude', 'settings.local.json')
  if (existsSync(settingsPath)) {
    return {
      code: 1,
      stdout: '',
      stderr: `error: '${settingsPath}' already exists; refusing to overwrite. The worktree at '${path}' was created and left in place for explicit cleanup.\n`,
    }
  }

  // Step 6 — write the projected settings.
  const settings = projectEnvelope(resolved.profile.envelope)
  try {
    mkdirSync(dirname(settingsPath), { recursive: true })
    writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8')
  } catch (err) {
    return {
      code: 1,
      stdout: '',
      stderr: `error: failed to write '${settingsPath}': ${(err as Error).message}. The worktree at '${path}' was created and left in place for explicit cleanup.\n`,
    }
  }

  // Step 7 — audit line (NOT a dispatch-order payload; a plain operator record).
  const stdout = `profile: ${profile}\nbranch: ${branch}\npath: ${path}\nsettings: ${settingsPath}\n`
  return { code: 0, stdout, stderr: '' }
}
