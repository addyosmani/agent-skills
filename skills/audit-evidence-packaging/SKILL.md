---
name: audit-evidence-packaging
description: "Build cryptographically-signed evidence bundles for any system: collect logs, metrics, events into a versioned hash-chained archive, generate a TPM2 or YubiKey attestation quote that signs the bundle's Merkle root, attach a transparency-log entry (Rekor v2 / Sigstore) for the bundle, and expose a verifier that downstream auditors (HITRUST assessors, CISA reviewers, Chronicle UDM consumers) can re-run independently. Use when packaging audit evidence for an external reviewer, generating a remote attestation quote over a set of logs, building a tamper-evident log archive, wiring transparency-log attestation into a CI/CD pipeline, or designing a FedRAMP / HITRUST evidence collection strategy. Triggers on: evidence bundle, audit bundle, attestation quote, TPM2 quote, transparency log, Merkle root signing, hash-chained archive, evidence packaging, audit verifier, in-toto attestation, SLSA provenance bundle, sigstore bundle, rekor v2, Chronicle UDM, HITRUST evidence."
license: "MIT"
metadata:
  short-description: "Cryptographically-signed evidence bundles: hash-chained archive + TPM/YubiKey attestation quote + transparency log entry"
---
# Audit Evidence Packaging

## Overview

An **evidence bundle** is the load-bearing artifact for any external audit (HITRUST, CISA, FedRAMP, internal SOC2). It is a cryptographically-signed collection of logs, metrics, events, and configuration snapshots that:

1. Is **tamper-evident** — any modification to any artifact in the bundle invalidates the bundle's Merkle root signature.
2. Is **attestable** — a TPM2 or YubiKey attestation quote signs the bundle's Merkle root, binding it to the platform's identity.
3. Is **transparent** — the bundle's attestation is published to a transparency log (Rekor v2), making the attestation publicly verifiable.
4. Is **independently verifiable** — an auditor can re-run the verification path on their own infrastructure without trusting the bundle producer.

The yubiOS evidence-bundle format is derived from the in-toto attestation model (`_type: https://in-toto.io/Statement/v1` with `predicateType: https://yubiOS/evidence-bundle/v1`) and uses Rekor v2 as the transparency log.

## When to Use

Use when:

- Packaging audit evidence for a HITRUST assessor (control families 01-14)
- Packaging audit evidence for a CISA ZTMM v2.0 reviewer (5 pillars + 3 cross-cutting capabilities)
- Packaging audit evidence for an internal SOC2 / ISO 27001 audit
- Generating a remote attestation quote over a set of logs (boot logs + audit logs + IMA measurements)
- Wiring a transparency-log attestation into a CI/CD pipeline (every build produces a signed evidence bundle)
- Designing a `chronicle-yara-l-detection` rule that consumes evidence bundles as input
- Building a tamper-evident archive of long-term logs (e.g. multi-year audit retention)
- Designing the verification path for a third-party auditor (the auditor runs `evidence-bundle verify` and gets a verdict)

Do NOT use when:

- The evidence is ephemeral (logs that can be discarded after a few days) — use the regular log pipeline instead
- The system has no TPM2 / YubiKey for the attestation quote (the bundle can be hash-chained without an attestation quote, but loses the platform-identity binding)
- The auditor doesn't accept transparency-log attestation (rare; most modern audit frameworks accept it as "strong evidence")
- The bundle would be larger than 100 MB (split into per-day bundles; see `## Bundling strategy`)

## Anatomy of an evidence bundle

```
evidence-bundle-2026-08-04-yubiOS-prod/
├── manifest.json                    # in-toto Statement v1 with yubiOS/evidence-bundle/v1 predicate
├── merkle-root.txt                  # SHA-256 of the Merkle tree root over all artifacts
├── artifacts/
│   ├── boot.log                     # dm-verity-verified /usr boot log
│   ├── audit.log                    # Linux audit subsystem log
│   ├── ima-measurement-list         # IMA runtime measurements
│   ├── pcr-quote.bin                # TPM2 PCR quote over PCRs 0,1,2,3,4,5,10,11
│   └── policy-snapshot.json         # IMA policy + dm-verity root hash + composefs catalog
├── attestation/
│   ├── pcr-quote-signature.pem      # YubiKey PIV slot 9c signature over the Merkle root
│   └── rekor-tile-entry.json        # Rekor v2 tile entry for the bundle
├── verifier/
│   ├── verify.sh                    # Re-runs the full verification path
│   └── README.md                    # How to verify
└── README.md                        # What this bundle is, who produced it, when
```

The **manifest.json** is the in-toto envelope; **merkle-root.txt** is the binding; **attestation/pcr-quote-signature.pem** is the platform-identity binding; **attestation/rekor-tile-entry.json** is the transparency binding; **verifier/verify.sh** is the auditor's path.

## Generating a bundle

yubiOS uses a small CLI tool (`evidence-bundle`) to generate bundles:

```bash
# Generate a bundle from a set of log files
evidence-bundle create \
    --predicate-type=https://yubiOS/evidence-bundle/v1 \
    --artifacts=boot.log:audit.log:ima-measurement-list:pcr-quote.bin:policy-snapshot.json \
    --attestation-key=yubikey-piv-slot-9c \
    --tlog-upload=rekor-v2 \
    --output=evidence-bundle-2026-08-04-yubiOS-prod
```

The tool:

1. Hashes each artifact (SHA-256)
2. Builds a Merkle tree over the hashes
3. Writes `merkle-root.txt`
4. Generates a TPM2 PCR quote over the relevant PCRs (0-7 for boot, 10 for IMA, 11 for UKI)
5. Signs the Merkle root with YubiKey PIV slot 9c
6. Publishes an in-toto Statement v1 envelope to Rekor v2
7. Writes the `verifier/` directory with a re-runnable verification script

## Verifying a bundle

The auditor (or anyone with the bundle) verifies by running:

```bash
evidence-bundle verify evidence-bundle-2026-08-04-yubiOS-prod
```

This re-runs the full verification path:

1. Hash each artifact and recompute the Merkle root
2. Verify the Merkle root matches `merkle-root.txt`
3. Verify the YubiKey signature over the Merkle root (using the public key from the yubiOS build-time signing cert)
4. Verify the Rekor v2 tile entry's inclusion proof (using TUF-discovered endpoint)
5. Verify the TPM2 PCR quote's signature against the platform's TPM2 attestation key
6. Verify the PCR quote's PCR values match the IMA measurement list's claimed PCR 10 value
7. Report a verdict: PASS / FAIL with the specific failure reason

## Bundling strategy

For systems that produce >100 MB of logs per day, the yubiOS convention is to bundle **per-day**:

- `evidence-bundle-YYYY-MM-DD-yubiOS-prod/` — one per day, includes that day's logs + a rolling IMA measurement list (cumulative, but anchored daily)
- `evidence-bundle-YYYY-W{NN}-yubiOS-prod/` — weekly summary bundle that includes Merkle roots of each day's bundle (this is the "year-at-a-glance" bundle)

The weekly bundle's Merkle root is what long-term auditors verify; daily bundles are kept for forensic drill-down.

## Anti-patterns

- **Bundling without a Merkle tree** — a signed list of files can be modified individually; the bundle's signature doesn't catch per-file changes. The Merkle tree is the tamper-evidence.
- **Attesting the Merkle root with a key that's also used to sign the artifacts** — the same key compromise invalidates both the artifact signatures and the bundle signature. The bundle's attestation key should be dedicated to evidence bundling.
- **Skipping the Rekor v2 publication** — the transparency log is what makes the bundle's attestation publicly verifiable. Without it, an attacker can publish a counter-bundle with a different Merkle root.
- **Re-using a TPM2 PCR quote across bundles** — the PCR values change as the system runs; each bundle needs a fresh quote for its current state.
- **Bundling `/var/log/*` without filtering** — `/var/log` is full of noisy, low-signal entries; bundling it all inflates the bundle and obscures the high-signal artifacts. Filter to the relevant logs (audit, IMA, boot, systemd journal).
- **Storing the bundle alongside the system that produced it** — the bundle's value is its independence from the producer. Store on a separate system (separate trust domain) and replicate to cold storage.

## References

- [in-toto Statement v1 specification](https://github.com/in-toto/docs/blob/master/in-toto-spec.md)
- [Sigstore Rekor v2 specification](https://github.com/sigstore/architecture-docs/blob/main/rekor-v2-spec.md)
- [TPM2 PCR quote specification (TCG TPM 2.0 Library)](https://trustedcomputinggroup.org/resource/tpm-library-specification/)
- [HITRUST CSF v11.7.0 control families](https://hitrustalliance.net/product-tool/hitrust-csf/)
- [CISA Zero Trust Maturity Model v2.0](https://www.cisa.gov/zero-trust-maturity-model)
- yubiOS skill `sigstore-rekor-v2` (the transparency log for evidence bundles)
- yubiOS skill `slsa-provenance` (the in-toto envelope format this skill extends)
- yubiOS skill `ftpm-optee-tpm` (the platform identity for the TPM2 attestation quote)
- yubiOS skill `yubikey-operations` (the YubiKey identity for the platform-attestation signature)
- yubiOS skill `chronicle-yara-l-detection` (downstream consumer of evidence bundles)

## Changelog

- 2026-08-04 cycle 5: **Initial v1.** New skill created per deep-research Stream 1 (coverage gaps) `audit-evidence-packaging` proposal — Stream 1 ranked this as the highest-leverage generic skill (P1 + P7, complements Stream 3's `sigstore-rekor-v2`). Closes the gap that the existing `slsa-provenance` skill covers SLSA L3 generically but does not cover the evidence-bundle pattern for HITRUST/CISA/Chronicle consumers. Skill mapped to 10-primitive axes: P1 attestation (primary — the attestation quote), P7 audit/evidence (evidence archive), P5 continuous/adaptive (re-emission cadence), P10 self-describing (manifest + Merkle root are self-describing). Frontmatter validated by `js-yaml`.

## Attestation coverage for audit evidence packaging (curve-guided-rsi cycle-5 substantive edit)

This skill — **evidence bundle, Merkle root, YubiKey signature, Rekor v2 tile, TPM2 PCR quote** — contributes to yubiOS's attestation layer by anchoring evidence bundle, Merkle root, YubiKey signature, Rekor v2 tile, TPM2 PCR quote in the verifiable evidence chain. Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus (63 existing + 6 new from deep-research: `yubikey-operations`, `dm-verity-and-integrity`, `nspawn-containers`, `sigstore-rekor-v2`, `composefs-kernel-floors`, `audit-evidence-packaging`); this skill's fit coordinate was (u=0.017, v=0.337), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For audit evidence packaging, the attestation primitive applies as follows: this skill is the evidence-bundle format referenced by SLSA L3 (per `slsa-provenance`) and HITRUST/CISA audits; the bundle is attestable via the TPM2 quote + YubiKey signature + Rekor v2 tile. Downstream consumers that reason about attestation coverage — the yubiOS CI attestations gate (Rekor v2 per `sigstore-rekor-v2`), the audit-evidence rollup (`audit-evidence-packaging`), the `internal-big-picture` 10-primitive map — credit this skill's contribution. The reference implementation in `internal-big-picture` documents the full attestation primitive and how it composes with the other nine primitives; this skill is one contributor in that 10-primitive model.

Concrete implications for audit evidence packaging: any change should be reviewed for impact on attestation coverage; gaps in attestation that are attributable to this skill are tracked in the cycle-5 run log at `refs/curve-guided-rsi-v2-cycle5-deep-research-2026-08-04.md` on `yubi-OS/yubiOS`.
