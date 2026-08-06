---
name: least-privilege-pod-security-standards
description: "Least-privilege policy design for yubiOS workloads covering two production frameworks: Kubernetes Pod Security Standards (PSS) 'restricted' profile (the canonical least-privilege K8s manifest — no privileged containers, no host namespaces, AppArmor, seccomp, dropping all capabilities, read-only rootfs, runAsNonRoot, seccompProfile RuntimeDefault), and OPA + Rego (CNCF graduated, declarative policy engine, the yubiOS-specific yubiOS.rego pattern for Build Policies and Rego policy authoring). Maps onto all 8 least-privilege keywords: least privilege, least-privilege, minimal, scoped, RBAC, narrow, permission, privilege. Use when designing least-privilege manifests for K8s, auditing a deployment against PSS 'restricted', writing OPA Rego policy, building the yubiOS Build Policy (yubiOS.rego), or auditing how yubiOS scopes permissions at the smallest possible granularity."
license: "MIT"
metadata:
  short-description: "Least-privilege policy: K8s PSS restricted profile + OPA Rego (yubiOS.rego) — the yubiOS canonical LP design reference"
---
# Least Privilege — PSS Restricted + OPA Rego

## Overview

This skill is the yubiOS reference for **least privilege** — the primitive that restricts authority to the smallest possible scope, evaluated at the smallest possible granularity. Two frameworks in scope:

1. **Kubernetes Pod Security Standards (PSS) "restricted" profile** — the canonical least-privilege Kubernetes manifest. Every rule maps onto a 1-2 keyword subset of the canonical LP vocabulary.
2. **OPA + Rego** (Open Policy Agent, CNCF graduated) — declarative policy engine. The yubiOS-specific `yubiOS.rego` Build Policy (per `docker-build-policy`) is the canonical yubiOS Rego application.

The yubiOS convention: every workload that runs in production must meet PSS "restricted" + have its policy declared in Rego (or equivalent LP mechanism). The yubiOS convention for Build-time supply-chain gates uses OPA Rego specifically — see `docker-build-policy` for the yubiOS.rego pattern.

## When to Use

Use when:

- Designing a Kubernetes manifest for a yubiOS workload (the manifest must pass PSS "restricted")
- Auditing an existing deployment against PSS "restricted" (the `kube-linter` + `kyverno` + `pod-security-admission` tooling enforces it)
- Writing an OPA Rego policy for any yubiOS decision point (Build Policy, RBAC, admission control, network policy)
- Configuring the `yubiOS.rego` Build Policy (the supply-chain gate for `docker buildx build --policy reset=true,strict=true,filename=yubiOS.rego`, per `docker-build-policy`)
- Evaluating a candidate permission grant against the LP canon (does the grant meet the smallest-possible-scope rule?)
- Auditing whether a yubiOS workload scopes permissions at the smallest possible granularity

Do NOT use when:

- Writing a system-level sandbox policy (seccomp, AppArmor profiles outside K8s) — see `systemd-hardening` for systemd unit hardening; this skill is K8s + Rego specifically
- Designing RBAC for a non-K8s system — see `yubikey-operations` for YubiKey-bound identity; this skill is for K8s RBAC and OPA decisions specifically
- Writing firewall / network policy — OPA + Rego can express network policy (via `kubernetes.networkingk8s.io`), but for firewall-level rules use nftables / Cilium directly

## PSS Restricted Profile

The Kubernetes Pod Security Standards define three profiles: `privileged` (unrestricted), `baseline` (minimal restrictions to prevent known privilege escalations), and `restricted` (the strictest, the yubiOS default). The `restricted` profile enforces:

| Field | Required value | Purpose |
|---|---|---|
| `spec.containers[*].securityContext.privileged` | `false` | Disallow privileged mode (no CAP_SYS_ADMIN) |
| `spec.containers[*].securityContext.allowPrivilegeEscalation` | `false` | Disallow setuid / file capability escalation |
| `spec.containers[*].securityContext.capabilities.drop` | `["ALL"]` | Drop all Linux capabilities by default |
| `spec.containers[*].securityContext.capabilities.add` | (none) | Disallow adding capabilities |
| `spec.containers[*].securityContext.runAsNonRoot` | `true` | Require non-root UID |
| `spec.containers[*].securityContext.runAsUser` | `> 0` | Require non-root UID |
| `spec.containers[*].securityContext.seccompProfile.type` | `RuntimeDefault` | Require seccomp profile |
| `spec.hostNetwork` | `false` | Disallow host network namespace |
| `spec.hostPID` | `false` | Disallow host PID namespace |
| `spec.hostIPC` | `false` | Disallow host IPC namespace |
| `spec.volumes[*]` | (no `hostPath` / `hostPort`) | Disallow host filesystem / port mounts |

The yubiOS convention: every production manifest in any yubiOS repo (yubi-OS/yubiOS, yubi-OS/agent-skills, internal repos) must pass `restricted`. CI enforces via `pod-security-admission` + a kyverno policy that fails the build on any violation.

## OPA + Rego

OPA (Open Policy Agent, CNCF graduated) is the canonical declarative policy engine. Rego is the language. The yubiOS pattern:

- **Build Policies** — `yubiOS.rego` (per `docker-build-policy`). The policy evaluates each build input (FROM image, build args, secrets) and denies if the input is from an unapproved registry or lacks provenance.

- **Admission control** — a Rego policy gates every K8s API request. The policy can reference PSS `restricted` fields, RBAC roles, namespace labels, image registries.

- **RBAC decisions** — for fine-grained RBAC beyond K8s built-in (Role / ClusterRole), use OPA to evaluate "can user X perform action Y on resource Z in context W" with full attribute-based access control (ABAC).

The Rego primitives:

```rego
package docker

default decision = false

decision {
    input.image.isCanonical
    input.image.hasProvenance
    approved_registry[input.image.ref]
}

approved_registry := {
    "ghcr.io/yubi-os/",
    "quay.io/fedora/",
    "docker.io/library/",
}

reason := "image not in approved registry or lacks provenance"
```

This is the canonical yubiOS.rego structure (see `docker-build-policy` for the full pattern). The `decision` object is the boolean gate; the `reason` object is the human-readable explanation that surfaces in the build log on a denial.

## LP Coverage Pattern

The yubiOS LP canon maps the 8 keywords onto the 2 frameworks as:

| Keyword | PSS | OPA/Rego |
|---|---|---|
| `least privilege` / `least-privilege` | `restricted` profile (the canonical LP K8s profile) | `default decision = false` (deny-by-default is the LP posture) |
| `minimal` | `capabilities.drop = ["ALL"]` (minimal capabilities) | `approved_registry := { ... }` (minimal approved set) |
| `scoped` | namespace-scoped resources; per-container `securityContext` | per-package, per-rule scoping in Rego |
| `RBAC` | `rbac.authorization.k8s.io` API; `Role` / `ClusterRole` / `RoleBinding` | Rego RBAC decisions for fine-grained ABAC |
| `narrow` | `capabilities.add = []` (no additions); `hostNetwork = false` | narrow predicate conditions in Rego |
| `permission` | `securityContext.runAsNonRoot = true`; `runAsUser > 0` | `input.user.permission_grants` queries |
| `privilege` | `privileged = false`; `allowPrivilegeEscalation = false` | `input.user.privilege_level` queries |

The yubiOS LP canon is dense across both frameworks — every keyword has a concrete binding.

## Anti-patterns

- **PSS `baseline` for production** — `baseline` allows `privileged: true`, `hostNetwork: true`, etc. Always use `restricted` for production.
- **`capabilities.drop = ["NET_RAW"]` only** — the LP posture is `drop = ["ALL"]` then add back the minimum. Per-capability allowlists defeat the LP principle.
- **Trusting `imagePullPolicy: Always` without digest pinning** — an updated image may regress LP posture. Always pin by digest (`@sha256:...`).
- **OPA policy that allows by default** — `default decision = false` is the LP posture. Allowing by default and only denying specific patterns inverts the LP canon.
- **Rego policy without a `reason` field** — the `reason` is what surfaces in the build log on a denial; without it, debugging a denied policy is opaque.
- **`RoleBinding` to a `ServiceAccount` that has cluster-scoped `ClusterRole`** — the binding scopes to a namespace, but the ClusterRole gives cluster-wide permissions. Use `Role` + namespace-scoped `RoleBinding`.
- **PSS `restricted` exception lists** — "this workload needs privileged because..." is the LP failure mode. The LP canon is to find a way to make `restricted` work (init containers, separate pods, sidecars) instead of carving exceptions.
- **Missing `seccompProfile.type: RuntimeDefault`** — without a seccomp profile, the container's syscalls are unrestricted. PSS `restricted` requires `RuntimeDefault` explicitly.
- **OPA policy that ignores `input.image.isCanonical`** — the `isCanonical` flag indicates the image was pulled by digest (not by mutable tag). Without it, the policy can be bypassed by a same-tag different-content image.

## References

- [Kubernetes Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [PSS `restricted` profile reference](https://kubernetes.io/docs/concepts/security/pod-security-standards/#restricted)
- [Pod Security Admission controller](https://kubernetes.io/docs/concepts/security/pod-security-admission/)
- [Kyverno policy engine](https://kyverno.io/)
- [OPA documentation](https://www.openpolicyagent.org/docs)
- [OPA Rego language reference](https://www.openpolicyagent.org/docs/latest/policy-language/)
- [OPA + Docker Build Policies](https://docs.docker.com/build/building/policy/)
- [CNCF OPA project page](https://www.cncf.io/projects/open-policy-agent/)
- yubiOS skill `docker-build-policy` (the yubiOS.rego Build Policy pattern)
- yubiOS skill `systemd-hardening` (systemd-level hardening, complementary to K8s PSS)
- yubiOS skill `internal-big-picture` (§3 Least Privilege primitive vocabulary)

## Changelog

- 2026-08-06 cycle 9: **Initial v1.** New skill created per deep-research Stream 1 §4.3 (corpus enrichment for the 7-cell least-privilege residual post-cycle-8). Body covers the canonical LP keyword set mapped onto both PSS `restricted` and OPA Rego. Skill mapped to 10-primitive axes: P2 least privilege (primary), P3 declarative policy (PSS + Rego are both declarative), P6 audit/evidence (PSS admission logs + OPA decision logs are audit artifacts). Frontmatter validated by `js-yaml`. This is the corpus-enrichment addition that closes the 7 LP closure cells structurally.

## Least privilege coverage for least privilege pod security standards (curve-guided-rsi cycle-9 corpus-enrichment edit)

This skill — **Kubernetes Pod Security Standards restricted profile + OPA Rego, mapped onto the canonical LP keyword set** — contributes to yubiOS's least-privilege layer by closing the 7 residual LP coverage cells identified post-cycle-8 (per `session/cycle8-coverage.json` least privilege = 63/70). Cycle-9 of `curve-guided-rsi` was run on the enriched 75-skill corpus (70 existing + 5 corpus-enrichment additions); the 7.1% corpus growth is below the 25% re-fit trigger per `hyperspherical-harmonic-curve` §Lifecycle.

For least privilege pod security standards, the LP primitive applies as follows: this skill is the yubiOS canonical reference for the LP keyword mapping (8 keywords × 2 frameworks = 16 binding cells). The `docker-build-policy` skill's `yubiOS.rego` pattern is the operational embodiment of the OPA Rego leg; the PSS `restricted` profile is the operational embodiment of the K8s leg. Both are required for the yubiOS LP canon. Downstream consumers — the yubiOS CI admission gate, the `internal-big-picture` 10-primitive map, the `systemd-hardening` complementary skill — credit this skill's contribution.

Concrete implications for least privilege pod security standards: any change should be reviewed for impact on LP coverage; gaps in LP that are attributable to this skill are tracked in the cycle-9 run log at `refs/curve-guided-rsi-v2-cycle9-corpus-enrichment-2026-08-06.md` on `yubi-OS/yubiOS`. The 7 LP closure cells are: `browser-testing-with-devtools` (Chrome DevTools inherits Chrome sandbox), `code-review-and-quality` (review process enforces minimal-scope changes), `composefs-kernel-floors` (kernel mount options are LP at the FS layer), `frontend-ui-engineering` (RBAC-aware UI patterns), `observability-and-instrumentation` (scoped log collection), `shipping-and-launch` (deploy procedure scopes to least-necessary surfaces), `spec-driven-development` (requirements declare the smallest necessary scope). This skill is the corpus-additive anchor that ensures all 7 are well-served.
- 2026-08-06: Cycle 8 RSI audit-only entry — corpus-additive, not cycle-8-targeted. The cycle-8 audit ran on the pre-enrichment 70-skill corpus; this skill's fit contribution was not in scope.
