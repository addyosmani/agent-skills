/**
 * Issue #151: the TDD judge read "minimum to pass" as one more
 * hard-coded case per test, so a test needing the general case (a sale
 * across three parcels where the code hard-codes two) could never go
 * green with a loop or recursion. Shared by the Kotlin, Swift and JS TDD
 * addenda.
 */
export const GENERALISING_TDD_RULE =
  '- Generalising is a minimal green. When the observed failing test needs the general case of logic that ' +
  'production code special-cases (its input has more items, levels or repetitions than the existing branches ' +
  'handle, such as a third parcel where the code hard-codes two), replacing those special cases with a loop or ' +
  'recursion that covers them is the minimum green, not over-implementation. Do not demand one more hard-coded ' +
  'case per test: that never converges, and the general form is what the tests together specify. It is still ' +
  'over-implementation when the write also adds behavior no observed failing test needs (a new option, error ' +
  'path, ordering or limit). When you do block a green write as over-implementation, name the step you would ' +
  'accept, and that the agent may generalise as a refactor under green once the suite passes.'
