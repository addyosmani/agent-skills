---
id: sec-slsa
title: SLSA (software supply-chain integrity)
owner: security-audit
version: 1.0.0
status: enabled
tier: recommended
applies_when:
  - build or release pipeline in scope
  - artifact provenance or dependency integrity questioned
  - CI/CD configuration under review
why: The assurance ladder for build/source/dependency tamper-resistance — the lens for "can someone poison our pipeline?"
last_reviewed: 2026-06-12
changelog:
  - "1.0.0 (2026-06-12): initial release"
---

# SLSA — Supply-chain Levels for Software Artifacts

## Coverage

Four-level assurance framework for software-supply-chain integrity: provenance and
tamper-resistance across **builds, sources, and dependencies**. Level 1 (provenance
exists) through Level 4 (hermetic, two-person-reviewed builds).

## What to assess

- **Build provenance** — are artifacts traceable to the source revision and build
  instructions that produced them? Is provenance signed and verifiable?
- **Build platform integrity** — can a workflow or contributor tamper with the
  build (script injection in CI config, untrusted inputs to privileged steps,
  poisoned caches, self-hosted runner exposure)?
- **Source integrity** — branch protection, review requirements, force-push and
  history-rewrite controls on release branches.
- **Dependency ingestion** — lockfiles, pinned versions/digests, registry trust,
  install-script exposure.
- Place the pipeline on the SLSA ladder and tag findings `SLSA:L<n>` with the gap
  to the next level.

## Cross-map anchors

- Pairs with **SSDF** (secure-development practices) — SLSA covers the artifact
  path, SSDF the practices around it.
- Supply-chain findings feed **NIST 800-161 (C-SCRM)** and the supply-chain
  families of 800-53 Rev 5 on the compliance side.

## Coverage limits

Assess against the published SLSA v1.0 track/level definitions; if a platform's
specific attestation format is unfamiliar, verify what's actually emitted rather
than assuming conformance from tooling names.
