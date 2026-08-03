/**
 * Canonical sample values, typed against `types.ts`, used by the parity test
 * to prove each schema actually accepts values of the shape its type
 * describes. `sampleRegistry` mirrors the shipped v0 `permission-profiles.yaml`
 * content exactly (same six profiles, same v0 contents) so the parity test
 * and the shipped-file fidelity test are checking the same intended shape
 * from two independent angles.
 */
import type {
  NetworkIntent,
  PermissionEnvelope,
  PermissionProfile,
  PermissionProfileRegistry,
} from './types.js'

/** Both shells, self-modification guard (D9). */
export const SELF_MOD_GUARD_DENIES: readonly string[] = ['Edit(.claude/**)', 'Write(.claude/**)']

/** Force-push denials in both shells, matching this repo's own live `.claude/settings.local.json`. */
export const FORCE_PUSH_DENIES: readonly string[] = [
  'Bash(git push --force*)',
  'Bash(git push -f *)',
  'PowerShell(git push --force*)',
  'PowerShell(git push -f *)',
]

/**
 * The five enumerable repo-mutation commands (charter D9-amendment(b)),
 * denied in both `Bash(...)` and `PowerShell(...)` forms — ten rules total.
 */
export const REVIEWER_MUTATION_COMMAND_DENIES: readonly string[] = [
  'Bash(git commit*)',
  'PowerShell(git commit*)',
  'Bash(git push*)',
  'PowerShell(git push*)',
  'Bash(git apply*)',
  'PowerShell(git apply*)',
  'Bash(git stash*)',
  'PowerShell(git stash*)',
  'Bash(git merge*)',
  'PowerShell(git merge*)',
]

export const sampleNetworkIntent: NetworkIntent = {
  egress: 'allowlist',
  notes:
    'dependency-registry access; DOCUMENTATION-ONLY in this goal - not proven to gate at the process boundary (charter D4/F-L)',
}

export const sampleEnvelope: PermissionEnvelope = {
  deny: [...FORCE_PUSH_DENIES, ...SELF_MOD_GUARD_DENIES],
  ask: [],
  allow: ['Read', 'Edit', 'Write', 'Bash', 'PowerShell', 'Glob', 'Grep'],
  network: { egress: 'denied' },
}

export const sampleProfile: PermissionProfile = {
  description: 'Standard-risk builder: broad read/write within its own worktree, no network need.',
  envelope: sampleEnvelope,
}

const builderStandardEnvelope: PermissionEnvelope = {
  deny: [...FORCE_PUSH_DENIES, ...SELF_MOD_GUARD_DENIES],
  ask: [],
  allow: ['Read', 'Edit', 'Write', 'Bash', 'PowerShell', 'Glob', 'Grep'],
  network: { egress: 'denied' },
}

export const sampleRegistry: PermissionProfileRegistry = {
  profiles: {
    coordinator: {
      description:
        'Coordinator: broad tool access including push/PR/merge, per COORDINATOR-PATTERN.md dispatch table.',
      envelope: {
        deny: [...FORCE_PUSH_DENIES, ...SELF_MOD_GUARD_DENIES],
        ask: [],
        allow: [
          'Read',
          'Edit',
          'Write',
          'Bash',
          'PowerShell',
          'Glob',
          'Grep',
          'Agent',
          'Skill',
          'SendMessage',
          'ScheduleWakeup',
          'Monitor',
          'TaskCreate',
          'TaskUpdate',
          'TaskList',
          'TaskGet',
          'TaskOutput',
          'TaskStop',
        ],
      },
    },
    'builder-standard': {
      description:
        'Standard-risk builder: broad read/write within its own worktree, no network need.',
      envelope: builderStandardEnvelope,
    },
    'builder-architecture': {
      description:
        'Architecture/risk builder: v0 envelope identical to builder-standard - the distinction is model-tier and review-depth, not capability set.',
      envelope: builderStandardEnvelope,
    },
    'reviewer-readonly': {
      description:
        'Adversarial reviewer: never fixes, never commits. Denies Edit/Write tools and the enumerable repo-mutation commands in both shells; deliberately retains bare Bash/PowerShell for hostile-input probing (lesson #12).',
      envelope: {
        deny: ['Edit', 'Write', ...SELF_MOD_GUARD_DENIES, ...REVIEWER_MUTATION_COMMAND_DENIES],
        ask: [],
        allow: ['Read', 'Glob', 'Grep', 'Bash', 'PowerShell'],
      },
    },
    'shaping-agent': {
      description:
        'Shaping agent: docs-only writes. Denies non-docs write surfaces by enumerable prefix; allow-narrows to docs/** (documentation-only).',
      envelope: {
        deny: [
          ...FORCE_PUSH_DENIES,
          ...SELF_MOD_GUARD_DENIES,
          'Edit(plugins/**)',
          'Write(plugins/**)',
          'Edit(skills/**)',
          'Write(skills/**)',
          'Edit(apps/**)',
          'Write(apps/**)',
          'Edit(config/**)',
          'Write(config/**)',
        ],
        ask: [],
        allow: ['Read', 'Glob', 'Grep', 'Edit(docs/**)', 'Write(docs/**)'],
      },
    },
    'builder-deps': {
      description:
        "builder-standard's envelope plus declared (documentation-only) network egress allowlist intent for dependency-registry access.",
      envelope: {
        deny: [...FORCE_PUSH_DENIES, ...SELF_MOD_GUARD_DENIES],
        ask: [],
        allow: ['Read', 'Edit', 'Write', 'Bash', 'PowerShell', 'Glob', 'Grep'],
        network: {
          egress: 'allowlist',
          notes:
            'dependency-registry access; DOCUMENTATION-ONLY in this goal - not proven to gate at the process boundary (charter D4/F-L)',
        },
      },
    },
  },
}
