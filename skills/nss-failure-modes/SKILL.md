---
name: nss-failure-modes
description: "Cycle-14 deep-research synthesis for the NSS Failure modes axis (7/12 in negative-skill-space). For each file in a corpus, the Failure modes axis identifies WHAT CAN GO WRONG -- error cases, edge cases, partial-failure scenarios, footguns, TOCTOU races, partial-write hazards, retry-without-idempotency hazards, error-swallowing anti-patterns, misleading errors, unsafe defaults, untested error paths, security-failure-mode coverage, recovery-vs-detection coverage. Use when the 12-axis NSS sweep lands on failure modes as the highest-priority Extend gap, when auditing a script/unit/API/refs-note for blameless failure-mode coverage, when reviewing a 'happy-path' implementation that lacks error-path tests, when adding a Failure modes section next to Inputs/Outputs/Audience, when documenting sysexits.h exit codes, when classifying errno values into a project error catalog, when writing a runbook for incident responders, when designing negative tests (fault injection: SIGTERM, ENOSPC, EINTR, EIO, ETIMEDOUT, ENOENT, EACCES, EAGAIN), or when auditing recovery semantics for retry/idempotency/partial-completion/cancellation/timeout ambiguity. Triggers on: NSS failure modes axis, what can go wrong, error cases, footgun, blameless postmortem, FMEA, error catalog, sysexits.h, errno, failure mode catalog, runbook, blameless retrospective, recovery path, detection signal, severity, probability, cycle-14 NSS-failure-modes gap-finder. NOT for inputs (use nss-inputs), outputs (use nss-outputs), audience (use nss-audience), mode (use nss-mode), or any of the other 11 NSS axes."
---

# nss-failure-modes

The **Failure modes** axis (7/12 of `negative-skill-space`) asks: **what can go wrong here, how would I know, and what would I do about it?** A file that documents only its happy path is a file whose recovery path is recoverable only by reading its postmortem history.

The cycle-14 NSS-failure-modes sweep applies this rubric to ~40 files in the yubiOS corpus. Each file gets ONE failure-mode-aware section added per lens-format patch (`## Failure modes -- cycle 14`).

## What Failure modes covers

For every file, script, skill, container, workflow, unit, or API operation, Failure modes records the *complete surface* a caller can fall into when the file does not do its expected work, and the contract for what the caller should see and do.

| Channel | Examples |
|---|---|
| **Boundary failure** | parse/validate rejects, malformed input, absent input, wrong-version input, partial input |
| **Authorization / permission** | missing scope, expired credential, wrong principal, rootless-vs-root surprise, capability drop vs denial |
| **Filesystem / IO** | ENOENT, EACCES, ENOSPC, EIO, EISDIR, ENOTDIR, EFBIG, EROFS, partial write, lost lock |
| **Process / signal** | SIGTERM, SIGKILL, SIGINT, SIGHUP, child reaping, zombie, double-fork pid loss |
| **Network / RPC** | timeout, connection refused, DNS failure, TLS handshake, partial response, body truncation |
| **Dependency** | upstream unavailable, schema drift, version skew, deprecated API, library ABI mismatch |
| **Concurrency** | race, deadlock, livelock, starvation, partial commit visible to readers |
| **Resource exhaustion** | OOM, fd exhaustion, cgroup quota, disk quota, inode exhaustion, CPU throttle |
| **Time / clock** | clock skew, leap-second, monotonic clock vs wall clock, NTP step, SOURCE_DATE_EPOCH drift |
| **Configuration** | invalid value, missing key, incompatible combination, env-var precedence surprise |
| **State invariant** | precondition violated, postcondition not reached, idempotency violation, partial transition |
| **Observability failure** | log lost, metric dropped, alert silencer, dashboard drift, telemetry tag absent |
| **Recovery failure** | rollback broken, partial cleanup, orphaned temp file, lock leak, stale cache |
| **Security** | privilege escalation, secret leakage, TOCTOU (CWE-367), injection, replay, downgrade |

For each failure mode, document:

| Field | What to record |
|---|---|
| `id` | Local FM-NNN identifier (stable across edits) |
| `what` | What the user or system observes |
| `why` | Why it can happen (cause + assumption + environmental condition) |
| `effect` | Technical, operational, security, data, and user impact |
| `detection` | Exact signal: log line, exit code, errno, exception, invariant, metric, test |
| `recovery` | Safe immediate action, rollback/repair path, escalation owner |
| `severity` | Local severity scale (see below) |
| `probability` | Local probability scale with denominator and evidence |
| `prevent` | How to make it impossible, less likely, or less harmful |
| `test` | The fault-injection / negative test that demonstrates the mode is handled |
| `evidence_gap` | What is NOT yet tested, observed, or proved |

A useful rule: **raw failure, classified failure, and effective contract are three different things.** A good pipeline is `fail -> record native signal (errno / exit / exception) -> classify into project taxonomy -> emit declared payload on declared stream -> declare partial-output policy -> expose recovery`. Never fold detection and classification together; never silently coerce surprising signals into "exit 1".

## Severity and probability scales

State the scale locally; do not import a generic rubric without citing the source.

**Severity (1-10):**

| Score | Label | Consequence |
|---|---|---|
| 1-2 | Negligible | Cosmetic; no operational impact |
| 3-4 | Degraded | UX or operator workflow impaired |
| 5-6 | Operational | Customer-impacting; needs response |
| 7-8 | Major | Outage, data loss, security exposure |
| 9-10 | Critical | Catastrophic, regulatory, safety, key compromise |

**Probability (with explicit denominator):**

| Label | Definition |
|---|---|
| Rare | < 1% per relevant operation per year (cite the denominator) |
| Uncommon | 1-10% per relevant operation per year |
| Possible | 10-25% per relevant operation per year |
| Likely | 25-50% per relevant operation per year |
| Frequent | > 50% per relevant operation per year |

If the denominator is unknown, say "uncalibrated" rather than fabricate a percentage. AIAG-VDA 2019 prefers Action Priority (AP: High / Medium / Low) over RPN arithmetic; copy whichever scale the project's incident policy already uses.

## Failure modes and the yubiOS surface

Every yubiOS file has a Failure modes surface; declaring it is the single highest-leverage move for each NSS-failure-modes Extend gap.

### Containerfile (`FROM` / `ARG` / `RUN` / `LABEL`)

- **Stale base digest (HIGH, Likely)**: `FROM fedora-bootc:45@sha256:...` expires when quay.io rotates; build fails with `not found`. Detect: `podman build` error containing the old digest. Recover: dispatch `fetch-fedora-bootc-manifest.yml` to re-resolve; rebuild. Prevent: pre-check digest HEAD request; treat as ephemeral.
- **Build arg injection (HIGH, Possible)**: `--build-arg SECRET=...` persists in image history. Detect: `docker history` shows the value. Recover: rotate the secret. Prevent: `--mount=type=secret,id=foo` (BuildKit) — never `ARG SECRET` or `ENV SECRET`.
- **Layer cache poisoning (MEDIUM, Uncommon)**: stale cached layer over a changed source. Detect: built image lacks the expected change; SHA differs. Recover: `podman build --no-cache`. Prevent: pin every COPY source by digest; rebuild on toolchain change.
- **`RUN` step non-idempotent (MEDIUM, Possible)**: a `RUN dnf install -y foo` re-runs and adds the package twice on rebuilds. Detect: rpm db shows duplicate entries. Recover: `dnf reinstall` or rebuild from clean state. Prevent: `RUN --mount=type=cache,target=/var/cache/dnf` for cache reuse; `dnf install -y foo` once.

### mkosi.conf (`[Distribution]` / `[Output]` / `Packages`)

- **Incompatible format + arch (HIGH, Possible)**: `Format=disk` + `Architecture=aarch64` on a host without binfmt registration. Detect: mkosi fails with `qemu-aarch64 not found`. Recover: register binfmt (`docker run --privileged --rm tonistiigi/binfmt --install all`); pick a host arch-compatible format. Prevent: pre-flight binfmt check in CI.
- **mkosi cache drift (MEDIUM, Uncommon)**: stale `mkosi.cache/` cache returns a partially-failed build. Detect: image has stale files; SHA differs from clean rebuild. Recover: `mkosi clean`. Prevent: pin a cache key that includes `mkosi.conf.d/` content hash.

### systemd unit (`ExecStart=` / `Type=` / `Restart=`)

- **Service ready before listen (HIGH, Possible)**: `Type=simple` starts accepting traffic before the socket is bound. Detect: `journalctl -u foo` shows first request arrives before `Listening on...`. Recover: switch to `Type=notify` + `sd_notify(READY=1)`; add `After=network-online.target`. Prevent: always `Type=notify` for services with readiness semantics.
- **Restart storm (MEDIUM, Possible)**: `Restart=always` + `RestartSec=0` on a service that exits immediately. Detect: `systemctl status foo` shows restart counter > 100 in 10s. Recover: set `Restart=on-failure` + `RestartSec=5s` + `StartLimitBurst=5`. Prevent: pick restart policy deliberately; rate-limit restarts.
- **Drop-in lex-order surprise (HIGH, Likely)**: a `usr/lib/systemd/*.service.d/*.conf` override lex-sorts BEFORE the upstream file and silently gets overridden. Detect: `systemctl show foo` shows the upstream value, not the override. Recover: rename the override to a prefix that lex-sorts AFTER upstream (e.g. `yubiOS-` or `vfio-yubiOS-`). Prevent: `ls -1 usr/lib/systemd/<dir> | sort -u` verification per the cycle-7 playbook.

### GitHub Actions (`on:` / `permissions:` / `workflow_dispatch.inputs`)

- **`on: push` to main with write permission (HIGH, Possible)**: workflow runs on direct-to-main push with `contents: write`. Detect: workflow run shows green but the push was unauthorized. Recover: revoke PAT, force-push revert (Jenny's call). Prevent: require PR; gate `permissions:` to `contents: read` for non-deploy jobs.
- **`secrets.*` from a job without explicit permission (HIGH, Possible)**: a job reads `secrets.FOO` but its `permissions:` block does not grant the scope. Detect: job fails with `Resource not accessible by integration`. Recover: add `permissions:` to the job (not workflow). Prevent: `permissions:` per job; never rely on workflow-level inheritance for secrets access.
- **Outer-dispatcher success hiding inner failure (HIGH, Frequent)**: `ci.yml`'s outer `conclusion=success` does not prove the inner chain succeeded. Detect: outer green + inner red in `GET /repos/.../actions/runs/<id>` for the dispatched workflows. Recover: always read inner run logs before reporting green. Prevent: per the PR #150 doctrine in PROJECT_RULES.md: name the workflow file, read the inner chain.

### Python scripts (`argparse` / `open()` / `subprocess`)

- **`subprocess.run(check=True)` swallowing stderr (MEDIUM, Possible)**: child crashes but the parent exits 0 because stderr was not captured. Detect: subprocess returncode != 0 but caller sees `CompletedProcess(returncode=0)`. Recover: capture stderr; re-raise or log. Prevent: `subprocess.run([...], check=True, capture_output=True, text=True)`; explicit error path.
- **Silent `except Exception` (HIGH, Likely)**: `try: ... except Exception: pass` swallows the real error and continues with corrupt state. Detect: subsequent operation fails with a misleading cause. Recover: re-run with logging enabled; restore from known-good state. Prevent: `except` must narrow the type, log, and either re-raise or recover intentionally.
- **Path traversal on user input (CRITICAL, Possible)**: `open(user_path)` reads or writes outside the intended directory. Detect: file exists outside the root. Recover: revoke any leaked data; close the path. Prevent: canonicalize + check `resolve().is_relative_to(allowed_root)`; never `os.path.join(base, user_path)` without validation.
- **`requests` retry without idempotency (HIGH, Possible)**: a non-idempotent POST retried on 5xx creates duplicates. Detect: two records with the same key. Recover: dedupe by idempotency key; compensate. Prevent: add `Idempotency-Key` header; check before retry; bound retries with backoff + jitter.

### Refs/notes (`refs/*.md`)

- **Stale claim (MEDIUM, Possible)**: a `Last reviewed` date older than 30 days; the note references a BLOCKERS.md item that has since been RESOLVED. Detect: BLOCKERS.md `Last reviewed` > note's `Last reviewed`. Recover: re-review the note; cite the new state. Prevent: include `<last-reviewed-against-blockers>` stamp per the PROJECT_RULES.md gate.
- **Decision without ADR (MEDIUM, Possible)**: a note names a decision without an ADR number or OMN issue link. Detect: paragraph says "we decided to..." but no `ADR-NNN`. Recover: file an ADR. Prevent: every decision names an ADR or OMN link; per the audit-evidence-packaging doctrine.
- **Footgun in a recipe (HIGH, Possible)**: a playbook says "re-run the fetch group ci" without naming the fallback when the fetch workflow is itself the failure. Detect: operator runs the recipe and gets the same failure. Recover: escalate. Prevent: every recipe names a stop / escalate condition.

## Examples

### Example 1 -- Containerfile Failure modes

```dockerfile
# Failure modes:
#   FM-001 [HIGH, Likely]  Stale base digest.
#                            what: build fails; quay.io 404 on the pinned sha256
#                            why:  quay.io rotated the fedora-bootc:45 digest
#                            detection: podman/buildah error contains the old digest
#                            recovery: dispatch fetch-fedora-bootc-manifest.yml
#                                     (auto-re-resolves); rebuild at new digest
#                            prevent: pre-check digest HEAD; treat digest as ephemeral
#                            test:    fault-inject by pinning a digest that 404s
#   FM-002 [HIGH, Possible] Secret leaked via ENV/ARG into image history.
#                            what: docker history shows the secret value
#                            why:  ENV/ARG persists; secret must NOT be in either
#                            detection: docker inspect shows the env; history shows the arg
#                            recovery: rotate the secret immediately
#                            prevent: --mount=type=secret,id=foo (BuildKit)
#                            test:    grep image history for known-leaked marker
#   FM-003 [MED, Uncommon] Layer cache poisoning.
#                            what: image lacks the expected change despite green build
#                            why:  stale layer over a changed source
#                            detection: built-image SHA differs from clean-rebuild SHA
#                            recovery: podman build --no-cache
#                            prevent: pin COPY sources by digest; rebuild on toolchain change
#                            test:    diff SHA(build) vs SHA(clean build) -- must match
#   FM-004 [MED, Possible] RUN step non-idempotent.
#                            what: rpm db shows duplicate entries on rebuild
#                            why:  RUN dnf install -y foo re-runs without --setopt=install_weak_deps=False cleanup
#                            detection: rpm -Va | grep dup
#                            recovery: dnf reinstall; rebuild from clean state
#                            prevent: dnf install -y <single-shot>; cache via --mount=type=cache
#                            test:    rebuild twice; rpm db diff must be empty
```

### Example 2 -- Shell script Failure modes (sysexits.h)

```bash
#!/usr/bin/env bash
# Failure modes:
#   FM-001 [HIGH, Likely]  Input file absent.
#                            what:    no output produced
#                            why:     $INPUT_PATH is wrong or mount is unavailable
#                            detection: exit 66 (EX_NOINPUT); stderr "input file not found: <name>"
#                            recovery: correct path; check mount; re-run
#                            prevent: preflight only for UX; still handle open failure
#                            test:    rm input; run; assert exit 66 + stderr text
#   FM-002 [HIGH, Low]     Output truncated after interruption.
#                            what:    $OUTPUT_PATH shorter than expected
#                            why:     SIGTERM during direct write; or ENOSPC; or EIO
#                            detection: length mismatch; checksum mismatch; ENOSPC/EIO in stderr
#                            recovery: stop consumers; restore last good artifact; clean tmp
#                            prevent: tmp + fsync + atomic rename; never write to $OUTPUT_PATH directly
#                            test:    fault-inject SIGTERM at half-write; assert previous full file intact
#   FM-003 [CRIT, Possible] Retry duplicates side effect.
#                            what:    two records with the same key
#                            why:     retry on timeout when completion is unknown
#                            detection: idempotency lookup; duplicate counter
#                            recovery: dedupe by idempotency key; compensate if needed
#                            prevent: contract test: timeout-after-commit must not duplicate
#                            test:    fault-inject 5xx after commit; retry; assert one record
#   FM-004 [MED, Uncommon] Permissions denied mid-run.
#                            what:    subsequent operation fails with EACCES
#                            why:     dropped privilege (setuid) or umask too tight
#                            detection: exit 77 (EX_NOPERM); EACCES in stderr
#                            recovery: verify uid; chmod; re-run with correct user
#                            prevent: declare required uid/gid in Inputs section; preflight
#                            test:    run as wrong uid; assert exit 77
```

### Example 3 -- systemd unit Failure modes

```ini
# Failure modes:
#   FM-001 [HIGH, Possible] Service ready before listen.
#                            what:    first request arrives before socket is bound
#                            why:     Type=simple does not wait for readiness
#                            detection: journalctl shows request < "Listening on..."
#                            recovery: Type=notify + sd_notify(READY=1); After=network-online.target
#                            prevent: always Type=notify for services with readiness semantics
#                            test:    dispatch request at t=0; assert 5xx until notify READY=1
#   FM-002 [MED, Possible] Restart storm.
#                            what:    restart counter > 100 in 10s
#                            why:     Restart=always + RestartSec=0 on a service that exits immediately
#                            detection: systemctl status foo; Restart= counter
#                            recovery: Restart=on-failure + RestartSec=5s + StartLimitBurst=5
#                            prevent: pick restart policy deliberately; rate-limit restarts
#                            test:    install unit that exits 1; observe StartLimitBurst
#   FM-003 [HIGH, Likely]  Drop-in lex-order surprise.
#                            what:    override silently negated by upstream file
#                            why:     override filename lex-sorts BEFORE upstream
#                            detection: systemctl show foo shows upstream value
#                            recovery: rename to vfio-yubiOS-... or yubiOS-...
#                            prevent: ls -1 usr/lib/<dir>/ | sort -u verification per playbook
#                            test:    install override at numeric prefix; assert it loses; rename; assert it wins
```

### Example 4 -- GitHub Actions workflow Failure modes

```yaml
# Failure modes:
#   FM-001 [HIGH, Possible]  permissions: contents: write on a PR-only workflow.
#                             what:    workflow could push to main from a PR
#                             why:     default permissions were inherited; nobody narrowed them
#                             detection: gh api repos/.../actions/permissions/workflow shows write
#                             recovery: tighten permissions; rotate any leaked PAT
#                             prevent: default workflow permissions: read-only at org level
#                             test:    open a PR; assert workflow cannot push to main
#   FM-002 [HIGH, Frequent]  Outer-dispatcher success hides inner failure.
#                             what:    ci.yml reports green; inner chain reports red
#                             why:     outer conclusion=success only proves Dispatch next workflow ran
#                             detection: GET /repos/.../actions/runs?workflow=ci.yml green + inner red
#                             recovery: always read inner run logs; never trust outer alone
#                             prevent: per PR #150 doctrine: name the workflow file; read the inner chain
#                             test:    fault-inject inner failure; outer green; assert CI is red
#   FM-003 [MED, Uncommon]   workflow_dispatch input coercion.
#                             what:    "true" passed as a string instead of boolean
#                             why:     workflow_dispatch.inputs[].type is not enforced pre-2022
#                             detection: downstream step fails on truthy check
#                             recovery: pre-validate inputs.<id> with explicit regex/enum
#                             prevent: use workflow_call (typed inputs) over workflow_dispatch
#                             test:    dispatch with type-coerced values; assert reject
```

### Example 5 -- Python script Failure modes (idempotency + redaction)

```python
"""
Failure modes:
  FM-001 [HIGH, Possible]  Subprocess crash with stderr swallowed.
                            what:    caller sees CompletedProcess(returncode=0)
                            why:     subprocess.run(...) without check=True and without stderr capture
                            detection: subsequent operation fails with misleading cause
                            recovery: re-run with logging enabled; restore from known-good state
                            prevent: subprocess.run([...], check=True, capture_output=True, text=True)
                            test:    fault-inject child exit 1; assert caller raises
  FM-002 [HIGH, Likely]    Silent `except Exception: pass`.
                            what:    subsequent operation fails with corrupt state
                            why:     except narrows nothing; logs nothing; continues
                            detection: log line at WARN level; downstream invariant violation
                            recovery: re-run with debug logging; restore from known-good state
                            prevent: except narrows the type, logs, and either re-raises or recovers intentionally
                            test:    fault-inject ValueError; assert log line + re-raise
  FM-003 [CRIT, Possible]  Path traversal on user input.
                            what:    file read/written outside the intended directory
                            why:     os.path.join(base, user_path) without canonicalization
                            detection: file exists outside root; security audit alert
                            recovery: revoke any leaked data; close the path
                            prevent: canonicalize + check resolve().is_relative_to(allowed_root)
                            test:    fault-inject "../../etc/passwd"; assert reject
  FM-004 [HIGH, Possible]  Retry duplicates side effect.
                            what:    two records with the same key
                            why:     requests retry on 5xx without Idempotency-Key
                            detection: idempotency lookup; duplicate counter
                            recovery: dedupe by idempotency key; compensate if needed
                            prevent: Idempotency-Key header; check before retry; bounded retries with backoff + jitter
                            test:    fault-inject 5xx after commit; retry; assert one record
  FM-005 [MED, Uncommon]   Secret leaked via error message.
                            what:    log line / user-visible error contains the secret
                            why:     f"failed with token={token}" in the exception string
                            detection: secret-scanning alert; log audit
                            recovery: rotate the secret; scrub log storage
                            prevent: structural redaction at the producer; never interpolate secrets into messages
                            test:    fault-inject known-leaked marker; assert log line redacted
"""
```

### Example 6 -- refs/*.md Failure modes (deliverable audit)

```markdown
<!-- Failure modes (audit-trail, kept current on review):
     FM-001 [MED, Possible]  Stale claim.
                              what:    note references a BLOCKERS.md item since RESOLVED
                              why:     note's Last reviewed date is older than BLOCKERS.md's
                              detection: BLOCKERS.md Last reviewed > note's Last reviewed
                              recovery: re-review; cite the new state
                              prevent: <last-reviewed-against-blockers> stamp per PROJECT_RULES.md
                              test:    grep notes for blockers named in retired BLOCKERS.md entries
     FM-002 [MED, Possible]  Decision without ADR.
                              what:    paragraph says "we decided to..." with no ADR-NNN
                              why:     author skipped the documentation-and-adrs skill
                              detection: decision text without ADR/OMN link
                              recovery: file an ADR
                              prevent: every decision names an ADR or OMN link
                              test:    grep "we decided" across refs/*.md; assert each cites an ADR/OMN
     FM-003 [HIGH, Possible]  Footgun in a recipe.
                              what:    playbook says "re-run the fetch group ci" without a stop condition
                              why:     recipe omits the failure path of the failure path
                              detection: operator runs the recipe and gets the same failure
                              recovery: escalate; mark playbook as missing stop condition
                              prevent: every recipe names a stop / escalate condition
                              test:    fault-inject the fetch workflow itself failing; assert recipe escalates
-->
```

## Guidelines

1. **Every failure has a detection signal.** If you cannot say how the operator learns the failure occurred (log line, metric, exit code, errno, exception, invariant, alert), the failure is *implicit* — surface it as such, because implicit failures are the single most common source of "we never noticed until the customer did" incidents.
2. **Severity and probability are local.** A scale imported from a generic rubric is unfalsifiable; cite the source and define the scale in the same file that uses it.
3. **Recovery must be executable.** A recovery path needs commands, preconditions, expected output, verification, and a stop / escalate condition. "Contact support" is not recovery; it is escalation.
4. **Test the error path, not the happy path.** A test that proves the happy path is correct does not prove that timeout, interruption, malformed input, partial completion, dependency failure, permission failure, disk-full, or cancellation is handled. Fault-inject each documented mode.
5. **Preserve the native signal.** errno, exit code, exception type, HTTP status — these are the upstream contract. Map them to the project taxonomy, do not erase them. `exit 1` for everything is the worst-case error contract.
6. **Idempotency is a property of the operation, not the file.** A POST that times out after commit is a duplicate hazard; a PUT with `Idempotency-Key` is safe to retry. State which is which; if neither applies, declare `not_supported` and explain why a duplicate would be unsafe.
7. **Partial writes are a recovery failure mode, not a happy-path consideration.** `forbidden` (atomic via tmp + rename), `valid_and_marked` (commit with `partial: true`), `resumable` (commit and continue on next run) — pick one and document the implementation evidence.
8. **Secrets are a failure mode, not a logging policy.** A log line containing a secret is a CRITICAL recovery failure mode (rotate, scrub, escalate). Document the redaction-at-producer discipline as a failure mode, not as a footer.
9. **Blameless but precise.** Postmortems and failure-mode documents describe system conditions, information available at the time, and causal mechanisms — not incompetent people. The yubiOS convention (per PROJECT_RULES.md): blameless tone, but every claim cites evidence.
10. **Detectability is separate from severity.** A high-severity failure with poor detectability is the worst-case combination (silent catastrophic). Add detectability to the table when useful; do not let it hide high severity.
11. **Use the failure-mode table verbatim.** "What / Why / Effect / Detection / Recovery / Severity / Probability / Prevent / Test / Evidence_gap" — pick one schema and stick to it. New fields need a new skill, not a new column.
12. **Close the NSS-failure-modes Extend gap with one section per file.** The atomic cycle-14 patch for any file with an NSS-failure-modes gap is ONE `## Failure modes -- cycle 14` section, file-type-aware comment syntax, with at least one concrete row in the table. One section, one file, one cycle.

## Constraints

- **Self-contained.** This skill does not depend on negative-skill-space being loaded; it composes *with* NSS as a follow-up action (NSS proposes the gap, nss-failure-modes closes it).
- **No runtime.** This is a documentation skill. It does not inject failures or run fault-injection tests; it documents what those tests must cover.
- **Severity/probability is local.** Cite the source scale; define the scale in the file that uses it.
- **One section per file.** Do not stack multiple `## Failure modes -- cycle 14` blocks in one file; do not nest failure modes inside another section heading.
- **Channel names are fixed.** Boundary / Authorization / FS-IO / Process / Network / Dependency / Concurrency / Resource / Time / Configuration / State / Observability / Recovery / Security. A value that arrives via a novel channel needs a new skill, not a new channel name.
- **No silent failures.** If the failure mode is `silent` (no log, no metric, no exit code change), declare `evidence_gap` and document the missing signal explicitly.
- **Pair with `negative-skill-space`.** This skill is the Failure-modes-axis specialist; the parent NSS skill orchestrates the 12-axis sweep and the action taxonomy (Extend / Pair / Accept).

## Anti-patterns

- **"It exits 1 on error" as a failure-modes section.** A section that says the script fails loudly without naming which failures, which signals, which recovery, which severity, which probability is filler. Every failure mode names a specific row in the table.
- **Severity without probability.** "HIGH severity" without a probability estimate is unfalsifiable. Pair them; if the denominator is unknown, say "uncalibrated".
- **Generic "try/catch" as recovery.** A try/except that swallows the error and continues is a silent-failure anti-pattern, not a recovery. Recovery narrows the type, logs, and either re-raises or recovers intentionally.
- **Untested error paths.** A documented failure mode without a fault-injection test is a hypothesis, not a control. Add the test or mark `evidence_gap`.
- **`exit 1` for every failure.** A consumer that cannot tell validation errors from transient failures from internal defects cannot route the failure to the right recovery path. Use sysexits.h or document the deviation.
- **Postmortem tone as failure-modes tone.** "X failed because Y was incompetent" is blame. "X failed because condition A was true at decision time, given information I, signal S was absent" is blameless. The yubiOS convention is the second.
- **No severity-probability pair.** A failure mode with only severity, or only probability, is half a table. Always pair them.
- **Footgun-as-feature.** "The dangerous behavior is the default because nobody changed it" is a failure mode with severity CRITICAL, probability Likely, and no test. Pick: prevent (default-deny), detect (alert), or recover (compensate). All three are stronger than documentation.
- **A Failure modes section that does not name the file's own failures.** A cycle-14 patch that adds `## Failure modes -- cycle 14` to `Containerfile` but does not list the actual build failure modes is a placeholder patch and counts as a NO verdict, not a YES.
- **TOCTOU without a fix.** "We check the path then we open it" is CWE-367. The fix is atomic open/create, handles, locks, or transactional conditional operations; without the fix, the failure mode is `not_handled`.

## Red flags

| Observation | What it means |
|---|---|
| `## Failure modes -- cycle 14` section lists zero concrete rows | the section is a placeholder |
| A failure mode with severity but no probability (or vice versa) | half a table; half a control |
| A failure mode without a detection signal | the failure is silent — recover via test coverage, not documentation |
| A failure mode with no test entry | the failure is hypothesized, not controlled |
| `try: ... except: pass` somewhere in the file | silent failure; FM-NNN with severity CRITICAL is the only honest read |
| `exit 1` for every failure | sysexits.h not used; consumer cannot route |
| A documented failure with `evidence_gap: untested` | document the test plan; do not ship the hypothesis as a control |
| A `## Failure modes -- cycle 14` patch lands but the next NSS sweep still flags failure modes as the top gap | the patch did not close the gap |
| The Failure modes section is identical across 100+ files | templated, not inspected — likely wrong for at least one of them |
| TOCTOU in a security-sensitive path with no atomic primitive | CWE-367 not mitigated; FM with severity CRITICAL and `not_handled` is the honest read |

## Composition

| Skill | How it composes | Direction |
|---|---|---|
| `negative-skill-space` | NSS runs the 12-axis sweep and flags `failure_modes` as a candidate Extend gap; nss-failure-modes is the closure skill for that one axis. Pair the two in every cycle. | negative-skill-space -> nss-failure-modes |
| `nss-inputs` | The Inputs surface declares what the caller supplies; the Failure modes surface declares what can happen to those inputs (parse failure, missing input, wrong-version input). | nss-inputs -> nss-failure-modes |
| `nss-outputs` | The Outputs surface declares exit codes, log records, files, side effects; the Failure modes surface declares what those outputs look like when the operation fails (which exit code, which log line, which partial file). | nss-outputs -> nss-failure-modes |
| `nss-audience` | The audience (operator vs CI vs incident responder) determines which failure modes matter: CI cares about exit codes + structured logs; operators care about recovery commands + runbooks; incident responders care about blameless tone + tracked actions. | nss-audience -> nss-failure-modes |
| `nss-mode` | The Mode axis declares how the file is invoked (TTY vs non-TTY, dry-run vs apply, daemon vs one-shot); the Failure modes axis declares what fails under each mode (interactive prompt hanging in CI; `--dry-run` mutating state). | nss-mode -> nss-failure-modes |
| `curve-compass-skill` | Lens-format patches in cycle-14 use nss-failure-modes as the failure-modes-axis lens payload; the lens records the hypothesis + method + parameters + delta + verdict + score + caveat for the Failure modes section this skill defines. | nss-failure-modes -> curve-compass-skill |
| `curved-corpus-create` | The corpus the cycle-14 sweep operates over is the same `lens --corpus` JSON; the corpus's `failure_modes` column maps to this skill's fourteen-channel taxonomy. | nss-failure-modes <-> curved-corpus-create |
| `debugging-and-error-recovery` | The recovery column in the Failure modes table is the consumer of the debugging-and-error-recovery skill's runbook conventions. | debugging-and-error-recovery -> nss-failure-modes |
| `observability-and-instrumentation` | The detection column is the producer of the observability skill's log/metric/alert primitives. | nss-failure-modes -> observability-and-instrumentation |
| `security-and-hardening` | The security row (TOCTOU, secret leakage, privilege escalation) is the boundary the security skill owns; the failure-modes skill flags it but does not fix it. | nss-failure-modes <-> security-and-hardening |
| `audit-evidence-packaging` | The blameless-tone discipline and the evidence-cite-every-claim doctrine are shared between postmortems (failure-modes) and audit trails (audit-evidence). | nss-failure-modes <-> audit-evidence-packaging |
| `recursive-self-improvement` | When the same NSS-failure-modes Extend gap keeps reappearing after a cycle-14 patch, RSI's self-mode should re-isolate the editor before the next attempt — same-author bias on Failure modes sections is the most common cycle-14 failure mode. | recursive-self-improvement -> nss-failure-modes |

## Verification

For each cycle-14 patch that closes an NSS-failure-modes gap:

1. **The patch adds ONE `## Failure modes -- cycle 14` section** (or the file-type-aware equivalent: `# Failure modes` for Containerfile/Makefile, `# # Failure modes` for Python triple-quoted docstring, `# Failure modes` for shell `#` comments, `<!-- Failure modes -->` HTML comment for `.md` if a section is not appropriate, `<!-- Failure modes (workflow_call inputs:) -->` for GitHub Actions YAML).
2. **The section names at least one concrete row** in the failure-mode table (id, what, why, detection, recovery, severity, probability, prevent, test, evidence_gap). A placeholder section with zero concrete rows counts as a NO verdict.
3. **Each row pairs severity with probability.** Severity without probability (or vice versa) is half a table; counts as a PARTIAL verdict at best.
4. **Each row has a detection signal.** "The error will be visible" is not a detection signal; a log line, metric, exit code, errno, exception, or invariant is.
5. **Each row has a recovery path.** "Contact support" is not a recovery path; concrete commands, preconditions, and a stop / escalate condition are.
6. **Each High/Critical row has a test entry.** A High/Critical failure mode with no test is a hypothesis, not a control; mark `evidence_gap: untested` explicitly.
7. **TOCTOU is flagged and atomic primitives are named.** A security-sensitive path that checks-then-opens without an atomic primitive is CWE-367 with severity CRITICAL and `not_handled`.
8. **The next NSS sweep on the same file does NOT re-flag failure modes as the top Extend gap.** If it does, the patch did not close the gap and the cycle-14 lens is a NO verdict.

## Changelog

- **1.0.0** (2026-08-12) -- initial. Cycle-14 deep-research synthesis for the NSS Failure modes axis. Captures the fourteen-channel failure taxonomy (Boundary / Authorization / FS-IO / Process / Network / Dependency / Concurrency / Resource / Time / Configuration / State / Observability / Recovery / Security), the yubiOS-specific patterns for Containerfile (stale digest, secret leak, cache poisoning, non-idempotent RUN), mkosi.conf (incompatible format/arch, cache drift), systemd unit (ready before listen, restart storm, drop-in lex-order surprise), GitHub Actions (permissions scope, outer-vs-inner, input coercion), Python (subprocess stderr, silent except, path traversal, retry duplication, secret-in-error), and refs/*.md (stale claim, decision-without-ADR, footgun recipe), plus the severity-probability pairing discipline, the blameless-tone discipline (per Google SRE / Etsy Debriefing / Atlassian blameless postmortem / IEC 60812 FMEA / AIAG-VDA AP), the sysexits.h + errno + Win32 error catalog mapping, and the CWE-367 TOCTOU discipline. Every example and anti-pattern is grounded in the source-driven-development deep-research pass on Google SRE Postmortem Culture, Atlassian blameless postmortems, Etsy Debriefing Facilitation Guide, Jeli How to Facilitate a Blameless Postmortem, IEC 60812, AIAG-VDA 2019 FMEA, incident.io Investigations, FireHydrant Runbook Retrospectives, sysexits(3), errno(3), Win32 System Error Codes, Hillel Wayne on feature interactions, CWE-367, Julia Evans on bash exit codes.

## Maintainer

Sauna, wave 2 cycle 14. Built against the deep-research synthesis for the NSS Failure modes axis (PR #207 cycle-7 NSS gap-informed context), `negative-skill-space` SKILL.md, the `nss-inputs` / `nss-outputs` / `nss-audience` / `nss-mode` skills (cycle-9/10/8/11 closure examples), and the cycle-7 lens pool (`lenses.json` at root of `feat/rsi-compass-cycle7-nss-research-2026-08-12`).
