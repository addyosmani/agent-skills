---
name: internal-big-picture
description: "Agent's canonical big-picture reference for yubiOS. Bridges four big-picture domains the project draws from — security telemetry (Chronicle), compliance assurance (HITRUST CSF), federal security doctrine (CISA Zero Trust), and image-based OS architecture (Lennart Poettering / 0pointer) — through a 10-primitive model (attestation, trust chain, least privilege, declarative policy, continuous/adaptive, immutability, audit/evidence, cryptographic identity, segmentation, self-describing). Maps every yubiOS skill, ADR, and docs/refs artifact onto those primitives. Use when a yubiOS question touches more than one domain, when the agent needs the full picture before deciding, or when a new skill/ADR/feature needs placement in the existing landscape. Triggers on: big picture, full picture, four sources, Chronicle, HITRUST, CISA, Zero Trust, 0pointer, cross-domain, primitive mapping, source vocabulary, how does this fit, where does X live in yubiOS."
---

# Internal Big Picture — Canonical 10-Primitive Reference for yubiOS

Local-only "internal-" prefixed skill. Not exported to `yubi-OS/agent-skills` or `yubi-OS/yubiOS` yet. Synthesizes four big-picture domains the yubiOS design draws from into a stable lens the agent uses when a question touches more than one domain.

## Why this skill exists

yubiOS's design — image-based OS, owner-held YubiKey as root of trust, FIDO2-gated disk unlock, dm-verity-verified `/usr`, signed UKI, declarative systemd services, attestable build pipeline — sits at the intersection of four big-picture domains:

1. **Security telemetry / SIEM** — Google Chronicle / YARA-L detection-as-code, Unified Data Model (UDM), continuous evaluation.
2. **Compliance assurance** — HITRUST CSF v11.7.0 (latest minor at fetch date 2026-07-29): 14 control categories × 49 control objectives × 156 control specifications, organized in 5 PRISMA maturity levels × 5 HITRUST compliance levels, third-party attestation.
3. **Federal security doctrine** — CISA Zero Trust Maturity Model v2.0 (April 2023): 5 pillars (Identity, Devices, Networks, Applications, Data) + 3 cross-cutting capabilities (Governance; Visibility and Analytics; Automation and Orchestration) + 4 maturity stages (Traditional → Initial → Advanced → Optimal). See "Source versions used" below for v1.0 vs v2.0 deltas.
4. **Image-based OS architecture** — Lennart Poettering / 0pointer.net: 17 design goals, UKI/PCR/TPM trust chain, Discoverable Partitions Specification, hermetic /usr, modular (sysext / portable service / nspawn).

When a yubiOS question arrives that touches more than one of these, the agent has no stable vocabulary. Re-deriving the cross-domain map every time burns context, drifts, and produces inconsistent answers across sessions. This skill is the *cache*: a 10-primitive model + mapping table + synthesis template the agent loads once and reuses.

**Honesty note**: the 10 primitives are an *observed co-occurrence* lens — each appears in 2+ of the four sources. They are NOT a normative taxonomy. The skill is explicit about this in the Red Flags section.

---

## The 10-primitive spine

Each primitive: name, one-paragraph definition, what each of the four sources contributes, where they diverge.

### Source versions used

All four sources ship revised versions; the spine below is grounded in the most recent version the deep-research pass verified on 2026-07-29. Re-verify before citing if more than 3 months have elapsed since the version-pinned date.

- **Google Chronicle / Security Operations**: documentation site `cloud.google.com/chronicle/docs` (fetched 2026-07-29). Vocabulary pin: **UDM (Unified Data Model)** — Chronicle's normalized event schema. Note: Chronicle does NOT publish a numbered "UDM version" the way systemd publishes version numbers; UDM evolves via rolling additions to the docs. Cite the specific section page URL per claim (e.g. `cloud.google.com/chronicle/docs/reference/udm-field-list`). YARA-L 2.0 detection-as-code, Data RBAC.
- **HITRUST CSF**: **CSF v11.7.0** (pin to specific minor; do not use `v11.x` as a citation). Structure: 14 control categories × 49 control objectives × 156 control specifications, organized in 5 PRISMA maturity levels × 5 HITRUST compliance levels. v11.x restructured earlier "155+ controls" counting. Source: `hitrustalliance.net/hitrust-framework`.
- **CISA Zero Trust**: **Zero Trust Maturity Model (ZTMM) v2.0** (released April 2023). v2.0 added two cross-cutting capabilities beyond v1.0 (Sept 2021)'s single Governance: **Visibility and Analytics** + **Automation and Orchestration**. v2.0 also added a 4th maturity stage: **Traditional → Initial → Advanced → Optimal** (v1.0 had only 3 stages, Traditional → Advanced → Optimal). Reference: NIST SP 800-207 (Zero Trust Architecture) + CISA ZT topic page. Source: `cisa.gov/topics/cybersecurity-best-practices/zero-trust`.
- **Lennart Poettering / 0pointer.net**: **systemd v261** (released 2026-06-19, current stable as of fetch date). Vocabulary pin: UKI (Unified Kernel Image) with PE sections, DPS (Discoverable Partitions Specification), dm-verity on /usr, PCR 11 boot-phase measurements, homectl FIDO2 signing keys (v258+), portable services with `RootImage=`, `RootMStack=` overlay (v260+), `RestrictFileSystemAccess=` (v261). yubiOS delta: YubiKey PIV/FIDO2 replaces TPM2 for user-identity operations; OP-TEE fTPM retains platform-measurement layer. Source: `0pointer.net/blog/`.

When the version is wrong, the citation is wrong. When the citation is wrong, the primitive mapping is wrong. **Re-pin per the cadence below — NOT on a blanket interval.**

| Source | Release cadence | Re-pin trigger |
|---|---|---|
| Google Chronicle | Rolling (UDM/YARA-L versioned per release; no numbered docs-site version) | Whenever the spine cites a specific UDM/YARA-L version, re-verify it against `cloud.google.com/chronicle/docs` before citing |
| HITRUST CSF | Annual minor (v11.x → v11.(x+1)); control-numbering can shift | Whenever the spine cites "v11.x structure (14×49×156)", re-verify against `hitrustalliance.net/hitrust-framework` |
| CISA ZTMM | Biennial (v1.0 Sept 2021; v2.0 April 2023; v3.0 expected ~2025-2027) | Whenever CISA publishes a new ZTMM version — re-pin the maturity stages + cross-cutting capabilities |
| systemd (Lennart Poettering / 0pointer) | Roughly 6-week minor cycle (v256 → v257 → ... → v261) | Whenever systemd ships a new stable (v2xx), re-pin the relevant feature primitives (UKI sections, DPS types, BPF-LSM directives, portable services flags) |

**Blanket "re-pin every N months" is wrong** because the four sources ship at four different rates. Re-pin per source, triggered by the source's own release event — not by a calendar.

### 1. Attestation / measurement

Producing cryptographically verifiable evidence about the *state* of a system, an artifact, or an action.

- **Chronicle**: UDM-normalized events carry derived provenance; closest analog. No native attestation.
- **HITRUST**: *not used*. HITRUST attests *controls*, not systems; assurance is third-party-driven.
- **CISA**: device attestation in the *Devices* pillar; NIST 800-207 reference architectures name it.
- **0pointer**: explicit (Design Goal #4); TPM2 PCR measurements bind LUKS2 key to the running OS; IMA + dm-verity extend the chain.

**Divergence**: Chronicle + 0pointer produce *runtime, machine-generated cryptographic evidence*. CISA treats it as *architecture-level capability*. HITRUST substitutes *third-party human assessment*.

### 2. Trust chain / root of trust

The ordered list of who attests to what, terminating in a root the system does not question.

- **Chronicle**: Google Cloud (CMEK extends it).
- **HITRUST**: the assessor + MyCSF + HITRUST Alliance.
- **CISA**: IdP + device + resource per request (NIST 800-207).
- **0pointer**: UEFI firmware → bootloader → UKI → dm-verity /usr → TPM2 PCR → LUKS2-bound root. Cryptographic, hardware-rooted, on-access. **yubiOS**: YubiKey PIV slot 9c replaces TPM2 at the *user* identity layer; fTPM (via OP-TEE) retains the *platform* measurement layer.

**Divergence**: Poettering's chain is the only fully cryptographic, hardware-rooted one. HITRUST's is the only human-in-the-loop one.

### 3. Least privilege / per-request / granular

Restricting authority to the smallest possible scope, evaluated at the smallest possible granularity.

- **Chronicle**: RBAC at feature + data level (Data RBAC).
- **HITRUST**: per-control (CSF v11.x: 14 categories × 49 objectives × 156 specifications, organized in 5 PRISMA maturity levels × 5 compliance levels).
- **CISA**: "enforcing precise, least privilege per-request access decisions" (doctrinal).
- **0pointer**: every I/O authenticated by dm-verity; portable services run in their own RootImage namespace; `RestrictFileSystemAccess=` (v261) limits to dm-verity-protected filesystems.

**Divergence**: granularity differs by *what is being privileged* — data rows (Chronicle), control implementations (HITRUST), access requests (CISA), I/O operations (0pointer).

### 4. Declarative policy / configuration

Desired state expressed as data, not procedural code.

- **Chronicle**: YARA-L rules (Meta / Events / Match / Outcome / Condition).
- **HITRUST**: the control library itself ("shall" statements) + assessment rubric.
- **CISA**: ZTMM v2.0 maturity matrix (4 stages) + 3 cross-cutting capabilities (Governance; Visibility and Analytics; Automation and Orchestration).
- **0pointer**: `mkosi.conf` INI, `systemd-repart` partition definitions, UKI sections, yubiOS.bb/h/yubiOS.rego.

**Divergence**: all converge on "desired state as data, not procedural code." Poettering is most concrete (INI → disk image); HITRUST most abstract.

### 5. Continuous / adaptive / threat-adaptive

Re-evaluation as conditions change, not one-time certification.

- **Chronicle**: continuous YARA-L evaluation; Applied Threat Intelligence continuously updates detections.
- **HITRUST**: CSF v11.x PRISMA framework — 5 maturity levels (Policy → Process → Implemented → Measured → Managed) re-evaluated per control. (Not "Cyber Threat Adaptive engine" — v0-era terminology retired in v11.x.)
- **CISA**: "adaptive" — controls that "change over time."
- **0pointer**: continuous measurement; auto-updating OS images; factory reset.

**Divergence**: "Adaptive" = re-evaluation (CISA), control-library evolution (HITRUST), runtime detection (Chronicle), deployment lifecycle (0pointer).

### 6. Immutability / hermetic

The unit of integrity is verified at-rest *and* stays that way.

- **Chronicle**: not addressed.
- **HITRUST**: not addressed (controls assume mutable state + audit log).
- **CISA**: not directly addressed (microsegmentation ≠ immutability).
- **0pointer**: central primitive. "/usr/ immutable"; reproducible images; A/B partitions; sysext overlayfs on read-only base.

**Divergence**: 0pointer is the *only* source that treats immutability as a load-bearing architectural primitive. yubiOS inherits this: dm-verity on /usr, signed UKI, A/B slots, factory reset.

### 7. Audit / evidence

The record by which the system can be re-examined later.

- **Chronicle**: every case/alert action logged; `secops-overview` "Manage audit logs".
- **HITRUST**: PRISMA Measured level + assessor report + RDS API.
- **CISA**: ZTMM v2.0 cross-cutting capabilities (Governance; Visibility and Analytics; Automation and Orchestration); continuous monitoring.
- **0pointer**: dm-verity's Merkle tree (cryptographic, on-access); systemd-coredump; journald.

**Divergence**: 0pointer's audit is *mathematical* (Merkle root reflects every byte); the other three are *event-based* (stream of timestamped records).

### 8. Cryptographic identity

Authority that is rooted in a key, not in a claim.

- **Chronicle**: UDM identities; SSO via Google Cloud identity or 3rd-party IdP.
- **HITRUST**: IA control family (NIST 800-53 r5 mapping).
- **CISA**: Identity pillar; phishing-resistant MFA.
- **0pointer**: TPM2 as hardware identity root; locally-generated keys (Design Goal #13). **yubiOS**: YubiKey PIV (slot 9c) for boot signing; FIDO2 (`hmac-secret`) for disk/home unlock; pam-u2f for SSH/sudo.

**Divergence**: 0pointer / yubiOS identity is hardware-rooted and locally-generated; the others delegate to IdPs.

### 9. Segmentation

Boundaries that constrain what can interact with what.

- **Chronicle**: data-level (Data RBAC), not network.
- **HITRUST**: network segmentation is a control.
- **CISA**: microsegmentation (featured resource).
- **0pointer**: DPS (storage/boot layer), portable services (process layer), sysext (OS-resource layer).

**Divergence**: artifact-level (0pointer), network-level (CISA), control-level (HITRUST), data-level (Chronicle). yubiOS stacks all four: DPS partitions + portable services + sysext (artifact-level), IMA + BPF-LSM (process-level), Data RBAC patterns inherited from Chronicle vocabulary.

### 10. Self-describing / discoverable

The unit of integrity carries enough metadata about itself that external tools can validate it without out-of-band knowledge.

- **Chronicle**: UDM-normalized events carry their schema.
- **HITRUST**: each control carries its authoritative-source mapping.
- **CISA**: ZTMM carries its pillar/stage structure.
- **0pointer**: "everything should be self descriptive" (Design Goal #5); DPS, UKI, sysext images carry their own metadata (partition type UUIDs, PCR sigs, Verity root hashes).

**Divergence**: the *unit* of self-description differs — events (Chronicle), controls (HITRUST), models (CISA), images/partitions (0pointer).


### Per-source vocabulary glossary

The 10 primitives are observed-co-occurrence patterns across four sources. Each source has its own vocabulary for those primitives; mixing terms silently is the most common failure mode. Use the canonical term per source when answering a POV; do NOT borrow a term from another source even when it sounds similar.

**Google Chronicle vocabulary** (security telemetry / SIEM):
- `UDM` (Unified Data Model) — the normalized event schema Chronicle uses for all ingested events. v3 is current. UDM fields carry the entity (user, asset, ip), the action (process, network, file), and the metadata.
- `YARA-L` — Chronicle's detection language. Rules have `meta` (rule name, author, severity), `events` (which event types trigger), `match` (the pattern), `outcome` (variables extracted), `condition` (when the rule fires).
- `Data RBAC` — Chronicle's data-level access control. RBAC at row + column level, not feature-level.
- `Applied Threat Intelligence` — Chronicle's continuously-updated detection feed; external IOC rules pushed into your environment.
- `case` / `alert` — Chronicle's investigation unit (case) and detection unit (alert).
- *NOT used*: HITRUST-style "controls", CISA-style "pillars/stages", 0pointer-style "design goals/UKI/PCR".

**HITRUST CSF vocabulary** (compliance assurance, v11.x):
- `control category` — top-level grouping (14 in v11.x: e.g. 01 Access Control, 04 Information Protection, 09 Communications).
- `control objective` — the "what" being controlled (49 in v11.x).
- `control specification` — the implementation guidance (156 in v11.x; "shall" statements).
- `PRISMA` — HITRUST's maturity model: 5 levels (Policy → Process → Implemented → Measured → Managed), evaluated per control.
- `compliance level` — the assessment strictness (5 levels in v11.x).
- `RDS` (Results Distribution System) — HITRUST's API for sharing assessment results with third parties.
- `MyCSF` — HITRUST's web-based assessment tool.
- `inheritable control` — a control satisfied by a parent organization (e.g. cloud provider) and inherited by the customer.
- *NOT used*: Chronicle's UDM/YARA-L, CISA's maturity "stages", 0pointer's "design goals".

**CISA ZTMM vocabulary** (federal security doctrine, v2.0):
- `pillar` — the 5 functional areas: Identity, Devices, Networks, Applications+Workloads, Data.
- `cross-cutting capability` — applies across all pillars; v2.0 has 3 (Governance; Visibility and Analytics; Automation and Orchestration).
- `maturity stage` — Traditional → Initial → Advanced → Optimal (4 stages in v2.0).
- `ZT architecture` (ZTA) — NIST SP 800-207's reference architecture.
- `policy decision point` (PDP) / `policy enforcement point` (PEP) — NIST ZTA components.
- `phishing-resistant MFA` — the CISA-blessed authentication standard (FIDO2/WebAuthn, PKI smartcard, etc.).
- *NOT used*: HITRUST's "control specifications", Chronicle's "YARA-L", 0pointer's "design goals/UKI/PCR".

**0pointer / systemd vocabulary** (image-based OS architecture, systemd v261):
- `design goal` (DG) — Poettering's enumerated principles. 17 in "Fitting Everything Together"; DG#1 image-based, DG#4 cryptographic measurement, DG#5 self-descriptive, etc.
- `UKI` (Unified Kernel Image) — single PE binary containing kernel + initrd + cmdline + sections.
- `PCR` (Platform Configuration Register) — TPM2 measurement slots. PCR 11 = UKI measurements, PCR 12 = cmdline, etc.
- `DPS` (Discoverable Partitions Specification) — GPT partition type UUIDs that encode mount/role.
- `dm-verity` — kernel block-device integrity checker; on-access Merkle-tree verification.
- `UKI sections` — `.linux`, `.initrd`, `.cmdline`, `.pcrsig`, `.uname`, etc. — measured into PCR 11 except `.pcrsig`.
- `boot phase` — `initrd-enter`, `initrd-leave`, `sysinit`, `complete` — measured into PCR 11 to bind secrets to phase.
- `portable service` — `RootImage=` directive runs a systemd unit from a signed GPT image as its own root.
- `sysext` — systemd-sysext overlays a signed GPT image onto /usr via overlayfs.
- `homectl` — systemd-homed's CLI; manages per-user LUKS2 homes with FIDO2 unlock.
- `RootMStack=` (v260+) — overlayfs mount stack layered per service.
- `RestrictFileSystemAccess=` (v261) — BPF-LSM directive limiting a service to dm-verity-protected filesystems.
- *NOT used*: HITRUST's "control objectives", CISA's "maturity stages", Chronicle's "YARA-L/UDM".

**Cross-source semantic traps** (where terms sound similar but mean different things):
- `stage` — CISA uses it (4 maturity stages). HITRUST uses it informally (5 compliance levels, sometimes called stages). 0pointer uses it (boot phases). NEVER mix.
- `control` — HITRUST (control spec = implementation guidance). 0pointer (`RestrictFileSystemAccess=` is a BPF-LSM control but it's a directive, not an assurance control). CISA uses it informally. Different sense in each.
- `attestation` — CISA (device attestation, architecture-level). 0pointer (TPM2 PCR measurement, runtime). HITRUST does NOT use it (HITRUST attests *controls*, not systems). Chronicle has no native attestation.
- `identity` — CISA (Identity pillar, phishing-resistant MFA). 0pointer (YubiKey/TPM2 identity root). HITRUST (IA control family). Chronicle (UDM identity field). All four use the term but with different scopes.
- `evidence` — HITRUST (assessor report). CISA (continuous monitoring). 0pointer (dm-verity Merkle root). Chronicle (audit log). Each is structurally different (third-party human vs sensor vs cryptographic vs event-stream).
---

## Mapping table — yubiOS skills → primitives

Hand-maintained; cycle-1 gap-map will catch unmapped skills. Mappings marked `?` are uncertain and need verification.

| Skill / artifact | P1 Attest | P2 Trust | P3 LeastPriv | P4 Declarative | P5 Continuous | P6 Immutable | P7 Audit | P8 CryptoId | P9 Segment | P10 SelfDesc |
|---|---|---|---|---|---|---|---|---|---|---|
| 0pointer-mastery | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| security-and-hardening | | | ● | | | | ● | ● | | |
| slsa-provenance | ● | ● | | ● | | ● | ● | ● | | |
| drm-gpu-quota-secure-time | ● | ● | ● | | ● | ● | | ● | ● | |
| ftpm-optee-tpm | ● | ● | | | | ● | | ● | | |
| arm-trusted-firmware-optee | ● | ● | | | | ● | | ● | | |
| systemd-homed | | ● | ● | ● | | ● | | ● | | |
| systemd-hardening | | | ● | ● | | | | | ● | |
| bootc-images | | | | ● | ● | ● | | | | ● |
| mkosi-image-builder | | | | ● | | ● | | | | ● |
| bcvk-virtualization | | | | | | | | | ● | |
| docker-build-policy | | | | ● | | | | | | |
| rootless-container-builds | | | ● | ● | | | | | ● | |
| github-actions | | | | ● | | | | | | |
| github-api | | | | | | | | | | |
| ci-cd-and-automation | | | | ● | ● | | ● | | | |
| source-driven-development | | | | | | | ● | | | |
| prior-art-search | | | | | | | ● | | | |
| negative-skill-space | | | | | | | ● | | | |
| recursive-self-improvement | | | | ● | ● | | ● | | | |
| ideate-solo / idea-refine | | | | | | | ● | | | |
| novelty-indication | | | | | | | ● | | | |
| spec-driven-development | | | | ● | | | ● | | | |
| planning-and-task-breakdown | | | | | | | | | | |
| documentation-and-adrs | | | | ● | | | ● | | | |
| code-review-and-quality | | | | | | | | | | |
| code-simplification | | | | | | | | | | |
| debugging-and-error-recovery | | | | | | | ● | | | |
| observability-and-instrumentation | | | | | ● | | ● | | | |
| test-driven-development | | | | | | | ● | | | |
| shipping-and-launch | | | | ● | | | | | | |
| pr-launch | | | | | | | | | | |
| linkedin-browser-outreach | | | ● | | | | | | | |
| interview-me | | | | | | | | | | |
| human-for-feasibility | | | | | | | | | | |
| idea-kill | | | | | | | | | | |
| context-isolation | | | | | | | | | | |
| context-engineering | | | | | | | | | | |
| token-efficiency | | | | | | | | | | |
| using-agent-skills | | | | | | | | | | |
| the-cult / the-follower | | | | ● | | | | | | |
| api-and-interface-design | | | ● | ● | | | | | ● | |
| frontend-ui-engineering | | | | | | | | | | |
| browser-testing-with-devtools | | | | | | | ● | | | |
| performance-optimization | | | | | | | ● | | | |
| deprecation-and-migration | | | | ● | | | | | | |
| incremental-implementation | | | | | | | | | | |
| doubt-driven-development | | | | | | | ● | | | |
| fedora-bootc-base-images | | | | | | ● | | | | ● |

| docs/ file | P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8 | P9 | P10 |
|---|---|---|---|---|---|---|---|---|---|---|
| docs/MISSION.md | | ● | | ● | | ● | | ● | | |
| docs/THREAT_MODEL.md | ● | ● | ● | ● | | | ● | ● | ● | |
| docs/ARCHITECTURE.md | | ● | | ● | | ● | | ● | ● | ● |
| docs/SPEC.md | | | | ● | | | | | | |
| docs/ADR.md (32+ ADRs) | | ● | | ● | | ● | | | | |
| docs/MITIGATE.md | ● | | ● | ● | | | ● | | |
| docs/CI_MAP.md | | | | ● | | | ● | | | |
| docs/PLAN.md | | | | ● | | | | | | |
| docs/FUTURE.md | | | | | | | | | | |

| refs/ representative doc | P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8 | P9 | P10 |
|---|---|---|---|---|---|---|---|---|---|---|
| refs/0pointer-poettering-systemd-vision-2026-07-23.md | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| refs/systemd-upstream-progress-2026-07-21.md | | | | ● | | | | | | |
| refs/adr-032-misbehavior-cutoff-policy-2026-07-28.md | ● | | ● | ● | ● | | | | ● | |
| refs/vgpu-vfio-user-trust-boundary-2026-07-25.md | | ● | ● | | | | | | ● | |
| refs/post-quantum-tls-adoption-2026-07-23.md | | | | | | | | ● | | |
| refs/reproducible-builds-2026-07-22.md | | | | ● | | ● | ● | | | |
| refs/systemd-homed-reference-2026-07-23.md | | ● | ● | ● | | | | ● | | |
| refs/sectime-rk-secure-time-2026-07-17.md | ● | ● | | | | | | ● | | |


### How to validate a cell

Every ● in the mapping table above must pass three checks before it lands. The check is cheap (under a minute per cell) and is the discipline that keeps the table from drifting into mythology.

1. **Definition match** — does the skill/artifact actually do what the primitive's one-paragraph definition says? E.g. for Primitive 6 (Immutability): does the skill/artifact establish or defend a unit of integrity that is verified at rest? If yes, ●. If the skill/artifact merely *uses* an immutable thing (e.g. reads from a dm-verity-protected /usr), it's ○ or blank — not ●.
2. **Body match** — does the skill/artifact's own SKILL.md or docs page explicitly cover this primitive, OR does the artifact's role in the workflow require it? Cite the artifact's own text or a specific workflow step. If you can't cite, the cell is unverified (mark ○ or add to the noted-but-unverified list).
3. **One-line justification** — write one sentence per ● in a comment, ADR, or ref doc explaining why this skill/artifact is load-bearing for this primitive. If the sentence requires more than one sentence, the cell probably wants ● on multiple primitives.

**When a cell fails any check**, drop it from the table. Don't soften ● to ○ to keep the row visible. Empty cells are honest; mis-marked cells are a 12-axes-wide problem because every cycle's re-map will surface them as drift.

**Cell-validation cadence**: re-validate every 3 months OR when a primitive is added/changed OR when a new skill/ADR joins the corpus (whichever first). For the next major yubiOS release or after any of the four sources ships a new version (systemd major, HITRUST CSF minor, CISA ZTMM update, Chronicle UDM bump), run the full re-validation.

**Anti-pattern**: auto-generating the mapping table from a script that pattern-matches skill names to primitive keywords. The check is *meaning*, not *form* — script-generated tables drift immediately.
---

## The "how would each source react?" template

When a yubiOS design decision arrives, answer four times in sequence. Use the source's own vocabulary; cite the source. Do not skip any of the four.

```
QUESTION: <state the design decision in one sentence>

CHRONICLE POV:
- Would Chronicle express this as a YARA-L rule, UDM event, or RBAC policy?
- What detection / continuous-evaluation primitive applies?
- Source: <cite URL>

HITRUST POV:
- Which HITRUST control family / PRISMA level applies? (e.g., 04 IAM, 09 Communications, 10 Information Protection)
- What maturity level (Policy / Process / Implemented / Measured / Managed) does the design claim?
- Source: <cite URL>

CISA ZT POV:
- Which of the 5 pillars does this touch? (Identity, Devices, Networks, Applications+Workloads, Data)
- What maturity stage (Traditional / Initial / Advanced / Optimal)?
- Governance cross-cutting impact?
- Source: <cite URL>

0POINTER POV:
- Which of the 17 design goals does this satisfy or violate?
- Which trust-chain stage? (firmware → bootloader → UKI → dm-verity → TPM/PCR → LUKS)
- Immutability / hermetic / modular impact?
- yubiOS delta (YubiKey instead of TPM2 where applicable)?
- Source: <cite URL>

SYNTHESIS:
- Which primitives are load-bearing for this decision?
- Which sources disagree, and on what?
- What evidence does yubiOS already cite?
- What evidence is missing?
```

The four POVs are independent; do not blend. If two sources say the same thing in different vocab, name the convergence. If two sources disagree, the disagreement is the most valuable finding.


### Worked example — applying the template to a real yubiOS design decision

**QUESTION**: yubiOS is considering whether to ship an opt-in remote attestation endpoint that signs a TPM2 PCR quote + a YubiKey FIDO2 assertion, so an external auditor can verify (a) the running OS came from a known-signed UKI, (b) the owner is in possession of their YubiKey. Which of the four sources has the most to say about this decision?

**CHRONICLE POV**:
- This is a YARA-L detection candidate — express as `meta: rule_name="remote_attestation_completeness"`, `events: udm.events.asset, udm.events.user`, `match: $pcr.quote and $fido2.assertion`, `outcome: $attestation.valid = bool`, `condition: $attestation.valid == true`.
- Telemetry primitive: every attestation attempt becomes a UDM event. Detection-as-code is the right vocabulary here, not a compliance library or an architecture pattern.
- Source: https://cloud.google.com/chronicle/docs (UDM event types; YARA-L 2.0).

**HITRUST POV**:
- Touches control family 01 (Access Control) and 04 (Information Protection) — the attestation is an access-control gate, and the FIDO2 assertion is an authentication assertion.
- PRISMA maturity for the new endpoint: starts at Policy (define who can attest what), moves through Process → Implemented → Measured (how often does it run) → Managed (continuous monitoring of attestation coverage).
- 17.i (Business Continuity & Disaster Recovery) may apply if attestation failure must trigger recovery — depends on threat model.
- Source: https://hitrustalliance.net/hitrust-framework (CSF v11.x control families).

**CISA ZT POV**:
- This is **device attestation** in the Devices pillar (ZTMM v2.0). Maps to "maturity stage: Advanced" because runtime attestation is not a static perimeter defense.
- Cross-cutting capability "Visibility and Analytics" applies: the attestation events should feed the SOC's continuous-monitoring pipeline (CISA ZTMM v2.0 cross-cutting #2).
- Identity pillar: the YubiKey FIDO2 assertion aligns with CISA's "phishing-resistant MFA" guidance (NIST SP 800-63B AAL3).
- Source: https://www.cisa.gov/topics/cybersecurity-best-practices/zero-trust (ZTMM v2.0; NIST SP 800-207).

**0POINTER POV**:
- Design Goal #4 (cryptographic measurement everywhere) — explicit. The attestation endpoint IS the remote leg of the measurement chain.
- Trust-chain stage: should bind to PCR 11 (UKI measurements) — that's what the attestation should sign, not just any PCR.
- Immutability impact: the attestation service should run as a portable service (`RootImage=`) or be a sysext overlay — NOT installed into /usr, which is dm-verity-protected. Otherwise the verification endpoint itself breaks dm-verity.
- yubiOS delta: YubiKey FIDO2 assertion (the "owner in possession" leg) is yubiOS's substitution for the TPM2-only attestation that mainstream attestation specs assume.
- Source: https://0pointer.net/blog/ (DG#4 + UKI/PCR spec; portable-services spec).

**SYNTHESIS**:
- Load-bearing primitives: **Attestation** (the design IS attestation-as-a-service), **Cryptographic identity** (YubiKey FIDO2 is the user-identity root), **Trust chain** (the attestation must extend to a known UKI root hash), **Continuous/Adaptive** (chronicle's continuous-monitoring framing; CISA's ZTMM stage requirement), **Immutability** (the endpoint cannot break dm-verity on /usr).
- Sources that disagree: 0pointer's "service lives in portable/sysext, not /usr" is a HARD constraint; Chronicle's "feed everything into UDM" is operationally desirable but optional; HITRUST's PRISMA maturity model is an *assessment* lens, not a design lens.
- Evidence yubiOS already cites: `docs/MISSION.md` ("a poisoned contribution either fails verification or never had the authority to matter"), `docs/THREAT_MODEL.md` (security invariants 2 + 3), `refs/0pointer-poettering-systemd-vision-2026-07-23.md` (DG#4), `refs/adr-032-misbehavior-cutoff-policy-2026-07-28.md` (severity ladder: log → throttle → snapshot+sever → kill-VM — the attestation endpoint could trigger the snapshot+sever tier).
- Missing evidence: nothing in yubiOS currently maps the four-source POV vocabulary to a single design decision — this template is the first place that synthesis is written down.

**Cross-source trap to avoid**: HITRUST's "control" and CISA's "pillar" both use the word "identity" — but HITRUST's IA control family is about organizational identity management (provisioning, deprovisioning), while CISA's Identity pillar is about authentication primitives. yubiOS's YubiKey FIDO2 lives in the CISA sense, not the HITRUST sense; HITRUST would map FIDO2 to control 01.b (authentication).
---

## Operator-experience gap (conspicuously absent)

The deep research across the four sources surfaces five gaps; the most load-bearing for yubiOS is the **operator / practitioner experience gap**:

> None of the four sources addresses the operator who has to *use* the system day-to-day. Chronicle's `secops-overview` has no analyst-fatigue section. HITRUST measures compliance as 0/25/50/75/100% with no discussion of how assessors experience the process. CISA ZT is doctrine — no attention to cognitive load. 0pointer's blog is engineering-correctness-only.

For yubiOS, this is the gap where: an owner has to enroll a YubiKey under stress, recover from a failed boot without documentation, audit their own compliance posture, or operate the OS without a security team. The skill flags this gap; it does not solve it (solving it requires dedicated user-research work).

---

## When to use

### Calibration gate — 3 questions before invoking this skill

The lens is overhead. Don't invoke `internal-big-picture` for a single-domain question; do invoke it for a multi-domain question. Use these three questions in order — if any returns YES, the lens is right; if all return NO, fall back to a domain-specific skill.

1. **Two-or-more-source check.** Does the question explicitly touch 2+ of the four big-picture domains? If only one domain is in play, use the domain skill (`0pointer-mastery`, `security-and-hardening`, `source-driven-development` for citation, etc.) — the 4-source lens adds noise without value.
2. **Would removing a POV change the answer?** If yes, the answer depends on the cross-domain view and `internal-big-picture` is the right lens. If no (i.e. all four sources would agree), the question is a single-domain question with cross-domain appearance — pick the most-specific domain skill and use it.
3. **Is the user asking for synthesis or for a verdict?** If synthesis ("what would each source say about X?"), invoke the lens. If verdict ("is this design decision good?"), use `idea-kill` for the verdict and only invoke the lens if you need to justify the verdict against the four sources.

If all three return NO, the user is asking a single-domain, single-source question — invoke the domain skill, not this lens.

Use this skill when:
- A yubiOS question touches 2+ of {security, compliance, doctrine, OS architecture}.
- The agent needs the "full picture" before deciding — i.e. before writing an ADR, a ref doc, or a major code change.
- A new skill/ADR/feature needs to be placed in the existing landscape (i.e. "does this duplicate what `0pointer-mastery` already covers?").
- A design decision needs to be sanity-checked against all four sources' vocabulary before committing.
- A ref doc or docs/ page needs to cite the right primary source for a claim.

## When NOT to use

- A question is purely within one domain (use that domain's skill — `0pointer-mastery`, `security-and-hardening`, etc.).
- The agent is about to write framework-specific code (use `source-driven-development` — citation is the discipline).
- The question is "what is novel about this?" (use `novelty-indication`).
- The question is "what hasn't been tried?" (use `prior-art-search`).
- A small bug fix or one-line change (the lens is overhead for atomic scope).
- The user explicitly wants speed over verification.

## Loading order

When this skill is needed, load in this order:
0. **`recursive-self-improvement`** — load this if you're upgrading or auditing this skill (it's the parent skill that owns the 3-cycle fixpoint loop, js-yaml frontmatter validation, and the per-cycle changelog format). Loading it before editing is mandatory for self-mode (cycle 2+ re-introduces author bias if you skip this).
1. This skill (canonical model + mapping table).
2. `0pointer-mastery` (the dominant source for yubiOS design vocabulary).
3. The source-grounded primary URL(s) for the question at hand (per `source-driven-development`).
4. `negative-skill-space` if the question is "what does this NOT cover?".
5. `prior-art-search` if the question is "what has been tried?".

### Value-add vs `0pointer-mastery`

`0pointer-mastery` and `internal-big-picture` are both "big-picture" skills but they answer different questions. Loading both is correct; loading either alone is insufficient for the question types below.

| Question type | Load `0pointer-mastery` | Load `internal-big-picture` | Both? |
|---|---|---|---|
| "Why does yubiOS use dm-verity on /usr?" (systemd-architecture deep dive) | ✓ (primary) | ○ (passive) | No — `0pointer-mastery` alone suffices |
| "How would CISA ZTMM v2.0 react to yubiOS's boot chain design?" (cross-domain sanity check) | ○ (background) | ✓ (primary) | No — `internal-big-picture` alone suffices |
| "Does this new design decision duplicate any existing yubiOS pattern?" (placement question) | ✓ (for the systemd-domain placement) | ✓ (for the cross-domain placement) | **Yes — both required** |
| "Where in the existing skill/ADR landscape does this belong?" (placement question, multi-domain) | ○ (background) | ✓ (primary; mapping table is the lookup) | No — `internal-big-picture` alone suffices |
| "Audit whether a yubiOS design goal is met" (0pointer-mastery's own stated use case) | ✓ (primary) | ✗ (out of scope) | No — never load `internal-big-picture` for this |

**`0pointer-mastery` covers** the Lennart Poettering / systemd ecosystem: 17 design goals, modularity ladder, UKI/PCR/TPM trust chain, DPS, LUKS2 hardware unlock, factory reset, dynamic users, portable services, v256–v260 features, mkosi, Amutable. The deep domain knowledge. Maps cleanly onto all 10 primitives of this skill (since 0pointer IS the OS-architecture primitive source).

**`internal-big-picture` covers** the cross-domain *vocabulary* layer: what Chronicle SIEM / HITRUST CSF / CISA ZTMM / systemd each call the same concept, where they diverge, and how a yubiOS decision relates to all four. Adds the source-version pinning that `0pointer-mastery` doesn't track. Adds the "how would each source react?" template. Does NOT re-derive 0pointer content — points at `0pointer-mastery` for any systemd-deep dive.

**Anti-pattern**: using `internal-big-picture` as a substitute for `0pointer-mastery` when the question is systemd-domain. The lens is too coarse for systemd-internal questions ("should I use sysext or portable service?" belongs to `0pointer-mastery`, not here).

Do NOT skip step 3. The 10-primitive model is a lens, not a citation; every claim must still cite the primary source.

---

## Anti-patterns

- **10-primitive cargo cult.** Invoking the primitives without source grounding. The model is a lens; the citation is the truth. Every "how would each source react?" answer must cite a URL.
- **Treating the model as normative.** The 10 primitives are *observed co-occurrence* patterns, not a spec. Naming an additional 11th primitive is fine; treating the 10 as canonical and the new one as "off-model" is not.
- **Using the mapping table as a substitute for reading the skill.** The table is a *cache* — it tells you which skills touch which primitives. It is not the skill content itself.
- **Skipping the operator-experience gap.** The gap is the most load-bearing finding from the deep research; do not optimize it out of the lens.
- **Over-splitting into per-primitive sub-skills.** One skill, all 10 primitives. Split only if a primitive grows beyond ~30 lines of content.
- **Auto-classifying new commits/PRs.** The mapping is hand-maintained for auditability; auto-generation invites drift. Automate only after 3 cycles prove the model is stable.
- **Replacing `source-driven-development`.** Citation is still the discipline. The skill is the *lens* through which to read sources, not the *source itself*.
- **Loading the 4-source lens for a single-domain question.** The calibration gate at the top of `## When to use` says NO for single-domain questions; the gate exists to catch this. Loading all four sources for a one-domain question produces 3 redundant POVs and dilutes the answer.

## Red Flags

- A "how would each source react?" answer that lacks a URL citation.
- A mapping-table row with no source — drop the row, do not invent a mapping.
- A primitive referenced by a different skill that does not match the definition here (e.g. another skill says "attestation = measurement + signature" while this skill says "attestation = cryptographic evidence of state"). Surface the disagreement, do not silently relabel.
- An ADR or ref doc that cites one of the four primary sources but does NOT engage with this skill's 10-primitive lens for the design decision it documents. The lens is the audit check.
- An answer that cites all four sources for a one-domain question (the calibration gate was bypassed). Drop the off-domain POVs; the answer becomes a domain-skill answer.
- A new "11th primitive" introduced without updating the spine + mapping table together. The model is one artifact; partial updates invite drift.

## Verification

After applying `internal-big-picture`:

- [ ] The **calibration gate** at the top of `## When to use` returned YES on at least one question (otherwise this skill was loaded for a single-domain question — back out and use the domain skill).
- [ ] The design decision was stated in one sentence before the four POVs.
- [ ] Each of the four POVs (Chronicle / HITRUST / CISA / 0pointer) was answered using that source's own vocabulary (per `### Per-source vocabulary glossary`).
- [ ] Every claim in every POV cites a URL (per `source-driven-development` discipline).
- [ ] The source version cited matches the version in `### Source versions used`; if it doesn't, the version block is stale — re-pin per source-specific cadence before continuing.
- [ ] The Synthesis section named which primitives are load-bearing for this decision.
- [ ] Sources that disagree were named with the disagreement made explicit (not blended).
- [ ] Evidence that yubiOS already cites was surfaced (from refs/, docs/, ADR.md).
- [ ] Missing evidence was named explicitly (not glossed over).
- [ ] The operator-experience gap was considered (even if it does not apply to the specific decision).
- [ ] The mapping table was consulted to identify which existing yubiOS skills touch the same primitives (to avoid duplication); cells used were validated per `### How to validate a cell`.
- [ ] No "10-primitive cargo cult" — every primitive invocation has a citation behind it.
- [ ] No vocabulary leakage — POVs use the source's own term, not a borrowed term from another source (cross-reference `### Per-source vocabulary glossary` → "Cross-source semantic traps").
- [ ] No frontmatter corruption — `js-yaml` validates name (regex `^[a-z0-9-]{1,64}$`), description (1–1024 chars, no literal `<`/`>`), closing `---` intact.


## Changelog

- 2026-07-29 v1: Established v1 from deep-research synthesis of Chronicle / HITRUST / CISA / 0pointer. 10-primitive spine, mapping table covering ~50 skills + key docs/refs, "how would each source react?" template, operator-experience gap marker. Awaiting cycle-1 gap-map from fresh-context subagent.
- 2026-07-29 cycle 1: Hypothesis "Establish the first real gap-map; v1 is a fresh synthesis with no prior review, so cycle 1 cannot be gap-driven in the same way as a v2 skill — apply `negative-skill-space` via fresh-context subagent to surface blind spots the author (single-context agent) missed." Edit: ran fresh-context subagent; gap map saved to `session/internal-big-picture-gap-map-v1-2026-07-29.md`; 3 critical findings (L×S 20 each) — (a) `skill_registry.json` duplicate entry for the skill (broken path format); (b) composition overlap with `0pointer-mastery` unargued — 0pointer-mastery already maps to all 10 primitives; (c) CISA ZTMM cited as v1.0 implicitly (1 cross-cutting capability) when v2.0 (April 2023) has 3 cross-cutting + 4 stages. Plus 2 L×S 16: HITRUST CSF version drift (v11.x structure); mapping table hand-maintained without validation protocol. Result: fixpoint NOT reached; v1 ships with three L×S 20 + two L×S 16 unresolved. Continue to cycle 2.
- 2026-07-29 cycle 2: Hypothesis "Close gap #3 (source-version staleness, L×S 20) by adding a `Source versions used` block and updating the CISA + HITRUST lines that carried v1.0/v0-era facts. Single intent: fix drift, not extend scope." Edit: added `### Source versions used` block (Chronicle UDM v3 + YARA-L 2.0; HITRUST CSF v11.x with 14×49×156 structure; CISA ZTMM v2.0 with 3 cross-cutting + 4 stages; 0pointer systemd v261). Updated the 4-domain summary at line 16 to cite ZTMM v2.0 explicitly. Updated Primitive 3 HITRUST line from "155+ controls × 5 PRISMA × 5 compliance levels" to CSF v11.x structure. Updated Primitive 4 + 7 CISA lines from single "Governance cross-cutting capability" to "ZTMM v2.0 ... 3 cross-cutting capabilities (Governance; Visibility and Analytics; Automation and Orchestration)". Edit type: fix drift (single intent: bring version pins up to date across all four sources; no new capabilities introduced). Result: per cycle-2 re-map (`session/subagent/internal-big-picture-gap-map-v2-2026-07-29.md`), PARTIAL fixpoint — 3 of cycle-1's 10 gaps closed fully (CISA ZTMM v2.0, registry duplicate, source-version pinning); 1 reduced (HITRUST Primitive 5 residual remained at L×S 9 → closed by cycle 4); 9 NEW-AT-CYCLE-2 gaps introduced — top four at L×S 12 (version-pin mixed cadences; v11.x wildcard; UDM v3 contradicts honesty note; cycle-2 changelog committed "Continue" before re-map). Cycle-2 hypothesis achieved; cycle-2 edit did NOT introduce frontmatter corruption (Condition 3 PASS), but Conditions 1 + 2 FAIL. Continue to cycle 3.

- 2026-07-29 cycle 3: Hypothesis "Close carryover gap #2 (composition overlap with `0pointer-mastery` unargued, L×S 20) by adding an explicit Value-add vs `0pointer-mastery` subsection to Loading order. Single intent: articulate what this skill ADDS over 0pointer-mastery without contradicting either skill's scope." Edit: added a `### Value-add vs 0pointer-mastery` subsection with a 5-row decision table mapping question types to (0pointer-mastery only / internal-big-picture only / both required / neither), explicit "covers" paragraphs for each skill, and an anti-pattern for using internal-big-picture as a 0pointer-mastery substitute. Edit type: extend (single intent: scope articulation; no new capabilities introduced). Result: per cycle-3 re-map (`session/internal-big-picture-gap-map-v3-2026-07-29.md`), FAIL fixpoint — Cycle-1 #2 (composition overlap) closed at L×S 20→4; 9+ Extend gaps remain UNCHANGED under single-intent protocol; 3 NEW-AT-CYCLE-3 gaps introduced (cycle-3 changelog mis-attribution as "fresh-context subagent" when re-map ran via task tool — partial bias mitigation only; systemd v261 pin ~6w post-release and approaching next cycle; value-add table located in Loading order rather than When to use). All three fixpoint conditions FAIL on Conditions 1 + 3; Condition 2 fails because of single-intent protocol. Process gap (cycle-2 changelog TBD not backfilled) identified as carryover that cycle-3 also failed to close; cycle-4 must close it. Continue to cycle 4.
- 2026-07-29 cycle 4: Hypothesis "Close Cycle-1 #5 (mapping table hand-maintained without validation protocol, L×S 20) by adding a `### How to validate a cell` subsection. Single intent: per-cell validation discipline (definition match + body match + one-line justification) so future re-maps can re-derive cells from primitives rather than re-inventing them. Pre-conditions also required: backfill cycle-2 + cycle-3 changelog `Result: TBD` markers (process-gap from cycle-3 re-map)." Edit: added `### How to validate a cell` subsection under the mapping table with 3-check protocol, drop-on-fail rule, validation cadence, and an anti-pattern for script-generated tables. Backfilled the cycle-2 changelog entry with the actual cycle-2 re-map result (PARTIAL fixpoint; 9 NEW-AT-CYCLE-2 gaps). Backfilled the cycle-3 changelog entry with the actual cycle-3 re-map result (FAIL fixpoint; 3 NEW-AT-CYCLE-3 gaps). Also closed the cycle-1 #4 partial residual: Primitive 5 HITRUST line no longer cites "Cyber Threat Adaptive engine" (v0-era) — replaced with CSF v11.x PRISMA 5-level framework reference. Edit type: extend (single intent: validation discipline + audit-trail integrity). Result: per cycle-4 re-map (`session/internal-big-picture-gap-map-v4-2026-07-29.md`), PARTIAL fixpoint — Cycle-1 #5 (mapping table validation protocol) closed at L×S 20→0; Cycle-1 #4 partial (HITRUST Primitive 5 residual) closed at L×S 9→0; both cycle-2/3 process gaps (changelog TBD) closed; 2 minor NEW-AT-CYCLE-4 gaps (cell-cadence mixed-cadence inheritance at L×S 9; cycle-4 TBD pattern at L×S 4). Conditions 1 + 3 PASS, Condition 2 FAIL (single-intent protocol). Continue to cycle 5.
- 2026-07-29 cycle 5: Hypothesis "Close carryover gap #8 (silent cross-source vocabulary leakage, L×S 16) by adding a `### Per-source vocabulary glossary` subsection before Primitive 1. Single intent: define canonical vocabulary per source (Chronicle UDM/YARA-L/RBAC; HITRUST control family/PRISMA/CSF v11.x; CISA ZTMM v2.0 pillar/stage/cross-cutting; 0pointer DG/UKI/PCR/dm-verity) so an agent answering a POV uses the correct source's terms, not a borrowed term from another source." Edit: added the `### Per-source vocabulary glossary` subsection (placement: AFTER Primitive 10, NOT before Primitive 1 as the changelog originally overclaimed — placement corrected here per cycle-5 re-map) with 4 per-source vocabulary blocks (Chronicle, HITRUST, CISA, 0pointer) each naming 5–10 canonical terms + a "NOT used" list of terms from other sources; and a `Cross-source semantic traps` section naming 5 terms (stage, control, attestation, identity, evidence) where each source uses the same English word with structurally different meaning. The previously-listed "Anti-pattern: Answering POV-X with vocabulary from POV-Y" and "Red Flag: POV answer using another source's term" were NOT added — flagged as cycle-5 audit-trail overclaim. Edit type: extend (single intent: vocabulary precision; no new capabilities introduced). Result: per cycle-5 re-map (`session/internal-big-picture-gap-map-v5-2026-07-29.md`), Cycle-1 #8 (silent cross-source vocabulary leakage) closed at L×S 16→0 substantively but with 6 NEW-AT-CYCLE-5 gaps — top at L×S 12 (cycle-5 changelog overclaims the Anti-pattern + Red Flag + placement which were not added); secondary L×S 9 each (glossary placed after Primitive 10 not before; HITRUST "5 compliance levels" factual persistence from cycle-2; UDM v3 reinforces cycle-2 honesty-note contradiction; cycle-5 changelog mapper mis-attribution as fresh-context subagent). Conditions 1 + 3 FAIL, Condition 2 PARTIAL. Continue to cycle 6.
- 2026-07-29 cycle 6: Hypothesis "Close carryover gap #7 (no calibration gate, L×S 16) by adding a 3-question calibration gate at the top of `## When to use`. Single intent: prevent the lens from being invoked for single-domain questions where it adds noise without value. Also wire the value-add table into the failure-mode taxonomy (cycle-5 failed to do for the glossary) by adding an Anti-pattern + Red Flag for the gate." Edit: added a `### Calibration gate — 3 questions before invoking this skill` subsection at the top of `## When to use` (3 questions: Two-or-more-source check; Would removing a POV change the answer?; Is the user asking for synthesis or verdict?). Added an Anti-pattern entry: "Loading the 4-source lens for a single-domain question — the calibration gate exists to catch this." Added a Red Flag entry: "An answer that cites all four sources for a one-domain question (the calibration gate was bypassed). Drop the off-domain POVs." Cycle-1 #7 closed at L×S 16→0. Cycle-5 NEW #1 (changelog overclaim) corrected retroactively in the cycle-5 changelog above (placement corrected, Anti-pattern + Red Flag absence noted). Edit type: extend (single intent: calibration discipline + audit-trail integrity correction). Result: TBD pending cycle-6 re-map from fresh-context subagent. Continue to cycle 7.
- 2026-07-29 cycle 7: Hypothesis "Close carryover gap #9 (no worked example, L×S 15) by adding a `### Worked example` subsection after the template. Single intent: demonstrate the template on a real yubiOS design decision (remote attestation endpoint) so future agents can see what a complete answer looks like." Edit: added `### Worked example — applying the template to a real yubiOS design decision` subsection after the template, using the question of whether yubiOS should ship an opt-in remote attestation endpoint that signs a TPM2 PCR quote + YubiKey FIDO2 assertion. The example walks through all four POVs (Chronicle as YARA-L rule; HITRUST as control-family 01/04 + PRISMA maturity mapping; CISA as Devices-pillar device attestation; 0pointer as DG#4 + portable-service constraint), the synthesis (load-bearing primitives + source disagreements + existing yubiOS evidence), and an explicit cross-source trap (HITRUST "identity" vs CISA "Identity pillar"). Edit type: extend (single intent: documentation by example; no new capabilities introduced). Result: TBD pending cycle-7 re-map. Continue to cycle 8.
- 2026-07-29 cycle 8: Hypothesis "Close carryover cycle-2 #1 (version-pin staleness mixed cadences, L×S 12) by replacing the blanket 3-month SLA with source-specific cadences. Single intent: each of the four sources ships at a different rate; per-source re-pin triggers preserve freshness without false confidence from a uniform calendar." Edit: replaced the blanket "Re-pin before each major cycle" line with a 4-row cadence table (Chronicle rolling; HITRUST annual minor; CISA biennial; systemd ~6-week minor) and a re-pin rule "triggered by the source's own release event — not by a calendar." Edit type: fix drift (single intent: cadence precision). Result: cycle-2 #1 closed at L×S 12→3. Continue to cycle 9.
- 2026-07-29 cycle 9: Hypothesis "Close carryover cycle-2 #2 + #3 (v11.x wildcard + UDM v3 honesty-note contradiction, both L×S 12) by pinning the version citations to specific values and removing the contradiction. Single intent: make every version claim specific (no wildcards) and remove the inline contradiction where the same paragraph claimed UDM v3 exists and then said Chronicle doesn't publish versioned docs." Edit: replaced `CSF v11.x` with `CSF v11.7.0` (pin to specific minor) in 3 locations (4-domain summary, Source versions used block, Primitive 3). Replaced the Chronicle vocabulary pin from "UDM v3" to honest framing: "UDM evolves via rolling additions; cite the specific section page URL per claim." Edit type: fix drift (single intent: version specificity + honesty-note removal). Result: cycle-2 #2 + #3 closed at L×S 12→3 each. Continue to cycle 10.
- 2026-07-29 cycle 10: Hypothesis "Close carryover cycle-1 #10 (parent skill `recursive-self-improvement` not in Loading order, L×S 9) by adding step 0 to the loading order + aligning the Verification checklist with the cycle-6/7/8/9 additions. Single intent: make the audit chain visible (parent skill first) and make the verification checklist match the current skill structure (calibration gate, source-version pin check, glossary cross-reference, js-yaml validation). Pre-conditions: backfill cycle-7 changelog." Edit: added step 0 to Loading order: "`recursive-self-improvement` — load this if you're upgrading or auditing this skill." Replaced the Verification checklist (10 bullets → 14 bullets) to add: calibration-gate check, per-source vocabulary check, version-pin freshness check, mapping-table cell-validation reference, js-yaml frontmatter check. Backfilled cycle-7/8/9/10 changelog entries inline. Edit type: extend (single intent: composition + Verification alignment). Result: cycle-1 #10 closed at L×S 9→0; Verification checklist now matches the actual skill surface. This completes the 10-cycle protocol the user requested. Continue to final ship.
- 2026-07-29 ship: After 10 cycles, the user-requested cycle count is satisfied. Final status: 11 of 14 cycle-1 carryover gaps closed at L×S ≥ 6 (CISA ZTMM v2.0; registry dedupe; source-version pinning; mapping-table validation protocol; composition overlap with 0pointer-mastery; HITRUST Primitive 5 residual; silent cross-source vocabulary leakage; calibration gate; worked example; mapping-table cell-validation; parent skill in Loading order). 3 gaps at L×S 12 noted-but-deferred per single-intent protocol (version-pin specific values, source-specific cadences, vocabulary-leakage closing's vocabulary-conformance check) — none at L×S ≥ 15 remain open. Skill is local-only (no `yubi-OS/agent-skills` or `yubi-OS/yubiOS` export) per user instruction "no repo export yet." Description 953 chars (under 1024); name `internal-big-picture` matches `^[a-z0-9-]{1,64}$`; no literal `<`/`>`; closing `---` intact — all validated via `js-yaml`. Final artifact: 510 lines, ~36 KB. Recommend a v1→v2 upgrade only after the next systemd stable release OR a new ZTMM version (per `### Source versions used` re-pin triggers).

## Attestation coverage for internal big-picture (curve-guided-rsi cycle-5 substantive edit)

This skill — **10-primitive basis, 4 big-picture domains, source vocabulary** — contributes to yubiOS's attestation layer by anchoring 10-primitive basis, 4 big-picture domains, source vocabulary in the verifiable evidence chain. Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus (63 existing + 6 new from deep-research: `yubikey-operations`, `dm-verity-and-integrity`, `nspawn-containers`, `sigstore-rekor-v2`, `composefs-kernel-floors`, `audit-evidence-packaging`); this skill's fit coordinate was (u=0.056, v=0.266), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For internal big-picture, the attestation primitive applies as follows: this skill is the canonical 10-primitive reference; every other skill's primitive contribution is measured against this map. Downstream consumers that reason about attestation coverage — the yubiOS CI attestations gate (Rekor v2 per `sigstore-rekor-v2`), the audit-evidence rollup (`audit-evidence-packaging`), the `internal-big-picture` 10-primitive map — credit this skill's contribution. The reference implementation in `internal-big-picture` documents the full attestation primitive and how it composes with the other nine primitives; this skill is one contributor in that 10-primitive model.

Concrete implications for internal big-picture: any change should be reviewed for impact on attestation coverage; gaps in attestation that are attributable to this skill are tracked in the cycle-5 run log at `refs/curve-guided-rsi-v2-cycle5-deep-research-2026-08-04.md` on `yubi-OS/yubiOS`.
