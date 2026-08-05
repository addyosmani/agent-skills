# BioStack ToolUniverse Scientific Research Sidecar

## Mission

Design and implement a bounded ToolUniverse integration that strengthens BioStack’s compound research, evidence ingestion, dosage-context extraction, mechanism analysis, adverse-event research, and pathway intelligence.

The integration must fit the existing BioStack backend rather than creating a parallel architecture.

Repository:

```text
D:\Repos\BioStack
```

Do not begin implementation until the current backend, ingestion lifecycle, governance controls, data model, and deployment topology have been inspected and documented.

---

## Product intent

BioStack is an evidence-informed protocol intelligence and harm-reduction platform.

It must help users understand:

* What published research studied
* What amounts, routes, schedules, and escalation patterns were used
* Which populations were studied
* What outcomes were reported
* What adverse events and discontinuations occurred
* What remains unknown, conflicting, extrapolated, or unsupported
* How a user-recorded protocol compares with reviewed evidence
* Whether an entered amount appears materially outside the researched context

BioStack must not withhold useful evidence merely because that evidence includes dosage or treatment context.

BioStack must also not transform research evidence into an invented personal prescription.

### Required distinction

BioStack may say:

> Reviewed trials initiated participants between 0.5 and 1.0 mg weekly and used the following escalation schedules.

BioStack may say:

> The recorded 12 mg amount is 12 to 24 times the initiation range used in the reviewed trials. No reviewed trial in this evidence set initiated participants at 12 mg.

BioStack may say:

> The reviewed evidence supports a lower-exposure initiation context than the amount entered.

BioStack must not say:

> You should take 0.5 mg.

BioStack must not say:

> 0.5 mg is safe for you.

BioStack must not calculate a personalized dose from age, weight, sex, goals, symptoms, or other profile fields.

Personal context may be used to explain evidence applicability, such as whether a user resembles or differs from a study population. It must not be used to manufacture a personalized prescription.

---

# Phase 0: Establish repository truth

## 0.1 Inspect the existing architecture

Before writing code, inspect and document:

* Solution and project structure
* Domain, Application, Infrastructure, and API boundaries
* Current .NET and database versions
* Dependency-injection patterns
* Background job and queue infrastructure
* Existing provider interfaces
* Existing knowledge-ingestion interfaces
* Admin intake workflows
* Resolve, stage, review, reject, defer, approve, and promote states
* Provenance and source-lane receipt handling
* Duplicate-intake and retry behavior
* Knowledge-ingest fences and overrides
* Existing compound and evidence entities
* Citation and evidence-tier models
* Current migrations
* Current API surfaces
* Existing tests and architectural guards
* Configuration, secrets, deployment, and Docker support
* Current privacy boundaries for local and hosted data
* Any Commander or Protocol Intelligence dependency on the knowledge base

BioStack currently describes a Clean Architecture backend using .NET, SQLite, domain services, structured compound knowledge, citations, pathway intelligence, calculators, and profile-contextualized outputs. Verify the implementation rather than relying solely on documentation.

## 0.2 Determine the correct integration seam

Research and explicitly decide whether ToolUniverse should integrate through:

1. An existing BioStack provider interface
2. An extension of the current knowledge-intake pipeline
3. A new scientific-research provider abstraction
4. A combination of the above

Prefer reuse over duplication.

Do not create a second review lifecycle if the existing intake, staging, promotion, provenance, retry, and knowledge-ingest controls can support this work.

## 0.3 Produce an architecture decision record

Create an ADR covering:

* Current backend integration points
* Selected integration seam
* Why a Python sidecar is preferred or rejected
* Transport selection
* Job lifecycle
* Data ownership
* Persistence ownership
* Failure behavior
* Privacy boundary
* Security boundary
* Tool allowlisting
* Version pinning
* Review and promotion workflow
* Rollback and kill-switch behavior

No implementation should proceed until this ADR is complete.

---

# Phase 1: Reconcile the guidance boundary

The existing BioStack legal and governance drafts prohibit recommending a dose or generating personalized dose, titration, route, or treatment instructions.

The intended product posture now permits richer harm-reduction support using published evidence.

Create a formal decision record that distinguishes the following classes.

## Class A: Published evidence context

Permitted:

* Trial initiation amounts
* Trial escalation schedules
* Maintenance ranges
* Frequency and route used in a source
* Study duration
* Population characteristics
* Inclusion and exclusion criteria
* Outcomes
* Adverse events
* Discontinuation rates
* Regulatory label information
* Official safety communications
* Case-report amounts
* Observational or community-reported patterns, clearly labeled as such

## Class B: Evidence comparison

Permitted with reviewed wording:

* Comparing a user-recorded amount with published study ranges
* Calculating how many times higher or lower an entry is than a researched amount
* Identifying that no reviewed study used a comparable initiation amount
* Showing that evidence is unavailable for a route, frequency, combination, or population
* Flagging unit mismatches and likely decimal errors
* Identifying that evidence comes from animals, in-vitro work, case reports, or uncontrolled observations
* Showing that an entered plan differs materially from reviewed research protocols

## Class C: Evidence-guided harm-reduction context

Permitted only through an approved content contract:

* Highlighting lower-exposure initiation patterns found in credible human evidence
* Showing escalation approaches used in trials
* Explaining that slower or lower initiation was used to manage tolerability in a cited source
* Showing what researchers monitored
* Showing conditions that led to treatment interruption or discontinuation
* Surfacing official contraindications or warnings with exact scope
* Encouraging review before proceeding when an entry is materially outside the available evidence

## Class D: Personalized medical direction

Remain prohibited unless BioStack deliberately changes product and regulatory posture:

* Selecting the correct dose for a person
* Giving a personalized titration schedule
* Diagnosing a condition
* Declaring an amount safe
* Declaring a protocol appropriate
* Replacing clinical monitoring
* Predicting that a user will experience a particular outcome
* Automatically changing a protocol
* Issuing an uncited start, stop, increase, decrease, combine, or substitute instruction

## Required deliverable

Create a versioned `BioStack Guidance Content Contract` defining:

* Permitted output classes
* Prohibited output classes
* Required evidence fields
* Required warning fields
* Required uncertainty language
* Required approval levels
* Examples and counterexamples
* Copy-guard terms
* Escalation rules
* Policy and consent impacts

Do not expose new dosing-context behavior publicly until the product canon, legal drafts, governance manual, and human approval records are reconciled.

---

# Phase 2: Implement the sidecar boundary

## Preferred architecture

Use a separately deployable Python scientific-research sidecar.

```text
BioStack API / Application
        |
        | BioStack-owned typed research contract
        v
Scientific Research Sidecar
        |
        | Allowlisted workflows only
        v
ToolUniverse Python SDK and approved scientific sources
```

ToolUniverse supports Python integration, CLI use, MCP integration, and scientific workflows across more than 1,000 resources. Its skills compose multiple scientific tools into research workflows.

### Important implementation rule

The BioStack backend must not receive unrestricted access to the full ToolUniverse registry.

The sidecar must expose narrow, BioStack-owned operations such as:

```text
ResolveCompoundIdentity
ResearchCompoundEvidence
ResearchPublishedRegimens
ResearchAdverseEvents
ResearchMechanismsAndTargets
ResearchPathways
RefreshEvidencePacket
GetResearchJob
CancelResearchJob
```

Do not expose a generic production endpoint equivalent to:

```text
ExecuteAnyTool(toolName, arbitraryArguments)
```

## Transport

Evaluate transport during the ADR.

Default preference:

* Internal HTTP or gRPC between the .NET backend and Python sidecar
* Asynchronous job semantics for long-running research
* JSON Schema or Protobuf contracts owned by BioStack
* MCP may be used by development agents, but raw MCP should not define BioStack’s canonical domain contract

ToolUniverse supports asynchronous MCP tasks for scientific operations that may take minutes. BioStack should preserve equivalent job, status, progress, cancellation, and retry semantics even if the production transport is not MCP.

## Sidecar restrictions

The sidecar must:

* Run as a non-root user
* Be internal-only
* Require service authentication
* Use an outbound network allowlist where practical
* Use read-only application filesystems where practical
* Have CPU, memory, duration, and concurrency limits
* Disable arbitrary Python or shell execution
* Disable tools outside the approved allowlist
* Store secrets outside source control
* Redact secrets and sensitive arguments from logs
* Pin ToolUniverse to an exact tested release or commit
* Generate an SBOM
* Record upstream licenses and terms
* Support a global kill switch
* Support per-workflow kill switches
* Fail closed when required sources or identifiers cannot be resolved

ToolUniverse is actively changing, including additions and registry-drift fixes, so exact version pinning and contract tests are mandatory.

---

# Phase 3: Protect the local-first boundary

The initial integration must not transmit user health or protocol data to ToolUniverse or its downstream APIs.

Permitted sidecar inputs:

* Compound name
* Known compound identifiers
* Research question
* Public disease or pathway name
* Public citation identifier
* Requested evidence categories
* Research freshness date
* Approved source filters

Prohibited sidecar inputs for the first implementation:

* User identity
* Account identifier
* Age
* Sex
* Weight
* Symptoms
* Biomarkers
* Check-ins
* Personal protocol history
* User notes
* Provider information
* Uploaded health documents
* Any directly or indirectly identifying health data

The sidecar gathers general scientific evidence.

BioStack performs user-specific comparison locally, after the reviewed research data has entered BioStack’s trusted knowledge layer.

This prevents ToolUniverse and its downstream sources from becoming processors of personal protocol data during the initial implementation.

---

# Phase 4: Create the BioStack scientific research contract

Create a provider-neutral contract that does not leak ToolUniverse-specific response formats into the Domain or Application layers.

Suggested abstractions:

```csharp
public interface IScientificResearchProvider
{
    Task<ResearchJobHandle> SubmitAsync(
        ScientificResearchRequest request,
        CancellationToken cancellationToken);

    Task<ResearchJobStatus> GetStatusAsync(
        ResearchJobId jobId,
        CancellationToken cancellationToken);

    Task<ScientificResearchArtifact> GetResultAsync(
        ResearchJobId jobId,
        CancellationToken cancellationToken);

    Task CancelAsync(
        ResearchJobId jobId,
        CancellationToken cancellationToken);
}
```

Names may be changed to fit current repository conventions.

## Required request fields

```text
Research request ID
Research subject type
Canonical or candidate subject name
Known identifiers
Requested workflow
Requested evidence categories
Source allowlist
Maximum source age
Maximum execution time
Maximum source count
Correlation ID
Requested-by actor
Purpose
```

## Required result fields

```text
Research artifact ID
Provider
Provider version
Workflow version
ToolUniverse version or commit
Execution start and finish
Tools invoked
Arguments with sensitive fields redacted
Source manifest
Raw artifact hashes
Normalized claims
Unresolved ambiguities
Conflicting evidence
Warnings
Partial-result status
Freshness date
Failure details
```

---

# Phase 5: Add canonical scientific entities

Do not store the sidecar’s Markdown report as the sole knowledge representation.

Store the raw report for review, but normalize research into typed BioStack records.

## Compound identity

```text
Canonical name
Aliases
Parent compound
Salt or formulation
Stereochemistry
PubChem CID
ChEMBL ID
InChIKey
SMILES
Molecular formula
Molecular weight
Identity confidence
Identity conflicts
Identity sources
```

## Study record

```text
Citation
Study type
Publication status
Retraction status
Population
Sample size
Age range
Sex distribution
Condition or research context
Intervention
Comparator
Duration
Endpoints
Results
Limitations
Funding and conflicts
Evidence class
```

## Published exposure regimen

This is a critical first-class entity, not a paragraph hidden inside a summary.

```text
Study arm
Substance
Formulation
Amount
Unit
Route
Frequency
Initiation amount
Escalation step
Escalation interval
Maximum studied amount
Maintenance amount or range
Exposure duration
Population
Reason for escalation
Reason for interruption
Reason for discontinuation
Source location
Extraction confidence
Reviewer status
```

Never collapse initiation, escalation, maximum, and maintenance values into one ambiguous “dose” field.

## Outcome

```text
Outcome name
Outcome type
Measurement
Time point
Result
Effect size
Confidence interval
Statistical significance
Clinical relevance reported by source
Source wording
BioStack interpretation
Limitations
```

## Adverse-event evidence

```text
Event
Severity
Frequency
Study arm
Dose or exposure context
Time to event
Discontinuation relationship
Serious adverse event status
Label warning status
FAERS or spontaneous-report signal
Causality limitations
Source
```

Spontaneous reporting and disproportionality signals must never be represented as proven causation.

## Mechanism and pathway claim

```text
Claim
Target
Pathway
Tissue or system
Evidence class
Direct or inferred relationship
Species
Source
Conflicting evidence
Confidence
```

## Evidence assessment

At minimum distinguish:

* Mechanistic or theoretical
* In-vitro
* Animal
* Human case report
* Human observational
* Controlled human trial
* Systematic review or meta-analysis
* Regulatory label
* Official safety communication
* Community-reported
* Unknown
* Conflicting
* Retracted or superseded

Do not assign evidence strength from source count alone.

---

# Phase 6: Implement bounded research workflows

Start with the following ToolUniverse skills:

1. `tooluniverse-chemical-compound-retrieval`
2. `tooluniverse-literature-deep-research`
3. `tooluniverse-drug-research`
4. `tooluniverse-adverse-event-detection`
5. `tooluniverse-pharmacovigilance`
6. `tooluniverse-systems-biology`
7. `tooluniverse-target-research`

These skills currently cover compound disambiguation, PubChem and ChEMBL retrieval, multi-source literature review, comprehensive drug profiling, FAERS and label-based adverse-event analysis, and multi-database pathway and target research.

Do not run every skill for every request.

## Workflow A: Compound identity resolution

1. Normalize user-supplied name.
2. Search approved identity sources.
3. Resolve synonyms.
4. Distinguish parent, salt, formulation, and stereochemistry.
5. Cross-check identifiers.
6. Return multiple candidates when ambiguous.
7. Fail closed rather than selecting an uncertain identity.
8. Require review before canonical identity changes.

## Workflow B: Compound evidence profile

1. Resolve identity.
2. Build search synonyms.
3. Search literature sources.
4. Deduplicate publications.
5. Classify source types.
6. Extract study populations.
7. Extract published exposure regimens.
8. Extract outcomes.
9. Extract adverse events.
10. Extract limitations.
11. Detect conflicting conclusions.
12. Detect retractions or corrections.
13. Normalize claims.
14. Produce raw and structured artifacts.
15. Stage for human review.

## Workflow C: Safety and adverse-event profile

1. Retrieve official labels and safety communications.
2. Retrieve controlled-trial adverse events.
3. Retrieve discontinuation data.
4. Retrieve spontaneous-report signals.
5. Keep source classes separate.
6. Preserve denominator information when available.
7. Preserve absence of denominator information when unavailable.
8. Prevent FAERS signals from becoming incidence estimates.
9. Stage high-impact wording for Clinical Safety review.

## Workflow D: Mechanism and pathway profile

1. Resolve compound targets.
2. Cross-check target relationships.
3. Retrieve pathway membership.
4. Separate experimentally supported relationships from inferred relationships.
5. Record species and tissue.
6. Detect pathway overlap with existing compounds.
7. Present overlap as a research signal, not proof of synergy, safety, or causation.

---

# Phase 7: Integrate with existing intake and review controls

Reuse the existing BioStack intake and promotion lifecycle where technically appropriate.

The expected conceptual lifecycle is:

```text
Research requested
    |
    v
Queued
    |
    v
Resolving identity
    |
    v
Gathering evidence
    |
    v
Normalizing
    |
    v
Pending review
    |
    +--> Deferred
    |
    +--> Rejected
    |
    +--> Approved for promotion
                    |
                    v
          Canonical knowledge promotion
```

Requirements:

* Sidecar output never writes directly to canonical compound tables.
* Raw evidence is immutable after receipt.
* Normalized candidates are versioned.
* Duplicate research requests are detected.
* Failed research can be retried safely.
* Partial results are clearly marked.
* Promotion is idempotent.
* Every promoted claim links to its source manifest.
* Every promotion records reviewer and approval state.
* New source evidence does not overwrite historical evidence.
* Corrections and retractions create new versions and reopen review.
* Knowledge-ingest fences apply to ToolUniverse research.
* Administrative override is explicit, authorized, and receipted.
* Existing provenance and source-lane receipts are reused when possible.

---

# Phase 8: Implement evidence comparison locally

Create a deterministic BioStack domain service that compares a user-recorded amount or proposed protocol entry against reviewed published evidence.

Suggested abstraction:

```csharp
public interface IEvidenceContextComparisonService
{
    EvidenceContextComparison Compare(
        ProtocolExposure exposure,
        ReviewedEvidenceProfile evidence);
}
```

## Comparison outputs

```text
Exact-match study context
Closest studied initiation range
Closest studied maintenance range
Highest studied exposure
Unit-normalized difference
Frequency-normalized difference
Route mismatch
Population applicability limitations
Evidence coverage
Out-of-context flags
Decimal or unit anomaly flags
Source references
```

## Example risk signals

```text
NO_REVIEWED_INITIATION_MATCH
ABOVE_REVIEWED_INITIATION_RANGE
ABOVE_HIGHEST_REVIEWED_EXPOSURE
BELOW_REVIEWED_RANGE
ROUTE_NOT_STUDIED
FREQUENCY_NOT_STUDIED
UNIT_MISMATCH_SUSPECTED
DECIMAL_ERROR_SUSPECTED
EVIDENCE_LIMITED_TO_ANIMALS
EVIDENCE_LIMITED_TO_CASE_REPORTS
CONFLICTING_HUMAN_EVIDENCE
NO_HUMAN_EVIDENCE
```

## Example generated language

Acceptable:

> Reviewed trials initiated participants at 0.5 to 1.0 mg weekly. The entered 12 mg amount is 12 to 24 times that initiation range.

Acceptable:

> No reviewed trial in this evidence packet initiated participants at the entered amount.

Acceptable:

> Human evidence was not found for this route. The available evidence cannot establish how the entered protocol compares.

Acceptable:

> This trial population differed materially from the profile information stored in BioStack, so applicability is uncertain.

Prohibited:

> Start at 0.5 mg.

Prohibited:

> 12 mg will harm you.

Prohibited:

> 1 mg is safe.

The comparison service must be deterministic and must not require an LLM to perform unit math.

---

# Phase 9: Provenance and reproducibility

Every research execution must preserve:

```text
Research request
Canonicalized request
Provider
Provider version
ToolUniverse release or commit
Skill version
Tool names
Tool configuration hashes
Input arguments
Retrieval timestamps
Source identifiers
Source URLs or canonical identifiers
Raw response hashes
Normalized artifact hashes
Extraction model and version, if used
Prompt or extraction schema version, if used
Warnings
Failures
Reviewer decisions
Promotion receipt
```

Store large raw artifacts separately if necessary, but preserve content-addressed references.

The system must be able to answer:

* Where did this claim come from?
* Which source passage supports it?
* Which workflow extracted it?
* Which version of ToolUniverse was used?
* Which human approved it?
* What changed since the previous version?
* Has the source been corrected or retracted?
* Can the research packet be reproduced?

---

# Phase 10: Reliability and failure behavior

Expected failures include:

* Source API unavailable
* Authentication failure
* Rate limiting
* Timeout
* Schema drift
* Empty result
* Ambiguous identity
* Conflicting identifiers
* Tool removed or renamed
* Partial literature coverage
* Source content changed
* Invalid units
* Extraction failure
* Sidecar unavailable
* Cancellation
* ToolUniverse upgrade regression

Required behavior:

* Distinguish all major failure classes.
* Never convert an empty response into “no evidence exists.”
* Never promote partial research without an explicit partial status.
* Retry only retryable failures.
* Use bounded exponential backoff.
* Respect source rate limits.
* Support cancellation.
* Preserve completed partial work.
* Keep canonical knowledge unchanged when research fails.
* Expose a health endpoint that verifies service readiness without running scientific inference.
* Provide a global disable switch that leaves BioStack’s existing knowledge base operational.

---

# Phase 11: Testing

## Contract tests

* .NET request matches sidecar schema.
* Sidecar response matches BioStack schema.
* Unknown fields are handled safely.
* Required fields cannot disappear silently.
* ToolUniverse upgrades cannot merge without contract validation.

## Identity tests

* Ambiguous names return candidates.
* Salt and parent forms remain distinct.
* Stereoisomers remain distinct.
* Conflicting PubChem and ChEMBL identifiers fail review.
* Synonyms deduplicate correctly.

## Exposure and unit tests

* mg and mcg conversion
* daily and weekly frequency normalization
* amount per administration versus total weekly exposure
* initiation versus maintenance
* escalation interval
* decimal placement
* route mismatch
* body-weight-normalized study values
* missing units
* conflicting source values

Include a test where:

```text
Reviewed initiation range: 0.5 to 1.0 mg weekly
User-recorded amount: 12 mg weekly
```

Expected result:

* `ABOVE_REVIEWED_INITIATION_RANGE`
* 12 to 24 times the reviewed initiation range
* Source citations attached
* No claim that harm is certain
* No recommended personal dose generated

## Evidence tests

* Human trial and animal study remain separate.
* Case report is not promoted as controlled evidence.
* Preprint is labeled.
* Retracted source is blocked.
* Conflicting studies remain visible.
* Lack of evidence is not treated as evidence of safety.
* FAERS signal is not represented as incidence or causation.
* Mechanistic plausibility is not represented as demonstrated outcome.

## Pipeline tests

* Duplicate request handling
* Retry after provider failure
* Idempotent promotion
* Review rejection
* Review deferral
* Approved promotion
* Reopened review after correction
* Knowledge-ingest fence enforcement
* Administrative override receipt
* Raw artifact hash verification

## Privacy and security tests

* No user profile data reaches the sidecar.
* No protocol history reaches ToolUniverse.
* Secrets are absent from logs.
* Arbitrary tool invocation is rejected.
* Non-allowlisted tools are rejected.
* Sidecar cannot write to BioStack’s database.
* Sidecar is not publicly reachable.
* Execution limits are enforced.

## Copy and behavior guards

Add tests preventing unreviewed forms of:

```text
safe dose
recommended dose
correct dose for you
you should take
start taking
increase to
decrease to
titrate to
ideal amount
guaranteed safe
clinically proven for you
```

Do not ban legitimate source quotations or evidence fields merely because they contain dosage language. Guard how BioStack interprets and presents them.

---

# Phase 12: Initial validation corpus

Validate the complete pipeline against compounds with different research characteristics.

## Retatrutide

Tests:

* Human trial discovery
* Initiation and escalation extraction
* Maintenance and maximum exposure distinction
* Adverse-event extraction
* Trial population applicability
* Investigational status
* 12 mg versus trial-initiation comparison

## BPC-157

Tests:

* Weak or limited human evidence
* Animal-heavy evidence
* Compound identity ambiguity
* Unsupported online claims
* Clear evidence-tier separation
* Resistance to influencer-source contamination

## Metformin

Tests:

* Approved drug
* Rich label and trial evidence
* Multiple indications
* Established adverse events
* Regulatory sources
* Large literature volume
* Deduplication performance

## NAD+

Tests:

* Compound and formulation ambiguity
* NAD+, NADH, NMN, NR, and precursor distinction
* Route differences
* Mechanistic versus human-outcome evidence
* Supplement and infusion literature separation

---

# Phase 13: Delivery sequence

Implement through small, reviewable pull requests.

## PR 1: Discovery and ADR

* Repository architecture map
* Integration options
* Selected seam
* Data-flow diagram
* Threat model
* Product-boundary decision requirements
* No runtime behavior

## PR 2: Contracts and domain model

* Provider-neutral research contracts
* Scientific evidence entities
* JSON schemas
* Unit tests
* No ToolUniverse dependency

## PR 3: Sidecar skeleton

* Python service
* Health endpoint
* Authentication
* Configuration
* ToolUniverse version pin
* Tool allowlist
* Container hardening
* No production workflow yet

## PR 4: Compound identity workflow

* Chemical compound retrieval
* Identity normalization
* Raw artifact storage
* Integration tests
* No canonical promotion

## PR 5: Literature and regimen extraction

* Literature research
* Study normalization
* Published exposure regimen extraction
* Outcomes and limitations
* Staged review records

## PR 6: Safety and pathway research

* Adverse-event research
* Pharmacovigilance separation
* Mechanism and pathway extraction
* Source-class safeguards

## PR 7: Existing intake integration

* Queue and job lifecycle
* Retry and dedupe
* Staging
* Review states
* Knowledge-ingest fence
* Promotion receipts

## PR 8: Local evidence comparison

* Deterministic unit normalization
* Range comparison
* Risk signals
* Copy guards
* Retatrutide 12 mg scenario

## PR 9: Hardening and operational documentation

* Threat-model verification
* License and source-term inventory
* Upgrade procedure
* Kill switches
* Monitoring
* Failure runbook
* Full validation corpus

Do not combine all phases into one large pull request.

---

# Definition of done

The work is complete when:

1. The existing BioStack backend integration seam is documented and justified.
2. ToolUniverse runs in an isolated, version-pinned sidecar.
3. The BioStack Domain and Application layers do not depend on ToolUniverse types.
4. Only approved workflows and tools can execute.
5. No personal health or protocol data is transmitted to the sidecar.
6. Compound identity is resolved and ambiguity is preserved.
7. Published study regimens are extracted into structured fields.
8. Initiation, escalation, maintenance, and maximum exposure remain distinct.
9. Outcomes, adverse events, limitations, and populations are source-linked.
10. Raw evidence and normalized artifacts are hashed and traceable.
11. Research results enter the existing staged review and promotion lifecycle.
12. ToolUniverse cannot write directly to canonical knowledge.
13. User-recorded amounts can be compared deterministically with reviewed evidence.
14. The 12 mg Retatrutide test produces a clear, cited, high-severity evidence-context warning.
15. The system does not invent or select a personal dose.
16. All unit, identity, evidence, pipeline, privacy, security, and copy-guard tests pass.
17. The prior BioStack behavior remains operational when the sidecar is disabled.
18. Product canon and policy documents are reconciled before public release of expanded dosage-context features.

---

# Expected final report

At completion, provide:

* Architecture summary
* ADR
* Data-flow diagram
* Threat model
* Tool and source allowlist
* Added domain contracts
* Added database entities and migrations
* Research workflow descriptions
* Product-boundary decision record
* Test inventory and results
* Validation results for Retatrutide, BPC-157, Metformin, and NAD+
* Known limitations
* Source licensing or usage restrictions
* Operational runbook
* Upgrade and rollback procedure
* Remaining approval gates

Do not declare success based only on successful ToolUniverse calls.

Success means BioStack can ingest, review, reproduce, and safely present stronger scientific evidence without losing provenance, local-first protections, or human control.
