# Human Review Checkpoints: test-driven-development

For the person following an agent's TDD run. Agents do not load this file: `SKILL.md` never references it, so it costs no context. It travels with the skill folder when the skill is copied.

Two gates, about five minutes per run in total. At each gate read only what the gate names, answer its questions, and hand the agent the redirect word for word when an answer is no. Ask for the pause when the agent reaches the step; it will not stop on its own.

## Gate 1: the failing test (after "Step 1: RED", about 2 minutes)

Read only the test diff, then the failure output. Do not open the implementation.

- Does it fail for the right reason? Read the error message, not the code. A failing import, fixture, or environment is not a failing behavior.
  Redirect: "Resolve the setup failure, then show the test failing on the behavior."
- Would a trivially wrong implementation pass it?
  Redirect: "Add an assertion for the missing behavior; returning a constant would currently pass."
- Does it test behavior, or implementation detail?
  Redirect: "Rewrite the test against the public interface only."

## Gate 2: before the commit (after "Step 3: REFACTOR", about 3 minutes)

Read the implementation diff, then the latest suite output. Look at the test diff only for changed or removed assertions.

- Did anything change outside the task's slice?
  Redirect: "Explain why these extra files are needed before changing them further, or revert them."
- Was an assertion weakened, or a test skipped, to reach green?
  Redirect: "Restore the original requirement and fix the implementation."
- Does the suite output cover the current code? It must come from a run after the last edit and include every test, not a filtered subset.
  Redirect: "Re-run the full suite and paste the output."

## Stop rules

Countable triggers. Act on the count, not on a feeling that the run is going well.

- Third failed iteration on the same test: write the test yourself and hand it over.
- The diff grew beyond the files named in the plan or task: pause and re-scope before any further edit.
- The same failure message twice with no new evidence between attempts: ask the agent to stop editing, summarize what each attempt established, and propose one diagnostic check.

These gates steer the loop while it runs. The full review before merge is the `code-review-and-quality` skill.
