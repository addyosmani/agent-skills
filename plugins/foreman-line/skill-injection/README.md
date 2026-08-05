# Foreman Line — Skill Injection Matrix Schema + Validator (W0-P5)

The policy-as-code artifact that governs which skills are injected at which
pipeline role (plan §5a: "injection is driven mechanically by the parcel's
`surfaces:` and task class — no per-dispatch human decision"). This parcel
ships the schema, the TypeScript type, the concrete v0
`skill-injection.yaml`, and a validator. It does **not** evaluate the matrix
against a specific parcel's `surfaces:`/`routing_class:` at dispatch time —
that is W2-P5's job. This is the last W0 parcel; merging it satisfies W0's
exit criterion.

## Schema shape

`SkillInjectionMatrix` = `{ builder, verifier_harness, adversarial_reviewer,
coordinator, integration }`.

- **`builder` / `verifier_harness` / `adversarial_reviewer`** — each a
  `RoleSkillMap`: glob-pattern keys (`'*'` or `'<prefix>/*'`) to non-empty
  `SkillName[]` arrays.
- **`coordinator`** — `{ rework_first: SkillName[] }`, non-empty, closed shape.
- **`integration`** — `{ jira: SkillName[] }`, non-empty, closed shape.

Types live in `src/types.ts`; schemas in `schemas/*.json` (hand-authored as
`SchemaObject`, never ajv's `JSONSchemaType`); `tests/parity.test.ts` proves
the two never drift, for all four exported shapes.

## Top-level-key-closed vs. `surfaces:`-open

All five top-level keys are **LOCKED CLOSED**: `additionalProperties: false`
plus `required` on all five. A document missing one, or carrying a sixth, is
rejected — not silently defaulted to "no rules for this role." This
deliberately does **not** mirror `SPEC-CONVENTION.md` §4.7's `surfaces:`
semi-controlled vocabulary, where a novel prefix is expected and surfaced via
an advisory warning rather than blocked. The two cases differ in kind:
`surfaces:` names an open-ended filesystem namespace where novelty is
routine; these five keys name fixed pipeline roles enumerated by the plan
itself (builder / harness / reviewer / coordinator / integration). A sixth
role appearing is a Line architecture change requiring a spec amendment, not
a vocabulary extension an advisory warning should merely flag — hard
rejection is correct here.

## Role-map-empty vs. glob-key-empty

Each of `builder` / `verifier_harness` / `adversarial_reviewer` **must be
present** as a key, but **may be an empty object** (`{}`) — an explicit,
visible "no rule yet." What is **not** permitted is a present glob-pattern
key whose skill-name array is empty (`'*': []`). Both a missing top-level key
and an empty array under a present key are different flavors of "silently
resolves to no skills injected," the exact ambiguity plan §6's "declared,
never derived-by-omission" logic argues against — requiring the role map
itself to be explicitly present (even empty) while forbidding an explicitly
present-but-empty skill list closes both silent-injection paths. Both are
enforced at the schema layer (`patternProperties` + `minItems: 1` on the
glob-keyed value type, plus `required` + `additionalProperties: false` at the
top level) — a single source of truth, consistent with how every other
structural invariant in this schema is enforced, rather than a duplicate
hand-written check in `validate.ts`.

## Surface-glob pattern syntax

A glob-pattern key is either exactly `'*'` or matches `^[^*]+/\*$` — a
non-empty, star-free prefix followed by a literal `/*` (e.g. `'ui/*'`,
`'tenancy/*'`, `'plugins/foreman-line/*'`). `'ui/*/checkout'`, `'**'`,
`'ui*'`, and `''` are all invalid. Prefix-style matching only; no mid-string
or suffix wildcards in v0.

## Surface-Glob Resolution Semantics (the contract W2-P5 must implement)

**This package ships zero code that executes this rule.** It is specified
here in prose only, as the unambiguous contract a future, independent W2-P5
builder must implement without re-deriving intent from the illustrative YAML
alone.

Given a parcel's `surfaces:` array (`SPEC-CONVENTION.md` §4.6 — a non-empty
array of repo-relative paths/globs) and a role's `RoleSkillMap`, the resolved
skill set for that role is the **union, deduplicated by skill name**, of
every glob pattern's skill array where the pattern is `'*'` OR the parcel has
at least one `surfaces:` entry that matches the glob's prefix at a
**path-segment boundary** — the entry either equals the prefix exactly or
starts with the prefix followed by a literal `/` (the glob with its trailing
`/*` stripped, e.g. `'ui/*'` → prefix `ui`). This is deliberately **not** a
raw string-prefix test: `surfaces: [uix/foo.ts]` does NOT match `'ui/*'`,
even though the raw string `'uix/foo.ts'` starts with the substring `'ui'` —
only a path-segment match counts (corrected 2026-07-16 after adversarial
review correctly flagged the original wording as ambiguous between
raw-string-prefix and segment-boundary semantics). This is **additive, not
override-based** — §5a's own worked example ("every parcel gets
`test-coverage`... `ui/*` parcels additionally get `kds-figma`") reads as
union ("additionally"), not most-specific-wins or first-match.

**Worked example**, using the shipped `builder` map (`'*': [test-coverage]`,
`'ui/*': [kds-figma]`): a parcel with `surfaces: [ui/components/*]` resolves
to `['test-coverage', 'kds-figma']` (both the universal rule and the `ui/*`
rule match, unioned); a parcel with `surfaces: [plugins/foreman-line/*]`
resolves to `['test-coverage']` only (no `surfaces:` entry matches `ui` at a
path-segment boundary); a parcel with `surfaces: [uix/legacy-widget.ts]`
also resolves to `['test-coverage']` only — `uix` is a different path
segment than `ui`, not a match, despite sharing the `ui` substring.

## Skill-name existence is out of scope

Skill names are validated only as non-empty, non-whitespace-only strings —
opaque identifiers at this layer. Existence-checking against any installed
skill (`skills/` in this repo, or the deployed `~\.claude\skills\`) is
deferred, for three reasons:

1. **Wrong-directory risk.** This repo's own `skills/` directory does not
   contain most of §5a's illustrative skill names (`kds-figma`, `kds-sweep`,
   `tenant-isolation`, `code-review`, `build-fix-loop`, `test-coverage`,
   `test-coverage.check` are absent; only `jira-workflow` and a handful of
   unrelated skills are present) — they resolve against the *deployed*
   skills location, a different directory on a different machine than
   wherever this validator runs.
2. **Dispatch-time/runtime-environment concern.** A same-repo check would
   check the wrong directory; a check against the deployed path is a
   dispatch-time concern, not a static schema check a CI job can run
   reproducibly against repo content alone.
3. **Stale-list problem.** The deployed skills directory changes
   independently of this package's release cycle. A validator that
   hard-codes today's skill list would go stale the moment a skill is added
   or removed.

This is a W2-P5/CI concern, not this parcel's.

## Exit-code contract

| Code | Meaning |
|---|---|
| `0` | Valid |
| `1` | Schema violation — every violation on stderr, not just the first |
| `2` | Usage error — missing/unreadable path, bad invocation, or unparsable YAML (including a duplicate-key document; see below) |

A duplicate-key YAML document (AC4e) is a **parse-time** failure, not a
schema violation: schema validation runs against an already-parsed JS
object, by which point a duplicate key has already been collapsed by a
lenient parser. `parseSkillInjectionMatrixYaml` therefore runs *before*
`validateSkillInjectionMatrix`, invoking the `yaml` package with
`uniqueKeys: true` explicitly set (verified directly: `yaml@2.9.0` already
defaults to this behavior — a duplicate top-level or nested-map key throws
`YAMLParseError`, not a silent last-wins collapse — but the option is passed
explicitly anyway so the strict behavior is visible in source and does not
depend on an implicit default a future `yaml` upgrade could quietly change).
The CLI's catch block for "cannot parse as YAML" therefore also catches
duplicate-key documents, landing them in exit `2`, the same bucket as any
other unparsable file — mirroring the sibling `routing-policy`/`spec-linter`
CLIs' existing parse-error handling rather than inventing a fifth exit code.

No CI workflow wiring — that's W4.

## Usage

```powershell
npx tsx src/cli.ts validate skill-injection.yaml
```

## Shared-validator / fourth-copy decision

`registry.ts`, `generate.ts`, and `testing.ts` in this package are the same
scaffold shipped by `routing-policy`, `receipts`, and `spec-linter`
(`generate.ts` is line-for-line identical to theirs). This is a real
duplication signal, coordinator-ratified and *not* re-litigated here: because
`routing-policy` and `receipts` are frozen contracts, modifying either to
consume a new shared abstraction is a loop-stop condition, not a ruling the
coordinator can make solo. W0-P5 therefore ships as a **fourth copy** of the
identical pattern — no shared package is extracted in this parcel, and this
package imports from no sibling `plugins/foreman-line/*` package.
Consolidation is a future, separately-scoped parcel, taken up once a fifth
consumer (the deferred permission-profile-registry parcel) exists and the
pattern has proven stable across all five.

## Runtime dependencies

Exactly two: `ajv` (validation engine) and `yaml` (matrix parsing), both
machine-enforced by `tests/dependency-allowlist.test.ts`.
