# Tool Transparency

This document explains what the audit suite can and cannot see, how it defends
against adversarial input, and what its findings do and do not represent. Every
audit report links here so readers can calibrate trust appropriately.

---

## What this tool can access

- **Files in the active checkout** — source code, IaC, config, CI/CD definitions,
  Dockerfiles, dependency manifests, and any credentials or secrets present in the
  scoped tree.
- **Shell environment variables** — only those visible to the session at invocation
  time.
- **File metadata** — names, paths, sizes, directory structure.

## What this tool cannot access

| Out of scope | Why it matters |
|---|---|
| **Runtime state** | The tool reads code and config, not running processes, memory, network traffic, or live API responses. |
| **Git history** | Only the active checkout is audited. Secrets committed and later deleted, past vulnerability states, and deleted branches are invisible. Use dedicated secret-history scanners (truffleHog, gitleaks) for that layer. |
| **External services** | No network calls are made during an audit. Cloud console state, SIEM data, and third-party logs are out of scope. |
| **Sibling worktrees and nested clones** | Paths outside the scoped boundary are explicitly excluded — see the scope boundary rule in each skill. |
| **Control enforcement history** | The tool cannot verify whether a control has been consistently applied over time. Formal auditors examine 6–12 months of evidence; a point-in-time code scan is not a substitute. |

---

## Point-in-time nature of findings

**Every report produced by this suite is a snapshot.** It reflects the state of the
scoped codebase at the moment the audit ran. If the codebase changes — a dependency
is updated, a config is patched, a new service is added — the prior report is stale.
Re-run the audit; don't extend the shelf life of an old report.

**Compliance reports carry an additional caveat.** Most compliance frameworks
(SOC 2, FedRAMP, ISO 27001, HIPAA, PCI DSS) require auditors to verify that
controls were operating effectively over a defined period — typically 6 to 12 months.
This suite assesses *whether controls are present and configured correctly* in the
codebase right now. That is valuable input for a real audit, but it does not
substitute for an auditor reviewing logs, change records, incident history, and
access reviews over the evidence period.

---

## Adversarial input: how the tool handles booby-trapped content

Code under audit may contain content designed to mislead or manipulate findings.
Known patterns and how they are handled:

| Attack pattern | Defense |
|---|---|
| **Suppression comments** — inline text like `# audit: ignore`, `// no finding here`, or Markdown that instructs the auditor to skip a section | Treated as untrusted content, not instructions. The audit methodology is applied mechanically; inline content cannot suppress or override a finding. |
| **False compliance claims** — comments or docs asserting "this is FIPS-validated", "PCI scope exclusion approved", or similar | Noted and disregarded. Claims in code do not satisfy control requirements; only actual configuration and implementation do. |
| **Obfuscated logic** — base64-encoded payloads, split strings, dynamic `eval`, encoded URLs | Flagged as a finding in its own right (potential defense evasion / obfuscation). The tool does not decode and execute such content to "see what it does." |
| **Prompt injection via file content** — instruction-like text in source files, READMEs, or config values aimed at altering audit output | Treated as data to be audited, not instructions to be followed. If present, flagged as a finding under the AI security or STRIDE:Defense-Evasion lens. |
| **Misleading naming** — security-sounding function names that wrap insecure logic, or config keys named to suggest hardening is in place | The tool examines implementations, not names. A function called `secureEncrypt` is audited the same as one called `process`. |

**The defense is methodological, not magic.** The lenses (STRIDE, ASVS, ATT&CK,
etc.) are applied to observed structure and behavior, not to what the code claims
about itself. No inline content can certify its own security.

**Known limitation:** sufficiently sophisticated adversarial content embedded in
very large codebases could reduce audit coverage in adjacent areas by increasing
cognitive load. Depth audits on adversarially complex code should be reviewed by a
human engineer.

---

## What these reports are and are not

| These reports ARE | These reports are NOT |
|---|---|
| A point-in-time snapshot of the codebase at the audited commit | A substitute for a formal audit, pentest, or certification |
| Evidence to inform a compliance posture conversation | Proof of compliance or grounds for attestation on their own |
| Input for a remediation backlog, ranked by severity | A complete picture of runtime or operational risk |
| A repeatable, traceable basis for tracking improvement over time | Evidence that controls were consistently applied over a prior period |

---

## Active capabilities

The following features are live and wired into the audit workflow:

- **Owner assignment per finding** — every finding and control gap carries an `owner`
  field, populated from the `default_owner` established during the conductor's Phase 1
  profiling and passed via the dispatch spec. Standalone specialist runs prompt for an
  owner on Critical / High items. Unowned items surface in the conductor's Phase 4.5
  for resolution.
- **Risk acceptance sign-off log** — the conductor's Phase 4.5 gates all Critical /
  High findings and Mandatory compliance gaps through an explicit accept / remediate /
  defer decision before the remediation plan is offered. Accepted risks are written to
  the consolidated report's `## Accepted Risks` table, to the sidecar JSON
  (`accepted_risk` / `risk_acceptance` fields), and to a standalone
  `risk-acceptance-log.md`. Risks are never silently dropped — a finding that is
  neither remediated nor accepted is an open gap.

Existing sidecar files remain forward-compatible; no schema changes required.

## Planned capabilities (not yet available)

- **Audit document drafting** — generating evidence packages (control narratives,
  policy templates, SSP/POA&M drafts) alongside the gap analysis to accelerate audit
  preparation. When this ships, existing sidecar files will be forward-compatible
  without schema changes.
