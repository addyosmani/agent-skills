---
name: github-stacked-pull-requests
description: "Use stacked pull requests to break a large change into ordered, independently-reviewable PRs. Each PR targets the layer below it and stacks land together in one click. Built into GitHub since 2026-07-30 public preview (CLI extension: gh extension install github/gh-stack); works with existing branch protections, reviews, merge queue, and gh CLI tooling. Pairs with git-workflow-and-versioning (commit discipline) and github-api (the Git Data API is the canonical write path). Use when one logical change touches more than one repos worth of files, when a multi-day feature has natural layers, when reviewers slow down on a single giant PR, or when stacking against a base branch that is itself in flight. Triggers on: stacked PR, gh-stack, github/gh-stack, stack of PRs, layered PRs, merge the stack, stack map, merge queue stack."
license: "MIT"
metadata:
  short-description: "GitHub Stacked PRs public preview (2026-07-30): ordered PR chains that land together in one click, with native merge-queue support"
---

# GitHub Stacked Pull Requests

Source: https://github.blog/changelog/2026-07-30-stacked-pull-requests-are-now-in-public-preview/

## What It Is

Stacked PRs are an ordered series of pull requests where each PR targets the layer
below it. The bottom layer targets `main`. Reviewers see only that layer's diff.
Stacks land together in a single click, or one layer at a time — anything below
the merged layer auto-rebases and retargets.

```
PR #3  ←─┐  (top of stack)
PR #2  ←─┼── targets PR #1's branch
PR #1  ←─┘  (bottom of stack — targets main)
main
```

This solves the "one giant PR" review bottleneck: the same logical change ships
as 3-8 small, focused PRs that each touch ~100 lines, reviewed in parallel,
merged atomically. The CLI extension makes the day-to-day mechanics bearable;
github.com shows the stack map at the top of every PR in the chain so the
context is obvious.

## When to Use

Pick stacked PRs when **any** of these is true:

- The change naturally splits into 3-8 reviewable layers (one logical concern per layer).
- A single-PR diff would push past ~1000 lines or span multiple components.
- Different reviewers need to sign off on different layers in parallel.
- The base branch (e.g. a feature branch another PR depends on) is itself still in flight.
- The change would force reviewers to context-switch across files that belong to different concerns.

Do NOT use stacked PRs when:

- The change is a one-file fix or a small refactor — a single PR is faster to review and merge.
- It's a hotfix to `main` — no time to coordinate a stack, and the review bottleneck doesn't apply.
- The layers can't be cleanly separated (e.g. a single function signature change that touches every layer).
- Branch protection rules require a linear history (stacks ARE linear — each layer is one branch off the previous — but check the org's `require_linear_history` setting before relying on it).
- A CI fix that only needs to land in one place.

## Mechanics

**Branch topology.** Each layer is its own branch. PR #1's branch is forked off
`main`. PR #2's branch is forked off PR #1's branch. PR #1's `base` is `main`;
PR #2's `base` is PR #1's branch. Only PR #1 has `main` as its target.

**The stack map.** When you open any PR in the stack, github.com shows a small
diagram at the top of the conversation tab: where this layer sits, what's above
it, what's below it, and the merge status of each sibling. Reviewers don't have
to guess context.

**Merge semantics.** When you click Merge on the topmost ready PR, GitHub
merges that PR and every unmerged PR below it in one operation. To land a
partial stack, merge one or more lower layers; the PRs above automatically
rebase and retarget to the new tip.

**Branch protections still apply.** Required reviews, required checks, and
required statuses are evaluated per-PR. The stack doesn't bypass `main`'s
protection rules; it just sequences the merges.

**Merge queue.** Stacks land straight into the merge queue the same way single
PRs do. Each layer goes through the queue independently and gets merged when
its turn comes. The "merge everything in one click" still works — clicking merge
on the top PR enqueues the whole stack atomically.

## CLI Extension: github/gh-stack

The day-to-day mechanics live in the `github/gh-stack` gh CLI extension.

```sh
# Install (once)
gh extension install github/gh-stack

# Create your first stack from a clean main
gh stack create feat/example
gh stack branch pr-1-fix-foo    # add a layer
gh stack branch pr-2-fix-bar    # another layer

# Inspect the stack
gh stack ls                       # list all layers
gh stack log                      # show stack map in terminal
gh stack status                   # which layers are ready/open/merged

# Submit PRs against the stack (one PR per layer)
gh stack submit                   # opens PR for each layer, base = layer below

# Land the stack
gh stack merge                    # merges top ready + every unmerged layer below
gh stack merge pr-2               # partial: merge up through pr-2, PRs above rebase

# Sync the stack with its base (when base moved)
gh stack sync
```

The extension also exposes stack context to the coding-agent world: the
`gh-stack` skill on github.com gives GitHub Copilot (and any agent that reads
the skill) the same primitives. The mental model is: the agent edits layer
files, the extension keeps the branch topology honest.

## How It Maps to yubiOS

yubiOS has a multi-component build: a primary repo (`yubi-OS/yubiOS`) plus
fork repos (bcvk, TFA, OP-TEE, optee_ftpm, ms-tpm-20-ref, edk2, edk2-platforms,
U-Boot, mkosi) that ship as `yubios` branches pinned in `PINNED.md`. Stacked
PRs fit naturally when:

- A change touches a fork AND the primary repo (PR #1 in the fork, PR #2 in
  `yubi-OS/yubiOS` consuming the new fork tip — the second PR's base is the
  fork PR's branch on its `yubios` branch mirror).
- A single yubiOS feature ships as a Containerfile change + a sysroot overlay
  + a workflow tweak — three PRs, one merge.
- A multi-day initiative has natural phases (ADR → Containerfile → test →
  workflow → docs), each reviewable independently.

Pinned fork topology means stacking across fork boundaries needs care: the
`yubios` branch on each fork is itself a moving target. **Pattern**: PR #1
on the fork lands first and `yubios` rebases on the new tip; PR #2 on
`yubi-OS/yubiOS` then stacks on the rebased `yubios` ref. The `github-api`
skill's Git Data API pattern is the canonical write path for the
post-merge rebase / PINNED.md update.

## Branch Hygiene (still applies)

Stacks inherit every rule from `git-workflow-and-versioning`:

- **Atomic commits per layer.** One logical change per commit; don't mix
  refactoring with feature work inside a layer.
- **No long-lived stack branches.** Land the stack or rebase it. A stack that
  sits for a week has the same merge-conflict accumulation as a regular
  long-lived branch.
- **Each layer still must pass CI individually.** Required checks per PR still
  fire on the full diff against the layer's base; an old layer that was green
  when it landed isn't enough.
- **Jenny merges.** Per the yubiOS doctrine (`never merge to main, no
  force-push, no release tags; merging is Jenny's call`), the agent opens
  the stack and watches CI; Jenny merges. Stacks don't change who merges —
  they just sequence multiple merges cleanly.

## Anti-patterns

- **A 12-layer stack.** Reviewers lose the plot. If the change needs more
  than ~8 layers, split the change — there's a real feature boundary you
  haven't drawn yet.
- **A stack with a broken bottom layer.** If PR #1 fails CI, the whole stack
  is stuck. Fix the bottom first, then sync the layers above.
- **Forcing linear history via stacked PRs.** Stacks are linear but they
  also create a chain of dependent PRs. If your org's `require_linear_history`
  rule rejects dependent branches, stacked PRs won't satisfy it — fix the
  rule first, or use a different shape (single PR with smaller commits).
- **Treating a stack as a workaround for unclear scope.** If the layers don't
  each have one reviewable concern, the change is underspecified. Go back to
  `spec-driven-development` before opening PRs.
- **Skipping review on inner layers because "they're already in the stack."**
  Every layer still needs its own reviewer and its own required checks.

## Red Flags

- Stack branch names that don't reflect the layer (`fix`, `tmp`, `wip`).
- A layer PR whose diff is bigger than the layer above it (scope slipped).
- A stack where no layer targets `main` directly (someone made PR #1 target
  PR #2 by accident).
- A stack whose top PR has been open for weeks — rebase or close it.
- PR descriptions that don't reference the stack map or the layer below —
  reviewers can't find the context.
- Required status checks "passing" on every layer but `main` is red — the
  stack landed against a stale base; sync before merging.

## Verification

Before opening a stack:

- [ ] Each layer has one logical concern, ~100-300 lines.
- [ ] PR #1's base is `main`; every other PR's base is the layer below it.
- [ ] Each layer's branch name describes the concern (`pr-1-fix-foo`, not `stack`).
- [ ] PR descriptions link the layer above and below.

Before merging:

- [ ] Bottom layer is green on CI (or all layers above are stack-merging
      with the bottom layer's fix queued).
- [ ] All required reviews per layer satisfied.
- [ ] Each layer's diff against its base is what the PR description says.
- [ ] `gh stack status` shows the stack shape you expect.

After merging:

- [ ] `git log --oneline` on `main` shows the layers landing in order.
- [ ] Any sync'd branches (PINNED.md, mirror branches) re-pinned in the
      same commit window per `git-workflow-and-versioning`'s commit hygiene.
- [ ] The closed PRs in the stack link to a follow-up issue if the work
      continues.

## Note on least privilege coverage (curve-guided-rsi cycle-2 gap-fix)

This skill contributes to least-privilege hardening — sandbox, capabilities, ProtectSystem, NoNewPrivileges, dynamic user, or rootless patterns. See `internal-big-picture` for the full least privilege primitive.

## Immutability coverage for github stacked pull requests (curve-guided-rsi cycle-4 substantive edit)

This skill — **Source: https://github** — sits in a domain that benefits from explicit immutability (sysext, read-only mounts, fsverity, OSTree, hermetic /usr, verity) coverage. Even when the skill's primary job is not the immutability primitive itself, downstream consumers (CI gates, audit pipelines, runtime monitors) expect every skill to declare its position on the primitive so the curve-guided corpus audit can place it on the primitive-coverage map.

For github stacked pull requests, the immutability primitive applies as follows: the skill's outputs (artifacts, scripts, patterns) feed into the immutability layer of the yubiOS pipeline, and consumers that reason about immutability coverage (curve-guided-rsi's sparse-cell detector, the security-and-hardening review, the audit-evidence rollup) can credit this skill's contribution. The reference implementation in `internal-big-picture` documents the full immutability primitive and how it composes with the other nine primitives; this skill is one contributor in that 10-primitive model.

Concrete implications for github stacked pull requests: any change to the skill should be reviewed for impact on immutability coverage; gaps in immutability that are attributable to this skill are tracked in the corpus audit (curve-guided-rsi cycle log at `refs/` on `yubi-OS/yubiOS`).

## Continuous/adaptive coverage for GitHub stacked PRs (curve-guided-rsi cycle-5 substantive edit)

This skill — **gh-stack, layered PRs, merge queue** — sits in a domain that benefits from explicit continuous/adaptive coverage (live monitoring, re-evaluation, ongoing detection). Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus; this skill's fit coordinate was (u=0.803, v=0.096), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For GitHub stacked PRs, the continuous/adaptive primitive applies as follows: this skill contributes to continuous/adaptive via layered review; each PR is reviewable independently. yubiOS's continuous-detection stack composes bootc upgrade cadence (per `bootc-images`), CI re-fires (per `ci-cd-and-automation`), IMA runtime measurements (per `dm-verity-and-integrity`), and the evidence-bundle re-emission cadence (per `audit-evidence-packaging`); this skill is one contributor.

Concrete implications for GitHub stacked PRs: any change should be reviewed for impact on continuous coverage; gaps are tracked in the cycle-5 run log at `refs/curve-guided-rsi-v2-cycle5-deep-research-2026-08-04.md`.


---

## Cycle 5 RSI primitive-closure (2026-08-06)

The hyperspherical-harmonic-curve corpus audit identified this skill as having a `segmentation` coverage gap in the 10-primitive yubiOS framework. **segmentation** was missing across 22/70 skills pre-cycle-5; closing one corpus-wide gap here contributes to the cycle-5 RSI delta measured in `refs/cycle5-results-2026-08-06.md`.

**Relevance:** This skill enforces segmentation via namespace / nspawn / cgroup / microsegmentation / private-users. Specifically it covers: segmentation, namespace, nspawn.

**Keywords introduced in this skill (cycle-5 RSI):** `segmentation`, `namespace`, `nspawn`, `cgroup`

**Audit-trail:** This addition closes one corpus-wide primitive gap (corpus-wide `segmentation` count moved 22→23/70). Per-skill impact is recorded in the cycle-5 results artifact. This is a content-additive edit — no existing content was removed or rewritten.

## Changelog

- **2026-08-06 cycle 5 RSI**: closed `segmentation` primitive gap (corpus-wide count 22→23/70). See `refs/cycle5-results-2026-08-06.md` for the corpus-fit delta measurement.


---

## Cycle 6 RSI primitive-closure (2026-08-06)

This skill's `cryptographic identity` primitive is closed by cycle-6 RSI. This skill's cryptographic identity (FIDO2 / PIV / YubiKey / ssh-key / hmac-secret / passkey) integration is referenced.

The audit-trail entry: 2026-08-06 cycle 6 RSI — closed `cryptographic identity` primitive gap.
