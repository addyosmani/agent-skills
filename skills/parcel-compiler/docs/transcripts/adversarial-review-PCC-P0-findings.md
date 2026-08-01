# Adversarial Review — PCC-P0 (pcc CLI scaffold) — Findings Report

Reviewer: frontier instance, distinct from coordinator (D4). Directive: docs/kickstarters/adversarial-review-PCC-P0.md
Verdict: **No blocking findings.** 3 should-fix, 4 nits. Report preserved verbatim below; coordinator triage recorded at the end.

---

Verdict: No blocking findings. The exit-code contract is internally consistent and the "only 0 and 2 reachable" claim holds on every path; the zero-dependency claim holds against both package.json and the lockfile; no W0-P4 receipt/claim/manifest shape is pre-empted anywhere. The findings below are should-fix and nit only. I did not manufacture findings — the four mandated focuses came back largely clean, and I say so explicitly.

## Mandated focus results

(a) Exit-code contract consistency — PASS. The EXIT enum (cli.ts:21-27), the header doc (cli.ts:4-11), buildUsage (cli.ts:126-133), and the README table (README.md:21-29) all agree on 0/1/2/3/4. I traced every branch of run(): bare/--help→0, --version→0, cmd===null→2, command --help→0, stub→2. run() returns only 0 or 2, cannot throw on any string input, and the entry point (cli.ts:194-196) only ever assigns that return to process.exitCode. The "only 0 and 2 reachable" claim is true on every reachable path.

(b) Zero-dependency claim — PASS. package.json has no dependencies key (package.json:13-18). In package-lock.json every installed package — biome + its cli-* optionals, esbuild + its @esbuild/* optionals, tsx, typescript + its platform optionals, @types/node, undici-types, fsevents — carries "dev": true. The root package block (package-lock.json:7-22) has only devDependencies. At actual runtime the only imports are node: builtins (path, url, crypto, child_process). Nothing third-party can execute at runtime.

(c) W0-P4 pre-emption hunt — PASS. No receipt type, claim manifest, chain shape, or schema exists. canonical.ts exports only generic JsonValue/canonicalize; hash.ts operates on opaque bytes; the COMMANDS table's mentions of "claim manifest"/"receipt chain" are prose summaries frozen by the spec's command table, not types. ReceiptRef is never imported or referenced. Test fixtures ({a:1}, {b:1,a:2}, {stable:true}, …) are structurally generic. The src/receipts/ directory name is suggestive but carries no receipt shape. Nothing pre-empts W0-P1's hash+locator opacity.

(d) Tests asserting less than their name — see SF-1, SF-3, N-1 below.

## Should-fix

SF-1 — AC5/AC6 verified by sampling, not by construction or enumeration. cli.test.ts:109-147 (spec AC5 line 57, AC6 line 58; focus (d))
The NOT_IMPLEMENTED stubs (AC5) block asserts exit-2 for 3 of 9 commands (compile, claim init, receipt verify); --help for known commands (AC6) covers 2 of 9. AC5/AC6 say EVERY command.
On the coordinator's question — do the router tests close the gap by construction? My finding: the runtime behavior is closed by construction (the stub path at cli.ts:184-186 and the help path at cli.ts:179-182 have zero per-command branching; every COMMANDS entry resolves via exact table lookup — I traced all 9 by hand and each exits 2). So this is not a functional defect and therefore not blocking. But the tests do not close it: AC8's "all two-token commands" is genuinely covered (all 3 two-token keys tested at cli.test.ts:32-48), yet 5 of 6 one-token commands (answer, validate, directive, verify, status) are never proven to resolve. A future edit adding a malformed key would pass the suite while breaking AC5. The natural closure is a single loop over COMMANDS asserting each resolves and each (with a dummy arg) returns 2 + NOT_IMPLEMENTED, and each --help returns 0 + its usage line. This is exactly focus (d): the block names an AC that says "every" while asserting a sample.

SF-2 — canonicalize silently coerces non-finite numbers to null, violating RFC 8785. canonical.ts:14-21 (spec Constraints line 44 "RFC 8785 (JCS)"; AC9)
Verified empirically: NaN, Infinity, -Infinity all serialize to "null" via JSON.stringify. RFC 8785 §3.2.2.3 admits only finite numbers; a conformant serializer must reject non-finite input, not silently emit a valid-looking null. JsonValue's number arm (canonical.ts:7) admits these values, and this is a trust-path primitive whose output feeds sha256Hex — a silent NaN→"null" collision is precisely the kind of canonicalization footgun that must not exist in the trust path. No caller exists yet (scaffold), so it is latent, hence should-fix not blocking. Fix: throw on !Number.isFinite(value) in the number branch. (Every other RFC 8785 edge the coordinator flagged — exponent forms, subnormals, -0→"0", control-char short escapes, raw non-BMP, well-formed lone-surrogate escaping, UTF-16 code-unit key ordering via < — is correct.)

SF-3 — hash.ts determinism test is tautological. hash.test.ts:28-31 (focus (d))
assert.equal(sha256Hex(bytes), sha256Hex(bytes)) passes the same Uint8Array reference twice. This asserts only that a pure function returns the same value for the same input — true of any function — and proves nothing about digest determinism across independently-produced canonical bytes. The name "determinism" claims more than the body verifies. Compare the canonical determinism test (canonical.test.ts:72-77), which at least calls canonicalize twice. Fix: hash two independently-canonicalized equal values.

## Nits

N-1 — Test name/input mismatch: "claim alone" never exercises ['claim']. cli.test.ts:158-160 (focus (d))
Named claim alone exits 2, the body passes ['claim', '--help']. The true bare-['claim'] path (prefix that is not a command) is never tested. Both inputs happen to exit 2, so no bug is masked — but the actual "claim alone" behavior is unverified.

N-2 — bin points at a non-executable ./src/cli.ts. package.json:7; cli.ts:1 (Out of Scope line 74: publishing/packaging)
node cannot execute a .ts bin, and cli.ts has no shebang. npm i -g / npm link would install a broken pcc. On the coordinator's question: packaging is explicitly out of scope, so this is acceptable scaffold debt, not a defect — but a knowingly-broken bin is a live trap. Recommend either removing the bin entry until a build/loader step exists, or a one-line README note that the entry is non-functional pre-packaging.

N-3 — Loop variable shadows outer pkg. deps.test.ts:26-28
for (const pkg of [...]) shadows the module-level pkg (parsed package.json). Functionally fine (dev is captured first), but a readability smell; rename to name.

N-4 — No test asserts the lockfile, only package.json. deps.test.ts (focus (b))
AC3 mandates only the package.json assertion, which is met. Focus (b)'s lockfile leg I verified manually (clean). Optional hardening: assert no lockfile package lacks "dev": true, so the zero-runtime-dep invariant is machine-enforced against future lockfile drift.

I did not modify, fix, or commit anything. This is a report only.

---

## Coordinator triage (post-review)

| Finding | Disposition | Route |
|---|---|---|
| SF-1 | Fix — enumerate all 9 commands via loop over COMMANDS | Rework pass, original builder |
| SF-2 | Fix — throw on non-finite in number branch + rejection tests | Rework pass, original builder |
| SF-3 | Fix — hash two independently-canonicalized equal values | Rework pass, original builder |
| N-1 | Fix — test bare ['claim'] (trivial, bundled) | Rework pass, original builder |
| N-2 | Accept as scaffold debt with README note (bin stays; one line documenting it is non-functional pre-packaging) | Rework pass, original builder |
| N-3 | Fix — rename shadowed loop variable (trivial, bundled) | Rework pass, original builder |
| N-4 | Fix — lockfile dev:true assertion ("enforced by tooling, not memory") | Rework pass, original builder |

Rework directive: docs/kickstarters/foreman-line-parcel-PCC-P0-rework.md. Re-verification: coordinator re-runs the deterministic pass plus a mechanical closure check per finding; full adversarial re-review not required (no blocking findings; all closures are deterministic).

## Closure record

- **Attempt 1: REJECTED — empty completion claim.** Builder reported "all clean, 55/55, all 13 ACs satisfied" with zero diffs on disk; all 7 items unimplemented. Caught by coordinator per-finding closure check, not by re-running checks (which pass trivially on an untouched tree). Tells: test count unchanged when 4 items add tests; evidence map covered ACs instead of directive items. Lesson recorded as defects_lessons.md #7; rework directive hardened with a Step 0 restate-and-stop gate (#8).
- **Attempt 2: ACCEPTED — all 7 findings closed, verified against disk.** SF-2: RangeError on non-finite in canonical.ts + 3 rejection tests. SF-1: AC5/AC6 closed by enumeration — 3 generated tests × 9 COMMANDS. SF-3: determinism via two independent canonicalize calls. N-1: bare ['claim'] tested, mislabeled neighbor renamed. N-3: shadow renamed. N-4: lockfile dev-only invariant machine-enforced. N-2: README "Packaging status" documents the non-functional bin. Deterministic pass green: tsc 0, biome 0 diagnostics, 78/78 tests (55 → 78, matching builder's Step 0 estimate exactly). Transcript: docs/transcripts/build-PCC-P0-deterministic-pass.md (rework section).
