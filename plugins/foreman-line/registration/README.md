# @foreman-line/registration (W1-P4)

Stage B of the Foreman Line: takes an approved parcel set + Epic/Story tree (the
W1-P3 approval record) and **registers** it as real Jira issues, then writes the
bidirectional SHA-permalink links that make the spec and the ticket point at
each other (SPEC-CONVENTION §5). Library-only, ESM, `engines.node >=24.11.1`,
runtime dependencies `{ajv, @modelcontextprotocol/sdk}` (the SDK is the
ratified-and-fired Q11 deviation — see "Auth deviation + the fired dependency
contingency" below).

## The mechanical sandbox gate (KONE + `mcp-test` + `[TEST]`)

The gate is **mechanical, not a convention.** `assertRegistrationGate` enforces
three conditions before any adapter create/update, each throwing a typed
`RegistrationGateError`:

1. `fields.project.key` is a member of the committed allowlist
   `config/project-allowlist.json` = `{ "allowedProjectKeys": ["KONE"] }`
   (exact-string `Set.has`). A project key is not a credential (§7) — it is
   committed, reviewable, diffable.
2. `fields.labels` includes `mcp-test`.
3. `fields.summary` begins with the literal `[TEST] ` prefix (`startsWith`, no
   regex).

The package **stamps** the label and prefix (`buildCreatePayload`) and then
asserts all three post-injection — it does not trust the caller. The gate is
reachable-only-through-the-wrapper: the raw `JiraTransport` is a private field
of `GatedTransport`, and every mutating method (`createGated`/`updateGated`/
`addLinkGated`) asserts the gate first. **Negative control:** a non-`KONE` key,
a missing `mcp-test` label, and a missing `[TEST] ` prefix each throw with
**zero** adapter calls. All string handling is linear-time (lesson #19).

**Cleanup (human action, never automated):** after a proof run, delete the test
issues with the JQL `project = KONE AND labels = "mcp-test"` (list-then-delete
by hand).

## Adapter-injection boundary + the honest deterministic/live split

`register()` takes an injected `JiraTransport`
(`createIssue`/`updateIssue`/`search`/`addRemoteLink`). All gate / hash-refusal
/ write-back / receipt logic sits above the adapter and is unit-tested against a
**fake recording adapter + a temp git repo — no network in any deterministic
test.**

- **Deterministic (headless, proven here):** the gate + negative control, the
  F7 hash-refusal, the write-back git operations, the two-commit shape, the
  Stage-B receipt mint/validate/chain, and the `RegistrationResult` schema
  validation.
- **Live-only (interactive probe against `KONE`, coordinator/human-owned —
  reviewers corroborate but never substitute):** L1 gateway connectivity, L2 a
  real Epic+Story create, L3 the real bidirectional link, L4 a live idempotent
  re-run. **The D4 stop condition stands:** if the live write path cannot be
  exercised, the loop stops rather than weakening the gate.

**Production adapter (`createDockerMcpAdapter`, live-only).** The ratified
Q2/Q11 dependency contingency **FIRED**: the one-shot `docker mcp tools call`
positional `key=value` transport is string-only (docker mcp CLI v0.43.1 -
`additional_fields=<json>` arrives as a string, `maxResults=1` fails "expected
number, received string"), and objects cannot be transported one-shot; but
`additional_fields` is unavoidable (required `customfield_14522` has no default;
`labels` is required by the gate). So the adapter uses the
**`@modelcontextprotocol/sdk`** client over stdio to the persistent gateway
(`docker mcp gateway run --servers atlassian-remote`), sending full JSON tool
arguments (objects native). It connects lazily on first call, reuses one
connection per adapter instance, and exposes a caller-owned `dispose()` (the
coordinator probe script owns the lifecycle). Tool mapping (coordinator live
tool list, 2026-07-22 — **verified-at-probe**): `createIssue -> createJiraIssue`
(args `cloudId`, `projectKey`, `issueTypeName`, `summary`, and an
`additional_fields` object), `updateIssue -> editJiraIssue`,
`search -> searchJiraIssuesUsingJql`, `addRemoteLink -> addCommentToJiraIssue`.
The server exposes **no** create-remote-link tool (only the read-only
`getJiraIssueRemoteIssueLinks`), so the `ticket->commit` link is written as a
**comment carrying the permalink**.

`cloudId` is **discovered, not hardcoded**: resolved once/lazily via the
argument-less `getAccessibleAtlassianResources` tool, selecting the
`https://kaseya.atlassian.net` site, cached, and passed on every call; a missing
site throws naming the site. The issue-type is translated **adapter-only**
(`{'11':'Epic','7':'Story'}` -> `issueTypeName`); payloads/gate/create-schema
stay id-based.

The adapter's mutating methods **embed the gate as defense-in-depth**:
`createIssue` asserts all three conditions and `updateIssue` asserts the label +
prefix present in its payload, both **before any client call** (the SDK client
is not even created for a gate-rejected call), so a direct integrator call
cannot bypass the gate (`addRemoteLink` carries no gate fields and relies on
create-time provenance). The exported factory stays for coordinator probe
wiring; deterministic tests inject an `McpToolClient` stub, asserting tool-arg
JSON fidelity with no live call and no gateway spawn.

**JQL `~` semantics are verify-at-probe (L4).** Production `~` is a tokenized,
fuzzy word match; the deterministic fake models it loosely (bare-token substring,
multi-match capable) rather than a stricter matcher, and the search-first upsert
**stops and reports** on any multi-match. The exact live `~` behaviour and the
resulting idempotency are confirmed by the L4 live re-run.

## Create schema (verified at the probe, never assumed)

Epic `issuetype` id `11`; Story `issuetype` id `7`; Story→Epic via the
**`parent`** field (`{"key":"KONE-XXXX"}`); required `customfield_14522` (Work
Type, no default) = `{"id":"12817"}`; `priority` omitted (defaults P2);
`labels: string[]`. These ids are **reference facts verified at the live
probe** — a server-side schema rejection is reported per-item (report-and-stop),
never retried with a guess.

## F7 hash-refusal (no fourth copy)

`assertApprovedHashMatches` consumes `approval`'s exported
`computeApprovalSubject` (which itself uses `approval`'s `canonicalize`/
`sha256Hex`) **read-only** — the identical code path that produced
`approvedHash`, so there is zero parity-drift risk and **no fourth vendored
canonical/hash copy**. It re-derives the composite subject hash from current
on-disk content and refuses (`HashMismatchError`, exit code `1`) if it differs.

## Prior-registration / reconcile ordering (and the abuse it closes)

Order: **prior-registration check → else F7 → else create.** The back-fill
mutates the referenced spec `.md` files (`ticket: KONE-TBD` → real key), which
changes their content hash — so F7 is a **first-registration precondition**,
evaluated only while content is still approved. Detection keys off the **Stage-B
receipt for the same `workflowId`** (does
`docs/receipts/<workflowId>/000001-B-registration-result.json` exist and form a
valid chain with the genesis?), **not** off non-TBD ticket keys. If it exists →
**reconcile** (verify/refresh links idempotently, create nothing, skip F7); else
→ F7 then create. **Abuse closed:** because the Stage-B receipt is minted only
by a completed first registration that itself passed F7, hand-editing `ticket:`
keys into unapproved specs cannot fabricate reconcile mode — there is no Stage-B
receipt for a workflowId that never registered.

Reconcile reads each link's `commitSha` + `permalink` from the **Stage-B receipt
subject** (the receipted source of truth), falling back to `git log` only if the
receipt lacks a link for a ticket key — so a later commit touching a spec never
drifts the reconciled permalink. Reconcile issues no commits and writes no
sidecar (the first run already committed both).

## The write-back order + rollback policy

`0` gate armed → `1` load record → `2` prior-registration check → `3` F7 (first
only) → `4` create Epic+Stories (search-first idempotent per `jira-integration`;
Story→Epic via `parent`) → `5` back-fill `ticket:` (that line only) → `6` commit
(commit 1) → `7` push → `8` capture the pushed post-key SHA → `9` build the
permalinks bound to that SHA + assemble the `RegistrationResult` → `10` mint,
write, and **commit (commit 2) the Stage-B receipt + sidecar** → `11` write the
Jira `ticket->commit` link.

**Why the receipt commits BEFORE the link write.** The `RegistrationResult` and
its links are deterministic from the pushed SHA + created keys, so the receipt
subject does not depend on the (external, fallible) Jira link write. Committing
the receipt first makes a link-write failure **recoverable**: a re-run detects
the durable Stage-B receipt → enters reconcile → writes the link idempotently
with zero duplicate creates. Reconcile-abuse stays closed — the receipt is
minted only here, after F7 passed at step 3 on the first run.

**No destructive undo of created tickets.** On any post-create failure the
package **STOPs, reports exactly what landed** (`RegistrationError.landed`), and
leaves a **re-runnable idempotent state** — search-first guarantees a re-run
creates no duplicates. Seams: if commit 1 (back-fill) fails, the back-fill
writes are rolled back so a re-run sees approved content (F7 passes) and
search-first updates the already-created tickets; if the link write (step 11)
fails, the receipt is already durable, so the re-run is reconcile and re-writes
the link from the receipted SHA. (If commit 2 itself fails, the receipt file is
on disk but uncommitted — the coordinator commits it; reconcile never issues
commits.) No `ticket:` `status:` is ever flipped, no spec is moved between
folders, no spec body is touched.

## Two commits + the `RegistrationResult` sidecar

The permalink binds the pushed post-key SHA and the Stage-B receipt records the
`RegistrationResult` (which needs that SHA), so the receipt cannot ride the
commit whose SHA the permalink binds. **Commit 1** = the frontmatter back-fill
(the permalink-bound SHA). **Commit 2** = the Stage-B receipt + the
`RegistrationResult` sidecar at `active/<slug>.registration.json` (non-`.md`,
never trips the spec-linter — mirrors the approval sidecar).

## Stage-B receipt + chain linkage

Exactly one `ReceiptDocument`: `kind:'stage'`, `stage:'B'`, `sequence:1`,
`prevHash` = the genesis hash from the approval record, `correlation` = the
approval record's (same `workflowId` — the chain key),
`subjectKind:'RegistrationResult'`, `subject` = the `RegistrationResult`,
`signature:null`, `schemaVersion:'1'`,
`hash = sha256Hex(canonicalize(<doc minus the hash key>))` (reusing `approval`'s
exported hash domain). Stored at
`receiptPath(workflowId,1,'B','RegistrationResult')`, validated with the shipped
`validateReceiptDocument`, and `validateChain([genesis, stageB])` passes. **P4
appends sequence 1 to the genesis chain** minted by P3; the genesis is never
re-minted or mutated.

## jira-integration base (F2)

Built on the write-direction discipline of
`plugins/audit-suite/skills/jira-integration`: **preview-before-write**,
**search-first idempotent** create/update keyed off the stable id in the summary
(`[TEST] [<stableId>] <title>`, JQL
`project = KONE AND labels = "mcp-test" AND summary ~ "<stableId>"`),
**update-never-clobber** (an update refreshes only summary/labels/customfield —
status/assignee/sprint are structurally absent), **per-item partial-failure
reporting**, and **credentials never echoed**.

**Preview-before-write** is a first-class `preview({ slug, repoRoot })` dry-run
that returns the payloads that would be created plus the planned actions, making
**zero adapter calls** and no git/fs writes (the Story `parent` it shows is the
provisional Epic key; the real key is resolved at registration time).

## Cross-package imports (relative ESM; bare-specifier ban)

Consumes the shipped surfaces via **filesystem-relative ESM** specifiers
(`../../contracts/src/index.js`, `../../approval/src/index.js`,
`../../receipts/src/index.js`, `../../projection/src/index.js`) — read-only,
modifying none. **No bare `@foreman-line/*` specifier** is used (no npm
workspace linking exists across `plugins/foreman-line/*`), and the root
`package.json` is unmodified. Any future schema-serialization need must consume
`plugins/foreman-line/schema-scaffold/` via a relative specifier, never copy it
(F9, satisfied vacuously here — this package authors no schema).

## Auth deviation + the fired dependency contingency

**Dependency deviation (Q11, ratified-and-fired).** The parcel's target
dependency set was `{ajv}`, with `@modelcontextprotocol/sdk` recorded as a
contingency admitted only if the one-shot `docker mcp tools call` path could not
be exercised. The coordinator's live probe established that it cannot carry the
objects this adapter must send (docker mcp CLI v0.43.1 transports `key=value`
args as strings only, and `additional_fields` — required for
`customfield_14522` and `labels` — is unavoidable). The contingency therefore
**fired**: `@modelcontextprotocol/sdk` is admitted as the single deliberate,
justified deviation. Runtime dependencies are exactly
`{ajv, @modelcontextprotocol/sdk}`, machine-enforced by the dependency-allowlist
test. All other process invocation still goes through built-ins (git via
`node:child_process`).

**Auth (F10, accepted-as-documented).** Auth is Clint's OAuth identity resolved
by the gateway/secret management — a **stand-in for, not an instance of, a
scoped service principal.** No token, OAuth secret, or credential appears in
this package, its fixtures, or any log; the only URL literal is the **public
`kaseya.atlassian.net` site-selection selector** used for cloudId discovery (a
discovery selector, not a connection base or secret). Tool failures are reported
by message only.
