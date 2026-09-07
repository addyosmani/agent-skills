# Goal Charter — Model Fleet V1

**Goal slug:** `model-fleet-v1`  
**Created:** 2026-09-03  
**Owner:** Clinton Morgan  
**Status:** STOPPED AT MF-P0 `NO-GO` — evidence not acceptance-closed; MF-P1–MF-P4 not dispatched  
**Coordinator:** `/root` — current Remote-safe Codex conversation; claimed 2026-09-03  
**Mode:** host-local architecture and implementation goal  
**Implementation target:** one Windows workstation controlled through ChatGPT Remote

## Ratified Stage Zero assumptions

These assumptions were explicitly ratified through Gate 1:

1. V1 is a deliberately small bootstrap, not the full empirical fleet router.
2. The three requested implementation artifacts are the complete static V1 product
   surface. This charter and generated run receipts are governance/evidence, not extra
   implementation artifacts.
3. V1 may send only explicitly eligible task and repository context to OpenRouter. It must
   refuse when eligibility is absent or ambiguous.
4. Write-capable workers receive an already-created clean, isolated Git worktree. V1 does
   not create branches or worktrees for them.
5. Installation is user-local. No repository packages, Codex native-agent definitions, or
   Remote root configuration are changed by this goal.

## Objective

Create a tiny, deterministic Model Fleet that lets the Remote-safe primary Codex remain the
foreman while launching separate OpenRouter-backed `codex exec` processes for bounded
research, review, implementation, testing, and documentation work on the connected Windows
computer.

The primary Codex must preserve its OpenAI/ChatGPT identity, authority, and live Remote
compatibility. Workers cross the provider boundary only inside separate child processes,
receive role-specific constraints and an explicit sandbox, and return one strict structured
receipt. The foreman reconciles worker evidence, inspects real filesystem and Git state,
reruns material verification, resolves disagreements, and remains the only source of the
final judgment shown to the user.

V1 succeeds when a Remote-directed foreman can safely run the researcher → builder →
reviewer path against a synthetic or explicitly eligible repository, consume typed results,
and prove that the root conversation's provider/model configuration never changed.

## Relationship to existing goals

`model-fleet-v1` is a focused host-local proving slice adjacent to
`heterogeneous-agent-worker-fabric`; it does not amend, implement, satisfy, or inherit
authority from that broader goal. The broad goal owns production-grade routing, registry,
promotion, evaluation, rollback, and multi-provider policy. This goal owns only the three
user-local artifacts named below.

If either goal claims the same files, provider policy, worker-result contract, or promotion
decision, both stop until the owner explicitly sequences them. Evidence from this V1 may be
offered to the broader goal later, but is never credited automatically.

## Current evidence baseline

Verified on this workstation on 2026-09-03 without making a provider call:

- `codex-cli 0.144.1` is installed.
- `codex exec --help` exposes `--profile`, `--cd`, `--sandbox`, `--json`,
  `--output-schema`, `--output-last-message`, and prompt input over stdin.
- `C:\Users\clint\.codex\config.toml` currently selects `gpt-5.6-sol` with
  `model_provider = "openai"` and defines the `openrouter` provider by URL and environment
  variable name.
- `C:\Users\clint\.codex\openrouter.config.toml` currently selects
  `~openai/gpt-latest`, `model_provider = "openrouter"`, `workspace-write`, and `never`.
- `C:\Users\clint\.codex\fleet\` and
  `C:\Users\clint\.agents\skills\model-fleet\SKILL.md` do not yet exist.
- `OPENROUTER_API_KEY` was not present in the current process environment. No key value,
  length, hash, or storage location was inspected, and no OpenRouter request was attempted.

The command/profile behavior is also documented in the official OpenAI references:

- [Developer commands](https://learn.chatgpt.com/docs/developer-commands?surface=cli)
- [Configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)
- [Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)

These are drift-prone facts. MF-P0-style preflight is part of every implementation or live
validation session even though it produces no additional static artifact.

## Locked decisions

The following decisions are binding through Gate 1. Entries marked `(A1)` contain the
ratified plan-review amendment.

| ID | Decision | Reasoning |
|---|---|---|
| D1 (A1) | V1 ships exactly three static implementation artifacts at the final paths: `Invoke-FleetWorker.ps1`, `worker-result.schema.json`, and `model-fleet/SKILL.md`. Candidate staging, parcel specs, review records, pre-install snapshots, hashes, temporary test repositories, canaries, and generated run receipts are governance or ephemeral evidence, not additional static product artifacts. After Gate 2, each parcel may perform a reversible candidate installation to its final path only after proving the path absent or recording a byte-for-byte rollback snapshot. Installation is not acceptance. Gate 3 is the human decision to accept and use the installed fleet routinely. | This proves the trust boundary without prematurely building a platform and removes the circularity between installation and post-install evidence. |
| D2 | The root remains `model = "gpt-5.6-sol"` and `model_provider = "openai"`. The launcher may not edit base config, the OpenRouter overlay, native agent definitions, or the active Remote session. | The root's first-party identity is the Remote compatibility and authority boundary. |
| D3 | Every worker is a new `codex exec --profile openrouter` operating-system process. No OpenRouter identity is selected in the root conversation and no V1 worker is implemented as a native Codex subagent. | A separate process plus explicit profile and sandbox creates the cleanest currently documented cross-provider boundary. |
| D4 (A1) | The launcher requires `-Role`, `-Task`, `-Repo`, and `-DataClassification`. Every write-capable invocation also requires one or more normalized `-AllowedPath` values; absent or escaping paths fail before provider invocation. `internal-approved` additionally requires a user-supplied `-ApprovalRef` bound in run metadata to the resolved repo, task digest, data class, expiry, and authorized provider. Bounded operational switches may include `-TimeoutMinutes` and `-PreflightOnly`. The launcher uses a trusted executable path plus an argument list, sends the composed prompt over stdin, and never uses `Invoke-Expression`. | Explicit authority inputs, safe executable resolution, and stdin make scope and escaping testable. |
| D5 | Roles are fixed to `researcher`, `reviewer`, `builder`, `tester`, and `documenter`. The launcher, not the caller or worker, maps roles to sandboxes and role contracts. Unknown roles fail closed. | The worker cannot choose or widen its own authority. |
| D6 (A1) | `researcher` and `reviewer` use `read-only`; `builder`, `tester`, and `documenter` use `workspace-write`. Every worker also runs under the strongest supported native Windows sandbox/permissions boundary, with exact eligible read roots and exact write roots derived from the resolved repository, role, and allowed paths. Preflight canaries must prove denial of unrelated home files, inherited-secret reads from tool subprocesses, junction/symlink escapes, outside writes, and unauthorized network. No V1 path uses `danger-full-access`, `--add-dir`, sandbox bypass, hook-trust bypass, or interactive approvals. If the installed Codex/Windows runtime cannot prove confinement, dispatch stops unless a separately ratified hardened disposable environment supplies it. | Sandbox labels alone are insufficient for a third-party provider boundary; the actual host must prove the claimed confinement. |
| D7 (A1) | Model-generated commands and their descendants must have outbound network denied by a preflight-proven sandbox or firewall boundary. The Codex parent transport may reach only the configured OpenRouter endpoint needed for inference. “Unsupported,” “best effort,” or a failed network canary is a stop condition, not a warning. Workers may not perform cloud, deployment, publication, messaging, purchasing, credential, Git push, PR, or other external-effect actions. | The provider network hop is required; arbitrary worker-initiated external effects must fail closed. |
| D8 | The launcher verifies that `-Repo` resolves to an existing Git worktree and passes the resolved literal path to `--cd`. Read-only roles may inspect a dirty tree but must leave it unchanged. Write roles require a clean, isolated worktree and unchanged starting `HEAD`; otherwise they refuse before provider spend. | The sandbox does not distinguish worker edits from the user's pre-existing edits. A clean isolated write target protects dirty work and makes attribution possible. |
| D9 | At most three read-only workers may run concurrently per repository. Only one write-capable worker may run against a given resolved worktree, enforced by a launcher-owned per-worktree mutex/lock. Read-only workers do not overlap a write worker on the same worktree. | The skill's sequencing rule must have a mechanical backstop, not only prompt text. |
| D10 (A1) | V1 accepts `public` or `internal-approved`. `public` must contain no nonpublic host or repository data. `internal-approved` is available only after the confinement canaries pass and requires a user-supplied, unexpired approval reference bound to the exact resolved repository, task digest, provider, and run data class. The coordinator may not mint or infer that reference. `restricted`, secret-bearing, regulated, personal, credential, and ambiguous data are refused. If approval or classification cannot be proven before launch, no provider request is made. | OpenRouter is an external processor; data classification and scoped authorization must be distinct and inspectable. |
| D11 (A1) | Authentication remains environment-based through `OPENROUTER_API_KEY`. The launcher may check presence only. The Codex parent process may use the value solely for provider transport, while explicit shell-environment filtering must exclude it and other sensitive variables from every model-generated command and descendant. Canary commands must prove absence without revealing any value, length, hash, or storage location. The launcher, prompt, events, receipts, and run metadata never read, print, persist, transform, or describe the credential. | The provider transport needs the credential; workers and their tools do not. |
| D12 | The launcher composes a versioned role contract before the user task. Every role must inspect before acting, remain within the assigned repository and task, avoid commits/pushes/unrelated files, run relevant checks when applicable, and return only the required result shape. | Stable role semantics make identical transport useful for distinct cognitive jobs. |
| D13 | `worker-result.schema.json` is strict: required fields are `status`, `role`, `summary`, `files_changed`, `tests`, `findings`, `blockers`, and `recommended_next_action`; enums and nested objects are bounded; `additionalProperties` is false throughout. | A typed receipt is the principal integration contract. Empty arrays remain present so absence is unambiguous. |
| D14 | `status` is one of `completed`, `blocked`, or `failed`; `role` must equal the requested role; test entries contain command, result, and optional bounded detail; findings contain severity, title, evidence, and recommendation. | Success, inability, and harness/model failure must not collapse into prose. Review findings need actionable structure. |
| D15 (A1) | Each invocation creates a unique owner-only run directory and records sanitized invocation metadata, final structured result, process exit state, and launcher validation state. Public runs may retain JSONL events for at most 30 days. Internal-approved runs process JSONL through an owner-only temporary stream and do not retain raw events; their sanitized metadata and final receipt expire after 7 days. Cleanup runs before and after invocation. Unexpected sensitive output causes a failed run, the narrowest possible owner-only quarantine pending human disposition, and no output echo to the foreman. Retention and deletion are best-effort filesystem lifecycle controls, not secure-erasure claims. | Durable receipts remain inspectable without turning raw internal event streams into an indefinite second data store. |
| D16 | A worker receipt is a claim, not acceptance. The launcher cross-checks role, schema, exit code, start/end `HEAD`, and actual changed-file set. The foreman personally inspects the diff, reconciles changed files against the receipt, reruns material tests, and may reject any `completed` result. | Structured output removes parsing ambiguity; it does not transfer judgment or verification authority. |
| D17 (A1) | Default timeout is 30 minutes, launcher-layer automatic retry is zero, cancellation is terminal, and every retry receives a new run ID plus an explicit foreman decision. Timeout, concurrency, and retry controls bound execution exposure but do not create a hard monetary ceiling. V1 has no mechanically enforced per-run dollar cap; every live provider call therefore requires explicit human spend authorization, and a requirement for a hard dollar ceiling is a stop condition for V1. | Execution bounds prevent hidden repetition but must not be misrepresented as price enforcement. |
| D18 (A1) | The `$model-fleet` skill delegates only bounded work. Up to three independent read-only workers may share one resolved tree. Any run involving a write-capable worker is exclusive for that worktree: no other read or write worker may overlap it. The skill requires independent post-change review before recommending acceptance and never tells the foreman to trust worker conclusions or skip personal validation. | This makes concurrency useful and unambiguous while retaining root accountability. |
| D19 | V2 capability/cost/latency routing, hard-coded role-to-model maps, empirical Cortex learning, native OpenRouter custom agents, multi-host scheduling, automatic worktree creation, provider fallback, and production default-route promotion are out of scope. | V1 proves one lane before generalizing the exchange. |

## Role contract

| Role | Sandbox | May change files? | Purpose | Required result emphasis |
|---|---|---:|---|---|
| `researcher` | `read-only` | No | Trace code, docs, architecture, and evidence | Sources inspected, supported conclusions, uncertainties |
| `reviewer` | `read-only` | No | Adversarially challenge assumptions or a change | Ranked findings with concrete file/line or command evidence |
| `builder` | `workspace-write` | Yes | Make the smallest coherent implementation | Exact files changed and tests run |
| `tester` | `workspace-write` | Yes, only when the task explicitly requires test artifacts | Reproduce, test, and isolate failures | Reproduction steps, observed results, artifacts changed |
| `documenter` | `workspace-write` | Yes, docs/spec scope only | Produce or amend documentation | Documents changed, sources, unresolved decisions |

The sandbox is a maximum capability, not an authorization to use every capability it
contains. Role and task scope remain narrower.

## Worker result contract

The semantic V1 shape is:

```json
{
  "status": "completed",
  "role": "builder",
  "summary": "Implemented cache invalidation on epoch transition.",
  "files_changed": [
    "src/Cortex/EpochCache.cs"
  ],
  "tests": [
    {
      "command": "dotnet test",
      "result": "passed",
      "detail": "Focused suite passed."
    }
  ],
  "findings": [],
  "blockers": [],
  "recommended_next_action": "Run independent adversarial review."
}
```

`findings` entries are structured objects with `severity`, `title`, `evidence`, and
`recommendation`. The schema owns exact lengths, enums, required fields, URI/path treatment,
and rejection of extra properties. A schema-valid receipt can still be factually wrong.

## Deterministic invocation contract

After MF-P0 proves the exact local permission mechanism, the launcher constructs the
equivalent transport spine:

```powershell
$Prompt | & codex exec `
    --profile openrouter `
    --cd $ResolvedRepo `
    --sandbox $RoleSandbox `
    --config 'sandbox_workspace_write.network_access=false' `
    @PermissionBoundaryArguments `
    @ShellEnvironmentFilterArguments `
    --output-schema $SchemaPath `
    --output-last-message $FinalPath `
    --json `
    -
```

The placeholder argument sets above are not permission claims. MF-P0 must replace them with
the exact supported, canary-proven mechanism or stop. Exact quoting and process capture
belong to the implementation, but the following are contractual:

- `--profile openrouter` is present on every worker call;
- no `--model` or provider override is accepted from the caller;
- prompt content is supplied over stdin;
- stdout JSONL and the final message are processed separately under D15's data-class-aware
  retention rules;
- the role-derived sandbox cannot be widened by an input switch;
- exact read/write roots, shell-environment filtering, and network denial pass the MF-P0
  canaries before dispatch;
- process exit code, schema validity, and repository state are checked before returning;
- a missing/invalid final message becomes a typed launcher failure and never `completed`.

## Implementation artifacts

Only these static artifacts may be created or edited by the implementation parcels:

```text
C:\Users\clint\.codex\fleet\Invoke-FleetWorker.ps1
C:\Users\clint\.codex\fleet\worker-result.schema.json
C:\Users\clint\.agents\skills\model-fleet\SKILL.md
```

`C:\Users\clint\.codex\fleet\runs\` is created lazily by the launcher and contains only
runtime evidence. No secrets belong there.

## Parcel decomposition

| Parcel | Outcome | Risk / routing | Dependencies | Allowed static files |
|---|---|---|---|---|
| MF-P0 — Host boundary feasibility | Proves trusted executable/runtime resolution, elevated Windows confinement, environment filtering, filesystem/junction/network canaries, and the go/no-go boundary before product implementation. | architecture/security risk; two independent reviews | none | none — temporary/generated evidence only |
| MF-P1 — Worker result contract | Produces the strict, dialect-pinned JSON Schema and ephemeral positive/negative fixtures. | architecture/risk; two independent reviews | MF-P0 | `worker-result.schema.json` |
| MF-P2 — Deterministic launcher | Produces allowed-path enforcement, process-tree control, locking, evidence lifecycle, rollback, schema/receipt validation, and failure normalization. | architecture/security risk; two independent reviews | MF-P1 | `Invoke-FleetWorker.ps1` |
| MF-P3 — Foreman skill | Produces the user-level skill without claiming system acceptance. | architecture/risk; two independent reviews | MF-P2 | `model-fleet/SKILL.md` |
| MF-P4 — Integration and security evidence | Independently runs canaries and the approved researcher → builder → reviewer proof, reconciles receipts/diffs/tests/root identity, and presents Gate 3 evidence. | architecture/security risk; two independent reviews | MF-P1, MF-P2, MF-P3 | none — temporary/generated evidence only |

The implementation spine is sequential. MF-P0 and MF-P4 create no static product file.
Temporary test repositories and generated run receipts are disposable evidence, not parcel
source files.

## Verification strategy

### Preflight

- Confirm the installed CLI still exposes every required flag.
- Confirm the base config still selects OpenAI and `gpt-5.6-sol`.
- Confirm the overlay still selects OpenRouter and `~openai/gpt-latest`.
- Confirm the provider definition uses the expected base URL and environment variable name.
- Check only whether the environment variable is present; do not inspect its value.
- Resolve and pin the trusted Codex executable and supported PowerShell runtime.
- Prove the strongest supported native Windows sandbox/permission mechanism using exact
  filesystem, environment, junction/symlink, outside-write, and network canaries.
- Stop before MF-P1 if the host cannot prove D6, D7, D10, and D11.
- Stop on pre-existing target artifacts unless their ownership and desired disposition are
  explicit.

### Deterministic negative controls

- Unknown role is refused before provider invocation.
- Missing, non-Git, unresolved, or non-directory repository input is refused.
- Write role against a dirty or non-isolated target is refused.
- Write role without normalized allowed paths, or with an escaping allowed path, is refused.
- Unsupported or ambiguous data classification is refused.
- `internal-approved` without a user-supplied, unexpired, run-bound approval reference is
  refused.
- Concurrent write roles against one worktree cannot both launch.
- Read-only and write overlap against one worktree is refused.
- Unrelated home reads, sensitive environment access, junction/symlink escapes, outside
  writes, and model-command outbound network are denied by canary.
- Invalid JSON, missing fields, extra fields, wrong role, and unrecognized enums are rejected.
- Nonzero child exit, timeout, cancellation, and missing final output become typed failures.
- Timeout and cancellation terminate descendants and verify the process tree is gone.
- A worker-created commit or changed `HEAD` is detected and blocks acceptance.
- Tracked, untracked, ignored, index, ref/reflog, and relevant filesystem deltas outside the
  allowed scope block acceptance.
- A receipt whose `files_changed` disagrees with Git state is rejected.
- Public and internal-approved runs obey their owner-only ACL and retention rules.
- Base config and Remote root identity remain byte-for-byte unchanged.

### Positive controls

- A schema-valid fixture passes local validation.
- The pinned schema dialect and local validator accept the supported subset.
- Each role maps to the expected immutable role contract and sandbox.
- Independent read-only work can run within the concurrency bound.
- A write-role lock is released after success, failure, timeout, and cancellation.
- One live researcher run returns a validated receipt without modifying its repository.
- One live builder run in a clean disposable worktree makes an intentionally tiny change and
  reports the exact file.
- One independent live reviewer run inspects that change read-only.
- The foreman inspects the diff and reruns the declared material check before acceptance.

Live provider calls use only synthetic/public test content unless Clinton explicitly approves
an `internal-approved` target. A successful live worker call is provider evidence, not proof
that every OpenRouter-routed model or future Codex release is compatible.

## Exit criterion

The goal exits only when all of the following are true:

1. Gate 1 and the mandatory fresh plan-level adversarial review are closed.
2. The three and only three static implementation artifacts exist at the exact paths above.
3. All five parcels complete their required independent reviews and deterministic checks;
   MF-P0 and MF-P4 produce evidence but no static product files.
4. The root configuration and active Remote model/provider identity are unchanged.
5. Negative controls prove role refusal, data/approval refusal, dirty-tree refusal,
   allowed-path enforcement, write serialization, filesystem/environment/junction/network
   confinement, schema failure, child-process failure, process-tree termination, `HEAD` and
   out-of-scope mutation detection, retention behavior, and receipt/diff disagreement.
6. A live OpenRouter researcher returns a valid read-only receipt against eligible data.
7. A live builder changes only its assigned disposable worktree, and a separate live reviewer
   reviews the resulting diff without modifying it.
8. The primary Codex personally reconciles receipts with the actual diff and rerun test
   evidence, then records an honest accepted/rejected judgment.
9. `$model-fleet` is discoverable in a fresh Remote-safe Codex conversation and a dry-run or
   preflight demonstrates that activation does not switch the root provider.
10. The final report identifies the exact generated run directories, known limitations,
    provider spend boundary, and any unsupported data or repository classes.

## Boundaries

### Always

- Preserve the user's dirty work and use clean isolated worktrees for write roles.
- Resolve literal paths before launch.
- Derive sandbox and role instructions from the fixed role registry.
- Capture and validate typed results.
- Compare worker claims to Git/filesystem evidence.
- Keep the primary Codex as final authority.

### Ask first

- Send any `internal-approved` repository or task context to OpenRouter.
- Make a live provider call that incurs spend.
- Replace any pre-existing fleet or skill artifact.
- Change the three-artifact surface, role list, data eligibility, timeouts, or concurrency.
- Fold this goal into `heterogeneous-agent-worker-fabric` or share its contract.

### Never

- Read, print, hash, persist, or prompt-inject an API key or credential.
- Send restricted, secret-bearing, regulated, personal, or ambiguous data to a worker.
- Modify the Remote root model/provider configuration.
- Use `danger-full-access`, sandbox bypass, hook-trust bypass, or caller-selected models.
- Run multiple write workers or read/write overlap on one worktree.
- Commit, push, open PRs, deploy, publish, purchase, message, or change cloud state.
- Treat schema validity, process success, a worker test claim, or a green worker conclusion as
  foreman acceptance.

## Human gates and requested standing authority

- **Gate 1 — charter ratification:** closed. Clinton Morgan ratified original D1–D19 and then
  explicitly ratified Amendment A1 plus the revised MF-P0–MF-P4 graph on 2026-09-03.
- **Gate 2 — parcel dispatch:** granted by Clinton Morgan on 2026-09-03 for exactly MF-P0
  through MF-P4 in dependency order. It authorizes reversible candidate installation to
  the three final paths after absence proof or byte-for-byte rollback snapshots; it does
  not imply Gate 3 acceptance.
- **Provider/spend activation:** not granted. Each live validation phase requires
  explicit approval for the named data class and target; no approval is inferred from key
  presence.
- **Gate 3 — acceptance:** not delegated. Candidate installation is not acceptance. The
  decision to accept and use Model Fleet routinely remains human-owned after MF-P4 presents
  the green evidence chain.
- No commit, push, merge, native-agent registration, broader worker-fabric promotion, or
  external operational effect is requested by this charter.

## Stop conditions

Stop and report if:

- a required change would create a fourth static implementation artifact;
- the root provider/model or base/overlay meaning would change;
- `--profile openrouter` no longer creates a separate overlayed child configuration;
- required CLI flags or structured output are unavailable or incompatible;
- the strongest supported local boundary fails any filesystem, environment, junction,
  outside-write, process-tree, or network canary;
- a target contains data without explicit eligible classification;
- `internal-approved` lacks a user-supplied, unexpired, run-bound approval reference;
- a secret value becomes visible to prompts, logs, receipts, or the coordinator;
- a write role is asked to use a dirty/shared/non-isolated worktree;
- per-worktree serialization cannot be enforced mechanically;
- a worker changes `HEAD`, writes outside its target, or attempts an external effect;
- result-schema validation passes but repository evidence cannot be reconciled;
- the OpenRouter key is absent when a live call is required;
- a hard per-run monetary ceiling is required;
- a live provider call, spend, internal-data transfer, overwrite, or human gate would need to
  be inferred;
- another goal or owner claims one of the same artifacts or authority boundaries; or
- an implementation decision is not covered by a ratified D1–D19 decision.

## Gate 1 record

_Ratified. Clinton Morgan explicitly stated `Ratify Model Fleet V1 D1-D19.` on
2026-09-03. Gate 1 therefore binds D1–D19 exactly as written. Gate 2, provider/spend
activation, internal-data transfer, installation acceptance, and routine activation remain
ungranted._

_Plan-review closure. The mandatory fresh adversarial review completed on 2026-09-03 with
a `REVISE` verdict. Clinton Morgan then explicitly stated
`Ratify Model Fleet V1 Amendment A1 and revised graph MF-P0–MF-P4.` Amendment A1 therefore
binds D1, D4, D6, D7, D10, D11, D15, D17, and D18 as marked above; the MF-P0–MF-P4 graph is
ratified; and scoped Gate 1 re-ratification is closed. Gate 2, provider/spend activation,
internal-data transfer, and Gate 3 acceptance remain ungranted._

## Gate 2 record

_Granted. Clinton Morgan explicitly stated
`Grant Gate 2 for Model Fleet V1 MF-P0–MF-P4 under the ratified charter and loop directive.`
on 2026-09-03. Gate 2 covers exactly MF-P0–MF-P4 in dependency order under the limits in
`loop-directive.md`. It does not grant provider calls, spend, `internal-approved` transfer,
or Gate 3 acceptance._

## MF-P0 stop record

MF-P0 returned `NO-GO` on 2026-09-03. The production `codex` runtime could not start the
required elevated permission-profile sandbox; the separate desktop comparison runtime
permitted both an allowed-root junction read escape and model-command outbound HTTP. Current
permission-profile precedence also conflicts with the retained overlay's legacy
`sandbox_mode`.

Independent Review A passed the soundness of the `NO-GO`. Independent Review B returned
`REQUEST CHANGES` because the evidence transcript was incomplete and four serial temporary
roots exceeded the parcel's one-root authorization. Those findings are preserved and not
waived. MF-P0 is stopped, not accepted or completed; MF-P1 through MF-P4 were not dispatched.
No product artifact, provider call, spend, internal-data transfer, or Gate 3 action occurred.
