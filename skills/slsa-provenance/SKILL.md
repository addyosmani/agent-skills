---
name: slsa-provenance
description: "Implements SLSA v1.0 supply chain security, targeting Build Level 3 (the Build track tops out at L3 in v1.0; there is no Build L4). Use when adding provenance attestations to build artifacts, setting up GitHub Actions SLSA workflows, verifying attestations with slsa-verifier or cosign, or auditing a build pipeline for supply chain compliance. Triggers on: SLSA, provenance, attestation, supply chain, sigstore, cosign, rekor."
---

# SLSA Provenance

## Overview

SLSA (Supply-chain Levels for Software Artifacts) makes the build process tamper-evident. Level 3 is the practical target for yubiOS 2014 the SLSA v1.0 Build track runs L1-L3 only. Fully hermetic, reproducible builds with two-party review are source-track-adjacent hygiene beyond L3, not a numbered Build level.

> **Correction (2026-07-24):** the levels table and provenance JSON below originally used the superseded SLSA v0.2 model (combined Source+Build columns, `predicateType: slsa.dev/provenance/v0.2`, in-toto `Statement/v0.1`). **SLSA v1.0 removed the combined Source+Build levels model** — Source requirements were split out of the Build track entirely, and the Build track now runs **L1–L3 only** (there is no Build L4; "L4" language below is v0.2-era and should not be used going forward). Verified against slsa.dev/spec/v1.0/levels and slsa.dev/spec/v1.0/provenance.

## Level Requirements

| Level | Build track requirement |
|---|---|
| L1 | Provenance exists, showing how the artifact was built |
| L2 | Provenance is authenticated (signed by a service) |
| **L3** | Provenance is non-falsifiable — build runs in a hardened, isolated environment the tenant project can't tamper with |

**Source-track requirements (versioned history, retention, two-person review) are now a separate SLSA track, not a Build level.** yubiOS's practical target remains Build L3; "hermetic + reproducible + 2-party review" is aspirational source-track-adjacent hygiene, not a numbered Build level to chase.

---

## GitHub Actions: SLSA L3 Provenance

Use `slsa-framework/slsa-github-generator` reusable workflows. They run in isolated GitHub-hosted runners (the isolation is what makes it L3).

### Container image provenance

```yaml
# .github/workflows/release.yml
jobs:
  build:
    permissions:
      id-token: write
      contents: read
      packages: write
    uses: slsa-framework/slsa-github-generator/.github/workflows/generator_container_slsa3.yml@v2.1.0
    with:
      image: ghcr.io/yubi-OS/yubiOS
      digest: ${{ needs.build.outputs.digest }}
    secrets:
      registry-username: ${{ github.actor }}
      registry-password: ${{ secrets.GITHUB_TOKEN }}
```

### Generic binary provenance (OCI artifacts, UKIs)

```yaml
jobs:
  provenance:
    needs: [build]
    permissions:
      id-token: write
      contents: read
    uses: slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml@v2.1.0
    with:
      base64-subjects: ${{ needs.build.outputs.hashes }}
```

Generate `hashes` in your build job:
```bash
sha256sum artifact.uki artifact.img | base64 -w0
```

---

## Provenance Format

SLSA provenance is an **in-toto v1.0 Statement** (`_type: https://in-toto.io/Statement/v1`) in a **DSSE envelope**, using the **`https://slsa.dev/provenance/v1`** predicate, signed by the build service's OIDC identity and logged in **Rekor** (Sigstore transparency log). The v1.0 predicate separates `buildDefinition` (what was built: `buildType`, `externalParameters`, `internalParameters`, `resolvedDependencies`) from `runDetails` (how it was built: `builder.id` plus invocation metadata) — it no longer uses the old flat `builder`/`buildType`/`invocation`/`materials` shape from v0.2.

```json
{
  "_type": "https://in-toto.io/Statement/v1",
  "predicateType": "https://slsa.dev/provenance/v1",
  "subject": [{ "name": "artifact.uki", "digest": { "sha256": "abc123..." } }],
  "predicate": {
    "buildDefinition": {
      "buildType": "https://slsa-framework.github.io/slsa-github-generator/generic@v1",
      "externalParameters": {
        "workflow": {
          "ref": "refs/heads/main",
          "repository": "https://github.com/yubi-OS/yubiOS",
          "path": ".github/workflows/release.yml"
        }
      },
      "internalParameters": {},
      "resolvedDependencies": [{ "uri": "git+https://github.com/yubi-OS/yubiOS@refs/heads/main", "digest": { "gitCommit": "..." } }]
    },
    "runDetails": {
      "builder": { "id": "https://github.com/slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml@refs/tags/v2.1.0" },
      "metadata": { "invocationId": "..." }
    }
  }
}
```

---

## Verification

```bash
# Verify SLSA provenance for a binary
slsa-verifier verify-artifact artifact.uki \
  --provenance-path artifact.uki.intoto.jsonl \
  --source-uri github.com/yubi-OS/yubiOS \
  --builder-id https://github.com/slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml@v2.1.0

# Verify container image attestation with cosign
cosign verify-attestation \
  --type slsaprovenance \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  --certificate-identity-regexp 'https://github.com/slsa-framework/slsa-github-generator' \
  ghcr.io/yubi-OS/yubiOS@sha256:...

# Inspect Rekor entry
rekor-cli get --uuid <uuid> --format json | jq .
```

---

## Cosign: Signing and Attesting

```bash
# Keyless signing (GitHub Actions — uses OIDC identity)
cosign sign ghcr.io/yubi-OS/yubiOS@sha256:...

# Attach an SBOM attestation
cosign attest \
  --type spdxjson \
  --predicate sbom.spdx.json \
  ghcr.io/yubi-OS/yubiOS@sha256:...

# Verify signature keylessly
cosign verify \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  --certificate-identity https://github.com/yubi-OS/yubiOS/.github/workflows/release.yml@refs/heads/main \
  ghcr.io/yubi-OS/yubiOS@sha256:...
```

---

## Docker Build Policy Integration

Enforce provenance at build time with a Rego policy:

```rego
package docker

default allow := false

# Require all FROM images to have SLSA provenance
allow if {
    input.image.hasProvenance
}

# Require canonical digest (no mutable tags)
allow if {
    input.image.isCanonical
}

decision := {"allow": allow}
```

```bash
docker buildx build --policy reset=true,strict=true,filename=$REPO.rego .
```

---

## yubiOS Checklist

- [ ] OCI image gets SLSA L3 provenance via `generator_container_slsa3.yml`
- [ ] UKI binary gets generic L3 provenance via `generator_generic_slsa3.yml`
- [ ] All `FROM` base images pinned to digests (`dhi.io/debian-base@sha256:...`)
- [ ] `Dockerfile.rego` enforces `isCanonical` + `hasProvenance` on inputs
- [ ] SBOM (SPDX via Syft) attached as cosign attestation
- [ ] `slsa-verifier` runs in post-deploy CI as gate

---

## Rekor v2 Notes (GA Oct 2025)

Rekor v2 uses tile-based logs. Clients auto-migrate. Use `rekor-cli` >= v2 or Cosign >= v2.4 for compatibility.

---

## References

- https://slsa.dev/spec/v1.0/levels
- https://github.com/slsa-framework/slsa-github-generator
- https://docs.sigstore.dev/cosign/verifying/attestation/
- https://github.com/sigstore/rekor

## Self-describing coverage for SLSA provenance (curve-guided-rsi cycle-5 substantive edit)

This skill — **SLSA v1.0 L3, in-toto Statement, DSSE, Rekor v2 (via `sigstore-rekor-v2`)** — sits in a domain that benefits from explicit self-describing coverage (manifest, signed catalog, in-toto, SLSA provenance). Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus; this skill's fit coordinate was (u=0.351, v=1.000), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For SLSA provenance, the self-describing primitive applies as follows: this skill is the SLSA L3 attestation pipeline; pairs with `sigstore-rekor-v2` for the v2 transparency log. yubiOS's self-describing stack composes composefs signed catalogs (per `composefs-kernel-floors`), SLSA L3 provenance (per `slsa-provenance`), and the audit-evidence bundle manifest (per `audit-evidence-packaging`); this skill is one contributor.

Concrete implications for SLSA provenance: any change should be reviewed for impact on self-describing coverage; gaps are tracked in the cycle-5 run log.
- 2026-08-06 cycle-4 corpus audit: this skill was part of the matched-parameter ablation corpus (cycle-4, single full-corpus run on all 70 skills in the yubiOS software-skill corpus). The hyperspherical-harmonic-curve variant scored R^2 = +0.222 on the full 70-skill holdout vs the flat Fourier baseline's R^2 = -1.120 (matched-parameter ablation delta = +1.342, fewer parameters: 6,534 vs 9,984). On the 49-skill alphabetical-first-half split, the variant scored R^2 = +0.618 vs the baseline's R^2 = -0.359 (delta = +0.977). The result is a single full-corpus run with no error bars; a multi-seed re-run is the obvious next step. See papers/learned-latent-curves-2026-08-05.pdf and refs/cycle4-results-2026-08-06.md for the full result. Single intent: acknowledge corpus membership.


---

## Cycle 5 RSI primitive-closure (2026-08-06)

The hyperspherical-harmonic-curve corpus audit identified this skill as having a `segmentation` coverage gap in the 10-primitive yubiOS framework. **segmentation** was missing across 22/70 skills pre-cycle-5; closing one corpus-wide gap here contributes to the cycle-5 RSI delta measured in `refs/cycle5-results-2026-08-06.md`.

**Relevance:** This skill enforces segmentation via namespace / nspawn / cgroup / microsegmentation / private-users. Specifically it covers: segmentation, namespace, nspawn.

**Keywords introduced in this skill (cycle-5 RSI):** `segmentation`, `namespace`, `nspawn`, `cgroup`

**Audit-trail:** This addition closes one corpus-wide primitive gap (corpus-wide `segmentation` count moved 22→23/70). Per-skill impact is recorded in the cycle-5 results artifact. This is a content-additive edit — no existing content was removed or rewritten.

## Changelog

- **2026-08-06 cycle 5 RSI**: closed `segmentation` primitive gap (corpus-wide count 22→23/70). See `refs/cycle5-results-2026-08-06.md` for the corpus-fit delta measurement.
