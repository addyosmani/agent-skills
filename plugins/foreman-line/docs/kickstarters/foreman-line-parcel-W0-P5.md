You are the builder for parcel W0-P5. Your workspace is the worktree at C:\Repos\foreman-line-W0-P5 on branch feat/foreman-line-W0-P5 — verify with `git branch --show-current` before anything else. You never work in C:\Repos\kaseya-one-productivity-tools's main working tree, and you never touch main. The spec is committed in your worktree at docs/specs/active/W0-P5-skill-injection-matrix-schema-validator.md — read it in full before doing anything else. This is an architecture/risk parcel; it will receive dual independent adversarial review, and it is the last W0 parcel — once it merges, W0's exit criterion is met.

## Step 0 — before writing any code

Run `node -v` in PowerShell and confirm >=22 (all commands in this parcel run in PowerShell, never Git Bash — its nvm default shadows the system Node and shell state does not persist between tool calls). Then:

1. Restate the parcel's scope in your own words.
2. Enumerate every file you intend to create (exact paths). Expected surfaces: everything under `plugins/foreman-line/skill-injection/`. Nothing outside that directory changes.
3. Confirm the Out of Scope section — in particular: `plugins/foreman-line/contracts/`, `plugins/foreman-line/routing-policy/`, `plugins/foreman-line/receipts/`, and `plugins/foreman-line/spec-linter/` are frozen/sibling-only and must not be modified or imported from; you do not build a `resolve`/`evaluate` command (that's W2-P5); you do not validate skill-name existence against any directory.
4. Flag any spec ambiguity or contradiction — in particular scrutinize the spec's own two self-flagged decisions (role-map presence-vs-emptiness split; duplicate-key YAML strict-parsing requirement, AC4e) since those were made by the shaping agent on its own initiative and are explicitly marked for extra scrutiny.

Then STOP and wait for my confirmation before writing a single line of implementation.

## After confirmation: implement

Deliver one artifact: the `plugins/foreman-line/skill-injection/` package, matching the AC list in the spec exactly (AC1–AC10). In particular:

- `package.json`: name `@foreman-line/skill-injection`; `engines.node` >= 22; runtime dependencies exactly `{ajv, yaml}` — machine-enforced by a test (AC7).
- `tsconfig.json`, `biome.json`: follow the sibling-package pattern (`routing-policy`, `receipts`, `spec-linter`).
- `schemas/skill-injection-matrix.schema.json`: JSON Schema draft-07, `additionalProperties: false` at top level and on `coordinator`/`integration`, `propertyNames` regex for glob-pattern keys, required all five top-level keys (AC3a/b/d).
- `src/types.ts`: `SkillInjectionMatrix`, `RoleSkillMap`, `CoordinatorSkills`, `IntegrationSkills` per the spec's Constraints block, verbatim shape.
- `src/schemas.ts`: hand-authored `SchemaObject`-typed schema (never `JSONSchemaType` — banned repo-wide).
- `src/registry.ts`, `src/generate.ts`, `src/testing.ts`: same scaffold as the three sibling packages (this is the coordinator-ratified fourth-copy decision — do not attempt to import or extract shared code from any sibling package).
- `src/validate.ts`: `validateSkillInjectionMatrix(doc): ValidationResult` — schema validation plus the semantic invariants in AC4 (role-map empty-vs-absent distinction, non-empty skill-name arrays, skill-name well-formedness, duplicate-key rejection via strict/unique-key YAML parsing — AC4e, verify this actually configures the `yaml` package's strict mode, not just a comment claiming it does).
- `src/cli.ts`: `validate <path>` command, exit codes 0/1/2 per the spec's Exit-code contract, stderr lists every violation (not just the first).
- `src/index.ts`: public exports.
- `skill-injection.yaml`: the concrete v0 matrix file reproducing §5a's illustrative content exactly as specified in AC5.
- `tests/`: fixtures + test suite via `node --test` (`npx tsx --test`), covering parity, every AC3/AC4 structural and semantic invariant (passing + rejecting fixture each), the shipped-file zero-error + content-fidelity check (AC5), CLI exit-code coverage (AC6), dependency-allowlist (AC7). Total >= 20 tests (AC9).
- `README.md`: per AC10, documenting the schema shape, both self-flagged rulings, the surface-glob resolution semantics as W2-P5's contract (prose only, no executable code implementing it — do not build even a small helper that resolves a hypothetical parcel's skill set; that is explicitly out of scope and a named adversarial-review focus question), the skill-name-existence-deferral rationale, the exit-code contract, and the shared-validator/fourth-copy decision. <= 1.5 pages.

## Standing rules

- `ajv` is permitted as the validation engine; `JSONSchemaType` is banned as a schema authority — every schema is standard JSON Schema draft-07 typed as `SchemaObject`.
- `plugins/foreman-line/contracts/`, `routing-policy/`, `receipts/`, and `spec-linter/` are frozen/sibling — read-only reference only; do not import from or modify them.
- This package does NOT import from any sibling `plugins/foreman-line/*` package. It is self-contained, matching the coordinator's fourth-copy ruling.
- No `resolve`/`evaluate` function or CLI command, however small — resolving a parcel's actual injected skill set is W2-P5's job, not this parcel's. This is a named adversarial-review focus question; do not create the finding yourself.
- No skill-name existence checking against any filesystem path (`skills/` in this repo or `~\.claude\skills\`) — skill names are opaque, well-formedness-only strings.
- Never commit to main, never merge. I decide when the work is done.

## Completion claim format

Run `npx tsc --noEmit`, `npx tsx --test`, and `npx biome check .` in PowerShell yourself before claiming completion. Capture `$LASTEXITCODE` in full after each — never truncate a pipeline whose exit code you are about to trust (defects_lessons #11).

Your completion claim must:
- Map each AC number (AC1–AC10) to the evidence that satisfies it.
- State the total test count explicitly (must be >= 20 per AC9).
- Confirm `biome check`, `tsc --noEmit`, and test suite all exit 0.
