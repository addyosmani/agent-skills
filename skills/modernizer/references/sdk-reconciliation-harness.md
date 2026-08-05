Alright, brother. Here’s the **drop-in starter template** plus the **SDK reconciliation harness checklist** you can run *today* for **omega-sdk → C#**. No fluff. This is built to generate receipts and keep drift honest.

---

## `examples/omega-sdk-to-csharp.yaml`

```yaml
source:
  type: repo
  location: "<GIT_URL_OR_SSH>"
  branch: main
  include_patterns:
    - "**/*"
  exclude_patterns:
    - "**/node_modules/**"
    - "**/dist/**"
    - "**/build/**"
    - "**/.git/**"
    - "**/.idea/**"
    - "**/.vscode/**"
    - "**/*.lock"
    - "**/coverage/**"
    - "**/*.snap"

target:
  stack: "C# .NET 10 class library (SDK)"
  output_path: "D:/Repos/omega-sdk-csharp"
  repo_init: true
  solution_name: "Omega.Sdk"

options:
  mode: full_rewrite

  contract_sources:
    # SDK rewrite: traces usually aren’t HTTP; prefer tests + golden fixtures + schemas.
    prefer: [tests, schemas, docs, logs, traces]
    trace_capture:
      enabled: false
      duration_seconds: 0
      transport: libcall
      redaction_profile: pii-basic

  drift:
    tolerance: 0.02
    scoring: weighted
    # STRICT: if these drift, we fail fast.
    strict_fields:
      - "status"
      - "error.code"
      - "response_schema"
      - "serialization.format"     # JSON shape rules
      - "wire.contract"            # canonical request/response contract
    # IGNORE: always noisy in SDK land
    ignore_fields:
      - "timestamps.*"
      - "traceId"
      - "requestId"
      - "headers.date"
      - "headers.server"
    float_epsilon: 1e-6
    ordering: set

  reconciliation:
    enabled: true
    min_samples_per_contract: 20
    coverage_targets:
      happy_path: 0.45
      error_cases: 0.30
      edge_cases: 0.20
      security_flows: 0.05
    classification_rules:
      happy_path: "2xx or success response object; no warnings"
      error_cases: "known error code families, thrown exceptions, non-success responses"
      edge_cases: "null/empty/max length/utf8/unicode/float precision/big int"
      security_flows: "token missing/expired/bad signature/tenant mismatch"
    # SDK-specific recon: focus on serialization + request formation + error handling
    # (not server responses unless you have a deterministic mock server)
    # The harness should compare 'wire contracts' + 'client-side behavior'.

  data_handling:
    encrypt_at_rest: true
    redact:
      - pattern: "(?i)authorization:.*"
      - jsonpath: "$..password"
      - jsonpath: "$..token"
      - jsonpath: "$..secret"
      - jsonpath: "$..apiKey"

  stop_conditions:
    min_contracts: 12
    max_low_confidence_ratio: 0.15
    strict_drift_abort: true
    max_retry_per_task: 2

  forced_optimizations:
    - "use HttpClientFactory patterns if networked"
    - "System.Text.Json source-gen if stable models"
    - "avoid reflection-heavy serialization for hot paths"

  exclusions:
    - module: "examples"
      reason: "Not part of public SDK surface"
    - module: "benchmarks"
      reason: "May be rebuilt later after parity"
```

---

## SDK Reconciliation Harness — “Truth Serum” Checklist (Run Today)

This is the **fastest way** to reconcile an SDK rewrite without needing a real backend. You validate what SDKs *actually own*:

### A) Define what “behavioral parity” means for an SDK

SDK parity is mostly:

1. **Serialization** (request/response JSON shape, casing, enums, null handling)
2. **Request construction** (paths, query params, headers, auth injection)
3. **Errors** (exception types, codes, messages, retry behavior)
4. **Determinism** (same input → same wire contract)

If those match, you’re 80% there.

---

## 1) Create a deterministic “Wire Contract Recorder”

**Goal:** In both SDKs (legacy + C#), run the same high-level calls and record:

* method name
* URL path
* query parameters
* headers (redacted)
* serialized JSON body
* timeout/retry policy representation
* expected error mapping (if simulated)

**Artifact format (recommended):**
`receipts/wire/<contract_id>/<sample_id>.json`

Example shape:

```json
{
  "op": "CreateEvidencePack",
  "path": "/v1/packs",
  "query": {"dryRun":"false"},
  "headers": {"x-tenant-id":"T1"},
  "body": {"correlationId":"C123","items":[...]},
  "auth": {"type":"bearer","present":true},
  "client_policy": {"timeout_ms":30000,"retries":3,"backoff":"exp"}
}
```

**Important:** redact secrets; do not store Authorization.

---

## 2) Golden Fixture Suite (Serialization Parity)

**Goal:** Build a folder of fixtures that represent the SDK’s public models.

* `fixtures/requests/*.json`
* `fixtures/responses/*.json`
* `fixtures/errors/*.json`

Test both SDKs:

* deserialize → reserialize → compare to golden (canonicalized JSON)
* strict match on naming, enum representation, null handling, number formatting (within epsilon)

**Receipt output:**

* `receipts/fixtures/fixture_results.json`
* `receipts/fixtures/diffs/<name>.diff`

---

## 3) Mock Transport Layer (No Server Required)

**Goal:** Replace the network transport with a deterministic stub so you can test:

* retry behavior
* error mapping
* idempotency handling
* cancellation/timeout mapping

**Pattern:**

* Legacy SDK: monkeypatch/fake transport / adapter
* C# SDK: inject `HttpMessageHandler` or a transport interface

**Receipts:**

* record each attempted request (count, delay, headers, body)
* confirm retry/backoff policy equivalence

---

## 4) Contract Extraction for SDKs (What contracts look like)

SDK contracts should be written like:

* “Given this input model → the SDK emits this wire contract”
* “Given this response body → the SDK returns this model”
* “Given this error response → the SDK throws this exception/code”

Example SDK contract:

```yaml
contract_id: cid-...
module: "Omega.Sdk.Packs"
name: "CreatePack emits correct wire contract"
given:
  input:
    correlationId: "C123"
    items: [{kind:"x", value:"y"}]
when: "CreatePack(input)"
then:
  status: 0
  response:
    wire_contract_path: "/receipts/wire/cid-.../sample-01.json"
  invariants:
    - "x-tenant-id header present"
    - "body.correlationId preserved"
  side_effects:
    - type: http_call
      target: "/v1/packs"
      operation: "POST"
      where: {"body.correlationId":"C123"}
determinism:
  sources_of_nondeterminism: ["time"]
  strategy: ["freeze_time"]
```

---

## 5) Drift Scoring for SDKs (practical)

Your weighted drift should mostly be:

* 50% serialization parity (body shape)
* 30% request metadata parity (path/query/headers excluding ignored)
* 20% behavior parity (retry attempts, error mapping)

**Strict fields** should include:

* endpoint path
* method
* required headers
* required body fields
* error codes & exception types

---

## 6) One-command Replay (Receipts Pack)

Generate:

* `receipts/replay.ps1`
* `receipts/replay.sh`

That:

1. builds both SDKs
2. runs fixture tests
3. runs wire recorder suite
4. produces diffs + hashes

Also generate:

* `receipts/hashes.sha256`
* `receipts/manifest.json`

So anyone can verify nothing changed.

---

# What to implement first (today, in order)

1. **Transport injection seam** in C# SDK (HttpMessageHandler or `ITransport`)
2. **Wire recorder** + redaction
3. **Golden fixtures** + canonical JSON compare
4. **Retry/error tests** via mock transport
5. **Receipt pack** output + replay scripts

Do those and you’ll have a brutal, undeniable recon story even before every endpoint is rewritten.

---

## One more thing (the “competition-winning” mic drop)

Add a final artifact:

* `DEFENSIBILITY.md`

One page:

* what was proven
* how it was proven
* how to replay it
* what drift means
* what was tombstoned (if anything)

Nobody else will have that. They’ll have vibes and working code. You’ll have *proof*.

---