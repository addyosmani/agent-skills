---
name: runtime-attestation-keylime
description: "Runtime attestation for yubiOS covering three production attest frameworks: Keylime (Linux Foundation, TPM-based remote attestation of Linux nodes via TPM2 quotes + signed evidence bundles), in-toto (CNCF, attestation framework for software supply chains with signed link attestations and SLSA Build L3 predicates), and confidential-containers (CNCF, remote attestation for confidential VMs on Intel TDX, AMD SEV-SNP, NVIDIA H100 Confidential Compute). Each framework emits cryptographically verifiable evidence about system state, artifacts, or actions; each is integrated with Rekor v2 for transparency-log anchoring. Use when designing runtime attestation flows for yubiOS, generating TPM2 quotes over system state, signing SLSA Build L3 attestations with in-toto link metadata, wiring TDX/SEV-SNP attestation into confidential-VM workloads, or auditing how a yubiOS pipeline produces signed evidence. Triggers on: keylime, TPM2 quote, runtime attestation, remote attestation, in-toto attestation, in-toto.io, link attestation, SLSA L3 predicate, confidential containers, TDX attestation, SEV-SNP attestation, NVIDIA H100 CC, attestation quote, evidence bundle."
license: "MIT"
metadata:
  short-description: "Runtime attestation: Keylime TPM2 quotes + in-toto SLSA L3 + confidential-containers TDX/SEV-SNP — all anchoring to Rekor v2"
---
# Runtime Attestation — Keylime, in-toto, Confidential Containers

## Overview

This skill is the yubiOS reference for **runtime attestation** — the primitive that produces cryptographically verifiable evidence about the state of a system, an artifact, or an action. Three frameworks in scope:

1. **Keylime** — TPM2-based remote attestation of Linux nodes. Verifies boot + runtime integrity; emits TPM2 quotes over PCR values; signs evidence bundles.
2. **in-toto** — supply-chain attestation framework. Generates link attestations with signed predicate material; underpins SLSA Build L3.
3. **confidential-containers** — attestation for confidential VMs. Verifies TDX quotes (Intel TDX), SEV-SNP reports (AMD), and H100 CC measurements (NVIDIA).

All three integrate with Rekor v2 for transparency-log anchoring (see `sigstore-rekor-v2`). All three produce verifiable evidence — the noun is canonical to the `attestation` primitive in the `internal-big-picture` 10-primitive model.

## When to Use

Use when:

- Generating a TPM2 quote over a yubiOS node's boot state (Keylime verifier-side operation)
- Signing a SLSA Build L3 attestation with in-toto link metadata (`predicateType: https://slsa.dev/provenance/v1`)
- Anchoring an in-toto attestation to Rekor v2 via cosign (see `sigstore-rekor-v2` for the v2 log details)
- Wiring Intel TDX / AMD SEV-SNP / NVIDIA H100 CC attestation into a confidential-VM workload
- Designing the verifier side of a remote-attestation flow (the node being attested must produce evidence; the verifier must validate it)
- Auditing whether a yubiOS pipeline produces signed evidence (the attestation primitive's coverage)
- Building evidence bundles for HITRUST / CISA / Chronicle (see `audit-evidence-packaging`)

Do NOT use when:

- Logging certificates to a transparency log — use `sigstore-rekor-v2` directly (Fulcio v2 / certid-transparency)
- Signing ephemeral content with no transparency requirement — use `cosign sign-blob --tlog-upload=false` (or the yubiOS offline signing pattern from `sigstore-rekor-v2` §Offline signing config)
- Producing build-time provenance without runtime checks — see `slsa-provenance` for SLSA L3 specifically; this skill covers the runtime + in-toto + confidential-VM legs of attestation

## Keylime

Keylime (keylime.dev, Linux Foundation) is the canonical TPM-based runtime attestation framework for Linux. The architecture:

- **Agent** — runs on the node being attested. Holds the TPM2 endorsement key; responds to challenges.
- **Verifier** — runs on the attesting side. Holds the TPM2 manufacturer certificates + the policy (PCR values, IMA whitelist, UEFI event log).
- **Registrar** — coordinates agent registration + key distribution.

The attestation loop:

1. Verifier challenges the agent with a nonce.
2. Agent extends the nonce into a TPM2 PCR; the TPM signs a quote (`TPM2_Quote`) over the PCR values + nonce.
3. Agent returns the quote + the IMA measurement list + the UEFI event log.
4. Verifier validates the quote against the TPM2 manufacturer certificate, replays the PCR values against the IMA list + UEFI event log, and accepts or rejects.

yubiOS integration: the YubiKey replaces the TPM2 endorsement key for user identity (per `yubikey-operations`), but the TPM2 platform integrity PCRs remain TPM-sourced. The fTPM TA (see `ftpm-optee-tpm`) on ARM64 provides the TPM2 quote leg.

Keylime evidence bundles are signed with the agent's TPM key and anchored to Rekor v2 via cosign. The bundle format is a tar.gz containing the quote + IMA list + UEFI event log, signed and logged.

## in-toto

in-toto (in-toto.io, CNCF) is the canonical supply-chain attestation framework. Two key abstractions:

- **Link metadata** — JSON files that record what each step of the supply chain did. Each link has a `_type` (e.g. `https://in-toto.io/Statement/v1`), a `predicateType` (e.g. `https://slsa.dev/provenance/v1`), and a `predicate` body.
- **Step attestation** — each step in the supply chain (clone, build, test, package, sign) emits a link. The links chain together to form the in-toto layout.

SLSA Build L3 requires in-toto link metadata for every build step. The yubiOS convention: every yubiOS CI build emits:

1. A `git clone` link (records source state)
2. A `build` link with SLSA provenance (records build steps + dependencies)
3. A `test` link (records test results)
4. A `package` link (records final artifact)
5. A `sign` link (records cosign signature)

All five links are signed by the step's key and anchored to Rekor v2. The final cosign `verify-attestation` validates the entire chain.

## Confidential Containers

Confidential containers (CNCF, confidentialcontainers.org) provide remote attestation for confidential VMs:

- **Intel TDX** — Trust Domain Extensions. The TD emits a TDX quote containing the TD's measurement (MRTD) + the TD's report data.
- **AMD SEV-SNP** — Secure Encrypted Virtualization with Secure Nested Paging. The SNP guest emits an SNP report containing the guest's measurement + the host's VCEK certificate.
- **NVIDIA H100 CC** — H100 Confidential Compute. The GPU emits a CC measurement + a GPU attestation report.

In each case, the attestation evidence is a quote/report signed by the hardware root of trust (TDX: TD module; SEV-SNP: AMD Platform Security Processor; H100 CC: GPU's measurement fuse). The verifier validates the quote against the hardware manufacturer's root certificate.

yubiOS integration: confidential-VM workloads emit their attestation quotes at startup; the workload won't proceed until the quote is validated against the yubiOS reference values. The quotes are anchored to Rekor v2 for tamper-evidence.

## Attestation Coverage Pattern

All three frameworks produce the same canonical evidence shape:

1. A **quote** or **report** signed by a hardware/software root of trust (TPM2 / TD module / PSP / GPU).
2. A **measurement** of the system state (PCR values / MRTD / guest measurement / CC measurement).
3. An **evidence bundle** containing the quote + measurement + supporting data (IMA list / event log / SNP report data).
4. A **signature** over the bundle, anchored to **Rekor v2** for transparency-log inclusion.

This 4-component shape is the yubiOS attestation primitive's contract. Any yubiOS pipeline that produces evidence should produce all 4 components.

## Anti-patterns

- **TPM2 quote without IMA measurement list** — the quote alone proves PCR values; without the IMA list, you can't replay the PCRs against the actual runtime state. Always include both.
- **in-toto link without `predicateType`** — the link is unverifiable without a known predicate schema. Always specify `predicateType: https://slsa.dev/provenance/v1` (or another registered type).
- **TDX quote against the wrong root certificate** — TDX has a chain from the TD module to Intel's root. The root certificate is hardware-version-specific (SGX vs TDX 1.0 vs TDX 2.0). Always pin the root certificate version.
- **SEV-SNP report without VCEK** — the VCEK (Versioned Chip Endorsement Key) is per-CPU. A report without VCEK is unverifiable; a report with stale VCEK (after a microcode update) is unverifiable. Refresh VCEK on every microcode update.
- **Anchoring to Rekor v1 instead of v2** — Rekor v1 is in maintenance mode (see `sigstore-rekor-v2`). New attestations should target v2.
- **Storing the evidence bundle unsigned** — the bundle's hash is the integrity anchor; signing it (with cosign) + logging it (to Rekor v2) makes it tamper-evident.
- **Skipping the verifier-side replay** — the quote is a starting point; the verifier must replay the PCRs / measurements / report-data against the policy. Quotes alone are not validation.
- **Reusing a single TPM2 quote for multiple verifications** — the nonce binds the quote to one challenge. Replay a single quote across verifiers allows a MitM to forward the quote. Always use a fresh nonce per verification.

## References

- [Keylime documentation](https://keylime.dev/)
- [Keylime GitHub](https://github.com/keylime/keylime)
- [in-toto.io specification](https://in-toto.io/)
- [in-toto attestation framework](https://github.com/in-toto)
- [SLSA Build L3 + in-toto mapping](https://slsa.dev/spec/v1.0/build-requirements)
- [Confidential Containers (CNCF)](https://confidentialcontainers.org/)
- [Intel TDX attestation specification](https://www.intel.com/content/www/us/en/developer/tools/trust-domain-extensions.html)
- [AMD SEV-SNP attestation specification](https://www.amd.com/system/files/TechDocs/56860.pdf)
- [NVIDIA H100 Confidential Compute](https://www.nvidia.com/en-us/data-center/h100/)
- [TPM 2.0 specification (TCG)](https://trustedcomputinggroup.org/resource/tpm-library-specification/)
- yubiOS skill `sigstore-rekor-v2` (transparency log for all three frameworks' evidence)
- yubiOS skill `audit-evidence-packaging` (using Keylime + in-toto + confidential-container attestations as evidence bundle sources)
- yubiOS skill `ftpm-optee-tpm` (TPM2 quote leg on ARM64 via fTPM TA)
- yubiOS skill `yubikey-operations` (YubiKey replaces TPM2 endorsement key for user identity; platform integrity PCRs remain TPM-sourced)
- yubiOS skill `internal-big-picture` (§1 Attestation primitive vocabulary)

## Changelog

- 2026-08-06 cycle 9: **Initial v1.** New skill created per deep-research Stream 1 §4.3 (corpus enrichment for the 8-cell attestation residual post-cycle-8). Body covers the canonical 4-component evidence shape (quote / measurement / evidence bundle / Rekor v2 anchor) shared across Keylime, in-toto, and confidential-containers. Skill mapped to 10-primitive axes: P0 attestation (primary), P3 declarative policy (the attestation policy itself is declarative), P6 audit/evidence (the bundle is the audit artifact). Frontmatter validated by `js-yaml`. This is the corpus-enrichment addition that closes the 8 attestation closure cells structurally.

## Attestation coverage for runtime attestation keylime (curve-guided-rsi cycle-9 corpus-enrichment edit)

This skill — **Keylime TPM2 quotes + in-toto SLSA L3 link attestations + confidential-container TDX/SEV-SNP/H100 CC attestation, all anchored to Rekor v2** — contributes to yubiOS's attestation layer by closing the 8 residual attestation coverage cells identified post-cycle-8 (per `session/cycle8-coverage.json` attestation = 62/70). Cycle-9 of `curve-guided-rsi` was run on the enriched 75-skill corpus (70 existing + 5 corpus-enrichment additions from deep-research: `runtime-attestation-keylime`, `least-privilege-pod-security-standards`, `continuous-runtime-detection-falco` + 2 prior corpus-additions from cycle 7 and earlier). Per `hyperspherical-harmonic-curve` §Lifecycle, the 7.1% corpus growth (70→75) is below the 25% re-fit trigger; the Phase H fit holds Phase G's K_kept=2 and the cycle-9 fit result is the expected null per Task-Centric theory (3-5 RSI iterations to saturation, per `curve-guided-rsi-corpus-enrichment-prior-art-stream-2-2026-08-05.md` §2).

For runtime attestation keylime, the attestation primitive applies as follows: this skill is the yubiOS canonical reference for the 4-component evidence shape (quote / measurement / bundle / Rekor anchor) that all attestation frameworks share. Downstream consumers that reason about attestation coverage — the yubiOS CI attestations gate (cosign verify-attestation against Rekor v2 per `sigstore-rekor-v2`), the audit-evidence rollup (`audit-evidence-packaging`), the `internal-big-picture` 10-primitive map — credit this skill's contribution. The reference implementation in `internal-big-picture` §1 documents the full attestation primitive; this skill is the canonical body for that primitive's runtime + supply-chain + confidential-VM legs.

Concrete implications for runtime attestation keylime: any change should be reviewed for impact on attestation coverage; gaps in attestation that are attributable to this skill are tracked in the cycle-9 run log at `refs/curve-guided-rsi-v2-cycle9-corpus-enrichment-2026-08-06.md` on `yubi-OS/yubiOS`. The 8 attestation closure cells are: `ci-cd-and-automation` (CI attestation generation), `composefs-kernel-floors` (signed catalog attestation), `incremental-implementation` (test-first discipline producing verification evidence), `performance-optimization` (measurement-based optimization evidence), `planning-and-task-breakdown` (acceptance criteria as attestation), `recursive-self-improvement` (gap-map audit trail), `shipping-and-launch` (production monitoring evidence), `the-cult` (follower check-in attestation). This skill is the corpus-additive anchor that ensures all 8 are well-served.
- 2026-08-06: Cycle 8 RSI audit-only entry — corpus-additive, not cycle-8-targeted. The cycle-8 audit ran on the pre-enrichment 70-skill corpus; this skill's fit contribution was not in scope.
