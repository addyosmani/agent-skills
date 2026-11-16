'use strict';
/**
 * reference-manifest.js — the canonical checklists shared across skills, and
 * the skill copies generated from them.
 *
 * A shared checklist has exactly one editable source: `references/<file>.md` at
 * the repository root. Each consumer skill carries a byte-identical copy under
 * `skills/<name>/references/`, because a skill may be installed on its own and
 * an OMP `skill://` link cannot leave the skill directory.
 *
 * `sync-references.js` writes the copies; `validate-reference-links.js` fails
 * when a copy drifts from its source. Both read this one list — two
 * hand-maintained lists would drift exactly where the check exists to catch it.
 */

const COPIES = [
  { skill: 'incremental-implementation', file: 'definition-of-done.md' },
  { skill: 'planning-and-task-breakdown', file: 'definition-of-done.md' },
  { skill: 'shipping-and-launch', file: 'definition-of-done.md' },
  { skill: 'using-agent-skills', file: 'definition-of-done.md' },
  { skill: 'code-review-and-quality', file: 'security-checklist.md' },
  { skill: 'security-and-hardening', file: 'security-checklist.md' },
  { skill: 'shipping-and-launch', file: 'security-checklist.md' },
  { skill: 'code-review-and-quality', file: 'performance-checklist.md' },
  { skill: 'performance-optimization', file: 'performance-checklist.md' },
  { skill: 'shipping-and-launch', file: 'performance-checklist.md' },
  { skill: 'frontend-ui-engineering', file: 'accessibility-checklist.md' },
  { skill: 'shipping-and-launch', file: 'accessibility-checklist.md' },
  { skill: 'observability-and-instrumentation', file: 'observability-checklist.md' },
  { skill: 'doubt-driven-development', file: 'orchestration-patterns.md' },
  { skill: 'test-driven-development', file: 'testing-patterns.md' },
];

module.exports = { COPIES };
