# Review and merge

What a review produces and when a change merges. Loaded by the engineers and the reviewer personas. The process rules are `git-workflow-and-versioning` P8–P10 and P14–P15; the review framework, roles, and output format are the `code-reviewer` persona.

## When a review runs

Review may be made optional on the ticket by the engineer or the user (`git-workflow-and-versioning` P8). A QA pass (`test-engineer`) runs on a story reported done.

## What a review produces

- Inline PR comments at `path:line`, each with a severity (Critical, Required, Optional, Nit) and a fix.
- A structured status update on the ticket.

Reviewers are specialized and adversarial. They never edit the change.

## Merge

After the verdict, or after CI when review was optional: a regular merge commit, ticket id in the message, branch deleted remote and local, changelog line, ticket moved.
