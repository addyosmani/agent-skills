# WGT-P0BOOT Independent Review A — Provenance, Scope, and Security

**Date:** 2026-08-01
**Reviewer:** independent review A
**Mode:** local, passive, exact-commit review
**Commit:** `23fa60bdf0314ff21ab33e60af14ddac3f49ee6a`
**Baseline:** `origin/main` at `260d1eb5afa554ac23ff440a7dd6f92510381113`
**Worktree:** `D:/Repos/agent-skills-worktrees/foreman-line-bootstrap-20260731`

## Verdict

**PASS.** No unresolved Blocker, High, or Medium finding was identified in the
review-A scope. The exact commit is a single-parent addition of 653 allowed
regular-file paths: the 649-file frozen Foreman Line snapshot plus four
parcel-created contract/evidence records. Provenance, path containment,
forbidden-path hygiene, JSON classification, whitespace attribution, and the
bounded secret/sensitive-filename checks independently reproduce green.

## Findings summary

| Severity | Count | Disposition |
|---|---:|---|
| Blocker | 0 | None |
| High | 0 | None |
| Medium | 0 | None |

No fix-worthy review-A finding was found.

## Independent evidence

### 1. Commit identity, parent, and tree shape — PASS

- `git rev-parse HEAD` returned
  `23fa60bdf0314ff21ab33e60af14ddac3f49ee6a`.
- `git rev-parse HEAD~1` and `git rev-parse origin/main` both returned
  `260d1eb5afa554ac23ff440a7dd6f92510381113`.
- The pre-review worktree was clean and the branch was exactly
  `codex/foreman-line-bootstrap`, one commit ahead of `origin/main`.
- `git diff-tree --no-commit-id --name-status -r <parent> <commit>` returned
  653 unique paths and the only status code was `A`.
- `git ls-tree -r <commit> -- plugins/foreman-line` returned 653 entries, all
  `100644 blob`; there are zero symlinks and zero gitlinks/submodules.

### 2. Allowed Files and repository-boundary containment — PASS

The Allowed Files block in the active WGT-P0BOOT spec parses to 656 entries,
all unique. The 653 committed pre-review paths are all members of that exact
set. The only three allowed paths not yet present at the reviewed commit are
the coordinator-owned later-stage records:

- `plugins/foreman-line/docs/goals/keon-proof-led-portfolio-priority/wgt-p0boot-review-a-findings.md`
- `plugins/foreman-line/docs/goals/keon-proof-led-portfolio-priority/wgt-p0boot-review-b-findings.md`
- `plugins/foreman-line/docs/specs/done/WGT-P0BOOT-tracked-foreman-bootstrap.md`

All 653 committed paths are beneath `plugins/foreman-line/`. Counts outside
that boundary, at repository root, and in another plugin are all zero.

An expanded case-insensitive path audit returned zero paths containing a
forbidden generated, dependency, cache, environment, memory, VCS, editor, or
machine-local surface, including `node_modules`, `dist`, `coverage`, `build`,
`out`, `generated`, `.remember`, `.memory`, `memory`, `memories`, `.git`,
`.cache`, `.turbo`, `.env`, `.env.*`, `__pycache__`, tool caches, temporary
directories, `.idea`, `.vscode`, logs, swap/backup files, `.DS_Store`,
`Thumbs.db`, and `desktop.ini`.

### 3. Frozen manifest and byte provenance — PASS

The durable source manifest was parsed and recomputed rather than accepted
from the builder transcript:

| Invariant | Independently observed |
|---|---|
| Manifest lines | 649 |
| Unique manifest paths | 649 |
| Malformed manifest lines | 0 |
| Duplicate path groups | 0 |
| Ordinal path order | exact |
| CR bytes in manifest | 0 (LF-only) |
| Frozen byte total | 4,229,356 |
| Missing destination files | 0 |
| Destination hash mismatches | 0 |
| Missing live-source files | 0 |
| Extra eligible live-source files | 0 |
| Live-source hash mismatches | 0 |

The recomputed ordinal LF repo-relative path-list SHA-256 is
`df4b8b955cd18b5ddbe100bf676332a9e4d81a2ef03a25330dce0d35102fbe2b`.
The SHA-256 of the canonical 649-line content manifest is
`48120451fda4d1cf6e6d6e5fd11e6ce5a4b1a0605a249b6d7a8dd1d65889e3c4`.

The live frozen source root
`D:/Repos/agent-skills/plugins/foreman-line` independently produced exactly
649 eligible paths and 4,229,356 bytes after the contract exclusions. Every
source and destination file matched its lowercase SHA-256 manifest entry.

### 4. JSON classification — PASS

The 653-path commit contains 149 `.json` files, including both plugin
manifests. Generic parsing accepted 148 and rejected exactly one:

`plugins/foreman-line/receipts/tests/fixtures/malformed.json`

The exception was a `JSONDecodeError` and is the exact intentional negative
fixture authorized by the active spec. No other JSON file failed parsing.

### 5. Frozen whitespace attribution — PASS

Because the import is already committed, the immutable commit-level
equivalent of the cached check was rerun with
`git show --check --format= --no-renames <commit>`. It exited nonzero with
exactly 351 output lines and 13 unique implicated paths. All 13 are present in
the 649-path frozen content manifest; zero parcel-created spec, shaping,
manifest, transcript, or review path is implicated:

1. `plugins/foreman-line/docs/COORDINATOR-PATTERN.md`
2. `plugins/foreman-line/docs/goals/keon-proof-led-portfolio-priority/website-gtm-closeout-amendment.md`
3. `plugins/foreman-line/docs/goals/keon-proof-led-portfolio-priority/website-gtm-plan-review-findings.md`
4. `plugins/foreman-line/docs/kickstarters/foreman-line-build-SCAF-P4.md`
5. `plugins/foreman-line/docs/kickstarters/foreman-line-build-W4-P2.md`
6. `plugins/foreman-line/docs/kickstarters/restart_after_missed_timer_event.md`
7. `plugins/foreman-line/docs/specs/done/SCAF-P1-shared-schema-scaffold-extraction.md`
8. `plugins/foreman-line/docs/specs/done/W2-P5-skill-injection-engine.md`
9. `plugins/foreman-line/docs/transcripts/build-W0-P1-deterministic-pass.md`
10. `plugins/foreman-line/docs/transcripts/build-W0-P1-model-routing.md`
11. `plugins/foreman-line/skills/parcel-driven-development/templates/CONTRACT_AMENDMENT.md`
12. `plugins/foreman-line/skills/parcel-driven-development/templates/PARCEL.md`
13. `plugins/foreman-line/skills/parcel-driven-development/templates/PARCEL_INDEX.md`

This is historical byte-frozen content, not a newly introduced whitespace
defect. Rewriting it in WGT-P0BOOT would violate the provenance contract.

### 6. Bounded secret and sensitive-filename scan — PASS

The scan was bounded to the exact 653 committed paths and emitted category
counts and filenames only, never matched values. It returned zero matches for
private-key headers, AWS access keys, Stripe live keys, GitHub tokens, Slack
tokens, OpenAI project keys, and Azure storage account-key signals.

The sensitive-filename pass also returned zero matches across private-key and
credential names, `.env` variants, service-account/secret files, shell/package
credential files, and `.pem`, `.key`, `.p12`, `.pfx`, `.jks`, `.keystore`,
`.crt`, `.cer`, `.kdbx`, and `.ovpn` extensions.

## Coverage and limitations

This review covers the active WGT-P0BOOT review-A contract: exact-commit
inventory, source/destination byte provenance, Allowed Files, repository and
plugin boundary containment, forbidden and machine-local paths, JSON
classification, frozen whitespace attribution, and bounded high-confidence
secret/sensitive-filename signals. It does not claim a full historical secret
audit, entropy scan, dependency vulnerability assessment, package behavior
review, or review-B test/package-integrity coverage. No secret value was
printed or routed through captured output.

## Closeout

Review A authorizes **PASS** for commit
`23fa60bdf0314ff21ab33e60af14ddac3f49ee6a`. Review B, spec archival, push,
merge, and the post-merge `origin/main` receipt remain outside this reviewer's
authority.

## Follow-up review — amended bootstrap contract

**Reviewed head:** `5e6fab6d6f74ff0d624dae9924a0c02f447784da`

**Follow-up verdict: PASS**, subject to the coordinator committing the two
review-record whitespace cleanups before merge and rerunning the commit-level
whitespace check on the resulting head. No Blocker, High, or Medium finding
remains in review A's provenance, scope, or security lane.

### Source and scope continuity

- The reviewed head's parent is the previously reviewed
  `23fa60bdf0314ff21ab33e60af14ddac3f49ee6a`; `origin/main` remains
  `260d1eb5afa554ac23ff440a7dd6f92510381113`.
- The follow-up commit changes exactly four authorized paths: it adds review A
  and review B, and modifies only the active WGT-P0BOOT spec and builder
  transcript. Its intersection with the 649 frozen-source paths is zero.
- Relative to `origin/main`, the reviewed head contains 655 unique added paths,
  all beneath `plugins/foreman-line/` and all within the 656-entry unique
  Allowed Files set. The sole absent allowed path is the future archived
  `docs/specs/done/WGT-P0BOOT-tracked-foreman-bootstrap.md`.
- The durable manifest remains 649 unique ordinal paths. Destination and live
  source each remain 4,229,356 bytes with zero missing or SHA-256-mismatched
  file. The content-manifest hash remains `48120451fda4d1cf6e6d6e5fd11e6ce5a4b1a0605a249b6d7a8dd1d65889e3c4`;
  the ordinal LF path-list hash remains
  `df4b8b955cd18b5ddbe100bf676332a9e4d81a2ef03a25330dce0d35102fbe2b`.

### Two-test first-import classification

The exception is mechanically bounded to the two named test calls and their
existing merge-base helper. The exact-head diffs are:

- Approval `AC2: no modification to receipts/ since the branch fork point`:
  exactly 63 `A` paths under `plugins/foreman-line/receipts/`; all 63 are in
  the frozen manifest and zero path is outside that subtree.
- Projection `AC3: no file under shaping/ is modified by this parcel since the branch fork point`:
  exactly 23 `A` paths under `plugins/foreman-line/shaping/`; all 23 are in the
  frozen manifest and zero path is outside that subtree.

Repository-wide search found no other frozen-subtree use of
`diffStatSinceMergeBase`. The other three calls are bounded root
`package.json` guards in Approval, Projection, and Registration; root
`package.json` is unchanged and is not excepted. The amendment permits no
other failing test or command and does not authorize editing either test,
helper, source subtree, package manifest, or lockfile.

### Post-merge safety gate

The amended contract requires a fresh checkout of the updated `origin/main`
and the complete unqualified 14-workspace matrix after merge. Both named tests
must then pass because the bootstrap is part of the merge base. Any remaining
failure keeps WGT-P0A locked and requires rollback or a separately authorized
repair. This preserves the tests' intended protection for later branches: a
future `receipts/` or `shaping/` change after the bootstrap will again appear
relative to the new merge base and fail its guard.

### Review-record whitespace correction

The exact `5e6fab6d...` commit initially introduced nine trailing-whitespace
diagnostics across the two newly added review records, contrary to AC9: five
in review A and four in review B. Review A's five were removed in this
authorized amendment; review B independently removed its four. The corrected
working-tree review-record diffs pass `git diff --check`. The coordinator must
commit only these authorized review-record corrections and confirm the
replacement commit passes `git show --check --format= --no-renames` before
merge.
