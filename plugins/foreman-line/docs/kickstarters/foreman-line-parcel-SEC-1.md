Builder directive — SEC-1 (mini-parcel): Dependabot alert #6, yaml dependency bump in routing-policy.

You work on branch feat/foreman-line-sec-1 in worktree C:\Repos\foreman-line-sec-1 — never the main working tree (defects_lessons #9). All verification in PowerShell, node -v first (defects_lessons #10; Git Bash nvm shadows system Node on this machine). Never read an exit code through a truncated pipeline — capture output fully, then check $LASTEXITCODE (defects_lessons #11).

Scope: plugins/foreman-line/routing-policy/ contains yaml@2.6.1, vulnerable to GHSA-48c2-rrv3-qjmp (stack overflow via deeply nested YAML collections, moderate, patched in 2.8.3). This is parcel-relevant: the validator parses YAML at a trust boundary. Verify the alert facts yourself first: gh api repos/KaseyaOne/kaseya-one-productivity-tools/dependabot/alerts/6.

Step 0 — before changing anything: restate the task in your own words, enumerate the exact files you will touch, confirm what is OUT of scope (below), state the current routing-policy test count from a live run, and flag any ambiguity. Then STOP and wait for coordinator confirmation.

The work, exactly:
1. In plugins/foreman-line/routing-policy/package.json: bump yaml to ^2.8.3.
2. Regenerate the package lockfile (npm install in that package dir, PowerShell).
3. Check the dependency-allowlist test and the shipped code for any assumption the bump breaks: the allowlist test asserts dependencies keys equal exactly {ajv, yaml} (keys, not versions — confirm and leave as-is if so); confirm yaml@2.8.x still has zero transitive dependencies (lockfile-verified, a property the original deterministic pass recorded); confirm no API drift affects the validator's yaml usage (parse call sites).
4. Deterministic pass: node -v; npx tsc --noEmit; npx tsx --test tests/*.test.ts (expect 40/40 — no test-count change is EXPECTED for a dependency patch, state it explicitly); npx biome check .; CLI smoke at the process boundary: validate routing-policy.yaml (exit 0), validate tests/fixtures/reject-multiple.yaml (exit 1, both violations on stderr), validate no-such-file.yaml (exit 2). Confirm installed yaml version >= 2.8.3 from the lockfile.

Out of scope: every other package (contracts, receipts, pcc); the root lockfile and its postcss alert (#4); any routing-policy source change beyond what the bump strictly forces (none expected — if the bump forces a source change, STOP and report before making it); any schema or invariant change.

Completion claim: map items 1-4 to evidence, state the test count (40 expected, unchanged — say so), state the installed yaml version from the lockfile. You do not commit and you do not decide the work is done — the coordinator does.
