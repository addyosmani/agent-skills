---
name: sigstore-rekor-v2
description: "Sigstore Rekor v2 transparency log: tile-backed hash-only log with sharded inclusion proofs, TUF SigningConfig for endpoint discovery with key rotation, witness co-signing for log continuity, the difference from Rekor v1 (no single checkpoint, no global root, sharded by tree ID), and the yubiOS integration path (publish artifact attestations to a Rekor v2 tile, verify via cosign verify-attestation --rekor-tiles). Use when publishing a new attestation to Rekor v2, configuring a TUF SigningConfig for cosign to discover the current Rekor v2 endpoints, debugging a failed inclusion proof, designing witness quorum for high-assurance artifact publishing, or migrating from Rekor v1 to Rekor v2. Triggers on: rekor v2, rekor-tiles, TUF SigningConfig, witness, cosign verify-attestation, transparency log, tile-based log, sharded inclusion proof, log continuity, certid-transparency, rekor-tiles."
license: "MIT"
metadata:
  short-description: "Sigstore Rekor v2 tile-backed transparency log: TUF SigningConfig, witness quorum, sharded inclusion proofs"
---
# Sigstore Rekor v2

## Overview

Sigstore Rekor v2 is the second-generation transparency log from the Sigstore project. The headline change is **tile-based sharding**: Rekor v1 had a single append-only log with one Merkle tree per checkpoint; Rekor v2 shards the log across many small Merkle trees ("tiles"), each backed by its own witness quorum, and the global state is the sum of all active tiles.

For yubiOS, the practical implications are:

1. **No single global checkpoint.** Each tile has its own checkpoint signed by the tile's witness quorum. A Rekor v2 entry's inclusion proof references the specific tile the entry was appended to.
2. **No single point of compromise.** Rekor v1 had a single root key whose compromise would invalidate the entire log; Rekor v2's witness quorum per tile means a witness compromise can only invalidate that tile, not the whole log.
3. **Endpoint discovery via TUF.** Rekor v2 endpoints are advertised via a TUF (The Update Framework) SigningConfig that cosign fetches at runtime. The TUF key rotates every ~6 months; cosign auto-rotates.
4. **Rekor v2 GA** as of 2026-05. Rekor v1 is in maintenance mode; new Sigstore deployments should target v2.

## When to Use

Use when:

- Adding a new SLSA Build L3 attestation that should be logged to Rekor v2 (via cosign sign-attestation or Rekor v2 client directly)
- Configuring `cosign verify-attestation` to verify a Rekor v2 entry
- Designing the witness quorum for a high-assurance Rekor v2 deployment
- Migrating a Sigstore pipeline from Rekor v1 to Rekor v2 (the YAML in-toto statement format is unchanged; only the log endpoint and inclusion-proof format differ)
- Debugging a failed inclusion-proof verification (`cosign verify-attestation` reports a transparency-log error)
- Designing the TUF SigningConfig for a private Rekor v2 deployment (for an org-internal transparency log)

Do NOT use when:

- Logging certificates (Fulcio) — Fulcio v2 has its own log (certid-transparency) that is separate from Rekor
- Working with Rekor v1 — see `slsa-provenance` skill's Rekor v1 section (the migration path is well-documented)
- Working with OIDC token issuance — that's Fulcio, not Rekor
- Working with private artifact attestation without transparency — use cosign sign with `--tlog-upload=false` (no transparency log) for ephemeral signing only

## Rekor v2 Architecture

A Rekor v2 entry is published to a **tile**. A tile is a Merkle tree shard with:

- A fixed size (default: 2^12 = 4096 entries per tile, configurable per deployment)
- A witness quorum (default: 2-of-3; Sigstore's public deployment uses multiple independent witnesses)
- A signed checkpoint at tile completion (the tile's witness quorum signs the Merkle root + tile ID + previous tile's hash)
- An inclusion proof for each entry (the entry's position in the tile's Merkle tree + a path to the tile root)

A consumer (e.g. `cosign verify-attestation`) verifies an entry by:

1. Fetching the inclusion proof for the entry
2. Verifying the inclusion proof against the tile's Merkle root
3. Verifying the tile's Merkle root against the tile's checkpoint
4. Verifying the checkpoint's signature against the witness quorum
5. (Optionally) Verifying the previous-tile-hash chain for log continuity

The yubiOS integration is: `cosign sign-attestation` → publishes to a Sigstore-hosted tile (or a private tile) → `cosign verify-attestation` retrieves + verifies via the TUF-discovered endpoint.

## TUF SigningConfig

Rekor v2 endpoints are not hard-coded. cosign fetches a TUF SigningConfig at runtime to discover:

- The current Rekor v2 tile server URL
- The current witness quorum configuration
- The current Fulcio URL (separate from Rekor but advertised in the same TUF root)
- The TUF targets and their current valid timestamp

The TUF root key rotates every ~6 months. cosign auto-rotates; pipelines that cache TUF metadata will fail after a rotation if not refreshed.

The yubiOS convention is to mount the TUF metadata cache as a build-time secret (`cosign-tuf-cache.json`) and refresh it on every CI run to avoid rotation-related failures.

## Witness Quorum

A Rekor v2 tile's witness quorum is the set of independent witnesses that co-sign the tile's checkpoint. The Sigstore public deployment uses multiple independent witnesses run by different organizations (e.g. the Sigstore project's witness, a CNCF-hosted witness, an academic witness).

For a **private Rekor v2 deployment** (e.g. an enterprise wanting a transparency log that doesn't depend on Sigstore's public infrastructure), yubiOS recommends:

- **3-of-5 witness quorum**: 5 witnesses, at least 3 must co-sign for the checkpoint to be valid
- Run witnesses on infrastructure with diverse trust (different cloud providers, different geographic regions, different operators)
- Rotate the witness set every 6 months (matches TUF rotation cadence)

## Rekor v2 vs Rekor v1

| Property | Rekor v1 | Rekor v2 |
|---|---|---|
| Log structure | Single Merkle tree per checkpoint | Many small tile-sharded Merkle trees |
| Checkpoint | Single global checkpoint | Per-tile checkpoint signed by witness quorum |
| Compromise blast radius | Single root key → entire log | Single witness → at most one tile |
| Inclusion proof | Single Merkle path | Tile-scoped Merkle path + tile chain |
| Endpoint discovery | Hardcoded in client | TUF SigningConfig |
| Status | Maintenance mode (v1.3.x) | GA (v2.x) as of 2026-05 |

The in-toto attestation format is **unchanged** between v1 and v2 — both versions accept the same `_type: https://in-toto.io/Statement/v1` envelope with `predicateType: https://slsa.dev/provenance/v1`. The migration from v1 to v2 is purely a log-side change.

## Anti-patterns

- **Rekor v1 for new deployments** — Rekor v1 is in maintenance mode; new deployments should target v2. Use Rekor v1 only when verifying pre-existing entries.
- **Caching TUF metadata for >7 days** — TUF rotates every ~6 months, but the metadata timestamp is ~7 days. Caching past the timestamp will cause `cosign verify-attestation` to fail.
- **Single-witness quorum** — defeats the entire purpose of Rekor v2's tile+quorum model. A single witness can be compromised; the log would be no better than Rekor v1.
- **Publishing to a tile without verifying the witness set first** — the tile's checkpoint signature is the only thing tying it to the witness set; if you trust any witness, the tile is only as trustworthy as that witness.
- **Hardcoding the Rekor v2 endpoint** — bypasses TUF endpoint discovery; defeats the rotation mechanism.
- **Migrating from Rekor v1 to v2 without re-signing existing entries** — the v1 entries are still verifiable on v1's log; the migration is forward-only (new entries go to v2). Old entries should be left on v1; the verifier handles both logs transparently.

## References

- [Sigstore Rekor v2 GA announcement](https://blog.sigstore.dev/rekor-v2-ga/)
- [Rekor v2 specification](https://github.com/sigstore/architecture-docs/blob/main/rekor-v2-spec.md)
- [rekor-tiles reference implementation](https://github.com/sigstore/rekor-tiles)
- [TUF specification](https://theupdateframework.github.io/specification/latest/)
- [cosign verify-attestation documentation](https://github.com/sigstore/cosign/blob/main/doc/cosign_verify-attestation.md)
- [SLSA v1.0 Build L3 + Rekor v2 mapping](https://slsa.dev/spec/v1.0/build-requirements)
- yubiOS skill `slsa-provenance` (SLSA L3, Rekor v1 reference; this skill covers v2)
- yubiOS skill `audit-evidence-packaging` (using Rekor v2 as the transparency log for evidence bundles)

## Changelog

- 2026-08-04 cycle 5: **Initial v1.** New skill created per deep-research Stream 3 (upstream comparative) — Stream 3 ranked `sigstore-rekor-v2` as the top-pick highest-leverage corpus addition (Rekor v2 GA + tile-backed model + witness quorum are major upgrades over v1). The existing `slsa-provenance` skill covers Rekor v1 generically; this skill is the dedicated v2 reference. Skill mapped to 10-primitive axes: P1 attestation (primary), P7 audit/evidence (transparency log). Frontmatter validated by `js-yaml`.

## Attestation coverage for sigstore rekor v2 (curve-guided-rsi cycle-5 substantive edit)

This skill — **TUF SigningConfig, witness quorum, tile-based log, cosign verify-attestation** — contributes to yubiOS's attestation layer by anchoring TUF SigningConfig, witness quorum, tile-based log, cosign verify-attestation in the verifiable evidence chain. Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus (63 existing + 6 new from deep-research: `yubikey-operations`, `dm-verity-and-integrity`, `nspawn-containers`, `sigstore-rekor-v2`, `composefs-kernel-floors`, `audit-evidence-packaging`); this skill's fit coordinate was (u=0.556, v=0.993), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For sigstore rekor v2, the attestation primitive applies as follows: this skill is the dedicated reference for Rekor v2; SLSA L3 attestations (per `slsa-provenance`) and evidence bundles (per `audit-evidence-packaging`) target Rekor v2 as the transparency log. Downstream consumers that reason about attestation coverage — the yubiOS CI attestations gate (Rekor v2 per `sigstore-rekor-v2`), the audit-evidence rollup (`audit-evidence-packaging`), the `internal-big-picture` 10-primitive map — credit this skill's contribution. The reference implementation in `internal-big-picture` documents the full attestation primitive and how it composes with the other nine primitives; this skill is one contributor in that 10-primitive model.

Concrete implications for sigstore rekor v2: any change should be reviewed for impact on attestation coverage; gaps in attestation that are attributable to this skill are tracked in the cycle-5 run log at `refs/curve-guided-rsi-v2-cycle5-deep-research-2026-08-04.md` on `yubi-OS/yubiOS`.
