# Context scope

What each persona reads, and what it does not. Context is finite; every document loaded competes with the one that matters. The rule is not "read less" but **read what you decide with**.

| Persona | Always reads | When the task needs it | Does not read |
|---|---|---|---|
| `product-manager` | the ticket, `docs/PRD.md`, `docs/ARCHITECTURE.md` | `docs/DOMAIN.md` | HLD, LLD, the coding conventions, code |
| an engineer | the ticket, the convention skills the task needs, the `docs/` and code of what the task scopes: the whole project, one service, or several | `docs/ARCHITECTURE.md` for how the pieces connect; the contract of a service it calls but does not own | code and internals the task does not need, the project PRD in full |
| `scout` | whatever is inside the scope given | | anything outside it |
| `code-reviewer` | the diff, the ticket, the design section it implements, the review framework in its persona | the contract a change moves | unrelated services |
| `test-engineer` | the story, its acceptance criteria, the service's test strategy | the contract under test | implementation internals it verifies from outside |
| `security-auditor`, `web-performance-auditor` | the surface under audit and its contract | what a finding forces open | everything outside the audit |

Three rules:

1. **Give context, do not point at a directory.** A ticket names the sections to read.
2. **Scope is what the task needs, not a fixed unit.** The whole project, one service, or several; nothing outside it. A task that grows past its scope is split, not read across.
3. **Do not forward a document because you happened to have it open.**

`docs/LEARNINGS.md` is written to, not read.
