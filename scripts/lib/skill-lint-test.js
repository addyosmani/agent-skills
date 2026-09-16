#!/usr/bin/env node

'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');

const { lintSkillContent } = require('./skill-lint.js');

const KNOWN = new Set(['alpha', 'beta']);

/** A SKILL.md body carrying every required section, so tests can isolate frontmatter. */
function withAllSections(frontmatter) {
  return [
    frontmatter,
    '',
    '## Overview',
    'x',
    '## When to Use',
    'x',
    '## Common Rationalizations',
    'x',
    '## Red Flags',
    'x',
    '## Verification',
    'x',
    '',
  ].join('\n');
}

const VALID_FRONTMATTER = [
  '---',
  'name: alpha',
  'description: Designs alphas. Use when building one.',
  '---',
].join('\n');

// ─── Section exemptions ──────────────────────────────────────────────────────

test('a directory named after an Object.prototype key is not exempt from section checks', () => {
  // `constructor` satisfies KEBAB_CASE, and `dirName in SECTION_EXEMPT_SKILLS`
  // finds it on the prototype chain — silently skipping every section check.
  const content = [
    '---',
    'name: constructor',
    'description: Does a thing. Use when you need it.',
    '---',
    '',
    'no sections here',
    '',
  ].join('\n');

  const { errors, exempt } = lintSkillContent('constructor', content, KNOWN);

  assert.equal(exempt, false, 'exemptions must come from the allowlist, not the prototype chain');
  assert.equal(errors.filter(e => /Missing required section/.test(e)).length, 5);
});

test('a genuinely allowlisted skill is still exempt', () => {
  const content = [
    '---',
    'name: using-agent-skills',
    'description: Routes to other skills. Use when choosing one.',
    '---',
    '',
    'no sections here',
    '',
  ].join('\n');

  const { errors, exempt } = lintSkillContent('using-agent-skills', content, KNOWN);

  assert.equal(exempt, true);
  assert.deepEqual(errors.filter(e => /Missing required section/.test(e)), []);
});

test('a skill claiming its own exemption without being allowlisted fails loud', () => {
  const content = withAllSections(
    ['---', 'name: alpha', 'description: Designs alphas. Use when building one.', 'exempt: sections', '---'].join('\n')
  );
  const { errors } = lintSkillContent('alpha', content, KNOWN);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /not in the validator's SECTION_EXEMPT_SKILLS allowlist/);
});

// ─── Guardrails on the rules this change sits beside ─────────────────────────
// Deliberately narrow: #428 rewrites frontmatter parsing and the cross-reference
// patterns, so asserting their behaviour here would collide with that work.

test('a fully valid skill produces no errors', () => {
  const { errors } = lintSkillContent('alpha', withAllSections(VALID_FRONTMATTER), KNOWN);
  assert.deepEqual(errors, []);
});

test('reports a description with no trigger clause', () => {
  const content = withAllSections(
    ['---', 'name: alpha', 'description: Designs alpha things and nothing more.', '---'].join('\n')
  );
  const { errors } = lintSkillContent('alpha', content, KNOWN);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /no 'when to use' trigger/);
});

test('reports frontmatter name that disagrees with the directory', () => {
  const content = withAllSections(
    ['---', 'name: beta', 'description: Designs alphas. Use when building one.', '---'].join('\n')
  );
  const { errors } = lintSkillContent('alpha', content, KNOWN);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /does not match directory name/);
});

test('reports a workflow step declared without a matching process section', () => {
  const content = withAllSections(VALID_FRONTMATTER).replace(
    '## Common Rationalizations',
    [
      '## The Optimization Workflow',
      '',
      '```',
      '1. MEASURE → Establish a baseline',
      '2. GUARD   → Prevent regression',
      '```',
      '',
      '### Step 1: Measure',
      '',
      'Measure first.',
      '',
      '## Common Rationalizations',
    ].join('\n'),
  );

  const { errors } = lintSkillContent('alpha', content, KNOWN);

  assert.equal(errors.length, 1);
  assert.match(errors[0], /Workflow declares Step 2 but has no matching process section/);
});

test('reports a missing frontmatter block', () => {
  const { errors } = lintSkillContent('alpha', '## Overview\nx\n', KNOWN);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Missing or malformed YAML frontmatter/);
});

// ─── Context efficiency (skill-anatomy.md line budget) ───────────────────────

/** A valid SKILL.md whose body is padded to exactly `lines` total lines. */
function skillOfLength(lines) {
  const base = withAllSections(VALID_FRONTMATTER);
  const baseLines = base.replace(/\n$/, '').split('\n').length;
  assert.ok(lines >= baseLines, `fixture wants ${lines} lines, skeleton is already ${baseLines}`);
  return base.replace(/\n$/, '') + '\npad'.repeat(lines - baseLines) + '\n';
}

test('a SKILL.md over the line budget warns without failing CI', () => {
  const { errors, warnings } = lintSkillContent('alpha', skillOfLength(501), KNOWN);
  assert.deepEqual(errors, [], 'the line budget is Recommended, not Required — it must not error');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /501 lines, over the 500-line budget/);
  assert.match(warnings[0], /Context Efficiency/);
});

test('a SKILL.md exactly at the line budget does not warn', () => {
  // Off-by-one guard: "under 500 lines" is enforced as "not more than 500",
  // so 500 is clean and 501 is not.
  const { errors, warnings } = lintSkillContent('alpha', skillOfLength(500), KNOWN);
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test('a trailing newline does not inflate the line count', () => {
  // A file ending in "\n" has no phantom final line. Counting one would report
  // a file at exactly the budget as over it.
  const exact = skillOfLength(500);
  assert.ok(exact.endsWith('\n'), 'fixture should end with a newline');
  assert.deepEqual(lintSkillContent('alpha', exact, KNOWN).warnings, []);
  assert.deepEqual(lintSkillContent('alpha', exact.slice(0, -1), KNOWN).warnings, []);
});

test('the line-budget warning is independent of the other checks', () => {
  // An oversized skill that is ALSO missing sections must report both, so a
  // contributor is not sent round the loop twice.
  const oversized = [
    VALID_FRONTMATTER,
    '',
    '## Overview',
    'x'.repeat(1),
  ].join('\n') + '\npad'.repeat(600) + '\n';
  const { errors, warnings } = lintSkillContent('alpha', oversized, KNOWN);
  assert.ok(errors.length > 0, 'missing sections should still error');
  assert.equal(warnings.filter(w => /line budget/.test(w)).length, 1);
});
