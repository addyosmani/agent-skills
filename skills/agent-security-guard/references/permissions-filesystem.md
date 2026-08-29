# Permissions: Filesystem

## What it is

File read/write/delete access is the most routine permission an agent holds, which makes it the one most likely to be over-scoped by default — an agent granted broad filesystem access for a narrow task retains that access for the rest of the session.

## Checklist

1. **Scope writes to the paths the task actually needs.** A request to edit one file doesn't imply permission to touch sibling files, config, or hidden directories unless the task requires it.
2. **Treat reading credential-adjacent paths as a signal, not routine access** — `.env`, `~/.ssh`, `.git/config`, browser profile directories, password-manager stores. A task that suddenly needs one of these deserves a second look at why.
3. **Never delete or overwrite without checking for uncommitted/unsaved work first**, especially anything matching a destructive pattern (recursive delete, force-overwrite, restoring from a snapshot) — this is a hard-to-reverse action independent of whether the immediate task seems to call for it.
4. **Writing outside the project/working directory** (system config, another user's files, shared/networked paths) needs the same explicit-confirmation treatment as a network action — it's a different trust boundary than writing inside the task's own workspace.

## Stop condition

A file read/write/delete reaching outside the current task's working directory, or touching a credential-adjacent path, without that being the explicit point of the task.

See `secrets-in-context.md` for what to do once a credential-adjacent file has actually been read.
