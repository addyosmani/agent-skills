---
name: langfuse-ci-cd
description: Set up or extend agent regression checks / gating in GitHub Actions CI/CD using `langfuse/experiment-action`.
metadata:
  required_access:
    - CODEBASE
    - LANGFUSE_PROJECT_INTERFACE
    - LANGFUSE_PROJECT_SCRIPT
    - GITHUB
---

# Langfuse CI/CD

## Checklist

- [ ] Follow the [CI/CD docs page](https://langfuse.com/docs/evaluation/experiments/experiments-ci-cd) and the [langfuse/experiment-action README](https://github.com/langfuse/experiment-action)
- [ ] Inspect whether the local repository is a GitHub repo. If not, `langfuse/experiment-action` is not applicable. Follow the guide for other [CI/CD systems](https://langfuse.com/docs/evaluation/experiments/experiments-ci-cd#other-cicd-systems) instead
- [ ] Ask the user which [evaluators and run evaluators](https://langfuse.com/docs/evaluation/experiments/experiments-via-sdk#evaluators) they want to set up
- [ ] Ask the user if and when yes which regression thresholds they want to set
- [ ] Confirm dataset existence and shape of the dataset items before writing code with the Langfuse CLI (see `references/cli.md`)
  - `langfuse-cli api datasets list`
  - `langfuse-cli api dataset-items list --dataset-name <dataset name> --limit 5`
- [ ] Propose the user to verify the check by actually running the new CI check (e.g. by creating a pull request)
- [ ] If the evaluator task uses a third-party dependency, add the necessary CI steps to install them

### GitHub specific checklist
- [ ] Ask the user how they want the [workflow to be triggered](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
- [ ] If available, use the `gh` CLI to check secret existence / set secrets for:
      - Langfuse credentials
      - Credentials required by the evaluator task (e.g. OpenAI or Anthropic API keys)

## Common Issues

| Issue | Solution |
|-------|----------|
| `gh` is missing or not authenticated | Install the GitHub CLI if needed, then run `gh auth status` and `gh auth login` before using `gh secret` or `gh workflow` commands. |
| Local Langfuse environment variables are not set | Set `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, and `LANGFUSE_HOST` locally before using `langfuse-cli`; do not ask the user to paste secret values into chat. |
| Workflow secrets or action inputs are wrong | Verify `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `langfuse_base_url`, and provider secrets exist in the target repo/environment and are passed to the action step. |
| Forked PR cannot access secrets | GitHub restricts secret access for forked PRs. Document the limitation or choose a trusted trigger such as internal PR, trusted-branch `push`, or `workflow_dispatch`. |
| No default/base branch exists | Create an initial empty commit on the intended default branch before trying to verify a PR-triggered workflow. |
| Script fails reading dataset fields | Re-inspect the dataset items with the Langfuse CLI, check `input`, `expected_output`, and metadata, and extract fields from object-shaped outputs explicitly. |
