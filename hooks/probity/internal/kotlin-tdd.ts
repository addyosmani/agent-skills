import { enforceTdd, type Rule } from '@nizos/probity'

import {
  withJudgeFailureDiagnostics,
  withContradictionRetry,
} from '../rules/gates.js'
import { GENERALISING_TDD_RULE } from './generalising-tdd.js'
import { IN_PROGRESS_TDD_RULE } from './in-progress-tdd.js'

const KOTLIN_DETERMINISTIC_PATHS =
  'Writes that never call the judge still go through: a test-source write ' +
  'adding exactly one @Test function (Kotlin fast path), telemetry-only ' +
  'lines, writes marked `// probity: mutation-probe`, and test-source ' +
  'writes marked `// probity: characterization`.'

export const KOTLIN_TDD_ADDENDUM = `## Kotlin/JVM TDD clarification

- Adding a failing test is the red step itself. A test-source write that adds one new test (with any imports, fixtures, or helpers it needs) passes without any prior run of that test: a test cannot have failed before it exists. "Must be observed failing for the right reason" applies only to the production write that follows it, never to the test write. This holds whether the asserted behavior is missing entirely or exists but is wrong, including a bug in uncommitted production changes in the working tree. Do not demand a failing run, a characterization marker, or reverting production code before a new red test may be added.
- Kotlin-specific exception to the generic placeholder guidance: when a targeted, relevant Kotlin test executes a \`TODO()\` placeholder and reports \`kotlin.NotImplementedError\`, that runtime failure is a clean red. Do not require a second run that reaches an assertion before replacing the placeholder. The implementation remains bounded by the assertions present in the relevant test source visible in the recent session.
- A compile, unresolved-import, or signature failure is not a clean red. It authorizes only placeholder, signature, or scaffolding work needed to make the test runnable; it does not authorize implementing the asserted behavior.
- One observed failing test may require one cohesive green write across multiple methods or branches when every changed method and branch is required by assertions present in that same relevant test source. No artificial test rerun is required between parts of that one atomic write. If the relevant assertions are not visible in the recent session, the red authorizes placeholder or scaffolding work only; do not infer that it authorizes production behavior.
- Moving existing, tested logic is not new behavior. A write that moves logic production code already has into a shared helper, or that replaces that logic in a caller with a call to such a helper, changes where the behavior lives, not what it is. It counts as a move when the same logic, branch for branch, appears in the current file content or in production code the recent session shows (read, grepped, or edited). Renaming the helper, its parameters, or its result type (for example a small sealed result replacing each caller's own) is part of the move. A move is allowed in two phases. In green, when an observed failing test needs a second caller to reach the logic, the move is the minimum green: the helper keeps every branch the existing logic has, even if the new test asserts only one, and do not require the logic to be duplicated instead. In refactor, no failing test is needed: when the most recent relevant test or build run in the session passed and no failing test is outstanding, the move is the refactor step, and demanding a new failing test for it is wrong. Either way, a helper holding logic that appears nowhere else in the session, or a move that adds a branch or behavior the existing logic lacks, is new behavior and needs its own red.
- A port method can be the minimal green. Judge what the failing test needs from the driven ports the code already has (their methods in the current file content, and the calls the test's fakes record), not from what a store or use case could do with data it never receives. When the test asserts an outcome for data that no existing port method can deliver to the code under test, no store, merge, or use-case logic can make it pass. For example: the test expects Sudo B's messages offline, B was never read online, and the gateway can only be read one Sudo at a time. Then adding the one port method that delivers that data, its result type, and the fake's implementation of it is the minimal green, even though the test does not name the method. A port method is a declaration with no behavior of its own, and it usually mirrors the service it stands for: do not deny it over its signature. A parameter the test passes as null or a default (such as \`since: Long?\` for "everything"), or a result field the test ignores (such as a cursor), does nothing until code behind the port uses it, and asking for a narrower signature is not a TDD objection. The code behind it (the fake, the use case) stays bounded by the test's assertions; paging, cursors, retries, or deletion handling the test does not assert are still over-implementation.
- A route that was tried and still fails is ruled out. If the session shows that a change a previous denial proposed was written, and the same test was then run and still failed the same way, do not deny the next write by proposing that route again. Judge the pending write on its own merits.
- Tightening a red test is part of the red step. When the latest relevant run shows a test failing and no production write has made it pass since, a test-source write that adds or strengthens an assertion in that test (for example, asserting which port method the use case called) is not retrofitting. Retrofitting is changing a test after production code makes it pass, so that the test fits that code. Tightening must keep every existing assertion of that test at least as strong: replacing or loosening the asserted outcome so that the current production code passes is weakening, not tightening, and is a violation.
- A check run inside an app is a red. Some adapters can only be exercised inside a signed app: the iOS Keychain, for example, refuses an unsigned test process. Such a project runs their checks in a harness app and logs the names of the checks that fail (for example a JSON line listing failing contract checks). When the session shows such a run and the source of those checks (a contract or check-runner function), treat each named failing check as an observed failing test whose assertions are that source. It authorizes the behavior those checks assert in the adapter they exercise, as a Gradle red would. A Gradle test of the same adapter that can only reach a refusal path does not narrow it. The harness's own check-runner code is test infrastructure, like test source.
- Boundary events are part of the minimum green. When the codebase records one structured event or telemetry call per external call or outcome (an observability rule requires it at adapter boundaries), the event at each external call or outcome that an observed red covers is part of the minimum green for that call, even when no test asserts it. Events at calls no red covers, events carrying values from the data, and other behavior beside the event still need their own red. So does a platform attribute that changes what is stored or who can read it (a Keychain accessibility class, an access group, a synchronizable flag): it is behavior, not part of the call, unless a check asserts it.
- After a compile red for a missing symbol, a declaration whose bodies are only \`TODO()\` (or a literal the assertion rejects) is the authorized placeholder, in a new file as in an existing one.
- Git staging and git-index state are irrelevant. Judge only the recent session evidence, current file content, and pending action; do not require a test or production file to be staged.
${IN_PROGRESS_TDD_RULE}
${GENERALISING_TDD_RULE}`

/**
 * Kotlin sessions commonly include Gradle output plus several source reads between
 * red and green. Twenty events preserves that nearby red; clipping each event at
 * 6,000 characters keeps the additional context bounded. A judge that
 * returns no verdict (spend limit, auth failure) is reported as an
 * infrastructure failure rather than a TDD rejection.
 */
export function enforceKotlinTdd(): Rule {
  return withJudgeFailureDiagnostics(
    withContradictionRetry(
      enforceTdd({
        instructions: (defaults) => `${defaults}\n\n${KOTLIN_TDD_ADDENDUM}`,
        maxEvents: 20,
        maxContentChars: 6_000,
      }),
    ),
    { deterministicPaths: KOTLIN_DETERMINISTIC_PATHS },
  )
}
