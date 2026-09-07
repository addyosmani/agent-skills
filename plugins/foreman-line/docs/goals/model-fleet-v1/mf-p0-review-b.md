# MF-P0 Independent Review B — Contract and Evidence

**Reviewer:** `/root/mf_p0_contract_review`  
**Date:** 2026-09-03  
**Independence:** fresh read-only review; no edits, credential inspection, or provider call  
**Verdict:** `REQUEST CHANGES`  
**Disposition judgment:** `NO-GO` is the only contract-valid result; MF-P1 must remain stopped

## Findings

1. **BLOCKER — mandatory command capture is incomplete.** `MF-P0.md` → Acceptance
   Criteria/Evidence Required demands a command, exit code, observation, and disposition for
   every check. `mf-p0-evidence.md` has a parameterized command and narrative summaries, but
   not a contemporaneous exact expanded transcript for checks 1–3, 9, and 10. The decisive
   failures justify stopping, but the package is not acceptance-ready.
2. **HIGH — four temporary roots exceed the parcel's one-root authorization.** The evidence
   records four serial roots after harness contamination and runtime differences, while the
   parcel authorized one uniquely named generated directory. This cannot be repaired
   retroactively by silently widening the contract.
3. **HIGH — Required Check 9 proves only a host primitive, not pinned-runtime control.** The
   process-tree note does not preserve the exact command/exit transcript or connect the
   synthetic tree to the production runtime. It is useful feasibility evidence but not the
   contracted proof.
4. **HIGH — Required Check 10's no-mutation claim exceeds the contemporaneous record.**
   Present-state checks confirm unchanged `HEAD`, absent product paths, absent temp roots,
   and the expected current Git status, but there is no complete before/after identity for
   config, policy, and all working-tree content.
5. **MEDIUM — Required Check 7 was only partially exercised.** A successful junction read is
   decisive for `NO-GO`, but junction write, symlink, and other reparse variants were not run
   and must be reported as such.
6. **MEDIUM — the configuration-precedence reason lacks a version-pinned reproducible
   locator.** It remains a supporting observation; the runtime, junction, and network
   failures independently require `NO-GO`.

## Coverage gaps

- At review time, both review records and the closure-state read-back were not yet persisted.
- The parcel defines two clean reviews for a `GO`, but does not define an equivalent
  acceptance closure for `NO-GO`; a reviewer `PASS` must be read as “the stop is sound,” not
  as boundary approval.
- Inventory does not preserve all exact feature/config discovery command outputs.
- Production checks 4–8 are unsupported/failed because the sandbox cannot start; comparison
  build results are informative and cannot be credited to production.

## Verified current state

The reviewer independently confirmed the recorded repository `HEAD`, absence of all four
temporary roots, absence of all three product paths, and preservation of identified
pre-existing unrelated files. Present-state cleanup is supported, but it cannot replace the
missing contemporaneous baseline.

## Recommendation

MF-P1 must remain stopped. Evidence corrections cannot convert the production startup
failure, junction escape, or outbound HTTP success into `GO`. Continuation requires a
separately ratified hardened environment or charter/overlay redesign followed by a fresh,
contract-complete MF-P0 run.
