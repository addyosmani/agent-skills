---
name: agent-sandbox-and-permissions
description: Defines and verifies the runtime capability boundary for a coding agent — what it may read, write, execute, and reach over the network. Use when an agent runs with shell or filesystem access against a real repository, when configuring a sandbox, tool allowlist, or approval gate for an agent harness, when deciding what credentials and network egress an agent may hold, or when you need evidence that the isolation actually holds.
---

# Agent Sandbox and Permissions

## Overview

An agent with shell access is an untrusted program with your credentials. The threat is not the model's intentions — it is the text the model reads. An issue comment, a dependency README, a fetched web page, a test fixture, or a tool result can carry instructions, and no prompt-level guard survives a model that has been talked into following them. The capability boundary is the only control that still holds at that moment: the agent can be fully fooled and still be unable to read `~/.ssh`, reach an unlisted host, or push to a protected branch.

This skill covers the runtime boundary around the agent process — filesystem, network, credentials, tool surface, approval points, and audit trail — and how to prove it works. It does not cover the security of the application the agent writes.

## When to Use

- Standing up an agent harness that can run shell commands, edit files, or call MCP servers
- Reviewing a harness config (`autoApprove`, `--dangerously-skip-permissions`, sandbox flags, mounted volumes)
- Deciding what credentials, tokens, and network access an agent may hold
- An agent runs on a developer machine, against a repo containing code you did not write
- You need evidence — not configuration — that the boundary holds

**NOT for:**

- Securing the application the agent produces: input validation, auth, OWASP, dependency audits — use the `security-and-hardening` skill. That skill hardens *your code*; this one hardens the *agent running next to it*. A repo can pass every check in that skill and still hand a hijacked agent your cloud session.
- Wiring CI quality gates — use the `ci-cd-and-automation` skill. This skill decides what the agent may do *before* a gate sees it.
- Deciding which checks block a merge — use the `constraint-driven-development` skill. The rule there ("a check the agent can edit is not a check") applies verbatim to sandbox policy and audit logs: both must live outside the agent's write scope.

## Threat Model: Untrusted Text, Not Just Untrusted Code

Write the model down before choosing a mechanism, because the mechanism follows from it:

```
INPUTS THE AGENT READS          →  can contain instructions
  issue/PR text, web pages, fetched docs, dependency READMEs,
  test fixtures, tool output, MCP server responses, commit messages

WHAT A HIJACKED RUN WANTS
  1. exfiltrate secrets        (env, ~/.aws, ~/.ssh, .npmrc, git credentials, cloud metadata)
  2. move code outward         (push, publish, deploy, open a PR, comment)
  3. persist                   (git hooks, package scripts, dotfiles, CI config)
  4. widen its own boundary    (edit the sandbox policy, the approval list, the audit log)
```

Two consequences follow. First, the boundary must be enforced by the operating system, not by instructions in a prompt — the prompt is inside the blast radius. Second, anything that *executes* is code: repository-controlled files run on ordinary commands, so "the agent only runs code I wrote" is false the moment a hook or install script exists.

## Process

### Step 1: Write the capability contract before configuring anything

One block per run. Every later decision — tier, mounts, env, allowlist — is justified by a line here, and anything not listed is denied.

```
RUN:     issue-triage-agent
READ:    /work (rw)  |  /usr, /lib, /bin (ro)
WRITE:   /work only  |  $HOME scratch wiped at exit
EXECUTE: node, npm, git (local only), rg
NETWORK: registry.npmjs.org:443, api.anthropic.com:443 — via allowlisting proxy
SECRETS: none in env; git via short-lived installation token, one repo, no push
APPROVE: git push, gh pr create
DENY:    everything else — including metadata IP, unlisted DNS, new processes outside the boundary
```

If you cannot fill in `WRITE`, `NETWORK`, and `SECRETS`, you are not ready to run the agent. "It needs whatever it needs" is the finding, not a plan.

### Step 2: Pick the lowest isolation tier that survives the threat model

| Tier | Mechanism | Stops | Does not stop | Cost |
|---|---|---|---|---|
| 0 — none | full user privileges | nothing | anything | zero |
| 1 — guardrails | git worktree, command denylist, approval prompts | mistakes | a deliberate or hijacked run | low |
| 2 — OS sandbox | macOS Seatbelt (`sandbox-exec`), Linux Landlock + seccomp, `bwrap` | file/network reach outside the contract | kernel LPE, same-user side channels | low |
| 3 — container | namespaces + cgroups + dropped caps | resource abuse, most fs escapes | kernel exploits, mounted docker socket, privileged flags | medium |
| 4 — microVM | Firecracker / Kata / gVisor (`runsc`) | kernel exploits, strong multi-tenant | VM escapes (rare), I/O overhead | high |
| 5 — WASM | `wasmtime` / WASI, capability handles | untrusted code with no ambient authority | native toolchains that assume an OS | medium |

The threat model above is "untrusted text reached the model", not "a malicious tenant shares my host". Tier 2 or 3 with a strict egress policy is the usual right answer; tier 4 is for running other people's code as a service. Tiers are not cumulative by default — a container without `--cap-drop=ALL`, `--network=none`, or a socket mount is tier 0 with extra steps.

**A boundary that only wraps one entry point is not a boundary.** The shell, the test runner, the package manager, git hooks, MCP servers, and language servers all execute code. If the sandbox wraps the chat tool's `bash` and the test runner is spawned by the harness directly, the escape is one command away.

### Step 3: Treat the repository as executable content

Ordinary commands run repository-controlled files. Neutralize these before the first command, not after the first incident:

```bash
# Git: hooks, fsmonitor, pager, editor, and external diff all execute.
git -c core.hooksPath=/dev/null commit -m 'fix: ...'
git config --local --unset core.fsmonitor 2>/dev/null || true
GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null git status

# Package managers: install scripts are arbitrary code with the agent's privileges.
npm ci --ignore-scripts        # or: pnpm install --ignore-scripts
# yarn: enableScripts: false in .yarnrc.yml
```

Also inside the boundary's trust set: `Makefile`, `package.json` scripts, `conftest.py` / `pytest.ini`, `build.rs`, `setup.py`, Gradle/Maven plugins, `.envrc` (direnv), `.vscode/tasks.json`, `.devcontainer/`, `.git/config`. Read each one before a run that will execute it, and keep the boundary around them — approving a command approves everything it transitively runs.

### Step 4: Cut the credential and egress paths

These two are the exfiltration surface. Configure both, in the harness, before the agent starts.

**Credentials — the run holds none it does not need:**

- Do not mount or inherit `~/.ssh`, `~/.aws`, `~/.config/gh`, `~/.docker/config.json`, `.npmrc`, `.netrc`, `.git-credentials`, or a cloud CLI's cached session.
- Clear the environment and pass an explicit minimum — the harness's own model API key belongs to the harness, not to the sandboxed shell:

```bash
bwrap --clearenv --setenv HOME /work --setenv PATH /usr/bin:/bin \
      --setenv CI 1 --unshare-all --die-with-parent ...
```

- Prefer short-lived, narrowly scoped tokens over long-lived keys: a GitHub App installation token for one repository with no write scope, or a read-only deploy key. Never a personal access token with `repo` and `workflow`.
- Keep secrets out of the context window entirely. Anything in the prompt can be echoed, summarized, or sent to a tool.
- Set decoys where a real secret would be, and alert on any read: a sentinel value in `~/.aws/credentials` detects an exfiltration attempt even when the boundary holds.

**Egress — default deny, allowlist by name, and never the metadata IP:**

```bash
# Route the sandbox through an allowlisting proxy instead of "no network" or "all network".
HTTPS_PROXY=http://127.0.0.1:8888 HTTP_PROXY=http://127.0.0.1:8888 bash -lc 'npm ci'
```

```
# squid.conf — deny by default, allow by name, block cloud metadata explicitly
acl allowed_domains dstdomain .registry.npmjs.org .api.anthropic.com
acl metadata dst 169.254.169.254/32
http_access deny metadata
http_access allow allowed_domains
http_access deny all
```

Notes that cost people incidents: `169.254.169.254` is the single highest-value target on any cloud host, and it is reachable by default in most containers; `--network=host` deletes the boundary entirely; a filtering proxy only helps if the sandbox cannot bypass it — a run that can open a raw socket to `1.1.1.1:53` and tunnel DNS has an egress path. Where the harness needs the model API, terminate that call in the harness, outside the sandbox, so the sandboxed shell can run with no network at all.

### Step 5: Put approval at the boundary, not on every command

Approval fatigue turns a human into a rubber stamp; the fix is not more prompts, it is fewer, better ones. Split actions in two:

- **Inside the boundary — no prompt.** Reads, edits under `WRITE`, local test runs, local commits. This is where the agent should be autonomous, and it is why the boundary exists.
- **At the boundary — always prompt.** Push, PR/issue creation and comments, publish, deploy, migrations, IAM or DNS changes, CI config edits, spending money, sending mail or chat messages, deleting branches, anything crossing the network with data.

Bind each approval to the artifact, not the intent:

```
BAD:   "Allow the agent to push?"                        (once, forever, any branch)
GOOD:  "Push a1b2c3..d4e5f6 to origin/feat/agent-sandbox (3 commits)?"   (this artifact, this target)
```

Show the real command and the real diff, not the agent's summary of them. If the artifact changes between approval and execution, re-ask — an approval that survives an edit is an approval for something the human never saw.

### Step 6: Make the run auditable

Emit one structured record per tool call, to a sink outside the agent's write scope, append-only:

```json
{"run":"r-8f21","ts":"2026-09-20T10:02:11Z","tool":"bash","argv":["npm","ci"],
 "cwd":"/work","exit":0,"net":["registry.npmjs.org:443"],
 "writes":["/work/node_modules"],"approval":null}
```

Record argv, cwd, exit status, paths written, and network destinations. A run you cannot reconstruct is a run you cannot review. If the agent can edit the log or the policy, neither is a control — mount both read-only, and treat a policy change as a privileged change reviewed like CI config.

Re-establish the boundary per run. A long-lived sandbox accumulates state — cached scripts, hooks, modified dotfiles — and a poisoned run can carry into the next one.

### Step 7: Prove the boundary with negative probes

Configuration is a claim; probes are evidence. Run these inside the boundary and confirm every one **fails**:

```bash
cat ~/.ssh/id_ed25519                              # credential read outside the worktree
echo canary > /etc/canary                          # write outside the worktree
cat /work/../canary                                # traversal out of the worktree
curl -sS https://example.com                       # unlisted egress
curl -sS http://169.254.169.254/latest/meta-data/  # cloud metadata
getent hosts example.com                           # DNS for an unlisted name
sudo -n true                                       # privilege escalation
docker run --privileged alpine true                # nested privileged container
env | grep -iE 'key|token|secret'                  # secrets the run does not need
cat /proc/self/status | grep -E 'Seccomp|CapEff'   # expect Seccomp: 2 and CapEff: 0
```

Then prove the boundary covers **every** entry point, not just the chat tool: launch the same probe from the test runner, the package manager, a git hook, and each MCP server, and confirm the same result. The recurring real-world failure is a correct sandbox config that the test runner bypasses.

Finally, confirm the boundary is enforced by the OS rather than by the harness refusing politely: the probe should fail with a permission/connection error, not with a message written by the agent.

## Sandbox Recipes

Mechanisms differ by platform; the contract in Step 1 does not. These are starting points, not turnkey profiles — read them, then tighten to your contract.

**macOS Seatbelt** (`sandbox-exec` is deprecated but still enforced, and is what several harnesses use):

```bash
sandbox-exec -p '
(version 1)
(deny default)
(allow file-read* (subpath "/usr") (subpath "/System") (subpath "/lib"))
(allow file-read* file-write* (subpath (param "WORKDIR")))
(allow process-exec (subpath "/usr/bin") (subpath "/bin"))
(deny network*)
' -D WORKDIR="$PWD" bash -lc 'npm test'
```

**Linux bubblewrap** (namespaces, no root required):

```bash
bwrap \
  --ro-bind /usr /usr --ro-bind /lib /lib --ro-bind /lib64 /lib64 --ro-bind /bin /bin \
  --dev /dev --proc /proc --tmpfs /tmp \
  --bind "$PWD" /work --chdir /work \
  --unshare-all --die-with-parent --new-session \
  --clearenv --setenv HOME /work --setenv PATH /usr/bin:/bin \
  bash -lc 'npm test'
```

`--unshare-all` includes the network namespace, so the run has no egress; add `--share-net` only if the contract grants it, and then only behind the proxy. `--die-with-parent` is what keeps a backgrounded escape from outliving the run.

**Linux Landlock + seccomp** for unprivileged, kernel-enforced filesystem and network restrictions: Landlock ABI v4 (Linux 6.7+) restricts TCP bind/connect as well as filesystem access, so a single ruleset can express most of the contract; layer a seccomp filter on top to drop `mount`, `ptrace`, `bpf`, `keyctl`, and `unshare`. Apply it through the userspace helper (`landlock-restrict`, `llwrap`) rather than hand-rolling syscalls.

**Container** (tier 3 done properly — the flags are the boundary):

```bash
docker run --rm -i \
  --read-only --tmpfs /tmp:rw,size=512m \
  --cap-drop=ALL --security-opt=no-new-privileges \
  --network=none \
  --user 1000:1000 --pids-limit=512 --memory=2g --cpus=2 \
  -v "$PWD":/work -w /work \
  node:24-slim bash -lc 'npm test'
```

No `-v /var/run/docker.sock`, no `--privileged`, no `--network=host`, no `--pid=host`. Any one of them moves the run back to tier 0.

**microVM / syscall interposition** for running code you do not trust at all: Kata Containers gives a Firecracker-backed microVM behind an OCI runtime (`--runtime=kata-runtime`), and gVisor (`--runtime=runsc`) interposes syscalls in userspace. Both are drop-in enough to test with the same probes from Step 7.

**WASM** for capability-based execution: WASI modules have no ambient authority — no filesystem without an explicit preopen, no sockets without host support — which makes the contract the API surface:

```bash
wasmtime run --dir=/work::/work --env HOME=/work module.wasm
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The agent only runs code I wrote" | It runs install scripts, git hooks, Makefile targets, test fixtures, and anything a dependency ships. Those are code you did not write. |
| "I trust the model" | Trust is not a control. The boundary exists precisely for the moment the model is wrong or hijacked, and it is the only thing that still holds then. |
| "It's in a container, so it's sandboxed" | Only if it has no docker socket, no `--privileged`, no host network or PID, and dropped capabilities. Otherwise it is tier 0 with extra steps. |
| "We review the diff before merging" | Review happens after exfiltration and after a push. The boundary acts before; review is not a substitute for it. |
| "We denylist dangerous commands" | Denylists are pattern-matched against a shell language. Quoting, `$(...)`, aliases, `find -delete`, and `git clean -xfd` all defeat them. Defense in depth, never the boundary. |
| "Approvals cover the risky steps" | Approval fatigue makes humans rubber-stamp, and a poisoned context phrases a dangerous command to look routine. Approve the artifact, and make everything inside the boundary autonomous. |
| "It's a read-only task" | Reading is exfiltration. `~/.ssh`, `~/.aws`, `.npmrc`, and the cloud metadata endpoint are all reads. |
| "The agent has no secrets" | It has your repository, your git credentials, and often a live cloud session. The model API key in the harness's environment is a secret too. |
| "The sandbox slows the agent down" | Measure it. Tier 2 costs single-digit percent on most workloads; a leaked production key does not. |
| "We'll add the sandbox before we go to production" | The risky period is development, where the credentials are broadest and the code is least reviewed. |
| "The config says the sandbox is on" | Configuration is a claim. Until a probe fails inside the boundary, you have a claim, not a control. |

## Red Flags

- The agent's shell runs as your user, with `$HOME` writable and network open
- `--privileged`, `--network=host`, `--pid=host`, `CAP_SYS_ADMIN`, or a mounted docker socket
- Secrets in the image, in the environment, or in the context window
- A command denylist as the only control
- Sandbox policy or audit log writable by the agent
- No negative probe has ever been run against the boundary
- The sandbox wraps the chat tool but not the test runner, package manager, git hooks, or MCP servers
- One long-lived sandbox reused across tasks and trust levels
- Auto-approve enabled for push, publish, deploy, or PR creation
- Approval requests that name an intent ("run the deploy script") instead of the artifact (commit range, target, diff)
- `git config --global` executed inside the worktree; agent-writable `.git/hooks`, `.envrc`, or CI config
- A tool result or fetched page that contains instructions, with no boundary between it and the shell

## Verification

After configuring the boundary, confirm with evidence — commands run and their actual output, not the config file:

- [ ] The capability contract is written down, and every mount, env var, and allowlist entry traces to a line in it
- [ ] Isolation tier is chosen from the threat model and recorded (an ADR is the natural home — see the `documentation-and-adrs` skill)
- [ ] Write scope is the worktree only; a write outside it fails (probe output recorded)
- [ ] Reads outside the worktree fail, including `~/.ssh`, `~/.aws`, and any decoy credential file
- [ ] Egress is default-deny; an unlisted host fails, DNS for an unlisted name fails, and the metadata IP is unreachable
- [ ] No long-lived secret is present in env, image, or context; git uses a short-lived, single-repo token
- [ ] Install scripts and git hooks are disabled or explicitly reviewed before they execute
- [ ] The same probes fail from every entry point: shell, test runner, package manager, git hook, and each MCP server
- [ ] Sandbox policy and audit log are outside the agent's write scope, and policy changes are reviewed like CI config
- [ ] Audit records capture argv, cwd, exit status, written paths, and network destinations, correlated by run ID
- [ ] Approval gates cover push, publish, deploy, PR/comment, and destructive operations, bound to the exact artifact
- [ ] Resource caps (pids, memory, CPU, wall clock) bound a runaway or looping run
- [ ] The boundary is re-established per run; no sandbox state carries across trust levels
