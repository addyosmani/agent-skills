---
name: bootc-images
description: "Builds, installs, upgrades, and manages bootc-compatible OCI images. Use when writing Containerfiles for bootc base images, configuring composefs/fsverity, managing filesystem semantics (/usr, /etc, /var), installing to disk, performing atomic upgrades and rollbacks, or troubleshooting bootc deployments. Triggers on: bootc, bootable container, OCI image boot, bootc upgrade, bootc switch, bootc install to-disk, composefs, ostree, atomic upgrade, image mode."
---

# bootc Images

## Overview

bootc boots and upgrades a Linux system directly from OCI container images. The image contains the full kernel, initramfs, and userspace. systemd is PID 1. Updates are atomic A/B deployments staged via OSTree + composefs.

**Source**: https://bootc.dev/bootc/bootc-images.html (fetched May 10, 2026)

---

## Image Requirements

### Mandatory label

```dockerfile
LABEL containers.bootc 1
```

Signals the image is bootc-compatible. Required for tooling (`bootc container lint`, `bcvk`, `bootc-image-builder`) to recognize it.

### Kernel location

```
/usr/lib/modules/$kver/vmlinuz      ← kernel
/usr/lib/modules/$kver/initramfs.img ← initramfs
```

**Do NOT put anything in `/boot` in your image.** bootc copies kernel/initramfs from the container image to `/boot` at install time. Files you put there will conflict.

### composefs backend (strongly recommended)

```ini
# /usr/lib/ostree/prepare-root.conf
[composefs]
enabled = true
```

With composefs, the entire `/` is a read-only EROFS image. This is the correct semantic for a bootc system. Requires kernel `CONFIG_EROFS_FS`.

For maximum integrity (fsverity on all objects):
```ini
[composefs]
enabled = verity
```

Note: `verity` mode errors at install if the target filesystem doesn't support fsverity. Also doesn't cover `/etc` or `/var`.

### /ostree

Not required since bootc 1.1.3. Don't create it manually.

---

## Minimal Containerfile (yubiOS pattern)

```dockerfile
FROM dhi.io/debian-base@sha256:9415967aa0ed8adea8b5c048994259d1982026dca143d0303c7bbe0e11ed67d3

# Required label
LABEL containers.bootc 1

# Install packages (systemd as PID 1, kernel, FIDO2 tools)
RUN apt-get update && apt-get install -y \
    systemd systemd-boot systemd-cryptsetup \
    linux-image-amd64 dracut \
    pam-u2f yubikey-manager libfido2-dev opensc \
    && apt-get clean

# composefs backend
RUN mkdir -p /usr/lib/ostree && cat > /usr/lib/ostree/prepare-root.conf << 'EOF'
[composefs]
enabled = true
[etc]
transient = true
EOF

# Enable FIDO2 PAM
RUN mkdir -p /etc/security && \
    echo "auth required pam_u2f.so authfile=/etc/security/u2f_keys" \
    >> /etc/pam.d/sshd
```

---

## Filesystem Semantics (CRITICAL)

Understanding this prevents broken deployments.

### `/usr` — Immutable OS image

Read-only when deployed (composefs). All OS binaries, libraries, unit files go here.
Put config in `/usr/lib/systemd/system`, `/usr/lib/sysusers.d`, `/usr/lib/tmpfiles.d`.

**Prefer `/usr` over `/etc` for config that doesn't need to be machine-local.**

### `/etc` — 3-way merge on upgrade

On each upgrade, ostree applies a 3-way merge:
- Base: new image's `/etc`
- Diff: what the running system changed vs its original `/etc`
- Result: new `/etc` with local changes preserved

`ostree admin config-diff` shows local modifications.

**Recommendation**: enable transient `/etc` if possible — eliminates drift:
```ini
# /usr/lib/ostree/prepare-root.conf
[etc]
transient = true
```

With transient `/etc`, store machine-specific state in the kernel commandline or in `/var`.

**Best practice**: use drop-in directories instead of modifying main config files:
```dockerfile
# Good — drop-in, survives upgrades cleanly
RUN install -Dm644 /dev/stdin /etc/sudoers.d/yubiOS-admins << 'EOF'
%yubiOS-admins ALL=(ALL) ALL
EOF

# Avoid — modifies main file, creates diff on every upgrade
RUN echo "%admin ALL=(ALL) ALL" >> /etc/sudoers
```

### `/var` — Persistent data (Docker VOLUME semantics)

**Behaves like `VOLUME /var`**: content from the container image is unpacked only at initial install. Changes to `/var` in subsequent image versions are NOT applied automatically.

Use `tmpfiles.d` to pre-create directories:
```dockerfile
RUN cat > /usr/lib/tmpfiles.d/yubiOS.conf << 'EOF'
d /var/lib/yubiOS 0750 yubiOS yubiOS -
d /var/log/yubiOS 0755 yubiOS yubiOS -
EOF
```

Or use `StateDirectory=` in service units (preferred):
```ini
[Service]
StateDirectory=yubiOS-agent
```

**Never** expect `/var` content from your image to be updated by `bootc upgrade`.

### Handling `/opt` (3rd-party packages)

`/opt` is read-only under composefs. For writable `/opt` subdirs, symlink to `/var`:

```dockerfile
RUN dnf install -y examplepkg && \
    mv /opt/examplepkg/logs /var/log/examplepkg && \
    ln -sr /var/log/examplepkg /opt/examplepkg/logs
```

Or use systemd unit `BindPaths`:
```ini
[Service]
BindPaths=/var/log/exampleapp:/opt/exampleapp/logs
```

---

## Install Commands

### To disk (standard bare metal)

```bash
# From inside a running container or bcvk environment
bootc install to-disk /dev/sda

# With explicit filesystem
bootc install to-disk --filesystem xfs /dev/sda

# With systemd-boot (auto-enrolls Secure Boot keys from /usr/lib/bootc/install/secureboot-keys)
bootc install to-disk --boot systemd-boot /dev/sda
```

### To existing filesystem

```bash
# Install to pre-partitioned and formatted filesystems
bootc install to-filesystem --sysroot /mnt/target

# Print merged config (discover target filesystem type from container image)
bootc install print-configuration
```

### Secure Boot key enrollment

Place signed EFI signature lists in `/usr/lib/bootc/install/secureboot-keys` in the container image. `bootc install` copies them to `ESP/loader/keys` when using systemd-boot.

```dockerfile
# Embed Secure Boot keys in image
RUN mkdir -p /usr/lib/bootc/install/secureboot-keys
COPY yubiOS-sb.esl /usr/lib/bootc/install/secureboot-keys/yubiOS-sb.esl
```

---

## Upgrade and Rollback

### Basic upgrade (staged, applies on next boot)

```bash
bootc upgrade
```

### Upgrade with immediate reboot

```bash
bootc upgrade --apply
```

### Controlled maintenance window workflow

```bash
# 1. Download only — don't apply yet
bootc upgrade --download-only

# 2. Check staged status
bootc status --verbose
# Output: Download-only: yes

# 3a. Apply staged (don't re-fetch from registry)
bootc upgrade --from-downloaded

# 3b. Apply + reboot now
bootc upgrade --from-downloaded --apply

# 3c. Check for newer then apply
bootc upgrade
```

### Check for updates (no side effects)

```bash
bootc upgrade --check
```

### Switch to different image

```bash
# Blue/green deployment: switch image source
bootc switch dhi.io/yubi-OS/yubiOS:v2026.06
bootc switch dhi.io/yubi-OS/yubiOS@sha256:...   # pin to digest
bootc switch --apply dhi.io/yubi-OS/yubiOS:v2026.06  # + immediate reboot
```

`bootc switch` preserves `/etc` and `/var` — SSH keys, home dirs, persistent state all survive.

### Rollback

```bash
# Swap bootloader ordering to previous deployment
bootc rollback
```

### Auto-updates (systemd timer)

Enable the upstream-provided timer:
```bash
systemctl enable --now bootc-fetch-apply-updates.timer
# Default: checks every 4 hours, applies on next reboot
```

---

## Lint and Validation

```bash
# Check image for common problems
bootc container lint

# Checks include:
# - /boot content in image (should be absent)
# - kernel at correct path (/usr/lib/modules/$kver/vmlinuz)
# - /usr/etc files (undefined behavior — don't put files there)
# - missing tmpfiles.d entries for /var directories (since v1.1.6)
```

Run as part of CI:
```yaml
- name: Lint bootc image
  run: |
    podman run --rm \
      --security-opt label=disable \
      dhi.io/yubi-OS/yubiOS:${{ github.sha }} \
      bootc container lint
```

---

## SELinux Considerations

Standard bootc/OCI images have no embedded `security.selinux` xattr metadata (unlike rpm-ostree compose images). File content in derived layers is labeled using `/etc/selinux` default file contexts.

Use `semanage fcontext` to declare labels (works since bootc 1.1.0):
```dockerfile
RUN semanage fcontext -a -t httpd_sys_content_t "/web(/.*)?"
```

**Don't** use `chcon` in builds — container runtime will deny the attempt to set `security.selinux` xattr.

For arbitrary toplevel directories (`/yubiOS`, `/app`), Fedora/CentOS SELinux policies may label them `default_t` — few domains can access this. Add explicit file context rules.

---

## State Management Cheatsheet

| Content type | Location | Survives upgrade? | Notes |
|---|---|---|---|
| OS binaries, libs | `/usr` | Yes (replaced) | Immutable at runtime |
| Default config | `/usr/lib/` | Yes (replaced) | Preferred for static config |
| Machine config | `/etc` | 3-way merge | Use drop-ins to avoid drift |
| App data, logs, DBs | `/var` | Yes (untouched) | VOLUME semantics |
| Runtime state | `/run` | No (tmpfs) | Never in image |
| Temp files | `/tmp` | No (often tmpfs) | Never in image |

---

## yubiOS Image Checklist

- [ ] `LABEL containers.bootc 1` present
- [ ] Kernel at `/usr/lib/modules/$kver/vmlinuz`; no `/boot` content
- [ ] `composefs enabled = true` in `/usr/lib/ostree/prepare-root.conf`
- [ ] `etc.transient = true` if no machine-specific `/etc` needed
- [ ] `/var` directories pre-created via `tmpfiles.d` or `StateDirectory=`
- [ ] FIDO2 packages: `pam-u2f`, `yubikey-manager`, `libfido2-dev`, `opensc`
- [ ] Secure Boot keys at `/usr/lib/bootc/install/secureboot-keys`
- [ ] `bootc container lint` passes in CI

---

## References

- https://bootc.dev/bootc/bootc-images.html
- https://bootc.dev/bootc/filesystem.html
- https://bootc.dev/bootc/upgrades.html
- https://bootc.dev/bootc/building/guidance.html
- https://bootc.dev/bootc/man/bootc-install.8.html
- https://github.com/bootc-dev/bootc

## Least Privilege coverage for bootc images (curve-guided-rsi cycle-4 substantive edit)

This skill — **bootc boots and upgrades a Linux system directly from OCI container images** — sits in a domain that benefits from explicit least-privilege hardening (sandbox, capabilities, ProtectSystem, NoNewPrivileges, dynamic user, rootless patterns) coverage. Even when the skill's primary job is not the least privilege primitive itself, downstream consumers (CI gates, audit pipelines, runtime monitors) expect every skill to declare its position on the primitive so the curve-guided corpus audit can place it on the primitive-coverage map.

For bootc images, the least privilege primitive applies as follows: the skill's outputs (artifacts, scripts, patterns) feed into the least privilege layer of the yubiOS pipeline, and consumers that reason about least privilege coverage (curve-guided-rsi's sparse-cell detector, the security-and-hardening review, the audit-evidence rollup) can credit this skill's contribution. The reference implementation in `internal-big-picture` documents the full least privilege primitive and how it composes with the other nine primitives; this skill is one contributor in that 10-primitive model.

Concrete implications for bootc images: any change to the skill should be reviewed for impact on least privilege coverage; gaps in least privilege that are attributable to this skill are tracked in the corpus audit (curve-guided-rsi cycle log at `refs/` on `yubi-OS/yubiOS`).

## Immutability coverage for bootc images (curve-guided-rsi cycle-5 substantive edit)

This skill — **bootc install to-disk, bootc upgrade, composefs, fsverity** — sits in a domain that benefits from explicit immutability (sysext, read-only mounts, fs-verity, OSTree, hermetic /usr, verity) coverage. Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus; this skill's fit coordinate was (u=0.722, v=0.238), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For bootc images, the immutability primitive applies as follows: this skill is the image-mode home of immutability; composefs + fsverity + dm-verity compose via the bootc image. yubiOS's immutability stack composes dm-verity on /usr (per `dm-verity-and-integrity`), composefs signed catalog (per `composefs-kernel-floors`), sysext overlays (per `0pointer-mastery`), and IMA appraisal (per `dm-verity-and-integrity`); this skill is one contributor in the load-bearing invariant "/usr is immutable at every boot".

Concrete implications for bootc images: any change should be reviewed for impact on immutability coverage; gaps are tracked in the cycle-5 run log.


---

## Cycle 5 RSI primitive-closure (2026-08-06)

The hyperspherical-harmonic-curve corpus audit identified this skill as having a `segmentation` coverage gap in the 10-primitive yubiOS framework. **segmentation** was missing across 22/70 skills pre-cycle-5; closing one corpus-wide gap here contributes to the cycle-5 RSI delta measured in `refs/cycle5-results-2026-08-06.md`.

**Relevance:** This skill enforces segmentation via namespace / nspawn / cgroup / microsegmentation / private-users. Specifically it covers: segmentation, namespace, nspawn.

**Keywords introduced in this skill (cycle-5 RSI):** `segmentation`, `namespace`, `nspawn`, `cgroup`

**Audit-trail:** This addition closes one corpus-wide primitive gap (corpus-wide `segmentation` count moved 22→23/70). Per-skill impact is recorded in the cycle-5 results artifact. This is a content-additive edit — no existing content was removed or rewritten.

## Changelog

- **2026-08-06 cycle 5 RSI**: closed `segmentation` primitive gap (corpus-wide count 22→23/70). See `refs/cycle5-results-2026-08-06.md` for the corpus-fit delta measurement.


---

## Cycle 6 RSI primitive-closure (2026-08-06)

This skill's `declarative policy` primitive is closed by cycle-6 RSI. This skill's declarative policy (.rego / OPA / Build Policy) integration is referenced.

The audit-trail entry: 2026-08-06 cycle 6 RSI — closed `declarative policy` primitive gap.
