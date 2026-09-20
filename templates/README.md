# Documents

The index for progressive discovery. Start here; open only what the task needs. Every document is short, high level, current, and lives in the repository, never in the agent brain. Diagrams are code (Mermaid, draw.io, drawdb). Each markdown document may have an interactive HTML rendering for humans next to it.

| Document | Answers | Level |
|---|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | what exists, the stack, the features, where the API reference is | project |
| [BACKEND-ARCHITECTURE.md](BACKEND-ARCHITECTURE.md) · [WEB-ARCHITECTURE.md](WEB-ARCHITECTURE.md) · [MOBILE-ARCHITECTURE.md](MOBILE-ARCHITECTURE.md) | how each surface is put together; backend carries infra | surface |
| [PRD.md](PRD.md) | what the product must do, from the user's and the backend's point of view | project; per service where it makes sense |
| [HLD.md](HLD.md) · [LLD.md](LLD.md) | boundaries and APIs; types, UML, schema, contracts | project, and per service |
| [DOMAIN.md](DOMAIN.md) | the domain design product, business, and tech all refer to | project |
| [DEVELOPMENT.md](DEVELOPMENT.md) · [DEPLOYMENT.md](DEPLOYMENT.md) · [DEBUGGING.md](DEBUGGING.md) | how to run, ship, and diagnose it | project |
| `AGENTS.md` · `SOUL.md` | the organization and how every agent carries itself; copied from the brain as they are | project root |
| `CONVENTIONS.md` | the rules; copied from the brain, not overridable | project |
| [CHANGELOG.md](CHANGELOG.md) | what shipped, for web, mobile, and backend | project |
| [LEARNINGS.md](LEARNINGS.md) | what the user taught the agents | project |
| `<service>/docs/` | that service's PRD, HLD, LLD, and RCAs | service |

Not every feature needs a doc update. The ticket and the commit message carry most of the reasoning. Compact a document that grows by extracting the stable part into a skill.
