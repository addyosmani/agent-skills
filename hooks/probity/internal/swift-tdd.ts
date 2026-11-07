import { enforceTdd, type Rule } from '@nizos/probity'

import { GENERALISING_TDD_RULE } from './generalising-tdd.js'
import { IN_PROGRESS_TDD_RULE } from './in-progress-tdd.js'

/**
 * The #80 rules for the Swift TDD judge (issue #85): the Kotlin/KMP
 * addendum's port-method, ruled-out-route and red-test-tightening rules,
 * in Swift's terms (protocols as ports, fakes and spies, `xcodebuild
 * test` runs).
 */
export const SWIFT_TDD_ADDENDUM = `## Swift TDD clarification

- A port method can be the minimal green. Judge what the failing test needs from the driven ports the code already has (the protocol requirements in the current file content, and the calls the test's fakes or spies record), not from what a store, repository or use case could do with data it never receives. When the test asserts an outcome for data that no existing protocol requirement can deliver to the code under test, no store, merge, or use-case logic can make it pass. For example: the test expects Sudo B's messages offline, B was never read online, and the gateway protocol can only fetch one Sudo at a time. Then adding the one protocol requirement that delivers that data, its result type, and the fake's implementation of it is the minimal green, even though the test does not name the method. A protocol requirement is a declaration with no behavior of its own, and it usually mirrors the service it stands for: do not deny it over its signature. A parameter the test passes as nil or a default (such as \`since: Date?\` for "everything"), or a result field the test ignores (such as a cursor), does nothing until code behind the port uses it, and asking for a narrower signature is not a TDD objection. The code behind it (the fake, the use case) stays bounded by the test's assertions; paging, cursors, retries, or deletion handling the test does not assert are still over-implementation.
- A route that was tried and still fails is ruled out. If the session shows that a change a previous denial proposed was written, and the same test was then run and still failed the same way, do not deny the next write by proposing that route again. Judge the pending write on its own merits.
- Tightening a red test is part of the red step. When the latest relevant run shows a test failing and no production write has made it pass since, a test-source write that adds or strengthens an assertion in that test (for example, asserting which protocol method the use case called on a spy) is not retrofitting. Retrofitting is changing a test after production code makes it pass, so that the test fits that code. Tightening must keep every existing assertion of that test at least as strong: replacing or loosening the asserted outcome so that the current production code passes is weakening, not tightening, and is a violation. The added assertion may name a member the fake or a port does not have yet (for example a count of Account-wide reads on a spy): that is part of tightening, not a reason to deny it. The compile failure it then causes does not replace the earlier assertion failure as the red. The next write may add what both need, the port method and the fake member, as one minimal green.
${IN_PROGRESS_TDD_RULE}
${GENERALISING_TDD_RULE}`

/** Probity's TDD judge with {@link SWIFT_TDD_ADDENDUM} appended to its instructions. */
export function enforceSwiftTdd(): Rule {
  return enforceTdd({
    instructions: (defaults) => `${defaults}\n\n${SWIFT_TDD_ADDENDUM}`,
  })
}
