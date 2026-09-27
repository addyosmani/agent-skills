# Development

Everything an agent needs to set up, run, test, and debug this project. Kept current: the PR that changes a command or a setup step updates this file.

## Local stack

<prerequisites and versions; environment variables and where the example file is; how secrets are obtained, never their values>

### Containers

| Purpose | Command |
|---|---|
| Start the stack | |
| Start one service | |
| Stop and remove | |
| Logs of a service | |
| Rebuild after a dependency change | |

### Data

<how to take a snapshot of the database or run the seed script; how to reset>

### Per-agent environment

<the commands that create and remove one agent's worktree, containers, and data here>

## Cloud machines

<which `CLOUD_*` and `EAS_*` settings in `.env` this project changes from the defaults in `.env.example`, and why; never their secret values>

| Purpose | Value |
|---|---|
| Default type | `m8i.2xlarge` |
| EAS build profiles and what each produces | |
| Android build image | |
| Mac AMI and what it carries (Xcode, Node, CocoaPods, EAS CLI) | |
| Signing credentials for a cloud build: where they come from | |

## Commands

### Dev

| Purpose | Command |
|---|---|
| Install | |
| Lint | |
| Format | |
| Type check | |
| Generate clients | |
| Migrate | |

### Run

| Surface | Locally | Remotely (SSH) |
|---|---|---|
| Backend | | |
| Web | | |
| Mobile | | |

<how to reach a remote environment: host, user, how access is granted; what may and may not be run there>

### Test

| Level | Command |
|---|---|
| Unit | |
| Integration | |
| End to end | |
| Milestone verification | |

## Debugging

### Where to look

| Signal | Where | How |
|---|---|---|
| Logs | | |
| Metrics | | |
| Errors | | |
| Traces | | |

### Steps

<the order to work through a failure here: reproduce, localize, reduce, fix, guard; which tools at each step; the emulator or the browser for a client>

### Reproducing locally

<how to bring up a copy with production-like data: snapshot or seed, containers, mocked AWS; the emulator for mobile>

### Known failure modes

<one line each; the RCA in the service's `docs/` has the depth>
