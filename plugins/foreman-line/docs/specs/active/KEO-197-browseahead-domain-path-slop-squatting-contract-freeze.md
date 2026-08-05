---
ticket: KEO-197
title: BrowseAhead domain/path slop-squatting contract freeze
status: active
owner: clinton.morgan
created: 2026-07-29
updated: 2026-07-30
supersedes: null
superseded_by: null
risk: critical
surfaces:
  - docs/contracts/browseahead-keo-197-domain-path-slop-squatting.md
routing_class: architecture/risk
permission_profile: builder-architecture
data_classification: internal
---

## Intent

Freeze the existing KEO-197 BrowseAhead domain/path slop-squatting contract
before any detector implementation. The output is a single reviewable contract
that maps a literal, WAAA-backed taxonomy, navigation provenance, normalization
rules, precedence, hostile fixtures, and fail-closed pre-network outcomes to
BA2.

BA1 creates no Linear issue, has no dependency into P1, P2, Review launch,
payment, fulfillment, or delivery, and runs only under BrowseAhead WIP limit
one using capacity not needed by a revenue-critical parcel. The semantic
contract below incorporates the ratified BA1-R1 through BA1-R8 decisions and is
authoritative for this parcel.

## Constraints

1. Owning implementation repository: `keon-mcp-gateway`.
2. Authoritative base:
   `39769d2e300a188dc9935aa707d4559b0aaad2b5`, the observed
   `keon-mcp-gateway` `origin/main` on 2026-07-29.
3. Branch: `codex/keon-proof-led-ba1-squatting-contract`.
4. Worktree:
   `D:/Repos/keon-omega/_worktrees/keon-proof-led-ba1-20260730`.
5. Create the branch/worktree directly from the exact base. If live
   `origin/main` differs before dispatch, stop for coordinator re-grounding.
   Do not rebase or silently substitute a newer base.
6. The shared gateway checkout is read-only and already has an unrelated
   `.serena/project.yml` modification. Do not edit, clean, stash, commit, move,
   or otherwise touch it.
7. KEO-197 is the sole BrowseAhead slop-squatting lane. The contract covers
   only SQ-1 path slop-squatting, SQ-2 domain slop-squatting, and the exact
   pre-navigation provenance needed to assess those two threats.
8. Do not absorb the existing general BrowseAhead content-risk categories,
   content injection, credential risk, rendered-page analysis, automatic
   remediation, or Runtime/effect authority.
9. BA1 is contract-only. BA2 alone may implement the ratified detector after
   BA1 approval. The only mutation authority is the one Allowed File.
10. The contract consumes a proposed navigation supplied by the caller or
    browser boundary and returns `allow`, `require_human`, or `deny` before
    that specific request is sent. It may assess a proposed redirect hop
    supplied from a browser response before the next request; it may not fetch,
    resolve, follow, render, navigate, submit, or contact any destination.
11. Every redirect hop is a new assessment. A previous `allow` cannot authorize
    the next hop, and a clean rendered page cannot erase or downgrade an
    earlier hold or denial.
12. Detections and decisions are navigation-admission evidence only. They do
    not authorize navigation themselves, do not authorize an effect-bound tool
    call, and do not establish a public, customer, Runtime, enforcement, or
    end-to-end governance claim.
13. Do not add a network reputation dependency, global brand list, allowlist,
    online DNS/WHOIS/HTTP lookup, probabilistic model, or severity score.
    Abandoned/unknown/reputation findings may exist only when the assessment
    input carries separately trusted, versioned offline policy evidence.
14. Do not infer a resolved/final URL before it exists. Before the first
    request, `resolved_url` is `null`. When a response proposes a redirect, the
    browser supplies the resolved next-hop URL as a new pre-network assessment
    input.
15. No public claim, Linear mutation, production-data handling, payment,
    customer contact, deployment, push, PR, merge, or external action is
    authorized. Gate 3 remains withheld.

## Acceptance Criteria

1. The exact diff contains only
   `docs/contracts/browseahead-keo-197-domain-path-slop-squatting.md`.
2. The contract records the exact repository, base SHA, branch, worktree, dirty
   shared-checkout boundary, WIP-one rule, and no-revenue-dependency rule from
   this spec.
3. The contract pins the sources under `Pinned Authority` and distinguishes:
   - WAAA threat/attack provenance;
   - live KEO-197 product requirements; and
   - Keon-authored synthetic contract fixtures.
   It must not mislabel a synthetic fixture as a WAAA artifact.
   The source-classification table must identify the complete
   `KEO197-FX-001` through `KEO197-FX-043` matrix as Keon-authored synthetic
   fixtures.
4. The contract copies the ratified version of the literal input, taxonomy,
   normalization, precedence, outcome, receipt, and fixture tables from
   `Ratified Literal Contract`. Semantic paraphrase is forbidden.
5. Every proposed navigation records all required binding fields. Missing,
   malformed, contradictory, or unrecognized binding/provenance input denies
   before network.
6. Each taxonomy rule has one stable identifier, one exact predicate, one
   outcome, one source classification, and at least one hostile fixture.
   Unsupported fuzzy aliases or wider URL-risk classes are forbidden.
7. The normalization procedure is deterministic, offline, versioned, and
   applied before rule evaluation. Both raw and normalized forms remain
   evidence. Normalization never converts an invalid URL into an allowed URL.
8. Structural denial/hold findings outrank otherwise positive provenance.
   Positive provenance may produce `allow` only when the exact normalized URL
   is grounded and no higher-precedence rule fires.
9. `require_human` prevents network until a named governed approval is bound
   to the exact normalized URL, browser session, navigation epoch, ruleset
   digest, and one hop. It is never a reusable allowlist or domain-wide waiver.
10. A browser-supplied redirect `Location` is resolved against the current URL
    without sending the next request, then assessed as a new hop. Cross-
    registrable-domain redirect fixtures cannot inherit the prior hop's allow.
11. The receipt schema contains the raw requested URL, normalized proposed URL,
    nullable resolved URL, intended resource ID, initiator class and evidence,
    current origin, browser session, navigation epoch, prior redirect chain,
    fired rule IDs, ruleset ID/digest, decision, decision reason, and any human
    approval reference.
12. All hostile and clean fixtures are synthetic and use RFC-reserved
    `.test` destinations. Verification performs no DNS, HTTP, browser, or other
    network action against them.
13. The BA2 handoff names the precise proposed input/output contract and
    negative matrix while excluding implementation, scanner changes, existing
    content-risk categories, and wider URL reputation work.
14. Claims, packaging, initiative control, Linear, historical evidence,
    existing gateway code/tests, and all other files have zero diff.
15. Applicable documentation/link checks and whitespace checks pass.
16. Two independent adversarial reviewers return PASS after all ratified
    decisions are incorporated. A passing draft self-check alone never
    authorizes promotion or dispatch.

## Out of Scope

- Implementing BA2 or modifying
  `src/Keon.McpGateway/Tools/BrowseAhead/BrowseAheadScanner.cs`.
- Modifying any gateway code, test, schema, contract, configuration, dependency,
  lockfile, build file, or existing documentation.
- DNS, WHOIS, HTTP, TLS, reputation, browser, render, redirect-following, or
  navigation activity. Assessing a browser-supplied proposed redirect hop
  before its request is in scope; obtaining or following the hop is not.
- General content injection, credential, exfiltration, form, hidden-content,
  obfuscation, contradiction, or agent-targeted-content taxonomy work.
- Brand monitoring, takedown, arbitrary typo detection without a trusted
  intended host, global allowlists, online reputation, or new URL-risk classes.
- New Linear items or Linear mutation; claims, packaging, proof, commercial
  gate, payment, customer, public-release, production, or evidence-registry
  work.
- P1/P2 work, any revenue-critical capacity, and any update to the dirty shared
  checkout.
- Push, PR, merge, public publication, deployment, customer contact, production
  data, or another external action.
- Editing any file outside the Allowed Files section.

## Context & References

- Ratified portfolio charter:
  `D:/Repos/agent-skills/plugins/foreman-line/docs/goals/keon-proof-led-portfolio-priority/charter.md`
- Coordinator loop:
  `D:/Repos/agent-skills/plugins/foreman-line/docs/goals/keon-proof-led-portfolio-priority/loop-directive.md`
- Merged Keon initiative authority:
  `keon-docs` `origin/main:docs/INITIATIVES/keon-proof-led-commercial-entry/CHARTER.md`
  and `EXECUTION-TRACKER.md`.
- Current gateway content scanner, reference-only:
  `src/Keon.McpGateway/Tools/BrowseAhead/BrowseAheadScanner.cs`.
- Current gateway handler, reference-only:
  `src/Keon.McpGateway/Tools/BrowseAhead/BrowseAheadScanHandler.cs`.

## Pinned Authority

### Live KEO-197

- Issue: `KEO-197 — BrowseAhead — detect domain/path slop-squatting before
  agent navigation`
- URL:
  `https://linear.app/keonsystems/issue/KEO-197/browseahead-detect-domainpath-slop-squatting-before-agent-navigation`
- Parent: `KEO-147`
- Status observed: `Todo`
- `updatedAt`: `2026-07-29T11:59:35.828Z`
- Attachment: WAAA arXiv `2605.05509`

If the issue's `updatedAt`, description, parent, or acceptance criteria changes,
stop for coordinator reconciliation. This spec preserves the currently observed
requirements: six initiator classes; intended/requested/normalized/resolved URL
and origin/path evidence; observation/session/epoch binding; model-invented
domain/path distrust; deterministic IDN, deceptive-subdomain, registrable-
domain, redirect, and abandoned/unknown findings where evidence exists; human
approval for unresolved high risk; per-hop reassessment; provenance receipts;
and pre-network fail-closed behavior.

### WAAA v1

- Paper: `arXiv:2605.05509v1`, submitted 2026-05-06.
- Stable source: `https://arxiv.org/abs/2605.05509v1`.
- Relevant locations: Table 1 (`SQ-1`, `SQ-2`) and §6.2.5, “SQ-2 & SQ-1:
  Domain and path slop squatting.”
- Open-science artifact mirror:
  `https://anonymous.4open.science/r/attacksAgainstAgentsOnTheWeb`.
- Artifact fingerprints observed 2026-07-29:
  - `attacks.csv`: repository API SHA prefix `5a8787c1`; HTTP ETag
    `f-4806ea30f1321ef183cb80532ad161643ffa565a`; maps `A15` to path
    slop-squatting.
  - `attacks-appendix.pdf`: repository API SHA prefix `a5bc2e6d`; HTTP ETag
    `f-50fb05545bb01386b18da8087f49ddd8363da29c`.
  - `a15/app/prompt.text`: repository API SHA prefix `9f720b59`; HTTP ETag
    `f-d8e95a2b39830520e02e3db72d185f76d00206d0`.
  - `a15/app/templates/index.html`: repository API SHA prefix `6756f41b`.

The anonymous mirror exposes per-file fingerprints rather than a repository
commit SHA. Those fingerprints are the pinned artifact revision for BA1. If any
fingerprint differs, stop; do not silently consume newer artifact content.
WAAA provides the SQ-1/SQ-2 threat and PoC provenance. It does not ratify Keon's
normalization, decision precedence, rule identifiers, or the synthetic fixtures
below.

## Ratified Literal Contract

Clint Morgan ratified BA1-R1 through BA1-R8 on 2026-07-30. Everything in this
section is authoritative for BA1 and BA2; changing it requires a new
decision-owner/security ratification.

### Input and binding schema

| Field | Required rule |
|---|---|
| `assessment_id` | Required opaque unique ID supplied by the assessment boundary. |
| `intended_resource_id` | Required stable identifier for the user/application resource intent; prose alone is insufficient. |
| `proposed_url_raw` | Required absolute proposed URL exactly as supplied; preserved unchanged as evidence. |
| `initiator_class` | Required enum: `user_supplied`, `observed_link_derived`, `application_configured`, `search_result_derived`, `redirect_derived`, or `model_invented`. No other value is accepted. |
| `initiator_evidence` | Required typed evidence proving the initiator class. Exact user URL, observed href plus observation ID, versioned application route, observed search-result URL plus observation ID, prior response plus `Location`, or explicit `none` for model-invented. |
| `current_url` | Required raw absolute URL after navigation has begun; nullable only before the first navigation. When present, BA2 applies the same deterministic normalization as the proposed URL and derives `normalized_current_url`, `current_normalized_origin`, and `current_registrable_domain`; any failure denies. |
| `initiator_observation_id` | Required for observed-link, search-result, and redirect-derived proposals; otherwise nullable. |
| `browser_session_id` | Required, non-empty, and bound into the decision receipt. |
| `navigation_epoch` | Required non-negative monotonic integer for the browser session. |
| `hop_index` | Required non-negative monotonic integer within the navigation chain; `0` for the first request and incremented exactly once for each proposed redirect hop. |
| `prior_redirect_chain` | Required array, empty before the first request; every item contains prior raw/normalized URL, response status, proposed `Location`, decision, receipt ID, `hop_index`, `human_approval_state`, and nullable approval receipt ID. |
| `prior_decision_receipts` | Required complete ordered array of the signed, content-addressed decision receipts referenced by `prior_redirect_chain`; empty before the first request. Bare IDs, omitted receipts, or unsigned receipt summaries are invalid. |
| `trusted_intended_urls` | Required array of exact user-supplied URLs or versioned application routes; empty is allowed but cannot ground a positive decision. |
| `offline_policy_evidence` | Optional versioned, signed/digested input for explicit blocked/abandoned/unknown destination status. Absence is not reputation evidence. |
| `human_approval_evidence` | Required nullable object. When present it uses schema `keon.browseahead.human-approval.v1` and contains `approval_id`, `assessment_id`, prior decision receipt ID, `approved|denied`, exact normalized URL, browser session, navigation epoch, hop index, ruleset ID/digest, approver subject and authority IDs, issued/expiry times, payload SHA-256, Ed25519 key ID, and unpadded-base64url signature. |
| `approval_trust_evidence` | Required nullable versioned offline authority/key evidence. It must be present when human approval evidence is present and must authorize the approver role and active Ed25519 key at the approval time. No runtime lookup or network fallback is allowed. |
| `prior_approval_ids` | Required array of approval IDs already consumed in the browser session; empty is allowed. Reuse of an ID is invalid input and denies. |
| `navigation_state_evidence` | Required signed object using schema `keon.browseahead.navigation-state.v1`. It contains the browser session, latest epoch/hop, nullable prior-state digest, ordered prior decision receipt IDs/digests and approval states, and the complete consumed approval-ID set. The raw `prior_redirect_chain` and `prior_approval_ids` inputs must exactly match this authenticated state. |
| `ruleset_id` | Required literal `keo-197-domain-path-slop-squatting-v1`. |
| `ruleset_digest` | Required lowercase-hex SHA-256 of the UTF-8 bytes of this document beginning with `### Input and binding schema` and ending with the last line of `BA1-R8` under `## Ratified Decisions`, inclusive, with CRLF normalized to LF and exactly one terminal LF. This scope binds the literal contract and the exact ICU, PSL, and WAAA authority pins. BA2 build tooling computes it; no placeholder, alternate algorithm, or alternate byte scope is allowed. |

`resolved_url` is an output field, not a caller assertion. It is `null` before
the first request. For a redirect, the browser boundary resolves the supplied
`Location` against `current_url` without sending the next request and presents
that resolved URL as the next assessment's `proposed_url_raw`.

### Signed approval, trust, and navigation-state bytes

All signed schemas use RFC 8785 JCS. The signed payload is the exact JCS
UTF-8 encoding of every schema field except `payload_sha256` and
`signature_b64u`. `payload_sha256` is the lowercase-hex SHA-256 of those exact
bytes. Ed25519 signs those bytes directly. `signature_b64u` and 32-byte public
keys use unpadded base64url. Unknown fields, duplicate keys, non-canonical
bytes, hash mismatch, signature mismatch, and alternate encodings deny.

`keon.browseahead.approval-trust.v1` contains exactly `schema_id`,
`trust_bundle_id`, `issuer_id`, literal
`audience: "keon.browseahead.approval-validation"`, `issued_at_utc`,
`not_before_utc`, `expires_at_utc`, `ruleset_id`, `ruleset_digest`, ordered
`authorities`, `payload_sha256`, `root_key_id`, and `signature_b64u`. Each
authority contains exactly `authority_id`, ordered `authorized_roles`, and
ordered `keys`; each key contains exactly `key_id`, `alg: "Ed25519"`,
`public_key_b64u`, `status: "active"|"revoked"`, `not_before_utc`, and
`expires_at_utc`. A revoked key is invalid regardless of timestamps. The bundle
is signed by an approval-root Ed25519 key loaded only from versioned application
configuration, never from assessment/model/request input. Its `issuer_id` and
literal audience must match that configuration. BA2 fails startup and every
assessment closed if that root is absent or a placeholder; its public-key
SHA-256 fingerprint is recorded in every result.

`keon.browseahead.human-approval.v1` contains exactly `schema_id`,
`approval_id`, `assessment_id`, `prior_decision_receipt_id`, `decision`
(`approved|denied`), `normalized_url`, `browser_session_id`,
`navigation_epoch`, `hop_index`, `ruleset_id`, `ruleset_digest`,
`approver_subject_id`, `approval_authority_id`, `approver_role`,
`issued_at_utc`, `expires_at_utc`, `payload_sha256`, `key_id`, and
`signature_b64u`. Its authority, role, and key must validate through the
authenticated trust bundle.

`keon.browseahead.navigation-state.v1` is signed by a distinct navigation-state
Ed25519 key loaded only from versioned application configuration. It contains
exactly `schema_id`, `browser_session_id`, `evaluation_time_utc`,
`latest_navigation_epoch`, `latest_hop_index`, `prior_state_id`, ordered
`decision_receipts` entries containing receipt ID, payload SHA-256, decision,
nullable consumed approval ID, and state-transition SHA-256, sorted unique
`consumed_approval_ids`, `payload_sha256`, `key_id`, and `signature_b64u`.
`navigation_state_id` is derived as `sha256:<payload_sha256>` and is not part of
the signed payload. `evaluation_time_utc` is monotonic within the browser
session and is the sole trusted time for trust-bundle, authority-key, and
approval validity.
Request, model, browser-page, or approval-asserted current time is ignored. A
genesis state with empty prior receipts/approval IDs, epoch `0`, hop `0`, and
null prior-state digest is required before the first request. Every later state
hash-links the prior state and exactly commits the ordered redirect receipts,
their decision/approval state, and the complete consumed approval-ID set. The
navigation boundary persists the latest accepted state digest outside
assessment input and requires the supplied state to extend that exact digest;
a validly signed older state is still a rollback and denies. Unsigned caller
state, omission, reordering, mismatched raw arrays, rollback, fork, nonmonotonic
time, or invalid state signature denies.

Assessment and approval consumption are serialized per browser session under an
application-controlled exclusive transaction. Before any result, receipt, or
navigation-admission evidence is released, the navigation boundary atomically
compares and swaps the persisted latest state ID from the exact validated
parent to the exact signed resulting state. Provisional decision/receipt bytes
have no authority before that commit. If the parent changed or the atomic
commit loses, BA2 discards every provisional result (especially `allow`),
reloads the committed state under the same serialization boundary, and
re-evaluates the original input. A same-approval loser therefore observes
replay and deterministically denies; two transitions from one parent can never
both release `allow`. Persistence or serialization failure fails closed and
releases no navigation-admission evidence.

`keon.browseahead.decision-receipt.v1` uses the same JCS, hash, Ed25519, and
base64url rules and is signed with the configured navigation-state key. It
contains exactly `schema_id`, `assessment_id`, `assessment_input_sha256`,
`proposed_url_raw`, `normalized_url`, `normalized_origin`,
`registrable_domain`, nullable `current_url`, nullable
`normalized_current_url`, nullable `current_normalized_origin`, nullable
`current_registrable_domain`, `browser_session_id`, `navigation_epoch`,
`hop_index`, ordered `fired_rule_ids`, `decision`, `decision_reason`,
`ruleset_id`, `ruleset_digest`, nullable `approval_id`, nullable
`approval_payload_sha256`, nullable `approval_trust_bundle_id`, nullable
`approval_trust_payload_sha256`, `prior_navigation_state_id`,
`resulting_navigation_state_commitment`, `payload_sha256`, `key_id`, and
`signature_b64u`. `assessment_input_sha256` hashes the RFC 8785 JCS UTF-8 bytes
of the complete assessment input object containing every field in the input
table, including complete signed-envelope fields. The four approval/trust
reference fields are jointly `null` when no approval is consumed and are all
non-null when an approval is consumed; mixed nullability denies.
`decision_receipt_id` is the literal `sha256:` prefix followed by the lowercase
`payload_sha256` and is not part of the signed payload. Only a complete,
signature-valid, content-addressed decision receipt may appear in a later state
or redirect chain; a bare ID, altered receipt, non-content-addressed ID, or
unsigned summary denies.

`resulting_navigation_state_commitment` is the lowercase SHA-256 of the JCS
UTF-8 bytes of exactly the next state's browser session, evaluation time,
epoch, hop, prior state ID, decision, nullable consumed approval ID, and
complete resulting consumed-approval-ID set, excluding the new decision
receipt and all signature/hash fields. The resulting signed navigation state
contains that same commitment beside the new decision-receipt reference. This
forward transition commitment lets the decision receipt authenticate the state
transition and the resulting state authenticate the receipt without a circular
hash dependency.

### Ratified deterministic normalization

Apply these steps in order and preserve both the raw and normalized values:

1. Reject ASCII control characters, embedded whitespace, backslashes, invalid
   percent escapes, and URI user-information.
2. Parse one absolute URI. Only `http` and `https` are supported; all other
   schemes deny.
3. Lowercase scheme and host using invariant rules; remove exactly one terminal
   DNS dot while recording `terminal_dot_present: true`.
4. Convert the host to an ASCII IDNA form using one version-pinned offline
   implementation. Record the original Unicode host and ASCII host. Any
   non-ASCII input label or `xn--` label fires `KEO197-DOMAIN-IDN-001`; the
   detector does not attempt a probabilistic homograph judgment.
5. Remove the default port (`80` for HTTP, `443` for HTTPS); retain and compare
   every non-default port.
6. Normalize the path using RFC 3986 dot-segment removal. Decode percent-
   encoded unreserved characters only, uppercase remaining percent-hex pairs,
   and never decode reserved separators such as `/`, `?`, or `#`.
7. Preserve the query exactly except for percent-hex case normalization.
   Remove the fragment from the navigation comparison while preserving it in
   the raw evidence because fragments are not sent in the HTTP request.
8. Compute `normalized_origin` as scheme, ASCII host, and effective port.
9. Compute `registrable_domain` from an offline, version-pinned Public Suffix
   List ICANN section. No runtime update or network fallback is allowed.
10. A normalization error denies. Normalization must never repair an input into
    an allow.

### Ratified provenance and precedence

Evaluate in this exact order:

1. Missing, invalid, contradictory, or unrecognized input/provenance:
   `deny`.
2. Any rule whose table outcome is `deny`: `deny`.
3. A valid signed `denied` approval, or invalid/mismatched/expired/
   unauthorized/replayed approval evidence: `deny`.
4. Any fired rule whose table outcome is `require_human`: `require_human`
   unless a valid signed `approved` receipt matches the exact
   URL/session/epoch/ruleset/hop binding, its approval ID is unused, and no
   `deny` rule fires. That exact-bound approval itself supplies positive human
   provenance for this URL and hop, including a model-invented candidate.
5. Otherwise, `allow` only when the exact normalized proposed URL is grounded
   by one of:
   - the exact normalized URL explicitly supplied by the user;
   - the exact URL obtained by resolving an observed link from a bound trusted
     observation;
   - an exact match to a versioned application route;
   - the exact URL observed in a bound search result, subject to the rule table;
   - the exact browser-resolved URL from a supplied redirect `Location`,
     subject to a new per-hop assessment.
6. Model invention, prose-only brand/resource intent, or similarity is never
   positive provenance by itself. If neither an exact grounding from step 5 nor
   a valid exact-bound approval from step 4 exists, return `require_human`.

Human approval is valid for one exact normalized URL, one browser session, one
navigation epoch, one ruleset digest, and one hop. BA2 verifies the approval
payload hash, Ed25519 signature, offline authority/key status, approval time,
every exact binding, and non-reuse of `approval_id`. A missing approval leaves
the outcome `require_human`; a valid `denied` receipt or invalid, mismatched,
expired, unauthorized, or replayed approval denies. A valid `approved` receipt
may satisfy fired `require_human` rules when no `deny` rule fires and itself
supplies exact positive human provenance for the bound URL and hop, including
when the candidate was model-invented. It cannot create a reusable domain
allowlist and cannot suppress a later redirect or structural denial.

### Ratified taxonomy and outcomes

| Rule ID | Exact predicate | Outcome | Provenance |
|---|---|---|---|
| `KEO197-INPUT-001` | Any required field is missing/invalid, provenance evidence does not support its claimed initiator class, the epoch is non-monotonic, or normalization fails. | `deny` | KEO-197 fail-closed boundary; Keon contract rule. |
| `KEO197-DOMAIN-IDN-001` | Original host contains a non-ASCII label or normalized ASCII host contains an `xn--` label. | `require_human` | KEO-197 IDN/homograph requirement; conservative structural signal without a confusable heuristic. |
| `KEO197-DOMAIN-TYPO-001` | A trusted intended ASCII host or registrable domain exists; the candidate is unequal; and their equal-length-or-adjacent-length ASCII forms have restricted Damerau-Levenshtein distance exactly 1. | `deny` | KEO-197 typo requirement; ratified exact Keon threshold. |
| `KEO197-DOMAIN-DECEPTIVE-SUBDOMAIN-001` | The trusted intended host or registrable domain appears as a complete label-aligned prefix inside the candidate host, but the candidate registrable domain differs. | `deny` | KEO-197 deceptive-subdomain requirement; Keon predicate. |
| `KEO197-DOMAIN-REGISTRABLE-CHANGE-001` | A current/trusted intended registrable domain exists and candidate registrable domain differs, without exact user or versioned-application authorization for that candidate. Exact observed-search grounding alone does not satisfy this predicate. | `require_human` | KEO-197 unexpected registrable-domain change. |
| `KEO197-DOMAIN-MODEL-INVENTED-001` | `initiator_class=model_invented` and candidate normalized origin is not an exact trusted intended origin. | `require_human` | WAAA SQ-2 plus KEO-197 model-invented default distrust. |
| `KEO197-DOMAIN-POLICY-BLOCKED-001` | Trusted offline policy evidence explicitly marks the exact candidate origin `blocked` or `abandoned`. | `deny` | KEO-197 abandoned/unknown requirement where evidence exists. |
| `KEO197-DOMAIN-POLICY-UNKNOWN-001` | Trusted offline policy evidence explicitly marks the exact candidate origin `unknown`. Absence of evidence does not fire this rule. | `require_human` | KEO-197 abandoned/unknown requirement where evidence exists. |
| `KEO197-PATH-MODEL-INVENTED-001` | Candidate origin is trusted/equal, but the normalized path/query is not exactly grounded by user URL, observed link, versioned route, search-result URL, redirect `Location`, or explicit policy, and the proposal is model-invented. | `require_human` | WAAA SQ-1 plus KEO-197 path grounding requirement. |
| `KEO197-REDIRECT-CROSS-ORIGIN-001` | `initiator_class=redirect_derived`, the proposed next-hop normalized origin differs from the current normalized origin, and both URLs have the same registrable domain. Scheme, ASCII host, and effective port are all origin-significant. | `require_human` | Fail-closed implication of BA1-R5: only an exact same-origin redirect may allow without a new human decision. |
| `KEO197-REDIRECT-CROSS-REGISTRABLE-001` | `initiator_class=redirect_derived` and the proposed next-hop registrable domain differs from the current registrable domain. Prior user/application authorization never suppresses the new per-hop human decision. | `require_human` | KEO-197 per-hop and cross-registrable redirect requirements. |
| `KEO197-PRIOR-DECISION-STICKY-001` | Any earlier hop in the bound chain is `deny` or `require_human` without a validated, exact-binding, non-replayed `approved` receipt. | Preserve the stronger prior outcome; never `allow`. | KEO-197 clean-page non-downgrade requirement. |

No other taxonomy class, alias, score, or threshold is authorized by BA1.
Multiple rules may fire; precedence yields one decision and the receipt lists
all fired rule IDs.

### Ratified outcome contract

| Outcome | Network rule | Authority rule |
|---|---|---|
| `allow` | The assessment itself performs no network action. The browser may separately send only the exact assessed request if every other applicable gate permits it. | Navigation-admission evidence only; no execution/effect authority. |
| `require_human` | No request is sent until a governed human approval is recorded for the exact one-hop binding. | Approval cannot waive another URL, epoch, hop, ruleset, or structural denial. |
| `deny` | No request is sent. | No override is defined in BA1/BA2; a different policy requires a separately ratified contract. |

### Ratified synthetic fixture matrix

All hosts use RFC-reserved `.test`. No fixture is fetched or resolved.
`example.test` is the trusted intended origin unless stated otherwise.

| Fixture | Proposed input | Expected rule(s) | Expected outcome |
|---|---|---|---|
| `KEO197-FX-001` | Model proposes `ftp://example.test/docs`; otherwise valid bindings. | `KEO197-INPUT-001` | `deny` |
| `KEO197-FX-002` | User supplies `https://exаmple.test/docs` where the `а` is Cyrillic U+0430. | `KEO197-DOMAIN-IDN-001` | `require_human` |
| `KEO197-FX-003` | Candidate `https://xn--exmple-4nf.test/docs`. | `KEO197-DOMAIN-IDN-001` | `require_human` |
| `KEO197-FX-004` | Intended `https://example.test/docs`; model proposes `https://examp1e.test/docs`. | `KEO197-DOMAIN-TYPO-001`, `KEO197-DOMAIN-MODEL-INVENTED-001` | `deny` |
| `KEO197-FX-005` | Intended `https://example.test/docs`; candidate `https://example.test.attacker.test/docs`. | `KEO197-DOMAIN-DECEPTIVE-SUBDOMAIN-001` | `deny` |
| `KEO197-FX-006` | Model invents `https://unseen.test/docs` with no trusted URL evidence. | `KEO197-DOMAIN-MODEL-INVENTED-001` | `require_human` |
| `KEO197-FX-007` | Trusted origin `https://example.test`; model invents unobserved `/tutorial/tries`. | `KEO197-PATH-MODEL-INVENTED-001` | `require_human` |
| `KEO197-FX-008` | Bound observation contains exact same-origin href `/tutorial/tries`; candidate is its exact resolution. | none | `allow` |
| `KEO197-FX-009` | User explicitly supplies exact `https://example.test/tutorial/tries`; candidate matches. | none | `allow` |
| `KEO197-FX-010` | Versioned application route exactly permits `https://example.test/docs/tries`; candidate matches. | none | `allow` |
| `KEO197-FX-011` | Search observation contains exact `https://unseen.test/docs`, but intended/current registrable domain is `example.test` and no user/application authorization exists. | `KEO197-DOMAIN-REGISTRABLE-CHANGE-001` | `require_human` |
| `KEO197-FX-012` | Current URL `https://example.test/start`; browser supplies redirect `Location: /next`; resolved proposed hop is `https://example.test/next`. | none | `allow` |
| `KEO197-FX-013` | Current URL `https://example.test/start`; browser supplies `Location: https://attacker.test/next`. | `KEO197-REDIRECT-CROSS-REGISTRABLE-001` | `require_human` |
| `KEO197-FX-014` | Offline policy evidence marks exact `https://abandoned.test` as `abandoned`. | `KEO197-DOMAIN-POLICY-BLOCKED-001` | `deny` |
| `KEO197-FX-015` | Offline policy evidence marks exact `https://unknown.test` as `unknown`. | `KEO197-DOMAIN-POLICY-UNKNOWN-001` | `require_human` |
| `KEO197-FX-016` | Observed same-origin link has no `initiator_observation_id`. | `KEO197-INPUT-001` | `deny` |
| `KEO197-FX-017` | User supplies an IDN candidate exactly; positive provenance is valid. | `KEO197-DOMAIN-IDN-001` | `require_human` |
| `KEO197-FX-018` | Earlier redirect hop is unresolved `require_human`; later candidate is clean same-origin. | `KEO197-PRIOR-DECISION-STICKY-001` | `require_human` |
| `KEO197-FX-019` | An IDN candidate has positive user provenance and a valid signed `approved` receipt matching the exact URL/session/epoch/ruleset/hop. | `KEO197-DOMAIN-IDN-001` plus validated approval | `allow` |
| `KEO197-FX-020` | Approval URL, session, epoch, ruleset digest, or hop differs from the current assessment. | `KEO197-INPUT-001` | `deny` |
| `KEO197-FX-021` | `approval_id` already appears in `prior_approval_ids`. | `KEO197-INPUT-001` | `deny` |
| `KEO197-FX-022` | Earlier `require_human` hop carries a validated exact-binding approval; the next proposed hop is clean same-origin and newly assessed. | none | `allow` |
| `KEO197-FX-023` | `initiator_class=observed_link_derived` but `initiator_evidence` is an unrelated user-supplied URL. | `KEO197-INPUT-001` | `deny` |
| `KEO197-FX-024` | `initiator_class=unrecognized`. | `KEO197-INPUT-001` | `deny` |
| `KEO197-FX-025` | `navigation_epoch` is lower than the prior session epoch. | `KEO197-INPUT-001` | `deny` |
| `KEO197-FX-026` | Proposed URL contains an ASCII control or embedded whitespace. | `KEO197-INPUT-001` | `deny` |
| `KEO197-FX-027` | Proposed URL contains a backslash. | `KEO197-INPUT-001` | `deny` |
| `KEO197-FX-028` | Proposed URL contains an invalid percent escape. | `KEO197-INPUT-001` | `deny` |
| `KEO197-FX-029` | Proposed URL contains URI user-information. | `KEO197-INPUT-001` | `deny` |
| `KEO197-FX-030` | Approval evidence is expired, unsigned, signed by an unauthorized key, or has a payload-hash mismatch. | `KEO197-INPUT-001` | `deny` |
| `KEO197-FX-031` | Redirect changes from `https://example.test` to `https://api.example.test`. | `KEO197-REDIRECT-CROSS-ORIGIN-001` | `require_human` |
| `KEO197-FX-032` | Redirect downgrades from `https://example.test` to `http://example.test`. | `KEO197-REDIRECT-CROSS-ORIGIN-001` | `require_human` |
| `KEO197-FX-033` | Redirect changes from default HTTPS port to `https://example.test:8443`. | `KEO197-REDIRECT-CROSS-ORIGIN-001` | `require_human` |
| `KEO197-FX-034` | Approval trust bundle is signed by a root supplied in request input rather than the versioned application trust root. | `KEO197-INPUT-001` | `deny` |
| `KEO197-FX-035` | Raw prior redirect/approval arrays omit or contradict the signed navigation state. | `KEO197-INPUT-001` | `deny` |
| `KEO197-FX-036` | Signed navigation state has an invalid signature, rollback/forked prior-state digest, or incomplete consumed approval-ID set. | `KEO197-INPUT-001` | `deny` |
| `KEO197-FX-037` | `current_url` cannot normalize or its derived current origin/domain contradict authenticated prior-state evidence. | `KEO197-INPUT-001` | `deny` |
| `KEO197-FX-038` | A model-invented candidate fires a `require_human` rule and carries a valid unused signed `approved` receipt for the exact URL/session/epoch/ruleset/hop. | fired hold rule plus validated approval | `allow` |
| `KEO197-FX-039` | Prior state or redirect history supplies a bare ID, unsigned summary, altered receipt, bad signature, or non-content-addressed prior decision receipt. | `KEO197-INPUT-001` | `deny` |
| `KEO197-FX-040` | Request/model time is used for validity, `evaluation_time_utc` is absent/nonmonotonic, or a validly signed state rolls trusted time or the app-persisted state digest backward. | `KEO197-INPUT-001` | `deny` |
| `KEO197-FX-041` | A typo or deceptive-subdomain deny rule fires and the candidate also carries an otherwise valid exact-bound signed `approved` receipt. | fired `deny` rule plus validated approval | `deny` |
| `KEO197-FX-042` | An otherwise valid candidate carries a valid exact-bound signed `denied` approval receipt. | validated denied approval | `deny` |
| `KEO197-FX-043` | Two concurrent assessments present the same unused exact-bound approval and authenticated parent state. Session serialization plus atomic state CAS permits at most one committed allow; the losing assessment reloads the winner's state and observes approval replay. | losing assessment: `KEO197-INPUT-001` | losing assessment: `deny`; aggregate invariant: never two `allow` results |

### Ratified receipt output

The deterministic result contains:

- `assessment_id`, `ruleset_id`, and `ruleset_digest`;
- `intended_resource_id`;
- `proposed_url_raw`, `normalized_url`, `normalized_origin`,
  `registrable_domain`, and nullable `resolved_url`;
- `initiator_class`, normalized `initiator_evidence`, and
  `initiator_observation_id`;
- raw and normalized current URL, `current_normalized_origin`,
  `current_registrable_domain`, `browser_session_id`, and `navigation_epoch`;
- `hop_index`, normalized approval state, and the validated approval receipt
  reference/digest when one is consumed;
- approval-trust-root and navigation-state-key fingerprints plus the validated
  navigation-state digest;
- the complete prior redirect chain and prior signed decision receipts;
- normalization flags, including IDN and terminal-dot presence;
- every fired rule ID and its pinned provenance reference;
- one decision: `allow`, `require_human`, or `deny`;
- deterministic decision reason and optional exact human-approval reference;
- `decision_receipt_id`, decision payload SHA-256, signer key ID, and Ed25519
  signature;
- no claim that the assessment sent, followed, or enforced navigation.

## Allowed Files

- `docs/contracts/browseahead-keo-197-domain-path-slop-squatting.md`

## Verification Plan

Run from the isolated BA1 worktree:

```powershell
rtk git ls-remote origin refs/heads/main
rtk git rev-parse HEAD
rtk git merge-base HEAD origin/main
rtk git status --short --branch
rtk git diff --name-only 39769d2e300a188dc9935aa707d4559b0aaad2b5...HEAD
rtk git diff --check 39769d2e300a188dc9935aa707d4559b0aaad2b5...HEAD -- docs/contracts/browseahead-keo-197-domain-path-slop-squatting.md
rtk git diff --exit-code 39769d2e300a188dc9935aa707d4559b0aaad2b5...HEAD -- . ":(exclude)docs/contracts/browseahead-keo-197-domain-path-slop-squatting.md"
```

The coordinator must also:

- compare the target contract byte-for-byte on every semantic table against
  the ratified active spec;
- verify the WAAA v1 source and pinned artifact fingerprints without executing
  or serving their attack pages;
- confirm no DNS/HTTP/browser call was made for any `.test` fixture;
- confirm the shared gateway checkout still contains only its pre-existing
  `.serena/project.yml` change; and
- run the repository's applicable Markdown/link checks, if present, without
  expanding Allowed Files.

Both independent reviewers must answer:

1. Does every rule have a literal predicate, stable ID, exact outcome, source
   classification, and binding fixture without an invented heuristic?
2. Can any positive provenance bypass IDN, typo, deceptive-subdomain,
   registrable-change, policy, redirect, or prior-decision precedence?
3. Is every redirect assessed from a caller/browser-supplied proposed hop
   before its next request, while fetching, resolving through network,
   following, or navigating remains impossible in BA1?
4. Can a model-invented path or domain reach `allow` without an exact trusted
   URL/route/observation binding?
5. Does `require_human` prevent network and bind approval to exactly one URL,
   session, epoch, ruleset, and hop without creating an allowlist?
6. Are WAAA artifacts used only as threat/PoC provenance and Keon synthetic
   fixtures labeled honestly?
7. Did exactly the one Allowed File change from the exact base, with the dirty
   shared checkout and revenue-critical parcels untouched?

## Ratified Decisions

Clint Morgan ratified BA1-R1 through BA1-R8 on 2026-07-30. These decisions are
authoritative for this parcel.

1. **BA1-R1 — Decision outcomes.** The literal rule/outcome table above governs
   BA2: malformed and
   structurally deceptive inputs deny; unresolved IDN, registrable-domain,
   model-invented, path, redirect, and explicit-unknown cases require a
   one-hop human decision.
2. **BA1-R2 — Normalization.** Use .NET 10
   `System.Globalization.IdnMapping` with `UseStd3AsciiRules=true` and
   `AllowUnassigned=false`, forced through app-local ICU package
   `Microsoft.ICU.ICU4C.Runtime` version `72.1.0.3`; fail closed if app-local
   ICU is unavailable or a different globalization backend/version is loaded.
   Pin `publicsuffix/list` file commit
   `e1b8015c3b2f0f4f8c18659c2480fc1a22c07b20`; the complete
   `public_suffix_list.dat` is 332766 bytes with SHA-256
   `fe6adc7fb8014f57d28d69b18d0aa3e581efb432544922e12131a5d4a87bd954`,
   and the UTF-8 byte sequence from `// ===BEGIN ICANN DOMAINS===` through
   `// ===END ICANN DOMAINS===` inclusive has SHA-256
   `41f0cde2b5574dfc1f394ac8793837ee727b7a69438d3c4d38297f3297de9a18`.
   BA2 vendors only that pinned ICANN section, performs no runtime update or
   network fallback, records all versions/digests in its ruleset, and fails
   build/startup validation on any mismatch.
3. **BA1-R3 — Typo predicate.** Restricted Damerau-Levenshtein distance exactly
   1 against a trusted intended ASCII host/registrable domain is the only
   authorized typo rule; no phonetic, brand, keyboard-layout,
   substring, or model-based similarity rule in BA2.
4. **BA1-R4 — Search-result provenance.** An exact observed search-result URL
   may not allow cross-registrable navigation by itself. Exact search
   observation proves the model
   did not invent the URL, but a cross-registrable change still requires human
   approval unless user/application policy explicitly authorized that target.
5. **BA1-R5 — Redirect boundary.** A same-origin exact browser-supplied
   `Location` is allowed when no higher rule fires, while every
   cross-registrable hop requires a new human approval. Never inherit approval
   across hops.
6. **BA1-R6 — Reputation evidence.** Absence fires no reputation rule; it never
   upgrades trust. Only versioned offline evidence may emit `blocked`,
   `abandoned`, or `unknown`; BA2 performs no lookup.
7. **BA1-R7 — Human approval lifetime.** Approval may not cover more than one
   URL or hop. Bind it to one exact normalized URL,
   session, epoch, ruleset digest, and hop; no wildcard or reusable allowlist.
8. **BA1-R8 — Pinned WAAA artifact sufficiency.** The public mirror's per-file
   SHA prefixes and full HTTP ETags are accepted only as threat/PoC provenance
   for BA1. The exact accepted pins are: `attacks.csv` SHA prefix `5a8787c1`
   and ETag `f-4806ea30f1321ef183cb80532ad161643ffa565a`;
   `attacks-appendix.pdf` SHA prefix `a5bc2e6d` and ETag
   `f-50fb05545bb01386b18da8087f49ddd8363da29c`;
   `a15/app/prompt.text` SHA prefix `9f720b59` and ETag
   `f-d8e95a2b39830520e02e3db72d185f76d00206d0`; and
   `a15/app/templates/index.html` SHA prefix `6756f41b` (the observed authority
   supplied no ETag for this file). Do not vendor or execute the artifact. If
   stronger provenance is required, stop until the authors publish a
   commit-addressed repository or archive digest.
