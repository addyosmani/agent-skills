# WGT-P0BOOT builder transcript

Date: 2026-07-31
Branch: `codex/foreman-line-bootstrap`
Final clean base: `origin/main` at `260d1eb5afa554ac23ff440a7dd6f92510381113`

## Prerequisite receipts

- WGT-P0BOOT-R1 passed independent review and merged as agent-skills PR #2 at
  `d74f1b0ba134b541e94dad33f5a2510c3c59a78a`. It supplied the repository-root
  ignore contract required by the permission-profile tests.
- WGT-P0BOOT-R2 passed independent review and merged as agent-skills PR #3 at
  `260d1eb5afa554ac23ff440a7dd6f92510381113`. It supplied the tracked
  `skills/parcel-compiler` live-corpus dependency required by the spec-linter
  tests.

## Import and provenance

- Imported 649 frozen files from
  `D:/Repos/agent-skills/plugins/foreman-line` byte-for-byte.
- Frozen byte total: 4,229,356.
- Missing imported files: 0.
- Source/destination hash mismatches: 0.
- Ordinal LF repo-relative path-list SHA-256:
  `df4b8b955cd18b5ddbe100bf676332a9e4d81a2ef03a25330dce0d35102fbe2b`.
- Canonical 649-line content manifest SHA-256:
  `48120451fda4d1cf6e6d6e5fd11e6ce5a4b1a0605a249b6d7a8dd1d65889e3c4`.
- Declared generators completed successfully and left all 649 imported files
  byte-identical to the frozen source.

## Toolchain and package matrix

- Node: `v24.14.0` from the bundled Codex runtime.
- npm: `11.13.0`.
- `npm ci`: PASS in all 14 package workspaces before script execution.
- Declared `generate`: PASS in all six exposing workspaces (`contracts`,
  `permission-profiles`, `receipts`, `routing-policy`, `skill-injection`, and
  `spec-linter`).
- Fresh pre-commit `typecheck`, `test`, and `lint`: PASS in all 14 workspaces:
  `approval`, `contracts`, `dispatch`, `integration`, `permission-profiles`,
  `projection`, `receipts`, `registration`, `routing-policy`,
  `schema-scaffold`, `shaping`, `skill-injection`, `spec-linter`, and
  `verification`.
- Independent review B established that this pre-commit matrix was blind to
  staged imported files in two merge-base safeguards. At exact committed head
  `23fa60bdf0314ff21ab33e60af14ddac3f49ee6a`, exactly these tests necessarily
  reject the first tracked import:
  - Approval: `AC2: no modification to receipts/ since the branch fork point`
    reports the 63 byte-frozen imported `receipts/` paths only.
  - Projection:
    `AC3: no file under shaping/ is modified by this parcel since the branch fork point`
    reports the 23 byte-frozen imported `shaping/` paths only.
  This is a bootstrap test-context condition, not a product/source defect.
  The amended contract permits only those exact pre-merge failures and
  requires the entire unqualified 14-workspace matrix, including both tests,
  to pass from a fresh post-merge `origin/main` checkout before WGT-P0A unlocks.
- The active WGT-P0BOOT spec passed the shipped spec-linter CLI.

## Content, hygiene, and scope checks

- JSON inventory: 149 files. All 148 ordinary JSON files parsed. The one exact
  intentional fixture
  `receipts/tests/fixtures/malformed.json` failed generic parsing as required,
  and the receipts package test suite passed its rejection behavior.
- Required plugin surfaces present: both plugin manifests, README, AGENTS.md,
  SPEC-CONVENTION, COORDINATOR-PATTERN, all three bundled skills, and all 14
  package workspaces.
- Allowed Files: 656 entries, 656 unique; no forbidden path appears in the
  allowlist.
- Pre-transcript status contained 652 paths, all beneath
  `plugins/foreman-line/`, with zero forbidden untracked path.
- High-confidence content scan returned zero private-key headers, AWS access
  keys, Stripe live keys, GitHub tokens, Slack tokens, OpenAI project keys, or
  Azure storage account-key signals. Credential/private-key filename scan also
  returned zero paths. The `gitleaks` executable was not installed, so no
  gitleaks claim is made.
- Fourteen verification-local `node_modules` directories remain ignored on
  disk. They are not Allowed Files, do not appear in Git status, and must not
  be staged or committed.

## Frozen whitespace classification

- Git's cached-diff whitespace check reports historical whitespace findings
  in the byte-frozen imported snapshot.
- The final cached check exited nonzero with 351 diagnostic lines across 13
  unique paths; all 13 paths are present in the frozen content manifest and
  zero parcel-created path appears in the findings.
- The bootstrap does not rewrite those imported bytes. Green classification
  requires every reported path to appear in the 649-line frozen content
  manifest and requires zero finding in the parcel-created spec, shaping
  result, source manifest, build transcript, or review records.
- This replaces an impossible blanket clean-diff expectation without waiving
  any newly introduced whitespace defect.

## Builder disposition

Builder source/provenance verification is green. Pre-merge package acceptance
is green only under the amended two-test first-import classification above.
This commit may contain only the 649 frozen
source files and the currently created allowed contract/evidence records.
Independent review A, independent review B, final spec archival, push, merge,
and the post-merge `origin/main` receipt remain coordinator-owned stages.
