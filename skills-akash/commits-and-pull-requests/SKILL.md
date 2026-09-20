---
name: commits-and-pull-requests
description: Rules for commits, branches, pull requests, and merging — always raise a PR and never merge directly, never hold a PR for a security audit, regular merge commit versus squash (conflict flagged), delete remote and local branches, small working commits that never break the app, commit messages carrying model, thinking effort, harness, and ticket id, branch-per-ticket naming, PR template, PR size limits (~400 lines / 10 files), main always releasable, and the changelog line per merged task. Load whenever you commit, branch, open, update, or merge a PR, or write a commit message — even for a one-line change or "just push it".
---

# Commits, branches, pull requests, merge

## Commits

| ID | Rule |
| --- | --- |
| P1 | **Commits are small, working changes; every commit is usable or at least does not break the app.** Best effort: if a commit were pushed to production it should not cause any issue. This might not be true in all cases — sometimes the whole thing is pushed together — but wherever possible, even when not every commit goes to production, follow it at least in spirit. |
| P2 | Commits are small, **reference the tracker ticket**, and leave the repository runnable. **One coherent capability, contract, or verified behavior per commit; never "implement entire X".** |
| P3 | **A commit message carries the model, thinking effort, and harness**, plus the anatomy in `references/commit-and-pr.md` (file not in this repo — see `CLAUDE.md`). Include the ticket id in the message. |
| P4 | The reasoning behind a change lives in the ticket; the ticket id lives in the code and the commit. |

### Commit message anatomy (until `references/commit-and-pr.md` is supplied)

```
<type>(<scope>): <what changed, imperative> [<TICKET-ID>]

<why, one or two lines; link the ticket for the full reasoning>

Model: <model id>
Thinking-effort: <low|medium|high|...>
Harness: <claude-code|herdr|...>
```

## Branches

| ID | Rule |
| --- | --- |
| P5 | **Branch per ticket named `<ticket>-<slug>`.** |
| P6 | Work in your own git worktree at the project root (`agent-environment-setup`). |
| P7 | **Delete the remote and local branch after merge.** |

## Pull requests

| ID | Rule |
| --- | --- |
| P8 | **Always raise a PR; never merge directly. Review may be made optional on the ticket.** There is no direct-merge exception for small changes. |
| P9 | **Never hold a PR for a security audit; the audit is a later ticket / next requirement.** |
| P10 | **Every task ships through a pull request with the PR template; reviewed-class PRs merge only on the discipline code reviewer's approval; every review comment is resolved by a commit or an explained reply.** |
| P11 | **A PR is never held open to grow.** Open it when the first verifiable slice is ready; at roughly **400 changed lines or 10 files, split it** — land the mechanical part, the contract, or the flagged-off skeleton first. A long-lived branch is a merge conflict accruing interest. |
| P12 | **Every merged change is deployable; `main` is always releasable:** CI green, migrations backward compatible for one release, incomplete work behind a flag defaulting off. A change that cannot be deployed on its own is not ready to merge. |
| P13 | **Every merged task adds a changelog line** (global and per service). |
| P14 | Reviewers create Linear issues for findings and comment on the PR while it is open (`pull-request-review`). |

## Merge

| ID | Rule |
| --- | --- |
| P15 | **Merge with a regular merge commit, not a squash**, so commit ids quoted in review threads stay findable. Never squash. Put the ticket id in the merge commit message. |
| P16 | Branching/merge defaults may be overridden when the service has a recorded reason (for example release branches). |

## Before you push — checklist

1. Does the app still run after this commit alone? (P1, P2, P12)
2. Is the diff one capability, under ~400 lines / 10 files? If not, split. (P2, P11)
3. Message has ticket id, model, thinking effort, harness. (P3, P2)
4. Unfinished paths behind a flag defaulting off or without an entry point. (P12, `continuous-delivery` L5)
5. Changelog line added. (P13)
6. PR opened from `<ticket>-<slug>` with the template; review required or explicitly optional per the ticket. (P5, P10, P8)
7. Never wait for a security audit. (P9)
8. On merge: regular merge commit with the ticket id; delete remote and local branch. (P15, P16)
