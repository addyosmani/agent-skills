# The Foreman Line

Foreman Line is an installable, contract-first coordination plugin for carrying a
development goal through shaping, parcel dispatch, external verification,
integration, and closure.

This `0.1.0` release is an **alpha**. Its pipeline packages are implemented and
tested, while some integrations remain profile-specific. Receipt chains are
structurally validated; cryptographic recomputation and signature verification
remain future Parcel Compiler work. Stage F validates supplied merge metadata
but does not yet authenticate that metadata against the source-control host.

Full design and rationale: [docs/FOREMAN-LINE-PLAN.md](docs/FOREMAN-LINE-PLAN.md). Coordinator role charter (Stage Zero ideation, human gates, dispatch table, long-running loop): [docs/COORDINATOR-PATTERN.md](docs/COORDINATOR-PATTERN.md).

## Human gates

1. Goal-charter ratification.
2. Parcel dispatch.
3. Merge, unless a distinct agent identity is explicitly authorized by the
   target repository's effective branch rules and that authorization is
   verified at merge time. Missing or ambiguous authority fails closed to a
   human-owned merge.

## Pipeline stages

| Stage | What happens | Package(s) |
|---|---|---|
| A — Intake & Shaping | Idea → parcel spec(s) under `docs/specs/active/` | `shaping/`, `spec-linter/`, `schema-scaffold/` |
| B — Registration | Spec → Jira Epic/Story/Task tree, bidirectionally linked | `registration/`, `projection/` |
| C — Dispatch & Build | Candidate proposal, Step 0 restatement, model routing, skill injection | `dispatch/`, `routing-policy/`, `skill-injection/`, `permission-profiles/` |
| D — Verification | Deterministic harness + adversarial review, no self-graded work | `verification/` |
| E — Integration | PR, DocSpine validation, risk-driven audit triggers | `integration/` |
| F — Closure | Merge, ticket close, receipt chain sealed, lesson distillation | `receipts/`, `approval/` |

`contracts/` defines the shared stage-envelope schemas and types every package above builds on.

## Layout

- `docs/` — plan, coordinator charter, conventions, kickstarters (dispatch prompts), specs (`active/` = live contracts, `done/` = shipped), transcripts and lessons ledger.
- `skills/` — loadable `goal`, `foreman-shaping`, and
  `parcel-driven-development` skills.
- Each pipeline package is an independent TypeScript workspace (own `package.json`, `tsconfig.json`, `biome.json`, `tests/`) — not a shared monorepo build.

## Installation

The plugin contains separate manifests for Claude Code
(`.claude-plugin/plugin.json`) and Codex (`.codex-plugin/plugin.json`). Install
it through a marketplace that points at this directory, then start a fresh
session so the host discovers the plugin-local skills.

The `parcel-compiler` package is currently a separately distributed scaffold;
its advertised command surface is not yet a functional CLI.

## Working in a package

```bash
cd <package>
npm install
npm test        # tsx --test tests/*.test.ts
npm run typecheck
npm run lint     # biome check .
```

## Conventions

Spec format and lifecycle: `docs/SPEC-CONVENTION.md`. Dispatch prompts live in
`docs/kickstarters/`; standing constraints referenced by every builder/reviewer
kickstarter are in `docs/kickstarters/STANDING-CONSTRAINTS.md`. Lessons earned
during builds are logged in `docs/transcripts/defects_lessons.md`, each with a
disposition routing its rule into the artifact that governs the agent it
concerns.
