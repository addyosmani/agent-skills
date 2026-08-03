# Foreman Line — Permission-Profile Registry, Validator + Dispatch-Time Emitter (P1 + P3)

Named, deny-first permission envelopes (goal `permission-profile-registry`,
charter D4/D9). Ships the schema, TypeScript types, the concrete v0
`permission-profiles.yaml`, a validator (P1), and a `dispatch-worktree`
emitter that resolves a named profile and projects it into a freshly created
worktree's `.claude/settings.local.json` (P3). Does **not**
enum-validate any spec's `permission_profile:` frontmatter (P4) and does
**not** construct or touch a `DispatchOrder` (F-E — type-level field only,
no live producer). Ships as a
**fifth copy** of the `registry.ts`/`generate.ts`/`testing.ts` scaffold
already shipped by `routing-policy`/`receipts`/`spec-linter`/`skill-injection`
(charter D3) — no shared extraction in this goal, even though the extraction
trigger those siblings named for themselves is now met (carried forward as a
Stage-F next-wave candidate, not acted on here). This package imports from no
sibling `plugins/foreman-line/*` package.

## Schema shape

`PermissionProfileRegistry` = `{ profiles }`, keyed by the six locked v0
profile names. Field names deliberately match Claude Code's
`settings.local.json` `permissions` object 1:1 (verified against this repo's
own live `.claude/settings.local.json`): `allow[]`/`deny[]`/`defaultMode`/
`additionalDirectories[]`; rules are a bare tool name (`"Edit"`) or
`ToolName(specifier)` (`"Bash(git push --force*)"`).

- **`PermissionRule`** — `^[A-Za-z][A-Za-z0-9_-]*(\(.+\))?$`. Tool existence
  and specifier semantics are opaque here — only well-formedness is checked.
- **`PermissionEnvelope`** — `deny`/`ask`/`allow` (required rule arrays),
  optional `defaultMode` (`'default'|'acceptEdits'|'plan'` —
  **`bypassPermissions` excluded at the schema `enum` layer**), optional
  `additionalDirectories`, optional `network` (documentation-only).
- **`PermissionProfile`** — `description` (non-empty) + `envelope`.
- **`NetworkIntent`** — `{ egress: 'denied'|'allowlist'|'allowed', notes? }`.
  **DOCUMENTATION-ONLY (F-L):** no probe in this goal proves a network rule
  gates at the process boundary; nothing here claims otherwise.

## Deny-first ruling (D9)

`deny`/`ask` are **the** restriction mechanism; `allow` is documentation of
intent only — the validator assigns it no restrictive meaning, and no
invariant below can be satisfied by an `allow` entry. Target file is the
untracked `.claude/settings.local.json`, never the tracked
`settings.json` — `dispatch-worktree` (below) is what projects a resolved
profile into that file. Every profile denies `Edit`/`Write` on its own
worktree's `.claude/**` (self-modification guard).

## `PROFILE_NAMES` — the authoritative artifact (F-I)

The single source of truth for legal profile names is the exported
`PROFILE_NAMES` (`readonly ProfileName[]`) and its `ProfileName` union, both
in `src/types.ts`, re-exported from `src/index.ts` — mirrors `routing-policy`'s
`CLASS_NAMES`/`ClassName` precedent. **P4 binds by importing `PROFILE_NAMES`**,
never by re-parsing `permission-profiles.yaml` or re-deriving the list.
`permission-profiles.yaml`'s `profiles` keys are validated to exactly equal
`PROFILE_NAMES` (invariant 1), so document and code can never silently drift;
adding a seventh profile is a reviewed code change, not a YAML edit.

## The six v0 profiles

`coordinator` / `builder-standard` / `builder-architecture` / `builder-deps`
each deny force-push (both shells) + the self-mod guard. `builder-architecture`'s
v0 envelope is deliberately identical to `builder-standard`'s (the
distinction is model-tier/review-depth, not capability). `builder-deps` adds
`network: { egress: 'allowlist' }` (documentation-only) on top of
`builder-standard`'s envelope. `shaping-agent` additionally denies non-docs
write-surface prefixes (`plugins/**`, `skills/**`, `apps/**`, `config/**`)
and allow-narrows to `docs/**`. `reviewer-readonly` — see below.

## The five enforced invariants

1. **Profile-set completeness (F-I):** `profiles` keys must exactly equal
   `PROFILE_NAMES`.
2. **Self-modification guard (D9):** every profile's `deny` must cover
   `Edit(.claude/**)` and `Write(.claude/**)` (a bare `Edit`/`Write` deny
   suffices).
3. **No self-nullifying mode (D9-amendment(a)):** schema `enum` excludes
   `bypassPermissions`; the validator restates it with a clear message.
4. **`reviewer-readonly` restriction completeness (D9-amendment(b)):** must
   deny bare `Edit`/`Write`, AND each of `git commit`/`push`/`apply`/`stash`/
   `merge` in **both** `Bash(...)` and `PowerShell(...)` form.
5. **`reviewer-readonly` shell-access preservation (D9-amendment(c)):** must
   **not** deny bare `Bash` or bare `PowerShell` — shell stays available for
   hostile-input probing (lesson #12). Intentional trade, not a gap to close;
   no future parcel may "harden" this away.

Each ships a passing fixture (shipped v0 registry) and a rejecting fixture in
`tests/fixtures/`.

**Honest limitation:** the enumerable git-mutation deny list is not exhaustive
against a determined shell session — it reduces, not eliminates,
`reviewer-readonly`'s ability to mutate files or commit via other idioms
(`echo > file`, `sed -i`, etc.). This package cannot close that gap; the
paired mitigation is the standing detection control below, not this
package's job to enforce.

## Session-start-load bound — with its failure modes (F-H)

A profile only constrains a session that actually **loads** the emitted
`.claude/settings.local.json`. Not merely "a self-edit takes effect after
relaunch" — the real failure modes:

- **Not-loaded under a subagent:** an Agent/Task-tool background subagent
  shares the parent's already-loaded settings and never reloads a
  worktree-local `settings.local.json` — the envelope is inert for it (why
  charter D9-amendment(a) forbids that dispatch shape for P3's
  builder/reviewer specifically).
- **Void under bypass mode:** `--dangerously-skip-permissions` skips deny
  rules entirely.
- **Bash/PowerShell residual:** reduced, not eliminated, fix/commit
  capability for shell-capable profiles (see Honest limitation above). Paired
  mitigation: the coordinator runs `git status` in the reviewer's worktree at
  triage closure and requires it clean — a standing detection control, not
  anything this package enforces.

The `dispatch-worktree` emitter below proves the above at a real process
boundary — see `PROBE.md` for the live capability-probe runbook and its
manual, top-level-CLI-only reproduction procedure (charter D9-amendment(a)).
Mandatory-invocation enforcement (forcing dispatch to go through this
wrapper instead of a bare `git worktree add`) is future dispatch automation,
not this package's job (F-G).

## CLI and exit-code contract

Two subcommands over the shared `src/cli.ts` entry point.

**`validate <path>`** — runs `validateRegistry(doc)` against a registry file.

| Code | Meaning |
|---|---|
| `0` | Valid |
| `1` | Schema or semantic-invariant violation — every violation on stderr |
| `2` | Usage error — missing/unreadable path, bad invocation, unparsable YAML |

```bash
npx tsx src/cli.ts validate permission-profiles.yaml
```

**`dispatch-worktree --parcel <ref> --profile <name> --path <worktree-path>`**
— resolves `<name>` against the shipped registry (gated through
`validateRegistry`), creates a git worktree + branch at `<worktree-path>`,
and writes that worktree's `.claude/settings.local.json` by projecting the
resolved envelope's `deny`/`ask`/`defaultMode`/`additionalDirectories`
(`allow`/`network` are documentation-only and are never projected).

| Code | Meaning |
|---|---|
| `0` | Worktree created and settings written |
| `1` | Registry-integrity failure, git-worktree failure, or a `settings.local.json` already present at the target path (no clobber, no overwrite) |
| `2` | Usage error — missing/unknown flags, or an unrecognized `--profile` value (checked before any git call) |

```bash
npx tsx src/cli.ts dispatch-worktree --parcel P5 --profile reviewer-readonly --path ../my-review-worktree
```

No CI workflow wiring for either subcommand — deferred to W4, same as every
sibling.

## Runtime dependencies

Exactly `ajv` + `yaml`, machine-enforced by `tests/dependency-allowlist.test.ts`.
