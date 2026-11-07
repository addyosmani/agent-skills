/**
 * `@jjchill/probity-rules` barrel — language-NEUTRAL rule modules
 * only.
 *
 * kotlin.ts and swift.ts are deliberately NOT re-exported here: both
 * export `requireGreenTestRun` and `forbidNewAmbientEffects` with
 * different signatures than the language-neutral versions in
 * gates.ts, so a combined `export *` would collide. Reach the
 * language-specific rules directly via `@jjchill/probity-rules/rules/kotlin`
 * or `@jjchill/probity-rules/rules/swift`, or use a preset
 * (`@jjchill/probity-rules/presets/*`) which already wires the right
 * ones together.
 */
export * from './rules/gates.js'
export * from './rules/js-tdd.js'
export * from './rules/ports-and-adapters.js'
export * from './rules/acceptance-language.js'
export * from './rules/spec-test-parity.js'
export * from './rules/ubiquitous-language.js'
export * from './rules/scoping.js'
export * from './rules/kiro-judge.js'
export * from './rules/shadow-judge.js'
export * from './rules/judge-task.js'
export * from './rules/probity-config.js'
export * from './rules/shell-writes.js'
export * from './rules/review-config.js'
export * from './rules/review-record.js'
