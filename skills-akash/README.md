# Skills index

Thirteen loadable skills. Each `SKILL.md` has YAML frontmatter (`name`, `description`) so an agent can load it on demand by name.

**Ground truth** (core philosophy, applicability and overrides, brownfield conformance, tech stack, repository shape, architecture, roles, missing referenced files) is **not** a skill: it lives inline in the repository's `CLAUDE.md`, loaded at session start. Feedback, gaps, workarounds, and overrides are logged in `self-improvement.md`; the rules and note format are in `CLAUDE.md` under *Self-improving harness*.

| Skill | Load when |
|---|---|
| `coding-standards` | writing, refactoring, or reviewing any code |
| `domain-driven-design` | modelling a domain: ids, entities, aggregates, events, bounded contexts |
| `database` | schema, migrations, queries, connections |
| `continuous-delivery` | slicing a requirement, flags, MVP, contract-first, parallel work |
| `agent-environment-setup` | starting agent work: worktree, docker, LocalStack, seed |
| `deprecation-migration` | replacing or deprecating a live flow |
| `testing` | writing or judging tests |
| `observability` | logs, metrics, dashboards, alerts |
| `commits-and-pull-requests` | committing, branching, opening or merging a PR |
| `pull-request-review` | reviewing a PR in any reviewer role |
| `project-management` | tickets, plans, scope, sprints, Linear |
| `documentation` | any document: HLD, LLD, PRD, RCA, README, index |
| `hld-lld-design` | producing an HLD or LLD |
