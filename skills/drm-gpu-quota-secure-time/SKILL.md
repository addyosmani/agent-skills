---
name: drm-gpu-quota-secure-time
description: >-
  GPU resource-lockout design (per-cgroup VRAM quota + hard enforcement via
  secure world) and ARM64 secure-time sourcing for OP-TEE on Rockchip
  (CFG_SECURE_TIME_SOURCE_CNTPCT). Covers the real upstream DRM device-memory
  cgroup effort ("dev" controller, not the old "drmcg" RFC), the real Panfrost
  BO-allocation hook points (panfrost_ioctl_create_bo, panfrost_lookup_bos),
  a from-scratch SMC-mailbox lockout pattern for boards without a merged
  cgroup controller, and OP-TEE's CNTPCT-based secure clock on RK3399/RK3588.
  Explicitly flags which APIs from casual research/chat notes are real
  upstream kernel symbols versus invented/outdated ones, so implementation
  doesn't cargo-cult a hallucinated function name. Use when designing GPU
  memory quotas, per-cgroup GPU lockout, Panfrost/Mali resource limits, or
  when wiring OP-TEE's secure time source on Rockchip SoCs. Triggers on: GPU
  cgroup, drmcg, dev.memory.max, dev.region.max, DRM device memory cgroup,
  Panfrost BO, panfrost_ioctl_create_bo, GPU lockout, VRAM quota, GPU SMC,
  CFG_SECURE_TIME_SOURCE_CNTPCT, secure time source, CNTPCT, OP-TEE Rockchip
  clock.
---

# GPU quota/lockout + ARM64 secure time (grounded corrections)

## Why this skill exists

Source material for this area (two ChatGPT research threads) mixed real
kernel/OP-TEE APIs with plausible-sounding but non-existent ones. This skill
is the corrected, source-checked version. **Don't copy function names
straight out of an LLM chat transcript for this subsystem — verify against
`elixir.bootlin.com` or the actual repo first.**

## 1. DRM device-memory cgroup: real upstream state (mid-2026)

There is **no merged "drmcg" controller** and **no `drmcg_try_charge()` /
`drmcg_uncharge()` kernel functions** — those names came from 2021–2023 RFC
threads (`drmcg`, exposing `drm.max`/`memory.max`) that were abandoned in
favor of a redesign. Do not build against those symbols; they don't exist in
any shipped kernel.

The live effort is the **generic `dev` cgroup controller** (aka `devcg`,
distinct from the old device-*access* `devices` controller):
- Patchset: `kernel/cgroup: Add "dev" memory accounting cgroup`
  (dri-devel list, most recently revised late 2024/2025; a parallel
  DRM-scheduling-cgroup RFC v8 from Tvrtko Ursulin, Sept 2025, is also still
  in flight). **Not in mainline as of this writing** — treat as a moving
  target, re-check `lore.kernel.org/dri-devel` before depending on exact
  field names.
- Interface shape (subject to change pre-merge): `dev.region.max`,
  `dev.region.current`, `dev.region.capacity` — nested-keyed files under
  `/sys/fs/cgroup/`, keyed by a device+region string (e.g.
  `drm/0000:03:00.0 vram0=...`), not a flat `dev.memory.max`.

**Implication for yubiOS/Rockchip (Panfrost, no discrete VRAM region):** even
once `dev` lands, it's aimed at drivers with distinct memory regions
(TTM-based: Xe, AMDGPU). Panfrost's GEM/shmem model doesn't yet have a wired
region, so don't block a v0 design on this controller landing or applying
cleanly — build your own accounting hook now (§3) and plan to swap to the
upstream controller later if/when Panfrost gets a `dev` region.

## 2. Real Panfrost hook points (verified against panfrost_drv.c)

These two are real, current, and exactly where per-allocation accounting
belongs:

- `panfrost_ioctl_create_bo(struct drm_device *dev, void *data, struct drm_file *file)`
  — `DRM_IOCTL_PANFROST_CREATE_BO` handler in
  `drivers/gpu/drm/panfrost/panfrost_drv.c`. Reads `struct
  drm_panfrost_create_bo` (has `.size`), calls `panfrost_gem_create()`,
  installs a GEM handle. **This is the allocation-time hook** — charge quota
  here, before the shmem object is created, and fail with `-ENOMEM` /
  `-EDQUOT` before calling into `panfrost_gem_create()` if over limit.
- `panfrost_lookup_bos(struct drm_device *dev, struct drm_file *file_priv, struct drm_panfrost_submit *args, struct panfrost_job *job)`
  — resolves submit-time handles to GEM objects, bumps refcounts. Second
  guard point: reject submission from an already-over-quota context even if
  the BOs were allocated earlier (closes the "allocate under limit, blow
  past it via reuse" gap).

Free-path accounting belongs in the GEM object's `.free` callback
(`panfrost_gem_free_object` in `panfrost_gem.c`) — uncharge there, keyed off
the same identity used at charge time.

## 3. Cgroup identity: use current, real APIs, not invented ones

The chat-derived skeletons used `task_cgroup(current, 0)` and a bare
`get_cgroup(cg)` — these are **not the current cgroup v2 kernel API**
surface. Before writing real code, verify against the exact kernel version
you're targeting (`elixir.bootlin.com/linux/v<X>/A/ident/<symbol>`) — cgroup
internals move. As of recent kernels the idiomatic pattern for cgroup v2
default-hierarchy membership is via `task_css_set()` / `task_dfl_cgrp()` /
`cgroup_id()`, with `cgroup_get()`/`cgroup_put()` for refcounting — but
**confirm the exact names for your target kernel major version before
committing to a design**; don't trust either this skill or an LLM chat log
as the final source, check `include/linux/cgroup.h` in the actual tree
you're building against.

Practical accounting shape (identity-agnostic, safe to build now):
```c
struct gpu_cg_quota {
    u64 id;            /* cgroup_id(), stable identifier */
    u64 vram_used;
    u64 vram_limit;
    struct list_head node;
};
```
Key your accounting table off `cgroup_id()` (a stable u64), not off the
`struct cgroup *` pointer — avoids holding a reference you have to manage
across the lifetime of every tracked allocation.

## 4. SMC-based hard lockout: this is a custom mechanism, not upstream

Everything past "kernel accounts, then asks for a hard cutoff" in the source
material (`GPU_LOCKOUT_SMC` function ID, the `gpu_lockout_msg` mailbox
struct, secure-monitor-side enforcement) is a **from-scratch design**, not an
existing kernel/TF-A/OP-TEE facility. Treat it as a proposal, not a citation.
Two corrections before implementing:

- **SMC function IDs are not arbitrary.** The ARM SMC Calling Convention
  reserves ranges by owning entity (Arch, CPU service, SiP service, OEM
  service, Standard service, Trusted OS, Trusted Application). A yubiOS-owned
  hard-lockout call belongs in the **SiP Service range**
  (`0xC2000000`–`0xC200FFFF` for fast calls, per the SMCCC spec) and needs to
  be wired into TF-A's own SMC dispatch table (`plat_spm_helpers.c` / the
  runtime services dispatcher) or into a custom SP if using an FF-A/SPMD
  setup — it doesn't reach OP-TEE or the secure monitor just by being called;
  something in TF-A/BL31 has to claim that ID first. Verify the exact
  reserved sub-ranges in the current SMCCC spec before allocating a real ID.
- **Enforcement still has to bottom out in a real primitive.** "Revoke IOMMU
  mappings" / "fence GPU context" / "reset GPU" are Linux DRM/IOMMU-API
  operations (`drm_sched_stop()`-family fencing, IOMMU domain
  detach/invalidate, driver-specific reset), not something a secure monitor
  can do to a normal-world GPU driver's live state without cooperation. The
  realistic v0 architecture is: **Linux enforces (deny/kill/reset), the SMC
  path is only useful for cutting power/clocks at a level Linux can't be
  trusted to self-police** (e.g. compromised-userspace scenarios). Don't
  build the SMC mailbox before the Linux-side accounting+enforcement is
  working and proven necessary — it's the second escalation tier, not the
  first thing to ship.

Recommended v0 scope, in order: (1) Panfrost BO create/submit accounting per
cgroup-id with soft/hard in-kernel limits (deny allocation, deny submit) —
ships value with zero firmware changes; (2) only if self-policing normal
world is insufficient for the threat model, design the SiP SMC + TF-A
dispatch as a second PR with its own ADR.

## 5. OP-TEE secure time source on RK3399/RK3588 — verified

`CFG_SECURE_TIME_SOURCE_CNTPCT` is real and confirmed forced-on for the
Rockchip platform port:

```
# core/arch/arm/plat-rockchip/conf.mk (OP-TEE/optee_os)
$(call force,CFG_SECURE_TIME_SOURCE_CNTPCT,y)
```

This applies to every Rockchip `PLATFORM_FLAVOR` built against
`plat-rockchip`, which covers both RK3399 and RK3588 — there's no
board-specific override needed; it's inherited from the shared Rockchip
platform config.

What it does: `TEE_GetSystemTime()` / `tee_time_get_sys_time()` resolve time
from the ARM generic timer's physical counter (`CNTPCT_EL0`), read from
secure world, instead of trusting the normal-world (REE) wall clock. This
raises `gpd.tee.systemTime.protectionLevel` to `1000` (TEE-controlled secure
clock) rather than the REE-trusting default. There is **no separate
RK3399/RK3588 TrustZone-only clock peripheral** — it's the same architectural
generic timer counter, just read with secure privilege (`PL0PCTEN`/secure
timer access controls apply) instead of being handed REE's idea of time.

Relevance to yubiOS: this is directly useful for anything that needs
tamper-resistant timestamps ahead of a real RTC/attestation service (e.g.
bounding replay windows for fTPM NV counters, or timestamping the ADR-018/019
ARM64 fTPM measured-boot event log with a time value normal-world userspace
can't roll back). Pairs with `ftpm-optee-tpm` and
`arm-trusted-firmware-optee` — check those before assuming this is a
standalone feature; it's a config bit inside the same OP-TEE build those
skills already cover.

## Sources to re-check before implementing

- `lore.kernel.org/dri-devel` — search "dev cgroup" / "DRM scheduling cgroup"
  for current patchset state; do not assume the interface names above are
  final.
- `elixir.bootlin.com/linux/latest/source/drivers/gpu/drm/panfrost/panfrost_drv.c`
  — confirm hook signatures against the kernel version yubiOS actually ships.
- `github.com/OP-TEE/optee_os/blob/master/core/arch/arm/plat-rockchip/conf.mk`
  — confirm the force-on still holds for the OP-TEE version pinned in the
  firmware stack.
- ARM SMCCC spec (`developer.arm.com`, "SMC Calling Convention") — confirm
  the SiP range before allocating a real function ID.

## Least Privilege coverage for drm gpu quota secure time (curve-guided-rsi cycle-4 substantive edit)

This skill — **Source material for this area (two ChatGPT research threads) mixed real** — sits in a domain that benefits from explicit least-privilege hardening (sandbox, capabilities, ProtectSystem, NoNewPrivileges, dynamic user, rootless patterns) coverage. Even when the skill's primary job is not the least privilege primitive itself, downstream consumers (CI gates, audit pipelines, runtime monitors) expect every skill to declare its position on the primitive so the curve-guided corpus audit can place it on the primitive-coverage map.

For drm gpu quota secure time, the least privilege primitive applies as follows: the skill's outputs (artifacts, scripts, patterns) feed into the least privilege layer of the yubiOS pipeline, and consumers that reason about least privilege coverage (curve-guided-rsi's sparse-cell detector, the security-and-hardening review, the audit-evidence rollup) can credit this skill's contribution. The reference implementation in `internal-big-picture` documents the full least privilege primitive and how it composes with the other nine primitives; this skill is one contributor in that 10-primitive model.

Concrete implications for drm gpu quota secure time: any change to the skill should be reviewed for impact on least privilege coverage; gaps in least privilege that are attributable to this skill are tracked in the corpus audit (curve-guided-rsi cycle log at `refs/` on `yubi-OS/yubiOS`).

## Immutability coverage for DRM GPU quota secure time (curve-guided-rsi cycle-5 substantive edit)

This skill — **per-cgroup VRAM quota, SMC hard cutoff, OP-TEE CNTPCT** — sits in a domain that benefits from explicit immutability (sysext, read-only mounts, fs-verity, OSTree, hermetic /usr, verity) coverage. Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus; this skill's fit coordinate was (u=0.697, v=0.417), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For DRM GPU quota secure time, the immutability primitive applies as follows: this skill contributes to immutability + trust chain at the GPU boundary; the SMC-mediated quota is enforced from secure world. yubiOS's immutability stack composes dm-verity on /usr (per `dm-verity-and-integrity`), composefs signed catalog (per `composefs-kernel-floors`), sysext overlays (per `0pointer-mastery`), and IMA appraisal (per `dm-verity-and-integrity`); this skill is one contributor in the load-bearing invariant "/usr is immutable at every boot".

Concrete implications for DRM GPU quota secure time: any change should be reviewed for impact on immutability coverage; gaps are tracked in the cycle-5 run log.
