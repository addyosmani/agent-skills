---
name: nss-outputs
description: "Outputs axis (3/12 in negative-skill-space). For each file in a corpus, identify WHAT the file produces: stdout/stderr stream contract, exit codes (sysexits.h), structured logs (JSONL framing, RFC 5424 syslog), files written (paths, mode, ownership), side effects (network calls, mutations), response payloads (HTTP/gRPC bodies), idempotency contract (Idempotency-Key header), deterministic output (seeded RNG, sort order, SOURCE_DATE_EPOCH, canonical bytes), partial-output policy on failure. Use when the NSS 12-axis sweep lands on outputs as the highest-priority Extend gap, when a script/workflow has no documented exit-code vocabulary, when JSONL or syslog parsing keeps breaking, when an idempotent-sounding operation duplicates on retry, when two runs of the same command produce different bytes, when stderr/stdout ownership is ambiguous, or when an HTTP API hides its error schema in prose. NOT for inputs (use nss-inputs), audience (use nss-audience), or any of the other 9 NSS axes."
---

# nss-outputs

The **Outputs** axis (3/12 of `negative-skill-space`) asks: **what can a
caller rely on when this file or skill finishes, logs, streams, retries,
or rebuilds its result?** A durable contract separates five things that
are often accidentally mixed together: process status, human-readable
diagnostics, machine-readable records, delivery and retry behavior, and
byte-level reproducibility.

The cycle-10 NSS-outputs sweep applies this rubric to ~40 files in the
yubiOS corpus, where each file gets ONE outputs-aware section added per
lens-format patch (`## Outputs -- cycle 10`).

## What Outputs covers

For every file, script, skill, container, workflow, unit, or API
operation, Outputs records the *complete surface* a caller can rely on
after the file does its work.

| Channel | Examples |
|---|---|
| **Exit status** | process exit code; sysexits.h category; partial-output policy |
| **stdout / stderr** | declared stream ownership; structured vs unstructured; record framing |
| **Log records** | JSONL / RFC 5424 syslog / slog-style; severity, ts, run_id |
| **Files written** | output paths, modes, owners; whether they survive partial failure |
| **Side effects** | network calls; mutations; resource use; idempotency boundary |
| **Response payload** | HTTP body schema; status codes; headers (Idempotency-Key, Retry-After) |
| **Determinism** | seeded RNG; sorted ordering; SOURCE_DATE_EPOCH; canonical bytes; content hash |

For each output, document:

| Field | What to record |
|---|---|
| `name` | Canonical key, plus aliases |
| `channel` | One of the seven above |
| `type` | scalar / object / array / stream / file / side-effect |
| `on_success` | declared payload shape, record count, exit code |
| `on_failure` | declared exit code, partial-output policy (forbidden / valid_and_marked / resumable) |
| `idempotency` | inherently_idempotent / key_required / not_supported |
| `determinism` | logical / byte_identical / reproducible_build |
| `schema` | URL + dialect + version (when applicable) |
| `retry` | retryable failure class, backoff, duplicate-response behavior |
| `redaction` | secrets and sensitive values removed by default |

A useful rule: **raw result, declared schema, and effective contract
are three different things.** A good pipeline is `execute -> record ->
emit declared payload on declared stream -> declare exit code ->
declare partial-output policy`. Never fold the seven channels together;
never emit partial results on a "success" exit.

## Outputs and the yubiOS surface

Every yubiOS file has an Outputs surface; declaring it is the single
highest-leverage move for each NSS-outputs Extend gap.

### Scripts (Python, shell, etc.)

- **Exit 0 = declared success; non-zero = declared failure.** A small
  sysexits-aligned vocabulary is preferred over a sprawling taxonomy:
  `0` `EX_OK`, `64` `EX_USAGE`, `65` `EX_DATAERR`, `66` `EX_NOINPUT`,
  `69` `EX_UNAVAILABLE`, `70` `EX_SOFTWARE`, `74` `EX_IOERR`,
  `75` `EX_TEMPFAIL`, `77` `EX_NOPERM`, `78` `EX_CONFIG`.
- **stdout = declared result; stderr = human diagnostics/logs; exit
  status = coarse outcome.** Never mix payload and diagnostics on stdout
  when stdout is machine-consumed.
- **Partial output on failure must be stated.** `forbidden` (atomic:
  exit non-zero and clean up), `valid_and_marked` (commit partial
  output with a `partial: true` marker), or `resumable` (commit partial
  output that subsequent runs continue from).
- **Idempotency is a property of the operation, not the file.** A
  `bcvk ephemeral run` invocation creates a new ephemeral VM each time;
  a `bootc install to-disk` invocation is idempotent when the target
  is already at the same deployment. State which is which.

### systemd unit (`StandardOutput=`, `StandardError=`, `Type=`)

- `StandardOutput=journal` is the default; `=file:/path` writes a
  declared file with declared mode. Document the file path, mode,
  owner, and rotation policy. yubiOS convention: mode 0640,
  `systemd-tmpfiles` rotation, never world-readable logs.
- `Type=oneshot` runs to completion and exits; `Type=notify` waits for
  `sd_notify(READY=1)`; `Type=simple` runs in foreground; `Type=forking`
  expects the service to fork-and-detach. The exit code of a
  `Type=oneshot` is the operation's success/failure; `Type=notify`
  failures are reported via `sd_notify(ERRNO=…)` and journald
  `MONOTONIC_USEC=…`.
- `SuccessExitStatus=` accepts additional exit codes as success; if
  present, document them and the rationale (e.g. `cryptenroll` exit
  5 with the `--token-only` flag means "slot already enrolled").

### GitHub Actions (workflow output contract)

For reusable workflows, declare `outputs:` in the `workflow_call` or
`workflow_dispatch` block with name, description, and value. Each
output is typed implicitly (string) and flows to consumers via
`${{ needs.<job>.outputs.<name> }}`.

The CI chain on yubiOS uses `ci.yml` as the orchestrator; each inner
workflow (`ci_test-vm.yml`, `ci_test-vgpu-vm.yml`, `fetch-*.yml`)
reports its success/failure via exit codes (0 = green, non-zero = red)
and via the dispatcher's `conclusion=success` field in the workflow
API. Never assume the dispatcher's outer `conclusion` matches the
inner chain's actual conclusion -- read inner run logs (per
PROJECT_RULES.md PR #150 doctrine).

### Containerfile (`ENTRYPOINT` / `CMD` / image labels)

- `ENTRYPOINT` and `CMD` produce a process whose exit code is the
  image's success/failure signal. Document the declared exit codes
  and the partial-output policy.
- Image labels (`LABEL io.yubios.<key>=<value>`) are the
  provenance record. The yubiOS pattern is `io.yubios.commit=<sha>`
  and `io.yubios.build-ts=<rfc3339>`; declare them in the Containerfile
  so every layer carries them.
- Reproducible-build labels (`SOURCE_DATE_EPOCH=<unix-ts>`) tell
  downstream consumers that the build is deterministic; without the
  label, treat the image as non-reproducible.

### mkosi (`Output=`, image format)

- `Format=disk` produces a raw disk image at the declared
  `Output=<path>`; `Format=oci` produces an OCI image at the declared
  `ImageId=<name>`; `Format=directory` produces a rootfs tree.
- Document the output path, mode, and the side effects
  (e.g. mkosi writes a build manifest at
  `<output>.manifest.json` adjacent to the image).
- Reproducibility: pin `SOURCE_DATE_EPOCH=<ts>` in the build
  environment to make the image byte-identical across rebuilds.

### Refs/notes (`refs/*.md`)

A research note's Outputs surface is unusual: it has no runtime
output, but it has *deliverable* outputs. The note produces a set of
decisions, risks, and followups; declare them at the bottom as a
"Decisions / Risks / Followups" triple. The yubiOS convention is a
trailing `## Decisions` / `## Risks` / `## Followups` triple -- one
per note, kept current on review.

## Examples

### Example 1 -- Shell script Outputs (exits + streams + idempotency)

```bash
#!/usr/bin/env bash
# Outputs:
#   exit 0  : success -- JSONL record committed to $OUTPUT_PATH
#   exit 64 : EX_USAGE -- invalid flag or missing required arg
#   exit 66 : EX_NOINPUT -- required input file absent or unreadable
#   exit 70 : EX_SOFTWARE -- unexpected internal defect (uncaught)
#   exit 74 : EX_IOERR -- read/write failure on $OUTPUT_PATH
#   exit 75 : EX_TEMPFAIL -- transient I/O; retry with backoff is safe
#   exit 77 : EX_NOPERM -- $OUTPUT_PATH not writable by current uid
#   exit 78 : EX_CONFIG -- invalid config; CONFIG_VALIDATE=0 was set
#   stdout  : human summary only (when --quiet is not set); NEVER payload
#   stderr  : human diagnostics + log records (one per event)
#   files   : $OUTPUT_PATH (mode 0640, owner $UID, JSONL framing)
#   partial_output_on_failure: forbidden -- atomic write via mv(1)
#   idempotency: not_supported -- each invocation appends a record
#   determinism: logical -- run_id is deterministic when seeded
#
# Failure mode: any non-zero exit leaves no partial $OUTPUT_PATH --
# atomic rename guarantees the consumer sees the previous full file
# or a missing file, never a half-written one.
```

### Example 2 -- Python script Outputs (logging + structured)

```python
"""
Outputs:
  exit 0  : success -- result committed to ./output.json
  exit 2  : argparse rejected the invocation (uses argparse default)
  exit 65 : EX_DATAERR -- config invalid against schema version 2
  exit 70 : EX_SOFTWARE -- uncaught exception; full traceback in stderr
  exit 75 : EX_TEMPFAIL -- upstream service returned 5xx; retry safe
  stdout  : result summary ONLY when --quiet is absent
  stderr  : structured JSONL logs (one per event), severity in {"DEBUG","INFO","WARN","ERROR","CRITICAL"}
  files   : ./output.json (mode 0640, atomic via tmp + rename)
            ./output.json.tmp (cleaned up on failure; never committed)
  partial_output_on_failure: forbidden
  idempotency: not_supported -- re-running produces a new ./output.json
  determinism: byte_identical when seed + clock + locale are pinned
"""
```

### Example 3 -- systemd unit Outputs (StandardOutput + Type)

```ini
# Outputs:
#   StandardOutput=journal    -- log records via journald, NOT to disk
#   StandardError=journal     -- diagnostics via journald, NOT to disk
#   Type=oneshot              -- runs to completion, exits
#   SuccessExitStatus=0 2     -- 0 = success, 2 = "already configured" (idempotent retry)
#   files: none (the unit does not write files; it mutates state via the kernel/udev)
#   side effects: applies yubiOS-no-vfio override on /sys and /usr/lib;
#                 idempotent (re-running converges)
#   exit 0 : override applied (or already present)
#   exit 1 : override rejected by kernel/udev
#   exit 2 : already configured (SuccessExitStatus=2 makes this a "success" outcome)
#   partial_output_on_failure: forbidden -- the override is a single kernel write
#   determinism: byte_identical (same inputs -> same sysfs state)
```

### Example 4 -- GitHub Actions reusable workflow Outputs

```yaml
# Outputs (workflow_call outputs):
#   digest:    string. The sha256 digest of the resolved fedora-bootc:45 image.
#              When empty, the workflow failed to resolve; consumers should
#              fail closed rather than retry.
#   build_id:  string. The build id of the yubiOS-ci run; consumers use it to
#              fetch the artifact.
#   rerun_cmd: string. The exact dispatch command to retry the build; useful
#              for incident responders.
# Exit codes (per workflow run):
#   0 : all inner jobs completed with conclusion=success
#   non-zero : at least one inner job failed; read the inner run logs
#   partial_output_on_failure: valid_and_marked -- outputs.* fields reflect
#                              the last completed step's state
# Idempotency: inherently_idempotent for fetch workflows; build workflows
#              require Idempotency-Key header to retry safely (else they
#              push duplicate :dev-<sha> tags)
# Determinism: logical -- digest is stable per base image, but the build
#              artifact varies by timestamp unless SOURCE_DATE_EPOCH is set
```

### Example 5 -- Containerfile Outputs (image + labels + reproducibility)

```dockerfile
# Outputs:
#   image:  docker.io/0mniteck/yubios:<tag> (multi-arch; amd64 + arm64 children)
#   labels: io.yubios.commit=<full-sha>, io.yubios.build-ts=<rfc3339>,
#           io.yubios.source-date-epoch=<unix-ts>, io.yubios.reproducible=true
#   manifest: <image>.manifest.json adjacent to the image (build provenance)
#   exit 0 : build + push + sign + attest completed
#   exit 1 : any of build / push / sign / attest failed
#   partial_output_on_failure: forbidden -- atomic via composefs
#   idempotency: inherently_idempotent for `build` (cached layers);
#                NOT idempotent for `push` (each push creates a new tag)
#   determinism: reproducible_build when SOURCE_DATE_EPOCH is pinned;
#                else byte-identical only across same-timestamp rebuilds
```

### Example 6 -- mkosi.conf Outputs

```ini
# Outputs (mkosi.conf.d/* syntax):
#   [Output]
#   Format=disk           -- produces a raw disk image
#   Output=yubios.raw     -- path under the build root
#   ImageId=yubios        -- OCI tag (used by Format=oci)
#   ImageVersion=<ts>     -- version label (defaults to build timestamp)
# Side effects:
#   yubios.raw.zst        -- compressed artifact
#   yubios.raw.manifest   -- build provenance (sha256 of inputs)
#   yubios.raw.checksums  -- sha256 of yubios.raw + zst + manifest
# Exit 0 : build + sign + manifest + checksums completed
# Exit 1 : any step failed
# partial_output_on_failure: valid_and_marked -- manifest.checksums
#                            reports which artifacts succeeded
# idempotency: inherently_idempotent for Format=disk (re-running
#              produces a byte-identical image when SOURCE_DATE_EPOCH
#              is pinned); NOT idempotent for Format=oci push
# determinism: reproducible_build when SOURCE_DATE_EPOCH is pinned
```

### Example 7 -- refs/*.md Outputs (deliverable triple)

```markdown
<!-- Outputs (deliverable triple, kept current on review):
     ## Decisions
       - ADR-031 virtio-gpu default / vfio-user preferred / IOMMU-gated PCI passthrough
       - ADR-032 kernel+rootfs split (Phase 1 shipped via PR #143)
       - ADR-033 misbehavior-triggered PCI-mediation cutoff (PR #151)
     ## Risks
       - B-VGPU-VM-UNZIP (workflow host-deps gap)
       - B-VM-CTAP2 (RESOLVED 2026-07-25 per run 30139433902)
       - IOMMU gate hardware enforcement is post-launch (ADR-031 honesty note)
     ## Followups
       - OMN-141 sacrificial RK3588 burn (operator gate)
       - OMN-150 BLSConfig install-time wiring (bootc 1.16.4+)
       - OMN-146 bare-metal PCI-passthrough testing scope
     Validation: each decision/followup is cited by ADR number or OMN issue.
     Failure: a note that names a decision without an ADR/OMN link is not
              auditable; flag as Extend gap.
-->
```

## Guidelines

1. **Every output has a channel.** If you cannot say whether a value
   arrives via exit code, stdout, stderr, log record, file, side
   effect, or response payload, the output is *implicit* -- surface it
   as such, because implicit outputs are the single most common
   source of "I forgot to read X" failures.
2. **Exit 0 means declared success -- nothing partial.** A non-zero
   exit with a partial output on disk is the worst-case contract; pick
   one of `forbidden` (atomic via tmp+rename), `valid_and_marked`
   (commit with a `partial: true` marker), or `resumable` (commit and
   continue on next run).
3. **stdout = declared result; stderr = human diagnostics.** Never
   mix payload and diagnostics on stdout when stdout is machine-consumed;
   never emit log records on stdout when stderr is the conventional log
   sink.
4. **Logs are records, not prose.** JSONL framing (one JSON value per
   line), stable field names, RFC3339 UTC timestamps, explicit severity
   mapping. Never pretty-print logs spanning multiple lines; never
   interpolate secrets into a message.
5. **Schema is for consumers, not authors.** A JSON Schema, OpenAPI,
   or AsyncAPI document that pins dialect + version + examples turns
   the output from "trust me" to "validated." Pin the dialect, declare
   the compatibility policy, and validate in CI.
6. **Idempotency is a property of the operation, not the file.** A
   `bcvk ephemeral run` creates a new VM; a `bootc install to-disk`
   converges on an already-installed target. State which; if neither
   applies, declare `not_supported` and document why a duplicate
   invocation would be unsafe.
7. **Determinism is a spectrum.** `logical` (same inputs -> same
   logical result), `byte_identical` (same inputs -> same bytes),
   `reproducible_build` (same toolchain + pinned deps + same bytes
   across hosts). State which; document the canonicalization
   procedure for any non-`logical` claim.
8. **Side effects are outputs too.** A network call, a file write,
   a state mutation, a process spawn -- all are outputs and must be
   declared in the same Outputs section as the file's exit code.
9. **Reproducibility needs `SOURCE_DATE_EPOCH` + a canonical
   procedure.** Without both, the `byte_identical` claim is
   hand-waving. With both, verify with two clean builds and compare
   the content hash.
10. **Use the seven-channel taxonomy verbatim.** "Where does this
    output go?" should always answer with one of exit / stdout /
    stderr / log / file / side-effect / response. New channels need a
    new skill; do not invent channel names in a file's Outputs
    section.
11. **Close the NSS-outputs Extend gap with one section per file.**
    The atomic cycle-10 patch for any file with an NSS-outputs gap is
    ONE `## Outputs` section, file-type-aware comment syntax, with
    the seven-channel table or its markdown equivalent. One section,
    one file, one cycle.
12. **Pre-register the output surface.** Before adding a new output,
    write the schema entry first (description, type, framing,
    idempotency, determinism), then implement the producer.
    Schema-first.

## Constraints

- **Self-contained.** This skill does not depend on negative-skill-space
  being loaded; it composes *with* NSS as a follow-up action (NSS
  proposes the gap, nss-outputs closes it).
- **No runtime.** This is a documentation skill. It does not emit log
  records or write files.
- **Schema is for humans first.** The Outputs section a cycle-10 patch
  adds is read by humans (and by the next RSI cycle's NSS sweep)
  before it is consumed by any parser. Clarity > strict YAML.
- **One section per file.** Do not stack multiple `## Outputs` blocks
  in one file; do not nest Outputs inside another section heading.
- **Channel names are fixed.** exit / stdout / stderr / log / file /
  side-effect / response. A value that arrives via a novel channel
  needs a new skill, not a new channel name.
- **No silent partial outputs.** If the contract is partial output
  on failure, it must say so. If the contract is forbidden, the
  implementation must use atomic writes (tmp + rename).
- **Pair with `negative-skill-space`.** This skill is the Outputs-axis
  specialist; the parent NSS skill orchestrates the 12-axis sweep
  and the action taxonomy (Extend / Pair / Accept).

## Anti-patterns

- **Outputs without a channel.** "The script writes X" without saying
  whether X is on stdout, stderr, an exit code, a file, or a side
  effect is *worse* than no Outputs section, because it pretends to
  be a declaration.
- **Mixed stdout/stderr.** A script that emits the result on stderr
  and the diagnostics on stdout is unusable from `cmd >file 2>&1`;
  every consumer has to inspect both streams and guess.
- **Exit 0 with partial output.** A non-atomic write that exits 0
  after committing a half-written file is the worst-case contract.
  Use tmp + rename; declare `partial_output_on_failure: forbidden`.
- **Generic exit 1 for every failure.** A consumer that cannot tell
  validation errors from transient failures from internal defects
  cannot route the failure to the right recovery path. Use sysexits.h.
- **Logs spanning multiple lines.** Pretty-printed logs are invalid
  JSONL; one JSON value per line, with `\n` escaped inside strings,
  is the only framing that survives `jq`, `grep`, and streaming
  consumers.
- **Interpolation of secrets into log messages.** A log message like
  `"auth failed with token=eyJ…"` is a secret-leak audit finding.
  Use a `redaction: secrets_and_sensitive_values_removed` declaration
  and a redaction library at the producer.
- **Idempotency claims without proof.** "This is idempotent" without
  saying what the operation's effect boundary is (the file, the
  record, the deployment) is hand-waving. State the boundary; if
  the operation is not idempotent, declare `not_supported` and
  document why a duplicate would be unsafe.
- **Determinism claims without canonicalization.** "Same inputs ->
  same output" without a canonicalization procedure (key sort, locale,
  line endings, hash over canonical bytes) is hand-waving. State
  the procedure; verify with two clean builds and compare.
- **`--check` is not `--dry-run`.** A check may validate drift
  without constructing the execution plan; a dry-run must preview
  side effects. State which is which.
- **An Outputs section that does not name the file's own outputs.**
  A cycle-10 patch that adds `## Outputs` to `Containerfile` but
  does not list the image label, the digest, the exit codes, etc.
  is a placeholder patch and counts as a NO verdict, not a YES.

## Red flags

| Observation | What it means |
|---|---|
| `## Outputs` section lists zero concrete channels | the section is a placeholder |
| A script exits 0 after committing partial output | partial-output policy is `forbidden` but the implementation violates it |
| A script emits the same exit code for validation and transient failures | sysexits.h not used; consumer cannot route |
| Pretty-printed log lines spanning multiple lines | invalid JSONL; streaming consumers break |
| A log message contains a secret value | redaction policy missing or violated |
| Two runs of the same command produce different bytes | determinism claim is hand-waving |
| An HTTP API claims "idempotent" without an `Idempotency-Key` header | the claim is wrong for non-PUT/DELETE methods |
| A reusable workflow's `outputs:` field is empty when consumers depend on it | the contract is implicit |
| A `## Outputs` patch lands but the next NSS sweep still flags outputs as the top gap | the patch did not close the gap |
| The Outputs section is identical across 100+ files | templated, not inspected -- likely wrong for at least one of them |

## Composition

| Skill | How it composes | Direction |
|---|---|---|
| `negative-skill-space` | NSS runs the 12-axis sweep and flags `outputs` as a candidate Extend gap; nss-outputs is the closure skill for that one axis. Pair the two in every cycle. | negative-skill-space -> nss-outputs |
| `curve-compass-skill` | Lens-format patches in cycle-10 use nss-outputs as the outputs-axis lens payload; the lens records the hypothesis + method + parameters + delta + verdict + score + caveat for the Outputs section this skill defines. | nss-outputs -> curve-compass-skill |
| `curved-corpus-create` | The corpus the cycle-10 sweep operates over is the same `lens --corpus` JSON; the corpus's `outputs` column maps to this skill's seven-channel taxonomy. | nss-outputs <-> curved-corpus-create |
| `nss-inputs` | The Inputs surface a cycle-9 patch declares is the upstream contract; the Outputs surface a cycle-10 patch declares is the downstream contract. Pair the two for every file with both gaps. | nss-inputs -> nss-outputs |
| `nss-audience` | The audience (operator vs CI vs developer) determines which Outputs channels matter: CI cares about exit codes + log records; operators care about response payloads + files; developers care about side effects + determinism. | nss-audience -> nss-outputs |
| `api-and-interface-design` | The response surface of an API is exactly this skill's table, plus the response channel; the API design skill is the *consumer* of the table. | nss-outputs -> api-and-interface-design |
| `source-driven-development` | Each documented standard (sysexits.h, RFC 5424, JSON Lines, JSON Schema, OpenAPI, AsyncAPI, Idempotency-Key, Reproducible Builds) was verified against the official docs in the deep-research phase that produced this skill. | source-driven-development -> nss-outputs |
| `security-and-hardening` | The redaction-vs-non-redaction distinction in this skill is the yubiOS security boundary at the output layer; the security skill owns the deeper threat model. | nss-outputs <-> security-and-hardening |
| `observability-and-instrumentation` | The log record schema (JSONL + severity + run_id) is the output-layer primitive the observability skill consumes. | nss-outputs -> observability-and-instrumentation |
| `recursive-self-improvement` | When the same NSS-outputs Extend gap keeps reappearing after a cycle-10 patch, RSI's self-mode should re-isolate the editor before the next attempt -- same-author bias on Outputs sections is the most common cycle-10 failure mode. | recursive-self-improvement -> nss-outputs |

## Verification

For each cycle-10 patch that closes an NSS-outputs gap:

1. **The patch adds ONE `## Outputs` section** (or the file-type-aware
   equivalent: `# Outputs` for Containerfile/Makefile, `# # Outputs`
   for Python triple-quoted docstring, `# Outputs` for shell `#`
   comments, `<!-- Outputs -->` HTML comment for `.md` if a section
   is not appropriate, `<!-- Outputs (workflow_call outputs:) -->`
   for GitHub Actions YAML).
2. **The section names at least one concrete channel** with
   `on_success`, `on_failure`, `idempotency`, and `determinism`. A
   placeholder section with zero concrete channels counts as a NO
   verdict.
3. **Exit codes follow sysexits.h vocabulary** (or document the
   deviation explicitly). Generic `exit 1` for every failure is a NO
   verdict.
4. **stdout/stderr ownership is stated.** "stdout = result; stderr =
   logs" is the default; deviations are documented.
5. **Partial-output policy is stated.** `forbidden`,
   `valid_and_marked`, or `resumable` -- pick one and document the
   implementation evidence (atomic write, marker convention,
   checkpoint location).
6. **Idempotency is stated.** `inherently_idempotent`, `key_required`,
   or `not_supported` -- with the effect boundary named.
7. **Determinism is stated.** `logical`, `byte_identical`, or
   `reproducible_build` -- with the canonicalization procedure named
   for any non-`logical` claim.
8. **Side effects are listed.** Every network call, file write, state
   mutation, and process spawn is declared in the Outputs section.
9. **The next NSS sweep on the same file does NOT re-flag outputs as
   the top Extend gap.** If it does, the patch did not close the gap
   and the cycle-10 lens is a NO verdict.

## Changelog

- **1.0.0** (2026-08-12) -- initial. Cycle-10 deep-research synthesis
  for the NSS Outputs axis. Captures the seven-channel output
  taxonomy (exit / stdout / stderr / log / file / side-effect /
  response), the yubiOS-specific patterns for shell scripts
  (sysexits.h + atomic rename + JSONL logs), systemd units
  (StandardOutput + Type=oneshot/notify + SuccessExitStatus),
  GitHub Actions (workflow_call outputs + idempotency of dispatch),
  Containerfile (image labels + reproducibility), mkosi (Output +
  manifest + checksums), Python (logging JSONL + atomic write),
  and refs/*.md (Decisions / Risks / Followups deliverable triple),
  plus the idempotency-vs-non-idempotency and logical-vs-byte-identical
  distinctions. Every example and anti-pattern is grounded in the
  source-driven-development deep-research pass on sysexits.h, RFC
  5424, Go slog, JSON Lines, JSON Schema 2020-12, OpenAPI 3,
  AsyncAPI, MDN/Idempotency-Key, the IETF Idempotency-Key draft,
  Apache Kafka delivery semantics, Reproducible Builds
  (deterministic-build-systems, stable-outputs), and the
  SOURCE_DATE_EPOCH specification.

## Maintainer

Sauna, wave 2 cycle 10. Built against the deep-research synthesis for
the NSS Outputs axis (PR #207 cycle-7 NSS gap-informed context),
`negative-skill-space` SKILL.md, the `nss-inputs` and `nss-audience`
skills (cycle-9 closure examples), and the cycle-7 lens pool
(`lenses.json` at root of `feat/rsi-compass-cycle7-nss-research-2026-08-12`).
