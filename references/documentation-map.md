# Documentation map

Which document holds what, and where it lives.

| Document | Holds | Where |
|---|---|---|
| `ARCHITECTURE.md` | project structure, tech stack, features (linking the PRD), the API reference (Swagger link), and the backend, web, and mobile architecture | `docs/`; a surface or service may keep its own in its folder's `docs/`, linked from here |
| `PRD.md` | the product from the user's and the backend's point of view, phased, with success targets | `docs/`, and `<service>/docs/` where it makes sense |
| `HLD.md`, `LLD.md` | boundaries, APIs, scale; types, UML, schema, contracts | `docs/` for the project, `<service>/docs/` per service |
| `DOMAIN.md` | the domain design product, business, and tech refer to | `docs/` |
| `DEVELOPMENT.md`, `DEPLOYMENT.md`, `DEBUGGING.md` | local setup and commands; pipeline and environments; where to look | `docs/` |
| `CHANGELOG.md` | what shipped, per release, for web, mobile, and backend | `docs/` |
| `LEARNINGS.md` | what the user taught the agents | `docs/` |
| RCA | one file per incident, template to come | `<service>/docs/` |
| ADR | one decision worth preserving: problem, options, choice, rationale, reversibility (`adrs`) | `docs/decisions/`, or `<service>/docs/decisions/` for a service-local one |

Bugs are tickets, not files.

Whether, how, and where to write is `documentation` W1–W11; moving existing documents is `brownfield-adoption`. One altitude per document: project pages hold no service internals; service pages hold no whole-system description.

Anyone with the relevant skill may edit any document; no document has an owner role.
