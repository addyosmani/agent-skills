---
name: github
description: How to operate GitHub through the GitHub MCP server or the gh CLI — the server setup, and the call for each organisation action (find or create a branch or PR, raise a PR with the template, link it to the ticket, request a reviewer, post inline review comments and a verdict, resolve threads, read CI checks, merge with a merge commit and delete the branch, tag and publish a release). Use when a persona needs to read or change anything on GitHub — a PR, a review, a check, a merge, a release — after the git workflow rules have decided what to do.
category: tools
---

# GitHub

## Overview

The tool skill for GitHub. It says how to reach GitHub and which call performs each organisation action; it carries no rules of its own. What to do and when is `git-workflow-and-versioning` and, for a review, the reviewer (`../../references/merge-and-review.md`); state lives in the tracker. Prefer the GitHub MCP server when the tool has it; the `gh` CLI is the equivalent fallback in any tool with a shell.

## When to Use

- Any read or write on GitHub: a branch, a PR, a review, a check, a merge, a release.
- NOT for deciding whether or how to commit, branch, split, merge, or version: `git-workflow-and-versioning`.
- NOT for deciding what a review says: the code-reviewer persona and `../../references/merge-and-review.md`.
- NOT for tracking work: states, blockers, and reports live in the tracker.

## Setup

The server entry is in this skill's `mcp.json`; copy it into your tool's MCP config with the tool's own environment-variable syntax. Tools with only a global config and the CLI fallbacks are in `../../references/tool-auth.md`. Verify with a read-only call before writing anything.

## Operation mapping

| Organisation action | MCP | `gh` |
|---|---|---|
| Find the branch or PR for a ticket (before creating one) | `list_pull_requests` / `search_pull_requests` with the ticket id | `gh pr list --search "<ticket>"` |
| Create branch `<ticket>-<slug>` | `create_branch` | `git switch -c <ticket>-<slug>` |
| Raise a PR with the template | `create_pull_request` | `gh pr create --title "<ticket>: <goal>" --body-file <template>` |
| Link PR and ticket | title starts with the ticket id; PR URL on the ticket's `PR:` line (`linear`) | same |
| Request a reviewer | `request_reviewers` | `gh pr edit --add-reviewer <login>` |
| Inline comment at a line (`linear`) | `create_pending_pull_request_review` + `add_comment_to_pending_review` | `gh api repos/{owner}/{repo}/pulls/{n}/comments` |
| Verdict | `submit_pending_pull_request_review` with `APPROVE`, `REQUEST_CHANGES`, or `COMMENT` | `gh pr review --approve` / `--request-changes` / `--comment` |
| Reply to and resolve a thread | reply comment, then resolve the thread | `gh api graphql` `resolveReviewThread` after the reply |
| CI status | `get_pull_request_status` | `gh pr checks` |
| Merge: merge commit with the ticket id, delete the branch | `merge_pull_request` with method `merge` | `gh pr merge --merge --delete-branch` |
| Tag and release `vX.Y.Z` | `create_release` | `git tag -a vX.Y.Z && git push origin vX.Y.Z && gh release create vX.Y.Z --notes-file <changelog entry>` |

## Interaction with other skills

- `git-workflow-and-versioning` decides what to do and when; this skill only performs it on GitHub.
- `linear` holds the ticket the PR links to and the state a merge moves.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll open a fresh PR, it's faster than finding the old one." | Read before write: one PR per ticket. Search by ticket id first. |
| "I'll put the review in one summary comment." | Findings go inline at the line, then one submitted review carries the verdict; the summary is what goes on the ticket. |
| "Squash keeps history tidy." | The merge method is `merge`; a squash loses the commit ids quoted in review threads. |
| "I'll resolve the thread, I fixed it." | Reply with the commit reference, then resolve, so the reviewer can verify. |

## Red Flags

- Two open PRs for one ticket.
- A PR title without the ticket id, or a PR body not from the template.
- A verdict posted as a plain comment instead of a submitted review.
- A thread resolved with no reply.
- A merge with method squash or rebase.
- A release with a tag but no GitHub release, or the reverse.

## Verification

- [ ] The MCP server or `gh` answered a read-only call before any write.
- [ ] Every write above was done with the mapped call, and the PR URL is on the ticket.
- [ ] The merge used a merge commit and the branch is gone on the remote.
