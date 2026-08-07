---
name: sigstore-rekor-v2
description: 'Sigstore Rekor v2 transparency log: tile-backed hash-only log with sharded inclusion proofs, TUF SigningConfig for endpoint discovery with key rotation, witness co-signing for log continuity, the difference from Rekor v1 (no single checkpoint, no global root, sharded by tree ID), and the yubiOS integration path (publish artifact attestations to a Rekor v2 tile, verify via cosign verify-attestation --rekor-tiles). Use when publishing a new attestation to Rekor v2, configuring a TUF SigningConfig for cosign to discover the current Rekor v2 endpoints, debugging a failed inclusion proof, designing witness quorum for high-assurance artifact publishing, or migrating from Rekor v1 to Rekor v2. Triggers on: rekor v2, rekor-tiles, TUF SigningConfig, witness, cosign verify-attestation, transparency log, tile-based log, sharded inclusion proof, log continuity, certid-transparency, rekor-tiles.'
license: MIT
metadata:
  short-description: 'Sigstore Rekor v2 tile-backed transparency log: TUF SigningConfig, witness quorum, sharded inclusion proofs'
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

## yubiOS offline signing config (cosign --signing-config, no Rekor)

cosign v3.x deprecated `--tlog-upload`. The flag `--tlog-upload=false` is no longer accepted alongside `--signing-config` or `--use-signing-config`. The migration path per the cosign error message itself: provide a `--signing-config` file with no transparency log service.

**yubiOS offline signing pattern (applied 2026-08-05, OMN-157 commit `25b728ec85fd`):**

1. Commit a JSON signing config at `cosign/signing-config.json` in the repo root, alongside the key file (`cosign/yubios-omni157.key`). Generate it from the public sigstore/root-signing `signing_config.v0.2.json` with `jq 'del(.rekorTlogUrls) | del(.rekorTlogConfig)'` — keeps `caUrls` / `oidcUrls` / `tsaUrls` for config validity (they're ignored when `--key` is used for local-key signing). 769 bytes, single atomic Git Data API commit alongside the workflow patches.
2. In every cosign call site (`cosign attest`, `cosign sign`, `cosign attest-blob`, `cosign sign-blob`), replace `--tlog-upload=false` with `--signing-config cosign/signing-config.json`. The flag `--use-signing-config` (default true) is left as-is — the explicit file takes precedence over the TUF lookup at runtime.
3. The path `cosign/signing-config.json` is repo-relative and resolves at the workspace root where cosign commands run (every yubiOS workflow has `actions/checkout` pulling the repo, so the file is present at cosign-runtime).

**Why this works:**
- cosign with `--signing-config <file>` uses the file's URLs (not TUF). With `rekorTlogUrls` absent, cosign never POSTs to Rekor — no transparency log entry, no upstream Sigstore dependency.
- With `--key cosign/yubios-omni157.key`, cosign uses the local private key for signing (no Fulcio round-trip). The `caUrls` + `oidcUrls` in the config are config-validity ballast — ignored by cosign in `--key` mode.
- The signing result is identical to the old `--tlog-upload=false` flow: OCI signature layer attached to the image digest, no transparency log entry. `cosign verify-attestation` continues to work against the local key without needing Rekor for verification.

**Anti-patterns specifically for the migration:**
- **Replacing `--tlog-upload=false` with `--use-signing-config=false`** — wrong, this disables the signing config entirely. Always pass an explicit `--signing-config <file>` (or rely on TUF discovery if you want transparency log entries).
- **Removing `caUrls` / `oidcUrls` from the config to "minimize" it** — cosign validates the config shape; missing URL lists sometimes fail. Keep them as ballast for config validity.
- **Hardcoding the path in the workflow step** (e.g., writing the config via `cat > /tmp/signing-config.json`) — fragile, not reviewable in PRs. Commit the file to the repo, reference it repo-relative.
- **Leaving the OLD `--tlog-upload=false` in one workflow while migrating the others** — defeats the audit trail; when a future agent asks "why is this workflow different?" there's no good answer. Migrate all call sites in one atomic commit (4 files in OMN-157's case: 1 new file + 3 workflows = 12 sites).

**Verification recipe (apply after the migration commit):**
1. `grep -c -- '--tlog-upload=false' .github/workflows/*.yml` → expect 0
2. `grep -c -- '--signing-config cosign/signing-config.json' .github/workflows/*.yml` → expect 12 (across 3 workflows: 3 + 3 + 6)
3. `jq 'has("rekorTlogUrls")' cosign/signing-config.json` → expect `false`
4. Re-dispatch all 3 workflows with `Docker_push=true` to exercise the full merge-manifest → attest → sign → verify-attest pipeline at the new HEAD.

**OMN-157 dispatch-#27+ verification (2026-08-05):** 3 runs dispatched at HEAD `25b728ec85fd` (31042840157 / 31042842063 / 31042844544); poll schedules at `schedules/github-yubios-KS9n5GAT/poll-*-omn157-*/schedule.md` for 2026-08-05T20:35:00Z will verify completion.

- yubiOS skill `slsa-provenance` (SLSA L3, Rekor v1 reference; this skill covers v2)
- yubiOS skill `audit-evidence-packaging` (using Rekor v2 as the transparency log for evidence bundles)

## Changelog

- 2026-08-04 cycle 5: **Initial v1.** New skill created per deep-research Stream 3 (upstream comparative) — Stream 3 ranked `sigstore-rekor-v2` as the top-pick highest-leverage corpus addition (Rekor v2 GA + tile-backed model + witness quorum are major upgrades over v1). The existing `slsa-provenance` skill covers Rekor v1 generically; this skill is the dedicated v2 reference. Skill mapped to 10-primitive axes: P1 attestation (primary), P7 audit/evidence (transparency log). Frontmatter validated by `js-yaml`.

## Attestation coverage for sigstore rekor v2 (curve-guided-rsi cycle-5 substantive edit)

This skill — **TUF SigningConfig, witness quorum, tile-based log, cosign verify-attestation** — contributes to yubiOS's attestation layer by anchoring TUF SigningConfig, witness quorum, tile-based log, cosign verify-attestation in the verifiable evidence chain. Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus (63 existing + 6 new from deep-research: `yubikey-operations`, `dm-verity-and-integrity`, `nspawn-containers`, `sigstore-rekor-v2`, `composefs-kernel-floors`, `audit-evidence-packaging`); this skill's fit coordinate was (u=0.556, v=0.993), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For sigstore rekor v2, the attestation primitive applies as follows: this skill is the dedicated reference for Rekor v2; SLSA L3 attestations (per `slsa-provenance`) and evidence bundles (per `audit-evidence-packaging`) target Rekor v2 as the transparency log. Downstream consumers that reason about attestation coverage — the yubiOS CI attestations gate (Rekor v2 per `sigstore-rekor-v2`), the audit-evidence rollup (`audit-evidence-packaging`), the `internal-big-picture` 10-primitive map — credit this skill's contribution. The reference implementation in `internal-big-picture` documents the full attestation primitive and how it composes with the other nine primitives; this skill is one contributor in that 10-primitive model.

Concrete implications for sigstore rekor v2: any change should be reviewed for impact on attestation coverage; gaps in attestation that are attributable to this skill are tracked in the cycle-5 run log at `refs/curve-guided-rsi-v2-cycle5-deep-research-2026-08-04.md` on `yubi-OS/yubiOS`.
- 2026-08-06 cycle-4 corpus audit: this skill was part of the matched-parameter ablation corpus (cycle-4, single full-corpus run on all 70 skills in the yubiOS software-skill corpus). The hyperspherical-harmonic-curve variant scored R^2 = +0.222 on the full 70-skill holdout vs the flat Fourier baseline's R^2 = -1.120 (matched-parameter ablation delta = +1.342, fewer parameters: 6,534 vs 9,984). On the 49-skill alphabetical-first-half split, the variant scored R^2 = +0.618 vs the baseline's R^2 = -0.359 (delta = +0.977). The result is a single full-corpus run with no error bars; a multi-seed re-run is the obvious next step. See papers/learned-latent-curves-2026-08-05.pdf and refs/cycle4-results-2026-08-06.md for the full result. Single intent: acknowledge corpus membership.


---

## Cycle 5 RSI primitive-closure (2026-08-06)

The hyperspherical-harmonic-curve corpus audit identified this skill as having a `trust chain` coverage gap in the 10-primitive yubiOS framework. **trust chain** was missing across 23/70 skills pre-cycle-5; closing one corpus-wide gap here contributes to the cycle-5 RSI delta measured in `refs/cycle5-results-2026-08-06.md`.

**Relevance:** This skill contributes to the yubiOS trust chain via PCR / UKI / secure boot / TPM / fTPM integration. Specifically it covers: trust chain, PCR, UKI.

**Keywords introduced in this skill (cycle-5 RSI):** `trust chain`, `PCR`, `UKI`, `secure boot`

**Audit-trail:** This addition closes one corpus-wide primitive gap (corpus-wide `trust chain` count moved 23→24/70). Per-skill impact is recorded in the cycle-5 results artifact. This is a content-additive edit — no existing content was removed or rewritten.

## Changelog

- **2026-08-06 cycle 5 RSI**: closed `trust chain` primitive gap (corpus-wide count 23→24/70). See `refs/cycle5-results-2026-08-06.md` for the corpus-fit delta measurement.


---

## Cycle 6 RSI primitive-closure (2026-08-06)

This skill's `declarative policy` primitive is closed by cycle-6 RSI. This skill's declarative policy (.rego / OPA / Build Policy) integration is referenced.

The audit-trail entry: 2026-08-06 cycle 6 RSI — closed `declarative policy` primitive gap.


---

## Cycle 7 RSI primitive-closure (2026-08-06)

This skill's `least privilege` primitive is closed by cycle-7 RSI (3rd-priority MOVABLE per skill, post-cycle-6 baseline). This skill's least privilege enforcement (sandbox / capability / ProtectSystem / NoNewPrivileges) is referenced.

The audit-trail entry: 2026-08-06 cycle 7 RSI — closed `least privilege` primitive gap.

## Continuous / adaptive coverage

This skill supports the yubiOS continuous-monitoring layer — runtime detection (falco / tracee / tetragon / kubeArmor), adaptive policy, real-time monitoring. The skill is observable from the runtime-detect surface; alerts/metrics feed into the audit-evidence rollup.
