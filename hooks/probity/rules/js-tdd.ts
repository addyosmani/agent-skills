import { enforceTdd, type Rule } from '@nizos/probity'

import { withJudgeFailureDiagnostics, withContradictionRetry } from './gates.js'
import { GENERALISING_TDD_RULE } from '../internal/generalising-tdd.js'
import { IN_PROGRESS_TDD_RULE } from '../internal/in-progress-tdd.js'

/**
 * Appended to Probity's default TDD rules for JS/TS. The defaults say
 * both "adding a test is the red step" and "judge a new red at the
 * green->red boundary too" (the refactor check), and the judge has
 * read the second as a demand that the new test was already observed
 * failing (#73; the Kotlin judge did the same in #43).
 */
export const JS_TDD_ADDENDUM = `## Adding a red test

- Adding a failing test is the red step itself. A test-file write that adds one new test (with any imports, fixtures, or helpers it needs) passes without any prior run of that test: a test cannot have failed before it exists. "Must be observed failing for the right reason" applies only to the production write that follows it, never to the test write. This holds whether the asserted behavior is missing entirely or exists but is wrong, including behavior the previous cycle just implemented.
- At a test write, the only green->red question is whether the prior green left an unmistakable refactor unmade. A passing prior run is the expected state before a new test is added, never a reason to block it. Do not block a test write because the new test has not been observed failing, because the last run was for a previous test, or because the test contradicts what production code does now.
- A type-only fix for a type-check failure needs no red. Test runners such as vitest don't type-check, so a green step can leave \`tsc --noEmit\` failing (a widened union an existing test reads a narrower field from). A write that changes only types to make the type check pass (narrowing a return type, splitting or narrowing a type alias, adding an annotation, a type guard or a type parameter), in production or test code, is part of the step that caused the failure or a refactor under green: it changes no runtime behavior, and a type-check error is not a red for new behavior to answer. In a test, restating an assertion so it type-checks is allowed when it keeps every assertion at least as strong (for example, \`toEqual\` on the whole object in place of reading one field). A write that also changes runtime behavior, or weakens what a test asserts, is judged as usual. When you block one, say which part of the write is not type-only.
- The other rules still hold: a write adding more than one new test is a violation (restructuring existing tests is not adding), and so is a production write with no observed failing test for it. Observed failing means a test run, after the test was written, whose output shows that test failing. A test written in the session with no run after it has not been observed failing, and an earlier failing run of a different test does not count.
${IN_PROGRESS_TDD_RULE}
${GENERALISING_TDD_RULE}`

/**
 * Probity's `enforceTdd()` with {@link JS_TDD_ADDENDUM} appended, wrapped
 * as the JS preset wires it: a self-contradicting deny is retried, and a
 * judge that returns no verdict (spend limit, auth failure) is reported
 * as an infrastructure failure rather than a TDD rejection. Use this in
 * place of `withJudgeFailureDiagnostics(withContradictionRetry(enforceTdd()))`.
 */
export function enforceJsTdd(): Rule {
  return withJudgeFailureDiagnostics(
    withContradictionRetry(
      enforceTdd({ instructions: (defaults) => `${defaults}\n\n${JS_TDD_ADDENDUM}` }),
    ),
  )
}
