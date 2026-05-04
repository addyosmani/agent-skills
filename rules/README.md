# `rules/` — Engineering invariants library

A library of **declarative engineering invariants** that projects consume à la carte by importing them into their `CLAUDE.md` via `@<path>` directives.

**Status:** v1.3 (added 2026-04-26)
**Companion:** [`_meta/how-to-import.md`](_meta/how-to-import.md) for consumers · [`_meta/rule-template.md`](_meta/rule-template.md) for authors · [`../skills/batuta-rule-authoring/SKILL.md`](../skills/batuta-rule-authoring/SKILL.md) for the authoring gate.

## Purpose

`rules/` codifies invariants of how code should look — style conventions, security mandates, multi-tenancy patterns, delivery checklists. Each rule is a self-contained Markdown file that a project's `CLAUDE.md` can pull in by reference, without copying content across projects.

The result: a project's `CLAUDE.md` stays under 100 lines because conventions are delegated to plugin-provided modules.

## Boundary — `rules/` vs `skills/`

The plugin has two independent layers. They do not overlap.

| Aspect | `rules/` | `skills/` |
|---|---|---|
| Question it answers | "How must the code look *always*?" | "What do I do when *X* situation arises?" |
| Activation | Explicit import from a project's `CLAUDE.md` (`@<path>`) | Auto-invocation by Claude Code via skill description matching |
| Nature | Always-true invariant | Discrete workflow with steps |
| Format | Plain Markdown + light frontmatter (`title`, `applies-to`, `last-reviewed`) | `SKILL.md` with frontmatter `name`/`description` |
| Packages scripts | No | Yes |
| Frequency of use | Loaded once at session start; static | Triggered when its conditions match |

**Membership test** when deciding which layer a piece of content belongs to:

> If it applies to *all* code without exception → `rules/`.
> If it is a procedure that runs when *something happens* → `skills/`.

A few examples to make the line concrete:

- "Every external library import must be preceded by a `// Source:` citation comment" → **rule** (always-true invariant)
- "When a test fails, run the debugging-and-error-recovery workflow" → **skill** (procedure triggered by event)
- "PII must never appear in logs" → **rule**
- "When deploying to production, follow the shipping-and-launch checklist" → **skill**

## Folder layout

```
rules/
├── README.md                           # this file
├── _meta/
│   ├── how-to-import.md                # consumer protocol (start here if you're a project)
│   ├── rule-template.md                # canonical format for new rules (start here if you're an author)
│   └── templates/
│       └── CLAUDE.md.template          # consumer CLAUDE.md scaffolding
├── core/                               # universal invariants (apply to every project)
├── stack/                              # patterns specific to a stack component (Temporal, n8n, FastAPI, etc.)
├── integrations/                       # contracts for using plugin-coordinated external tools (code-graph engines, etc.)
├── domain-co/                          # Colombia-specific business and regulatory conventions
└── delivery/                           # delivery and handoff patterns to clients
```

Conventions:

- One file per rule, kebab-case filename, `.md` extension
- No numeric prefixes (numbering is semantics of `skills/`, not `rules/`)
- A rule that grows past 200 lines is split into two
- Rules are organized **by domain**, not by project or client
- Empty domain folders carry a `.gitkeep` and are populated only when a rule passes the §A.6 admission gate

## Index of available rules

> The list below grows as rules pass the admission gate (`batuta-rule-authoring` skill — see "Authoring a new rule" section below). At the time of writing, only `core/` is seeded.

### `core/` — Universal invariants

- [`research-first-citations.md`](core/research-first-citations.md) — every external import requires a `// Source:` citation comment
- [`secrets-and-pii.md`](core/secrets-and-pii.md) — secrets and PII handling boundaries
- [`code-style.md`](core/code-style.md) — universal code style conventions

### `stack/` — Stack-specific patterns

*(populated as new rules pass the §A.6 admission gate; see [`rules/README.md`](README.md) for the current index)*

### `integrations/` — Contracts for plugin-coordinated external tools

- [`code-graph-usage.md`](integrations/code-graph-usage.md) — when and how to use the code knowledge graph (codebase-memory-mcp; graphify deprecated in v4.0)

### `domain-co/` — Colombia-specific conventions

*(populated as new rules pass the §A.6 admission gate; see [`rules/README.md`](README.md) for the current index)*

### `delivery/` — Client handoff and delivery

*(populated as new rules pass the §A.6 admission gate; see [`rules/README.md`](README.md) for the current index)*

## Authoring a new rule

Always invoke the **`batuta-rule-authoring`** skill before adding a new file under `rules/`. The skill is a gatekeeper that validates:

- §A.4 — canonical format (Inviolable rules / Allowed patterns / **Anti-patterns (mandatory, not empty)** / Documented exceptions)
- §A.5 — conventions (50–200 lines, imperative tone, executable examples, no client names)
- §A.6 — admission gate: rule has demonstrably applied in ≥ 2 distinct projects without exceptions, OR the rule is a verbatim derivation from `~/.claude/CLAUDE.md` (which counts as universal)

The skill blocks creation if the gate is not satisfied. See [`../skills/batuta-rule-authoring/SKILL.md`](../skills/batuta-rule-authoring/SKILL.md) for the full contract and [`_meta/rule-template.md`](_meta/rule-template.md) for the empty canonical format.

## Consuming rules in a project

Read [`_meta/how-to-import.md`](_meta/how-to-import.md). Short version:

1. From the project root: run the plugin's `tools/setup-rules.sh --all` (or `--rule <name>` for selective import). This creates symlinks at `.claude/rules/<rule>.md` pointing into the plugin install path.
2. Add to your project's `CLAUDE.md` an `@.claude/rules/<rule>.md` line per imported rule (project-relative, portable across developers).
3. On the next Claude Code session start, the rules load automatically into context.

The full guide covers Windows symlink caveats, the approval dialog on first import, the exception protocol when a rule does not apply, and the recommended structure of a consumer `CLAUDE.md`.

## Maintenance

- Each rule has a `last-reviewed: YYYY-MM-DD` field in its frontmatter
- Quarterly cadence: review the `last-reviewed` field of every rule and refresh if the underlying stack/domain has changed
- A rule untouched for > 12 months enters `needs-review` state and is evaluated for retire-or-refresh
- If exceptions to a single rule accumulate in > 2 distinct projects, that is a signal the rule is mis-designed or admitted prematurely — reopen it for revision
