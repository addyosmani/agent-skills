# Goal Charter — Plugin Packaging and the Project Scaffolder

**Created:** 2026-07-29
**Owner:** Clinton Morgan
**Status:** ratified and amended (Gate 1 cleared 2026-07-29; re-ratified for D9a 2026-07-29 after plan review)
**Coordinator:** unassigned — claim via the loop directive's ownership block
**Amendment record:** plan-level adversarial review triaged in `plan-review-findings.md` — 10 fix, 1 reject. D9a amended under a re-opened Gate 1; amendments 2–9 applied under coordinator authority in the same pass. P7 clean-room shape specified 2026-07-29 (coordinator authority, no locked decision affected).

---

## 1. Objective

Make the Foreman Line an installable plugin whose canon travels, and give it a scaffolder that
bootstraps that canon into any target project as a `/goal` preflight — so no developer ever
hand-assembles the directory structure, conventions, constraints, or agent-entry pointers again.

Two deliverables, one design, because both answer the same question: **what exactly crosses the
boundary into another project.**

The pattern being generalized was built by hand during this plugin's own construction. That
provenance is invisible to a developer seeing it for the first time, and the hand-assembly is
precisely what produced the drift catalogued in §3.

### Out of scope (deliberate)

- Cryptographic receipt recomputation (finding F2) — this goal defines the preconditions it gates, not the implementation.
- Live merge verification (finding F3) — same.
- Tracker/SCM/compression/docs **adapter implementations**. This goal builds the seam they plug into.
- Retrofitting the 34 shipped specs with `involves:`. The field is optional by construction; backfill is not required.

---

## 2. Locked decisions

| # | Decision | Reasoning |
|---|---|---|
| D1 | Scaffold unit is a **project root**, gap-driven | Matches SPEC-CONVENTION's monorepo rule. Greenfield vs. adopt are report labels, not code branches (see D9a). |
| D2 | Seed canon is a **curated universal starter set, de-provenanced**; the project's lessons ledger starts empty | Rules earned on real defects are worth inheriting; another project's lesson numbers and build history are not. |
| D3 | Fires as a **`/goal` preflight**, no new command | The entry point already exists and already depends on the canon being present. |
| D4 | Existing agent files are edited **only inside a delimited managed block** | Idempotent, diff-reviewable, safe against hand-curated content. |
| D5 | **`AGENTS.md` holds the canon**; `CLAUDE.md` is a one-line import | One source of truth, portable to other agent tooling. |
| D6 | Enforcement is a **CI job running the frontmatter linter via Node**, independent of project language | The linter validates markdown, not code — only its runtime is Node. |
| D7 | Resume state is **`docs/goals/INDEX.md` plus each goal's ownership block** | Extends what the coordinator pattern already maintains; no second source of truth. |
| D8 | Generated content names "Foreman Line" **only when referring to the plugin** | Dogfooding provenance is noise to every project that isn't this one. |
| D9 | Generator is **deterministic and byte-exact**; the skill supplies judgment inputs only | The generator never infers, the skill never authors. |
| D9a | **No mode switch; one mode, gap-fill against the canonical layout.** The generator computes a gap set and writes only absent targets. **Before gap detection it runs an equivalent-layout check:** any directory evidently serving a canonical target's role — containing spec markdown with SPEC-CONVENTION-shaped frontmatter, or matching a known alternative layout (`docs/PARCELS/`, `docs/parcels/`) — is a conflict. On detection the generator emits a typed `EQUIVALENT_LAYOUT_CONFLICT` naming both paths, writes nothing, and refuses; the developer reconciles before re-running. *(Amended after plan review, B1.)* | Eliminates misclassification as a bug class; idempotency falls out rather than being maintained. The pre-check exists because gap detection alone cannot distinguish *absent* from *present under another convention*, and non-destruction forbids reconciling in place — so without it the generator manufactures the exact F9 drift this goal exists to remove. Refuse-not-repair, consistent with §4.3's malformed-marker rule. |
| D10 | **Kaseya becomes one named profile**; the core contract is profile-agnostic | Finding F4: project key, tracker, assignee, base branch, and model tiers are config, not code. |
| D11 | Generated spec template carries **both `surfaces:`** (routing/audit) **and `allowed_files`** (mutation authority) | Finding F5; resolves the standing divergence between PDD and SPEC-CONVENTION. |
| D12 | **Gate 3 is delegable iff the target repo's branch ruleset names the agent's own identity as a bypass actor**, verified by querying the ruleset at merge time rather than asserted in a directive | **Two distinct controls, not one** *(clarified after plan review, S1)*: (i) **structural, config-enforced** — `bypass_actors: []` means no actor satisfies the delegation condition, so it evaluates false; (ii) **behavioral, coordinator-enforced** — the coordinator stops before any merge call and reports. Nothing in configuration prevents an authenticated session from executing `gh pr merge` once a human approval has satisfied the required-review count; that path is legitimate, not a bypass, and is closed by coordinator discipline alone. Do not read config as the sole authority — an implementer who does will omit the behavioral half and trust config to enforce what only behavior can. **Fail-closed:** no distinct agent identity exists today (the agent authenticates as a human user, and GitHub `bypass_actors` cannot name individual users), so the condition evaluates false everywhere and every merge stays human-owned. Requires **no** change to the existing `tools protector` ruleset — its `bypass_actors: []` *is* the correct configuration under this rule. SPEC-CONVENTION §8.4 changes from "never delegable" to "delegable only by explicit, auditable config grant." Self-resolves if an agent identity is later established. |
| D13 | **Packaging precedes scaffolding** in build order | A scaffolder inside a non-installable plugin cannot reach another repo — and per F8, cannot even load here. |
| D14 | Capability declaration uses the frontmatter field **`involves:`**, optional, advisory, never a gate | Late-binding beats early-binding: the spec declares the capability area, resolution happens against whatever exists locally, and zero resolution is a normal outcome. |
| D15 | **Reference where identity is the point; copy only where divergence is the point** | The three-way PDD split (F9) was caused by copying canon. Role/method canon is referenced from the plugin; project-owned artifacts are copied. |

---

## 3. Findings register (the evidence base)

F1–F7 arrived from an external adversarial review of a transplanted checkout
(`D:/Repos/agent-skills`). All seven were verified against this repo. F8–F9 were found during that
verification and are new.

| # | Finding | Verdict | Locator |
|---|---|---|---|
| F1 | Not an ingestible plugin: no manifest, no marketplace entry, skills outside the plugin tree | **Confirmed** | no `plugins/foreman-line/.claude-plugin/`; 0 hits in `.claude-plugin/marketplace.json` |
| F2 | Receipt verification is not tamper-evident — stored hashes compared, never recomputed | **Confirmed, self-documented** | `receipts/src/validator.ts:10-15`, `checkPrevHashPointers` |
| F3 | Stage F can seal an *asserted* merge — `mergeSha` shape-validated only | **Confirmed** | `integration/src/closure.ts` `assertValidMergeSha` |
| F4 | Kaseya dogfood profile hardcoded into core | **Confirmed, understated** | `registration/src/register.ts:46` (`PROJECT_KEY = 'KONE'`), `dispatch/src/query/index.ts:85` (assignee literal), `routing-policy.yaml:48` (`claude-opus-4-8`) |
| F5 | PDD's exact `Allowed Files` authority is absent from every shipped spec | **Confirmed** | 34/34 specs carry `surfaces:`; 0 carry `Allowed Files`, while `skills/parcel-driven-development/SKILL.md:237` mandates it and `:420` tells reviewers to reject on it |
| F6 | Human merge authority is contradictory | **Confirmed** | `docs/SPEC-CONVENTION.md:194` vs `plugins/foreman-line/docs/COORDINATOR-PATTERN.md:52` |
| F7 | Permission profiles reduce capability but do not contain it | **Confirmed, fairly characterized** | `permission-profiles/README.md:90` — already honest; a positioning constraint, not a defect |
| F8 | **The documented entry point does not load.** `goal` and `foreman-shaping` exist only in repo-root `skills/`, which is not a discovery path; only `~/.claude/skills/` and installed plugins load. `CLAUDE.md` advertises `/goal` as the coordinator entry point and it is not invokable in its own repo. | **New** | `~/.claude/skills/` holds 16 loadable skills; `goal` and `foreman-shaping` are absent from it |
| F9 | **PDD exists in ≥3 divergent copies.** Repo and personal-scope copies differ by 60 bytes at identical line count (27318 vs 27258); the difference is the spec location — personal says `docs/PARCELS/`, repo says `<project-root>/docs/parcels/`. A third copy in `keon-skills` differs again. **The copy that actually loads matches none of the 34 shipped specs**, which use `docs/specs/{active,done}/`. | **New** | `Get-FileHash` on both copies; `Compare-Object` isolates the spec-location lines |

**Corrections to the external review.** Its verification snapshot does not apply here: "the whole
plugin and supporting skills remain untracked" is false in this repo (foreman-line is tracked, 614
files), and the two verification failures needing files on `origin/main`, the unvalidatable commit
provenance, and integration's uninstalled dependencies are all artifacts of the `D:` transplant.
Separately, F4's assignee literal is not sloppiness — the surrounding comments show it is fixed
*specifically* so it cannot be interpolated, as a JQL-injection guard. Parameterizing it must
preserve that control (see P4).

**Tooling caveat encountered during verification:** the rtk-wrapped `diff` reported two
byte-different files as "identical." Byte comparisons in this repo should use `Get-FileHash`.

---

## 4. Architecture

### 4.1 Plugin shape

Follows the working `audit-suite` pattern:

```
plugins/foreman-line/
  .claude-plugin/plugin.json      # new
  skills/                         # moved IN, so they load and travel
    goal/ foreman-shaping/ parcel-driven-development/
  templates/                      # de-dogfooded canon the scaffolder copies
  project-scaffold/               # new TS package (the generator)
  <14 existing pipeline packages>
  README.md  CHANGELOG.md
```

Plus a `.claude-plugin/marketplace.json` entry, which is what makes it installable elsewhere.

Moving the skills in **fixes** F8 rather than relocating it — plugin `skills/` is a real discovery
path, repo-root `skills/` is not. The personal-scope copies in `~/.claude/skills/` must be
**deleted**, not left as a fallback; leaving them is what produced F9.

The 14 pipeline packages are **not** scaffolder dependencies. Only `spec-linter` is needed by a
scaffolded project (for D6's CI job). Receipts, approval, registration, dispatch, and integration
are the Line's own machinery and stay behind the profile seam.

### 4.2 The profile seam (three layers)

**Layer 1 — project identity** (`foreman/config.yaml`, committed and PR-reviewed). Project key or
prefix, base branch, branch prefix, worktree root, the **dispatch queue identity** (the value the
candidate query filters on — an assignee or equivalent, today the hardcoded literal at
`dispatch/src/query/index.ts:85`), vocabulary extensions, and the `involves:`→skill map. No adapter
enum.

**Layer 2 — capability declaration** (`involves:` in spec frontmatter, per D14). Semantics
deliberately mirror `surfaces:` §4.7:

- **Optional.** Absent means no hints. Never an error.
- **Semi-controlled vocabulary**, initial set — `source_control`, `ticketing`, `auditing`, `documentation`, `compression`, `design_system`. Not exhaustive; extended by PR the same way `surfaces:` §4.7 is. Unknown values emit a non-blocking advisory and pass, exactly as unknown surfaces do.
- **Zero resolution is a no-op**, not a failure. Nothing local satisfying `ticketing` degrades that stage to specs-only, announced once.
- **Never a gate.** A declared capability that resolves to nothing cannot block dispatch. This is the rule that makes the plugin portable and the one most likely to erode under pressure — "but ticketing is required *here*" belongs in that project's config, not in the field's semantics.

Resolution stays deterministic (D9): it is a lookup in the schema-validated skill-injection matrix
with glob semantics, not a freetext skill hunt. The only judgment is a human authoring the map
under review.

**Layer 3 — named presets** (`templates/profiles/`). `kaseya.yaml` maps `ticketing → jira-workflow`,
`compression → kompress`, `documentation → docspine`, and carries KONE and the Atlassian instance.
One selectable preset, never the default, never in the core path.

### 4.3 Generator mechanics

**Division of labor.** The skill gathers and confirms with the developer: project name and slug,
base branch, branch prefix, worktree root, profile preset, project key or prefix if any. It passes
them as arguments. A missing required input is a usage error, never a guess.

The generator computes the gap set, copies absent files from `templates/`, splices the managed
block, emits `docs/goals/INDEX.md`, emits the CI workflow, writes `foreman/config.yaml`, and
reports every path as created / skipped-existing / block-updated.

**Core invariant.** The generator **never modifies a file it did not create**, with exactly one
exception — the managed block region. A file that exists is skipped. Always. No merging, no
reconciling, no improving.

**Substitution.** Templates carry declared placeholders (`{{PROJECT_NAME}}`, `{{BASE_BRANCH}}`).
Substitution applies only to an enumerated token map; everything else copies byte-for-byte. **Any
unreplaced `{{...}}` surviving into output is an error, not a warning** — a typo'd placeholder fails
the run instead of shipping literal braces into a project's canon.

**Managed block.** Markers are
`<!-- foreman-line:begin (generated — edits inside are overwritten) -->` …
`<!-- foreman-line:end -->`. Absent markers append at end of file. Present markers replace strictly
between them, preserving both sides byte-for-byte. **Malformed markers — begin without end,
reversed order, nesting — refuse with a typed error and write nothing.** A half-marker means a
human edited the region; guessing the boundary risks deleting their content, and refusing costs
only a message.

**Errors** reuse the exit-code contract PCC-P0 froze, so the plugin speaks one dialect: `0` success,
`1` validation failure, `2` usage error, `3` trust-invariant violation, `4` environment error. Every
failure is typed and every path reported. Partial runs report what landed rather than rolling back —
a half-scaffolded project the developer can see beats a silent revert.

**Dry-run is the default in preflight.** `/goal` runs `--dry-run`, shows the plan, applies on
confirmation. That preserves "no manual assembly" while keeping a human sighted on first write into
their repo, and it is also how they learn the scaffold already exists and nothing needs doing.

### 4.4 Copy vs. reference (D15)

**Linter vocabulary resolution order** *(specified after plan review, N2)*: the linter resolves a
`surfaces:` or `involves:` value against (i) the base known-prefix set baked into the linter's own
version, which is the executable representation of SPEC-CONVENTION §4.7, then (ii) project extensions
declared in `foreman/config.yaml`. A value matching either is **known** — no advisory. Anything else
is **unknown** — non-blocking advisory, exit code unchanged. The two sets are additive and cannot
conflict: §4.7's PR mechanism extends the org-wide set for everyone, `foreman/config.yaml` extends
one project's set locally.

*Referenced* from the plugin, never copied: `COORDINATOR-PATTERN.md`, `SPEC-CONVENTION.md`, the PDD
method, and the `goal`/`foreman-shaping` skills. A project running a different version of these is a
bug, not a customization.

This also resolves a schema-drift hazard: SPEC-CONVENTION defines the frontmatter schema the linter
enforces, so a *copied* convention can silently disagree with the linter validating it. Referenced,
they cannot drift. The project's legitimate need to extend the `surfaces:`/`involves:` vocabularies
(§4.7's PR-extension mechanism) moves into `foreman/config.yaml` as data the linter reads — prose
referenced, vocabulary owned.

*Copied*, because each project must own and grow them: `STANDING-CONSTRAINTS.md` (D2's curated
starter set), the lessons ledger, config and policy files, kickstarter templates.

### 4.5 Generated artifact set

```
AGENTS.md                              # managed block: canon pointers + resume state
CLAUDE.md                              # @AGENTS.md import
foreman/config.yaml                    # identity, vocabulary, involves→skill map
foreman/routing-policy.yaml
foreman/skill-injection.yaml
docs/specs/{INDEX.md,active/,done/}
docs/goals/INDEX.md                    # resume state per D7
docs/transcripts/defects_lessons.md    # header + disposition convention, ledger empty
docs/kickstarters/STANDING-CONSTRAINTS.md
docs/kickstarters/{shaping,builder,reviewer}-template.md
.github/workflows/spec-lint.yml
```

One new visible top-level `foreman/` directory rather than four root files, and not dotted — the
same reasoning SPEC-CONVENTION uses for keeping specs out of `.spec/`.

**`permission-profiles.yaml` is deliberately not scaffolded.** Per F7 it reduces rather than
contains agent capability, and its emitted worktree-local envelope has documented inert cases. A
project adopting it needs that failure-mode accounting in front of it as a decision, not a generated
default. Scaffolding it would imply a containment guarantee the package itself disclaims.

---

## 5. Decomposition

Parcels in dependency order. Waves 1 and 2 are strictly prerequisite. **Wave 2 is sequential: P4
precedes P3** *(amended after plan review, S2 — the independence claim was false; P3's
`skill-injection.yaml` template and P4's `integration.jira` → `integration.ticketing` rename share
the same key surface, so P3 must consume the name P4 establishes).* P5 depends on both; P7 gates the
goal.

### Wave 1 — Packaging (prerequisite)

**P1 — Plugin manifest and skill relocation.** Add `.claude-plugin/plugin.json` and the
marketplace entry; move `goal`, `foreman-shaping`, `parcel-driven-development` into
`plugins/foreman-line/skills/`; update every pointer naming the old paths (`CLAUDE.md`, root
`AGENTS.md`). Closes F1 and F8.

**Ordering — developer ruling 2026-07-29: install the plugin locally first, then remove the
redundant `~/.claude/skills/parcel-driven-development/`.** No window exists in which PDD is
unavailable.

**Scope bound.** Four skills are duplicated between `skills/` and `~/.claude/skills/` — verified:
`get-app-specs`, `jira-workflow`, `modernize`, `parcel-driven-development`. **Only
`parcel-driven-development` is owned by this plugin.** The other three are out of scope; touching
them is scope drift.

**Verifiability split.** Skill discovery happens at session start, so "`/goal` loads from the
installed plugin" **cannot be verified in the session that moves it**. Acceptance criteria must
separate disk-verifiable claims (manifest valid, marketplace entry parses, files relocated, no
dangling pointers) from the fresh-session human check, recorded post-merge. An AC conflating them
invites a self-graded claim (D4: no agent verifies its own work).

*risk: elevated · routing_class: architecture/risk* — touches skill discovery; getting it wrong
leaves `/goal` unloadable.

**P2 — Collapse the spec-location split.** Standardize on `docs/specs/{active,done}/`; rewrite the
surviving PDD copy's `docs/parcels/` language to match; merge PDD's `## Allowed Files` section into
the SPEC-CONVENTION spec body per D11. Closes F5, and closes F9 jointly with P1 — **P1 removes the
duplicate copies, P2 reconciles the content of the one that survives.** The `keon-skills` third copy
lives in another repository and is out of reach; record it as a known external divergence.
*risk: elevated · routing_class: architecture/risk* — edits canon that 34 shipped specs and the
reviewer checklist both reference.

### Wave 2 — Canon generalization

**P3 — De-dogfood canon into `templates/`.** Curated universal `STANDING-CONSTRAINTS.md`, empty
lessons ledger with the disposition convention, kickstarter templates, `AGENTS.md` template. Closes
D2 and D8.

**Inherited from P1 (coordinator-ratified amendment 2026-07-29).** `AGENTS.md` was removed from P1's
scope: it is untracked, therefore absent from every `git worktree add` checkout, so an edit AC
against it is unsatisfiable and `git grep` cannot see it. P3 owns creating it in its **D5 shape** —
`AGENTS.md` as canon, `CLAUDE.md` reduced to a one-line import — rather than inheriting the
duplicate-of-`CLAUDE.md` shape D5 exists to replace. The stray untracked duplicate was deleted per
developer ruling, so P3 starts from nothing rather than reconciling.

*risk: standard · routing_class: standard-feature*

**P4 — Profile seam.** Add `involves:` to the frontmatter schema with spec-linter support and
advisory-vocabulary behavior; rename skill-injection's `integration.jira` key to
`integration.ticketing`; move model IDs out of `routing-policy.yaml` literals into a single
`models:` block; parameterize the dispatch queue identity per the ruling below. Closes F4 and D14.

**Identity parameterization — coordinator ruling (B2).** The original blanket clause ("every config
value goes through `assertJqlSafeToken`") is **withdrawn as over-general**: it is correct for
token-shaped values and impossible for address-shaped ones, because `assertJqlSafeToken`'s charset is
`[A-Za-z0-9._-]` and `@` is char 64. Two paths, in preference order:

- **Preferred — sidestep the charset.** Where the tracker supports identity by account id rather than email (Jira Cloud does: `assignee = <accountId>`), config holds the account id, which is token-shaped and passes the existing guard unmodified. No new assertion, no widened charset.
- **Fallback — a narrower assertion for quoted-literal positions only.** Where an address is unavoidable, add `assertJqlSafeQuotedLiteral`, distinct from `assertJqlSafeToken` and never a replacement for it. It permits `@`, admits only an explicit allowlist otherwise, and must reject the double quote, the backslash, and control characters including newline and tab — **each with its own independent refusal test** (STANDING-CONSTRAINTS #3). This is not a weakening: `jql.ts:2-5` states the charset's purpose is preventing breakout from a *quoted* literal, and both call sites already interpolate into quoted positions, so `@` was never the threat.
- **Prohibited:** widening `assertJqlSafeToken` itself, or interpolating a config-sourced address into an unquoted position.

If neither path is implementable for a given tracker, §9's P4 stop condition fires.

**Prerequisite (N3):** the `involves:` frontmatter schema change is a SPEC-CONVENTION amendment, so
per §11 it lands as a **standalone coordinator-ratified amendment commit — exact replacement text
supplied by the coordinator, committed alone, before any implementing code.**

*risk: elevated · routing_class: architecture/risk* — parameterizes a value that is currently
hardcoded *as a security control*. Config-driven and injection-safe are compatible; config-driven
and unvalidated converts a hardcoded identity into an injection vector while calling it portability.

### Wave 3 — Generator

**P5 — `project-scaffold` package.** Gap detection, byte-exact copy with enumerated substitution,
managed-block splice, exit codes, and the full test suite from §6.
*risk: elevated · routing_class: architecture/risk* — writes into arbitrary repositories;
non-destruction is a safety property, not a nicety.

**P6 — `/goal` preflight wiring.** Dry-run, present plan, apply on confirmation; report
created/skipped/updated. Closes D3.
*risk: elevated · routing_class: architecture/risk* — *(amended after plan review, S5)* this is the
integration seam between two subsystems that did not exist before this goal, invoked at the start of
every coordinated workflow. A wiring defect fails the goal's entire value proposition silently on
every future `/goal`. Dry-run limits blast radius; it does not make the seam low-risk. Frontier
builder per the dispatch table.

### Wave 4 — Proof

**P7 — Clean-room trial.** Scaffold a repository with no pre-existing Foreman or Kaseya artifacts;
assert the generated canon passes the linter it wired; assert a second run writes zero bytes; grep
the output against §7 criterion 4's enumerated pattern list asserting zero hits; run `/goal`'s
dry-run preflight per §7 criterion 6.

**Clean-room shape — coordinator ruling.** The deliverable is a **fixture factory**, not a
maintained repository. §6's fixture-project pattern at full scale.

- **Ephemeral, minted per run, destroyed after.** A clean room stops being clean the moment it is used once; criteria 3 and 4 are both corrupted by residual state. Never a persistent directory that gets re-scaffolded.
- **`git init` + one commit + a named default branch. No remote.** Without `.git`, the emitted `base branch` and `branch prefix` are unverifiable and criterion 6 passes vacuously, since PDD Phase -1 has nothing to discover. A remote is *not* required: D12's ruleset query is the only consumer of one, and with no remote the query cannot succeed, which must yield "condition false → human-owned merge" — so the no-remote case **exercises** D12's fail-closed path rather than skipping it. Assert that outcome explicitly.
- **Location:** `$FOREMAN_CLEANROOM_DIR`, defaulting to an OS-temp `mkdtemp`. A stable scratch parent such as `~/.foreman/clean-room/` is acceptable and aids debugging, provided each run mints a fresh child directory inside it.
- **Retain on failure, delete on success.** A destroyed fixture is unusable evidence.
- **Two fixtures, not one, with opposing requirements:** the clean repo above, and the F9-shaped repo carrying `docs/PARCELS/` required by verification item 9.

*risk: standard · routing_class: standard-feature*

---

## 6. Verification plan

Ordered by what each would actually catch.

1. **Non-destruction.** Pre-populate every target with sentinel content; run; assert every sentinel byte-identical and every path reported skipped.
2. **Idempotency.** Two consecutive runs; the second writes zero bytes and exits 0.
3. **Managed block, six cases.** Absent markers append; present markers replace with both sides byte-exact; four malformed shapes (begin-only, end-only, reversed, nested) each produce a typed refusal with zero writes.
4. **Placeholder integrity.** An unreplaced `{{...}}` fails the run; no output is written.
5. **Fixture projects.** Empty directory; repo with a hand-curated `CLAUDE.md`; repo with partial canon; repo with complete canon (must be a no-op).
6. **Generated output passes the linter it wired.** A scaffold emitting canon its own validator rejects is the exact failure SPEC-CONVENTION warns about; this test keeps template and linter honest as both evolve.
7. **Clean-room grep.** The only test that actually enforces D8 and D10 rather than trusting them.
8. **Zero-resolution is a no-op** *(added after plan review, S4).* A spec declaring `involves: [ticketing]` against a `foreman/config.yaml` with no `ticketing` entry: the linter passes, dispatch proceeds, and no blocking output is produced. This is the test that proves D14's optionality rather than asserting it.
9. **Equivalent-layout refusal** *(added for amended D9a, B1).* A fixture repo carrying `docs/PARCELS/` with SPEC-CONVENTION-shaped frontmatter: the generator emits `EQUIVALENT_LAYOUT_CONFLICT` naming both paths, writes zero bytes, and does **not** create `docs/specs/`.

### Mandated reviewer focus questions

- Is the `involves:` field genuinely optional end-to-end, or does some consumer treat absence or zero-resolution as an error?
- Does the managed-block splice preserve bytes outside the markers under CRLF, missing trailing newline, and a block appearing mid-file?
- Does P4's identity parameterization actually refuse hostile values, proven by breaking the fixture in each named dimension (`"`, `\`, newline, tab) — or does it merely call the assertion? If the account-id path was taken, is `assertJqlSafeToken` genuinely unmodified?
- Is any referenced-vs-copied artifact (D15) miscategorized such that canon can drift again?
- Does the generator ever write outside the computed gap set, including via substitution or block handling?

---

## 7. Exit criterion

A clean-room repository with no pre-existing Foreman or Kaseya artifacts receives a complete
scaffold via the `/goal` preflight, where:

1. `/goal` is invokable from the **installed plugin** (not repo-root `skills/`);
2. the generated canon **passes the spec-linter the scaffold itself wired up**;
3. a second scaffold run writes **zero bytes** and exits 0;
4. grep over all generated output returns **zero hits** for this enumerated pattern list *(specified after plan review, S6 — "foreman-internal paths" was not reproducible)*: `KONE`, `kaseya`, `clinton.morgan`, `atlassian.net`, `plugins/foreman-line/`, `skills/goal/`, `skills/foreman-shaping/`, `docs/foreman-line/`;
5. every artifact in §4.5 is present;
6. **`/goal` completes its dry-run preflight in the scaffolded repo** against a minimal fixture spec, with no errors and no missing-config warnings *(added after plan review, S3)*. Criteria 1–5 prove the artifacts exist and are clean; only this one proves they are *sufficient to operate on* — without it, all five can pass while a developer still hand-edits config before `/goal` will run, which is the objective unmet.

All six are agent-verifiable from the transcript.

---

## 8. Standing authorizations

- **Gate 2 (dispatch approval):** granted for the seven parcels named in §5, at their stated risk and routing class. A parcel not named here needs explicit approval.
- **Gate 3 (merge):** **not delegated.** Per D12 the condition evaluates false — no distinct agent identity exists, and `tools protector` correctly carries `bypass_actors: []`. The coordinator stops at merge and reports.

---

## 9. Stop conditions

Universal: a frozen contract needs modification; a tripwire fires twice on one parcel; a security
finding cannot close in-parcel; anything outward-facing beyond these authorizations; queue empty.

Goal-specific:

- **P1 leaves `/goal` unloadable.** Stop immediately — this is the load-bearing prerequisite.
- **P2 requires editing any shipped spec's frontmatter.** The 34 specs are corpus; a canon change that forces corpus edits needs a ruling and a named migration, per the enumeration-sweep clause.
- **P4 cannot preserve the JQL guard while parameterizing.** Stop rather than shipping an unvalidated interpolation.
- **A generated artifact fails the linter and the fix requires weakening the linter.** That inverts the control; stop and rule.
- **Any proposal to make `involves:` blocking.** D14 is load-bearing for portability.

---

## 10. Next step

Per COORDINATOR-PATTERN, a ratified charter goes to **plan-level adversarial review before the
first parcel is shaped** — a fresh frontier session with no context beyond this charter and repo
canon. That review is not risk-gated; it runs every time. Findings are triaged into
`plan-review-findings.md` in this directory, and any triage outcome that changes a locked decision
re-opens Gate 1 for that decision only.
