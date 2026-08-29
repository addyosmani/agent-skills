# Secrets in Context

## What it is

Once a secret (API key, token, password, private key) enters an agent's context — because it was read from a file, an env var, a config, or pasted by the user — it can be echoed, logged, or forwarded exactly like any other text the agent handles, unless deliberately kept out of paths that do that.

## Signals

- A task requires reading a `.env`, credentials file, or secrets manager entry to proceed
- A secret would need to appear in a command's arguments (visible in shell history/process list) rather than an env var or stdin
- A log, error message, or debug output about to be produced would include a secret value
- A tool call, file write, or message draft is about to include a secret verbatim where it isn't strictly required

## Checklist

1. **Read only the specific secret needed, not the whole secrets file**, when a task can be scoped that way.
2. **Never write a secret to a log, commit, comment, or any output the user didn't specifically ask to contain it** — including intermediate scratch files, unless those are clearly ephemeral and cleaned up.
3. **Prefer passing secrets through env vars or stdin over command-line arguments** when generating commands, since arguments are more commonly visible elsewhere (shell history, process listings).
4. **Redact or omit secret values when reporting back to the user** what a command did — confirm success/failure without echoing the value.
5. **If a secret was already committed or exposed, the fix is rotation, not just removal** — flag this to the user rather than treating a deleted line as resolved (matches `security-and-hardening`'s guidance: assume compromise the moment a secret reaches a remote).

## Stop condition

Any point where a secret would be written somewhere more visible than its original location, or included in output beyond what's strictly needed to complete the task.

See `exfiltration-channels.md` for the specific case of secrets leaving via network/file channels, and `credential-handling.md` for account-level credential actions.
