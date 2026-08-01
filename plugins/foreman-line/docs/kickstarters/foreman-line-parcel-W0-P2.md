You are the builder for parcel W0-P2. Your workspace is the worktree at C:\Repos\foreman-line-W0-P2 on branch feat/foreman-line-W0-P2 — verify with `git branch --show-current` before anything else. You never work in C:\Repos\kaseya-one-productivity-tools's main working tree, and you never touch main. The spec is committed in your worktree at docs/specs/active/W0-P2-parcel-schema-v02.md — read it in full before doing anything else.

## Step 0 — before writing any code

Run `node -v` in PowerShell and confirm >=22 (all commands in this parcel run in PowerShell, never Git Bash — its nvm default shadows the system Node and shell state does not persist between tool calls). Then:

1. Restate the parcel's scope in your own words.
2. Enumerate every file you intend to create or modify (exact paths). Expected surfaces: `docs/SPEC-CONVENTION.md` and every file under `plugins/foreman-line/spec-linter/`.
3. Confirm the Out of Scope section — in particular: `plugins/foreman-line/contracts/`, `plugins/foreman-line/routing-policy/`, and `plugins/foreman-line/receipts/` are frozen and must not be modified.
4. Flag any spec ambiguity or contradiction.

Then STOP and wait for my confirmation before writing a single line of implementation.

## After confirmation: implement

Deliver exactly two artifacts:

**1. SPEC-CONVENTION.md updates (`docs/SPEC-CONVENTION.md`):**
- §4 frontmatter schema block: add all four v0.2 fields (`risk:`, `surfaces:`, `routing_class:`, `permission_profile:`) with inline documentation per AC1. Also add the `surfaces:` canonical vocabulary subsection listing known prefixes (`docs/`, `plugins/`, `skills/`, `apps/`, `config/`) and the extension mechanism.
- §11 (new section): Coordinator-Ratified Amendment Pattern per AC2. Must state all three properties explicitly: (a) exact replacement text supplied by coordinator, (b) committed alone in the parcel worktree before any implementing code, (c) commit message explicitly identifies it as a coordinator amendment. Reference commits 057136b, ff9f6d3, 28a0233, 5d530fb as worked examples.

**2. spec-linter package (`plugins/foreman-line/spec-linter/`):**
- `package.json`: name `@foreman-line/spec-linter`; `engines.node` >= 22; runtime dependencies exactly `{ajv, yaml}` — machine-enforced by a test.
- `tsconfig.json`, `biome.json`: follow W0-P3/W0-P4 package pattern.
- `schemas/spec-frontmatter.schema.json`: JSON Schema draft-07, `additionalProperties: false`, covers all twelve frontmatter fields. Required: `ticket`, `title`, `status`, `owner`, `created`, `updated`, `risk`, `surfaces`, `routing_class`. Optional: `supersedes`, `superseded_by`, `permission_profile`.
- `src/types.ts`: `SpecFrontmatter` TypeScript type for the twelve fields.
- `src/validate.ts`: `validateSpecFrontmatter(doc): ValidationResult` — schema validation + semantic invariants. Semantic rules beyond schema: (a) `status: superseded` requires non-null `superseded_by`; (b) `surfaces` must be non-empty array; (c) `permission_profile` if present must be a non-empty, non-whitespace-only string.
- `src/cli.ts`: `validate <path>` CLI command.
  - `<path>` may be a single `.md` file or a directory; directories are validated recursively for every `.md` file found.
  - Exit codes: `0` all valid (violations and warnings both allowed at exit 0 — warnings are advisory); `1` at least one schema/semantic violation; `2` path not found, file unreadable, or directory has no `.md` files.
  - **Advisory warnings** (non-blocking, exit 0, emitted to stderr):
    - `permission_profile:` absent from a spec → emit one advisory warning per spec.
    - A `surfaces:` entry does not begin with any of the vocabulary prefixes from SPEC-CONVENTION §4 → emit one advisory warning per offending entry.
  - **`--no-permission-profile-warning` flag**: fully suppresses the absent-permission-profile advisory. No other side effects.
- `src/index.ts`: public exports (`validateSpecFrontmatter`, `SpecFrontmatter`, `ValidationResult`).
- `tests/`: test suite via `node --test` (run as `npx tsx --test`). Required tests:
  - Parity test: `SpecFrontmatter` type and `spec-frontmatter.schema.json` agree (same pattern as W0-P3/W0-P4).
  - Semantic-invariant suites for AC6a–AC6f, each with at least one passing fixture and one rejecting fixture.
  - CLI exit-code tests: exit 0/1/2 against fixtures covering each path.
  - `permission_profile:` warning tests: (a) absent → exit 0 + one warning on stderr; (b) `--no-permission-profile-warning` suppresses the warning entirely; (c) `permission_profile: null` → exit 1 (rejected).
  - `surfaces:` vocabulary warning tests: unknown prefix → advisory warning on stderr (exit 0); known prefix → no warning.
  - Live-corpus test: all four `docs/specs/done/` specs exit 0 (no violations). Note in the test or transcript that W0-P1 (`contracts/*`, `platform/correlation`) will produce advisory warnings — these are informational for a pre-v0.2 spec; W0-P3/W0-P4/PCC-P0 must produce no vocabulary warnings.
  - Dependency allowlist test: `package.json` `dependencies` keys equal exactly `{ajv, yaml}`.
  - Total: **≥ 20 tests**.
- `spec-linter/README.md`: documents the schema shape, all four v0.2 fields with allowed values and optionality, `permission_profile:` interim behaviour (advisory warning until registry), exit-code contract, and how to run the linter. ≤ 1 page.

## Standing rules

- `ajv` is permitted as the validation engine; `JSONSchemaType` is banned as a schema authority — every schema is standard JSON Schema draft-07 typed as `SchemaObject`.
- `plugins/foreman-line/contracts/`, `plugins/foreman-line/routing-policy/`, and `plugins/foreman-line/receipts/` are frozen — read-only reference only; do not import from them or modify them.
- This package does NOT import from any sibling `plugins/foreman-line/*` package. The frontmatter validator is self-contained.
- `skills/parcel-compiler/tool/` is untouchable.
- Never commit to main, never merge. I decide when the work is done.

## Completion claim format

Run `npx tsc --noEmit`, `npx tsx --test`, and `npx biome check .` in PowerShell yourself before claiming completion. Capture `$LASTEXITCODE` in full after each — never truncate a pipeline whose exit code you are about to trust (defects_lessons #11).

Your completion claim must:
- Map each AC number (AC1–AC11) to the evidence that satisfies it.
- State the total test count explicitly (must be ≥ 20 per AC10).
- Confirm `biome check`, `tsc --noEmit`, and test suite all exit 0.
