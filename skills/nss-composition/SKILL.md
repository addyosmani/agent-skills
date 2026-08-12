---
name: nss-composition
description: "Ninth NSS axis (after Audience, Inputs, Outputs, Mode, Assumption set, Adjacent problems, Failure modes, Lifecycle) -- Composition scores a file coverage of HOW IT COMPOSES WITH OTHERS: dependencies, callers and callees, integration points, sibling files, module boundaries, and static-import vs runtime-call vs config-discovered edge distinction. Per the 12-axis negative-skill-space sweep, every file declares its in-graph and out-graph surface at the right abstraction level. Used as the gap-finder for RSI cycle 16 on PR #207. Use when the request mentions NSS composition axis, caller/callee analysis, dependency graph, module boundary, integration diagram, C4 composition view, arc42 Building Block View, dependency-cruiser, modular monolith, package cohesion/coupling, REP/CCP/CRP/ADP/SDP/SAP, fan-in/fan-out, composition root, integration scenario, or cycle-16 NSS-composition gap-finder. NOT for adjacency (use nss-adjacent-problems), assumptions (use nss-assumption-set), or lifecycle (use nss-lifecycle)."
---

# nss-composition

The **ninth** of the twelve NSS axes (per `negative-skill-space`). The **Composition** axis scores a file's coverage of *how it composes with others* -- the structural relationships, callers and callees, integration points, module boundaries, and runtime edges that determine what changes if you modify this file, who calls it, which boundary you will cross, and which integration scenario explains an edge. Not the count of links, but the breadth AND correctness of the composition map documented or evidenced in the file.

Composition is not a diagram style; it is a family of related structures, each with a different edge meaning. A static-import edge is not the same as a runtime call edge; a documented dependency is not the same as an executed one; an architectural rule "no cycle, no deep-import across boundaries" is not the same as an observed edge. The axis asks: **does this file let a reader answer "what changes if I modify this?", "who calls it?", "which boundary will I cross?", "which integration or runtime scenario explains this edge?"** -- and what evidence backs each answer.

The cycle-16 NSS-composition sweep applies this rubric to ~40 files in the yubiOS corpus, where each file gets ONE composition-aware section added per lens-format patch (`## Composition -- cycle 16`).

## When to use

- When a file declares a service, endpoint, workflow, or module without enumerating its callers or consumers.
- When a skill, ADR, or research note proposes a new composition without enumerating the integration points it crosses.
- When scoring or comparing files along the Composition axis for an NSS sweep.
- When designing a new skill, ADR, or refactor that needs to position itself in the existing dependency graph without re-deriving it from scratch.
- When a CI workflow or build script says "this runs in CI" but never names the workflow that dispatches it, the runners that execute it, or the secrets it consumes.
- When a systemd unit, Containerfile, or mkosi.conf says "this is enabled at boot" but never names the units that `Wants=`, `Requires=`, or `After=` it (and the ones it does the same to).
- When a shell script's `set -e` is the only failure surface and the script's callees (jq, curl, mount, bootc) are never enumerated.
- When a research note (`refs/*.md`) recommends an approach without listing the yubiOS files that would need to change.

## When NOT to use

- You want primitive coverage (9-primitive binarization) -- use `negative-skill-space` directly.
- You want lens-format RSI patches specifically -- use `curve-compass-skill` (the lens-format patch generator).
- You want to generate a binary corpus -- use `curved-corpus-create`.
- You want to enumerate related problems and alternative solutions -- use `nss-adjacent-problems`.
- You want to enumerate explicit prerequisites and assumptions -- use `nss-assumption-set`.
- You want to enumerate failure modes and anti-patterns -- use `negative-skill-space` directly.

## Coverage rubric (0-5 levels)

Treat Composition axis coverage as breadth AND correctness. Score by the highest level whose structural relationship map is actually evidenced.

| Level | Label | What the file demonstrates |
|---|---|---|
| 0 | Absent | No callers, callees, dependencies, integration points, or module boundaries named; the file exists as an island. |
| 1 | Nominal | Mentions one or two names (a parent workflow, a sibling skill) without defining edge type, direction, ownership, or rationale. |
| 2 | Basic | Covers at least two composition directions (callers OR callees OR integrations) with usable names and entry points. Handles the happy path but not the static-vs-runtime distinction. |
| 3 | Operational | Covers the full composition surface: callers, callees, integration points, sibling files, module boundaries, AND distinguishes static-import from runtime-call from configuration-discovered edges. A reader can answer "what changes if I modify this?". |
| 4 | Production-grade | Covers the full composition surface, the static-vs-runtime-vs-config edge distinction, the allowed/forbidden dependency rules, the integration scenarios (happy path + failure), AND links each composition fact to a source path or build/CI artifact. ADR-driven composition decisions are explicit. |
| 5 | Exemplary | Compact reusable composition model with explicit node-and-edge vocabulary (contains / imports / calls / publishes / subscribes / reads / writes / deploys-with / depends-on), a tool-derived dependency report, machine-enforceable dependency rules (dependency-cruiser-style), per-integration scenario table, AND CI checks that surface composition drift. |

## Scoring dimensions (0-2 each, max 20)

1. **Callers / consumers named** -- the file names the agents, scripts, workflows, services, or humans that invoke it. Score 2 if 3+ callers are named with entry point and contract.
2. **Callees / dependencies named** -- the file enumerates the modules, services, tools, libraries, or systems it invokes. Score 2 if 3+ callees are named with edge type and rationale.
3. **Integration points enumerated** -- external system boundaries (HTTP endpoints, IPC, FIFO, socket, event bus, file mount, DB, queue, signal) are listed with protocol, payload, timeout, retry. Score 2 if every external integration has all six.
4. **Sibling files identified** -- the file names its parallel artifacts (the other files in the same group/role that share its responsibility) so a reader can find them. Score 2 if siblings are named with the shared-responsibility rationale.
5. **Module boundary declared** -- the file states what is in its public API vs private internals, and what is allowed/forbidden to depend on it. Score 2 if the boundary has explicit allow/deny rules (e.g. dependency-cruiser `.dependency-cruiser.json`, Rego policy, mkosi drop-in lex-sort rule).
6. **Static-vs-runtime-vs-config edge distinction** -- the file distinguishes a static import from a runtime call from a configuration-discovered edge. Score 2 if at least one edge is explicitly labeled with its discovery mechanism.
7. **Ownership and state boundary** -- the file names which module/team owns the data, the configuration, the secrets, and the lifecycle it touches. Score 2 if ownership is explicit for both code and runtime state.
8. **Cohesion / coupling signals** -- the file surfaces its fan-in (who depends on it), fan-out (what it depends on), instability, and acyclic-property evidence. Score 2 if at least two of these are quantified or sourced.
9. **Cross-context invariance** -- the composition map holds across the relevant contexts (operator / developer / CI / architect). Score 2 if all four contexts see the same map.
10. **Source-link / evidence integrity** -- every composition claim is backed by a source path, build artifact, ADR, or test reference. Score 2 if a machine check is feasible.

**Convert score to label:** 0-3 Narrow | 4-7 Emerging | 8-12 Useful | 13-16 Strong | 17-20 Comprehensive.

## Important distinctions

- **Static import is not runtime call.** A `import` or `require` edge is a static (compile-time) edge; a `curl`, `exec`, `os.system`, or message-bus publish is a runtime edge. Kythe explicitly notes that resolving a complete call graph can over-approximate possible calls (dynamic dispatch, reflection, dependency injection, callbacks, generated code). Drawing them identically collapses two different composition surfaces into one.
- **Documented dependency is not executed dependency.** A dependency declared in `package.json`, `requirements.txt`, `mkosi.conf`, or `Containerfile` is declared; whether it is actually exercised at runtime is a separate question. A `package.json` `dependencies` entry that the code does not import is a static-only edge.
- **Call graph is not dependency graph.** A caller/callee graph has functions/methods as nodes and call edges; a module/import graph has files/packages as nodes and import/use edges; a package graph has workspaces as nodes and package-dependency edges. Collapsing them creates ambiguity about what a "cycle" actually means.
- **Build-time integration is not runtime integration.** A `Containerfile` `RUN` line invokes a shell command at build time; the same command in a systemd unit invokes it at runtime. The composition surface and the failure modes are different.
- **Sibling file is not integration point.** A sibling file is a parallel artifact that shares a responsibility (e.g. the `nss-mode`, `nss-lifecycle`, and `nss-composition` skills are siblings); an integration point is a runtime or build-time boundary that crosses a process or trust domain (e.g. a script calling an HTTP API).
- **C4 level is not edge.** C4 (system context / container / component / code) is the abstraction hierarchy; an edge (contains / imports / calls / publishes / etc.) is the relationship. A diagram that mixes levels without a legend is unusable; an edge without a level is similarly ambiguous.
- **Composition is not dependency direction alone.** Two-way integration (mutual dependency) is a different composition shape than one-way composition; a cycle is a third shape. The composition map must say which.
- **Boundary is not absence of edges.** A module with no edges is unreachable; a module with one edge in and zero edges out is a leaf; a module with many edges in and one edge out is a hub. The shape conveys the role.
- **Configuration-discovered edge is not invisible edge.** A systemd `Wants=foo.service` reference is a configuration-discovered edge; a workflow `uses: ./.github/workflows/foo.yml` reference is also configuration-discovered. Static-import-only analysis misses these.

## Lens format (cycle-16 patch generator)

Each cycle-16 patch is one lens per file:

```
L<N> -- <short-name>
  hypothesis:  <testable claim about this file's composition surface>
  method:      <how to verify>
  parameters:  {axis: composition, dim_scores: {callers_named:1, ...}, total: X/20}
  delta:       {comp_gaps_before, comp_gaps_after, dim_closed, callers_count, callees_count, integrations_count, edges_typed_count}
  verdict:     YES | PARTIAL | NO
  score:       0-50
  caveat:      <what was NOT measured>
```

The patch is the lens. No `## Composition -- cycle 16` section without hypothesis + method + parameters + delta + verdict + score + caveat.

## Examples

### Example 1 -- scoring a Containerfile

A Containerfile that `FROM`s an image and adds packages but never says who builds it, what workflow invokes it, what units it enables, or what upstream images it replaces:

- callers_named: 0
- callees_named: 0 (no jq, curl, dnf are called; only a FROM is referenced)
- integrations: 0 (no integration points named)
- siblings: 0 (no parallel Containerfile.dev, Containerfile.uki mentioned)
- boundary: 0 (no public/private boundary; no allowed/forbidden deps)
- static_vs_runtime: 0 (FROM is a static reference, not labeled)
- ownership_state: 0
- cohesion_coupling: 0
- cross_context: 1 (the maintainer sees the choice; operator/developer/CI do not)
- source_link: 0
- **Total: 1/20 -- Narrow.** No composition map; the choice is opaque to every audience.

### Example 2 -- scoring a systemd unit

A `Type=simple` service that runs `/usr/bin/yubiOS-foo` without `Wants=` / `Requires=` / `After=` / `Before=`:

- callers_named: 0 (no workflow or preset references it)
- callees_named: 0 (the ExecStart binary is named, but its callees are not)
- integrations: 0 (no IPC, no socket, no signal handling)
- siblings: 0 (no mention of the sibling `yubiOS-bar.service`)
- boundary: 0
- static_vs_runtime: 1 (the binary is a static reference)
- ownership_state: 1 (systemd owns the lifecycle, but file-system ownership of state is unclear)
- cohesion_coupling: 0
- cross_context: 1 (operator sees the unit; developer/CI/architect do not)
- source_link: 2 (path is named)
- **Total: 5/20 -- Emerging.** Naming the `Wants=`, `After=`, and the units that this one `Requires=` would push this to Useful.

### Example 3 -- scoring a research note (`refs/*.md`)

A `refs/foo-bar-2026-08-04.md` note that states findings and recommends approach A but never lists the yubiOS files that would need to change:

- callers_named: 0 (no Linear issue or PR links to it)
- callees_named: 0 (no upstream papers or vendor docs cited with explicit edge)
- integrations: 0 (no Containerfile/mkosi/systemd changes enumerated)
- siblings: 0 (no other refs notes that share the topic)
- boundary: 0 (no "this is for X audience; not for Y")
- static_vs_runtime: 0
- ownership_state: 1 (a team is named in passing)
- cohesion_coupling: 0
- cross_context: 2 (cross-context holds for the maintainer/architect)
- source_link: 2 (commit hash + ADR link)
- **Total: 6/20 -- Emerging.** The note has a `## File impact` section listing the files that change and the unit/workflow/test that would be affected, and the score jumps to 12-14 (Useful).

### Example 4 -- scoring a shell script

A script that runs `set -e` then calls `curl | jq | mount` but never says which workflow dispatches it, which runner executes it, or which secrets it consumes:

- callers_named: 0
- callees_named: 1 (curl, jq, mount are visible but untyped)
- integrations: 0 (no contract, no timeout, no retry)
- siblings: 0 (no other scripts in the same group)
- boundary: 0
- static_vs_runtime: 1 (the binary paths are static)
- ownership_state: 0
- cohesion_coupling: 0
- cross_context: 1 (CI sees it; operator/developer/architect do not)
- source_link: 2 (path is named)
- **Total: 5/20 -- Emerging.** Naming the dispatching workflow + the runner label + the secrets would push this to Useful.

## File-type-aware composition block templates

### 1. Markdown / `docs/*.md` / `SKILL.md`

```markdown
## Composition -- cycle 16

- **Position in the corpus**: <e.g. "this is the architecture index; sibling files are docs/ARCHITECTURE.md, docs/THREAT_MODEL.md, docs/ADR.md">
- **Callers / consumers** (who reads this file): <e.g. "operators running bootc install; CI dispatchers; the audit-evidence-packaging skill">
- **Callees / referenced artifacts** (what this file references): <e.g. "ADRs numbered ADR-001..ADR-033; the curve-guided-rsi corpus; the inner-big-picture skill">
- **Sibling files** (parallel artifacts): <e.g. "playbooks/ for runbooks; refs/ for research notes; papers/ for analyses">
- **Module boundary** (public vs private): <e.g. "the public API is the section headings and the frontmatter; private internals are the example blocks">
- **Edge type distribution**: static references: N | runtime calls: N | config-discovered: N
- **Ownership**: doc owner: <team>; refresh cadence: <date>; review-after: <event>
```

### 2. Containerfile / mkosi / Dockerfile

```dockerfile
# Composition -- cycle 16
#   FROM-source: <registry/repo:tag@sha256:digest>  # static reference
#   Build callers (workflows that invoke this build): <list>
#   Build callees (RUN-time tools / packages invoked): <list>
#   Sibling artifacts: Containerfile, Containerfile.dev, Containerfile.uki
#   Integration points: <e.g. "joins yubios-bootc-uki via bootc install; no IPC">
#   Module boundary: <e.g. "the FROM line is the public base; everything after is internal">
#   Edge type distribution: static: N | runtime: N | config: N
#   Ownership: image owner: yubiOS maintainers; refresh cadence: every merge-manifest; review-after: every MAJOR base-image bump
```

### 3. Shell / Python / Ruby script

```bash
# Composition -- cycle 16
#   Callers (workflows/presets/scripts that invoke this): <list with workflow path>
#   Callees (binaries / libraries / scripts this invokes): <list with rationale>
#   Integration points: <e.g. "stdout to ci.yml; exits 0/1/2 to dispatcher; no IPC">
#   Sibling files: <e.g. "scripts/lib/local-build-{firmware,installer}.sh share the lib/ helpers">
#   Module boundary: <e.g. "the CLI surface is public; the env-var convention is private">
#   Edge type distribution: static: N (jq, curl) | runtime: N (mount, bootc) | config: N (workflow inputs)
#   Ownership: <team>; refresh cadence: <date>
```

### 4. GitHub Actions workflow

```yaml
# Composition -- cycle 16
#   workflow_call callers (downstream workflows that invoke this): <list>
#   workflow_dispatch callers (manual / API triggers): <list>
#   schedule callers (cron): <list or none>
#   reusable workflows invoked via uses: <list>
#   actions invoked via uses: <list with version pin>
#   Integration points: <e.g. "posts status to GitHub commit status; consumes GITHUB_TOKEN; no external API">
#   Sibling workflows: <e.g. "ci.yml is the parent dispatcher; ci_fork_*.yml are fork-driven sibling chains">
#   Module boundary: <e.g. "the workflow_call.outputs are public; the matrix is private">
#   permissions: <declared at workflow level>; never widened without ADR
#   Edge type distribution: static: N (pinned actions) | runtime: N (curl, jq) | config: N (workflow_call inputs)
#   Ownership: <team>; refresh cadence: <date>
```

### 5. systemd unit / drop-in

```ini
# Composition -- cycle 16
#   Callers (units that Wants=/Requires=/Before= this unit): <list>
#   Callees (units this unit Wants=/Requires=/After=): <list>
#   ExecStart binary and its callees: <binary path + dependencies>
#   Integration points: <e.g. "sd_notify for readiness; no D-Bus; no socket">
#   Sibling units: <e.g. "yubiOS-enroll.service and yubiOS-chipsec-firstboot.service share the enroll-backup pattern">
#   Module boundary: <e.g. "EnvironmentFile= is public configuration; the ExecStart= chain is private">
#   Type=: oneshot|notify|simple|forking; lifecycle owned by systemd
#   Edge type distribution: static: N (binary path) | runtime: N (sd_notify) | config: N (drop-ins, presets)
#   Ownership: <team>; refresh cadence: <date>
```

### 6. udev / modprobe / dracut / tmpfiles.d rule

```text
# Composition -- cycle 16
#   Trigger source: <e.g. "kernel modalias / block device / network event">
#   Callers (other rules or units that depend on this): <list>
#   Integration points: <e.g. "creates /dev/X via tmpfiles; no D-Bus; no signal">
#   Sibling rules: <e.g. "the other 50-yubiOS-* drop-ins share the lex-sort-after convention">
#   Module boundary: <e.g. "the rule's KEY= is public; the SYMLINK target is private">
#   Lex-sort position: this file sorts AFTER every upstream file it overrides; verified via `ls -1 /etc/<dir> | sort -u`
#   Edge type distribution: static: N (KEY= match) | runtime: N (RUN+=) | config: N (ENV=, OWNER=, GROUP=)
#   Ownership: <team>; refresh cadence: <date>
```

### 7. YAML / TOML / JSON config

```yaml
# Composition -- cycle 16
#   Schema: <e.g. "mkosi 24.x; renovate.json 1.x; cosign signing-config.json">
#   Callers (tools / scripts / workflows that read this file): <list>
#   Callees (URLs, registries, keys, paths referenced): <list>
#   Integration points: <e.g. "the registry URL is a static reference; the public key is a runtime check">
#   Sibling configs: <e.g. "the other mkosi.conf.d/* files share the inclusion model">
#   Module boundary: <e.g. "the public keys are public; the build hooks are private">
#   Edge type distribution: static: N (URLs, paths) | runtime: N (key fingerprints) | config: N (matrix, depends_on)
#   Ownership: <team>; refresh cadence: <date>
```

### 8. refs/*.md (research note)

```markdown
## Composition -- cycle 16

- **Position in the corpus**: <e.g. "research note for ADR-NNN; sibling refs: refs/foo-bar-2026-08-04.md, refs/baz-qux-2026-08-05.md">
- **Callers** (downstream artifacts that depend on this note): <e.g. "ADR-NNN; the corresponding playbook; the corresponding CI test">
- **Callees** (upstream artifacts this note cites or extends): <e.g. "papers cited inline; ADRs cross-referenced; vendor docs URL'd">
- **File impact**: <e.g. "if accepted, Containerfile, mkosi.conf.d/X, and tests/vm/test-X.sh change">
- **Sibling notes**: <e.g. "the other refs/*.md files in this topic cluster">
- **Module boundary**: <e.g. "the Conclusions and File impact sections are public; the Methodology is private to the maintainer">
- **Edge type distribution**: static: N (URLs, ADRs) | runtime: 0 | config: 0
- **Ownership**: note owner: <team>; refresh cadence: <date>; review-after: <next milestone>
```

## Standards the section encodes

### 1. Parnas and architectural views: structure is parts plus relations

The classic architectural definition treats architecture as structures consisting of parts, externally visible properties, and relationships. SEI's *Software Architecture Documentation in Practice* identifies a **module structure** ("is part of" / information hiding) and a **uses structure** ("depends on the correctness of"), and distinguishes development/module organization from runtime/process and deployment structures. This is the strongest conceptual foundation: composition is not a diagram style; it is a family of related structures, each with a different edge meaning.

### 2. arc42: hierarchical static decomposition plus runtime interaction

arc42's **Building Block View** documents the static decomposition into modules, components, subsystems, classes, interfaces, packages, libraries, frameworks, layers, and other building blocks, together with their dependencies. It uses hierarchical black-box/white-box refinement (overall system first, then selected internals). Its black-box template includes purpose/responsibility, interfaces, optional quality characteristics, location, requirements, and risks.

arc42 also separates static composition from the **Runtime View**, which explains how instances of those building blocks interact in important use cases, external interfaces, startup/shutdown, and error scenarios. The full template places these beside context, solution strategy, deployment, cross-cutting concepts, decisions, quality requirements, risks, and glossary.

### 3. C4: composition as zoomable abstraction

The C4 model provides a practical reader-oriented hierarchy: **system context -> containers -> components -> code**. A system contains containers; containers contain components; components are implemented by code elements. Three rules follow:

- composition must be **hierarchical and zoomable**;
- each diagram must have a declared abstraction level and audience;
- an edge must say what it means, not just be a line.

C4's container diagram is especially relevant to modular monoliths: it shows responsibility distribution, technology choices, and communication between major applications/data stores, while avoiding deployment details that belong in deployment diagrams. C4 also says not to use all four levels automatically: context and container views are sufficient for many teams.

### 4. Dependency and call graphs: composition is multiple graphs, not one

A **caller/callee graph** has methods/functions as nodes and caller -> callee edges. It is a runtime-oriented or execution-potential view. An **import/module dependency graph** has files, modules, packages, or namespaces as nodes and import/use edges. A package graph is yet another abstraction. Software structure exists at several graph levels -- call, module interaction, package dependency, inheritance, control-flow, and data-flow -- so collapsing them into one "dependency diagram" creates ambiguity.

The distinction matters because static call graphs are necessarily approximate around dynamic dispatch, reflection, callbacks, generated code, dependency injection, and alternate implementations. Kythe documents, for example, that resolving a complete call graph may require following declarations, completions, and override relationships, and can over-approximate possible calls.

### 5. dependency-cruiser: executable composition rules

`dependency-cruiser` turns composition into both a visualization and a testable contract. It validates rules such as forbidden cycles, missing package declarations, or production code using development dependencies, and emits text, graph, HTML, and other reports. Its aggregation levels are a useful documentation pattern: detailed module graph, folder-level graph, and high-level architecture graph. It explicitly warns that a graph containing thousands of modules and edges is not informative, and recommends aggregation, filtering, and focus.

### 6. Package design and modular monoliths

Package-design prior art gives composition evaluative criteria, not just notation:

- **REP** -- reuse/release equivalence;
- **CCP** -- things changing together belong together;
- **CRP** -- things used together belong together;
- **ADP** -- package dependencies must be acyclic;
- **SDP** -- depend in the direction of stability;
- **SAP** -- stable packages should be appropriately abstract.

For a modular monolith, composition must document **logical boundaries independently of process/deployment boundaries**: modules may share one process and deployment while exposing only explicit APIs/events and owning clear responsibilities. The Microsoft reference architecture recommends avoiding direct cross-module calls beyond published interfaces, enforcing dependency direction, and isolating state/configuration where practical.

### 7. Composition and the 10-primitive yubiOS framework

In yubiOS's 10-primitive model (`internal-big-picture`), composition sits alongside the other primitives -- trust chain, attestation, declarative policy, immutability, continuous/adaptive, least-privilege, segmentation, supply chain, and cryptographic identity. A composition block in a file should make its relationship to each primitive visible:

- **trust chain**: which trust anchor (PCR / UKI / key custodian) does this file's composition depend on?
- **attestation**: which SLSA / in-toto / TPM-quote edge does this file produce?
- **declarative policy**: which Rego / OPA / mkosi / build-policy rule governs this file's allowed/forbidden edges?
- **immutability**: which composefs / dm-verity / ostree edge makes this file's composition reproducible?
- **continuous/adaptive**: which bootc upgrade / CI re-fire / IMA runtime edge exercises this file's composition?
- **least-privilege**: which capability / sandbox / ProtectSystem directive gates this file's composition?
- **segmentation**: which namespace / nspawn / cgroup boundary isolates this file's composition?
- **supply chain**: which fork / upstream / SBOM edge traces this file's provenance?
- **cryptographic identity**: which FIDO2 / PIV / YubiKey / ssh-key / hmac-secret / passkey edge authenticates this file's composition?

## yubiOS-specific composition patterns

### Containerfile / mkosi / Dockerfile

- Build-time edges: `RUN` (jq / curl / dnf / mkosi), `COPY --from=`, `ARG`, `ENV`, `LABEL`, `--mount=type=secret`, `--mount=type=cache`, `--mount=type=bind`.
- Public/base: the `FROM` line is the only line the image inherits from an external registry; the rest is the project's internal composition.
- Sibling artifacts: `Containerfile`, `Containerfile.dev`, `Containerfile.uki`, `mkosi.conf`, `mkosi.conf.d/*`.
- Integration points: bootc install target, OCI image registry, SBOM generation phase, cosign signing.
- Edge type distinction: `FROM` is a static reference; `RUN curl` is a build-time runtime call; `ARG` is a build-time config.

### Shell / Python scripts

- Callers: workflow `uses:` lines, sibling `scripts/lib/*.sh`, systemd `ExecStart=`, mkosi `POSTINSTRUMENT`, manual operator invocations.
- Callees: `jq`, `curl`, `mount`, `bootc`, `mkosi`, `systemctl`, `cosign`, `syft`, `grype`; Python `requests`, `subprocess`, `pathlib`.
- Integration points: GitHub API (workflows), GitHub Container Registry (image push), sigstore (cosign), quay.io (image pull).
- Sibling files: `scripts/lib/*.sh` (helper library); `scripts/*.py` (Python tool layer).
- Edge type distinction: `#!/usr/bin/env bash` is a static interpreter reference; `jq .foo` is a runtime call; `${VAR:-default}` is a config reference.

### GitHub Actions workflows

- workflow_call callers: every workflow that does `uses: ./.github/workflows/foo.yml`.
- workflow_dispatch callers: manual triggers + API triggers.
- schedule callers: `cron:` lines.
- reusable workflows invoked: `uses: org/repo/.github/workflows/foo.yml@ref`.
- actions invoked: `uses: actions/checkout@vN`, `uses: docker/setup-buildx-action@vN`.
- Integration points: `GITHUB_TOKEN` + any custom secrets; `actions/upload-artifact`; `actions/github-script`; external API calls.
- Sibling workflows: `ci.yml` (parent dispatcher); `ci_fork_*.yml` (fork-driven siblings); `ci_test-*.yml` (test-side siblings).
- Module boundary: `workflow_call.outputs.*` are the public API; the `matrix:` is private; the `permissions:` block is a hard boundary.
- Edge type distinction: pinned `actions/checkout@vN` is a static reference; `${{ github.* }}` is a config reference; `run:` is a runtime call.

### systemd unit / drop-in

- Callers: units that `Wants=`, `Requires=`, `Before=`, `Triggers=`, `BindsTo=` this unit; system-preset entries.
- Callees: units this unit `Wants=`, `Requires=`, `After=`, `Before=`; the `ExecStart=` binary and its callees.
- Integration points: `Type=notify` (sd_notify); `Type=dbus` (D-Bus); `Socket` activation; `Path` triggers; `Timer` triggers; `EnvironmentFile=`; `StandardOutput=journal`.
- Sibling units: the other `yubiOS-*.service` units; the `yubiOS-*.service.d/*.conf` drop-ins.
- Module boundary: `EnvironmentFile=` is public configuration; `ExecStart=` chain is private; the unit's `[Install]` section is the registration surface.
- Edge type distinction: `ExecStart=/usr/bin/foo` is a static reference; `EnvironmentFile=` is a config reference; `Wants=foo.service` is a config-discovered edge.
- Lex-sort rule (per `playbooks/drop-in-override-naming.md`): drop-ins sort AFTER upstream package files; use `vfio-yubiOS-*`, `yubiOS-*`, or any prefix that lex-sorts after upstream files.

### udev / modprobe / dracut / tmpfiles.d rule

- Trigger source: kernel modalias, block device event, network event, boot-time phase.
- Callers: other rules that depend on this one; units that the rule triggers.
- Integration points: kernel module loading; cdev creation via tmpfiles.d; sysfs writes; network interface naming.
- Sibling rules: the other `*-yubiOS-*` rules in the same directory.
- Module boundary: the rule's `KEY=` match string is public; the `RUN+=` chain is private.
- Lex-sort rule: same as systemd drop-ins.
- Edge type distinction: `KEY=="foo"` is a static match; `RUN+="..."` is a runtime call; `ENV{...}="..."` is a config reference.

### YAML / TOML / JSON config

- Schema: mkosi 24.x; renovate.json 1.x; cosign signing-config.json 1.x; GitHub Actions workflow schema.
- Callers: tools that read the file (mkosi, renovate, cosign, the GitHub Actions runner).
- Callees: URLs, registries, key fingerprints, paths, image references.
- Integration points: registry endpoints; key servers; signing services.
- Sibling configs: the other `*.conf`, `*.toml`, `*.json` files in the same directory.
- Module boundary: public keys and registry URLs are public; the internal build hooks are private.
- Edge type distinction: a `FROM`/URL is a static reference; a key fingerprint is a runtime check; a matrix/depends_on entry is a config reference.

### refs/*.md (research note)

- Callers: ADRs that cite the note; playbooks that link to it; CI tests that test its recommendation; PRs that implement its recommendation.
- Callees: papers cited; ADRs cross-referenced; vendor docs URL'd.
- File impact: the explicit list of files that change if the note is accepted.
- Sibling notes: the other refs/*.md files in the same topic cluster.
- Module boundary: the Conclusions and File impact sections are public; the Methodology is private to the maintainer.
- Edge type distinction: a citation is a static reference; a recommendation is a config-discovered edge (because it becomes an ADR / playbook / PR); a code example is a runtime-call edge (because it must be executed).

## How to measure composition in the repository

Use several evidence layers rather than one graph:

- **Static import graph**: direct module/package edges, cycles, orphan nodes, fan-in/fan-out.
- **Caller/callee graph**: callers, reachable impact surface, entry points, dynamic-dispatch uncertainty.
- **Boundary graph**: public exports versus deep imports; allowed/forbidden module edges.
- **Runtime graph**: observed calls, events, queues, database access, retries, and failure paths.
- **Package graph**: workspace and third-party dependency relations.
- **Configuration graph**: workflow_call / workflow_dispatch / systemd Wants= / udev RUN+= edges that are not in the static-import graph.
- **Ownership/state graph**: which module owns data, migrations, secrets, queues, and operational responsibility.

Useful indicators include cycle count, cross-boundary import count, percentage of imports through public APIs, fan-in/fan-out concentration, transitive impact size, orphan count, undocumented external edges, contract coverage, and intra-/inter-module co-change ratio. Treat these as signals, not universal thresholds: a high fan-in stable abstraction can be healthy, while a low-edge module can still have a disastrous shared database or runtime coupling.

## Guidelines

1. **Score behavior, not keywords.** A token like "depends on" earns at most partial credit; full credit requires a caller name, an entry point, an edge type, and a source link.
2. **Name callers AND callees.** A file that lists only its dependencies (callees) without its consumers (callers) answers half the question.
3. **Distinguish static-import from runtime-call from configuration-discovered.** Three different edges; one diagram collapses them.
4. **Name the integration points with contracts.** Every external system boundary needs protocol, payload, timeout, retry, owner.
5. **Document the module boundary.** A file with no public/private distinction has no composition contract.
6. **Use the edge-typed vocabulary.** contains / imports / calls / publishes / subscribes / reads / writes / deploys-with / depends-on. New edges require a vocabulary revision.
7. **Surface fan-in and fan-out.** A high-fan-in stable abstraction is healthy; a high-fan-in unstable one is fragile.
8. **Link each composition claim to a source.** A caller without a path is a name-drop.
9. **Lens-format patches only (cycle-16).** Each file patch is a lens with hypothesis + method + parameters + delta + verdict + score + caveat. No templated `## Composition` sections.
10. **Cross-context invariance.** The composition map should hold for operator / developer / CI / architect. Stale maps re-anchor biases from the author's role.

## Constraints

- LOCAL ONLY for the rubric; no network for measurement.
- The rubric is binary per-dimension (0/1/2). No fractional scores.
- Lens output (cycle-16) carries its own experimental design; the patch is the lens, not prose about the file.
- Self-containment: this SKILL.md embeds the full rubric and the distinctions; no external doc fetch required.
- The edge-typed vocabulary is fixed: contains / imports / calls / publishes / subscribes / reads / writes / deploys-with / depends-on.

## Anti-patterns

- Awarding points for keywords alone ("depends on X" = full credit).
- Confusing static import with runtime call.
- Confusing documented dependency with executed dependency.
- Confusing caller/callee graph with dependency graph.
- Confusing build-time integration with runtime integration.
- Confusing sibling file with integration point.
- Mixing C4 levels in one diagram without a legend.
- Treating a "no edges" module as healthy.
- Treating a cycle as a graph topology problem rather than a composition problem.
- "See also" links without an edge type.
- Shipping templated `## Composition -- cycle 16` sections without lens format.

## Red flags

| Observation | What it means |
|---|---|
| File says "depends on" but never names a callee | composition axis is a gap |
| File says "used by X" but never names the entry point | caller surface undocumented |
| File has no module boundary (no public/private) | composition contract is implicit |
| Integration point named without protocol/payload/timeout/retry/owner | integration is decorative |
| Static-import edge drawn identically to runtime-call edge | edge-type collapse |
| C4 diagram mixes system context with code elements without a legend | the diagram is unusable |
| Module has zero edges | unreachable or boundary undocumented |
| Module has a cycle that is known but undocumented | cycle laundering |
| Lens has `delta: {}` or `score: 0` | the experiment did not run; lens is aspirational |
| 40+ lenses all verdict=YES score=50 | experiment is degenerate |

## Composition

| Skill / channel | How it composes | Direction |
|---|---|---|
| `negative-skill-space` | provides the 12-axis sweep framework; this skill owns axis #9 (Composition). NSS sweeps this axis on every cycle that asks for composition gap finding. | negative-skill-space -> nss-composition |
| `curve-compass-skill` | provides the lens-format patch generator and the Sigma ladder; this skill emits one lens per file in the same JSON shape. | curve-compass-skill <-> nss-composition |
| `nss-adjacent-problems` | composition and adjacent-problems are complementary: composition is the structural surface, adjacent-problems is the alternative-solution surface. A file with a strong composition map but no alternatives is still a gap. | nss-composition <-> nss-adjacent-problems |
| `nss-assumption-set` | composition surfaces the structural relationships; assumption-set surfaces the preconditions of those relationships. A composition edge without an assumption_set entry (the "this works only if X" line) is a partial cell. | nss-composition <-> nss-assumption-set |
| `github-api` | defines the Git Data API commit pattern for atomic multi-file patches; nss-composition uses this to apply ~40 file patches in one commit (per `PROJECT_RULES.md`). | nss-composition -> github-api |
| `recursive-self-improvement` | the closing loop. nss-composition proposes gaps; RSI applies the per-file patch. | nss-composition -> recursive-self-improvement |
| `context-isolation` | when running the cycle-16 sweep, run each file's lens in a fresh-context subagent so author bias from prior cycles doesn't re-anchor. | context-isolation -> nss-composition |

## Self-containment

Reads: nothing required (rubric + distinctions + lens schema + file-type templates + yubiOS patterns + standards all embedded).
Writes: lens-format JSON per file. Depends on: stdlib only.

## Verification

```
python3.12 -c "import re; s=open('skills/github-yubios-KS9n5GAT/nss-composition/SKILL.md').read(); assert re.match(r'^---\n.*name: nss-composition\n.*description: .*', s, re.S); print('OK')"
```

Plus the lens output schema: lens, file, hypothesis, method, parameters, delta, verdict, score, caveat all present; verdict in {YES, PARTIAL, NO}; score 0-50; parameters.axis == "composition".

Plus the frontmatter validation:
```
python3.12 -c "import re, yaml; d=yaml.safe_load(open('skills/github-yubios-KS9n5GAT/nss-composition/SKILL.md').read().split('---',2)[1]); assert re.match(r'^[a-z0-9-]+$', d['name']); assert 1 <= len(d['description']) <= 1024; assert '<' not in d['description'] and '>' not in d['description']; print('OK')"
```

## Changelog

- **1.0.0** (2026-08-12) -- initial. Built for RSI cycle 16 on PR #207. Establishes the Composition axis rubric, the 0-5 level scale, the 10-dimension 0-20 score, the lens-format patch format, the file-type-aware composition block templates (Markdown, Containerfile, shell/Python, GitHub Actions, systemd, udev/modprobe/dracut/tmpfiles, YAML/TOML/JSON, refs/*.md), the 7-relation taxonomy (contains / imports / calls / publishes / subscribes / reads / writes / deploys-with / depends-on), and the 7-evidence-layer measurement framework (static-import / caller-callee / boundary / runtime / package / configuration / ownership-state). Cross-context invariance: this skill is safe for operator / developer / CI / architect, and the cycle-16 lens patches hold across all four contexts.

## Maintainer

Sauna, wave 2. Built against `negative-skill-space` SKILL.md (the 12-axis sweep framework), `curve-compass-skill` v1.1.0 (lens-format patch generator), `nss-adjacent-problems` (the adjacent cycle-13 sister), `nss-assumption-set` (the cycle-12 sister), the deepresearch output on composition-axis coverage (Parnas/SEI Software Architecture Documentation in Practice; arc42 Building Block View and Runtime View; C4 abstractions and diagrams; SootUp call graphs; Kythe callgraphs; dependency-cruiser and its FAQ; package design principles REP/CCP/CRP/ADP/SDP/SAP; Clean Architecture component cohesion and coupling; Microsoft modular monolith guidance; Spryker Architecture as Code), and the cycle-7 PR #207 baseline (391 atomic per-file NSS patches already on the branch; cycles 8-15 lenses already shipped on this branch via `feat/rsi-compass-cycle7-nss-research-2026-08-12`).
