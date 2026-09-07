# ADR-001: Runtime and Development Infrastructure Posture for Foreman Kernel

## Status

**RATIFIED**

This record sits at authority tier 7 of the `foreman-kernel` charter's hierarchy
(§3, "generated projections, caches, and advisory documentation"). It amends no
locked decision, alters no parcel boundary, and grants no authorization. Where it
argues that something *should* become binding, it says so explicitly and stops;
converting any of that into a locked decision requires a scoped Gate 1 amendment
the developer ratifies, per the charter's own re-open procedure.

## Date

2026-08-31

## Goal

`foreman-kernel` (charter ratified 2026-08-31; R1–R13 re-ratified same day).

## Context

The question put to this record: what is the ideal infrastructure for Foreman
Kernel's scalability and performance, at a defensible cost — is local development
sufficient, should the available RTX 3500 Ada Generation Laptop GPU be brought
into the pipeline, or should compute move to an Azure VM or Azure Container Apps?

### What the workload actually is

Foreman Kernel is TypeScript on Node, SQLite in WAL mode, a versioned MCP surface
served from a Docker container, and thin lifecycle hooks in Claude Code. The
existing `plugins/foreman-line/` corpus is fifteen independent workspaces, each
verified by `tsx --test`, `tsc --noEmit`, and `biome check`. There is no dataset,
no serving tier, no concurrent user population, and no compute-bound stage
anywhere in Stages A–F.

"Scalability" therefore does not mean request throughput. It means **parcel
throughput**: how many builder and reviewer sessions can run concurrently without
colliding, and how quickly a verification chain returns a green or red result.
Measured against that definition, the bottlenecks rank:

1. Frontier reviewer latency and token cost — dominant by one to two orders of
   magnitude.
2. Verification-chain wall clock — per-package `npm install` across fifteen
   workspaces multiplied by every live worktree, cold `tsx` process starts, and
   Windows Defender scanning `node_modules` trees.
3. Worktree disk contention. The repository currently carries more than twenty
   registered worktrees under `D:/Repos/agent-skills-worktrees/`.
4. Actual CPU and GPU compute — negligible, and not on any critical path.

Items 1 through 3 are not improved by relocating to a virtual machine. Items 2
and 3 are made worse by it, because a cloud host adds a network round trip to
every file operation the developer's session performs.

### What the charter already constrains

Three ratified decisions materially narrow the option space before any
engineering preference is applied:

- **D20** claims first-release enforcement *only* for Claude Code on Windows 11
  with Docker Desktop and the tested plugin/launcher shape. The parcels that
  produce that claim — FK-P16, FK-P17, FK-P19 — must execute on that platform. A
  cloud host cannot generate evidence for a claim scoped to a platform it is not.
- **D15** admits no Jira, SCM, cloud, signing, Docker-socket, or other external
  credential into the container, and §7 excludes external mutation entirely. A
  hosted deployment reintroduces exactly the blast radius the charter spent a
  section removing.
- **FK-P15 and FK-P17** require proofs at a *real process boundary* — restart
  recovery, split-brain refusal, mediated-bypass probes. Docker Desktop
  containers plus host processes already satisfy that requirement locally.

## Decision

Adopt a three-tier posture. Provision nothing beyond tier 1 until a named trigger
in "Revisit triggers" below actually fires.

### Tier 0 — The developer workstation is the primary and the proving host

All of Waves 0 through 3, and the majority of Wave 4, execute on the Windows 11
laptop under Docker Desktop. This is not a cost compromise; under D20 it is the
only host whose evidence satisfies the goal exit criterion.

Performance work belongs here, and it is configuration rather than procurement:

- **Windows Defender exclusions** for `D:\Repos`, the worktree root, the package
  manager cache, and the Docker Desktop VHDX. Antivirus traversal of
  `node_modules` is commonly a 2–5× tax on exactly the operation the verification
  chain repeats most.
- **A shared content-addressed package store.** Fifteen workspaces multiplied by
  every live worktree is the single largest wall-clock cost in the chain. A
  hardlinking store (pnpm's `~/.pnpm-store`, or a shared `npm_config_cache`)
  removes most of it *without* introducing a shared monorepo build — the
  repository's "independent TypeScript workspace, not a shared monorepo" property
  is preserved, because deduplication happens in the store rather than in the
  build graph.
- **A dedicated worktree root**, so there is one path to exclude, one disk to
  watch, and one directory to prune. Several currently registered worktrees are
  marked prunable.
- **BuildKit cache mounts** in the FK-P7 and FK-P14 multi-stage images, so
  rebuilds during hook development are seconds rather than minutes.
- **`.wslconfig` CPU and memory ceilings**, so concurrent containers and multiple
  agent sessions do not starve one another.
- **SQLite state on a native Docker named volume.** Never a `-v D:\...` bind
  mount. See "Consequences" for why this is a correctness constraint rather than
  a performance preference.

### Tier 1 — GitHub Actions for independent verification and clean-room proof

The repository already carries `.github/workflows/test-plugin-install.yml`. Three
categories of work belong there and nowhere else:

- **FK-P18 CI backstops.** The charter requires CI green *before* enforcement
  promotion, including a negative control that deliberately bypasses the hook and
  must fail CI. A backstop executing on the same machine as the mechanism it
  backstops is not independent. Host separation is the property being purchased.
- **Clean-room proofs (FK-P5, FK-P8, FK-P15, FK-P21).** "Clean room" means an
  environment without the developer's caches, installs, and ambient state. A
  runner pulling a pinned image digest is the cheapest credible clean room
  available, and it emits a durable public log URL that FK-P21's evidence
  manifest can bind alongside the source SHA and image digests.
- **FK-P20's native-Linux capability probe.** D20 declines any native-Linux-host
  claim without a separate real process-boundary run; an `ubuntu-latest` job is
  that run.

Publish images to GHCR so image digests referenced by the evidence manifest
resolve from an addressable registry rather than a local daemon.

### Tier 2 — Azure, deferred

No Azure resource is provisioned for the first release. The alternatives section
records why, and "Revisit triggers" records what would change the answer.

### The GPU: a cheap-tier and retrieval adjunct, never a verification role

The RTX 3500 Ada (12 GB VRAM, laptop thermal envelope, contending with the
developer's own session for system memory) has two defensible jobs:

1. **Cheap-tier builder and first-attempt `build-fix-loop`.** A 14B-class coding
   model at Q4_K_M occupies roughly 9 GB and leaves usable context headroom.
   Wired as a `local` tier in `routing-policy.yaml` for the `boilerplate` class,
   escalating local → small hosted → mid-tier on failure. Because D6 already
   lands every routing decision in a receipt, this yields a measured
   local-versus-hosted success rate rather than an impression. Expected savings
   are modest, since it displaces already-cheap tokens; its real differentiators
   are offline operation and data locality, not speed. The repository's existing
   Cerebras shadow route remains the better lever for cheap-tier *throughput*.
2. **Embeddings and reranking for corpus sweeps.** This is the stronger fit. D11
   gates every rule retirement on the existing corpus being swept, and lesson #36
   requires a one-time enumeration sweep whenever a rule invalidates existing
   instances. Both are currently manual. A local embedding and reranking pair
   over `docs/`, `specs/done/`, and the lessons ledger, indexed into
   `sqlite-vec`, gives the coordinator a real retrieval instrument and reuses the
   storage substrate FK-P9 already commits to.

One boundary is absolute: **no locally hosted model occupies any verification,
adversarial-review, or hook-decision role.** D4 forbids self-graded and
under-powered verification; the charter's own framing — a verifier weaker than
its builders is theater — applies directly. D12 additionally requires hooks to be
deterministic adapters, which a language model in a `PreToolUse` path is not.
The vector index stays outside the kernel container: it is coordinator tooling,
and adding extensions to the image would widen the D15 surface for no gain.

## Alternatives Considered

### Azure Container Apps hosting the kernel

- Pros: scale-to-zero, near-zero idle cost, managed TLS and ingress, a plausible
  story for later multi-developer use.
- Cons, in order of severity:
  - **SQLite WAL cannot run on ACA's persistent storage.** ACA mounts Azure
    Files over SMB, whose locking semantics do not support WAL. The remedy would
    be migrating to Postgres, which contradicts D14's single-writer lease,
    optimistic-revision, and local-durability design outright.
  - The control surface is deliberately a local socket plus a host-local
    capability bound to a mechanically distinct principal (D3, D15). Publishing
    it over network ingress converts a local admission boundary into an internet
    authorization problem the charter never scoped and §7 excludes.
  - Scale-to-zero cold starts are seconds. See the latency budget below.
- **Rejected for the stateful kernel, permanently — not merely for this release.**
  ACA remains a good future home for the *stateless* read-only verifier
  (FK-P6/FK-P7): no state volume, no credentials, scale-to-zero, and a genuine
  organizational-rollout story once Wave 2 graduates.

### An Azure VM as the primary development and proving host

- Pros: consistent environment, survives laptop closure, snapshot and restore.
- Cons: cannot produce D20 evidence, since the ratified claim is scoped to
  Windows 11 with Docker Desktop and the tested launcher shape. Adds network
  latency to every developer file operation. Introduces a credentialed host into
  a design that spent §7 excluding external authority. Costs roughly $30–40 per
  month for a Linux B-series, and materially more for a Windows host capable of
  nested virtualization.
- **Rejected.** It purchases convenience at the cost of the goal's central claim.

### A self-hosted Windows runner for automated enforcement proof

- Pros: would let FK-P17 and FK-P19 evidence regenerate on every push rather than
  by hand.
- Cons: GitHub-hosted Windows runners do not support Docker Desktop or nested
  virtualization well enough for this matrix, so the runner must be either the
  developer's own machine — which reintroduces the independence problem Tier 1
  exists to solve — or an Azure Windows VM with nested virtualization at roughly
  $140 per month.
- **Deferred**, not rejected. This becomes the correct answer if manual
  regeneration of enforcement evidence becomes the bottleneck. It is not today.

### Local-only, with no CI tier at all

- Pros: simplest, cheapest, zero configuration.
- Cons: FK-P18 explicitly requires a backstop that catches an intentionally
  introduced out-of-scope mutation *and* missing enrollment that bypass the hook.
  A backstop on the bypassed host is not a backstop. Clean-room proofs executed
  on the developer's machine are not clean-room proofs.
- **Rejected.** Host independence is the property under test.

### The GPU as an adversarial reviewer or hook decision engine

- Pros: zero marginal token cost, full data locality.
- Cons: violates D4 directly; a 12 GB local model is weaker than the Sonnet-class
  builders it would review. Violates D12, which makes hooks adapters over
  deterministic predicates. Introduces nondeterminism and hundreds of
  milliseconds into a path executed on every governed tool call.
- **Rejected without qualification.**

## Consequences

### A hook latency budget becomes a first-class requirement

D8 places an `authorizeAction` call in the `PreToolUse` path of every governed
mutation. That imposes a latency budget that no parcel currently states. The
recommendation of this record — advisory, and a candidate for a future scoped
amendment rather than binding text — is a **p99 target under 50 ms**, with two
consequences that follow mechanically:

- **`docker run` per invocation is disqualified.** Container cold start is
  roughly 200–800 ms. The kernel must be a long-lived container reached over a
  local socket or named pipe, with the FK-P16 adapter as a thin persistent
  client.
- **Any network hop is disqualified**, which is an argument against remote
  hosting that stands independently of the D20 and D15 arguments above.

The failure mode this protects against is specific and foreseeable: hooks that
make sessions feel sluggish get disabled, and D8's entire enforcement claim rests
on adapters that are actually loaded. A latency regression is therefore an
enforcement regression, and FK-P17's harness is the natural place to measure it.

If this is to bind rather than advise, FK-P1's decision-contract parcel is the
correct owner, since it already defines the decision envelope the adapter
consumes.

### CI host independence is load-bearing, not incidental

FK-P18's value derives entirely from executing somewhere the hook does not. This
record recommends that the parcel's spec state that property explicitly in its
acceptance criteria, so that a future convenience change — moving CI to a
self-hosted runner on the developer's machine — cannot silently void the
backstop while all checks remain green.

### SQLite placement is a correctness constraint

WAL mode over SMB, NFS, Azure Files, or a Windows `DrvFs`/9p bind mount has
unreliable locking. FK-P9 and FK-P14 should treat "native Docker named volume"
as a contract rather than a deployment preference, and FK-P15's crash and
concurrency tests should be understood as valid only for that placement.

### Cost is dominated by model spend, not hosting

Tier 0 plus Tier 1 costs approximately nothing: GitHub Actions on the existing
workflow allocation, GHCR for image storage, and electricity.

Against that, a single frontier adversarial review of an architecture/risk parcel
runs single-digit to low-double-digit dollars. This goal carries twenty-two
parcels, most classified architecture/risk, most requiring two independent
reviews under the lesson-#12 rule, before any rework. **Model spend exceeds
plausible infrastructure spend by roughly one to two orders of magnitude.**

The operative consequence: cost-reduction effort belongs in routing policy
tiering and context discipline — the D6 and D7 levers — and not in hosting
selection. Optimizing the latter is measurable effort against an immaterial line
item.

### Accepted limitations

- The proving host is a single laptop. Its loss stalls the goal until the
  environment is rebuilt; the mitigation is that everything except Defender
  exclusions and Docker Desktop state is reproducible from the repository.
- Enforcement evidence is regenerated manually rather than on every push, until
  and unless the self-hosted-runner trigger fires.
- Local GPU inference contends with Docker Desktop and concurrent agent sessions
  for system memory. This should be measured before the `local` routing tier is
  enabled, not assumed.

## Revisit triggers

Provision Azure when, and only when, one of these is true:

1. The coordinator's long-running loop needs to survive the laptop being closed —
   a Linux B-series host at roughly $30–40 per month.
2. Manual regeneration of Windows enforcement evidence becomes the throughput
   bottleneck — a Windows host with nested virtualization, roughly $140 per
   month.
3. More than one developer needs the read-only verifier concurrently — at which
   point ACA hosting the *stateless* FK-P6/FK-P7 surface is the correct shape,
   and this record should be superseded rather than amended.

Until one of these fires, provisioning is speculative spend against a bottleneck
that has not appeared.

## References

- `plugins/foreman-line/docs/goals/foreman-kernel/charter.md` — D3, D4, D6, D7,
  D8, D11, D12, D14, D15, D19, D20; §7 out-of-scope; §12 serialization points.
- `plugins/foreman-line/docs/FOREMAN-LINE-PLAN.md` §5, §5a — routing policy and
  skill injection.
- `plugins/foreman-line/docs/COORDINATOR-PATTERN.md` — dispatch table, lesson #12
  (two independent reviews for architecture/risk), lesson #36 (corpus sweep).
- `.github/workflows/test-plugin-install.yml` — the existing CI surface Tier 1
  extends.

**Ratification record:** Ratified as written by Clint Morgan - 09/01/2026