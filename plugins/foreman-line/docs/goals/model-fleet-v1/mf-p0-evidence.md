# MF-P0 Host Boundary Feasibility Evidence

**Date:** 2026-09-03  
**Coordinator:** `/root`  
**Disposition:** `NO-GO — STOPPED`; Review B leaves the evidence package not
acceptance-closed  
**Provider calls:** none  
**Product artifacts created or changed:** none

## Scope and authority

This evidence executes MF-P0 only under the Gate 2 grant recorded in the ratified charter and
loop directive. No provider/spend authorization, internal-data transfer authorization, or
Gate 3 acceptance was inferred. Step 0 was accepted before active canaries: no product
artifact, provider call, secret read, persistent policy change, or test path outside a
uniquely named current-user temporary directory was allowed.

## Environment inventory

| Item | Observation |
|---|---|
| OS | `Microsoft Windows NT 10.0.26200.0` |
| PowerShell | `7.6.5`, Core |
| `Get-Command codex` | External script `D:\nodejs_symlinks\codex.ps1` |
| production command version | `codex-cli 0.144.1` |
| production native executable | `D:\nodejs_symlinks\node_modules\@openai\codex\node_modules\@openai\codex-win32-x64\vendor\x86_64-pc-windows-msvc\bin\codex.exe` |
| desktop-bundled comparison executable | `C:\Users\clint\AppData\Local\OpenAI\Codex\bin\fac60c5e9a2ae3df\codex.exe`, `codex-cli 0.150.0-alpha.12.2` |
| sandbox setup marker | version `5`; no proxy ports recorded |
| repository start/end `HEAD` | `5ce6ddc7f996d764e506b6b421779fbf3ece689a` |

`codex exec --help` advertised profiles, working-directory selection, legacy sandbox modes,
JSONL output, output schemas, and final-message output. `codex sandbox --help` established the
locally supported helper syntax as `codex sandbox -P <permission-profile> -C <directory>
<command>`; `codex sandbox windows ...` is not valid syntax in 0.144.1.

The base configuration still selects `gpt-5.6-sol` through `openai`. The OpenRouter overlay
still selects `~openai/gpt-latest` through `openrouter` and contains
`sandbox_mode = "workspace-write"`. Neither file was written. Current
[Codex permission documentation](https://learn.chatgpt.com/docs/permissions) says a selected
profile containing `sandbox_mode`, or a command using `--sandbox`, activates the older
sandbox settings instead of local permission profiles. Therefore the ratified
`codex exec --profile openrouter` plus role-specific exact permission profile design cannot
compose as specified. `codex exec --help` also exposes no `-P` switch. This is supporting
documentation evidence, not a version-pinned local reproduction; the runtime and canary
failures below independently decide the result.

## Canary construction

Four generated roots were resolved as direct children of
`[System.IO.Path]::GetTempPath()` before use:

- `C:\Users\clint\AppData\Local\Temp\model-fleet-mf-p0-20260903224943`
- `C:\Users\clint\AppData\Local\Temp\model-fleet-mf-p0b-20260903225646`
- `C:\Users\clint\AppData\Local\Temp\model-fleet-mf-p0c-20260903231500`
- `C:\Users\clint\AppData\Local\Temp\model-fleet-mf-p0d-20260903233000`

The credited exact-root profile had this logical shape, supplied only as command-line
configuration for each helper invocation:

```toml
[permissions.mf-restricted.workspace_roots]
"<resolved-temp-root>/allowed" = true

[permissions.mf-restricted.filesystem]
":minimal" = "read"

[permissions.mf-restricted.filesystem.":workspace_roots"]
"." = "write"

[permissions.mf-restricted.network]
enabled = false
```

Each invocation also selected `windows.sandbox="elevated"`, inherited the parent environment,
and excluded `OPENROUTER_API_KEY` plus `MF_SYNTHETIC_SECRET` through
`shell_environment_policy.filters`. No credential value, length, hash, quoting, or storage
location was inspected or emitted.

## Production-path result: Codex 0.144.1

The production native executable behind the `codex` command was invoked with the proved
syntax:

```powershell
& $ProductionCodex sandbox `
  -c 'windows.sandbox="elevated"' `
  -c $EnvironmentFilter `
  -c $ExactRootPermissionProfile `
  -P mf-restricted `
  -C $AllowedRoot `
  <native-canary-command>
```

Identity, allowed-read, allowed-write, outside-home-read, outside-write, environment, and
network probes each returned exit code `1` with
`windows sandbox failed: CreateProcessWithLogonW failed: 5`. A prior combined run stalled on
the junction probe and was terminated only after its exact coordinator-owned parent and
descendant command lines were verified. Thus the proposed production runtime cannot execute
the strongest native boundary at all; none of its positive controls is creditable.

## Desktop-build comparison: Codex 0.150.0-alpha.12.2

The same exact-root canaries were repeated against the separately installed desktop binary
to distinguish a 0.144.1 implementation failure from a generally usable host boundary.

| Probe | Expected | Exit/observation | Disposition |
|---|---|---|---|
| sandbox identity | isolated Windows account | `m0r6an\codexsandboxoffline`, exit `0` | pass |
| allowed file read | succeeds | exit `0` | pass |
| allowed-path write | succeeds | file created, exit `0` | pass |
| unrelated home-file read | denied | `Access is denied.`, exit `1` | pass |
| direct outside write | denied | file absent, `Access is denied.`, exit `1` | pass |
| transport-key name plus synthetic inherited secret | absent | both variables carried synthetic canary values in the parent; conditional probe exit `0` | pass |
| junction from allowed root to outside canary | denied | outside file was readable, exit `0` | **fail** |
| command outbound HTTP | denied | HTTP `200`, exit `0` | **fail** |
| outside-root positive control | succeeds when explicitly granted | read and write exits `0` | pass |

The network probe used `curl.exe --connect-timeout 3 -sS -o NUL -w '%{http_code}'
http://example.com`. The coordinator-side positive control also received HTTP `200`, proving
the endpoint was reachable. This was not a provider request.

An initial harness attempt was not credited: PowerShell ran in Constrained Language Mode,
and a temporary broad ACL grant contaminated path-policy observations. That root was replaced
with fresh serial roots, native `cmd.exe`/`curl.exe` probes, exact workspace roots, and an
explicit outside-root positive control. The failures above come from the corrected harness.
This serial replacement exceeded MF-P0's authorization for one generated root. The deviation
is preserved rather than retroactively normalized and independently prevents acceptance
closure, although it cannot weaken the observed `NO-GO`.

## Process-tree termination

A coordinator-owned `cmd.exe` parent launched `PING.EXE` plus `conhost.exe`. The parent command
line contained the unique marker `mf-p0-tree-202609032305` and was verified before action.
`.NET Process.Kill(true)` returned, the parent exited, and both recorded descendant PIDs were
absent after the wait. This proves the host primitive only; the exact command/exit transcript
and integration with the production runtime were not preserved, so Required Check 9 is not
acceptance-proven.

## Required-check dispositions

| # | Required check | Result |
|---:|---|---|
| 1 | host/runtime/config inventory | pass |
| 2 | supported Windows sandbox syntax | pass; `sandbox -P`, not `sandbox windows` |
| 3 | isolated generated temporary root and owner | pass; owner `M0R6AN\clint` |
| 4 | allowed read plus denied outside-home read | production unsupported/failed; comparison build informative pass |
| 5 | allowed write plus denied outside write | production unsupported/failed; comparison build informative pass |
| 6 | environment-key exclusion without disclosure | production unsupported/failed; comparison build informative pass |
| 7 | junction/reparse escape denial | **fail**; comparison build read outside canary; write/symlink/other reparse variants not run after decisive failure |
| 8 | worker-command outbound network denial | **fail**; comparison build returned HTTP `200` |
| 9 | whole synthetic process-tree termination | host primitive passed; pinned-runtime proof and exact transcript incomplete |
| 10 | no persistent/product/config mutation | current state supports cleanup; complete contemporaneous before/after baseline missing |

## Cleanup and persistent state

Before recursive cleanup, every target was resolved and verified as a direct child of the
current-user temporary directory. Junctions were removed without traversing their targets,
then the four exact generated roots were deleted and read back as absent. The three product
paths remained absent:

- `C:\Users\clint\.codex\fleet\Invoke-FleetWorker.ps1`
- `C:\Users\clint\.codex\fleet\worker-result.schema.json`
- `C:\Users\clint\.agents\skills\model-fleet\SKILL.md`

The repository `HEAD` remained unchanged. This Gate 2 turn changed the Model Fleet charter,
loop directive, MF-P0 spec/evidence/reviews, and the goal index; the pre-existing plan review
was preserved. Pre-existing unrelated untracked files under
`.claude/settings.json` and `plugins/foreman-line/docs/goals/foreman-kernel/` were preserved.

These are present-state checks, not a complete contemporaneous identity baseline for every
config, policy, and working-tree byte. Review B therefore correctly leaves Check 10 and the
overall evidence package not acceptance-closed.

## Independent review triage

- Review A: `PASS` for the soundness of `NO-GO`, not for host feasibility.
- Review B: `REQUEST CHANGES` because the evidence contract is incomplete and the one-root
  authorization was exceeded.
- The Review B blocker and high findings are accepted as stop-strengthening governance gaps,
  not waived. They cannot be fixed retroactively without pretending the original parcel
  contract was broader than it was.
- MF-P0 is therefore stopped, not completed or accepted. Any future attempt must begin as a
  freshly authorized run with one root, complete contemporaneous capture, pinned-runtime
  process integration, and two fresh reviews.

## Final disposition

`NO-GO` is mandatory for three independent reasons, while the evidence package itself remains
not acceptance-closed:

1. The production `codex` runtime cannot start the requested elevated permission-profile
   sandbox on this host (`CreateProcessWithLogonW failed: 5`).
2. The available desktop comparison runtime permits an allowed-root junction to read an
   outside canary and permits model-command outbound HTTP despite `network.enabled=false`.
3. Current Codex configuration precedence prevents the retained OpenRouter overlay's legacy
   `sandbox_mode` from composing with the exact permission profiles required by D6/A1.

Under D6, D7, the MF-P0 contract, and the loop stop conditions, MF-P1 through MF-P4 must not
start. A future continuation requires separately ratifying either a hardened disposable
execution environment or a charter/overlay redesign that can mechanically pass the same
filesystem, escape, environment, and network canaries. No weakening of the failed boundary
is inferred.
