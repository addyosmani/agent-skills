---
name: security-review
description: Perform a defensive technical security review of code, configs, containers, IaC, live services, or agentic AI systems. Use when the user asks to review, audit, check, harden, assess, or threat-model the security of a repo, file, Dockerfile, Kubernetes manifest, Terraform/Pulumi/Bicep stack, API, deployed service, architecture, prompt/tool chain, or agentic AI system. Also use when the user mentions OWASP, ASVS, CWE, CVEs, vulnerabilities, prompt injection, model/tool safety, tenant isolation, secrets, authorization, or asks "is this secure?" Do not perform exploitation, credential attacks, destructive testing, persistence, evasion, or unauthorized probing. For formal compliance/control-framework mapping such as SOC 2, FedRAMP, CMMC, HIPAA, PCI DSS, or NIST 800-53/171, run this skill first for technical findings, then hand off to compliance-review.
---

# Security Review

This skill performs defensive technical security reviews across these target classes:

- Web apps and APIs
- Containers and Kubernetes manifests
- Infrastructure-as-Code
- Live services
- Agentic AI systems
- Mixed systems

It produces clear, evidence-backed findings with severity, locator, impact, remediation, and coverage notes. For formal reviews, it can also produce a Markdown report and JSON findings sidecar.

## Operating principles

- Be defensive only.
- Do not exploit, attack, fuzz aggressively, bypass controls, exfiltrate data, or modify systems under review.
- Do not review live services unless the user owns or is authorized to test them.
- Prefer passive inspection unless active testing is explicitly authorized.
- Never claim full coverage unless full coverage was actually achieved.
- Every finding must have a specific locator.
- Unknowns and skipped areas must be listed in Coverage gaps.
- Severity must be calibrated. Critical means urgent, material, and realistically dangerous.

## Step 1: Determine scope

If the user provided enough information, proceed without asking.

Proceed directly when you can determine:

1. What is being reviewed
2. Target class
3. Reasonable depth

If depth is not specified, default to **standard review**.

If scope is ambiguous, ask concise questions. If an interactive input tool is available, use it. Otherwise ask in chat.

Suggested questions:

```text
What are we reviewing?
- Source code / web app / API repo
- Container / Dockerfile / Kubernetes manifests
- Infrastructure-as-Code
- Running service / URL / endpoint
- Agentic AI system / agents / tools / prompts / POML
- Mixed system

How deep?
- Quick scan: highest-risk issues only
- Standard review: normal checklist review
- Deep audit: checklist + threat model + edge cases

Framework lens?
- None: technical findings only
- OWASP / ASVS / CWE mapping where relevant
- Formal compliance mapping after technical review
````

If the user asks for compliance mapping, complete the security review first and recommend compliance-review afterward.

## Step 2: Inventory the target

Before detailed analysis, create a quick inventory.

For source repos:

* Identify language/framework
* Identify entry points
* Identify auth/authz code
* Identify network/API boundaries
* Identify database/storage access
* Identify secrets/config
* Identify CI/CD and deployment files
* Identify tests/security tooling
* Identify agent/prompt/tool code if present

For containers:

* Identify base images
* Build stages
* Package installs
* Runtime user
* Exposed ports
* Secrets/env usage
* Files copied into image
* Entrypoint/cmd
* Healthcheck
* Capabilities and filesystem assumptions

For IaC:

* Identify cloud provider
* Public network exposure
* IAM roles/policies
* Secrets handling
* Storage permissions
* Database exposure
* Logging/audit settings
* Encryption settings
* Environment separation

For live services:

* Confirm authorization
* Identify passive-only or active-authorized mode
* Inspect TLS, headers, auth flows, exposed routes, error behavior, metadata leakage, robots/sitemap where relevant
* Do not exploit

For agentic AI systems:

* Identify all agents
* Identify prompts/system instructions
* Identify tools and permissions
* Identify memory/RAG inputs
* Identify human approval gates
* Identify execution boundaries
* Identify tenant/user boundaries
* Identify audit/receipt/logging paths

## Step 3: Load or apply relevant checklists

Apply only the relevant checklist sections.

Always apply:

* Severity rubric
* Report format
* Coverage-gaps discipline

For web/API:

* OWASP Top 10
* OWASP API Top 10
* Auth/authz
* Session/JWT/cookie security
* Input validation
* Injection risks
* SSRF/path traversal/deserialization
* CORS/CSRF
* Secrets/config
* Logging/audit
* Rate limiting and abuse controls
* Dependency and supply-chain posture

For containers:

* Base image trust and freshness
* Package installation hygiene
* Root user / privilege posture
* Secrets in image layers
* Build context leakage
* Writable filesystem assumptions
* Capabilities and seccomp/AppArmor expectations
* Healthcheck and runtime hardening
* Dependency and SBOM posture

For IaC:

* Public exposure
* IAM least privilege
* Secret storage
* Encryption at rest and in transit
* Network segmentation
* Logging/audit coverage
* Backup/retention
* Environment separation
* Drift and state-file risks

For live services:

* Authorization confirmation
* Passive TLS/header inspection
* Security headers
* Cookie attributes
* Public route exposure
* Error leakage
* Version disclosure
* CORS behavior
* Authentication flow observations
* Rate-limit signals
* No exploitation unless explicitly authorized, and even then no destructive testing

For agentic AI:

* Direct prompt injection
* Indirect prompt injection through web/RAG/files/email/tickets
* Tool-call authorization
* Tool output trust boundaries
* Agent-to-agent trust escalation
* Cross-tenant memory bleed
* Retrieval poisoning
* Secret leakage through prompts, logs, traces, or tool results
* Human approval bypass
* Autonomous execution without policy gate
* Confused deputy risks
* Untrusted content reaching privileged prompts
* Unsafe filesystem/network/tool permissions
* Missing receipt/audit trail
* Non-deterministic or unverifiable policy decisions
* Model output treated as authorization
* Sandbox escape risks
* Failure mode: fail-open vs fail-closed

## Step 4: Execute review

### For source code, containers, and IaC

* Inspect the file tree or provided files.
* Prioritize security-sensitive paths first.
* Use automated commands only when safe and available.
* Do not modify files unless the user explicitly asks for remediation patches.
* Track findings as structured records.

Security-sensitive paths include:

```text
auth/
middleware/
api/
routes/
controllers/
server/
db/
database/
migrations/
infra/
terraform/
pulumi/
bicep/
docker/
k8s/
.github/workflows/
.env*
config/
secrets/
prompts/
agents/
tools/
memory/
rag/
```

### For live services

* Confirm authorization before active checks.
* Default to passive inspection.
* Do not exploit vulnerabilities.
* Do not brute force, fuzz, bypass, scrape private data, or stress the service.
* Clearly state whether review was passive or active-authorized.

### For agentic AI systems

Trace every path where untrusted input can influence:

* A system prompt
* A developer prompt
* A tool call
* A downstream agent
* Memory
* RAG retrieval
* Authorization decisions
* External side effects

Authorization must come from policy, identity, capability, or explicit approval, never from model confidence alone.

## Step 5: Rank findings

Each finding must include:

* ID
* Title
* Severity: Critical / High / Medium / Low / Informational
* Locator
* Description
* Impact
* Remediation
* Evidence
* Framework mapping where relevant
* Confidence: High / Medium / Low

High and Critical findings should include a CVSS-lite vector.

Use this calibration:

### Critical

Likely or proven path to severe compromise, such as remote code execution, authentication bypass, tenant isolation break, exposed production secrets, unrestricted privileged agent tool execution, or destructive unauthenticated action.

### High

Realistic path to serious compromise, sensitive data exposure, privilege escalation, unauthorized state-changing action, or high-impact agent/tool misuse.

### Medium

Security weakness with meaningful risk but requiring constraints, chaining, or limited exposure.

### Low

Hardening issue, defense-in-depth gap, or limited-impact misconfiguration.

### Informational

Observation, best-practice note, or coverage limitation.

Do not inflate severity. If it would not wake someone up at 2am, it is probably not Critical.

## Step 6: Produce output

Choose output based on depth.

### Quick scan

Return a concise chat report:

```markdown
# Security Review — <Target>

## Bottom line
<Short risk summary>

## Highest-risk findings
| Severity | Finding | Locator | Fix |

## Coverage
<What was reviewed and what was not>

## Next steps
<Ordered actions>
```

### Standard review

Produce a Markdown report in chat or as a file if the environment supports file output:

```markdown
# Security Review — <Target>
**Date:** YYYY-MM-DD  
**Reviewer:** security-review skill  
**Depth:** Standard  
**Mode:** Passive / Local / Active-authorized

## Executive summary
<≤300 words, plain language>

## Findings summary
| ID | Severity | Title | Locator | Framework |

## Detailed findings

### F-001: <Title>
- **Severity:** High
- **CVSS-lite:** AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:H/A:L
- **Confidence:** High
- **Locator:** file/path.ts:42
- **Description:** ...
- **Evidence:** ...
- **Impact:** ...
- **Remediation:** ...
- **Framework mapping:** OWASP API1 / CWE-862

## Coverage
<Reviewed areas>

## Coverage gaps
<Skipped or unavailable areas>

## Recommended next steps
<Ordered, concrete actions>
```

### Deep audit

Produce:

1. Markdown report
2. JSON findings sidecar
3. Threat model section
4. Abuse-case section
5. Prioritized remediation plan

JSON sidecar shape:

```json
{
  "target": "<target>",
  "date": "YYYY-MM-DD",
  "depth": "quick|standard|deep",
  "mode": "local|passive|active-authorized",
  "findings": [
    {
      "id": "F-001",
      "title": "...",
      "severity": "High",
      "cvss_lite": "...",
      "confidence": "High",
      "locator": "...",
      "description": "...",
      "impact": "...",
      "remediation": "...",
      "evidence": "...",
      "framework_mappings": ["OWASP API1", "CWE-862"]
    }
  ],
  "coverage": {
    "reviewed": [],
    "skipped": [],
    "gaps": []
  }
}
```

## Step 7: Compliance handoff

If the user requested compliance mapping, end with:

```text
Technical findings are ready. Run compliance-review next to map these findings to <framework>.
```

Do not perform formal compliance mapping inside this skill except for lightweight references to OWASP, ASVS, CWE, or similar technical frameworks.

## Refusal boundaries

Refuse or redirect when the user asks to:

* Exploit a real system
* Bypass authentication
* Steal credentials, tokens, cookies, or data
* Evade detection
* Persist access
* Deploy malware
* Perform destructive testing without clear authorization
* Attack a third-party service

Safe alternatives:

* Defensive review
* Threat modeling
* Hardening plan
* Reproduction in a local lab
* Secure test-case design
* Logging/detection recommendations

## Quality bar

A good review has:

* Specific locators
* Accurate severity
* Clear remediation
* Honest coverage gaps
* No vague findings
* No fake certainty
* No unsupported CVE claims
* No exploit instructions
* No compliance theater