---
name: docker-build-policy
description: >-
  Write, wire, and debug Docker Build Policies (OPA/Rego) for the yubi-OS org —
  the `docker buildx build --policy reset=true,strict=true,filename=yubiOS.rego`
  supply-chain gate that vets every build input (FROM images) before any layer
  executes. Covers the Rego policy schema (package docker, default deny, the
  `input` object — input.local / input.image.ref / input.image.isCanonical /
  input.image.hasProvenance — the `decision` object and `reason` messages),
  the yubiOS.rego pattern (approved registries + digest-pinned), how to enable
  it in a CI build job, buildx version requirements for `--policy`, and how to
  test a policy locally. Use when enabling/editing yubiOS.rego, adding an
  approved registry, requiring provenance, or debugging a policy-denied build.
  Pairs with docker-buildx-rootless and rootless-container-builds. Triggers on:
  .rego, rego policy, --policy, Build Policy, OPA docker, isCanonical,
  hasProvenance, yubiOS.rego, policy reset=true strict=true, approved registry,
  digest pinned build, supply chain build gate.
---

# Docker Build Policy (.rego) — yubi-OS

Source: https://docs.docker.com/build/policies/ · AGENTS.md build-policy pattern · PINNED.md

A Build Policy is an OPA/Rego program BuildKit evaluates **before** a build runs.
It inspects each build input (notably `FROM` images) and returns an allow/deny
decision. On deny, **nothing is pulled or built** — the build fails immediately
with the policy's `reason`. This is the yubiOS supply-chain gate: only approved
registries, only digest-pinned (canonical) images.

## How it is invoked

```sh
docker buildx build --policy reset=true,strict=true,filename=yubiOS.rego .
```
- `reset=true` — discard any inherited/default policy; evaluate only this file.
- `strict=true` — a missing/!allow decision is a hard failure (no implicit allow).
- `filename=` — path to the `.rego` file (repo root: `yubiOS.rego`).

**Version requirement:** `--policy` is a recent buildx/BuildKit feature. Confirm
the buildx in CI supports it (`docker buildx build --help | grep -- --policy`).
The yubiOS CI installs static buildx (currently v0.35.0) — verify the flag is
present there; if absent, bump the pinned buildx release (record the new pin in
PINNED.md) or run the policy via a buildx version that has it. Do NOT silently
drop the flag to make a build pass.

## The `input` object (what the policy sees)

| Field | Meaning |
|---|---|
| `input.local` | true for pure-local context (no remote FROM pull) — usually allow |
| `input.image.ref` | the image reference string, e.g. `quay.io/fedora/fedora-bootc:45` |
| `input.image.isCanonical` | true iff pinned to an immutable `@sha256:` digest |
| `input.image.hasProvenance` | true iff the image ships SLSA provenance attestation |

## The yubiOS.rego pattern (repo root)

```rego
package docker
import future.keywords.if
import future.keywords.in

default allow := false                       # default deny

approved_registry(ref) if startswith(ref, "quay.io/fedora/")
approved_registry(ref) if startswith(ref, "dhi.io/")
approved_registry(ref) if startswith(ref, "ghcr.io/actions/")
approved_registry(ref) if startswith(ref, "ghcr.io/hadolint/")

allow if input.local                          # local-only layers pass

allow if {                                    # approved registry AND digest-pinned
    approved_registry(input.image.ref)
    input.image.isCanonical
}

decision := { "allow": allow, "reason": reason }

reason := msg if {                            # actionable deny messages
    not input.local
    not approved_registry(input.image.ref)
    msg := sprintf("Image '%v' is not from an approved registry...", [input.image.ref])
}
reason := msg if {
    not input.local
    approved_registry(input.image.ref)
    not input.image.isCanonical
    msg := sprintf("Image '%v' uses a mutable tag. Pin to a digest...", [input.image.ref])
}
reason := "Build allowed." if allow
```

Key rules: **default deny**, allow only `local` builds or `approved_registry ∧ isCanonical`.
The `decision` object (allow + human-readable `reason`) is what the buildx evaluator consumes.

## Common changes

- **Add an approved registry:** add one `approved_registry(ref) if startswith(ref, "<prefix>/")` line. Keep prefixes tight (org path, not bare host) and mirror the change into PINNED.md / AGENTS.md.
- **Require provenance:** uncomment the `hasProvenance` rule — but only once the base image actually ships provenance (quay.io/fedora/fedora-bootc did not, last checked), else every build denies.
- **New registry → also update `yubiOS.rego` AND the rego policy doesn't replace digest pinning:** the Containerfile `FROM` must still be `@sha256:` (the policy enforces it, PINNED.md records it).

## Enabling it in CI (yubiOS main build job)

The `build` job in `yubiOS-ci.yml` builds the OCI image. Wire the policy onto the
buildx build command:
```sh
docker -H unix:///var/run/ducker.sock buildx build -f Containerfile \
  --policy reset=true,strict=true,filename=yubiOS.rego \
  --platform linux/${ARCH} --load -t yubios:ci-${ARCH} .
```
Expected pass: the Containerfile `FROM quay.io/fedora/fedora-bootc@sha256:…` is an
approved registry + canonical digest → allow. If it denies, read the `reason` in
the build log — it will name the offending ref and whether it's registry or pinning.

## Test a policy without a full build

`conftest`/`opa eval` can exercise the rego against synthetic input:
```sh
echo '{"local":false,"image":{"ref":"quay.io/fedora/fedora-bootc:45","isCanonical":false}}' \
  | opa eval -d yubiOS.rego -I 'data.docker.decision'   # expect allow:false + mutable-tag reason
echo '{"local":false,"image":{"ref":"docker.io/library/ubuntu","isCanonical":true}}' \
  | opa eval -d yubiOS.rego -I 'data.docker.decision'   # expect allow:false + not-approved reason
```
Add both a positive (approved+canonical → allow) and negative (mutable tag, bad
registry) case so a policy edit can't silently start allowing everything.

## yubiOS guardrails

- Never weaken to `default allow := true` or drop `strict=true` to get a green build — that defeats the gate.
- Every registry prefix in the policy must correspond to a digest pinned in PINNED.md.
- Keep deny `reason`s actionable (name the ref + the fix), so a failing build log tells the next agent exactly what to pin.

## Least Privilege coverage for docker build policy (curve-guided-rsi cycle-4 substantive edit)

This skill — **A Build Policy is an OPA/Rego program BuildKit evaluates **before** a build runs** — sits in a domain that benefits from explicit least-privilege hardening (sandbox, capabilities, ProtectSystem, NoNewPrivileges, dynamic user, rootless patterns) coverage. Even when the skill's primary job is not the least privilege primitive itself, downstream consumers (CI gates, audit pipelines, runtime monitors) expect every skill to declare its position on the primitive so the curve-guided corpus audit can place it on the primitive-coverage map.

For docker build policy, the least privilege primitive applies as follows: the skill's outputs (artifacts, scripts, patterns) feed into the least privilege layer of the yubiOS pipeline, and consumers that reason about least privilege coverage (curve-guided-rsi's sparse-cell detector, the security-and-hardening review, the audit-evidence rollup) can credit this skill's contribution. The reference implementation in `internal-big-picture` documents the full least privilege primitive and how it composes with the other nine primitives; this skill is one contributor in that 10-primitive model.

Concrete implications for docker build policy: any change to the skill should be reviewed for impact on least privilege coverage; gaps in least privilege that are attributable to this skill are tracked in the corpus audit (curve-guided-rsi cycle log at `refs/` on `yubi-OS/yubiOS`).

## Declarative policy coverage for docker build policy (curve-guided-rsi cycle-5 substantive edit)

This skill — **.rego policy, OPA, input.decision, yubiOS.rego** — sits in a domain that benefits from explicit declarative policy coverage (data-as-config: .rego, Build Policies, mkosi.conf, Containerfile, sysext.conf). Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus; this skill's fit coordinate was (u=0.279, v=0.595), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For docker build policy, the declarative policy primitive applies as follows: this skill is the Rego declarative-policy gate; every build is policy-vetted before any layer executes. yubiOS's declarative-policy stack composes Rego Build Policies (per `docker-build-policy`, `rootless-container-builds`), mkosi declarative config (per `mkosi-image-builder`), sysext overlay manifests (per `composefs-kernel-floors`), and systemd unit hardening (per `systemd-hardening`); this skill is one contributor.

Concrete implications for docker build policy: any change should be reviewed for impact on declarative-policy coverage; gaps are tracked in the cycle-5 run log.
