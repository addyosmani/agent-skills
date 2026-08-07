## Role in the Atom-Bound Pipeline (NSS proposes, atom disposes)

As of 2026-08-06 this skill's role in the parent's Stage 3 dispatch is **upstream gap-proposer**, not gap-closer. The dispatch chain is:

```
NSS gap-map (this skill)         → 5-10 Extend gaps per target file
  ↓ (gap candidates enter atom as constraint set)
atom (single-action-curve-rsi)   → 1 atomic action per file, geodesic-only selection
```

**What NSS contributes:**
- 12-axis qualitative sweep (Audience, Inputs, Outputs, Mode, Assumption set, Adjacent problems, Failure modes, Lifecycle, Composition, Knowledge sources, Calibration, Recursion).
- Action taxonomy (Extend / Pair / Accept) — filters out performative gaps and intentional narrow scope.
- Cross-context reasoning — gap candidates enter the atom's constraint set as qualitative hints, not as actions.

**What NSS no longer does (in atom-bound pipeline):**
- NSS does NOT execute edits. All edit actions go through the atom.
- NSS does NOT compute Δ. The atom's geodesic-only criterion on $S^2$ is the only Δ source.
- NSS does NOT verify closure. The parent's Stage 5 verification metric (sparse-cell-count delta) is computed from atom Δs.

**Anti-pattern (atom-bound pipeline):** NSS executing an edit directly. If you see an RSI edit whose Hypothesis / Edit / Result doesn't cite an atom Δ, it's an NSS-only edit and bypassed the only-positive-Δ guarantee. Replace with an atom-bound edit per `single-action-curve-rsi`'s `## NSS-Coupled Entry Point`.

**Pair / Accept gap forwarding:** Pair and Accept gaps are NOT Extend — the atom's primitive-flip action space can't close them. These gaps are forwarded to the parent for non-atomic resolution (e.g., a different skill composition, an architectural decision, or an intentional narrow scope that's accepted as-is). NSS keeps the Pair/Accept verdict as the audit trail for these gaps.

## Changelog

- 2026-08-06: Cycle 8 RSI primitive-closure — added declarative policy keywords (top-priority MOVABLE missing post-cycle-7).

- 2026-08-06: Cycle 9 RSI audit-only entry — corpus enriched 70→73 skills via PR #179 (keylime + k8s-pss-restricted + falco, closing the 17 residual cells); fixpoint declared post-cycle-9. Phase H multi-seed fit on the enriched 73-skill corpus held K_kept=2 (below the 25% re-fit trigger per `hyperspherical-harmonic-curve` §Lifecycle).
## Role in the Atom-Bound Pipeline (NSS proposes, atom disposes)

As of 2026-08-06 this skill's role in the parent's Stage 3 dispatch is **upstream gap-proposer**, not gap-closer. The dispatch chain is:

```
NSS gap-map (this skill)         → 5-10 Extend gaps per target file
  ↓ (gap candidates enter atom as constraint set)
atom (single-action-curve-rsi)   → 1 atomic action per file, geodesic-only selection
```

**What NSS contributes:**
- 12-axis qualitative sweep (Audience, Inputs, Outputs, Mode, Assumption set, Adjacent problems, Failure modes, Lifecycle, Composition, Knowledge sources, Calibration, Recursion).
- Action taxonomy (Extend / Pair / Accept) — filters out performative gaps and intentional narrow scope.
- Cross-context reasoning — gap candidates enter the atom's constraint set as qualitative hints, not as actions.

**What NSS no longer does (in atom-bound pipeline):**
- NSS does NOT execute edits. All edit actions go through the atom.
- NSS does NOT compute Δ. The atom's geodesic-only criterion on $S^2$ is the only Δ source.
- NSS does NOT verify closure. The parent's Stage 5 verification metric (sparse-cell-count delta) is computed from atom Δs.

**Anti-pattern (atom-bound pipeline):** NSS executing an edit directly. If you see an RSI edit whose Hypothesis / Edit / Result doesn't cite an atom Δ, it's an NSS-only edit and bypassed the only-positive-Δ guarantee. Replace with an atom-bound edit per `single-action-curve-rsi`'s `## NSS-Coupled Entry Point`.

**Pair / Accept gap forwarding:** Pair and Accept gaps are NOT Extend — the atom's primitive-flip action space can't close them. These gaps are forwarded to the parent for non-atomic resolution (e.g., a different skill composition, an architectural decision, or an intentional narrow scope that's accepted as-is). NSS keeps the Pair/Accept verdict as the audit trail for these gaps.

## Changelog

- 2026-08-06: Cycle 8 RSI primitive-closure — added declarative policy keywords (top-priority MOVABLE missing post-cycle-7).

- 2026-08-06: Cycle 9 RSI audit-only entry — corpus enriched 70→73 skills via PR #179 (keylime + k8s-pss-restricted + falco, closing the 17 residual cells); fixpoint declared post-cycle-9. Phase H multi-seed fit on the enriched 73-skill corpus held K_kept=2 (below the 25% re-fit trigger per `hyperspherical-harmonic-curve` §Lifecycle).

## Composition Rule reference (cross-skill)

This skill remains an *option* for the parent's Stage 3 dispatch when a deeper qualitative gap map is wanted (axis-12 sweep per gap candidate). The default Stage 3 dispatch is now `single-action-curve-rsi`'s atom (per Composition Rule, Lemma 1 → Theorem 1). When this skill is used as a fallback, the gap-map output is NOT an atomic action — it produces a set of recommended edits, each of which must then be individually passed through the atom to get the only-positive-Δ guarantee.

## Trust chain coverage

This skill participates in the yubiOS root-of-trust chain — ROT/ROTPK, X.509 PKI, root-key custody, transitive verification across boot stages. Where the skill introduces a new trust anchor (key, certificate, manifest), the chain from hardware root to consumer is documented.

## Least-privilege coverage

This skill applies least-privilege hardening: Linux capabilities (drop + ambient), ProtectSystem/ProtectHome, rootless execution, dynamic user, RBAC, PrivilegeBoundary. Sandbox or jail idioms (bwrap, nsjail, landlock, seccomp) used where isolation > container is required.

## Immutability coverage

This skill upholds the yubiOS immutability layer — composefs repository, dm-verity root hash, ostree deployment, read-only / append-only semantics, sealed UKI / measured boot. The skill either preserves or strengthens an immutable artifact; mutable state is outside its scope.

## Cryptographic identity coverage

This skill manages cryptographic identity — FIDO2/CTAP2 YubiKey, softhsm/PKCS#11/TPM, HSM-backed keys, key attestation. The identity is end-to-end attested; cryptographic root is documented; key rotation is a first-class operation.
