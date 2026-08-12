---
name: nss-assumption-set
description: "Cycle-12 deep-research synthesis for the NSS Assumption set axis (5/12 in negative-skill-space). For each file, identifies WHAT it silently assumes: caller obligations (preconditions), runtime invariants, environment/platform dependencies, transitive dependency assumptions, system-trust assumptions, configuration prerequisites, domain assumptions, toolchain assumptions, and concurrency/rely assumptions. Use when a 12-axis NSS sweep lands on assumption_set as the highest-priority Extend gap, when documenting Eiffel/Design-by-Contract preconditions, when auditing SPARK Ada contracts, when investigating 'works on my machine' failures, when auditing dependency manifests (Cargo.toml, package.json, requirements.txt, pyproject.toml, Containerfile ARG/ENV, mkosi Setting=, systemd EnvironmentFile=, GitHub Actions workflow_call), or when a new maintainer asks 'what does this file require?'. NOT for inputs/outputs/mode/audience or any other NSS axis (use the matching nss-* skill or negative-skill-space)."
---

# nss-assumption-set

The **Assumption set** axis (5/12 of `negative-skill-space`) asks: **what must already be true for this file to work as presented?** It is the qualitative counterpart of the operational disciplines that go by the names "design by contract" (Eiffel/Meyer), "SPARK contracts" (AdaCore), "rely/guarantee reasoning" (Jones), and the implicit shared notion of "preconditions" in every language that has them. An assumption is a load-bearing proposition the file does not establish itself; if the proposition is false, the file's promised behavior is not available -- even if the file compiles, the test passes, and the doc reads well.

A gap exists when an assumption is **unstated, unowned, unverifiable, contradicted, stale, transitive, or not connected to the artifact that depends on it**. The cycle-12 NSS-assumption-set sweep applies this rubric to ~40 files in the yubiOS corpus, where each file gets ONE assumption_set-aware section added per lens-format patch (`## Assumption set -- cycle 12`).

## What Assumption set covers

For every file, script, skill, container, workflow, unit, or API operation, the assumption set is the complete surface of propositions that must hold for the file to do its work correctly. The eight channels and their distinctions:

| Channel | Examples |
|---|---|
| **Caller / preconditions** | What the user / operator / CI / caller must establish before invocation: tool versions, installed binaries, credentials, prior steps, signed-off prerequisites |
| **Runtime invariants** | Properties that must hold across the file's lifetime: monotonic clocks, entropy sources, immutable paths, idempotency keys |
| **Environment / platform** | OS distribution and version, kernel features (capabilities, namespaces, cgroup, cgroups v2, IOMMU, TPM, fTPM), CPU arch, GPU presence, firmware, secure-boot state |
| **Transitive dependencies** | Manifest entries, lockfile pins, package indices, BuildKit secrets, systemd EnvironmentFile= keys, container base image digests |
| **System / trust** | PCR values, key custodians, certificate chains, attestation availability, network reachability, mount-namespace privacy, root-of-trust |
| **Configuration prerequisites** | Defaults, prior configuration state, schema-version compatibility, lex-merged drop-in order, env-var precedence, mode flags |
| **Domain assumptions** | The model's truth claims: clock skew bounds, "Internet is reachable", "physical user present at the terminal", "the user can read English", "the device is in a well-ventilated room" |
| **Toolchain assumptions** | Compiler versions, linkers, language runtimes, `set -e` semantics, `errexit` and `pipefail`, parser dialect versions |

For each assumption, document:

| Field | What to record |
|---|---|
| `name` | Canonical key, plus aliases |
| `channel` | One of the eight above |
| `kind` | precondition / invariant / rely / guarantee / dependency / domain / toolchain / trust |
| `scope` | Build / test / development / staging / production / platform / feature / version range |
| `required` | yes / no / conditional (with the rule) |
| `default` | The default the implementation falls back to (or `none`) |
| `evidence` | Where the assumption is documented: `package.json` `os` field, `Cargo.toml` `[features]`, `Containerfile` `FROM`, `mkosi.conf` `[Distribution]`, `README.md` prerequisite list, test setup, ADR |
| `verification method` | Static check (regex / linter), proof (SPARK GNATprove), test (CI), install/build (smoke), inspection (peer review), runtime monitor (slog/audit), human confirmation (operator sign-off) |
| `owner` | The party responsible for establishing or preserving it (user, operator, CI, package maintainer, kernel, hardware vendor) |
| `impact if false` | Failure mode, incorrect result, security exposure, inability to execute, misleading documentation, silent wrong result |
| `stale indicator` | Time, version, OS release, kernel feature bit, or rotation event that signals the assumption is no longer current |
| `status` | `verified` / `unverified` / `inferred` / `contradicted` / `stale` / `missing` |

A useful rule: **raw assumption, verified assumption, and effective environment are three different things.** A good pipeline is `extract explicit assumptions -> infer hidden assumptions -> atomicise (one row per testable proposition) -> classify (precondition/invariant/rely/...) -> trace (link to evidence) -> validate (test/proof/inspect) -> find gaps by relation failure`. Never fold the eight channels together; never silently coerce a missing precondition into a "default of last resort".

## The four strongest prior-work frames

### Design by Contract (Eiffel / Bertrand Meyer)

The closest direct precedent. Meyer treats software construction as a sequence of documented contract decisions and distinguishes:

- **Preconditions (`require`)** -- obligations the client/caller must satisfy before invoking a routine. The caller establishes them; the routine is allowed to assume them.
- **Postconditions (`ensure`)** -- guarantees the supplier/routine provides after a correct call. The supplier establishes them; the caller is allowed to rely on them.
- **Class invariants (`invariant`)** -- properties that must hold in every externally observable valid state. Preserved by every exported routine, ensured by every creation procedure.

The `old` expression in postconditions lets the routine reference entry-time values, which is what makes postconditions testable rather than narrative. The "short form" facility extracts an implementation-independent interface containing exported features and their preconditions/postconditions/invariants, which makes the contract the documentation. EiffelStudio's `contract` view is the prior art for "the file IS the contract". The Eiffel subcontracting rule (`require else` / `ensure then`) is the prior art for "redefined routines may weaken preconditions or strengthen postconditions, never the reverse".

Practical implication for NSS-assumption-set:

| Contract concept | Gap-finding interpretation |
|---|---|
| Precondition | What the caller / operator / CI must already know, install, configure, or preserve |
| Postcondition | What the artifact promises the user will obtain |
| Invariant | What must remain true across edits, executions, states, or versions |
| Contract violation | A concrete usability, correctness, or documentation gap |
| Contract participant | The person, tool, environment, or neighboring artifact responsible for the assumption |

Do not silently turn a missing postcondition into a user obligation. That is the single most common gap-finding error in this axis.

### SPARK Ada contracts

SPARK Ada makes the same distinction operational through modular deductive verification. A subprogram is analyzed using the contracts of called subprograms rather than their implementations; preconditions must be strong enough to make the subprogram safe and verifiable, and postconditions must be precise enough for callers to reason about the result.

GNATprove's call-side / body-side model is exactly the assumption_set axis expressed as proof:

- At the **call site**: GNATprove *assumes* the called subprogram's `Pre` holds.
- In the **body**: GNATprove *verifies* the body establishes `Post` for all inputs satisfying `Pre`.

A practical four-way diagnostic applies to a failed gap-finding check too: a failed proof (or a failed assumption-set audit) may indicate an incorrect implementation, a missing contract, an imprecise contract, or an automation limitation -- not necessarily the first.

GNATprove also distinguishes the kind of assumption:

- Assumptions about the **problem domain** -- "the sensor reports temperature within ±0.5°C".
- Assumptions about the **execution environment** -- "the kernel supports landlock", "TPM 2.0 is present".
- Assumptions about the **language/tool semantics** -- "this language is memory-safe", "the parser is LL(1)".
- Assumptions introduced solely to make a **proof tractable** -- "we ignore unrelated globals for now".

A gap-finding method should preserve the same four-way distinction. A missing domain assumption is qualitatively different from a missing environment assumption, even though both look the same in a flat list.

### Rely/Guarantee reasoning (Cliff Jones)

Classical rely/guarantee reasoning extends pre/post reasoning to concurrency. A component's **rely condition** states what interference from the environment it assumes; its **guarantee condition** states how the component may change shared state. The environment's guarantees must satisfy the component's relies, and vice versa:

```
{ precondition, rely } component { guarantee, postcondition }
```

The rely/guarantee model is especially valuable for gap-finding in skills and operational documentation. A deployment guide may assume that:

- Another service preserves an API or schema.
- A scheduler does not run two migrations concurrently.
- Credentials remain available.
- A filesystem is durable.
- A queue preserves ordering.
- An operator performs a restart within a stated interval.

These are not ordinary static prerequisites -- they are **environmental behavior assumptions**. A document is incomplete if it states what the procedure guarantees but not what concurrent services, operators, or infrastructure must guarantee in return.

Work on asynchronous programs makes this explicit: the rely condition must preserve a pending task's precondition, while parent procedures establish child preconditions and sibling procedures establish the relevant rely conditions.

### Requirements engineering (Parnas, Clements, NASA SWE)

The requirements-engineering tradition makes the environment a first-class citizen of the assumption set. Parnas and Clements' ideal requirements document includes computer/platform specification, input/output interfaces, output behavior, timing constraints, accuracy constraints, likely changes, and undesired-event handling. Their Four Variable Model separates environmental facts from required behavior: `NAT` (nature/environment) vs `REQ` (required behavior). NASA SWE-050 / SWE-184 enumerate the same dimensions for safety-critical systems: environmental constraints, assumed technology availability, budgetary restrictions, operational modes, hardware/software/operator roles, precedence, failure modes, timing constraints, and assumptions used in deriving requirements.

For gap-finding, this supports a critical distinction:

- **Assumption:** "the sensor reports temperature within ±0.5°C" (a fact about the environment)
- **Requirement:** "the controller shall maintain temperature within ±1°C" (a behavior the system owes)
- **Implementation fact:** "the code samples every 100 ms" (an internal decision)
- **Evidence gap:** "no calibration specification or test establishes the sensor assumption"

A `## Assumption set` section that conflates these is worse than no section.

## Dependency manifests are machine-readable assumption sets

Dependency files are a narrow but highly useful form of assumption documentation. They say, in machine-readable form, what must be available for a build, test, or runtime scenario.

- **`package.json`** declares `dependencies` / `devDependencies` / `peerDependencies` / `optionalDependencies`, plus the `os` / `cpu` / `engine` metadata fields that encode environment assumptions directly. If `os` is empty, the package makes no OS assumption.
- **`Cargo.toml`** declares `[dependencies]`, `[dev-dependencies]`, `[build-dependencies]`, `[target.'cfg(...)'.dependencies]`, `[features]`, `[profile.*]`, and `[workspace]`. The Cargo SemVer guidance explicitly calls out "restricting previously-supported platform requirements" as a possibly-breaking change.
- **`pyproject.toml`** declares `[project] dependencies` (abstract), `[project.optional-dependencies]`, `[tool.uv]`, `[tool.poetry]`, plus environment markers like `sys_platform == "win32"` and Python version constraints.
- **`requirements.txt`** is a pip-oriented installation instruction list. Pinned lockfiles (`pylock.toml` since 2025) sit beside it for reproducible deployments. Treating the manifest as sufficient when reproducibility requires the lockfile is a classic gap.
- **`Containerfile`** `ARG` is a build-time parameter; `ENV` persists into the image and is visible to every process; `LABEL` is image metadata. BuildKit `--mount=type=secret` is the secret path; `ARG SECRET` and `ENV SECRET` are the wrong paths because both leak into image/build history.
- **`mkosi.conf`** exposes every setting in three places (config file, CLI `--some-setting`, and a few environment variables). `mkosi.conf.d/*.conf` snippets are lex-sorted, last-wins on duplicate keys.
- **`systemd` unit** `Environment=KEY=VAL` declares variables in the unit (visible via `systemctl show`); `EnvironmentFile=/path` reads key/values from a file (mode 0600 expected, reload via `daemon-reload` + unit restart, NOT a SIGHUP).
- **GitHub Actions** `workflow_call.inputs` and `workflow_dispatch.inputs` declare each input's `description`, `required`, `default`, and `type`. Inputs flow through `inputs.<id>` in the workflow and `${{ inputs.<id> }}` in expressions.

A dependency-gap checker should not merely ask "is package X documented?". It should ask:

1. Is the dependency declared (production, development, build, optional, peer, target-specific)?
2. Is the version a range or an exact resolution? Is the lockfile or equivalent present when reproducibility matters?
3. Are native tools, OS packages, services, credentials, environment variables, ports, files, and platform assumptions also documented?
4. Does the documentation cover every manifest-selected configuration, including optional features and platform markers?
5. What is the stale-indicator -- which event means "this assumption is no longer current"? (kernel version, OS release, package rotation, library major bump, secret rotation, certificate expiry)

A manifest is evidence of an assumption, not proof that the assumption is sufficient or operationally documented.

## Assumption catalogs and related frameworks

### Assumption / RAID logs

A conventional assumption log records an identifier, statement, owner, status, evidence, impact if false, and validation or mitigation plan. Assumptions are generally treated as propositions believed true but not yet verified; if disproved, they become risks or issues. This is a useful governance pattern, but it needs technical-artifact links to become a gap-finding method.

### Architectural Decision Records (ADRs)

ADRs capture context, alternatives, decision, rationale, trade-offs, consequences, status, and confidence. They are especially useful for assumptions that explain *why* an implementation or documentation choice exists. An assumption catalog should link each assumption to the ADR, requirement, code symbol, manifest entry, test, deployment step, or user-facing instruction that depends on it. An ADR without its assumptions explains a decision but not the conditions under which that decision remains valid.

### Problem frames (Michael Jackson)

Jackson's problem frames separate the machine from the problem domain, environmental phenomena, required relationships, and the conditions that justify the solution. They are valuable for detecting assumptions that disappear when documentation focuses only on code.

### Structured life-cycle documentation

ISO/IEC/IEEE 29148 defines requirements-engineering processes, information items, content, and formats. ISO/IEC/IEEE 15289 defines the purpose and content of life-cycle documentation. Both provide standards-based support for treating assumptions, constraints, interfaces, environment requirements, and rationale as documented information rather than informal background knowledge.

## A proposed operational model

For each artifact, construct an **assumption ledger** with one row per independently testable proposition:

| Field | Meaning |
|---|---|
| `A-ID` | Stable identifier |
| `Artifact` | Skill, file, function, API, guide, diagram, manifest, or procedure affected |
| `Assumption` | Atomic statement of what must be true |
| `Channel` | Caller / invariant / environment / dependency / system-trust / configuration / domain / toolchain |
| `Kind` | Precondition, postcondition, invariant, rely, guarantee, dependency, domain, toolchain |
| `Scope` | Build, test, development, staging, production, platform, feature, or version range |
| `Owner` | Party responsible for establishing or preserving it |
| `Evidence` | Source, manifest, test, contract, monitoring data, ADR, or external specification |
| `Verification method` | Static check, proof, test, install/build, inspection, runtime monitor, or human confirmation |
| `Status` | `verified`, `unverified`, `inferred`, `contradicted`, `stale`, or `missing` |
| `Impact if false` | Failure mode, incorrect result, security exposure, inability to execute, misleading documentation |
| `Stale indicator` | Time, version, OS release, kernel feature bit, rotation event, or expiry |
| `Required action` | Document, test, constrain, monitor, remove, or escalate |

### Gap-finding procedure

1. **Define the artifact and claim.** What does it promise, and for whom?
2. **Extract explicit assumptions.** Read contracts, comments, examples, manifests, environment files, deployment scripts, diagrams, ADRs, requirements.
3. **Infer hidden assumptions.** Look for undeclared inputs, tools, versions, permissions, services, timing, state, roles, and failure handling.
4. **Atomicise to one row per proposition.** Split "Linux, Python 3.11, PostgreSQL, network access, and admin rights are required" into separate rows.
5. **Classify by contract role.** Precondition, guarantee, invariant, rely, guarantee, dependency, domain, toolchain.
6. **Trace each proposition.** Link it to the exact code, documentation section, manifest key, test, or operational step.
7. **Validate.** Attempt installation, compilation, proof, execution, test, deployment, or independent inspection under the stated scope.
8. **Find gaps by relation failure.** Typical findings: missing assumption, missing evidence, wrong owner, scope mismatch, stale version, contradiction, unhandled failure mode, undocumented transitive dependency.
9. **Prioritise by consequence and uncertainty.** High-impact, low-evidence assumptions deserve immediate validation.
10. **Re-run after change.** Assumption sets are versioned knowledge, not permanent facts.

## Assumption set and the yubiOS surface

Every yubiOS file has an assumption set; declaring it is the single highest-leverage move for each NSS-assumption-set Extend gap.

### Containerfile (`ARG` / `ENV` / `LABEL`)

- **`ARG`** -- build-time parameter; visible in image history. Use only for selecting versions or build behavior, not runtime config or secrets.
- **`ENV`** -- persists in the image and is available to every process. Use only for safe runtime defaults or values that are intentionally image-level configuration.
- **`LABEL`** -- image metadata, not an application contract. yubiOS labels every image with `io.yubios.commit=<sha>`, `io.yubios.build-ts=<rfc3339>`, and `io.yubios.source-date-epoch=<unix-ts>`.
- **Secrets** -- always via BuildKit `--mount=type=secret`; never `ARG SECRET` or `ENV SECRET`.

The Containerfile's `FROM` line is the single largest assumption: a pin to `quay.io/fedora/fedora-bootc:45@sha256:X` says "this exact digest is available" and "this digest produces a working yubiOS". Both can be false in practice (quay.io has rotated these digests multiple times in a single week in recent history). The stale-indicator for a digest pin is "any 422 / 404 from quay.io on this exact digest".

### mkosi (`Setting=value` and `--some-setting`)

mkosi exposes every setting in three places (config file, CLI, env vars). The mapping is part of the assumption set; "where does this value come from?" must be answered for every setting. `mkosi.conf.d/*.conf` snippets are lex-sorted, last-wins on duplicate keys. The yubiOS drop-in lex-sort rule applies: bare numeric prefixes are a sysv-init `rcN.d/` convention that does NOT transfer to systemd drop-ins. A drop-in named `53-...` lex-sorts BEFORE an upstream file named `static-...` because `"53"` (0x35) sorts BEFORE `"s"` (0x73) in ASCII -- the override fires first, then the upstream re-creates the device last, silently negating the override. The yubiOS naming convention for systemd drop-in overrides is to use a prefix that lex-sorts AFTER upstream package files.

### systemd unit (`Environment=` / `EnvironmentFile=`)

- `Environment=KEY=VAL` declares variables directly in the unit. The pair is visible via `systemctl show`.
- `EnvironmentFile=/path` reads key/value pairs from a file. Document the file's mode (0600 expected), ownership, and reload behavior (`systemctl daemon-reload` plus unit restart, NOT a SIGHUP).
- `WorkingDirectory=`, `User=`, `ExecStart=`, `CapabilityBoundingSet=`, `ReadOnlyPaths=`, `ProtectSystem=` are not "assumptions" in the NSS sense -- they are runtime-surface configuration. Record them next to assumptions, separately.

systemd unit types encode the same lifecycle assumptions under different names: `Type=oneshot` runs to completion and exits; `Type=notify` waits for `sd_notify(READY=1)`; `Type=simple` runs in foreground; `Type=forking` expects fork-and-detach. Each type carries a different set of preconditions (e.g. `Type=notify` requires the unit to call `sd_notify` before a timeout; `Type=forking` requires the service to fork-and-detach within a timeout).

### GitHub Actions (`workflow_call.inputs` / `workflow_dispatch.inputs`)

For reusable workflows, declare each input's `description`, `required`, `default`, and `type` (`boolean`/`number`/`string` -- types only supported on `workflow_call`). GitHub maps action inputs to `INPUT_<NAME>` env vars inside the action container. The yubiOS pattern: pass only secrets via `secrets:` (never via `workflow_call.inputs`); declare `permissions:` explicitly at workflow level; declare `concurrency:` group for cancellation.

A workflow's assumption set also includes the runner -- hosted vs self-hosted, OS version, available tooling, network egress, secret availability. `runs-on: ubuntu-24.04` assumes Ubuntu 24.04 is available with the declared tools; a self-hosted `runs-on: [self-hosted, linux, ARM64]` assumes a registered ARM64 runner with the expected tools.

### Scripts (Python, shell, etc.)

CLI flags first; env vars as a secondary channel with documented precedence; config files as a third; secrets last, with a documented mode and an explicit "never echoed" rule. The yubiOS doctrine: secrets are never echoed, never log-shipped, never put in an `ENV` directive that persists in an image, never put in a Containerfile `ARG`.

Python script preconditions also include Python version (`sys.version_info`), required third-party packages (the importable set), and OS-level packages that the Python wrapper calls (e.g. `mkosi`, `bootc`, `systemctl`). The Python `argparse` pattern in `scripts/*.py` follows a four-step `parse_args() -> collect -> validate -> execute` pipeline; the `default=` expression may consult an env var, but the precedence `CLI > env > config > default` is canonical.

### Refs/notes (`refs/*.md`)

A research note's assumption set is unusual: it has no runtime assumption, but it has *invocation* assumptions. The note is invoked by a reader who needs to know its prerequisites (what other refs to read first, what ADRs it depends on, what commit hash it was written against). Record those in a `## Assumption set` section as a prerequisite list with explicit "read these first, in this order" wording, plus the commit hash and any ADR referenced inline.

## Examples

### Example 1 -- Containerfile Assumption set (build + runtime + trust)

```dockerfile
# Assumption set:
#   caller:
#     - quay.io is reachable from the build host (network egress to quay.io)
#     - the yubiOS signing key is at /etc/pki/yubios (mode 0600, root-only)
#     - build args BASE_IMAGE_TAG and ENABLE_SYSEXT are passed or use defaults
#   runtime invariant:
#     - the FROM digest resolves and is not 404 / 422 on quay.io (re-pin via fetches group)
#     - the rpm set under rpms/*.rpm is present and signature-verified
#   environment:
#     - kernel >= 6.7 (composefs, dm-verity, IMA, cgroup v2)
#     - systemd >= 256 (UKI, sysext, confext)
#     - podman >= 5.0 OR buildah >= 1.34 (BuildKit secret mounts)
#   transitive dependency:
#     - the FROM image is quay.io/fedora/fedora-bootc:45@sha256:<digest>; staleness indicator: any 422/404 from quay.io on this digest
#     - mkosi.conf.d/*.conf lex-sorted, last-wins (per yubiOS drop-in rule)
#   system trust:
#     - the TPM is PCR-resettable and the UKI is measured (PCR 4..11)
#     - dm-verity root hash is recorded in the deployment manifest
#   configuration prerequisite:
#     - mkosi.conf [Distribution] / [Output] / [Content] sections valid against mkosi 24.x schema
#     - the mkosi build root is writable and has at least 30 GB free
#   domain:
#     - the host is x86_64 or aarch64 (no other arch is supported)
#     - the user accepts that yubiOS is alpha-quality and may brick the device
#   toolchain:
#     - mkosi 24.x, systemd 256+, GNU coreutils for `find -printf`, GNU tar for reproducible-build canonical bytes
# Verification: `mkosi build` must succeed with exit 0; the resulting image must `bootc usergreeter` cleanly.
# Failure: any non-zero exit leaves the build root without a committed image (atomic via mkosi's tmp+rename).
```

### Example 2 -- Python script Assumption set

```python
"""
Assumption set:
  caller:
    - the user invokes scripts/validate-input-shape.py directly OR via the dispatch workflow
    - the user passes --config explicitly OR sets YUBIOS_CONFIG in the environment
  runtime invariant:
    - Python >= 3.11 (the script uses tomllib, available from 3.11 onward)
    - the schema validator library is installed (pydantic >= 2.5)
  environment:
    - POSIX filesystem semantics; the script does not run on Windows
    - locale is C.UTF-8 (the script parses UTF-8 schema files)
  transitive dependency:
    - the input schema file exists, is readable by the current uid, and matches schema version 2
    - the optional Pydantic Settings layer reads env vars per its precedence (CLI > env > config > default)
  system trust:
    - no network egress required (the script is offline; verification of network is a separate test)
  configuration prerequisite:
    - the config file path is under a directory the user controls (no read of /etc/yubios is mandatory)
    - the --config schema is validated before any destructive action
  domain:
    - "valid" means "matches the declared schema version" -- no semantic validation is performed
    - the script does not interpret the input as executable code
  toolchain:
    - the script depends on js-yaml, pydantic, and the Python stdlib; no third-party service is required
Verification: the script exits 0 when the input matches schema; exits 65 (EX_DATAERR) on schema mismatch; exits 64 (EX_USAGE) on argparse error.
Failure: the script never mutates state on a non-zero exit; the input file is left untouched.
"""
```

### Example 3 -- systemd unit Assumption set

```ini
# Assumption set:
#   caller:
#     - systemd is the init system (PID 1)
#     - the unit is enabled via systemctl enable yubiOS-enroll.service
#   runtime invariant:
#     - the TPM device is present at /dev/tpm0 OR /dev/tpmrm0
#     - a YubiKey or compatible FIDO2 authenticator is plugged in at enrollment time
#   environment:
#     - kernel >= 5.15 (TPM 2.0, hmac-secret, cgroup v2)
#     - systemd >= 250 (systemd-cryptenroll, systemd-cryptsetup)
#   transitive dependency:
#     - the yubiOS LUKS2 token slot is empty OR is being explicitly overwritten
#     - the FIDO2 device is on the allowlist OR --token-only was passed
#   system trust:
#     - the TPM PCRs are at their expected values (PCR 0..7 not in a recovery state)
#     - the kernel command line includes `rd.luks.options=...` or systemd handles LUKS2 internally
#   configuration prerequisite:
#     - the EnvironmentFile=/etc/yubios/yubiOS.conf is mode 0600, root:root
#     - the unit's WorkingDirectory is /var/lib/yubios (writable by root)
#   domain:
#     - enrollment is a one-shot operation; re-running converges to the same state
#     - the operator is present at the terminal (this is not a daemon)
#   toolchain:
#     - systemd-cryptenroll >= 250 with FIDO2 support compiled in
#     - libfido2 >= 1.13 (C library for FIDO2 device I/O)
# Verification: the unit exits 0 on successful enrollment, 1 on rejection, 2 on "already enrolled" (SuccessExitStatus=2).
# Failure: a non-zero exit leaves the LUKS2 token slot in its previous state (atomic via systemd-cryptenroll's locking).
```

### Example 4 -- GitHub Actions reusable workflow Assumption set

```yaml
# Assumption set (workflow_call inputs + runner):
#   caller:
#     - the consumer workflow invokes this workflow via `uses: yubi-OS/yubiOS/.github/workflows/<name>.yml@<ref>`
#     - the consumer workflow declares `permissions:` that include everything the unit-of-work needs
#   runtime invariant:
#     - the workflow run is on GitHub-hosted or self-hosted runner with the expected tools
#     - `actions/checkout@v4` is permitted by the runner's network egress policy
#   environment:
#     - ubuntu-24.04 (hosted) OR self-hosted with quay.io egress
#     - Python 3.11+ installed
#   transitive dependency:
#     - the inputs.* values match the declared types (string / boolean / number)
#     - secrets.* are passed via the secrets: block, not via inputs
#   system trust:
#     - the runner has read access to the repo (GITHUB_TOKEN)
#     - any signature / attestation step uses the yubiOS signing key (cosign / sigstore)
#   configuration prerequisite:
#     - the workflow declares `concurrency:` group for cancellation
#     - the workflow's `permissions:` block is at workflow level, not job level, to satisfy least-privilege
#   domain:
#     - "successful" means "every job's last step exits 0"; "failed" means "any job exits non-zero"
#   toolchain:
#     - bash 5.x, coreutils, jq, ripgrep, the yubiOS action set
# Verification: `actions/runs/{id}` shows `conclusion=success` and every inner step shows ✓.
# Failure: a non-success conclusion does NOT merge the dispatcher's outer conclusion -- always read inner run logs (per PROJECT_RULES.md PR #150 doctrine).
```

### Example 5 -- mkosi.conf Assumption set

```ini
# Assumption set (mkosi.conf.d/* syntax):
#   caller:
#     - the build host runs mkosi >= 24.x
#     - the user passes `mkosi build` (default verb) or `mkosi --force count=10 sandbox` (explicit)
#   runtime invariant:
#     - the build root is writable and has at least 30 GB free
#     - the rpm cache is reachable OR offline rpm set is mounted at rpms/
#   environment:
#     - kernel >= 6.7 (composefs, dm-verity)
#     - podman OR buildah installed (BuildKit secret mounts)
#     - /etc/pki/yubios contains the signing key (mode 0600)
#   transitive dependency:
#     - [Distribution] / [Output] / [Content] / [Validation] sections are mkosi 24.x schema-valid
#     - mkosi.conf.d/*.conf snippets are lex-sorted, last-wins on duplicate keys
#   system trust:
#     - the host's TPM is available for attestation, if any step requires it
#   configuration prerequisite:
#     - the [Output] Format matches the consumer's expectations (disk / oci / directory / uki)
#     - SOURCE_DATE_EPOCH is set if reproducible-build is required
#   domain:
#     - "reproducible" means "byte-identical output across rebuilds given the same source tree and SOURCE_DATE_EPOCH"
#   toolchain:
#     - mkosi 24.x, systemd-nspawn >= 256, GNU tar for canonical-byte ordering
# Verification: `mkosi build` exits 0; the resulting image's manifest.json is consistent with the source tree.
# Failure: any non-zero exit leaves no partial image; the build root is left untouched (atomic via mkosi's tmp+rename).
```

### Example 6 -- refs/*.md Assumption set (research-note invocation)

```markdown
<!-- Assumption set (research-note invocation, not runtime):
     Required prior reading (in order):
         1. docs/ARCHITECTURE.md -- so the reader knows the system's modules
         2. docs/THREAT_MODEL.md -- so the reader knows what the threat model assumes
         3. refs/validate-input-shape-doctrine-2026-08-04.md -- the prior cycle's lens
     Required context:
         - the commit hash this note was written against (see frontmatter: commit:)
         - any ADR referenced inline (ADR-NNN at yubi-OS/yubiOS/docs/ADR.md)
     Required toolchain:
         - a markdown reader that handles ``` fenced blocks
         - jq >= 1.6 if the reader wants to extract lens-format JSON from the embedded code blocks
     Stale indicator:
         - the (commit:) frontmatter is older than 30 days -> re-verify against the current tree
         - any ADR referenced has been superseded -> update the note
     Domain assumption:
         - the reader can run the experiments referenced; if not, the note's conclusions are not directly applicable
     Validation: this note assumes the prior reading has happened; if not, link to it.
     Failure: missing prior reading produces an "I cannot evaluate this in isolation" moment.
-->
```

## Guidelines

1. **Every assumption has a channel.** If you cannot say whether a proposition arrives via caller obligation, runtime invariant, environment requirement, transitive dependency, system trust, configuration prerequisite, domain assumption, or toolchain assumption, the assumption is *implicit* -- surface it as such, because implicit assumptions are the single most common source of "works on my machine" failures.
2. **Atomicise before scoring.** "Linux, Python 3.11, PostgreSQL, network access, and admin rights are required" is five assumptions, not one. Each gets its own row, its own evidence, its own stale indicator.
3. **Required and default are not the same.** A `required: true` row with a `default: foo` is internally contradictory; pick one. A `default: foo` row is satisfied by the implementation even when the caller has not actively established it; a `required: true` row is not.
4. **Document the stale indicator explicitly.** A manifest entry without a stale indicator is a row that says "this is true forever" -- which is never true. The stale indicator may be a version, an OS release, a kernel feature bit, a rotation event, a certificate expiry, or a test that must keep passing.
5. **Distinguish caller obligation from artifact guarantee.** A precondition is what the caller establishes; a postcondition is what the artifact establishes. Conflating them moves the burden of proof in the wrong direction.
6. **Distinguish problem-domain assumptions from execution-environment assumptions from tool/language assumptions.** They look the same in a flat list; they are not.
7. **Validate the assumption, not just the artifact.** A test that proves "the artifact runs in CI" is not a test that proves "the assumption holds in production". State which is which.
8. **Prerequisites are assumptions.** "This script requires Python 3.12" is an assumption the operator supplies by installing Python. Record it in the Assumption set section, not in a footer.
9. **Pre-register the assumption set.** Before adding a new assumption (a new dependency, a new platform, a new kernel feature), write the ledger entry first (channel, kind, scope, owner, evidence, verification method, stale indicator), then implement the consumer. Schema-first.
10. **Use the eight-channel taxonomy verbatim.** "Where does this assumption come from?" should always answer with one of caller / invariant / environment / dependency / system-trust / configuration / domain / toolchain. New channels need a new skill; do not invent channel names in a file's Assumption set section.
11. **Close the NSS-assumption-set Extend gap with one section per file.** The atomic cycle-12 patch for any file with an NSS-assumption-set gap is ONE `## Assumption set -- cycle 12` section, file-type-aware comment syntax, with the eight-channel table or its markdown equivalent. One section, one file, one cycle.
12. **Link assumptions to evidence.** Every assumption row in the ledger cites at least one of: a manifest entry, a test, a contract, a runtime monitor, an ADR, or an external specification. An assumption without evidence is an opinion.

## Constraints

- **Self-contained.** This skill does not depend on negative-skill-space being loaded; it composes *with* NSS as a follow-up action (NSS proposes the gap, nss-assumption-set closes it).
- **No runtime.** This is a documentation skill. It does not read environment variables or parse configuration files at runtime.
- **Schema is for humans first.** The Assumption set section a cycle-12 patch adds is read by humans (and by the next RSI cycle's NSS sweep) before it is consumed by any parser. Clarity > strict YAML.
- **One section per file.** Do not stack multiple `## Assumption set` blocks in one file; do not nest Assumption set inside another section heading.
- **Channel names are fixed.** Caller / invariant / environment / dependency / system-trust / configuration / domain / toolchain. A value that belongs to a novel channel needs a new skill, not a new channel name.
- **No silent defaults.** If a default exists, it is documented in the Assumption set section. If no default exists, the field says `default: none` explicitly.
- **Stale indicator is mandatory.** Every assumption row has a stale indicator -- even if it is "never" -- because "never" is itself a testable proposition that may become false.
- **One-file section per cycle.** A cycle-12 patch is one section, one file. Do not split a single file's assumption set across multiple cycles -- the section is the atomic unit.

## Anti-patterns

- **Assumptions without a channel.** "This file assumes X" without saying whether X is a caller obligation, an environment requirement, a transitive dependency, a system-trust requirement, a configuration prerequisite, a domain claim, or a toolchain requirement is *worse* than no Assumption set section, because it pretends to be a declaration.
- **Required with a default.** "Required: true, default: 30" -- the default makes it not required; the flag misrepresents it.
- **ENV that should be ARG.** A value that affects only the build (e.g. `BASE_IMAGE_TAG`) belongs in `ARG`, not `ENV` -- otherwise it persists in the image and ships to every consumer.
- **ARG that should be ENV.** A value the running process needs (e.g. `YUBIOS_RELEASE`) belongs in `ENV`, not `ARG` -- otherwise it is unavailable at runtime.
- **Secrets in ENV.** `ENV SECRET_KEY=...` persists the secret in the image and in `docker inspect` output. Use BuildKit `--mount=type=secret` for build-time secrets, `EnvironmentFile=` (mode 0600) for runtime systemd secrets, or Kubernetes `Secret` / `SealedSecret`.
- **"Compatible with X" instead of a verdict.** Assumption set sections that say "validates inputs" without saying which inputs are accepted, in what shape, with what precedence, are filler.
- **Cross-channel aliasing without precedence.** Two env vars that both set the same config without saying which wins; two config files that both set the same key without saying which is read last; two CLI flags that overlap without saying which takes precedence.
- **Prerequisites in a footer.** "Requires Python 3.12" at the bottom of a README, separate from the Assumption set section, will be missed. Move it into the Assumption set section under `caller:`.
- **An Assumption set section that does not name the file's own assumptions.** A cycle-12 patch that adds `## Assumption set` to `Containerfile` but does not list `BASE_IMAGE_TAG`, `ENABLE_SYSEXT`, the kernel version, the TPM availability, etc. is a placeholder patch and counts as a NO verdict, not a YES.
- **Assuming a stale-pinned digest will keep working.** `quay.io/fedora/fedora-bootc:45@sha256:X` is the most-rotated pin in the yubiOS corpus. A `## Assumption set` that names a digest without a stale indicator (any 422/404 from quay.io on this exact digest) is a row that will become false within a week.
- **Assuming a systemd drop-in named with a numeric prefix overrides an upstream package.** The lex-sort rule says `"53-"` (0x35) sorts BEFORE `"s-"` (0x73), so a numeric-prefixed override fires first and the upstream re-creates the device last. Use a prefix that lex-sorts AFTER upstream (`yubiOS-...`, `vfio-yubiOS-...`, etc.).
- **An Assumption set section that conflates domain and environment claims.** "The sensor reports temperature within ±0.5°C" (domain) and "The kernel supports IIO" (environment) look the same in a flat list; they are not, and the verification method is different.

## Red flags

| Observation | What it means |
|---|---|
| `## Assumption set` section lists zero concrete channels | the section is a placeholder |
| `required: true` AND `default: ...` on the same field | contradictory declaration |
| A secret appears in an `ENV`, an `ARG`, or a log line | secret leakage |
| Two channels claim the same key with no precedence rule | cross-channel collision |
| "Requires Python 3.12" in a footer instead of in `caller:` | prerequisite lost |
| A stale indicator is missing on a digest, version, or pin | the assumption will silently become false |
| A drop-in named `50-...` or `53-...` is expected to override an upstream file | the lex-sort rule will silently invert it |
| A `## Assumption set` patch lands but the next NSS sweep still flags assumption_set as the top gap | the patch did not close the gap |
| The Assumption set section is identical across 40+ files | templated, not inspected -- likely wrong for at least one of them |
| An Assumption set section names a digest, version, or pin without an evidence link | the row is an opinion, not a documented fact |

## Composition

| Skill / channel | How it composes | Direction |
|---|---|---|
| `negative-skill-space` | NSS runs the 12-axis sweep and flags `assumption_set` as a candidate Extend gap; nss-assumption-set is the closure skill for that one axis. Pair the two in every cycle. | negative-skill-space -> nss-assumption-set |
| `curve-compass-skill` | Lens-format patches in cycle-12 use nss-assumption-set as the assumption_set-axis lens payload; the lens records the hypothesis + method + parameters + delta + verdict + score + caveat for the Assumption set section this skill defines. | nss-assumption-set -> curve-compass-skill |
| `curved-corpus-create` | The corpus the cycle-12 sweep operates over is the same `lens --corpus` JSON; the corpus's `assumption_set` column maps to this skill's eight-channel taxonomy. | nss-assumption-set <-> curved-corpus-create |
| `nss-inputs` | The Inputs surface a cycle-9 patch declares is the caller-side contract; the Assumption set a cycle-12 patch declares is the broader environment + transitive + trust + domain claim that the Inputs surface rests on. Pair the two for every file with both gaps. | nss-inputs -> nss-assumption-set |
| `nss-outputs` | The Outputs surface a cycle-10 patch declares is the downstream contract; the Assumption set a cycle-12 patch declares is the upstream contract that must hold for the Outputs surface to be reliable. Pair the two for every file with both gaps. | nss-outputs -> nss-assumption-set |
| `nss-mode` | The Mode axis a cycle-11 patch declares (interactive vs batch, daemon vs one-shot, TTY vs pipe) is the lifecycle + interaction assumption; the Assumption set a cycle-12 patch declares names that assumption explicitly. Pair the two for every file with both gaps. | nss-mode -> nss-assumption-set |
| `nss-audience` | The Audience a cycle-8 patch declares (operator / CI / developer) determines which assumption-set channels matter: CI cares about caller + toolchain + dependency; operators care about environment + system-trust + domain; developers care about invariant + configuration + toolchain. | nss-audience -> nss-assumption-set |
| `api-and-interface-design` | The API's contract is the artifact-side equivalent of the file's precondition / postcondition; the assumption set is the environment-side. Pair for every API. | nss-assumption-set <-> api-and-interface-design |
| `source-driven-development` | Each documented prior work (Eiffel, SPARK Ada, rely/guarantee, NASA SWE, ISO/IEC/IEEE 29148) was verified against the official docs in the deep-research phase that produced this skill. | source-driven-development -> nss-assumption-set |
| `security-and-hardening` | The system-trust channel in this skill (PCR values, key custodians, certificate chains, attestation, mount-namespace privacy, root-of-trust) is the yubiOS security boundary at the assumption-set layer; the security skill owns the deeper threat model. | nss-assumption-set <-> security-and-hardening |
| `recursion-self-improvement` / `recursive-self-improvement` | When the same NSS-assumption_set Extend gap keeps reappearing after a cycle-12 patch, RSI's self-mode should re-isolate the editor before the next attempt -- same-author bias on Assumption set sections is the most common cycle-12 failure mode. | recursive-self-improvement -> nss-assumption-set |

## Verification

For each cycle-12 patch that closes an NSS-assumption_set gap:

1. **The patch adds ONE `## Assumption set -- cycle 12` section** (or the file-type-aware equivalent: `# Assumption set` for Containerfile/Makefile, `# # Assumption set` for Python triple-quoted docstring, `# Assumption set` for shell `#` comments, `<!-- Assumption set -->` HTML comment for `.md` if a section is not appropriate, `<!-- Assumption set (workflow_call assumptions:) -->` for GitHub Actions YAML).
2. **The section names at least one concrete assumption** with channel, kind, scope, owner, evidence, verification method, and stale indicator. A placeholder section with zero concrete assumptions counts as a NO verdict.
3. **Secrets are absent from `ENV` / `ARG` / log lines.** If the file documents a secret, the declaration references BuildKit `--mount=type=secret`, systemd `EnvironmentFile=`, or Kubernetes `Secret` -- never a raw `ENV` or `ARG`.
4. **Prerequisites are listed in `caller:`**, not in a footer.
5. **Precedence is stated** when more than one channel can supply the same assumption (e.g. CLI > env > config > default for Python scripts).
6. **Stale indicator is present** on every version, digest, pin, or kernel-feature assumption. The indicator may be "any 422/404 from quay.io on this exact digest" (digest pin), "kernel < 6.7 means no composefs" (kernel feature), "the upstream package's signature expired" (signature pin).
7. **Domain claims are separated from environment claims.** A row that says "the sensor reports temperature within ±0.5°C" is a domain assumption; a row that says "the kernel supports IIO" is an environment assumption. Both are valid; both must be present when the file depends on both.
8. **The next NSS sweep on the same file does NOT re-flag assumption_set as the top Extend gap.** If it does, the patch did not close the gap and the cycle-12 lens is a NO verdict.

## Changelog

- **1.0.0** (2026-08-12) -- initial. Cycle-12 deep-research synthesis for the NSS Assumption set axis. Captures the eight-channel assumption taxonomy (caller / invariant / environment / dependency / system-trust / configuration / domain / toolchain), the four strongest prior-work frames (Design by Contract / SPARK Ada contracts / rely-guarantee reasoning / requirements engineering per Parnas-Clements-NASA SWE-ISO-IEEE 29148), the yubiOS-specific patterns for Containerfile (`ARG` vs `ENV` vs `LABEL` + BuildKit secret mounts), mkosi (`Setting=value` and `--some-setting` + lex-sorted drop-ins), systemd (`Environment=` / `EnvironmentFile=` + unit types), GitHub Actions (`workflow_call.inputs` + `permissions:` + `concurrency:`), Python (`argparse` + env precedence + Pydantic Settings), and refs/*.md (prerequisite invocation + commit hash + ADR links), plus the stale-indicator discipline, the drop-in lex-sort rule, the domain-vs-environment distinction, and the design-by-contract obligation model. Every example and anti-pattern is grounded in the source-driven-development deep-research pass on Design by Contract (Bertrand Meyer / EiffelStudio), SPARK Ada GNATprove contracts and the AdaCore papers, rely/guarantee reasoning (Cliff Jones SETSS-17 lecture, Koskinen et al. CONCUR 2015), NASA SWE-050 / SWE-184, ISO/IEC/IEEE 29148 + 15289, the Cargo SemVer platform-requirements guidance, the CommonJS `package.json` `os`/`cpu`/`engine` spec, the pip `requirements.txt` / `pylock.toml` separation, the npm `dependencies` vs `devDependencies` vs `peerDependencies` model, the Containerfile `ARG`/`ENV`/`LABEL` semantics (Docker docs + BuildKit secret mounts), the mkosi 24.x schema, the systemd.exec(5) `Environment=` / `EnvironmentFile=` / `Type=` semantics, and the GitHub Actions metadata syntax. Cycle 12 of `rsi-compass` ships this skill with ~40 assumption_set-aware incremental patches on PR #207 branch `feat/rsi-compass-cycle7-nss-research-2026-08-12` (one assumption_set-aware section per file, file-type-aware comment syntax). Self-validated: frontmatter parsed by `js-yaml` (name `nss-assumption-set` matches `^[a-z0-9-]+$`; description length 1-1024 chars; no literal `<`/`>`; closing `---` intact; H1 immediately after frontmatter; Examples / Guidelines / Constraints / Anti-patterns / Red flags / Composition / Verification / Changelog sections all present).

## Maintainer

Sauna, wave 2 cycle 12. Built against the deep-research synthesis for the NSS Assumption set axis (PR #207 cycle-7 NSS gap-informed context), `negative-skill-space` SKILL.md (the 12-axis sweep framework), the `nss-audience` / `nss-inputs` / `nss-outputs` / `nss-mode` SKILL.md exemplars (cycle-8/9/10/11 closure patterns), and the cycle-7 lens pool (`lenses.json` at root of `feat/rsi-compass-cycle7-nss-research-2026-08-12`).
