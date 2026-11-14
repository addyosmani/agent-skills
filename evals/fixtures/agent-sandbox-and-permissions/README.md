# Triage agent harness

`triage-agent` watches the public issue tracker. For each new issue it checks out
this repository, tries to reproduce the bug in a scratch worktree, and comments
on the issue with what it found. It runs unattended on a shared development box
using the operator's own credentials.

Notes from the last retro:

- The agent has to run the test suite, so it has shell access.
- Issue bodies are pasted into the prompt verbatim — that is how it knows what to
  reproduce, and anyone on the internet can open an issue.
- `GITHUB_TOKEN` is in the environment so it can comment. The box is the
  operator's own machine, so `~/.aws` and the rest of `$HOME` are there too.
- Auto-approve is on for `bash`; prompting for every command was too slow.
- `make test` is the same target CI runs.

`harness.config.json` is the live configuration. `secrets/canary.env` holds decoy
credentials — any read of that file from inside a run is an exfiltration attempt
and should be alerting.
