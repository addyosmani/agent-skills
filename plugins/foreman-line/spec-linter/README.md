# @foreman-line/spec-linter

Validates a spec's YAML frontmatter against SPEC-CONVENTION §4's schema v0.2 — the machine enforcement behind "a convention without a validator is a suggestion" (SPEC-CONVENTION §7). Self-contained: no dependency on any sibling `plugins/foreman-line/*` package.

## Schema shape

`schemas/spec-frontmatter.schema.json` (JSON Schema draft-07, `additionalProperties: false`) covers all thirteen frontmatter fields. Required: `ticket`, `title`, `status`, `owner`, `created`, `updated`, `risk`, `surfaces`, `routing_class`. Optional: `supersedes`, `superseded_by`, `permission_profile`, `data_classification`.

## The four v0.2 fields

| Field | Required | Allowed values |
|---|---|---|
| `risk:` | Yes | `low \| standard \| elevated \| critical` |
| `surfaces:` | Yes, non-empty array | Repo-relative paths/globs. Known prefixes: `docs/`, `plugins/`, `skills/`, `apps/`, `config/` (SPEC-CONVENTION §4.7). An entry outside the vocabulary emits an advisory warning — it does not fail validation. |
| `routing_class:` | Yes | `boilerplate \| standard-feature \| architecture/risk \| implementation/standard` |
| `permission_profile:` | No (interim) | If present: non-empty, non-whitespace-only string. If absent: passes, with a non-blocking advisory warning. `null` is rejected (a schema violation, distinct from key-absent). |
| `data_classification:` | No | If present: non-empty, non-whitespace-only string (observed corpus value: `internal`). No controlled vocabulary yet — schematized by CLOSE-P2 per the W4-P5 ruling; enum validation is a future non-breaking additive change (same pattern as `permission_profile`). `''` and `null` are rejected. |

**`permission_profile:` interim behavior.** The permission-profile registry is a deferred parcel. Until it ships, this field is optional and unconstrained beyond "non-empty string if present." Every spec missing it gets one advisory warning per validation — not a failure. Once the registry lands, it will add enum validation as a non-breaking additive change.

## Semantic invariants beyond the schema

`validateSpecFrontmatter` runs the ajv structural pass, then checks:

- `status: superseded` requires a non-null `superseded_by`.
- (`surfaces:` non-empty and `permission_profile:` non-empty/non-whitespace are schema-structural, not semantic — enforced by `minItems`/`pattern` in the JSON Schema.)

## CLI

```
spec-linter validate [--no-permission-profile-warning] <path>
```

`<path>` may be a single `.md` file or a directory (validated recursively for every `.md` file found).

**Exit codes:**

| Code | Meaning |
|---|---|
| `0` | All specs valid. Advisory warnings do not affect this. |
| `1` | At least one schema or semantic violation. Every violation is written to stderr, not just the first. |
| `2` | Path not found, file unreadable, or a directory containing no `.md` files. |

**Advisory warnings** (stderr, exit code unaffected):

- `permission_profile:` absent from a spec.
- A `surfaces:` entry not beginning with a known vocabulary prefix.
- A grandfathered violation (`grandfathered (<waiver-kind>): …` — see below).

**Grandfather allowlist (CLOSE-P2).** `src/grandfather.ts` enumerates exactly eight historical `docs/specs/done/` basenames whose pre-v0.2-freeze violations are class-scoped-waived: `permission-profile-legacy` (waives only `permission_profile` violations with the pinned historical values — `null` for P1/P2/P3/W0-P5, `builder` for W4-P2/SCAF-P4) and `routing-class-legacy` (waives only `routing_class: standard`, 2 files). A waiver applies only when ALL of: the basename matches the source-frozen list, the file's parent directory is `done`, AND the actual frontmatter value is the pinned historical literal. Any other value, any other violation, any other location (active/, scratch dirs), or any unlisted file gets full validation. Waived violations surface as `grandfathered:` advisories so the debt stays visible. Growing the list requires a reviewed PR editing that source file — membership and per-file value pins are asserted by set-equality tests.

`--no-permission-profile-warning` fully suppresses the absent-`permission_profile` advisory (no other side effects).

## Running the linter

```powershell
npx tsx src/cli.ts validate plugins/foreman-line/docs/specs/active
npx tsx src/cli.ts validate plugins/foreman-line/docs/specs/active/some-spec.md
npx tsx src/cli.ts validate --no-permission-profile-warning plugins/foreman-line/docs/specs/active
```

## Development

```powershell
npm install
npx tsc --noEmit
npx tsx --test
npx biome check .
```

`npm run generate` regenerates `schemas/spec-frontmatter.schema.json` from the typed source in `src/schemas.ts`; `tests/parity.test.ts` asserts the committed file never drifts from it.
