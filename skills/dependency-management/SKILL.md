---
name: dependency-management
description: Manages the dependency upgrade lifecycle across any package manager. Use when upgrading or bumping a dependency to a new version, planning a major-version bump of a framework, batching outdated packages into reviewable PRs, reviewing a lockfile diff, deciding whether to upgrade a package, or recovering from a broken dependency update.
---

# Dependency Management

## Overview

Dependencies are the part of your codebase you don't control but are responsible for. Every pinned version is a snapshot of someone else's decisions — security patches, breaking changes, abandonded maintenance. This skill governs the upgrade lifecycle: knowing what's outdated, deciding what to change, changing it safely, and proving nothing broke. It is not a security audit (that's `security-and-hardening`) and not a system replacement (that's `deprecation-and-migration`); it's the operational discipline of keeping third-party code current without destabilizing your own.

## When to Use

- A dependency has a new major version and you're deciding whether to bump
- You're reviewing a lockfile diff or a `package.json` / `Cargo.toml` / `pyproject.toml` change in a PR
- A scheduled upgrade pass (weekly/monthly/quarterly) is due
- An advisory forces an upgrade and you need to choose the safest path
- A transitive dependency is dragging in an incompatible or vulnerable version
- An upgrade broke the build or tests and you need to recover

**When NOT to use:**
- Triaging a known CVE for reachability and severity → `security-and-hardening` (its "Triaging Dependency Audit Results" decision tree)
- Vetting a *new* dependency for trustworthiness and provenance → `security-and-hardening` (its "Supply-Chain Hygiene" section)
- Replacing one library with a different one entirely → `deprecation-and-migration`
- A flaky test that only fails on CI after an upgrade → `debugging-and-error-recovery`

## Process: Inventory → Assess → Batch → Upgrade → Verify

Each phase has an exit condition. Don't advance until the current one is satisfied.

```
INVENTORY ──→ ASSESS ──→ BATCH ──→ UPGRADE ──→ VERIFY
   │            │          │          │           │
   ▼            ▼          ▼          ▼           ▼
 what's      risk +       grouping   one change  tests + lockfile
 outdated?   changelog     by risk    at a time   + runtime proof
```

### Step 1 — Inventory

Find the installation boundary first (see `security-and-hardening`'s "Supply-Chain Hygiene" for the authoritative method), then enumerate what's outdated against the committed lockfile.

```bash
# npm / pnpm / yarn
npm outdated                            # lists current, wanted, latest
pnpm outdated
yarn outdated

# pip
pip list --outdated

# cargo
cargo update --dry-run

# maven
mvn versions:display-dependency-updates
```

Capture the output. This is your backlog. Do **not** copy "latest" into your manifest yet — `wanted` (the range you already declared) and `latest` (newest published) are different decisions.

**Exit condition:** a written list of every outdated dependency, each marked runtime vs dev, direct vs transitive.

### Step 2 — Assess

For each outdated package, gather the decision inputs *before* touching versions:

1. **Read the changelog / release notes** between your current pin and the target. Breaking changes are documented here, not in the version number.
2. **Classify the bump:** patch (bugfix), minor (additive), or major (breaking). Semver is a *claim*, not a guarantee — verify with the changelog.
3. **Check deprecation status.** A package marked deprecated in the registry is a different decision than one with a new major.
4. **Check the advisory picture** with the native audit — but route the *triage* through `security-and-hardening`, not here.
5. **Gauge blast radius.** Is this a leaf utility (cheap to bump) or a framework that everything else transitively depends on (expensive)?

```
For each outdated dependency:
├── Patch/minor, no breaking changes, leaf    → low risk, batch freely
├── Patch/minor on a core framework          → medium risk, test in isolation
├── Major, breaking changes documented        → high risk, upgrade alone
└── Deprecated or unmaintained upstream       → replace, don't upgrade (→ deprecation-and-migration)
```

**Exit condition:** every outdated entry has a risk label (low/medium/high), a target version, and a one-line reason grounded in the changelog.

### Step 3 — Batch

Group the assessed entries so each batch is independently shippable and revertable.

- **One batch for all low-risk patch/minor bumps.** These can ship together as a single "routine deps" PR.
- **One batch per high-risk major bump.** Each major upgrade is its own change, its own commit, its own verification. Never bundle two majors into one PR — if one breaks, you can't tell which caused it without bisecting.
- **Medium-risk minors on core frameworks** get their own batch if the changelog mentions any behavior change; otherwise they can ride with the low-risk batch.

The cost of bundling is paid at failure time. A single PR that upgrades React, Express, and TypeScript simultaneously is unreviewable: when the test suite goes red, you're hunting across three unrelated changelogs.

**Exit condition:** a written list of batches, each batch ≤ one high-risk upgrade, with the verification plan for each.

### Step 4 — Upgrade

Execute batches one at a time following `incremental-implementation` (thin slices, verify before expanding) and `test-driven-development` (a failing test first when a behavior change is expected).

```bash
# Apply the bump — pick the right verb for your manager
npm install <pkg>@<target>        # updates manifest + lockfile together
pnpm update <pkg>@<target>
pip install "<pkg>>=<target>"
cargo update -p <pkg> --precise <target>
```

Rules during the upgrade:

- **Commit before and after.** A clean `git status` before the bump means `git diff` afterward shows *only* the dependency change — that's reviewable. Bumping a dep while also editing unrelated code destroys reviewer signal.
- **Inspect the lockfile diff.** A one-line manifest change can pull in hundreds of transitive updates. Skim them: a surprise transitive add is a signal to investigate, not ignore.
- **Never run `npm audit fix --force` or equivalent.** Forced remediation crosses declared ranges and can land you on a major you didn't choose. See `security-and-hardening`.
- **Resolve peer-dependency warnings.** They're often the leading edge of a breaking change the changelog under-stated.

**Exit condition:** the manifest and lockfile are updated, the diff is clean (only dependency changes), and any peer warnings are resolved or documented.

### Step 5 — Verify

"Tests pass" is necessary but insufficient. A dependency upgrade can pass the unit suite and break the runtime, the build, or the bundle.

- [ ] **Unit + integration suite:** runs green (`npm test`, `pytest`, `cargo test`) with the new versions installed.
- [ ] **Build:** the production build succeeds (`npm run build`, etc.) — a test-only pass can hide a broken import or a removed API.
- [ ] **Runtime smoke:** the app actually boots and one representative user flow completes. For UI, `browser-testing-with-devtools`; for services, a curl against a running instance.
- [ ] **Lockfile audit:** the native audit has no new unmitigated reachable critical/high findings introduced by the bump.
- [ ] **Bundle/register size delta** when the package is on a hot path — a "minor" can quietly double your client bundle.

If anything fails, the recovery path is `git revert` + reopen Step 2 with the new information. Do not patch-forward over a broken upgrade without understanding *why* it broke.

**Exit condition:** every checkbox above has evidence (test output, build log, runtime confirmation), not a claim.

## Routine Upgrade Cadence

Letting deps rot for six months then doing a "big upgrade" is the most expensive way to manage dependencies — every breaking change hits at once and they compound. A regular, small cadence is cheaper:

| Cadence | What ships | Effort per cycle |
|---|---|---|
| **Weekly** | Low-risk patch/minor batches | minutes |
| **Monthly** | One medium-risk minor on a core framework, in isolation | an hour |
| **Quarterly** | Each outstanding high-risk major, one per cycle | a session each |

The point of the cadence is to keep the "upgrade surface" small. A weekly 5-minute PR is cheaper than a quarterly 5-day firefight.

## Recovering From a Broken Upgrade

When an upgrade breaks the build or tests:

1. **Revert first, diagnose second.** `git revert` the bump commit and get back to green. A red tree is hostile to investigation.
2. **Reproduce in isolation.** Check out the bump commit alone on a clean branch and run the failing test — confirm the dep caused it, not your other in-flight changes.
3. **Read the changelog again with the failure in hand.** The breaking change you skimmed in Step 2 is now specific; re-reading with the error message usually pinpoints it.
4. **Decide: adapt, pin back, or replace.** Adapting (code change) is normal for a warranted major. Pinning back is correct when the bump was unintentional. Replacing (→ `deprecation-and-migration`) is correct when the upstream made a direction you can't follow.
5. **Add a regression test before re-bumping.** If the breakage was subtle, a test that fails on the old behavior and passes on the new one prevents the next person from re-triggering it.

This overlaps with `debugging-and-error-recovery`'s reproduce → localize → fix → guard loop; apply that skill's discipline to the localization step.

## Lockfile Hygiene

- **One authoritative lockfile, committed.** Don't let two managers' lockfiles compete — see `security-and-hardening`.
- **CI installs from the lockfile, frozen.** `npm ci`, `pip install --requirement` from a hashed constraints file, `cargo build --frozen`. CI that resolves fresh on each run is testing versions you don't ship.
- **Don't hand-edit lockfiles.** They're a *record* of a resolution, not a source of truth. Regenerate them with the manager.
- **Renovate / Dependabot / dependabot-compatible bots** automate Step 1 and Step 3 (inventory + batching) but do **not** replace Step 2 (assess) or Step 5 (verify). A bot-generated PR with a passing CI check is still a major-version bump that needs a human reading the changelog.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It's a minor, what could break?" | Minors can carry behavior changes and new peers. The semver *claim* is the maintainer's intent; the changelog is the evidence. Read it. |
| "I'll just bump everything to latest in one PR" | One broken dep poisons the whole diff. Reviewers can't attribute a red test to React vs Express vs TypeScript. One major per PR, always. |
| `npm audit fix --force` will sort it out | Forced remediation crosses declared ranges and can land on a major you didn't choose. See `security-and-hardening`. |
| "The CI passed, so the upgrade is safe" | CI runs the test suite, not your runtime. A removed API can compile and pass unit tests and crash the first real request. Verify at runtime. |
| "We'll do a big upgrade sprint next quarter" | Compounding breaking changes make a quarterly big-bang more expensive than 12 weekly bumps. Rotate, don't accumulate. |
| "Dependabot says it's safe to merge" | Dependabot confirms the version exists and the tests pass. It does not read the changelog. You do. |
| "Pin it and forget it" | An unupgraded pinned dep accumulates CVEs silently. Pinning is a decision with a review date, not a permanent answer. |
| "Lockfile changes are noise, skip reviewing" | A one-line manifest bump can pull hundreds of transitive deps. The lockfile diff is the *real* change. Skim it. |

## Red Flags

- Bundling two or more major-version upgrades into one PR or commit
- Bumping a version without reading the changelog between current and target
- CI that installs from `package.json` / `requirements.txt` only, ignoring the lockfile
- A "minor" upgrade landing on a major because of a caret/tilde range you forgot you declared
- Merging a bot-generated dep PR with zero changelog review because "tests passed"
- A lockfile diff with hundreds of transitive changes you didn't skim
- Pinning a vulnerable version and closing the ticket without a review date
- A routine upgrade PR that also edits unrelated application code (destroys reviewer signal)
- Red tests after an upgrade getting patched forward instead of investigated

## Verification

After completing a dependency upgrade batch:

- [ ] The manifest and lockfile are updated together; the diff contains *only* dependency changes
- [ ] Every upgraded package has its changelog read and its risk labeled in writing
- [ ] High-risk major upgrades shipped one per PR/commit, not bundled
- [ ] Unit and integration suites pass with evidence (test output, not a claim)
- [ ] Production build succeeds
- [ ] Runtime smoke test passes — app boots, one representative flow completes
- [ ] Native audit shows no new unmitigated reachable critical/high findings
- [ ] For client-bundled deps: bundle size delta checked and acceptable
- [ ] If recovering from a breakage: a regression test was added before re-bumping

## See Also

- `security-and-hardening` — triaging audit results, supply-chain hygiene, blocking dependency scripts, verifying provenance. This skill's assessment phase routes advisory triage there.
- `deprecation-and-migration` — replacing one dependency with a different one entirely, including the expand/contract pattern when the dependency is a data store.
- `incremental-implementation` — the thin-slice discipline behind "one major per PR, verify before expanding."
- `test-driven-development` — write a failing test first when an upgrade is expected to change behavior.
- `debugging-and-error-recovery` — the reproduce → localize → fix → guard loop used in "Recovering From a Broken Upgrade."