---
name: pull-request-review
description: How to review a pull request in any reviewer role (code reviewer, QA reviewer, perf reviewer, security reviewer) — the fixed checklist (unrelated changes, missing feature-flag gating, regression risk, missing or redundant observability, missing or redundant comments, domain conventions, use of strings), filing findings as Linear issues and PR comments, approval and comment-resolution rules, and the "never block for a security audit" rule. Load whenever you are asked to review, approve, critique, or audit a PR, diff, or branch, or when an agent takes on a reviewer role — even if the user only says "take a look at this PR".
---

# Pull request review

## Reviewer roles

- The existing agent takes the role of a reviewer **by importing the relevant skill** (this one plus the discipline skill, e.g. `observability`, `testing`, `coding-standards`). Roles: **code reviewer, QA reviewer, perf reviewer, security reviewer**, etc. Reviewers are **optional** — review may be made optional on the ticket.
- Reviewed-class PRs merge only on the **discipline code reviewer's approval**; every review comment is resolved by a commit or an explained reply.
- Detail lives in `references/merge-and-review.md` (not in this repo — see `CLAUDE.md`).

## The checklist

Check, in order, and report each hit:

| # | Check |
| --- | --- |
| 1 | **Changes not related to the feature / task.** |
| 2 | **Changes not feature-flag gated, wherever applicable.** |
| 3 | **Whether the change risks regression.** |
| 4 | **Observability missing or redundant** (metrics, logs). |
| 5 | **Missing or redundant comments.** Comments should be used very sparingly. |
| 6 | **Domain conventions not followed.** |
| 7 | **Use of strings** (where an enum or typed id belongs). |

Additional checks that follow from the other skills: commit granularity and message (`commits-and-pull-requests` P1, P3, P2), PR size (`commits-and-pull-requests` P11), tests mapped to acceptance criteria and not weakened (`testing` T2), and from `coding-standards`: no secrets (C22), backward compatibility (C13), no edits to generated/vendor files (C14).

## Process rules

| ID | Rule |
| --- | --- |
| R1 | **Always raise the PR; don't merge directly. Review can be made optional.** |
| R2 | **Don't hold the PR for a security audit.** The security audit can be taken up later as a next requirement / later ticket. |
| R3 | Reviewers **create an issue on Linear** for each finding and **comment on the PR (if the PR is open)**. |
| R4 | Approval gates merge for reviewed-class PRs; every comment is resolved by a commit or an explained reply. |

## Output format for a review

```
## Review — <PR title> (<role>)
Verdict: approve | request changes | comment only

### Findings
1. [<check #>] <file:line> — <what> — <why it matters> — Linear: <issue id>
...

### Not blocking
- <observations that do not block merge>
```

Post the findings as PR comments while the PR is open, create the Linear issues, and never block on a security audit.
