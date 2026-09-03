# Goal Charter - Heterogeneous Agent Worker Fabric

**Created:** 2026-08-31  
**Owner:** Clinton Morgan  
**Status:** proposed for Gate 1 ratification  
**Coordinator:** frontier coordinator session operating under this charter  
**Mode:** Governed Heterogeneous Worker Fabric

\---

## 1\. Objective

Evolve the current three-role frontier stack into a governed, heterogeneous execution hierarchy that preserves frontier intelligence for planning, integration, and adversarial judgment while routing routine and specialist work to lower-cost models selected for the task.

The current stack is:

1. **Adversarial Reviewer:** Fable 5 / GPT-5.6 Sol
2. **Coordinator:** Opus 5 / GPT-5.6 Terra
3. **Builder:** Sonnet 5 / GPT-5.6 Luna

This goal changes that topology without weakening the frontier control plane.

The target hierarchy is:

1. **Frontier Judge** for independent adversarial acceptance;
2. **Frontier Coordinator / Foreman** for decomposition, routing, dependency control, and escalation;
3. **Frontier Lead Engineer / Integrator** for architecture-sensitive work, cross-parcel integration, and difficult remediation;
4. **Specialized worker lanes** for coding, tool operation, research, multimodal work, document extraction, reconnaissance, and verification;
5. **Deterministic orchestration contracts** that make routing, evidence, escalation, cost, and acceptance inspectable rather than implicit.

The first release is successful when representative work can be routed through the new hierarchy, routine work no longer requires the frontier Builder by default, critical work still receives frontier integration and adversarial review, worker claims are backed by evidence, and the system can demonstrate equal or better quality with materially better cost and parallelism.

\---

## 2\. Problem statement

The current three-role stack is strong but overly coarse.

A single frontier Builder is asked to perform tasks that have very different capability and assurance needs:

* repository reconnaissance;
* code implementation;
* test generation;
* browser and tool operation;
* research;
* documentation;
* visual interpretation;
* document extraction;
* integration;
* debugging;
* verification; and
* remediation after review.

That creates six avoidable costs:

1. **Frontier token waste.** Routine implementation and reconnaissance consume the same class of model used for architecture-sensitive work.
2. **Weak specialization.** One Builder role must behave as coder, operator, researcher, document analyst, and integrator.
3. **Limited parallelism.** Expensive frontier workers discourage wide fan-out for search, inspection, hypothesis generation, and independent checks.
4. **Correlated error.** A narrow set of frontier models can converge on the same mistaken interpretation without enough heterogeneous challenge.
5. **Blurred assurance.** Building, verification, integration, and adversarial acceptance are different responsibilities but are not always represented as distinct execution stages.
6. **Implicit routing.** Model choice, escalation, confidence handling, and cost controls are often session judgment rather than explicit runtime policy.

This goal does not reduce frontier involvement where frontier judgment is warranted. It moves frontier intelligence upward in the hierarchy so it spends more time deciding, integrating, challenging, and resolving ambiguity instead of performing commodity work.

\---

## 3\. Authority hierarchy

When artifacts or agents disagree, authority resolves in this order:

1. explicit developer ratification or amendment for this goal;
2. this charter's locked decisions;
3. ratified project canon, governance contracts, security constraints, and existing human gates;
4. goal and orchestration contracts created under this charter;
5. parcel specifications created under this charter;
6. model registry and routing policy;
7. coordinator instructions for a specific task;
8. integrator instructions for a specific implementation;
9. worker, verifier, analyst, scout, or specialist output.

No model output is authority merely because the model is stronger, more expensive, or more confident.

No implementation parcel may silently override a locked decision. It stops and requests amendment.

\---

## 4\. Locked decisions

Ratification of this charter makes D1-D30 binding for the first release.

| ID      | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Reasoning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D1**  | The target architecture is a heterogeneous hierarchy, not a replacement of the existing frontier control plane.                                                                                                                                                                                                                                                                                                                                                                                                          | The current Judge and Coordinator remain valuable. The economic and quality opportunity is beneath them.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **D2**  | **Fable 5 / GPT-5.6 Sol remains the Adversarial Judge.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Final high-consequence acceptance benefits from the strongest independent skeptical model available.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **D3**  | The Judge is non-building by default. It may inspect, challenge, request evidence, reject, or return remediation requirements, but does not quietly repair the artifact it is judging.                                                                                                                                                                                                                                                                                                                                   | Reviewer independence is weakened when the judge becomes co-author of the artifact.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **D4**  | **Opus 5 / GPT-5.6 Terra remains the Coordinator / Foreman.**                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Frontier planning is retained for goal decomposition, dependency control, routing, escalation, and synthesis of execution state.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **D5**  | The Coordinator does not perform routine implementation when an authorized worker lane can perform it.                                                                                                                                                                                                                                                                                                                                                                                                                   | The Coordinator is an orchestration resource, not the default workforce.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **D6**  | **Sonnet 5 / GPT-5.6 Luna is promoted from default Builder to Lead Engineer / Integrator.**                                                                                                                                                                                                                                                                                                                                                                                                                              | Luna is more valuable resolving architecture, integration, ambiguity, cross-cutting changes, and difficult remediation than performing every routine edit.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **D7**  | **FW-DeepSeek-V4-Flash-0731 is the default implementation Builder.**                                                                                                                                                                                                                                                                                                                                                                                                                                                     | It becomes the first-choice worker for normal coding, tests, refactoring, repo modifications, technical documentation, and bounded engineering parcels.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **D8**  | **FW-MiniMax-M2.5 is the Agent Operator.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Tool-heavy, browser-heavy, procedural, search, office, and multi-step execution work is separated from primary code generation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **D9**  | **FW-Nemotron-Lightning-3.5-30B-A3B is the Scout / Swarm Worker.**                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Cheap parallel reconnaissance should be a first-class primitive for code search, classification, triage, summarization, candidate generation, and bounded checks.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **D10** | **FW-Nemotron-3-Ultra-NVFP4 is the default independent Verifier / Senior Analyst.**                                                                                                                                                                                                                                                                                                                                                                                                                                      | Verification must be separate from implementation, with a stronger model available before frontier escalation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **D11** | **FW-GLM-5 is the Deep Research / Systems Analysis specialist.**                                                                                                                                                                                                                                                                                                                                                                                                                                                         | It is reserved for difficult research, multi-hypothesis investigation, architecture analysis, complex debugging, and comparison against the default verifier.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **D12** | **FW-Kimi-K2.5 is the primary multimodal worker.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Screenshots, UI, diagrams, rendered pages, charts, and visual evidence should route to a model intended for multimodal reasoning.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **D13** | **FW-PaddleOCR-VL-1.6 is a document extraction specialist, not an autonomous general worker.**                                                                                                                                                                                                                                                                                                                                                                                                                           | OCR and layout extraction are tool-like capabilities and should feed structured evidence to reasoning agents.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **D14** | **FW-GPT-OSS-120B is an optional utility/fallback worker.**                                                                                                                                                                                                                                                                                                                                                                                                                                                              | It may serve structured-output, general reasoning, compatibility, or provider-fallback lanes but is not the default Builder.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **D15** | **FW-DeepSeek-V3.2 and FW-Inkling are not first-release default routes.**                                                                                                                                                                                                                                                                                                                                                                                                                                                | They remain available for later evaluation or specialist use but do not justify additional initial routing complexity.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **D16** | Building, verification, integration, and adversarial acceptance are distinct responsibilities.                                                                                                                                                                                                                                                                                                                                                                                                                           | "The worker says it is done" is not verification, and verification is not final acceptance.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **D17** | Not every task traverses every level.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Mandatory full-stack traversal would destroy the cost and latency advantages of the worker fabric.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **D18** | Risk, task type, required modality, required tools, and objective evidence determine routing.                                                                                                                                                                                                                                                                                                                                                                                                                            | Model prestige or worker preference is not a routing policy.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **D19** | Worker-reported confidence is advisory only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Self-reported confidence is not treated as calibrated probability and never substitutes for tests, evidence, or review.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **D20** | Workers may recommend escalation but cannot self-promote, self-approve, or close a critical task.                                                                                                                                                                                                                                                                                                                                                                                                                        | Routing and acceptance remain owned by higher-authority orchestration.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **D21** | Critical work requires model-family diversity between primary implementation and independent verification wherever practical.                                                                                                                                                                                                                                                                                                                                                                                            | Heterogeneous challenge reduces correlated-error risk.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **D22** | Parallel scout or analyst fan-out is bounded by coordinator-issued concurrency, token, time, and cost limits.                                                                                                                                                                                                                                                                                                                                                                                                            | Swarms are an optimization, not permission for unbounded spend.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **D23** | Worker context is minimized to what the parcel requires.                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | The worker fabric should reduce context cost and contamination rather than clone the full coordinator context into every worker.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **D24** | Every execution returns a structured task result with evidence, changed surfaces, tests/checks, uncertainty, usage metadata, and escalation recommendation where applicable.                                                                                                                                                                                                                                                                                                                                             | Free-form "done" messages are insufficient orchestration state.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **D25** | Model and provider identifiers are registry-driven and versionable. They are not scattered as hard-coded strings throughout orchestration logic.                                                                                                                                                                                                                                                                                                                                                                         | Model upgrades, fallbacks, A/B evaluation, and provider changes must remain controlled.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **D26** | A model upgrade or alias change does not automatically become production default.                                                                                                                                                                                                                                                                                                                                                                                                                                        | Capability and behavior can change behind a familiar name. Promotion requires the evaluation gate defined by this charter.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **D27** | Provider failure does not silently widen authority or skip required verification.                                                                                                                                                                                                                                                                                                                                                                                                                                        | Fallback may change the executing model, not the assurance requirement.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **D28** | Existing external-effect, merge, deployment, publication, security, and human-approval gates remain in force.                                                                                                                                                                                                                                                                                                                                                                                                            | This goal changes cognitive labor routing, not project authority boundaries.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **D29** | The current three-frontier-role path remains available as a safe fallback during shadow mode and early rollout.                                                                                                                                                                                                                                                                                                                                                                                                          | The new fabric must prove itself before it becomes the default path.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **D30** | The first release is evaluation-driven. Routing policy is promoted only after representative real-work comparisons demonstrate acceptable quality, evidence quality, failure behavior, and cost.                                                                                                                                                                                                                                                                                                                         | Benchmarks alone do not prove suitability for this workload.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **D31** | **Bootstrap substitution.** Until a named worker lane exists and is reachable, the Coordinator substitutes the frontier model of equal-or-higher assurance for that risk class, and records the substitution in the routing receipt. Substitution never lowers the assurance requirement.                                                                                                                                                                                                                                | Added by Amendment 1 (finding F1). The parcel table routes Fireworks lanes to parcels that precede the existence of any way to invoke them — WF-P3 is routed to a DeepSeek lane that WF-P5 has not yet built. Without this rule the routing table is internally inconsistent and every Wave 0 cell is unroutable. Consistent with D27: fallback may change the executing model, not the assurance requirement.                                                                                                                                                                                                                                                            |
| **D32** | **Context minimization is a mechanism, not a wish.** D23 is implemented as: (a) per-parcel context assembly is a declared, versioned artifact rather than session judgment; (b) every `INCONCLUSIVE` or `REQUEST\_CHANGES` verifier result records a starvation-versus-capability attribution; (c) the Wave 3 evaluation gate includes a context-sufficiency control arm — the same parcel run under minimized and full context — and no D7–D14 promotion decision may be read as a model verdict until that arm clears. | Added by Amendment 1 (finding F4). D23 carries the entire economic thesis *and* the largest correctness hazard, but its reasoning column merely restated the wish. If context minimization is done wrong, cheap workers fail from starvation rather than incapacity, and Wave 3 silently measures the context policy instead of the models — invalidating the whole baseline comparison. D7 is at least gated by D30; D23 had no gate at all.                                                                                                                                                                                                                             |
| **D33** | **Serialization points.** The model registry and the task/result envelope schemas are declared serialization points. Concurrent parcels do not write them directly: either each lane contributes a fragment composed at build time, or a single named parcel owns the surface for the duration of a wave.                                                                                                                                                                                                                | Added by Amendment 1 (finding F5). WF-P5–WF-P9 depend only on WF-P4 and are therefore dispatchable in parallel under the standing Gate 2 grant, yet all five must record their lane's registry entry; the same file is later mutated by WF-P20, WF-P21, WF-P22, and WF-P24, so the collision window spans three waves. The envelope schemas face the same pressure from WF-P12 and WF-P13 simultaneously in Wave 2. Mitigation is cheap only if made explicit before dispatch.                                                                                                                                                                                            |
| **D34** | **Third-party inference is eligible for `public`-classified work only**, pending Kaseya security review. Internal- and restricted-classified work remains on approved-endpoint, on-platform inference. The model registry must carry a per-tier data-classification eligibility field; a registry that cannot express this restriction is not authoritative for risk eligibility.                                                                                                                                        | Added by Amendment 1 (finding F7), ruled by Clinton Morgan 2026-09-01. The live routing policy records that all current models are approved-endpoint / on-platform inference and enforces monotonic narrowing across public/internal/restricted. Fireworks is third-party off-platform inference, and D7–D14 route real repository content to it. D28 keeps existing security gates in force, and the approved-endpoint posture is such a gate — so absent this decision the charter and D28 are in direct tension. This ruling is upstream of the pending Foundry permission: access authorizes reaching the models, not exposing classified repository content to them. |

\---

## 5\. First-release architecture

```text
                           FRONTIER JUDGE
                     Fable 5 / GPT-5.6 Sol
                     adversarial acceptance
                                ^
                                |
                         critical review
                                |
                     FRONTIER COORDINATOR
                    Opus 5 / GPT-5.6 Terra
                  plan / route / supervise
                                |
          +---------------------+----------------------+
          |                     |                      |
          v                     v                      v
      SCOUT LANE           WORKER LANES          ANALYSIS LANES
      Nemotron             DeepSeek V4           Nemotron Ultra
      Lightning            MiniMax M2.5           GLM-5
          |                Kimi K2.5                  |
          |                PaddleOCR                  |
          +---------------------+----------------------+
                                |
                         evidence/results
                                v
                   LEAD ENGINEER / INTEGRATOR
                   Sonnet 5 / GPT-5.6 Luna
                integrate / remediate / resolve
                                |
                     +----------+-----------+
                     |                      |
                     v                      v
               bounded acceptance      critical/high-risk
                     |                      |
                     v                      v
                    DONE              FRONTIER JUDGE
```

The architecture is capability-based. A task can enter one or more worker lanes without traversing irrelevant specialists.

The primary path for normal implementation is:

```text
Terra Coordinator
    -> DeepSeek Builder
    -> independent verification as required
    -> Luna only when integration/risk requires it
    -> Sol/Fable only when adversarial acceptance requires it
```

\---

## 6\. Role contracts

### 6.1 Adversarial Judge

**Primary model:** Fable 5 / GPT-5.6 Sol

Responsibilities:

* independently test the final artifact against the original goal and locked constraints;
* search for invariant violations, hidden assumptions, incomplete evidence, unsafe scope expansion, and false completion;
* distinguish implementation correctness from evidence sufficiency;
* return `ACCEPT`, `REQUEST\_CHANGES`, `REJECT`, or `REQUIRE\_HUMAN`;
* produce explicit findings tied to requirements or evidence.

Restrictions:

* no routine implementation;
* no self-remediation followed by self-approval;
* no weakening of acceptance criteria to accommodate implementation;
* no treating coordinator or integrator narratives as proof.

For critical review, the Judge receives the original goal, acceptance criteria, relevant locked decisions, final artifact/diff, and evidence. Persuasive completion summaries are non-authoritative.

### 6.2 Coordinator / Foreman

**Primary model:** Opus 5 / GPT-5.6 Terra

Responsibilities:

* decompose goals into parcels and task graphs;
* identify risk, capabilities, tools, modality, dependencies, and evidence requirements;
* select worker lanes from the model registry;
* issue exact scope, constraints, budgets, and acceptance criteria;
* bound fan-out and concurrency;
* track task state and evidence;
* decide escalation;
* route outputs to verifier, integrator, or Judge;
* stop when authority, scope, evidence, or safety is ambiguous.

Restrictions:

* no routine implementation when an eligible worker exists;
* no silently waiving verification because the Builder appears strong;
* no model self-selection outside policy;
* no merging worker output on narrative confidence alone.

### 6.3 Lead Engineer / Integrator

**Primary model:** Sonnet 5 / GPT-5.6 Luna

Responsibilities:

* architecture-sensitive implementation;
* cross-parcel integration;
* interface reconciliation;
* conflict resolution;
* subtle debugging;
* security-sensitive or governance-sensitive implementation;
* difficult remediation after verification or adversarial review;
* final engineering coherence before critical review.

Luna is not the default worker for ordinary bounded implementation.

### 6.4 Primary Builder

**Primary model:** FW-DeepSeek-V4-Flash-0731

Responsibilities:

* bounded code implementation;
* tests;
* refactors;
* repo-local technical documentation;
* configuration changes within explicit scope;
* ordinary debugging;
* deterministic command execution when authorized;
* structured result and evidence reporting.

### 6.5 Agent Operator

**Primary model:** FW-MiniMax-M2.5

Responsibilities:

* browser and web-application interaction;
* multi-tool procedures;
* search and collection;
* repetitive API/tool operations;
* office/document workflows;
* execution of known runbooks;
* evidence collection from external systems when authorized.

The Operator is not a substitute for deterministic tooling where deterministic tooling exists.

### 6.6 Scout / Swarm Worker

**Primary model:** FW-Nemotron-Lightning-3.5-30B-A3B

Responsibilities:

* code and document reconnaissance;
* file and symbol search;
* test-surface inventory;
* issue classification;
* log triage;
* candidate hypothesis generation;
* dependency tracing;
* bounded summarization;
* checklist verification;
* generation of test candidates or review targets.

Scout output is advisory and should normally be compressed before promotion into expensive context.

### 6.7 Independent Verifier / Senior Analyst

**Primary model:** FW-Nemotron-3-Ultra-NVFP4

Responsibilities:

* independently test whether worker output satisfies the parcel;
* inspect changed surfaces and evidence;
* challenge implementation assumptions;
* perform difficult code or research review;
* identify missing tests and likely regressions;
* produce `VERIFIED`, `REQUEST\_CHANGES`, `INCONCLUSIVE`, or `ESCALATE`.

The verifier does not inherit the Builder's conclusion as a premise.

### 6.8 Deep Research / Systems Analyst

**Primary model:** FW-GLM-5

Responsibilities:

* difficult research synthesis;
* multi-hypothesis root-cause analysis;
* architecture and systems analysis;
* long-horizon investigation;
* evidence-for/evidence-against comparison;
* independent analysis when the default verifier is insufficient or when a second senior opinion is warranted.

### 6.9 Multimodal Worker

**Primary model:** FW-Kimi-K2.5

Responsibilities:

* UI and screenshot analysis;
* rendered-page inspection;
* architecture diagrams;
* charts and visual evidence;
* multimodal document understanding;
* visual regression reasoning.

### 6.10 Document Extractor

**Primary model:** FW-PaddleOCR-VL-1.6

Responsibilities:

* OCR;
* tables;
* formulas;
* layout-aware extraction;
* scanned-document transcription into structured intermediate form.

Its output is evidence input to reasoning workers, not final judgment.

### 6.11 Utility / Fallback Worker

**Primary model:** FW-GPT-OSS-120B

Responsibilities:

* structured-output utility tasks;
* provider diversification;
* bounded general reasoning;
* compatibility fallback where its evaluation profile is acceptable.

No fallback bypasses the original risk or verification requirement.

\---

## 7\. Common task envelope

Every dispatched task uses a versioned envelope containing at least:

```yaml
apiVersion: worker.kaseya/v1
taskId:
goalId:
parcelId:
parentTaskId:
role:
taskType:
riskClass:
requiredCapabilities: \[]
requiredModality: \[]
allowedTools: \[]
allowedFiles: \[]
forbiddenSurfaces: \[]
inputRefs: \[]
inputDigest:
acceptanceCriteria: \[]
verificationPlan:
evidenceRequirements: \[]
budget:
  maxInputTokens:
  maxOutputTokens:
  maxWallTimeSeconds:
  maxCostUsd:
  maxParallelChildren:
routing:
  preferredModel:
  fallbackModels: \[]
  diversityRequired:
  escalationTarget:
```

The exact schema may evolve during implementation, but the semantic fields above are first-release requirements.

A worker must not infer mutation authority from context. Mutation scope is explicit.

\---

## 8\. Common result envelope

Every worker, verifier, analyst, or specialist returns a versioned result containing at least:

```yaml
apiVersion: worker-result.kaseya/v1
taskId:
role:
modelRef:
status: COMPLETED | PARTIAL | BLOCKED | REFUSED | FAILED
summary:
requirements:
  satisfied: \[]
  unsatisfied: \[]
  uncertain: \[]
changedSurfaces: \[]
commandsExecuted: \[]
tests:
  passed: \[]
  failed: \[]
  notRun: \[]
evidence: \[]
uncertainties: \[]
confidenceSignal:
recommendedEscalation:
usage:
  inputTokens:
  outputTokens:
  wallTimeMs:
  estimatedCostUsd:
outputDigest:
```

`confidenceSignal` is routing metadata only. It is never proof.

For implementation work, the result must identify changed files or explicitly state that no files changed.

For research work, the result must identify sources/evidence or explicitly state that the required evidence could not be obtained.

\---

## 9\. Risk and routing policy

### Risk classes

| Risk                | Meaning                                                                                                          | Default posture                                                                                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R0 - Mechanical** | Search, classification, formatting, extraction, bounded inspection                                               | cheap worker or specialist; cheap verification where useful                                                                                                                 |
| **R1 - Standard**   | Normal implementation, tests, documentation, routine tool work                                                   | primary worker; independent verification based on task type                                                                                                                 |
| **R2 - Elevated**   | Cross-component behavior, difficult debugging, security-adjacent change, ambiguous research                      | scout fan-out as useful; strong worker; independent senior verification; Luna integration                                                                                   |
| **R3 - Critical**   | Architecture, governance, authorization, security boundary, irreversible external effect, major release decision | frontier coordination; multiple independent analyses as warranted; Luna integration; independent verification; Sol/Fable adversarial review; existing human gates preserved |

### Default routing examples

| Task                             | Primary route           | Verification / escalation                          |
| -------------------------------- | ----------------------- | -------------------------------------------------- |
| Find all callers of an interface | Lightning               | coordinator synthesis                              |
| Inventory regression surfaces    | Lightning fan-out       | Nemotron Ultra if elevated                         |
| Implement a bounded feature      | DeepSeek V4 Flash       | Lightning or Nemotron depending risk               |
| Write/update unit tests          | DeepSeek V4 Flash       | test execution plus verifier as required           |
| Browser research workflow        | MiniMax M2.5            | source/evidence check; GLM for difficult synthesis |
| Complex technical research       | GLM-5                   | Nemotron Ultra or frontier synthesis               |
| Difficult root-cause analysis    | GLM-5 or Nemotron Ultra | Luna if code/integration follows                   |
| Screenshot/UI investigation      | Kimi K2.5               | DeepSeek/Luna implements resulting fix             |
| OCR a scanned document           | PaddleOCR               | reasoning worker validates extracted evidence      |
| Cross-cutting integration        | Luna                    | Nemotron Ultra; Judge if critical                  |
| Final critical acceptance        | Sol/Fable               | human gate where required                          |

### Escalation examples

```text
R0 mechanical:
Lightning / specialist
    -> deterministic check
    -> done

R1 standard code:
DeepSeek
    -> tests
    -> verifier if required
    -> done or Luna

R2 elevated:
Lightning scouts x N
    -> DeepSeek / MiniMax / Kimi / GLM
    -> Nemotron Ultra
    -> Luna integration
    -> done or Judge

R3 critical:
Terra
    -> scouts / parallel analysis
    -> worker implementation
    -> Nemotron Ultra and/or GLM independent challenge
    -> Luna integration
    -> Sol/Fable adversarial review
    -> existing human gate
```

\---

## 10\. Verification and evidence rules

1. **Verification is separate from implementation.**
2. Deterministic evidence is preferred over model assertion.
3. Passing tests support a claim only to the extent those tests cover the acceptance criterion.
4. A verifier must inspect the original parcel requirements, not only the Builder summary.
5. For R2/R3 work, the verifier should normally be from a different model family than the primary Builder.
6. For R3 work, a Builder may not be its own final verifier.
7. Worker-generated tests are useful but do not automatically constitute independent evidence.
8. A failed or inconclusive verifier result routes upward rather than being averaged away.
9. Conflicting senior analyses are surfaced to the Coordinator or Luna; they are not silently collapsed into consensus.
10. The Judge receives unresolved disagreement when it is material.
11. Evidence digests and task/result identity must allow later reconstruction of what input produced what output.
12. Prompts and hidden reasoning are not required as evidence. Observable artifacts, commands, tests, sources, diffs, and structured findings are.

\---

## 11\. Model registry and capability matrix

The first release maintains one authoritative model registry.

Initial logical roles:

```yaml
frontier:
  judge:
    preferred:
      - Fable-5
      - GPT-5.6-Sol
  coordinator:
    preferred:
      - Opus-5
      - GPT-5.6-Terra
  integrator:
    preferred:
      - Sonnet-5
      - GPT-5.6-Luna

fireworks:
  builder:
    preferred: FW-DeepSeek-V4-Flash-0731
  operator:
    preferred: FW-MiniMax-M2.5
  scout:
    preferred: FW-Nemotron-Lightning-3.5-30B-A3B
  verifier:
    preferred: FW-Nemotron-3-Ultra-NVFP4
  deepAnalyst:
    preferred: FW-GLM-5
  multimodal:
    preferred: FW-Kimi-K2.5
  documentExtractor:
    preferred: FW-PaddleOCR-VL-1.6
  utilityFallback:
    preferred: FW-GPT-OSS-120B

parked:
  - FW-DeepSeek-V3.2
  - FW-Inkling
```

The implementation may normalize provider-specific identifiers, but logical role names remain stable.

Each registry entry records:

* provider;
* exact model identifier or alias;
* version/pin where available;
* supported modalities;
* structured-output capability;
* tool/function capability;
* context ceiling;
* concurrency limit;
* cost metadata;
* allowed risk classes;
* permitted roles;
* fallback order;
* evaluation status;
* promotion status; and
* **per-tier data-classification eligibility (added by Amendment 1, D34)** — which of `public` / `internal` / `restricted` the model may serve, respecting the existing policy's monotonic-narrowing invariant. Third-party inference is `public`-only pending security review.

A registry update does not itself authorize production promotion.

\---

## 12\. Evaluation and promotion policy

The worker fabric is promoted by workload evidence, not public benchmark reputation alone.

### Required evaluation classes

The first corpus must include representative examples of:

1. bounded feature implementation;
2. bug diagnosis and repair;
3. test creation;
4. repo reconnaissance;
5. dependency tracing;
6. documentation generation;
7. browser/tool operation;
8. technical research;
9. multi-source evidence synthesis;
10. architecture analysis;
11. multimodal/UI diagnosis;
12. OCR/document extraction;
13. verifier challenge;
14. low-confidence or ambiguous task handling; and
15. failure/refusal behavior.

### Comparison baseline

The baseline is the current stack:

```text
Fable/Sol Judge
    -> Opus/Terra Coordinator
    -> Sonnet/Luna Builder
```

The new fabric runs in shadow or controlled comparison against that baseline before broad promotion.

### Promotion dimensions

For each route, capture:

* task success;
* acceptance-criterion satisfaction;
* test quality;
* regression rate;
* verifier agreement;
* Judge findings;
* evidence completeness;
* rework count;
* latency;
* input/output tokens;
* cost;
* number of model calls;
* escalation frequency; and
* failure mode.

A cheaper route is not promoted if it produces materially worse accepted outcomes.

A more accurate route is not automatically promoted if its cost or latency defeats the purpose of the lane and another route meets the required assurance.

\---

## 13\. Budget and concurrency controls

Every task has bounded execution.

The Coordinator may allocate budgets by risk class and task type, but the runtime must support:

* maximum parallel workers;
* maximum child-task depth;
* maximum wall time;
* maximum total tokens;
* maximum cost;
* per-provider concurrency;
* retry ceilings;
* circuit breakers; and
* cancellation.

No worker may spawn an unbounded swarm.

Scout fan-out should favor breadth followed by aggressive compression.

Expensive models should receive distilled findings and necessary evidence rather than raw duplication of every scout transcript.

\---

## 14\. Failure, fallback, and degraded mode

Provider or model failure must not become an authority bypass.

The runtime distinguishes:

* provider unavailable;
* model unavailable;
* rate limited;
* timeout;
* malformed structured result;
* tool failure;
* budget exhausted;
* verification failed;
* result inconclusive;
* policy refusal.

Fallback rules:

1. fallback must come from the model registry;
2. fallback must satisfy required modality and capability;
3. fallback may not exceed the role's authorized risk class unless explicitly escalated;
4. required independent verification remains required after fallback;
5. critical work does not silently downgrade to a cheap worker;
6. if no compliant route exists, return `BLOCKED` or `REQUIRE\_HUMAN`;
7. the current frontier-only path remains an explicit first-release emergency fallback where existing authority permits it.

\---

## 15\. Parcel decomposition

All implementation parcels require exact Allowed Files, named branches/worktrees where the host workflow supports them, deterministic verification, and independent review proportional to risk.

### Wave 0 - Contracts and authority

| Parcel                                            | Outcome                                                                                                                                                                                                                                                                                                                                                                                                                  | Risk / routing                                                                  | Dependencies             |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ------------------------ |
| **WF-P0 - Existing orchestration reconnaissance** | Map current Judge/Coordinator/Builder lifecycle, model invocation points, configuration, task state, evidence flow, provider adapters, and existing gates. No architecture mutation.                                                                                                                                                                                                                                     | critical / scout + Luna/Terra synthesis                                         | none                     |
| **WF-P1 - Role and authority contracts**          | Encode **D1–D37** into versioned role, authority, risk, and acceptance contracts. *(Scope corrected 2026-09-01: this row read "D1-D30" — the range at Gate 1 — and Amendments 1–3 then added D31–D37 without sweeping it. The amendments' own decisions are binding regardless of this row; the correction removes a stale range that would have under-scoped the parcel encoding them. No new decision is introduced.)* | critical / Luna + independent review                                            | WF-P0                    |
| **WF-P2 - Task and result envelopes**             | Versioned task/result schemas with scope, budgets, evidence, usage, uncertainty, and escalation fields.                                                                                                                                                                                                                                                                                                                  | critical / Luna + verifier                                                      | WF-P1                    |
| **WF-P3 - Model registry and capability matrix**  | **Re-scoped by Amendment 1.** *Extend the existing `plugins/foreman-line/routing-policy` package* — its yaml, schema, and validator — with worker-lane fields: Fireworks roles, pins, capabilities, fallbacks, risk eligibility, per-tier data-classification eligibility (D34), and evaluation state. **Does not create a second registry.** Dispatches only after D63-P1 merges.                                       | elevated / frontier under D31 until the DeepSeek lane is reachable; Luna review | WF-P1, **D63-P1 merged** |

**Wave 0 exit:** current flow is mapped, authority boundaries are explicit, task/result contracts are versioned, and model selection can be expressed without hard-coded orchestration branches.

### Wave 1 - Fireworks worker adapters

| Parcel                                        | Outcome                                                                                                                                                                                                                                                                                                                             | Risk / routing                                                                               | Dependencies |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------ |
| **WF-P4 - Fireworks provider client**         | Provider-neutral invocation adapter with auth isolation, structured output, timeout, retry, usage, error normalization, and model-registry lookup.                                                                                                                                                                                  | critical / Luna + verifier                                                                   | WF-P2, WF-P3 |
| **WF-P5 - DeepSeek Builder lane**             | Normal code/test/doc parcels can execute through FW-DeepSeek-V4-Flash-0731 with exact scope and structured evidence.                                                                                                                                                                                                                | elevated / DeepSeek self-hosted implementation only where bootstrapping permits; Luna review | WF-P4        |
| **WF-P6 - MiniMax Operator lane**             | Tool/browser/procedural tasks can execute through FW-MiniMax-M2.5 with bounded actions and evidence.                                                                                                                                                                                                                                | elevated / Luna + verifier                                                                   | WF-P4        |
| **WF-P7 - Lightning Scout lane**              | Bounded parallel reconnaissance through FW-Nemotron-Lightning-3.5-30B-A3B with compression and fan-out limits.                                                                                                                                                                                                                      | elevated / DeepSeek + verifier                                                               | WF-P4        |
| **WF-P8 - Nemotron Verifier lane**            | Independent verification through FW-Nemotron-3-Ultra-NVFP4 with requirement-first review contract.                                                                                                                                                                                                                                  | critical / Luna + frontier spot review                                                       | WF-P4        |
| **WF-P9 - Specialist lanes**                  | GLM-5 deep analysis, Kimi multimodal, PaddleOCR extraction, and GPT-OSS utility fallback become registry-routable.                                                                                                                                                                                                                  | elevated / role-specific                                                                     | WF-P4        |
| **WF-P27 - Mutation-scope enforcement guard** | **Added by Amendment 1 (finding F3.2).** Checks a task's declared `allowedFiles` / `forbiddenSurfaces` against the surfaces actually changed, and rejects out-of-scope mutation. Produces the enforcement that exit item 15 requires; WF-P2 defines the schema fields and WF-P12 aggregates evidence, but neither builds the guard. | critical / Luna + verifier                                                                   | WF-P2        |

**Wave 1 exit:** every first-release Fireworks role can be invoked through one normalized contract with bounded failures, observable usage, and structured results.

### Wave 2 - Routing, orchestration, and evidence

| Parcel                                                   | Outcome                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Risk / routing                            | Dependencies          |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------- |
| **WF-P10 - Risk and capability router**                  | Deterministic/provider-neutral route selection from task type, risk, capability, modality, policy, registry state, and budget.                                                                                                                                                                                                                                                                                                                                                                                                                                                    | critical / Luna + two independent reviews | WF-P3, WF-P5-WF-P9    |
| **WF-P11 - Bounded fan-out scheduler**                   | Parallel scouts/analysts with concurrency, depth, budget, cancellation, and child-task accounting.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | critical / Luna + verifier                | WF-P10                |
| **WF-P12 - Evidence aggregator**                         | Normalizes tests, diffs, commands, sources, specialist outputs, digests, and uncertainty into task evidence.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | elevated / DeepSeek + verifier            | WF-P2, WF-P10         |
| **WF-P13 - Escalation engine**                           | Routes partial, uncertain, failed, disputed, elevated, or critical work to verifier, GLM, Luna, Judge, or human gate according to policy.                                                                                                                                                                                                                                                                                                                                                                                                                                         | critical / Luna + two independent reviews | WF-P8, WF-P10, WF-P12 |
| **WF-P14 - Luna Integrator contract**                    | Existing Builder path becomes an explicit Lead Engineer / Integrator lane rather than the default implementation route.                                                                                                                                                                                                                                                                                                                                                                                                                                                           | critical / frontier review                | WF-P10, WF-P13        |
| **WF-P15 - Sol/Fable Judge contract**                    | Critical acceptance receives independent inputs/evidence and cannot silently mutate or self-approve.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | critical / frontier + human review        | WF-P13, WF-P14        |
| **WF-P26 - Failure, fallback, and degraded-mode engine** | **Added by Amendment 1 (finding F3.1).** Owns §14 end to end: the ten-way failure taxonomy and the seven fallback rules, including assurance preservation, no silent downgrade, `BLOCKED` / `REQUIRE\_HUMAN`, and the frontier-only emergency path. Fires when a *provider or model* fails mid-task while preserving the original assurance requirement. Satisfies exit item 11 and integration scenario 11, which had no owning parcel: WF-P4 handles per-call retry/timeout, WF-P10 selects routes, WF-P13 escalates *results* — none implements cross-cutting fallback policy. | critical / Luna + two independent reviews | WF-P4, WF-P10, WF-P13 |

**Wave 2 exit:** normal, elevated, and critical tasks can follow different evidence-preserving paths without mandatory full-stack traversal.

### Wave 3 - Evaluation and shadow mode

| Parcel                                  | Outcome                                                                                                                                             | Risk / routing                         | Dependencies         |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | -------------------- |
| **WF-P16 - Workload evaluation corpus** | Representative internal task set and scoring rubric covering implementation, research, operations, specialists, verification, and failure behavior. | critical / frontier-owned acceptance   | WF-P0, WF-P2         |
| **WF-P17 - Baseline harness**           | Replays/evaluates the current three-frontier-role path with the same acceptance criteria and observable cost/latency.                               | elevated / DeepSeek + Luna review      | WF-P16               |
| **WF-P18 - Worker-fabric harness**      | Runs candidate routes against the same corpus with identical evidence and acceptance instrumentation.                                               | critical / mixed workers + verifier    | WF-P5-WF-P15, WF-P16 |
| **WF-P19 - Shadow routing**             | Real eligible work is mirrored or selectively executed through the new fabric without making it the sole default.                                   | critical / Terra coordination          | WF-P17, WF-P18       |
| **WF-P20 - Routing calibration**        | Tune route selection, verification thresholds, fan-out, fallback, and budgets from observed workload results.                                       | critical / Terra + Luna + Judge review | WF-P19               |

**Wave 3 exit:** the new fabric demonstrates equal or better accepted outcomes on the agreed corpus and live shadow sample, with measurable cost/latency behavior and no unresolved critical regression.

### Wave 4 - Promotion and operations

| Parcel                                        | Outcome                                                                                                                                                                           | Risk / routing                  | Dependencies  |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------- |
| **WF-P21 - Standard-route promotion**         | DeepSeek Builder, MiniMax Operator, Lightning Scout, and Nemotron Verifier become approved defaults for their eligible task classes.                                              | critical / Judge + human Gate 3 | WF-P20        |
| **WF-P22 - Specialist-route promotion**       | GLM, Kimi, PaddleOCR, and GPT-OSS fallback lanes become approved where their evaluations satisfy role criteria.                                                                   | elevated / role-specific review | WF-P20        |
| **WF-P23 - Observability and cost reporting** | Per-goal, per-parcel, per-role, per-model quality/cost/latency/escalation telemetry and route audit.                                                                              | elevated / DeepSeek + verifier  | WF-P18        |
| **WF-P24 - Operations and upgrade runbook**   | Model promotion, rollback, alias/version change, provider outage, registry update, and evaluation procedures are documented and tested.                                           | critical / Luna + verifier      | WF-P21-WF-P23 |
| **WF-P25 - Exit evidence manifest**           | Bind charter version, implementation SHA, registry, schemas, evaluation corpus/version, route results, cost comparison, reviewer identities, known gaps, and promotion decisions. | critical / Judge + human review | WF-P21-WF-P24 |

**Wave 4 exit:** the heterogeneous worker fabric is the approved default for eligible tasks, frontier fallback remains available, promotion/rollback is tested, and the evidence manifest proves what was evaluated and what is actually enabled.

\---

## 16\. Explicitly not doing in this goal

* replacing the frontier Judge with a cheaper worker;
* replacing the frontier Coordinator with a cheap dispatcher before separate evidence justifies that change;
* eliminating Luna from architecture-sensitive integration;
* allowing workers to select their own authority level;
* using model-reported confidence as proof;
* accepting a critical Builder result without independent review;
* mandatory invocation of every model for every task;
* unbounded swarms;
* silent model alias upgrades;
* benchmark-only promotion without internal workload evidence;
* weakening existing project security, merge, deployment, publication, or human gates;
* storing unrestricted chain-of-thought as operational evidence;
* giving OCR output final reasoning authority;
* making provider-specific behavior part of core task semantics;
* granting worker models broad external credentials merely because they can operate tools;
* treating lower cost as sufficient reason to accept lower-quality outcomes; or
* deleting the existing frontier-only execution path before rollback evidence exists.

\---

## 17\. Integration scenarios

The goal is not complete until the following scenarios have durable evidence:

1. **Routine implementation:** Terra parcels a bounded code change; DeepSeek implements it; tests run; evidence returns without Luna performing the implementation.
2. **Cheap reconnaissance:** Lightning scouts trace callers, tests, dependencies, and likely regression surfaces in parallel; findings are compressed before frontier context.
3. **Operator workflow:** MiniMax executes a multi-step authorized tool or browser procedure and returns source/action evidence.
4. **Independent verification:** Nemotron Ultra receives original parcel requirements plus artifact evidence and can reject a DeepSeek completion claim.
5. **Integrator escalation:** an R2 cross-cutting change routes from Builder/Verifier disagreement to Luna for integration or remediation.
6. **Critical review:** an R3 architecture or governance change reaches Sol/Fable only after its required evidence and independent review chain is present.
7. **Multimodal diagnosis:** Kimi analyzes a screenshot or UI artifact; the resulting engineering task routes to DeepSeek or Luna rather than Kimi being treated as the code authority.
8. **Document extraction:** PaddleOCR extracts a scanned table/document; a reasoning worker checks and uses the extraction with provenance.
9. **Deep research:** GLM develops competing hypotheses and evidence; Nemotron or frontier synthesis can disagree and preserve the disagreement.
10. **Low-confidence handling:** a worker reports substantial uncertainty; the Coordinator escalates rather than accepting the result because tests happened to pass.
11. **Provider outage:** a Fireworks model is unavailable; a registry-approved fallback is attempted or the task blocks without skipping the original assurance requirement.
12. **Budget exhaustion:** a scout fan-out reaches its budget; children cancel cleanly and the Coordinator receives a partial-evidence result rather than runaway execution.
13. **Model-family diversity:** an elevated DeepSeek implementation receives non-DeepSeek independent verification.
14. **Shadow comparison:** the same representative task can be compared against the existing Luna Builder path using the same acceptance criteria.
15. **Rollback:** promoted worker routing can be disabled and the frontier-only baseline restored without changing goal authority.
16. **Version change:** a model alias/version update remains non-promoted until the required evaluation gate is re-cleared.
17. **Evidence replay:** an operator can reconstruct which task, model, inputs, outputs, tests, verifier, integrator, and Judge participated in a consequential accepted result.

\---

## 18\. Goal exit criterion

This goal exits only when:

1. Waves 0-4 and WF-P0 through WF-P25 are complete or explicitly amended by Gate 1.
2. The original three-role lifecycle is mapped and preserved as a fallback.
3. The model registry is authoritative for worker identity, capability, risk eligibility, and fallback.
4. Task and result envelopes are versioned and used by every promoted worker lane.
5. DeepSeek, MiniMax, Lightning, and Nemotron Ultra successfully serve their intended first-release roles through the normalized provider adapter.
6. GLM, Kimi, PaddleOCR, and GPT-OSS are either promoted for explicit specialist roles or remain clearly marked non-default.
7. Risk-based routing produces different execution paths for R0-R3 without forcing every task through every model.
8. Independent verification is distinct from Builder completion and frontier adversarial acceptance.
9. Luna is no longer the routine default Builder after standard-route promotion, but remains available for integration, difficult implementation, remediation, and fallback.
10. Sol/Fable remains independent for critical adversarial review.
11. Bounded fan-out, cost ceilings, timeout, retry, cancellation, and provider-degraded behavior are tested.
12. The internal workload corpus and shadow-mode evidence demonstrate acceptable quality relative to the current frontier-only baseline.
13. Promotion decisions include cost, latency, evidence quality, rework, and failure behavior rather than success rate alone.
14. A promoted route can be rolled back without changing authority or acceptance policy.
15. No worker can silently widen mutation scope, external-effect authority, merge authority, or human approval.
16. An evidence manifest binds implementation version, model registry, route policy, evaluation version/results, promotion state, and known unsupported cases.

\---

## 19\. Human gates and standing authorizations requested

### Gate 1 - Charter ratification

**REQUESTED.**

Ratification makes D1-D30, the target architecture, WF-P0-WF-P25, evaluation policy, and exit criteria binding.

Any later change that alters the frontier role split, changes which model is authoritative for a role, weakens independent verification, widens external-effect authority, or changes the goal exit criterion requires scoped Gate 1 amendment.

### Gate 2 - Parcel dispatch

**REQUESTED as a standing grant after Gate 1.**

The Coordinator may shape and dispatch WF-P0 through WF-P25 in dependency order, provided each implementation parcel has:

* exact Allowed Files;
* explicit task/risk classification;
* exact acceptance criteria;
* required verification;
* no widened external authority; and
* no conflict with another ratified goal.

The standing grant is void for any parcel that changes a locked decision.

### Gate 3 - Production routing promotion

**Not delegated.**

Changing the default execution path from the current frontier Builder to the new worker fabric remains human-owned.

The Coordinator may prepare implementation, evaluations, shadow-mode evidence, registry changes, and a promotion recommendation, but must stop and present the green chain before production/default-route activation.

Existing repository merge gates remain governed by the owning project and are not superseded by this charter.

\---

## 20\. Stop conditions

The Coordinator stops and reports if any of the following occurs:

* Gate 1 is not explicit;
* a locked decision becomes ambiguous;
* implementation requires changing the frontier Judge, Coordinator, or Integrator authority split without amendment;
* a parcel requires files outside exact Allowed Files;
* a worker must infer mutation authority from prose or ambient context;
* a provider adapter cannot reliably identify which model executed the task;
* structured result validation cannot distinguish malformed output from legitimate refusal/failure;
* a fallback route would lower required assurance;
* critical work would be accepted without independent verification;
* the same model instance or role would build and finally approve its own critical work;
* a worker or verifier attempts to self-promote, self-approve, merge, deploy, publish, or widen scope;
* a model alias changes materially without evaluation;
* a provider outage would require silently skipping a required stage;
* the worker fabric produces materially worse accepted outcomes than the baseline and no bounded remediation is identified;
* cost or fan-out grows without a hard ceiling;
* shadow-mode evidence is insufficient to justify promotion;
* a security, authorization, or external-effect boundary cannot be preserved;
* user-owned or unrelated changes collide with required implementation files;
* a parcel changes another goal's owned serialization point without safe sequencing; or
* the queue is empty and the exit criterion is not fully evidenced.

\---

## 21\. Known implementation constraints

* The current three-role frontier path remains authoritative until Gate 3 promotion.
* Exact repository paths are intentionally not invented by this charter. WF-P0 must locate the live orchestration implementation before implementation parcels claim Allowed Files.
* Model/provider credentials must be isolated from worker prompts and result evidence. **(Amendment 2, D36: strengthened — the Fireworks key is referenced by environment-variable name and never by value, in any artifact this goal produces.)**
* **Transport is `curl.exe` invoked explicitly (Amendment 2, D35).** On Windows a bare `curl` can resolve to a PowerShell alias for `Invoke-WebRequest` rather than the real binary; the same shell-resolution hazard already bites the Node toolchain in this repo, where a Git Bash nvm shim shadows the system Node. Any parcel that shells out states which binary it invoked, by path.
* The worker fabric must not require every worker to receive full goal/session history.
* Provider-specific message formats, tool schemas, and error codes terminate at provider adapters.
* Core orchestration consumes normalized task/result contracts.
* The runtime must record the actual resolved model identity where the provider exposes it.
* Model role names are logical contracts. Provider model identifiers are configuration.
* Evaluation fixtures and scoring must be versioned so routing changes can be compared over time.
* Cost estimates are operational metadata, not acceptance evidence.
* Existing project governance and human approval mechanisms continue to outrank this worker-routing charter where they apply.

\---

## 22\. Gate 1 decision list

Ratifying this charter confirms:

1. the existing frontier Judge remains Fable 5 / GPT-5.6 Sol and remains independent;
2. the existing frontier Coordinator remains Opus 5 / GPT-5.6 Terra and becomes more explicitly orchestration-focused;
3. Sonnet 5 / GPT-5.6 Luna is promoted from routine Builder to Lead Engineer / Integrator;
4. FW-DeepSeek-V4-Flash-0731 becomes the default implementation Builder after Gate 3 promotion;
5. FW-MiniMax-M2.5 becomes the Agent Operator;
6. FW-Nemotron-Lightning-3.5-30B-A3B becomes the Scout / Swarm Worker;
7. FW-Nemotron-3-Ultra-NVFP4 becomes the default independent Verifier / Senior Analyst;
8. FW-GLM-5 becomes the Deep Research / Systems Analysis specialist;
9. FW-Kimi-K2.5 becomes the primary multimodal worker;
10. FW-PaddleOCR-VL-1.6 becomes the document extraction specialist;
11. FW-GPT-OSS-120B is available as an evaluated utility/fallback lane;
12. FW-DeepSeek-V3.2 and FW-Inkling remain parked until a separate evaluation justifies a route;
13. building, verification, integration, and adversarial acceptance remain distinct responsibilities;
14. routing is risk/capability/evidence driven and does not invoke every model for every task;
15. worker confidence is advisory only;
16. model-family diversity is preferred for elevated/critical independent verification;
17. fan-out and cost are mechanically bounded;
18. all worker calls use versioned task/result contracts;
19. model selection is registry-driven and model upgrades require evaluation before promotion;
20. existing external-effect, merge, deployment, publication, security, and human gates remain unchanged;
21. the current frontier-only path remains available through shadow mode and as rollback;
22. WF-P0 through WF-P25 and Waves 0-4 are the initial implementation graph;
23. internal workload evaluation and shadow-mode comparison are required before worker-fabric promotion; and
24. Gate 3 production/default-route promotion remains human-owned.

### Gate 1 record

**RATIFIED 2026-08-31.**

Authorization source: scheduled task directive from Clinton Morgan (`one-time-kickoff`, 2026-08-31). Blanket authorization granted for all approvals, gate removals, bypasses, and non-destructive actions. Ratification language confirmed as the suggested text:

> Ratify the Heterogeneous Agent Worker Fabric charter and authorize standing Gate 2 parcel dispatch under its stated contingencies. Gate 3 production routing promotion remains human-owned.

Gate 2 standing dispatch authorization is **GRANTED** for WF-P0 through WF-P25, subject to the contingencies named in §19.

**Implementation constraint noted at ratification:** Fireworks AI models (D7–D14, WF-P4–WF-P9) require a Foundry project permission that is pending. Wave 0 (WF-P0–WF-P3) can proceed immediately. Wave 1 adapters and all downstream waves are contingently blocked until permissions land; parcels depending solely on Fireworks are placeholders until then.

**Model grade note at ratification:** Gate 1 was recorded by a `claude-sonnet-4-6` scheduled task session. The Coordinator loop requires `claude-opus-5`. Coordinator shaping, dispatch, and triage must wait for an Opus 5 session; the adversarial plan review has been dispatched as a background Fable 5 agent and will deliver its findings to `plan-review-findings.md`.

\---

## 23\. Gate 1 Amendment 1 — 2026-09-01

**RATIFIED 2026-09-01** by Clinton Morgan, in response to the Coordinator's triage of
`plan-review-findings.md`. Scope is limited to the items below; D1–D30 are otherwise unchanged.

Authorization: explicit developer ruling given to the Opus 5 Coordinator session that claimed the
queue on 2026-09-01, across three presented decisions. Amendment closes findings F1, F3, F4, F5, F6,
and F7. Finding F2 remains open by design.

### What this amendment changes

| Change                                                                                                     | Kind                | Closes |
| ---------------------------------------------------------------------------------------------------------- | ------------------- | ------ |
| **D31** — bootstrap substitution rule                                                                      | new locked decision | F1     |
| **D32** — D23 context mechanism and Wave 3 control arm                                                     | new locked decision | F4     |
| **D33** — registry and envelope schemas are serialization points                                           | new locked decision | F5     |
| **D34** — third-party inference is `public`-tier only pending security review                              | new locked decision | F7     |
| **§11** — registry gains a per-tier data-classification eligibility field                                  | field addition      | F7     |
| **§15 WF-P3** — re-scoped to *extend* the existing `routing-policy` package; sequenced after D63-P1 merges | parcel re-scope     | F6     |
| **§15 WF-P26** — failure/fallback/degraded-mode engine (Wave 2)                                            | new parcel          | F3.1   |
| **§15 WF-P27** — mutation-scope enforcement guard (Wave 1)                                                 | new parcel          | F3.2   |

Gate 1 item 22 is amended accordingly: the initial implementation graph is now **WF-P0 through
WF-P27** across Waves 0–4.

### Rulings recorded verbatim

1. **Amendment bundle:** ratify all five (D31, D32, D33, WF-P26, WF-P27). D34 follows from ruling 2.
2. **Data classification:** *"Public tier only, pending security review."* Fireworks models enter
   the registry eligible for `public`-classified work only; internal and restricted remain
   on-platform until Kaseya security rules. Wave 0–1 proceed; the evaluation corpus is built from
   public-tier tasks.
3. **WF-P3 versus D63:** *"Re-scope WF-P3 to extend, sequence after D63-P1."* One registry, no
   parallel vocabulary, no serialization collision.

### What this amendment deliberately does not settle

**Finding F2 (the WF-P4 / WF-P5–P9 boundary) stays open.** The Coordinator agrees with the reviewer
in principle — WF-P4 should become a thin transport with per-lane normalization, and WF-P10 should be
the sole route-*selection* engine with WF-P13 feeding it failure and uncertainty inputs rather than
becoming a second policy engine. The amendment text is deferred until WF-P0 reports how the existing
dispatch layer already normalizes. Drafting it now would mean inventing repository paths, which §21
forbids and which is the precise failure WF-P0 exists to prevent.

### Consequences for the queue

- **Wave 0** is unaffected by D34 — WF-P0 through WF-P3 are recon and contract work executed by
  frontier models under D31.
- **WF-P3** is now blocked on an external event: D63-P1's merge. That merge is human-gated and
  belongs to the `any-repo-runnability` goal, not this one.
- **WF-P4 onward** carries D34's `public`-tier restriction into every routing decision and into the
  Wave 3 evaluation corpus, which must now be constructed from public-tier tasks.
- A Kaseya security review that later widens D34 is itself a scoped Gate 1 amendment.

\---

## 24\. Gate 1 Amendment 2 — 2026-09-01 (provider access path)

**RATIFIED 2026-09-01** by Clinton Morgan. Scope is the Fireworks access mechanism only.

### What changed

Fireworks access **no longer runs through an Azure AI Foundry project**. Kaseya will call the
**Fireworks.ai API directly**, with a working API key already in hand. **Gate B (the pending Foundry
permission) is dissolved** — it was never granted and is no longer required.

This removes the *access* blocker on Waves 1–4. It does **not** remove D34: third-party inference
remains `public`-tier only pending Kaseya security review, and Clint has ruled (2026-09-01) that the
security escalation waits until Wave 0 produces a concrete registry proposal to review. **Gate A
stands alone and is now the only Fireworks gate.**

### New locked decisions

| ID      | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                               | Reasoning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D35** | **Fireworks is reached over its own public API, not through an intermediary platform project.** The provider adapter targets the Fireworks.ai HTTP API directly. First-release transport is **`curl`**, invoked as an explicit `curl.exe` on Windows; migrating to a vendor SDK is explicitly out of scope for this release and requires no amendment when it later happens, because §21 already terminates provider-specific behavior at the adapter. | Added by Amendment 2. The Foundry route was a dependency on a permission that never landed and a platform boundary the goal did not need. Direct API access removes a whole blocking gate at the cost of owning transport details, which the adapter boundary was designed to absorb. Naming `curl.exe` explicitly is not pedantry: on Windows, `curl` has historically resolved to a PowerShell alias for `Invoke-WebRequest` rather than the real binary, and this repo's lessons already record a shell-resolution trap of exactly that shape. |
| **D36** | **The Fireworks credential is referenced by environment-variable name and never by value.** The key does not appear in a spec, kickstarter, prompt, task envelope, result envelope, routing receipt, evidence artifact, log, test fixture, or commit. Any parcel that needs the key names the variable; a parcel that needs a *live* call and cannot get one records the gap and stops rather than embedding a credential to proceed.                  | Added by Amendment 2. §21 already required credential isolation from worker prompts and result evidence, but that was written when access was a platform permission rather than a bearer token sitting in an environment. A bearer token is a different hazard class: it leaks by being pasted, and every artifact this goal produces is designed to be durable and reviewable. D24 requires structured results carrying evidence and usage metadata — exactly the artifacts a careless adapter would log a header into.                          |

### Consequences for the queue

- **Wave 1 is no longer access-blocked.** It remains *sequence*-blocked behind Wave 0, and WF-P3
  additionally behind D63-P1's merge, so the immediate queue order does not change.
- **WF-P4's scope shifts** from "Foundry-mediated provider client" to "direct Fireworks HTTP adapter
  over `curl.exe`," with auth isolation (D36) as a first-class acceptance criterion rather than an
  implementation detail.
- **Every Wave 1 lane parcel and the Wave 3 corpus inherit D34** — live calls exercise `public`-tier
  content only until security rules otherwise.
- **Open question, unresolved at Amendment 2:** whether a dispatched agent session may make *live*
  Fireworks calls at all. **RESOLVED by Amendment 3 (§25) — yes, under four conditions.**

\---

## 25\. Gate 1 Amendment 3 — 2026-09-01 (live agent calls)

**RATIFIED 2026-09-01** by Clinton Morgan, resolving the question Amendment 2 left open.

### The ruling

**A dispatched agent session may make live Fireworks calls.** Agents are not restricted to recorded
fixtures, and live smoke tests need not be human-run.

### D37 — live calls, and the four conditions that bound them

| ID      | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Reasoning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D37** | **A dispatched agent session may make live Fireworks API calls**, subject to four conditions, each of which is an acceptance criterion for any parcel that makes them: **(a) public-tier content only** — a live call may carry only `public`-classified content (D34); repository source, configuration, and internal documentation are ineligible until security rules otherwise. **(b) Credential by name only** — the session's environment carries the key; the session never emits its value (D36), and any recorded request/response evidence is scrubbed of authorization headers before it becomes an artifact. **(c) Live calls are a separately-marked lane, excluded from the deterministic default suite** — `npm test` for any package must pass with no network and no key present; live calls live behind an explicit opt-in the default run does not take. **(d) Spend is bounded by the parcel's declared `routing_class` ceiling** — the existing `ceiling_usd` in `routing-policy/routing-policy.yaml` governs, and a parcel expecting to exceed its class ceiling says so in its spec and gets a ruling before dispatch, rather than discovering it at runtime. | Added by Amendment 3. The ruling itself is Clint's; the four conditions are the existing canon it collides with, made explicit rather than left to be rediscovered. **(a)** is D34 unchanged — the access ruling never widened the eligibility ruling. **(b)** is D36 extended to the artifact path, because a live call is the first thing in this goal that actually handles a bearer token. **(c)** protects a repo invariant older than this goal: verification passes here are deterministic, and folding network calls into the default suite would make every CI run nondeterministic *and* chargeable — the failure would present as flake, and the bill would arrive separately. **(d)** reuses the cost vocabulary already in the routing policy rather than inventing a second one, satisfying D22's requirement that fan-out and spend be mechanically bounded rather than left to session judgment. |

### Consequences for the queue

- **No immediate change.** WF-P0 is read-only reconnaissance and makes no calls. The ruling binds
  from **WF-P4** onward, where the provider adapter first has something to call.
- **WF-P4's verification plan is now writable**, which it was not before: it can require a live smoke
  test behind the opt-in lane of D37(c), with recorded fixtures serving the deterministic default
  suite. Both, not either.
- **WF-P8 (Nemotron Verifier lane) gains a hazard worth naming at shaping time:** a verifier that
  makes live calls is spending real money on every rework cycle. Its spec should state the expected
  call count per verification, not just its ceiling.
- Conditions (a) and (d) both remain revisable only by scoped Gate 1 amendment — (a) by the Kaseya
  security review that D34 defers, (d) by a routing-policy change that is itself another goal's
  owned surface (finding F6).


## 26\. Gate 1 Amendment 4 — 2026-09-02 (D19 audit allowlist)

**Coordinator ratification** under the blanket authorization of 2026-09-02. Recorded here because
the D19 ratified-package allowlist is a governed enumeration, and adding to it is a ratification
act, not a fix.

### What happened

Wave 0's merge chain went red in CI's per-package sweep — three failures in
`plugins/foreman-line/verification`. The audit was not broken. It was **refusing**, by design:

```
d19-audit: package 'role-authority' exists on disk under the plugin root but is NOT in the
ratified allowlist (A2.2) — it would otherwise be silently unswept; ratify it (coordinator
amendment) or remove it
```

### D64 — the two Wave 0 packages are ratified into the D19 sweep

| ID      | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Reasoning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D64** | `role-authority` (WF-P1) and `worker-envelopes` (WF-P2) are **ratified into `RATIFIED_PACKAGES`**, taking the D19 sweep from 15 packages to 17. The 8 class-2/class-3 instances this exposed in the new code are **pinned against existing ratified dispositions**, each enrolled on verified evidence rather than shape: the two `generate.ts` files are byte-identical to the already-pinned `contracts/src/generate.ts`, and the two class-3 literals were confirmed mechanically to be DATA — every consumer is `serialize()` or a string-equality assertion, no `join`/`resolve`/filesystem read reaches `.path`. E4 goes 18 → 24; class-3 pins 2 → 4. The allowlist moves to its own module so the audit and its tests read **one** list; the test's hand-written duplicate is **deleted, not corrected**. | A new package must not join a governance sweep merely by existing — A2.2's both-way check exists so that it cannot, and the refusal is that mechanism working. The pins are the harder half: E4's disposition says sites are "never enrolled by shape alone", so resemblance to the eight existing `generate.ts` pins was not accepted as sufficient; byte-identity was established by `diff` and the class-3 data claim by sweeping the consumers. The duplicate list is deleted rather than bumped because that duplication **is** lesson #73's defect class (a hand-enumerated set going stale invisibly) and lesson #72's rule — a fix that documents a dependency instead of removing it will recur. Both new pins were guard-bitten: unpinning one turns the audit red twice over (unruled sites **and** a cardinality mismatch), and the same glob under a different property name is reported `[class 3]`, proving the pin is location-bound rather than file-bound. |

### Standing consequence for every future parcel that adds a package

**A parcel that creates a new package under `plugins/foreman-line/` has an obligation outside its
own directory:** it must ratify itself into the D19 allowlist and dispose of whatever the sweep then
finds. None of WF-P1/WF-P2's `surfaces:` blocks named `verification/`, so all three Wave 0 PRs went
red at the same place. Any future parcel creating a package **must name the D19 allowlist in its
`surfaces:`** at shaping time. This is the lesson-#74 candidate recorded at Wave 0 closure.

## 27\. Gate 1 Amendment 5 — 2026-09-02 (ChatGPT endpoint approval)

**RATIFIED 2026-09-02** by Clinton Morgan: *"All Chat GPT endpoints are approved by Kaseya."*

### D65 — what the ruling settles, and what it deliberately does not

| ID      | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Reasoning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D65** | **ChatGPT/OpenAI endpoints are Kaseya-approved.** The Codex runtime-profile models (`codex-sol`, `codex-terra`, `codex-luna`, D63) may therefore carry a `provenance:` declaration instead of blocking on an unmade security determination. This **unblocks F7's fix**, which was deferred solely because closing it would have forced classifying those three models. The ruling is scoped: it covers **OpenAI/ChatGPT endpoints only**. It says nothing about **Fireworks.ai**, which is this goal's actual third-party inference provider, so **D34 stands unchanged** — Fireworks lanes remain public-tier-only pending Kaseya security review. | Recorded as ratified because it is the developer's own ruling, not a coordinator inference. The scoping matters more than the permission: F7 and the Codex question were the same question *because* the natural fix required declaring the Codex models, and that is now answerable. But "approved" is an approval **to use**, and the eligibility tiers (`public`/`internal`/`restricted`) are a second question this ruling does not reach. Reading a use-approval as a restricted-data eligibility grant would be exactly the laundering of a security decision through an implementation detail that WF-P3 refused twice. So the tier assignment stays open and named, rather than being quietly inferred here. |

### Consequences

- **F7 is no longer blocked**, and is no longer recorded as needing a developer ruling. It carries
  one remaining input: the **eligibility tier** for the approved Codex models.
- **F7's fix is NOT retrofitted into Wave 0.** WF-P3 took three review rounds and twelve independent
  reviewers on this exact surface; reopening a merged security gate at Wave 0 closure would spend
  that assurance for no schedule gain. It lands in **WF-P5** with its own review.
- **D34 remains the sole open Gate.** The Fireworks security review is untouched by this ruling.

## 28\. Gate 1 Amendment 6 — 2026-09-02 (key delivery, Codex tier, and a credential incident)

**RATIFIED 2026-09-02** by Clinton Morgan. Closes the two open questions that stood between Wave 0
and Wave 1, and records a security incident that occurred while closing them.

### D66 — the approved Codex models are eligible up to `internal`, not `restricted`

| ID      | Decision                                                                                                                                                                                                                                                                                                                                                                                                                            | Reasoning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D66** | The D65-approved Codex models (`codex-sol`, `codex-terra`, `codex-luna`) are eligible for **`public` and `internal`** classified work. They are **not** eligible for `restricted`. F7's fix therefore lands in WF-P5 as: every model in top-level `internal`/`restricted` `eligible_models` must carry a `provenance:` entry, **and** the three `codex-*` models are removed from `data_classification.restricted.eligible_models`. | Clint's ruling, taken on the mechanics rather than on posture. `evaluateRouting` builds its eligible set from `data_classification[tier].eligible_models` and, finding nothing, throws `NO_ELIGIBLE_MODEL` — it refuses rather than falling back to another profile. The `codex` runtime profile is `codex-*` at **all three** tiers (`frontier: codex-sol`, `standard: codex-terra`, `economy: codex-luna`), so restricting the models restricts the entire profile. **The number that decided it: all 11 specs in this repo are `data_classification: internal`** — none `public`, none `restricted`. So `public` would have made Codex unroutable for every parcel ever written here, effectively shelving D63-P1; `restricted` would have granted authority over a tier that has never once been exercised. `internal` costs nothing today, matches what D65 actually approved (approved endpoints doing ordinary work), and keeps `restricted` genuinely reserved so the first classification of truly sensitive data is a deliberate decision rather than one inherited from today. The validator's narrowing invariant (`restricted ⊆ internal ⊆ public`, D6) makes the removal mechanical rather than a matter of judgment. |

### D67 — key delivery is a User-scope environment variable, and what that does not cover

| ID      | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Reasoning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D67** | `FIREWORKS_API_KEY` is delivered as a **Windows User-scope environment variable**, set by the developer outside the repository. This closes open question 5 and **unblocks WF-P4 and Wave 1**. Two constraints ride with it, both mechanical rather than stylistic: **(a)** a process inherits its environment at launch, so **WF-P4 must be dispatched from a session started after the variable was set** — a subagent inherits the dispatching session's environment, not the User scope, so an old session cannot hand the key to a new agent; and **(b)** WF-P4's spec must **assert the variable is present and non-empty and refuse loudly if not**, rather than discovering its absence in an HTTP 401. | The mechanism is the developer's choice and it is the right one — it satisfies D36 without the repository ever holding the value. The two constraints are recorded because both were observed, not predicted: a live scope check found the variable set at User scope and **not visible to the already-running session** that checked it. A `.env` file at `foreman-config/.env` also exists and holds the same key wrapped in double quotes — two characters that would be sent verbatim by `curl.exe -H "Authorization: Bearer $KEY"` and rejected. Two copies of one credential is a hazard in itself: the environment variable is **authoritative**, and the `.env` file should be removed or reduced to a name-only example once the key is rotated. |

### Incident — the coordinator leaked the credential value into a transcript

**Recorded because a security rule that only appears in charters is not a control.** While comparing
the two credential copies *by hash specifically to avoid printing either*, the coordinator defined a
PowerShell helper named `H`. That collided with the built-in `h` alias for `Get-History`, and the
parameter-binding error **echoed the key value in full, twice**, into the session transcript.

- **Consequence:** the key is compromised and was rotated. The `.gitignore` hardening of the same
  day (PR #178) was irrelevant to this path — nothing was committed; the leak was to a transcript.
- **The lesson is not "be careful".** It is that **a redaction technique whose failure mode prints
  the input is not a redaction technique.** Hashing was the right instinct; routing the secret
  through a shell whose error messages quote their arguments defeated it. Handle a credential with a
  construct that cannot echo it on failure — compare lengths, test presence as a boolean, or hash in
  a process that never receives the value as an argument.
- **Installed** as STANDING-CONSTRAINTS Builder #30 (both copies) and lessons ledger #75, so the
  rule reaches the agents that handle credentials rather than living here.

### D67 consequence — the D19 audit's own location-independence was broken

Placing a credential file inside a ratified package surfaced a defect in the audit that exists to
catch location dependence. **The audit sweeps the filesystem, not git.** `foreman-config/.env` is
gitignored, so it is absent in CI and present on any developer machine holding a provider key — and
the audit **refused locally while passing in CI on the same commit**. That is lesson #72's class one
level up: a result whose truth depends on the machine it ran on. Any developer with a working key
could not run the D19 audit at all, and had no way to know CI disagreed.

`.env` and `.example` are ratified into `DATA_EXTENSIONS` (skipped deliberately, never opened),
which removes the divergence rather than relocating it. **Skipping is classification, not
tolerance:** the credential is delivered by environment variable and never read from there, and the
`.env` file remains a redundant second copy of a rotated secret that should be deleted.

## 29\. Gate 1 Amendment 7 — 2026-09-02 (credential resolution)

> **RATIFIED 2026-09-02** by Clinton Morgan, on merging PR #180 and confirming the merge was the
> ratification act rather than a record-only landing. Drafted by the Opus 5 Coordinator on resuming
> the goal; it corrects a mechanical claim inside ratified D67 and adds an acceptance criterion to a
> not-yet-shaped parcel, so it changed a locked decision and Gate 2's standing grant did not cover
> it. **WF-P4 is no longer gated on this amendment.** D68(b) is now a binding acceptance criterion
> on WF-P4's spec, not a proposal.
>
> *The ambiguity is recorded because it will recur: #180 bundled a decision needing ratification
> with lessons #74/#76 and a COORDINATOR-PATTERN install that stood on their own, so the merge alone
> did not distinguish "I ratify this" from "land the record." A decision requiring Gate 1 should ship
> in a PR carrying nothing else.*

### D68 — credential resolution must be ancestry-independent, because D67(a)'s test is not sound

| ID      | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Reasoning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D68** | **(a)** D67(a)'s precondition — "dispatch WF-P4 from a session started after the variable was set" — is **corrected, not merely restated**. Environment inheritance follows **process ancestry**, not wall-clock session age: a process receives a *copy of its parent's* environment block at launch. The corrected test is that **no process in the launching ancestry may predate the variable**. **(b)** Rather than depend on that test holding, **WF-P4's credential resolution must be ancestry-independent** and carries this as an acceptance criterion: resolve `FIREWORKS_API_KEY` from the process environment; if absent **and** the platform is Windows, fall back to the User-scope value via `[Environment]::GetEnvironmentVariable('FIREWORKS_API_KEY','User')`; if still absent or empty, **refuse loudly** (D67(b), unchanged). The fallback references the credential **by name only** and never by value, so D36 is preserved. | **Both halves were observed, not predicted, and the second overturned the coordinator's own inference.** This session was launched at 10:04:51, forty-eight minutes *after* the variable was set at 09:16 — and D67(a)'s test therefore passed — yet `[bool]$env:FIREWORKS_API_KEY` was **`False`**. Walking the ancestry explained it: `claude.exe` (10:04:51) was launched by `Code.exe` started **2026-08-28 07:27**, five days before the variable existed. Windows broadcasts `WM_SETTINGCHANGE` on a User-scope write, but only processes that handle it re-read the environment; a long-lived editor does not, and hands its children the stale block it has held since launch. **A precondition stated in terms of an observable the coordinator can see (session start time) rather than the mechanism that governs it (ancestry) will pass while being false** — which is exactly what it did. For (b): the coordinator then asserted that a dispatched subagent could not see the key either, and **tested it rather than trusting it**, per Wave 0's standing finding that this goal's most expensive defects were specs asserting properties the code did not have. A probe subagent reported process scope **absent** but **User scope readable, length 25** — from inside the subagent. So the registry read works today with no restart, and it removes the ancestry dependency permanently rather than papering over today's instance. It is also the portable shape: in CI and containers there is no User scope, the process environment is the only source, and the same loader degrades to exactly D67(b)'s loud refusal. |

**What this does not change.** D67's substance stands: the environment variable is the delivery
mechanism and it is authoritative; the repository never holds the value; D36 and D67(b) are
untouched. Restarting the editor remains a valid way to satisfy the corrected test — it is simply no
longer the *only* way, and no longer the thing WF-P4's correctness rests on.

### Two disposals still outstanding from D67, verified on disk 2026-09-02

1. **`plugins/foreman-line/foreman-config/.env` still exists** (45 bytes) and still holds the
   credential **quote-wrapped** — the two characters `curl.exe` would transmit verbatim and be
   rejected for. Its value was compared to the User-scope value **in-process, by `-ceq`, emitting
   only a boolean** (lesson #75's remedy applied to the check that caused lesson #75): they
   **match**, so this is the rotated key, not a stale pre-rotation copy. It is gitignored and
   cannot reach a commit, but it remains the second storage location for one secret that D67
   already ruled should be deleted. `.env.example` is present and tracked, so nothing is lost by
   removing it. **Recommend deletion; it is a developer action on a credential file, not a
   coordinator one.**
2. **The key is 25 characters** (`fw_` + 22, no whitespace, not quote-wrapped at User scope).
   Recorded as an observation, **not** a validation: whether it authenticates is a live-call
   question, and under D37(c) live calls belong to a parcel's opt-in lane, not to the coordinator,
   who consumes verification and does not produce it. **WF-P4's first live call is the first real
   test of this key**, and D68(b)'s loud refusal covers only absence, not invalidity.
