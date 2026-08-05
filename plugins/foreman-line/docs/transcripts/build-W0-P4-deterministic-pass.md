PS C:\Repos\foreman-line-w0-p4> git log --oneline -2                      # branch hygiene: spec + Step-0 amendments committed BEFORE code (defects_lessons #8/#9 applied)
28a0233 docs(specs): W0-P4 Step 0 amendments (coordinator-ratified)
d3ed1bb docs(specs): W0-P4 receipt chain spec (Stage A shaped, coordinator-linted) + dispatch kickstarters
PS C:\Repos\foreman-line-w0-p4> git status --short                        # blast radius: implementation only, isolated worktree
?? plugins/foreman-line/receipts/
PS C:\Repos\foreman-line-w0-p4> # Coordinator closure check (lesson #7) ran BEFORE this pass, against the completion claim:
PS C:\Repos\foreman-line-w0-p4> #   - zero runtime import from skills/parcel-compiler/tool/ in src/ (grep: doc-comment + README citations only)
PS C:\Repos\foreman-line-w0-p4> #   - JCS test helper confined to tests/support/canonical.ts; not exported from src/index.ts, not imported by any src/ module
PS C:\Repos\foreman-line-w0-p4> #   - signature: null in every fixture (31/31 grep hits, all null)
PS C:\Repos\foreman-line-w0-p4> #   - contracts import is relative-path only ('../../contracts/src/index.js'); no bare @foreman-line/contracts specifier in code
PS C:\Repos\foreman-line-w0-p4> #   - ReceiptRef/HarnessClaimResult/AdversarialFinding appear in src/ only as doc-comment references; no field added, no type redefined
PS C:\Repos\foreman-line-w0-p4> #   - contracts/ untouched (git status: only receipts/ untracked; contracts' gitignored node_modules installed for tsc resolution only)
PS C:\Repos\foreman-line-w0-p4> cd plugins\foreman-line\receipts
PS ...\receipts> node -v                                                  # first command, per defects_lessons #10
v24.11.1
PS ...\receipts> npx tsc --noEmit                                         # exit 0
PS ...\receipts> npx tsx --test tests/*.test.ts
i tests 47
i pass 47
i fail 0
i cancelled 0
i skipped 0
i todo 0
PS ...\receipts> npx biome check .
Checked 18 files in 30ms. No fixes applied.
PS ...\receipts> # Runtime dependency allowlist: package.json dependencies = exactly {ajv 8.20.0}
PS ...\receipts> # Lockfile cross-check: packages[''].dependencies = {ajv}, packages['node_modules/ajv'].version = 8.20.0 — agree
PS ...\receipts> npx tsx src/cli.ts validate tests/fixtures/hash-vector-genesis.json          # exit 0
PS ...\receipts> npx tsx src/cli.ts validate tests/fixtures/chain-sealed                      # exit 0 (directory-as-chain)
PS ...\receipts> npx tsx src/cli.ts validate tests/fixtures/reject-unknown-field.json         # exit 1:
(root) must NOT have additional properties
PS ...\receipts> npx tsx src/cli.ts validate tests/fixtures/chain-reject-prevhash-mismatch    # exit 1:
receipts[1].prevHash ("dddd...dddd") does not match receipts[0].hash ("aaaa...aaaa")
PS ...\receipts> npx tsx src/cli.ts validate tests/fixtures/does-not-exist.json               # exit 2:
error: cannot read 'tests/fixtures/does-not-exist.json': ENOENT
PS ...\receipts> npx tsx src/cli.ts validate tests/fixtures/chain-empty                       # exit 2:
error: 'tests/fixtures/chain-empty' contains no receipt JSON files
PS ...\receipts> npx tsx src/cli.ts validate                                                  # exit 2:
usage: receipts validate <path>
PS ...\receipts> npx tsx src/cli.ts frobnicate x                                              # exit 2:
usage: receipts validate <path>
PS ...\receipts> npx tsx src/cli.ts validate tests/fixtures/malformed.json                    # exit 2 (unreadable/malformed JSON is a usage error, per spec)
PS ...\receipts> # Coordinator note: an earlier smoke read of the exit-2 cases showed $LASTEXITCODE=0 — artifact of
PS ...\receipts> # PowerShell pipeline early-termination (Select-Object -First N kills the pipe before process exit);
PS ...\receipts> # re-run without truncation gave 2/2/2/2/2. Environment quirk, not a code defect. Logged for lesson candidacy.
# Deterministic pass GREEN. 47/47 (AC12 threshold >= 20), deps allowlist exact against package.json AND lockfile,
# CLI 0/1/2 contract verified at the real process boundary. Ready for adversarial review.

# ============================================================================
# REWORK PASS (dual adversarial review findings, attempt 1 — accepted)
# Coordinator closure check against disk BEFORE re-running checks:
#   B1: validator.ts checkSharedCorrelation rebuilt on a participant list (isRecord doc + isRecord correlation,
#       baseline = first participant); checkSequenceContiguity filters to numeric-sequence participants, range
#       0..M-1 per Flag-1 ruling; checkPrevHashPointers skips comparisons touching a non-object side, no
#       bridging per Flag-2 ruling. Fixtures chain-reject-scalar-member/ + chain-reject-null-correlation/ on disk.
#   S2: validateChain([]) -> { valid:false, ['chain contains no receipts'] } (validator.ts:170-173)
#   S1+N1: paths.ts guards — UUID_PATTERN verified ANCHORED (^...$, contracts/src/correlation.ts:8-9),
#       Number.isInteger + 0..999999, STAGE_IDS membership, slug ^[a-z0-9-]+$ reject-not-strip, RangeError
#       naming the argument. Runtime imports still the ratified relative contracts specifier.
#   N3-A: reject-correlation-unknown-field.json on disk
#   Item 5: README trimmed under the ruled cap (<=110 target / 120 ceiling; ruled at Step 0 Flag 4)
# ============================================================================
PS ...\receipts> node -v
v24.11.1
PS ...\receipts> npx tsc --noEmit                                         # exit 0
PS ...\receipts> npx tsx --test tests/*.test.ts                           # 47 -> 62, +15 (tripwire: strict increase; floor was 55)
i tests 62
i pass 62
i fail 0
PS ...\receipts> npx biome check .
Checked 18 files in 32ms. No fixes applied.
PS ...\receipts> npx tsx src/cli.ts validate tests/fixtures/chain-reject-scalar-member       # exit 1, violation not stack trace:
receipts[2]: (root) must be object
PS ...\receipts> npx tsx src/cli.ts validate tests/fixtures/chain-reject-null-correlation    # exit 1:
receipts[1]: /correlation must be object
PS ...\receipts> # Coordinator's ORIGINAL B1 repro dir (scratchpad, scalar notes.json in a valid chain), re-run:
PS ...\receipts> # exit 1, stderr contains NO 'TypeError' — the blocker's own reproduction case is the closure proof.
PS ...\receipts> npx tsx src/cli.ts validate tests/fixtures/chain-sealed                     # still exit 0 (no regression)
# Rework pass GREEN. All triaged fix-items closed and verified at the process boundary. Parcel verification-complete.
