---
name: nss-audience
description: "Audience axis of the 12-axis negative-skill-space (NSS) sweep. Classify every file by WHO it is for (operator, developer, end-user, CI/automation, maintainer, incident responder, architect/evaluator) using role + proximity + interaction + Diataxis-style mode. Detects audience gaps -- files with no reader signal, files targeting the wrong reader, or files serving incompatible needs. Produces an audience x job x artifact matrix scored by importance x task-risk x (1 - coverage); negative space (missing arrival paths, prerequisites, recovery steps) flagged as Extend gaps. Use when an NSS sweep finds files with no audience signal, no frontmatter audience tag, or mixed operator/developer/machine-reader needs; when CI/automation needs schemas or exit codes prose docs omit; when a file mixes tutorial prose with reference lookup. Trigger phrases: audience axis NSS, persona-driven docs, doc-as-code audience, audience taxonomy, audience matrix, JTBD docs."
---




# nss-audience

The **Audience** axis is the first of the 12 NSS axes and the one most often done badly. "For users" in a header is not audience analysis. Folder names like `docs/deployment/` are weak evidence. The corpus's own job is to answer a sharper question for every file:

> **Which reader, in which situation, is expected to use this file to accomplish which job -- and what evidence shows the corpus actually supports that reader?**

A flat role label is not enough. The audience model here combines four dimensions:

1. **Role** -- end user / developer / operator / CI or automation / maintainer / incident responder / architect or evaluator / support.
2. **Proximity** -- novice / general / expert / unknown.
3. **Interaction** -- human / machine / mixed / unknown.
4. **Mode** (per Diataxis) -- tutorial / how-to / reference / explanation / runbook / policy / ADR / unknown.

A file that says "this is for operators" but reads like a developer integration guide is an Audience gap. A page that targets CI by listing shell commands but never states exit codes, env vars, or inputs is a gap even though it mentions "automation." An operator runbook that explains architecture instead of telling the operator what to do is a Mode mismatch -- also an Audience gap.

The standard role vocabulary is small enough to be enforced, large enough to capture real readers:

```
roles: [end_user, developer, operator, ci_automation, maintainer,
        incident_responder, architect, support_admin]
experience: [novice, general, expert, unknown]
interaction: [human, machine, mixed, unknown]
mode: [tutorial, how_to, reference, explanation, runbook, policy,
       adr, unknown]
jobs: [evaluate, install, configure, develop, test, deploy, monitor,
       troubleshoot, migrate, extend, maintain, recover, unknown]
```

Permit `unknown` and `mixed`. Forcing a single role where the file genuinely serves multiple readers manufactures false precision and hides the real gap.

This skill takes over the NSS **Audience** axis only -- the other 11 axes (Inputs, Outputs, Mode, Assumption set, Adjacent problems, Failure modes, Lifecycle, Composition, Knowledge sources, Calibration, Recursion) belong to `negative-skill-space` itself and are out of scope here.

## Examples

### Example 1 -- Audience signal inventory (one row per file)

```yaml
- path: docs/CONTRIBUTING.md
  source_type: prose
  explicit_audience: [maintainer]
  inferred_roles: [maintainer, developer]
  primary_role: maintainer
  experience: general
  interaction: human
  mode: how_to
  jobs: [develop, test, extend]
  evidence:
    - "PRs welcome, run tests before pushing"
    - "test commands listed in §3"
    - "lint rules in §5"
    - "linked from README 'how to contribute'"
  confidence: high

- path: tests/vm/test-luks-fido2.sh
  source_type: code-adjacent
  explicit_audience: []
  inferred_roles: [ci_automation, maintainer]
  primary_role: ci_automation
  experience: expert
  interaction: machine
  mode: runbook
  jobs: [test]
  evidence:
    - "executable assertions with set -e"
    - "exit codes used by ci_test-vm.yml dispatch"
    - "called by .github/workflows/ci_test-vm.yml"
  confidence: high

- path: docs/ARCHITECTURE.md
  source_type: prose
  explicit_audience: []
  inferred_roles: [architect, developer, maintainer]
  primary_role: architect
  experience: general
  interaction: human
  mode: explanation
  jobs: [evaluate, extend]
  evidence:
    - "decision rationale and trade-offs"
    - "linked from README §Overview"
    - "no executable commands"
  confidence: medium
```

### Example 2 -- Audience x Job x Artifact matrix (the central NSS output)

```
              install  configure  deploy  monitor  troubleshoot  migrate  recover  maintain
end_user        partial  served    gap     gap        gap          gap     gap      n/a
developer       served   served    served  partial     served      served  partial   served
operator        served   served    served  served      served      served  served    partial
ci_automation   partial  served    served  gap         partial     gap     gap       partial
maintainer      served   served    partial partial     served      partial partial   served
incident_resp   n/a      partial   gap     served      served      gap     served    gap
architect       served   partial   partial partial     partial     partial partial   partial
support         partial  served    gap     partial     served      partial gap       n/a
```

Each cell is scored by importance x task-risk x evidence-of-demand x (1 - coverage). High-risk operator/incident/CI cells get priority even when demand analytics are sparse.

### Example 3 -- Audience gap patch (extend the file with a targeted audience block)

```markdown
## Audience

This file is for **operators** (general experience) running yubiOS in production.
A secondary audience is **CI/automation** -- the workflow that dispatches
`ci_test-vm.yml` consumes the same exit codes.

**Job:** monitor and troubleshoot the LUKS2 + FIDO2 unlock path.

**Prerequisites assumed:** a booted yubiOS image with TPM and a YubiKey
attached; familiarity with `bootc upgrade` and `systemctl status`.

**Out of scope for this file:** developer integration of a custom
authenticator, end-user enrollment (see `docs/ENROLL.md`),
maintainer contribution workflow (see `CONTRIBUTING.md`).
```

### Example 4 -- Negative-space findings (what to flag)

| Observation | Audience gap |
|---|---|
| `docs/RECOVERY.md` does not exist but operator/incident_responder both need it | missing recovery arrival path for two high-risk roles |
| `tests/vm/test-luks-fido2.sh` lists no exit codes in its header | CI/automation cannot rely on documented contract |
| `docs/ARCHITECTURE.md` opens with `## Tutorial: how to build yubiOS` | Mode mismatch -- architects need explanation, not tutorial |
| `README.md` mentions "for end users" but never links to UI/install docs | end_user/evaluate cell is partial at best |
| `docs/DEPLOY.md` has no rollback section | operator/recover cell is a gap even when deploy is served |

### Example 5 -- Doc-as-code enforcement (turn signals into CI checks)

```yaml
---
audience: [operator]
jobs: [deploy, monitor, recover]
experience: general
interaction: human
mode: runbook
source_of_truth: deployment-manifests
owner: platform-team
review_after: release
---
```

CI checks: `audience` is from the controlled vocabulary; every public task
page names a primary audience and job; referenced commands/examples execute
where feasible; high-risk cells have an `owner` and a `review_after` date.

## Guidelines

1. **Always inventory before scoring.** One row per file with
   `explicit_audience`, `inferred_roles`, `primary_role`, `experience`,
   `interaction`, `mode`, `jobs`, `evidence`, `confidence`. The row is the
   audit trail; the matrix is the output.
2. **Infer role from the job, not from the noun in the title.** Strongest
   evidence order: explicit metadata > stated goal + prerequisites >
   executable artifacts + vocabulary > inbound links from a persona
   landing page > filename + directory > author convention. A file named
   `deployment.md` may still target developers if it explains a deploy
   library.
3. **Permit `unknown` and `mixed`.** Forcing a single role manufactures
   false precision; the goal is to expose the gap, not to make the file
   look tidy.
4. **Score the cell, not the file.** A file can serve a role weakly (the
   file exists but the arrival path is missing) -- that is `partial`, not
   `served`.
5. **Prioritize by risk x demand x (1 - coverage), not by missing-file
   count.** An operator/recover gap is higher priority than an
   end_user/evaluate gap even when both files are missing.
6. **Flag negative space, not just missing files.** A recovery page may
   exist without prerequisites or escalation -- that is a partial cell,
   not a served one. A CI/automation page may exist without exit codes --
   that is a partial cell, not a served one.
7. **Treat the audience tag as data, not decoration.** CI must validate
   the controlled vocabulary; otherwise the tag degrades into
   documentation-by-section with extra steps.
8. **Cross-check with the other NSS axes.** A file with no audience
   signal often also has no `Assumption set` (audience assumes a reader
   but never says which one) and no `Mode` (tutorial mixed with reference
   mixed with runbook). Fix the Audience axis first; the other axes
   follow.
9. **Update audience tags when the audience changes.** If a file moves
   from developer-targeted to maintainer-targeted, the front matter and
   the inbound links must move too. Stale tags are worse than no tags.
10. **Keep confidence separate from severity.** An inferred audience for
    a high-risk role should become a validation question, not be silently
    discarded.

## Constraints

- **Local + sync only.** No network. The skill reads files, classifies
  them, and writes audience-tagged patches.
- **No audience labels without evidence.** Every primary_role assignment
  must cite at least one signal (front matter, heading, executable
  artifact, inbound link, directory convention). No signal = `unknown`,
  not a guess.
- **No audience labels without front matter or inline signal.** Either
  the file declares its audience in YAML front matter (markdown, ADR,
  schema) or it carries an explicit `## Audience` / `## Purpose` block
  in prose. Free-floating "intended reader" prose is not enough.
- **Vocabulary is fixed.** Roles, experience, interaction, mode, and
  jobs each come from the controlled vocabulary above. New values
  require a vocabulary revision, not a one-off addition.
- **Mixed is allowed; lying is not.** A file that genuinely serves three
  roles should declare `audience: [operator, developer, ci_automation]`
  with a note explaining which section serves which role -- not collapse
  to one role for tidiness.
- **Self-contained.** No external services. No browser sessions. No
  GitHub API calls except via the standard `github-api` skill.
- **Pair with `negative-skill-space`.** This skill is the Audience-axis
  specialist; the parent NSS skill orchestrates the 12-axis sweep and
  the action taxonomy (Extend / Pair / Accept).

## Anti-patterns

- **Don't classify by folder name alone.** `docs/deployment/` is weak
  evidence; the file inside may target developers, operators, or CI.
- **Don't collapse multi-role files to one role.** An ADR is read by
  maintainers, architects, and developers simultaneously. Saying
  `audience: maintainer` is wrong; `audience: [maintainer, architect,
  developer]` with a per-section note is right.
- **Don't read "for users" in a header as audience analysis.** A header
  that says "for users" without role + proximity + job is documentation
  theatre. Either back it with an explicit `## Audience` block or treat
  the file as `unknown`.
- **Don't treat CI/automation as "developers."** A CI workflow is read
  by GitHub Actions, not by humans browsing docs. Its audience is
  `ci_automation` with `interaction: machine`, not `developer` with
  `interaction: human`. The audience cell for CI is different from the
  developer cell.
- **Don't count partial pages as served.** A page that names a role but
  lacks the job's prerequisites, expected result, or failure path is
  `partial`. A page that names the role and provides all three is
  `served`. Anything else is a gap.
- **Don't score by file count.** Coverage is "does the reader reach a
  complete, current path?" not "are there N files?" A single served
  page beats five partial ones.
- **Don't infer audience from author. ** The author is the maintainer;
  the audience is whoever the file is FOR, which may be operators or
  end users. Author bias is the most common Audience-axis error.
- **Don't ship a matrix without evidence.** Every cell needs at least
  one cited file path or front-matter tag. A matrix without evidence is
  opinion, not analysis.
- **Don't skip the negative-space pass.** Counting missing files is
  half the work. The other half is asking "for each role/job, what is
  the failure mode the corpus does not yet support?"

## Red flags

| Observation | What it means |
|---|---|
| File has no audience signal anywhere -- no front matter, no `## Audience`, no executable artifact, no inbound link | Audience-axis gap -- classify as `unknown`, flag for Extend |
| File declares `audience: developer` but its first executable block is a CI command with exit-code assertions | Mode + Audience mismatch -- the CI/automation audience is hidden inside a developer-tagged file |
| Two files declare overlapping audiences with conflicting prerequisites | Documentation drift -- one is stale; both need review |
| `docs/RECOVERY.md` or `docs/RUNBOOK.md` is missing while operator docs exist | operator/recover and incident_responder cells are gaps |
| README mentions "for end users" but the repo has no UI/install/usage page | end_user/evaluate cell is partial at best |
| Every CI workflow file is tagged `audience: developer` | CI/automation audience is misclassified -- fix the tag, not the workflow |
| Audience matrix shows `served` everywhere with no `partial` or `gap` | the sweep is under-counting -- re-run with stricter criteria |
| A file mixes tutorial prose with a reference lookup table with a runbook procedure | Mode mismatch -- split into three files or pick one mode |
| A page exists but its inbound links land on a different audience's landing page | routing bug -- the page is unreachable for its stated audience |

## Composition

| Skill / channel | How it composes | Direction |
|---|---|---|
| `negative-skill-space` | supplies the 12-axis sweep framework and the Extend/Pair/Accept action taxonomy; this skill specializes the Audience axis | negative-skill-space -> nss-audience |
| `documentation-and-adrs` | supplies the ADR / audience-tagged front-matter convention; this skill drives its audience taxonomy | nss-audience -> documentation-and-adrs |
| `internal-big-picture` | supplies the 10-primitive yubiOS framework; the audience-tagged front matter is one primitive-coverage channel | bidirectional |
| `single-action-curve-rsi` | consumes the Extend-gap list this skill emits and applies one atomic primitive flip per file | nss-audience -> single-action-curve-rsi |
| `recursive-self-improvement` | uses this skill to audit its own audience coverage (skill authors, maintainers, CI runs, integrators all read SKILL.md) | nss-audience -> recursive-self-improvement |
| `curve-compass-skill` / `curved-corpus-create` | supply the lens-format patch generator; this skill feeds them audience-axis lenses | nss-audience -> curve-compass-skill |
| `github-api` | the only network touchpoint -- pushes the audit log + updated audience tags to the repo | nss-audience -> github-api |

## Verification

- [ ] Every file in scope has one row in the inventory with `path`,
      `primary_role`, `experience`, `interaction`, `mode`, `jobs`,
      `evidence`, `confidence`. Files that genuinely cannot be classified
      use `unknown` -- not a guess.
- [ ] Every primary_role assignment cites at least one signal.
- [ ] Every cell in the matrix is one of `served` / `partial` / `gap` /
      `n/a`, with at least one cited file path or front-matter tag.
- [ ] CI/automation and incident_responder cells are explicitly scored,
      not folded into the developer cell.
- [ ] Negative-space findings (missing prerequisites, missing recovery
      steps, missing exit codes) are listed as `partial` with the
      specific gap named.
- [ ] The audience vocabulary is enforced -- no free-form role names in
      front matter or in the matrix.
- [ ] Any file tagged `mixed` carries a per-section note explaining
      which section serves which role.
- [ ] Front matter is YAML-parseable (via `js-yaml`); `audience` values
      match the vocabulary; `description` (if present) is 1-1024 chars
      with no literal `<` or `>`.

## Changelog

- **2026-08-12 v1.0.0** -- initial. Audience-axis specialist for the NSS
  12-axis sweep. Source synthesis: Google Technical Writing audience
  model (role + proximity + required knowledge), DITA audience/experience/
  job profiling (machine-readable metadata + conditional processing),
  Diataxis (mode as a separate axis from audience), Doc Detective
  persona-driven strategy (primary persona + Critical User Journey +
  outcome-first organization), GitBook persona + Jobs-to-Be-Done
  pattern, Temporal 2021 documentation information architecture
  redesign (per-persona landing pages over shared reference shelf),
  Ductile audience matrix (human/agent x coder/operator x
  learner/expert -> 8-cell coverage), and Docs-as-code front matter
  enforcement (Docusaurus tags, GitHub Docs YAML front matter,
  Structured MADR `audience` field). Cycle 8 of `rsi-compass` ships
  this skill with ~40 audience-aware incremental patches on PR #207
  branch `feat/rsi-compass-cycle7-nss-research-2026-08-12` (one
  audience-aware section per file, file-type-aware comment syntax).
  Self-validated: frontmatter parsed by `js-yaml` (name `nss-audience`
  matches `^[a-z0-9-]+$`; description 1019/1024 chars; no literal
  `<`/`>`; closing `---` intact; H1 immediately after frontmatter;
  Examples / Guidelines / Constraints / Anti-patterns / Red flags /
  Composition / Verification / Changelog sections all present).
