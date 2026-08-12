---
name: nss-mode
description: "Eleventh NSS axis (after Audience, Inputs, Outputs, Mode, Assumption set, Adjacent problems, Failure modes, Lifecycle, Composition, Knowledge sources, Calibration) -- the Mode axis scores a file's breadth and correctness of execution modes (interactive vs non-interactive CLI, dry-run, daemonization, one-shot, idempotency, exit semantics, TTY handling, batch vs streaming, foreground vs background). Used as the gap-finder for RSI cycle 11 on PR #207. Use when the request mentions NSS mode axis, interactive vs batch, dry-run flag, daemon lifecycle, one-shot vs service, idempotency check, exit-on-error semantics, TTY detection, foreground vs background, batch vs streaming, --yes/--no-input, --dry-run/--check, set -e errexit, systemd Type=notify/Type=oneshot/Type=forking, NO_COLOR, isatty, prompt suppression, or cycle-11 NSS-mode gap-finder. NOT for primitive coverage (use negative-skill-space), NOT for lens-format RSI patches (use curve-compass-skill), and NOT for corpus creation (use curved-corpus-create)."
---

# nss-mode

The eleventh of the twelve NSS axes (per `negative-skill-space`). The **Mode**
axis scores a file's coverage of execution modes -- not the number of flags
mentioned, but the breadth AND correctness of the mode contracts documented
or evidenced in the file.

The cycle-11 NSS-mode sweep applies this rubric to 40 files in the yubiOS
corpus, where each file gets ONE mode-aware section added per lens-format
patch (`## Mode -- cycle 11`).

## When to use

- When a skill, script, workflow, or doc fails to specify its mode contract
  and downstream consumers (CI, agents, humans) cannot tell whether to
  invoke it interactively, in batch, as a dry run, or as a daemon.
- When scoring or comparing files along the Mode axis for an NSS sweep.
- When the request asks "is this script safe to run in CI?" or
  "does this dry-run flag actually do anything?" -- the answer lives
  in the Mode axis.
- When designing a new skill or refactoring an existing one to cover
  more execution modes without breaking the existing ones.

## When NOT to use

- You want primitive coverage (9-primitive binarization) -- use
  `negative-skill-space` directly.
- You want lens-format RSI patches specifically -- use `curve-compass-skill`
  (the lens-format patch generator).
- You want to generate a binary corpus -- use `curved-corpus-create`.
- You want to measure an existing corpus's curve -- use
  `hyperspherical-harmonic-curve`.

## Coverage rubric (0-5 levels)

Treat Mode axis coverage as breadth AND correctness. Score by the highest
level whose behavioral contract is actually evidenced.

| Level | Label | What the file demonstrates |
|---|---|---|
| 0 | Absent | No meaningful treatment; assumes one invocation context. |
| 1 | Nominal | Mentions one or two mode terms (`--dry-run`, `--force`, `-n`) without defining behavior, precedence, output, or exit status. |
| 2 | Basic | Covers at least two contrasting modes (interactive vs non-interactive, or one-shot vs service) with usable invocation examples. Handles the happy path but not environment differences. |
| 3 | Operational | Covers several orthogonal contrasts with observable contracts: side effects, stdin/TTY behavior, stdout/stderr, exit codes, repeatability, foreground/background lifecycle. A CI/pipeline can invoke reliably. |
| 4 | Production-grade | Covers nearly the full matrix below, including negative cases, flag precedence, `TERM=dumb`, failure propagation, service readiness, tests for both TTY and non-TTY execution. Modes compose predictably. |
| 5 | Exemplary | Compact reusable mode model with explicit state transitions, representative examples, anti-patterns, machine-readable output, tests for combinations like `--dry-run + --no-input`, piped input + `--yes`, and service startup failure. |

## Scoring dimensions (0-2 each, max 20)

1. **Interaction (interactive vs non-interactive)** -- prompts only fire when
   stdin is a TTY; otherwise refuse with actionable alternative rather than hang.
2. **TTY / terminal environment** -- `isatty(stdin/stdout/stderr)`, piped vs
   terminal output, progress/color changes, `TERM=dumb` / `NO_COLOR` honored.
3. **Confirmation / input bypass** -- `--yes` / `-y` / `--no-input` / `--force`;
   distinguishes "skip prompts" from "override safety checks".
4. **Preview / check mode** -- `--dry-run`, `-n`, `--check`; preview must be
   side-effect-free and specific about intended changes.
5. **Mutation safety and idempotency** -- re-running converges; already-satisfied
   operations return success; `--force` handles override, not non-idempotency.
6. **Failure semantics** -- exit 0 = success; failures non-zero; "differences
   found" codes not confused with errors.
7. **Shell error propagation** -- `set -e`/`errexit`, `set -o pipefail`;
   explicit status checks where needed; documented exceptions.
8. **Execution duration** -- one-shot/batch vs long-running service; timeout,
   cancellation, cleanup, retry, checkpoint where relevant.
9. **Concurrency and output flow** -- batch vs streaming; bounded vs unbounded
   input/output; buffering/backpressure; progress on stderr, data on stdout.
10. **Process ownership / lifecycle** -- foreground vs background; signal
    handling; PID ownership; logs; readiness; restart; shutdown. For systemd:
    `Type=oneshot`, `Type=notify`, `Type=forking`, `Type=simple`.

**Convert score to label:** 0-3 Narrow | 4-7 Emerging | 8-12 Useful |
13-16 Strong | 17-20 Comprehensive.

## Important distinctions

- `--check` is not automatically `--dry-run`. A check may validate drift
  without constructing the exact execution plan.
- `--force` is not idempotency. Force may bypass confirmation or overwrite
  conflicts; safe reruns require convergence or explicit conflict policy.
- Background (`&`) is not daemonization. A daemon has ownership, detachment
  or supervisor ownership, readiness, signals, logs, restart semantics.
- Fork-and-detach vs systemd: traditional daemons fork, call `setsid()`,
  often fork again; modern systemd services should generally remain
  foreground and notify systemd via `Type=notify`.
- `set -e` is not complete error handling. It has exceptions in conditional
  lists and pipelines; `pipefail` and explicit checks may still be needed.
- Batch vs streaming: "process input" has no coverage until completion
  boundaries, partial failure, buffering, and incremental emission are
  addressed.

## Lens format (cycle-11 patch generator)

Each cycle-11 patch is one lens per file:

```
L<N> -- <short-name>
  hypothesis:  <testable claim about this file's mode contract>
  method:      <how to verify>
  parameters:  {axis: mode, dim_scores: {interaction:2, ...}, total: X/20}
  delta:       {mode_gaps_before, mode_gaps_after, dim_closed}
  verdict:     YES | PARTIAL | NO
  score:       0-50
  caveat:      <what was NOT measured>
```

The patch is the lens. No `## Mode -- cycle 11` section without
hypothesis + method + parameters + delta + verdict + score + caveat.

## Examples

### Example 1 -- scoring a shell script

A script that does `read -p "Continue? [y/N] " ans` and nothing else:

- interaction: 0 (prompt without TTY check)
- tty_terminal: 0
- confirmation: 0 (no `--yes` / `--force`)
- preview_check: 0
- idempotency_force: 0
- failure_exit: 1 (has `set -e` maybe)
- shell_errexit_pipefail: 0
- duration: 1 (one-shot)
- batch_streaming: 0
- lifecycle_daemon: 0
- **Total: 2/20 -- Narrow.** The interactive prompt is a liability under
  CI / pipe / agent invocation. Mode coverage is absent; needs a TTY check
  and `--yes`/`--force` flags minimum.

### Example 2 -- scoring a systemd unit

A `Type=simple` service that runs a foreground process:

- interaction: 1 (service entry, no stdin)
- tty_terminal: 2 (TTY irrelevant; logs to journald)
- confirmation: 0
- preview_check: 0
- idempotency_force: 1 (systemd restart policy)
- failure_exit: 2 (Restart=on-failure)
- shell_errexit_pipefail: 0 (no shell)
- duration: 2 (long-running)
- batch_streaming: 1 (streaming by design)
- lifecycle_daemon: 2 (systemd owns lifecycle)
- **Total: 9/20 -- Useful.** Ready signal (`Type=notify`) and timeout
  (`TimeoutStartSec`) would push to Strong.

### Example 3 -- a CI workflow

A GitHub Actions workflow with `if: github.event_name == 'push'` and no
`workflow_dispatch`:

- interaction: 2 (CI only)
- tty_terminal: 2 (no TTY; logs are machine-readable)
- confirmation: 0
- preview_check: 0
- idempotency_force: 1 (reruns work)
- failure_exit: 2 (step-level exit codes)
- shell_errexit_pipefail: 1 (`bash --noprofile --norc -eo pipefail` if set)
- duration: 1 (one-shot per event)
- batch_streaming: 1 (batch per run)
- lifecycle_daemon: 0
- **Total: 9/20 -- Useful.** Adding `workflow_dispatch` for manual trigger
  and `concurrency:` group cancellation would push to Strong.

## Guidelines

1. **Score behavior, not keywords.** A token like `--dry-run` earns at most
   partial credit; full credit requires side-effect-freeness, a meaningful
   plan, preserved output shape, and a defined exit status.
2. **Treat `--check` and `--dry-run` separately.** They have different
   semantic commitments.
3. **Treat `--force` and idempotency separately.** Force bypasses; idempotency
   converges.
4. **Background (`&`) is not daemonization.** Score daemonization only when
   ownership, readiness, signals, logs, and restart are documented.
5. **`set -e` is not complete error handling.** Document exceptions and
   `pipefail`.
6. **Systemd `Type=notify` > `Type=forking`** for new services. Prefer
   foreground + readiness signal over fork-and-detach.
7. **`NO_COLOR=1` and `TERM=dumb`** must be respected. Color must not be
   emitted to non-TTY stdout.
8. **Mode composition is predictable.** `--dry-run + --yes` and piped input
   + `--no-input` must behave as documented.
9. **Cross-context invariance** is the quality signal. Same skill is safe
   in TTY, pipe, `TERM=dumb`, CI without stdin, dry run, retry, service
   supervisor.
10. **Lens-format patches only (cycle-11).** Each file patch is a lens with
    hypothesis + method + parameters + delta + verdict + score + caveat.
    No templated `## Mode` sections.

## Constraints

- LOCAL ONLY for the rubric; no network for measurement.
- The rubric is binary per-dimension (0/1/2). No fractional scores.
- Lens output (cycle-11) carries its own experimental design; the patch is
  the lens, not prose about the file.
- Self-containment: this SKILL.md embeds the full rubric and the
  distinctions; no external doc fetch required.

## Anti-patterns

- Awarding points for keywords alone ("mentions `--dry-run`" = full credit).
- Confusing `--check` with `--dry-run`.
- Confusing `--force` with idempotency.
- Confusing `&` (background) with daemonization.
- Treating `set -e` as sufficient error handling.
- Reading "supports daemon mode" as full lifecycle coverage without
  foreground behavior, detachment or supervisor ownership, readiness,
  signals, logs, restart.
- Shipping templated `## Mode -- cycle 11` sections without lens format.

## Red flags

| Observation | What it means |
|---|---|
| `--dry-run` mutates state | the dry-run claim is false |
| `&` at end of `ExecStart` | not a real daemon, missing systemd lifecycle |
| No `Type=notify` / `READY=1` for service with readiness requirement | service starts accepting traffic before ready |
| `--force` resets state to a default | force is hiding non-idempotency |
| Color emitted when `NO_COLOR=1` | TTY handling broken |
| `set -e` without `set -o pipefail` | upstream pipeline failures hidden |
| Interactive prompt without `isatty(stdin)` | script hangs in CI |
| Lens has `delta: {}` or `score: 0` | the experiment did not run; lens is aspirational |
| 40+ lenses all verdict=YES score=50 | experiment is degenerate |

## Composition

| Skill / channel | How it composes | Direction |
|---|---|---|
| `negative-skill-space` | provides the 12-axis sweep framework; this skill owns axis #4 (Mode). NSS sweeps this axis on every cycle that asks for mode-gap finding. | negative-skill-space -> nss-mode |
| `curve-compass-skill` | provides the lens-format patch generator and the Sigma ladder; this skill emits one lens per file in the same JSON shape. | curve-compass-skill <-> nss-mode |
| `github-actions` | defines what `--check` / `workflow_dispatch` / `concurrency:` mean in yubiOS CI context; nss-mode scores workflows against these. | nss-mode -> github-actions |
| `systemd-hardening` | defines `Type=notify` / `Type=oneshot` / `Type=simple` usage; nss-mode scores units against these. | nss-mode -> systemd-hardening |
| `recursive-self-improvement` | the closing loop. nss-mode proposes gaps; RSI applies the per-file patch. | nss-mode -> recursive-self-improvement |
| `context-isolation` | when running the cycle-11 sweep, run each file's lens in a fresh-context subagent so author bias from prior cycles doesn't re-anchor. | context-isolation -> nss-mode |

## Self-containment

Reads: nothing required (rubric + distinctions + lens schema embedded).
Writes: lens-format JSON per file. Depends on: stdlib only.

## Verification

```
python3.12 -c "import re; s=open('skills/github-yubios-KS9n5GAT/nss-mode/SKILL.md').read(); assert re.match(r'^---\n.*name: nss-mode\n.*description: .*', s, re.S); print('OK')"
```

Plus the lens output schema: lens, file, hypothesis, method, parameters,
delta, verdict, score, caveat all present; verdict in {YES, PARTIAL, NO};
score 0-50; parameters.axis == "mode".

## Changelog

- **1.0.0** (2026-08-12) -- initial. Built for RSI cycle 11 on PR #207.
  Establishes the Mode axis rubric, the 0-5 level scale, the 10-dimension
  0-20 score, the lens-format patch format, and the cross-context invariance
  quality signal.

## Maintainer

Sauna, wave 2. Built against `negative-skill-space` SKILL.md (the 12-axis
sweep framework), `curve-compass-skill` v1.1.0 (lens-format patch generator),
the deepresearch output on mode-axis coverage (CLI Guidelines / systemd /
daemon / Bash / NO_COLOR / The CLI Spec), and the cycle-7 PR #207 baseline
(391 atomic per-file NSS patches already on the branch).
