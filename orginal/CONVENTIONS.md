# Conventions

Every project the brain runs follows all of these. **None is overridable.** In a brownfield repository the first step is a conformance table, one row per convention, followed or not, with evidence; then the code moves incrementally. Process detail lives in `references/`; this file is the list.

## Stack

| ID | Rule |
|---|---|
| S1 | Monorepo. |
| S2 | Modular monolith: services can be hosted as separate servers, but everything is served as a single binary until there is a reason not to. |
| S3 | BE in Go, Python or Node only by a recorded decision. |
| S4 | Web in React with TypeScript. |
| S5 | Mobile in React Native with TypeScript, Expo first. |
| S6 | PostgreSQL. |
| S7 | Docker for local development; LocalStack for AWS. |
| S8 | Terraform for AWS under `infra/`. |
| S9 | GitHub Actions for CI/CD. |
| S10 | Swagger (OpenAPI) for every API; JSON Schema for typed JSON at boundaries. |
| S11 | Prometheus, Grafana, Loki. |
| S12 | Linear for all project management. |
| S13 | Diagrams as code: Mermaid for flows, draw.io for HLD, drawdb for schema. |
| S14 | A linter and a static type checker on backend and frontend. |

## Architecture

| ID | Rule |
|---|---|
| A1 | Vertical slice architecture with a service-first folder structure. Every service is a collection of features. |
| A2 | A service is a domain with a well-defined bounded context (domain-driven design). |
| A3 | Hexagonal inside a service. |
| A4 | Folders as flat as possible; nest only when necessary. |
| A5 | Backend-driven UI for web and mobile. |
| A6 | Measure and fix. Do not fix hypothetical scenarios; do not solve for scale until scale is the established bottleneck. |
| A7 | Security work only for security-sensitive features (auth, payments, personal data). |
| A8 | Ask for clarity on ambiguities and complex technical choices instead of assuming or getting stuck. |
| A9 | Be deliberate about DB models, the LLD (main classes, interfaces, composition and inheritance), and patterns (functional: compose; object: factory, registry). Every pattern names the problem it solves. |
| A10 | No silent creep of technical decisions: no automatic retries, queues, caches, or elaborate coordination unless data makes the case. Complexity only when it demands. |
| A11 | Validation in the backend only, at its edges. Clients never validate business rules; the typed client keeps calls valid. |
| A12 | Backend modules every project needs are pluggable: payments, auth (OTP and OAuth login), profile. |
| A13 | Mobile modules every app needs are extractable and pluggable, built once: auth (OTP and OAuth), notifications, force update, analytics. |

## Coding

| ID | Rule |
|---|---|
| C1 | No strings for closed sets or identifiers; enums and typed ids. No opaque objects. Everything typed. |
| C2 | Make illegal states unrepresentable: enums, sum and product types, typed ids. |
| C3 | External inputs are typed at the edges. |
| C4 | API model, domain model, and DB model are separate, translated explicitly. |
| C5 | A generated, typed backend client. The client SDK lives at the repository root, outside the service folder. Each service maintains its SDK; a dependent service calls through it. A generator per language only when required. |
| C6 | Pay cost at compile time instead of run time. |
| C7 | Errors are first-class citizens of the domain. Fail loudly; never swallow. |
| C8 | Low cyclomatic complexity. Code reads as flat as possible; no unnecessary misdirection. |
| C9 | Defensive code at the edges only, never in business logic. |
| C10 | Comments are rare and explain the why; the reasoning lives in the ticket, and the ticket id lives in the code. |
| C11 | Testable by construction: dependencies injected, no inline `random()` or `time()`. |
| C12 | Composition over inheritance. |
| C13 | Backward compatible when touching existing code. |
| C14 | Never modify generated or vendor files. |
| C15 | Domain-driven design: no raw ids, wrap them in domain ids; define entities, value objects, aggregates, domain events, bounded contexts. |

## Database

| ID | Rule |
|---|---|
| D1 | Fail on conflict; do not build for hypothetical high concurrency. |
| D2 | Connection pooling. |
| D3 | Migrations, backward compatible for one release, with rollback. |
| D4 | The schema lives separately from the code. |

## Delivery

| ID | Rule |
|---|---|
| L1 | Semver, and a changelog. |
| L2 | A progressively usable product: the app works at every point. Create one API, test it, commit it, then the next. Never make the product unusable to make progress. |
| L3 | Feature flags, and code without an entry point, for what is not ready. |
| L4 | An MVP ships first for any requirement, however big; the original scope continues after. |
| L5 | API contract first, so frontend and backend work independently. The frontend mocks the API from the contract; the backend returns labelled mock data for integration until complete. |
| L6 | Once the DB model and the contracts are decided, backend services work concurrently. |
| L7 | A dependency's shape and type are resolved before anything else is done. |
| L8 | Every agent creates its own environment: a git worktree at the project root (never in the harness's directory), cleaned up after; docker; LocalStack; a DB snapshot or seed; its own observability when debugging. |
| L9 | Where slicing is technically impossible (some migrations), say so on the ticket. The user may ask for one-shot development with one testing pass; record the override. |
| L10 | Large-scale deprecation or migration: new flow in parallel, old flow marked deprecated and frozen, test, switch, delete, migrate data. The old flow is never edited in place and keeps working until the switch. |

## Testing

| ID | Rule |
|---|---|
| T1 | End to end, the way users use the product. |
| T2 | Concurrency and race conditions. |
| T3 | Canvas testing automation for the web client: to be figured out; say so when needed. |
| T4 | Performance testing: deferred. |
| T5 | Every acceptance criterion has a test; tests are never weakened to pass; the running app is exercised, not only its tests. |

## Observability

| ID | Rule |
|---|---|
| O1 | Structured logging, judiciously. Do not create noise. |
| O2 | Tech metrics decided by the backend engineer; product and business metrics decided by the PM. |
| O3 | Alerts, runbooks, and traces: deferred. |
| O4 | Bounded labels; no PII or secrets in logs. |

## Commits, pull requests, review, merge

| ID | Rule |
|---|---|
| P1 | Always raise a PR; never merge directly. Review may be made optional on the ticket. |
| P2 | Never hold a PR for a security audit; the audit is a later ticket. |
| P3 | Merge with a regular merge commit, not a squash, so commit ids in review threads stay findable. Delete the remote and local branch. |
| P4 | Commits are small, working changes; every commit is usable or at least does not break the app. |
| P5 | A commit message carries the model, thinking effort, and harness, and the anatomy in `references/commit-and-pr.md`. |
| P6 | Reviewers check: changes unrelated to the task; changes not feature-flag gated where applicable; regression risk; observability missing or redundant; comments missing or redundant; domain conventions not followed; use of strings (`references/merge-and-review.md`). |
| P7 | Reviewers create Linear issues for findings and comment on the PR when it is open. |

## Project management

| ID | Rule |
|---|---|
| M1 | A plan, storyboard, and tasks for every large requirement; a ticket, sub-tickets included, before any work, filed under the right head. |
| M2 | A ticket created from a direct user request carries the prompt verbatim. |
| M3 | A feature is delivered continuously: stories and sprints cut so the user gets usable increments, always. |
| M4 | Scope creep is prevented by phased PRDs and milestoned stories. Requirements are gathered before they are cut. |
| M5 | The PM sets success targets for each feature. |
| M6 | A loop step that is skipped is recorded on the ticket with the reason. |

## Documentation

| ID | Rule |
|---|---|
| W1 | Economical with words; high-level ideas; depth only where it is needed (RCA, design docs). Never copy code into a doc. |
| W2 | Not every feature needs an HLD, LLD, or doc update; the ticket and the commit message carry most of it. Not everything needs documenting. |
| W3 | A document index for progressive discovery (`templates/README.md`). |
| W4 | Docs stay current and are compacted regularly by extracting stable content into skills. Old, long docs are less accurate and less read. |
| W5 | No cloud artifacts. Every document lives in the repository, at the project root or in the service it belongs to (`<service>/docs/`), never in the agent brain. |
| W6 | Two renderings: markdown with diagrams as code for agents, and an interactive HTML for humans. |
| W7 | Every HLD, LLD, and PRD is reviewed by the user. |
| W8 | The document set and anatomies are `templates/`. Add a section when the work demands it; not every section must be filled. |


