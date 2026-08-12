---
name: nss-inputs
description: "Cycle-9 deep-research synthesis for the NSS Inputs axis (axis 2/12 in negative-skill-space). For each file in a corpus, the Inputs axis identifies WHAT the file needs: environment variables, command-line arguments, configuration parameters, file inputs, stdin, request bodies/headers/paths, mounts, secrets, runtime/platform-provided values, plus type/presence/default/precedence/prerequisites/validation/failure behavior. Use when a 12-axis NSS sweep lands on inputs as the highest-priority Extend gap, when reviewing a file's input surface area, when writing schema-first configuration (Pydantic Settings, Zod, JSON Schema, OpenAPI), when adding an Inputs section next to a file's README/API reference, when documenting ARG vs ENV vs LABEL for Containerfiles, when describing workflow_dispatch inputs for GitHub Actions, when declaring mkosi Setting=value keys and --flag equivalents, when enumerating Environment= and EnvironmentFile= for systemd units, or when auditing test-data and prerequisite checklists before a file runs. Triggers on: NSS inputs axis, input contract, input surface area, env var declaration, CLI flag, config parameter, schema-first, validation, defaults, precedence, prerequisite, dependency declaration, what does this file need. NOT for outputs, audience, lifecycle, or any of the other 11 NSS axes (use negative-skill-space)."
---

# nss-inputs

The Inputs axis (2/12 of `negative-skill-space`) asks: **what does this
file or skill need to run?** It is the qualitative counterpart of the
operational discipline of "document the input surface area explicitly."
A file without an Inputs declaration is a file whose invocation is
recoverable only by reading its implementation; a file with one is
discoverable.

## What Inputs covers

For every file, script, skill, container, workflow, unit, or API
operation, Inputs records the *complete surface* a caller must supply
before the file does useful work. The seven channels and their
distinctions:

| Channel | Examples |
|---|---|
| **CLI** | positional args, named flags (`--foo`, `--bar=VAL`), subcommands |
| **Environment** | OS env vars (`FOO`, `FOO__BAR` for nested), exported function returns |
| **Config file** | YAML/JSON/TOML/INI keys, schema-versioned, hot- or cold-reload |
| **Files / mounts** | paths the file reads (sources), paths it requires to exist, paths injected via tmpfs/bind-mounts/secrets |
| **Stdin / pipes** | newline-delimited records, JSON lines, env-var stdin protocols |
| **Request surface** | HTTP path/query/header/cookie/body; gRPC metadata; GraphQL variables; DB row/column |
| **Platform / runtime** | kernel features, capabilities, namespaces, cgroup, CPU arch, GPU presence, TPM availability |

For each input, document:

| Field | What to record |
|---|---|
| `name` | Canonical key, plus aliases |
| `channel` | One of the seven above |
| `type` | scalar / object / array; encoding; units; enum values; bounds; patterns |
| `required` | yes / no / conditional (with the rule) |
| `default` | Value, or "none"; state whether the implementation materializes it |
| `constraints` | min/max, regex, enum, format, size, cross-field rules |
| `precedence` | Which source wins if supplied more than once (CLI > env > config > default is the canonical order; document deviations explicitly) |
| `prerequisites` | Files, executables, services, network, credentials, compatible versions |
| `validation` | When checks run, what is rejected, error format, exit code, fail-fast or aggregate |
| `failure behavior` | What the operator sees (canonical name, source/channel, expected type, received *class* — never the secret itself), and how to recover |
| `side effects` | Files written, network calls, mutations, resource use on input acceptance |

A useful rule: **raw input, validated input, and effective
configuration are three different things.** A good pipeline is
`collect -> parse -> validate syntax/types -> apply defaults ->
validate cross-field rules -> check prerequisites -> execute`. Never
fold the three together; never silently coerce surprising values.

## Inputs and the yubiOS surface

Every yubiOS file has an Inputs surface; declaring it is the
single highest-leverage move for each NSS-inputs Extend gap.

### Containerfile (`ARG` / `ENV` / `LABEL`)

- `ARG name` — build-time parameter, in `docker build --build-arg name=…`.
  Use only for selecting versions or build behavior, not runtime config
  or secrets. Build args are visible in image history.
- `ENV name=val` — persists in the image and is available to every
  process created from it. Use only for safe runtime defaults or values
  that are intentionally image-level configuration.
- `LABEL` — image metadata, not an application input contract. The
  yubiOS pattern is to label every yubiOS-derived image with the
  originating commit SHA and the build timestamp; treat those labels
  as the build-time provenance record.
- Secrets: use BuildKit secret/SSH mounts
  (`--mount=type=secret,id=foo`) — never `ARG SECRET` or
  `ENV SECRET` (both leak into image/build history).

### mkosi (`Setting=value` and `--some-setting`)

mkosi exposes every setting in three places: a structured config file
(`mkosi.conf`), the command line (`--some-setting=value`), and a few
environment variables. Document the mapping rather than treating them
as unrelated interfaces; specify whether `mkosi.conf.d/*.conf` snippets
are read in lex order, lex-merged, or last-wins (the rule for
yubiOS drop-ins: lex-sorted files, last-wins on duplicate keys).

### systemd unit (`Environment=` / `EnvironmentFile=`)

- `Environment=KEY=VAL` declares variables directly in the unit. The
  key/val pair is visible to anyone who can `systemctl show`.
- `EnvironmentFile=/path` reads key/value pairs from a file. Document
  the file's mode (0600 expected), ownership, and reload behavior
  (`systemctl daemon-reload` plus a unit restart, NOT a SIGHUP).
- `WorkingDirectory=`, `User=`, `ExecStart=`, `CapabilityBoundingSet=`,
  `ReadOnlyPaths=`, `ProtectSystem=`, etc. are not "inputs" in the
  NSS-Inputs sense — they are configuration of the *runtime
  surface*. Record them next to Inputs, separately.

### GitHub Actions (`workflow_dispatch.inputs` / `inputs:` on actions)

For reusable workflows, declare each input's `description`, `required`
(true/false), `default`, and `type` (`boolean`, `number`, `string` —
types only supported on `workflow_call`). GitHub maps action inputs to
`INPUT_<NAME>` env vars inside the action container.

For `workflow_dispatch`, declare each input's `description`,
`required`, `default`, and `type`. Inputs flow through `inputs.<id>`
in the workflow and `${{ inputs.<id> }}` in expressions. Never read
`secrets.*` from a job whose `permissions:` block does not explicitly
grant them.

### Scripts (Python, shell, etc.)

CLI flags first (via `argparse` or `getopt`); env vars as a secondary
input channel with documented precedence; config files as a third;
secrets last, with a documented mode and an explicit "never logged"
rule. The yubiOS doctrine (from `PROJECT_RULES.md` and the
`audit-evidence-packaging` skill): **secrets are never echoed, never
log-shipped, never put in an `ENV` directive that persists in an
image, never put in a Containerfile `ARG`.**

### Python `argparse` pattern (yubiOS convention)

The yubiOS scripts in `scripts/*.py` follow a four-step pattern:

```python
import argparse, os, sys

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--config", type=Path,
                   default=Path(os.environ.get("YUBIOS_CONFIG", "config.yaml")),
                   help="config file path (env: YUBIOS_CONFIG)")
    p.add_argument("--dry-run", action="store_true",
                   help="do not mutate; print what would change")
    p.add_argument("--verbose", "-v", action="count", default=0)
    return p.parse_args()
```

Note: env var is consulted in the `default=` expression (so the help
text reflects the precedence); argparse still wins once the user passes
`--config` explicitly.

### Refs/notes (`refs/*.md`)

A research note's Inputs surface is unusual: it has no runtime input,
but it has *invocation* inputs. The note is invoked by a reader who
needs to know its prerequisites (what other refs to read first, what
ADRs it depends on, what commit hash it was written against). Record
those in a `## Inputs` section as a prerequisite list with explicit
"read these first, in this order" wording.

## Examples

### Example 1 — Containerfile Inputs

```dockerfile
# Inputs
#   build args:  BASE_IMAGE_TAG (default: 45), ENABLE_SYSEXT (default: 0)
#   runtime env: YUBIOS_RELEASE (image label, also ENV), YUBIOS_IMAGE_TAG (image label)
#   files:       mkosi.conf (read by mkosi at build, not by this Containerfile),
#                rpms/*.rpm (bind-mounted at /tmp/rpms during build)
#   secrets:     none (yubiOS CI does not require secret injection at build time)
#   prerequisites: podman >= 5.0, buildah, the yubiOS signing key in /etc/pki/yubios
#
# Precedence: --build-arg > ENV in this file > built-in default.
# Validation: mkosi.conf schema validated at build start; BASE_IMAGE_TAG must be
#             an exact quay.io digest (no tag-only references).
# Failure: build aborts with the offending argument name and the constraint that failed.
```

### Example 2 — Python script Inputs (argparse + env)

```python
"""
Inputs:
  --config PATH         (env: YUBIOS_CONFIG, default: ./config.yaml)
  --dry-run             (boolean, no default; absence = False)
  --verbose, -v         (count, default 0)
  YUBIOS_LOG_LEVEL      (env, default: INFO; one of DEBUG/INFO/WARN/ERROR)
  /etc/yubios/secret    (file, mode 0400; required when --sign is set; refused if missing)
Precedence: CLI > env > config file > built-in default.
Validation: argparse rejects unknown flags; config file validated against schema version 2.
Failure: exit code 2 on validation error; the offending name is logged but the value is never echoed.
"""
```

### Example 3 — systemd unit Inputs

```ini
# Inputs
#   Environment=YUBIOS_RELEASE=45  (set in the unit; visible via `systemctl show yubiOS.service`)
#   EnvironmentFile=-/etc/yubios/yubiOS.conf  (optional; absent -> defaults applied)
#   /etc/yubios/yubiOS.conf  (mode 0600, root:root; KEY=VALUE per line; comments start with #)
#   WorkingDirectory=/var/lib/yubios  (declared in the unit, not an input)
#   ExecStart=/usr/bin/yubiOS-launch  (declared in the unit, not an input)
# Precedence: Environment= in unit > EnvironmentFile= > built-in default.
# Validation: systemd rejects KEY=VALUE lines with an unparsable value at daemon-reload time.
# Failure: `systemctl status yubiOS.service` shows the failing line; journalctl -u yubiOS.service
#          shows the application-level rejection.
```

### Example 4 — GitHub Actions reusable workflow Inputs

```yaml
# Inputs (workflow_call inputs):
#   allow_real_u2f: boolean, default false. When true, the workflow sets ALLOW_REAL_U2F=1
#                   in the test step env (sudo's env forwarding is explicit-only, so this
#                   matters). Required: a physical YubiKey on the runner for destructive tests.
#   digest:         string, default empty. A sha256 quay.io digest to pin the base image.
#                   When empty, the workflow resolves the latest fedora-bootc:45 digest.
#   group:          string, default "build". One of {build, fetches, smoke, dispatch-reachability}.
# Precedence: explicit workflow_dispatch input > workflow_call default > branch-level default.
# Validation: GitHub rejects unknown input ids; the workflow re-validates `group` against an
#             enum and exits 1 with a clear message on mismatch.
# Secrets: never passed through workflow_call inputs; use secrets: explicitly.
```

### Example 5 — mkosi.conf Inputs

```ini
# Inputs (mkosi.conf.d/* syntax):
#   [Distribution]
#   Distribution=fedora   (string; one of fedora/debian/centos; default fedora)
#   Release=45            (integer; matches the quay.io fedora-bootc:45 tag)
#   Architecture=x86_64   (string; one of x86_64/aarch64; default host arch)
#   [Output]
#   Format=disk           (enum; one of disk/oci/directory/uki; default disk)
#   ImageId=yubios        (string; used as the OCI tag; default yubios)
# Precedence: command line (`--distribution fedora --release 45`) > this config > mkosi default.
#             mkosi.conf.d/*.conf snippets are lex-sorted, last-wins on duplicate keys.
# Validation: mkosi rejects unknown keys; it also rejects incompatible combinations
#             (e.g. Format=disk with Architecture=aarch64 on a host without binfmt).
# Failure: mkosi exits non-zero with a single-line error naming the offending key.
```

### Example 6 — refs/*.md Inputs (research-note invocation)

```markdown
<!-- Inputs (research-note invocation, not runtime):
     - Required prior reading (in order):
         1. docs/ARCHITECTURE.md  -- so the reader knows the system's modules
         2. docs/THREAT_MODEL.md  -- so the reader knows what the threat model assumes
         3. refs/validate-input-shape-doctrine-2026-08-04.md  -- the prior cycle's lens
     - Required context:
         - the commit hash this note was written against (see frontmatter: commit:)
         - any ADR referenced inline (ADR-NNN at yubi-OS/yubiOS/docs/ADR.md)
     - Optional context:
         - the experimental setup in tests/ (only if the reader wants to reproduce)
     Validation: this note assumes the prior reading has happened; if not, link to it.
     Failure: missing prior reading produces a "I cannot evaluate this in isolation" moment.
-->
```

## Guidelines

1. **Every input has a channel.** If you cannot say whether a value
   arrives via CLI, env, config file, mount, stdin, request surface,
   or platform, the input is *implicit* — surface it as such, because
   implicit inputs are the single most common source of "I forgot to
   set X" failures.
2. **Defaults are documentation, not policy.** A safe default is one
   the operator can understand without reading code; an unsafe default
   (e.g. `password=changeme`) is worse than no default.
3. **Required and default are not the same.** A `required: true`
   field with a `default: foo` is internally contradictory; pick one.
4. **Document precedence explicitly.** When a value can arrive
   through multiple channels, say which one wins. The yubiOS
   convention is `CLI > env > config file > built-in default`, but
   mkosi uses `CLI > config > mkosi default` and GitHub Actions uses
   `workflow_dispatch input > workflow_call default > workflow default`.
5. **Distinguish build-time from runtime.** `ARG` in a Containerfile is
   build-time and not visible to running processes; `ENV` is visible
   at runtime. Mixing the two is the source of "my env var isn't
   there at runtime" bugs.
6. **Distinguish secret from non-secret.** A secret is an input whose
   leakage has security consequences. It belongs in `EnvironmentFile=`
   (mode 0600), in BuildKit `--mount=type=secret`, in Kubernetes
   `Secret`, or in `secrets:` (GitHub Actions) — never in `ENV`,
   never in `ARG`, never in a log line, never in `--help` output.
7. **Validate at the boundary, fail at the boundary.** The first
   thing the file does is collect inputs and validate them; the
   last thing the file does before exit is report what it accepted
   and what it rejected.
8. **Prerequisites are inputs.** "This script requires Python 3.12"
   is an input the operator supplies by installing Python. Record
   it in the Inputs section, not in a footer.
9. **Pre-register the input surface.** Before adding a new input,
   write the schema entry first (description, type, default, validation),
   then implement the consumer. Schema-first.
10. **Use the seven-channel taxonomy verbatim.** "Where does this
    value come from?" should always answer with one of CLI / env /
    config / file / stdin / request / platform. New channels need a
    new skill; do not invent channel names in a file's Inputs
    section.
11. **Close the NSS-inputs Extend gap with one section per file.**
    The atomic cycle-9 patch for any file with an NSS-inputs gap is
    ONE `## Inputs` section, file-type-aware comment syntax, with the
    seven-channel table or its markdown equivalent. One section, one
    file, one cycle.

## Constraints

- **Self-contained.** This skill does not depend on negative-skill-space
  being loaded; it composes *with* NSS as a follow-up action (NSS
  proposes the gap, nss-inputs closes it).
- **No runtime.** This is a documentation skill. It does not read
  environment variables or parse configuration files.
- **Schema is for humans first.** The Inputs section a cycle-9 patch
  adds is read by humans (and by the next RSI cycle's NSS sweep) before
  it is consumed by any parser. Clarity > strict YAML.
- **One section per file.** Do not stack multiple `## Inputs` blocks
  in one file; do not nest Inputs inside another section heading.
- **Channel names are fixed.** CLI / env / config / file / stdin /
  request / platform. A value that arrives via a novel channel needs
  a new skill, not a new channel name.
- **No silent defaults.** If a default exists, it is documented in
  the Inputs section. If no default exists, the field says
  `default: none` explicitly.

## Anti-patterns

- **Inputs without a channel.** "The script reads X" without saying
  whether X is a CLI flag, an env var, or a config file is *worse* than
  no Inputs section, because it pretends to be a declaration.
- **Required with a default.** "Required: true, default: 30" — the
  default makes it not required; the flag misrepresents it.
- **ENV that should be ARG.** A value that affects only the build
  (e.g. `BASE_IMAGE_TAG`) belongs in `ARG`, not `ENV` — otherwise it
  persists in the image and ships to every consumer.
- **ARG that should be ENV.** A value the running process needs
  (e.g. `YUBIOS_RELEASE`) belongs in `ENV`, not `ARG` — otherwise it
  is unavailable at runtime.
- **Secrets in ENV.** `ENV SECRET_KEY=...` persists the secret in
  the image and in `docker inspect` output. Use BuildKit
  `--mount=type=secret` for build-time secrets, `EnvironmentFile=`
  (mode 0600) for runtime systemd secrets, or Kubernetes `Secret` /
  `SealedSecret`.
- **"Compatible with X" instead of a verdict.** Inputs sections that
  say "validates inputs" without saying which inputs are accepted,
  in what shape, with what precedence, are filler.
- **Cross-channel aliasing without precedence.** Two env vars that
  both set the same config without saying which wins; two config
  files that both set the same key without saying which is read
  last; two CLI flags that overlap without saying which takes
  precedence.
- **Prerequisites in a footer.** "Requires Python 3.12" at the bottom
  of a README, separate from the Inputs section, will be missed.
  Move it into the Inputs section under `prerequisites:`.
- **An Inputs section that does not name the file's own parameters.**
  A cycle-9 patch that adds `## Inputs` to `Containerfile` but does
  not list `BASE_IMAGE_TAG`, `ENABLE_SYSEXT`, etc. is a placeholder
  patch and counts as a NO verdict, not a YES.

## Red flags

| Observation | What it means |
|---|---|
| `## Inputs` section lists zero concrete names | the section is a placeholder |
| `required: true` AND `default: …` on the same field | contradictory declaration |
| A secret appears in an `ENV`, an `ARG`, or a log line | secret leakage |
| Two channels claim the same key with no precedence rule | cross-channel collision |
| "Requires Python 3.12" in a footer instead of `prerequisites:` | prerequisite lost |
| A field's `type:` does not match the validation rule | schema drift |
| An `## Inputs` patch lands but the next NSS sweep still flags inputs as the top gap | the patch did not close the gap |
| The Inputs section is identical across 100+ files | templated, not inspected — likely wrong for at least one of them |

## Composition

| Skill | How it composes | Direction |
|---|---|---|
| `negative-skill-space` | NSS runs the 12-axis sweep and flags `inputs` as a candidate Extend gap; nss-inputs is the closure skill for that one axis. Pair the two in every cycle. | negative-skill-space -> nss-inputs |
| `curve-compass-skill` | Lens-format patches in cycle-9 use nss-inputs as the inputs-axis lens payload; the lens records the hypothesis + method + parameters + delta + verdict + score + caveat for the Inputs section this skill defines. | nss-inputs -> curve-compass-skill |
| `curved-corpus-create` | The corpus the cycle-9 sweep operates over is the same `lens --corpus` JSON; the corpus's `inputs` column maps to this skill's seven-channel taxonomy. | nss-inputs <-> curved-corpus-create |
| `api-and-interface-design` | The Inputs surface of an API is exactly this skill's table, plus the request surface channel; the API design skill is the *consumer* of the table. | nss-inputs -> api-and-interface-design |
| `source-driven-development` | Each documented external dependency (Docker, mkosi, systemd, GitHub Actions, Pydantic Settings) was verified against the official docs in the deep-research phase that produced this skill. | source-driven-development -> nss-inputs |
| `security-and-hardening` | The secret-vs-non-secret distinction in this skill is the yubiOS security boundary at the input layer; the security skill owns the deeper threat model. | nss-inputs <-> security-and-hardening |
| `spec-driven-development` | Schema-first input design (the section "Pre-register the input surface") is the same discipline as spec-first implementation; the spec skill owns the broader workflow. | spec-driven-development -> nss-inputs |
| `recursive-self-improvement` | When the same NSS-inputs Extend gap keeps reappearing after a cycle-9 patch, RSI's self-mode should re-isolate the editor before the next attempt — same-author bias on inputs sections is the most common cycle-9 failure mode. | recursive-self-improvement -> nss-inputs |

## Verification

For each cycle-9 patch that closes an NSS-inputs gap:

1. **The patch adds ONE `## Inputs` section** (or the file-type-aware
   equivalent: `# Inputs` for Containerfile/Makefile, `# # Inputs` for
   Python triple-quoted docstring, `# Inputs` for shell `#` comments,
   `<!-- Inputs -->` HTML comment for `.md` if a section is not
   appropriate, `<!-- Inputs (workflow_call inputs:) -->` for
   GitHub Actions YAML).
2. **The section names at least one concrete input** with channel,
   type, required/default, and precedence. A placeholder section with
   zero concrete inputs counts as a NO verdict.
3. **Secrets are absent from `ENV` / `ARG` / log lines.** If the file
   documents a secret, the declaration references BuildKit
   `--mount=type=secret`, systemd `EnvironmentFile=`, or Kubernetes
   `Secret` — never a raw `ENV` or `ARG`.
4. **Prerequisites are listed in `prerequisites:`**, not in a footer.
5. **Precedence is stated** when more than one channel can supply the
   same input.
6. **The next NSS sweep on the same file does NOT re-flag inputs as
   the top Extend gap.** If it does, the patch did not close the gap
   and the cycle-9 lens is a NO verdict.

## Changelog

- **1.0.0** (2026-08-12) -- initial. Cycle-9 deep-research synthesis
  for the NSS Inputs axis. Captures the seven-channel input taxonomy
  (CLI / env / config / file / stdin / request / platform), the
  yubiOS-specific patterns for Containerfile (`ARG` vs `ENV` vs
  `LABEL`), mkosi (`Setting=value` and `--some-setting`), systemd
  (`Environment=` / `EnvironmentFile=`), GitHub Actions
  (`workflow_call.inputs` / `workflow_dispatch.inputs`), Python
  (`argparse` + env precedence), and refs/*.md (prerequisite
  invocation), plus the secret-vs-non-secret distinction and the
  build-time vs runtime distinction. Every example and anti-pattern
  is grounded in the source-driven-development deep-research pass
  on Pydantic Settings, Zod, JSON Schema, OpenAPI, Twelve-Factor
  config, Docker build variables, Kubernetes ConfigMaps vs Secrets,
  systemd.exec(5), mkosi(1), and GitHub Actions metadata syntax.

## Maintainer

Sauna, wave 2 cycle 9. Built against the deep-research synthesis for
the NSS Inputs axis (PR #207 cycle-7 NSS gap-informed
context), `negative-skill-space` SKILL.md, and the cycle-7 lens pool
(`lenses.json` at root of `feat/rsi-compass-cycle7-nss-research-2026-08-12`).
