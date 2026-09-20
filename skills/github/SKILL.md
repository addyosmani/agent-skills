---
name: github
description: "Operates GitHub for the organization through the GitHub MCP server or the gh CLI: branches, pull requests with the PR template, review requests, inline review comments and verdicts, PR status checks, merges, releases with semver tags, and linking PRs to tracker tickets. Use when an engineer raises or updates a PR, a reviewer reviews one, an engineer merges or cuts a release, or any persona needs PR or CI state."
category: tools
---

# GitHub

## Overview

GitHub is where code review happens and CI runs; the tracker is where state lives. This skill maps the org's PR flow (`../../references/commit-and-pr.md`) onto GitHub operations and keeps the ticket and the PR in sync. Prefer the GitHub MCP server when the tool has it; the `gh` CLI is the equivalent fallback in any tool with a shell.

## When to Use

- Raising, updating, or re-requesting review on a PR.
- Posting inline review comments and a review verdict.
- Checking CI status or merging an approved PR.
- Cutting a release: tag, changelog entry, GitHub release.
- NOT for tracking work: states, blockers, and reports live in the tracker.
- NOT for editing code under review; reviewers comment, authors change.

## Setup

This skill carries the server entry in its `mcp.json`; copy it into your tool's MCP config with the tool's own environment-variable syntax. Tools with only a global config (Codex, Kimi, others) and the CLI fallbacks are covered in `../../references/tool-auth.md`. Verify with a read-only call before writing anything.

## Operation mapping

| Org action | MCP / `gh` |
|---|---|
| Create branch `<ticket>-<slug>` | `create_branch` / `git switch -c` |
| Raise PR with the template | `create_pull_request` / `gh pr create --title "<ticket>: <goal>" --body-file <template>` |
| Link PR to the ticket | PR title starts with the ticket id; paste the PR URL into the ticket's `PR:` line and status update |
| Request review from the discipline reviewer | `request_reviewers` / `gh pr edit --add-reviewer` (or spawn the reviewer persona) |
| Inline review comment at a line | `create_pending_pull_request_review` + `add_comment_to_pending_review` / `gh api` review comments |
| Verdict | `submit_pending_pull_request_review` with `APPROVE`, `REQUEST_CHANGES`, or `COMMENT` / `gh pr review --approve\|--request-changes` |
| Resolve a comment | reply then resolve the thread; never resolve silently |
| CI status | `get_pull_request_status` / `gh pr checks` |
| Merge (merge commit, ticket id in message; delete the branch) | `merge_pull_request` with method `merge` / `gh pr merge --merge --delete-branch` |
| Release | tag `vX.Y.Z` per semver, changelog entry, `gh release create` |

## Process

1. **Read before write**: find the existing branch or PR for the ticket; never open a duplicate.
2. **Author**: branch, commit with the ticket id, run verification, raise the PR with the template, put the URL on the ticket with a status update, request the reviewer.
3. **Reviewer**: read tests then diff, post inline comments at lines, submit one review with the verdict, post `merge-review.md` as the summary and on the ticket, move the ticket.
4. **Author again**: address every comment with a commit or a reply, resolve threads, re-request review; the ticket goes back to `In Review`.
5. **Merge**: after `Approve`, or after CI when review was made optional on the ticket; a regular merge commit with the ticket id; delete the remote and local branch; move the ticket; changelog line.
6. **Release**: bump semver, publish the changelog entry listing tickets, tag, create the release.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll merge and open the PR afterwards for the record." | The PR is the review. Nothing merges without it. |
| "I'll put my review in the ticket comment only." | Reviewers comment on the code, at the line. The ticket gets the summary. |
| "The check is flaky, merge anyway." | A red check is a blocker; fix it or escalate. |
| "I'll resolve the thread, I fixed it." | Resolve with the commit reference or a reply so the reviewer can verify. |

## Red Flags

- A merged change with no PR, or a PR with no ticket id in the title.
- A PR merged with unresolved threads or red checks.
- A release without a tag or a changelog entry.
- A ticket whose state disagrees with its PR.

## Verification

- [ ] Every merged change has a PR whose title starts with the ticket id and whose URL is on the ticket.
- [ ] Every reviewed-class PR has inline comments and a submitted review with a verdict.
- [ ] All threads resolved with a commit or reply before merge; CI green.
- [ ] Releases are tagged per semver with a changelog entry.
