# W1-P4 Deterministic Pass — coordinator machine, 2026-07-22

Environment: PowerShell (defects_lessons #10), Windows 11. Worktree `C:\Repos\foreman-line-W1-P4`, branch `feat/foreman-line-W1-P4` at 0c4fe73 (spec + D3 charter amendment d302e43 committed at dispatch).

```
PS> node -v
v24.11.1

PS> npm install in registration + contracts, approval, receipts, projection, shaping, spec-linter, schema-scaffold, permission-profiles
up to date (all nine, no changes)

PS> cd plugins\foreman-line\registration
PS> npx tsc --noEmit
(exit 0)

PS> npx tsx --test tests/*.test.ts
ℹ tests 43
ℹ pass 43
ℹ fail 0
(exit 0)

PS> npx biome check .
Checked 31 files in 78ms. No fixes applied.
(exit 0)
```

Result: TSC_EXIT=0, TEST_EXIT=0 (43/43), BIOME_EXIT=0 — matches the builder completion claim (43 tests, floor 20; L1–L4 live-probe ACs explicitly not claimed, coordinator-owned). Closure check preceded this pass: commit 0c4fe73 on the branch; branch-vs-main frozen-surface diff empty; FOREMAN-LINE-PLAN.md §8 line-227 one-line correction verified (jira-workflow → jira-integration, line 156 untouched); project-allowlist.json pins exactly ["KONE"]. L1 coordinator probe (pre-dispatch): one-shot `docker mcp tools call atlassianUserInfo` returned Clint's authenticated identity in ~1.1s; full 31-tool list discovered, adapter mapping ratified at Step 0 Flag D.

## Rework chain + live probes (2026-07-22)

Dual review verdicts: A = SHIP WITH FOLLOW-UPS, B = REWORK REQUIRED (convergent blocker: push→link-write seam wedged at F7). Rework attempt 1 (6355b07): receipt-before-link reorder + 4 more items, 51/51, Reviewer B verification pass = BLOCKER CLOSED (re-ran own reproduction). Then the coordinator-owned live-probe cycle against real KONE (D3-amended):

- Probe 1: `docker mcp tools call --params` — no such flag → rework 2 (2033290, key=value + cloudId discovery, 59/59).
- Probe 2: stdout preamble broke JSON parse → 9f997bd (extractJsonBody, 63/63).
- Probe 3: key=value transports STRINGS ONLY (`maxResults=1` → "expected number, received string"); `additional_fields` object untransportable one-shot → **ratified Q11 contingency FIRED**: @modelcontextprotocol/sdk client over the persistent single-server gateway; async JiraTransport ripple (a182482, 64/64; builder session crashed mid-build and was crash-recovered per procedure).
- Probe 4: SDK default env strips ProgramData → docker panic → db0374f (full parent env, 66/66).
- Probe 5: editJiraIssue returns non-JSON success → 137d252 (per-tool-tolerant parsing, 71/71).
- Probe 6: addCommentToJiraIssue wants commentBody → cb6b256.
- Probe 7: editJiraIssue wants a fields object → 3e85eb2.

**Final live probe: PROBE_EXIT=0.** L1 gateway+OAuth ✓ (atlassianUserInfo ~1.1s). L2 real creates ✓ (KONE-23163 Epic + KONE-23164 Story, [TEST] prefix + mcp-test label, parent-linked; idempotent UPDATE path confirmed live across runs — zero duplicates). L3 bidirectional links ✓ (commit->ticket permalink bound to pushed SHA 46fe74d; ticket->commit comment written). L4 reconcile ✓ (RUN 2 mode=reconcile, zero creates, idempotent re-link). Receipt chain minted in the probe fixture; RegistrationResult schema-conformant both directions. Cleanup: `project = KONE AND labels = "mcp-test"` (issues KONE-23161..23164 + Clint's KONE-23157).
