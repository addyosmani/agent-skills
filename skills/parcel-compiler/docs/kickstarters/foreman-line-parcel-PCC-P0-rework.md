Rework directive — parcel PCC-P0, adversarial review pass 1. The review found no blocking findings; the following are ordered fixes. The full report is at docs/transcripts/adversarial-review-PCC-P0-findings.md — read it before touching anything. All standing rules from the original kickstarter remain in force: PowerShell for all verification, zero runtime dependencies, no receipt/manifest shapes, contracts/ frozen, no commits to main.

Step 0 — before changing anything: list the 7 items below back to me in your own words, name the exact file each one touches, and state the current test count (55) and your estimate of the post-rework count. Then STOP and wait for my confirmation. A rework claim whose test count does not increase will be rejected without inspection — items 1, 2, 4, and 6 all add tests.

Fix exactly these, nothing else:
1. SF-2 (do this first — trust-path correctness): in canonical.ts's number branch, throw on !Number.isFinite(value) instead of letting JSON.stringify emit "null" for NaN/Infinity/-Infinity (RFC 8785 §3.2.2.3 admits only finite numbers). Add rejection tests for all three non-finite values. Do not change any other serialization behavior — the reviewer verified exponent forms, -0→"0", escaping, and key ordering are correct as-is.
2. SF-1: replace the sampled AC5/AC6 tests with a single loop over the exported COMMANDS table asserting, for every declared command: it resolves via resolveCommand; with a dummy arg it returns 2 with NOT_IMPLEMENTED + scaffold marker on stderr; with --help it returns 0 and prints its usage line. Keep the existing subprocess smoke tests as-is.
3. SF-3: fix the tautological hash determinism test — hash two independently-produced canonical byte sequences of the same value (two separate canonicalize calls), not the same Uint8Array reference twice.
4. N-1: add a test that exercises bare ['claim'] (no --help) and asserts exit 2 as a prefix-that-is-not-a-command.
5. N-3: rename the loop variable in deps.test.ts that shadows the module-level pkg.
6. N-4: add a lockfile test — parse package-lock.json and assert every package entry (other than the root "") has "dev": true, so zero-runtime-deps is machine-enforced against lockfile drift.
7. N-2 (ruling: accepted as scaffold debt, documented): keep the bin entry; add one line to README.md stating the bin entry is non-functional until a packaging parcel ships a build/loader step. README must stay <= 1 page.

Then re-run npx tsc --noEmit, npx tsx --test test/*.test.ts, and npx biome check . in PowerShell. Your completion claim must map each item 1-7 to the evidence that closes it, and restate the new total test count. You do not commit and you do not decide the work is done - I do.
