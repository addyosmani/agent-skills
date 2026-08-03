---
ticket: KONE-TBD            # register via jira-workflow at Stage B; replace before dispatch
title: Foreman Line - permission-profile registry schema + validator (P1)
status: done                 # Shipped 2026-07-16: PR #21, merge cbd0376, single adversarial review clean, 52/52 tests
owner: clinton.morgan
created: 2026-07-16
updated: 2026-07-16
supersedes: null
superseded_by: null
# --- schema v0.2 fields ---
risk: standard
surfaces: [plugins/foreman-line/permission-profiles/*]
routing_class: standard-feature
permission_profile: null
---

# P1 - Permission-Profile Registry Schema + Validator

## Intent

Define the frozen JSON Schema (and matching TypeScript type) for `permission-profiles.yaml` - the named-profile registry the goal charter's D1-D9 build on - and ship a validator that checks a registry document against both structure and the deny-first semantic invariants the charter states in prose (D9: `deny`/`ask` are the restriction mechanism, `allow` is documentation of intent only). Ship the concrete v0 registry file itself, populated with the six D4 profiles (`coordinator`, `builder-standard`, `builder-architecture`, `reviewer-readonly`, `shaping-agent`, `builder-deps`), so the schema and validator are proven against real content on day one - same discipline as `routing-policy.yaml` (W0-P3) and `skill-injection.yaml` (W0-P5). This parcel produces the artifact P3's dispatch-time emitter will later resolve and project into a worktree's `.claude/settings.local.json`, and the profile-name vocabulary P4's spec-linter enum upgrade will bind to; it performs neither of those operations. It ships schema + types + the v0 registry file + a validator only - a **fifth copy** of the shared `registry.ts`/`generate.ts`/`testing.ts` scaffold (charter D3), no extraction.

This parcel enforces nothing at runtime. It cannot: a static validator that reads a document says nothing about whether an emitted envelope bites at a live session boundary - that proof is P3's live capability-probe (charter D9-amendment), explicitly out of scope here. What P1 *can* do structurally, and does, is refuse to let a registry document declare a self-nullifying or self-contradicting envelope (a profile that permits bypass mode, that omits its own self-modification guard, or - for `reviewer-readonly` - that fails to deny the enumerable repo-mutation commands or accidentally strips its own shell access). Those are the honestly-achievable guards at the schema+validator layer, and they are exactly the invariants below.

## Constraints

- **Location:** `plugins/foreman-line/permission-profiles/` in `kaseya-one-productivity-tools` (local: `C:\Repos\kaseya-one-productivity-tools`) - sibling to the frozen `plugins/foreman-line/contracts/`, `routing-policy/`, `receipts/`, `spec-linter/`, and `skill-injection/`, same foundation tier.
- **Stack:** TypeScript, Node >=22 (repo root `package.json` `engines.node` requires >=24.11.1 per the standing rule), ESM-only. Tests via `node --test` (`npx tsx --test`). Lint/format with `biome`.
- **Standing rule from the W0-P1 rework (binding on this parcel):** ajv's `JSONSchemaType` is banned as a schema authority anywhere in this repo; every schema is standard JSON Schema **draft-07** typed as `SchemaObject`.
- **Runtime dependency allowlist:** exactly two runtime dependencies - `ajv` (validation engine) and `yaml` (registry document parsing; same pattern as the four siblings, all YAML-authored artifacts). A test MUST assert that `package.json`'s `dependencies` keys equal exactly `{ajv, yaml}` - machine-enforced, not prose. This parcel needs no additional runtime dependency: it parses one YAML document and validates it, exactly the sibling shape.
- **No cross-package import:** this package does NOT import from any sibling `plugins/foreman-line/*` package (`contracts`, `routing-policy`, `receipts`, `spec-linter`, `skill-injection`). It ships as a fifth copy of the identical scaffold (charter D3); the duplication is deliberate and coordinator-ratified, not an oversight to "fix" by importing a sibling. The shared-scaffold extraction trigger is now met (five consumers) and is carried forward as a future-wave candidate at this goal's Stage-F closure per charter D3/F-J - it is not acted on in this parcel.
- **Dual representation, same discipline as every sibling:** `PermissionProfileRegistry` and its nested shapes (`PermissionProfile`, `PermissionEnvelope`, and any `NetworkIntent`) each ship as (1) a TypeScript type and (2) a JSON Schema in `schemas/`, with a parity test proving they agree. Agents/emitter consume the schema; humans and compilers consume the type. Neither is generated from the other (`JSONSchemaType` banned).

### The authoritative profile-name artifact and its export/parse contract (charter F-I - binds P4)

**The single source of truth for the set of legal profile names is the exported TypeScript const `PROFILE_NAMES` (a `readonly ProfileName[]`) and its companion union type `ProfileName`, both declared in `src/types.ts` and re-exported from `src/index.ts`.** This mirrors `routing-policy`'s `CLASS_NAMES`/`ClassName` precedent exactly (`plugins/foreman-line/routing-policy/src/types.ts`), and follows the receipts->contracts cross-package precedent F-I favors: a downstream package binds by **importing the TS const**, not by parsing YAML at lint time.

- **P4 binds to `PROFILE_NAMES` by import** (from the built package entry, `../../permission-profiles/src/index.js` or the package's `dist`/exports, following whatever the receipts->contracts precedent resolves to at P4 shaping time) - P4 does **not** re-parse `permission-profiles.yaml` and does **not** re-derive the name list.
- The v0 registry file `permission-profiles.yaml` is the human-authored **content** (the envelopes). Its top-level `profiles` map keys are validated to **exactly equal `PROFILE_NAMES`** (semantic invariant 1 below) - so the YAML content and the code-authoritative name list can never silently drift, the same "code is the authority, the document is validated against it" discipline `routing-policy`'s `KNOWN_FRONTIER_MODELS` established.
- Adding a seventh profile in a future goal is therefore a **reviewed, tested code change** (edit `PROFILE_NAMES` + the union + the YAML), not a one-line YAML edit - intentional friction, consistent with the charter's deny-first posture and the sibling precedent.

### Envelope shape - tied to Claude Code's real `settings.json` permissions object (charter kickstarter #2)

The envelope's field names deliberately match Claude Code's `settings.local.json` `permissions` object **1:1**, verified against this repo's own live files (`.claude/settings.local.json`: a `permissions` object with `allow[]`, `deny[]`, `defaultMode`, `additionalDirectories[]`; rule strings are either a bare tool name - `"Read"`, `"Edit"`, `"Bash"` - or `ToolName(specifier)` - `"Bash(git push --force*)"`, `"PowerShell(git push -f *)"`, `"WebFetch(domain:github.com)"`). This is the ground truth the schema is built on, not an invented shape. The consequence: P3's emitter projects a resolved `profile.envelope` into `settings.local.json.permissions` as a near-mechanical mapping (that projection is P3's job, not P1's).

```ts
// A Claude Code permission rule: a bare tool name, or ToolName(specifier).
// Tool existence and specifier semantics are NOT validated here - opaque at this
// layer, exactly as skill names are opaque in skill-injection (W0-P5). Only
// well-formedness (the string shape) is schema-checked.
type PermissionRule = string

// Claude Code permission modes. 'bypassPermissions' is DELIBERATELY EXCLUDED:
// a profile that installs itself in bypass mode nullifies its own deny rules
// (charter D9-amendment(a)), so the schema refuses to express it.
type PermissionMode = 'default' | 'acceptEdits' | 'plan'

// DOCUMENTATION-ONLY (charter D4/F-L). This goal ships no probe that a network
// rule gates at the process boundary; this field records declared intent and is
// NOT projected into an enforced setting by P3 in this goal. Real network gating,
// if ever pursued, uses WebFetch(domain:...) rules in deny/ask and needs its own
// probe. Modeled as a distinct field (not folded into deny/ask/allow) precisely so
// its documentation-only status is structurally visible, not hidden inside a rule
// string that would look enforced.
interface NetworkIntent {
  readonly egress: 'denied' | 'allowlist' | 'allowed'
  readonly notes?: string
}

interface PermissionEnvelope {
  readonly deny: readonly PermissionRule[]   // THE restriction mechanism (D9); deny wins across scopes and modes
  readonly ask: readonly PermissionRule[]    // prompt-first restriction (D9)
  readonly allow: readonly PermissionRule[]  // DOCUMENTATION-ONLY (D9): declared intent, never the restriction mechanism
  readonly defaultMode?: PermissionMode
  readonly additionalDirectories?: readonly string[]
  readonly network?: NetworkIntent           // DOCUMENTATION-ONLY (F-L)
}

interface PermissionProfile {
  readonly description: string               // human-readable role summary (non-empty)
  readonly envelope: PermissionEnvelope
}

type ProfileName =
  | 'coordinator'
  | 'builder-standard'
  | 'builder-architecture'
  | 'reviewer-readonly'
  | 'shaping-agent'
  | 'builder-deps'

interface PermissionProfileRegistry {
  readonly profiles: Readonly<Record<ProfileName, PermissionProfile>>
}
```

- **`deny`/`ask`/`allow` are each required arrays** (may be empty except where an invariant forces content). `deny` and `ask` are the restriction mechanism; `allow` is validated for well-formedness but the validator assigns it **no restrictive meaning** - it never treats an `allow` entry as granting or as satisfying any invariant (D9). Whether P3's emitter writes `allow` into the emitted file at all is P3's decision; here it is inert-as-restriction by definition.
- **Rule well-formedness (schema `pattern` on every `allow`/`ask`/`deny` item):** each rule matches `^[A-Za-z][A-Za-z0-9_-]*(\(.+\))?$` - a bare tool name, or a tool name followed by a non-empty parenthesized specifier. Empty strings, whitespace-only strings, and unparenthesized garbage are rejected. Tool existence and specifier correctness are **not** checked (opaque, per the skill-name-well-formedness precedent in W0-P5).
- **`defaultMode` excludes `bypassPermissions`** at the schema `enum` layer - a registry document declaring any profile in bypass mode fails schema validation (self-nullification guard, D9-amendment(a)).
- **`additionalDirectories` broadens access**, so a restriction-flavored profile leaves it absent/empty; it is optional and carries no invariant.

### The six v0 profiles' contents (charter D4 - names locked, contents shaped here)

Names are locked (D4). Contents below are this parcel's v0 shaping, informed by `COORDINATOR-PATTERN.md`'s dispatch table and the D9-amendment riders. **Every profile denies `Edit` and `Write` on its own worktree's `.claude/**`** (D9 self-modification guard, semantic invariant 2). The self-mod-guard deny is expressed as `Edit(.claude/**)` and `Write(.claude/**)` (Claude Code file-path rule form).

1. **`coordinator`** - broad, per the dispatch table ("Broad, incl. push/PR/merge"). `deny`: force-push variants in both shells (`Bash(git push --force*)`, `Bash(git push -f *)`, `PowerShell(git push --force*)`, `PowerShell(git push -f *)` - mirrors this repo's live `.claude/settings.local.json` deny list) plus the `.claude/**` self-mod guard. `ask`: empty. `allow` (documentation-only): the broad tool set the coordinator uses.
2. **`builder-standard`** - `deny`: force-push variants (both shells) + `.claude/**` self-mod guard. `ask`: empty (v0). `allow` (documentation-only): Read/Edit/Write/Bash/PowerShell/Glob/Grep. `network`: `{ egress: 'denied' }` (documentation-only intent - a standard builder has no network need; NOT enforced here). Builders **do** commit within their own worktree/branch, so no commit denial.
3. **`builder-architecture`** - v0 envelope **identical to `builder-standard`**. The standard-vs-architecture distinction is a model-tier + review-depth distinction (routing-policy / charter D7), not a permission-envelope distinction; nothing in the charter calls for a different capability set. (Flagged as a decision point for the coordinator - see final report - in case a divergence is wanted.)
4. **`reviewer-readonly`** - THE load-bearing profile (charter D9-amendment(b)/(c)). `deny`: the `Edit` and `Write` **tools** (bare, so all file writes via those tools); the `.claude/**` self-mod guard (subsumed by the bare Edit/Write deny but stated explicitly); AND the enumerable repo-mutation commands in **both** shells - `git commit`, `git push`, `git apply`, `git stash`, `git merge` as `Bash(git commit*)`, `PowerShell(git commit*)`, ... for each of the five. `ask`: empty. `allow` (documentation-only): Read/Glob/Grep + Bash + PowerShell. **`Bash` and `PowerShell` are NOT denied wholesale** - shell execution stays available for hostile-input probing at the live process boundary (lesson #12; charter D9-amendment(c)). This is the intended trade, not a placeholder for eventual removal. The residual (a determined shell session can still mutate/commit via idioms not in the enumerable list) is documented, not glossed - see README requirement below and semantic invariants 4 and 5.
5. **`shaping-agent`** - docs-only writes ("Docs-only writes" in the dispatch table). `deny`: force-push variants; the `.claude/**` self-mod guard; and best-effort denials of `Edit`/`Write` on the enumerable non-docs surface prefixes (`Edit(plugins/**)`, `Write(plugins/**)`, `Edit(skills/**)`, `Write(skills/**)`, `Edit(apps/**)`, `Write(apps/**)`, `Edit(config/**)`, `Write(config/**)`). `allow` (documentation-only): Read/Glob/Grep + `Edit(docs/**)`/`Write(docs/**)`. **Honest limitation (same class as `reviewer-readonly`'s Bash residual):** deny-first cannot cleanly express "writes permitted *only* under `docs/**`" - that is allow-scoping, and D9 makes `allow` documentation-only. The docs-only intent is therefore expressed as enumerable denials of the *known* non-docs write surfaces plus documentation-only allow-narrowing, with the residual (a novel top-level surface not in the deny list) documented in the README. (Surfaced as a decision point.)
6. **`builder-deps`** - `builder-standard`'s envelope PLUS `network: { egress: 'allowlist', notes: 'dependency-registry access; DOCUMENTATION-ONLY in this goal - not proven to gate at the process boundary (charter D4/F-L)' }`. `deny`: force-push variants + `.claude/**` self-mod guard. The network dimension is **declared intent only** - no AC in this parcel asserts it is enforced or proven (charter kickstarter #5).

### Semantic invariants the validator enforces (the analog to routing-policy's five)

Each ships with at least one passing fixture and one rejecting fixture.

1. **Profile-set completeness (F-I authority binding):** the `profiles` map keys must **exactly equal `PROFILE_NAMES`** - a document missing any of the six, or carrying a seventh unknown name, is rejected. This is the invariant that makes `PROFILE_NAMES` the single authority P4 binds to.
2. **Self-modification guard (D9):** every profile's `envelope.deny` must contain both an `Edit(.claude/**)`-shaped rule and a `Write(.claude/**)`-shaped rule (or a bare `Edit`/`Write` deny that necessarily covers them, as `reviewer-readonly` has). A profile lacking self-mod protection is rejected.
3. **No self-nullifying mode (D9-amendment(a)):** enforced at the schema `enum` layer (`defaultMode` cannot be `bypassPermissions`); a validator-level check restates it with a clear message. A profile declaring bypass mode is rejected.
4. **`reviewer-readonly` restriction completeness (D9-amendment(b)):** the `reviewer-readonly` profile MUST deny the `Edit` and `Write` tools, AND MUST deny each of the five enumerated repo-mutation commands (`git commit`, `git push`, `git apply`, `git stash`, `git merge`) in **both** `Bash(...)` and `PowerShell(...)` forms. Missing any of these is rejected.
5. **`reviewer-readonly` shell-access preservation (D9-amendment(c); kickstarter #3 - "do not let the spec accidentally remove reviewer shell access while enumerating denials"):** the `reviewer-readonly` profile MUST NOT deny **bare** `Bash` or **bare** `PowerShell` (wholesale shell denial). If it does, the document is rejected - a derived guard preventing a future edit from silently stripping the reviewer's deliberately-retained shell access while adding command-level denials. (Declared + derived, the same pattern as routing-policy's security-flavored guard.)

### CLI surface and exit-code contract (charter kickstarter #4 - mirror routing-policy, no divergence)

- A single `validate <path>` CLI command, a thin wrapper over an exported library function `validateRegistry(doc): ValidationResult` - mirroring `routing-policy validate <path>` (`plugins/foreman-line/routing-policy/src/cli.ts`) exactly. No `resolve`/`emit`/`explain` command: resolving a profile into an emitted `settings.local.json` is P3's dispatch-time job, not static validation, and is explicitly not built here (mirroring W0-P3's "no `explain` command" and W0-P5's "no `resolve`/`evaluate` command").
- **Exit-code contract (frozen by this parcel, no workflow wiring), identical to the four siblings:**

  | Code | Meaning |
  |---|---|
  | `0` | Valid |
  | `1` | Schema or semantic-invariant violation - every violation listed on stderr, not just the first |
  | `2` | Usage error - missing/unreadable path, bad invocation, or unparsable YAML |

  No divergence from the routing-policy `0/1/2` contract is proposed. CI workflow wiring (a GitHub Actions step that blocks PRs on `permission-profiles.yaml` changes) is deferred to W4, same as every sibling.

### README requirements (charter F-H - the session-start-load bound INCLUDING its failure modes)

`permission-profiles/README.md` must document (<= 1.5 pages) the schema shape, the exit-code contract, the deny-first ruling and each enforced invariant, the authoritative `PROFILE_NAMES` artifact + P4 binding contract, and - **load-bearing per F-H** - the **session-start-load bound stated with its failure modes, not the benign framing alone.** Specifically the README must state plainly that a permission profile only constrains a session that actually loads the emitted `.claude/settings.local.json`, and enumerate where it does **not** hold:
- **Not-loaded under a subagent:** a session dispatched as an Agent/Task-tool background subagent shares the parent's already-loaded settings and does **not** reload a worktree-local `settings.local.json` - the envelope is inert for it (this is why the charter's D9-amendment(a) forbids that dispatch shape for this goal's own builders/reviewers).
- **Void under bypass mode:** a session started in `--dangerously-skip-permissions` / bypass mode skips deny rules entirely.
- **Bash/PowerShell residual:** shell-capable profiles (notably `reviewer-readonly`) get **reduced, not eliminated,** fix/commit capability - `deny`-ing `Edit`/`Write` and the enumerable git-mutation commands does not cover the unbounded set of shell write idioms; the standing detection control (coordinator runs `git status` in the reviewer worktree at triage closure and requires it clean) is the paired mitigation, and it belongs in the README as the honest statement of the bound.

The README must NOT frame the bound as merely "a self-edit takes effect after relaunch" - that benign latency framing understates the real (not-loaded / bypass / shell) failure modes (F-H).

### Standing dispatch/environment constraints

- **Branch/worktree (lesson #9):** the builder works on a named feature branch `feat/foreman-line-P1`, isolated in its own worktree at `C:\Repos\foreman-line-P1` - never directly in the main working tree. This line goes into the dispatch kickstarter verbatim; it is not ambient knowledge.
- **Deterministic-pass environment (lesson #10):** verification runs in PowerShell only. `node -v` is the first command run, before anything else, and must report >=22 for this package. Shell selection is a standing rule, not a mid-build discovery.
- **PowerShell pipeline exit-code lesson (lesson #11):** CLI exit-code tests capture output in full before reading `$LASTEXITCODE` - never truncate a pipeline (`Select-Object -First N`) whose exit code is under test.
- All source is `readonly`/immutable-shaped where applicable; the schema describes a registry document's shape, not mutable runtime state.

## Acceptance Criteria

1. `npx tsc --noEmit` passes on the permission-profiles package.
2. Every exported type (`PermissionProfileRegistry`, `PermissionProfile`, `PermissionEnvelope`, and `NetworkIntent` if shipped as a named type) has a matching JSON Schema in `schemas/`, and a parity test proves type <-> schema agreement for all of them.
3. `ProfileName` (union type) and `PROFILE_NAMES` (`readonly ProfileName[]`) are exported from `src/types.ts` and re-exported from `src/index.ts`; `PROFILE_NAMES` contains exactly the six D4 names. A test asserts `PROFILE_NAMES` and the shipped `permission-profiles.yaml`'s top-level `profiles` keys are set-equal (invariant 1's fixture-independent check).
4. The shipped `permission-profiles.yaml` v0 validates against `permission-profiles.schema.json` with zero errors, and contains all six profiles with the v0 contents specified in Constraints: `coordinator` (force-push denies + self-mod guard), `builder-standard` (force-push + self-mod guard; `network.egress: denied`), `builder-architecture` (envelope equal to `builder-standard`), `reviewer-readonly` (bare `Edit`/`Write` deny + five git-mutation commands denied in both shells + `.claude/**` self-mod guard; bare `Bash`/`PowerShell` NOT denied), `shaping-agent` (non-docs surface-prefix write denies + self-mod guard), `builder-deps` (`builder-standard` envelope + `network.egress: allowlist` documentation-only).
5. Schema-structural rejection tests (each with a passing and a rejecting fixture):
   a. A rule string that is empty, whitespace-only, or malformed (e.g. `"(git commit)"`, `"Bash("`) is rejected by the rule `pattern`.
   b. A profile whose `defaultMode` is `bypassPermissions` is rejected at the schema `enum` layer.
   c. A registry with an unknown seventh top-level profile key, or missing one of the six, is rejected.
   d. A missing required envelope field (`deny`/`ask`/`allow`) is rejected.
6. Semantic-invariant tests (each with a passing and a rejecting fixture), covering all five invariants:
   a. Profile-set completeness (invariant 1) - keys != `PROFILE_NAMES` rejected.
   b. Self-modification guard (invariant 2) - a profile lacking an `Edit(.claude/**)`/`Write(.claude/**)`-covering deny is rejected.
   c. No self-nullifying mode (invariant 3) - bypass mode rejected (validator-level message, complementing 5b's schema-level rejection).
   d. `reviewer-readonly` restriction completeness (invariant 4) - a `reviewer-readonly` missing the bare `Edit`/`Write` deny, or any of the five git-mutation denies in either shell, is rejected.
   e. `reviewer-readonly` shell-access preservation (invariant 5) - a `reviewer-readonly` that denies bare `Bash` or bare `PowerShell` is rejected.
7. CLI `validate` command: exits `0` on the shipped valid registry; exits `1` with every violation listed on stderr (not just the first) against fixtures for each of AC5-AC6's rejecting cases (except a genuinely unparsable-YAML fixture, which exits `2`); exits `2` on a missing path and on an unreadable file.
8. `package.json`'s `dependencies` keys equal exactly `{ajv, yaml}`, enforced by a test reading `package.json`.
9. `biome check .` passes with zero diagnostics.
10. All tests pass via `npx tsx --test`; total test count >= 20.
11. `permission-profiles/README.md` documents (<= 1.5 pages): the schema shape; the deny-first ruling; each of the five enforced invariants; the authoritative `PROFILE_NAMES` artifact and the exact P4 binding contract (TS import, not YAML parse); the exit-code contract; the fifth-copy/shared-scaffold decision; and - **explicitly, per F-H** - the session-start-load bound *with its failure modes* (not-loaded under a subagent, void under bypass mode, Bash/PowerShell residual with the `git status`-clean detection control as the paired mitigation), stated plainly rather than only as benign relaunch latency. The README must NOT claim the network dimension is enforced or proven (F-L).

## Out of Scope

- **P2 (DispatchOrder `permissionProfile` field).** This parcel does not touch `plugins/foreman-line/contracts/` in any way. P2 adds `permissionProfile?: string` to the `DispatchOrder` type/schema/parity-test; P1 defines the profile *names* that field will reference by value, and nothing else. If the builder finds themselves editing `contracts/`, that is a Stop-and-Report.
- **P3 (dispatch-time emitter).** This parcel writes no emitter, no worktree-creation wrapper, no `dispatch-worktree` CLI, and no code that produces or writes a `.claude/settings.local.json`. The `profile.envelope -> settings.local.json.permissions` projection is P3's. The live capability-probe (launch a real top-level `claude` CLI session, attempt Write-tool and shell-based writes/commits, assert denial under `reviewer-readonly` with a positive control under `builder-standard`, `git status`-clean check) is P3's load-bearing AC and is **entirely out of scope here** - P1 proves a document is well-formed, never that an envelope bites at a process boundary. This parcel also does not add `.claude/settings.local.json` to any `.gitignore` (that is P3's F-D closure).
- **P4 (spec-linter enum upgrade).** This parcel does not touch `plugins/foreman-line/spec-linter/`. P1 *defines and exports* `PROFILE_NAMES`; P4 *consumes* it to enum-validate `permission_profile:`. P1 does not itself validate any spec's frontmatter against the registry.
- **Runtime enforcement / evaluation of any kind.** No profile is resolved, installed, or exercised. No session is launched. No permission rule is tested for whether Claude Code actually honors it. Static document validation only.
- **Proof that the `network` dimension gates at the process boundary (F-L).** `network` is documentation-only intent for `builder-deps`; no AC asserts enforcement, and none may be added without a network probe that does not exist in this goal.
- **Proof that the envelope closes the Bash/PowerShell residual for `reviewer-readonly` (F-B).** The deny list reduces, not eliminates, shell-based mutation; the residual is documented, not closed. Closing it is not achievable at this layer and is not attempted.
- **Shared-validator/scaffold extraction across the five sibling packages (charter D3/F-J).** P1 ships as a fifth verbatim copy. Extraction is a future, separately-scoped, separately-ratified parcel; the now-met trigger is carried forward at Stage-F closure, not acted on here. This package imports from no sibling.
- **The frozen contracts and other shipped packages** (`contracts`, `routing-policy`, `receipts`, `skill-injection`) - untouchable, read-only reference only, never imported from or modified.
- **Modifying `SPEC-CONVENTION.md`** (the `permission_profile:` field definition is W0-P2's; P4's enum upgrade is a non-breaking additive change to that field's *lint* contract, not a convention-document edit P1 makes).
- **CI workflow wiring** (a GitHub Actions step running the validator) - the exit-code contract is documented and callable; wiring the workflow is W4, same deferral as all four siblings.
- **`COORDINATOR-PATTERN.md` dispatch-table envelope-column update** ("(target state)" -> actual) - that doc-only closure rides P4, not P1.

## Context & References

- `docs/goals/permission-profile-registry/charter.md` - the ratified Goal Charter. P1's parcel-decomposition row, D3 (fifth copy, no extraction), D4 (six locked names; `builder-deps` network documentation-only), D9 (deny-first; `allow` documentation-only; `.claude/**` self-mod guard; target `settings.local.json` never tracked `settings.json`), and D9-amendment(a)/(b)/(c) (launch-mode pinning; enumerable Bash+PowerShell repo-mutation denies for `reviewer-readonly`; deliberate reviewer shell access) are binding scope.
- `docs/goals/permission-profile-registry/plan-review-findings.md` - F-I (authoritative profile-name artifact, this spec's decision #1), F-H (README failure modes), F-B (Bash residual honesty), F-L (`builder-deps` network documentation-only), F-A/F-C (P3's probe concerns - noted as the boundary P1 must not encroach on).
- `docs/goals/permission-profile-registry/loop-directive.md` - the operational overlay; the dispatch-mechanics departure (P1's own build session is a top-level `claude` CLI session, not a subagent) has no bearing on P1's schema content but is why the README's not-loaded-under-subagent failure mode is load-bearing documentation.
- `docs/SPEC-CONVENTION.md` - the schema this spec is written under; §4.6 (`permission_profile:` field P4 upgrades); §4.7 (`surfaces:` semi-controlled vocabulary - cited for contrast, not mirrored: profile names are a closed, code-authoritative set, like skill-injection's closed top-level keys, not an open vocabulary).
- `docs/specs/done/W0-P3-routing-policy-schema-validator.md` - the closest structural precedent: `JSONSchemaType` ban, `{ajv, yaml}` dependency-allowlist test, dual-representation + parity test, per-invariant passing+rejecting fixtures, the `validate <path>` CLI, the `0/1/2` exit-code contract, `CLASS_NAMES`/`ClassName` as the precedent for `PROFILE_NAMES`/`ProfileName`, and `KNOWN_FRONTIER_MODELS`-as-code as the precedent for code-authoritative name lists.
- `docs/specs/done/W0-P5-skill-injection-matrix-schema-validator.md` - precedent for opaque-identifier well-formedness validation (skill names <-> permission rules), the closed-key-set-vs-open-vocabulary reasoning, and the fifth-copy/shared-scaffold framing (W0-P5 was the fourth copy and named this parcel as the fifth-consumer trigger).
- `plugins/foreman-line/routing-policy/README.md` and `plugins/foreman-line/skill-injection/README.md` - the scaffold shape and README discipline this parcel matches.
- `plugins/foreman-line/routing-policy/src/{registry,index,types,cli}.ts` - read at shaping time as the concrete scaffold P1 copies (fifth copy).
- `.claude/settings.local.json` (this repo) - the live ground truth for Claude Code's `permissions` object shape (allow/deny/defaultMode/additionalDirectories; bare-tool and `Tool(specifier)` rule forms) the envelope schema mirrors 1:1.
- `docs/transcripts/defects_lessons.md` - #9 (name the branch/worktree in the spec), #10 (PowerShell + `node -v` first), #11 (never truncate a pipeline whose exit code you trust), #12 (hostile-input probing at the live boundary licenses reviewer shell access; dual review), #5/#7 (verify claims on disk; green checks verify state, closure checks verify work).

## Verification Plan

Deterministic: `tsc --noEmit` (AC1); parity test (AC2); the `PROFILE_NAMES`<->YAML set-equality test (AC3); the shipped-file zero-error + content-fidelity check (AC4); schema-structural rejection tests (AC5); semantic-invariant tests for all five invariants (AC6); CLI exit-code tests (AC7); dependency-allowlist test (AC8); `biome check` (AC9); test-count threshold (AC10). Deterministic pass runs in PowerShell on the coordinator's machine; `node -v` (must report >=22) is the first command run, before anything else (lesson #10). CLI exit-code tests capture output in full before reading `$LASTEXITCODE` - never truncate a pipeline whose exit code is under test (lesson #11).

**Standard-risk parcel: single adversarial review** (charter D7 / loop-directive queue). Mandated focus questions for the reviewer:

1. **Deny-first, not allow-theatre (D9).** Confirm the validator assigns `allow` **no** restrictive meaning anywhere - construct a `reviewer-readonly` fixture whose `allow` is empty but whose `deny` is complete (must pass) and one whose `deny` is missing a required entry but whose `allow` lists the "restriction" (must still be rejected). If any invariant can be satisfied by an `allow` entry, that is a defect: it reproduces exactly the placebo D9 exists to prevent.
2. **`reviewer-readonly` cannot be neutered two ways (D9-amendment(b)/(c)).** Confirm invariant 4 rejects a `reviewer-readonly` missing any one of the ten required denies (Edit tool, Write tool, and each of five git-mutation commands x two shells) - not just the obvious fixture. Independently confirm invariant 5 rejects a `reviewer-readonly` that denies bare `Bash` or bare `PowerShell` - i.e. verify the spec did NOT accidentally let "enumerate all the denials" collapse into "deny the shell," the exact trap kickstarter #3 warns about. Both readings must be attempted, per lesson #14 (attempt the naive/wrong reading, don't just confirm the intended one).
3. **`PROFILE_NAMES` is genuinely the single authority P4 can bind to (F-I).** Confirm the name set lives in exactly one code location, that the YAML is validated against it (not the reverse), and that an independent P4 builder with only this spec + the shipped package could import and enum-validate against `PROFILE_NAMES` without re-parsing YAML or re-deriving the list. If the authority is ambiguous or duplicated, that is a finding for the human gate (it is P4's binding target).
4. **No encroachment on P2/P3/P4 (boundary hunt).** Grep the shipped package for: any import from a sibling `plugins/foreman-line/*` package (must be none); any code that writes, emits, or projects a `settings.local.json` or `.claude/**` file (must be none - that is P3); any `DispatchOrder` reference (must be none - that is P2); any spec-frontmatter validation (must be none - that is P4). Any of these is scope creep, not a bonus.
5. **README failure-mode honesty (F-H/F-L/F-B).** Confirm the README states the session-start-load bound *with* its not-loaded/bypass/shell failure modes and does not overclaim - specifically that it does NOT frame the bound as benign relaunch latency, does NOT claim the network dimension is enforced/proven, and states the reviewer's shell residual as reduced-not-eliminated with the `git status`-clean detection control. A README that reads as "this profile makes the reviewer read-only, full stop" is a defect against the charter's deliberately-hedged objective.
6. **Fifth-copy fidelity (charter D3).** Confirm `registry.ts`/`generate.ts`/`testing.ts` are structurally consistent with the four sibling packages (same responsibilities, same file boundaries, `generate.ts` line-for-line identical modulo the schema-file list) and that no divergent shape or accidental sibling import crept in - the same hunt W0-P5's review ran for the fourth copy, applied to the fifth.

## Epic/Story/Task Projection (proposal only - Jira registration is future work, not this session)

**Epic:** Foreman Line - Permission-Profile Registry + Dispatch-Time Emitter *(the goal charter's four-parcel epic; P1 is its first story)*

**Story:** P1 - Permission-Profile Registry Schema + Validator

- **Task 1:** `PermissionProfileRegistry`/`PermissionProfile`/`PermissionEnvelope`(/`NetworkIntent`) types + JSON Schemas (dual representation) + parity test; `ProfileName` union + `PROFILE_NAMES` const exported from `types.ts`/`index.ts`; `registry.ts`/`generate.ts`/`testing.ts` scaffold matching the four sibling packages (fifth copy).
- **Task 2:** Schema-structural invariants - rule-string `pattern`, `defaultMode` enum excluding `bypassPermissions`, closed six-name profile set, required envelope fields.
- **Task 3:** Semantic invariants (validator) - profile-set completeness vs. `PROFILE_NAMES`, self-modification guard, no-bypass-mode, `reviewer-readonly` restriction completeness (Edit/Write tools + five git-mutation commands x two shells), `reviewer-readonly` shell-access preservation.
- **Task 4:** Concrete v0 `permission-profiles.yaml` reproducing the six D4 profiles' v0 contents; validated against the shipped schema; `PROFILE_NAMES`<->YAML set-equality test.
- **Task 5:** `validate <path>` CLI + `0/1/2` exit-code contract; dependency-allowlist test (`{ajv, yaml}`); `biome check` conformance.
- **Task 6:** `README.md` - schema shape, deny-first ruling, five invariants, `PROFILE_NAMES`/P4-binding contract, exit-code contract, fifth-copy decision, and the F-H session-start-load bound *with failure modes* (not-loaded/bypass/shell residual + `git status`-clean detection control).
- **Task 7 (verification, not builder-owned):** single adversarial review per the six mandated focus questions above; deterministic pass on the coordinator's machine; human review gate before merge.

The next Jira-relevant registration event for this goal is P2 (DispatchOrder field) once P1 is merged.
