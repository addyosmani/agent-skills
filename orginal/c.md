

| ID | Rule |
|---|---|
| G-1 | Strong types at every boundary (API, persistence, external providers). Types express domain concepts and API contracts; no untyped boundaries. |
| G-2 | Every task has tests mapped to its acceptance criteria; tests are never weakened or skipped to get green. |
| G-4 | No secrets in source, fixtures, logs, or tracker comments. |
| G-5 | Commits are small, reference the tracker ticket, and leave the repository runnable. One coherent capability, contract, or verified behavior per commit; never "implement entire X". |
| G-7 | Defensive programming at boundaries only: validate at API, database, persistence, deserialization, and external-provider boundaries; business logic carries zero to minimal defensive noise. |
| G-8 | Backend owns business truth (eligibility, cost, provider selection, lifecycle, authoritative state). Clients render it and submit intent. |
| G-9 | Do not build for scale that the product does not have. No caches, queues, sharding, distributed systems, or infrastructure abstractions without a current requirement recorded in `DECISIONS.md`. |
| G-10 | Security required for the current behavior is implemented; speculative enterprise hardening is explicit deferred scope, never silent omission. |
| G-11 | A pattern is used only with a named problem it solves (Strategy, Adapter, Repository, Unit of Work, State Machine, Builder, Factory/Registry, Policy, Command/Handler, Observer/Event). Never for sophistication. |
| G-12 | Every meaningful design decision records problem, options, choice, rationale, and reversibility; one-way doors are named. |
| G-13 | A changelog is maintained (global and per service); every merged task adds a line. |
| G-14 | Discovered work is classified before it enters scope (see scope discipline in `ORG.md`); only MVP requirements and MVP blockers enter automatically. |
| G-15 | Every task instruments what it ships: technical metrics (rate, errors, duration, saturation) for new endpoints, jobs, and external calls; product and business metrics named in the PRD. Metrics use bounded labels and are tested. See `references/metrics-and-logging.md`. |
| G-17 | Pay cost at build time, not at runtime: types, code generation, and static checks over runtime checks and defensive branches. |
| G-18 | Make illegal states unrepresentable: enums, sum and product types, typed identifiers. A defensive check that cannot be avoided becomes a first-class domain object with an explicit error. |
| G-19 | Validation happens in the backend only, at its edges (API, database, event store, external providers). Clients never validate business rules; they call through generated, well-typed clients that cannot express an invalid request. |
| G-20 | No raw strings for closed sets or identifiers; enums and typed IDs. JSON is typed at every boundary. |
| G-21 | Code is testable by construction: dependencies are injected, never constructed inline; `random()`, `time.now()`, and environment reads go through injected providers. |
| G-22 | Releases follow semver and every release publishes a changelog entry that lists its tickets. |
| G-23 | Every merged change is deployable. `main` is always releasable: CI is green, migrations are backward compatible for one release, and anything incomplete is behind a flag that defaults off. A change that cannot be deployed on its own is not ready to merge. |
| G-24 | A pull request is never held open to grow. Open it when the first verifiable slice is ready, and if it reaches roughly 400 changed lines or 10 files, split it: land the mechanical part, the contract, or the flagged-off skeleton first. A long-lived branch is a merge conflict accruing interest. |
| G-16 | Every task ships through a pull request with the PR template; reviewed-class PRs merge only on the discipline code reviewer's approval; every review comment is resolved by a commit or an explained reply. |


| ID | Property | Global default | May be overridden when |
|---|---|---|---|
| O-1 | Repository shape | Monorepo: `apps/web`, `apps/mobile`, `backend/`, `packages/domain-types`, `packages/api-client` (generated), `infra/` (Terraform), `docker/`, `docs/` | the repository already has an established layout (never restructure to match a default) |
| O-2 | Application shape | Modular monolith: services are modules with clear boundaries that can be packaged as one binary or deployed as independent servers from the same code | a recorded decision names a concrete requirement for a different shape |
| O-3 | API contracts | Contract-first HTTP APIs documented with OpenAPI/Swagger, available before consumers depend on the implementation | the service exposes a non-HTTP protocol with its own contract format |
| O-4 | Web | React with TypeScript in strict mode | a recorded decision |
| O-5 | Mobile | React Native with Expo; easiest viable option first | complexity demands a bare workflow or native module (recorded decision) |
| O-6 | Backend language | Node with TypeScript in strict mode. Go or Python only with a recorded decision, and never assumed because a skill example uses one | the project already decided |
| O-7 | Database | A SQL database: PostgreSQL by default, SQLite when an embedded store genuinely fits | the project already decided |
| O-8 | Local development | Docker for a reproducible local environment; not an infrastructure project | the service is a pure library |
| O-9 | Infrastructure as code | Terraform for AWS under `infra/`; provisioned at the milestone the plan names (may be deferred by the milestone plan, never skipped silently) | a recorded decision |
| O-10 | Observability stack | Prometheus (metrics), Grafana (dashboards), Loki (logs); dashboards and alerts are provisioned at the milestone the plan names; metric emission itself is always required (G-15) | a recorded decision |
| O-11 | Typing detail | TypeScript strict: no `any`, enums or literal unions for closed sets, discriminated unions for variants, branded identifiers, schemas validated at every I/O boundary. Where Go or Python is chosen instead: Go uses typed identifiers, typed constants, and no `interface{}` at boundaries; Python uses full type hints, Pydantic at I/O, `Enum`/`Literal` for closed sets, and `Protocol`/ABC for ports | the service language differs, keeping the same strictness |
| O-12 | Layered models | API model → application model → domain model → DB model, with explicit translation; persistence models never leak into public APIs | layers are genuinely identical (record the collapse) |
| O-13 | Folder layout | Feature-first: `<service>/<feature>/{api,application,domain,persistence,tests}`; shared kernel in `<service>/shared/`. Never type-first top-level folders (`controllers/`, `models/`, `utils/`) | the service is a library or worker with a single feature |
| O-14 | Comments and logging | Comments are rare and explain the *why* (product or business reasoning), never the *what*; when the why lives in a ticket, put the reasoning in the ticket and link the ticket id in the code. Structured logs at request/job boundaries, domain state transitions, and errors with context; nothing inside pure business logic, no per-iteration logs, no PII or secrets, nothing that duplicates a metric | the service has a recorded operational requirement for more (never for less) |
| O-23 | CI/CD | GitHub Actions: lint, type check, tests, build, and the milestone verification on every PR; deploy workflows per environment | a recorded decision |
| O-24 | Diagrams as code | Flows and sequences in Mermaid inside the Markdown docs; HLD architecture diagrams as `.drawio` files next to `HLD.md`; DB schema as a drawdb file next to `LLD.md`; all committed and reviewed like code | a recorded decision |
| O-25 | Typed clients | Every OpenAPI contract generates the client packages (`packages/api-client`) in CI; hand-written clients are not allowed | the protocol is not HTTP (generate from its own schema) |
| O-22 | Branching and merge | Branch per ticket named `<ticket>-<slug>`; squash-merge with the ticket id in the message; delete the branch after merge | the service has a recorded reason (for example release branches) |
| O-15 | Database design docs | Maintain the DB schema and a DB design document whenever the service has a persistent database | no persistence |
| O-16 | Payments | A pluggable module behind the smallest provider-neutral interface that protects the boundary; no generalized payment platform before the MVP needs it | a recorded decision |
| O-17 | Mobile platform capabilities | OTP login, notifications, forced update, analytics behind small extractable boundaries; built only when the PRD needs them | a recorded decision |
| O-18 | Test runner, lint, and format commands | project default | the service uses a different toolchain |
| O-19 | Error model | typed error union per module | the service exposes a protocol with its own error model |
| O-20 | Small-change file limit for direct merge | 5 files | the EM lowers it (never raises it) |
| O-21 | Knowledge graph tooling | Evaluate `https://github.com/Graphify-Labs/graphify` only when relevant; never add it automatically | a recorded decision |
