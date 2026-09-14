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

// ─── Fenced-block stripping (#437) ───────────────────────────────────────────
//
// Observed through the required-section rule: a `## Overview` heading that
// lives inside a fenced block must NOT satisfy the check, so the presence of
// "Missing required section: ## Overview" proves the block was stripped, and
// its absence proves prose outside the block survived.

const FENCE_KNOWN = new Set(['fenced']);

/** A SKILL.md with every required section except Overview, which the caller supplies. */
function skillWithOverview(overviewBlock) {
  return [
    '---',
    'name: fenced',
    'description: Exercises fence parsing. Use when testing the linter.',
    '---',
    '',
    overviewBlock,
    '',
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

const OVERVIEW = '## Overview\nx';
const overviewMissing = ({ errors }) => errors.includes('Missing required section: ## Overview');

test('a real Overview heading satisfies the required-section check', () => {
  const result = lintSkillContent('fenced', skillWithOverview(OVERVIEW), FENCE_KNOWN);
  assert.deepEqual(result.errors, []);
});

for (const [form, block] of [
  ['a backtick fence',                 '```markdown\n## Overview\n```'],
  ['an unlabeled fence',               '```\n## Overview\n```'],
  ['a tilde fence',                    '~~~markdown\n## Overview\n~~~'],
  ['a fence indented one space',       ' ```\n## Overview\n ```'],
  ['a fence indented three spaces',    '   ```\n## Overview\n   ```'],
  ['a fence with a longer closer',     '```\n## Overview\n`````'],
  ['a four-backtick fence',            '````\n## Overview\n````'],
]) {
  test(`a heading inside ${form} does not satisfy the check`, () => {
    const result = lintSkillContent('fenced', skillWithOverview(block), FENCE_KNOWN);
    assert.equal(overviewMissing(result), true, `heading inside ${form} leaked into prose`);
  });
}

// The closer must be recognised, or every line after it is swallowed.
for (const [form, block] of [
  ['a same-length closer',       '```\nexample\n```\n\n' + OVERVIEW],
  ['a longer closer',            '```\nexample\n`````\n\n' + OVERVIEW],
  ['an indented closer',         '```\nexample\n   ```\n\n' + OVERVIEW],
  ['a tilde fence closer',       '~~~\nexample\n~~~\n\n' + OVERVIEW],
  ['a closer with trailing spaces', '```\nexample\n```   \n\n' + OVERVIEW],
]) {
  test(`prose after ${form} is still linted`, () => {
    const result = lintSkillContent('fenced', skillWithOverview(block), FENCE_KNOWN);
    assert.equal(overviewMissing(result), false, `prose after ${form} was swallowed`);
  });
}

test('a shorter run of the same marker does not close a longer fence', () => {
  const block = '````\n```\n## Overview\n```\n````';
  const result = lintSkillContent('fenced', skillWithOverview(block), FENCE_KNOWN);
  assert.equal(overviewMissing(result), true);
});

test('a backtick run does not close a tilde fence, and vice versa', () => {
  for (const block of ['~~~\n```\n## Overview\n~~~', '```\n~~~\n## Overview\n```']) {
    const result = lintSkillContent('fenced', skillWithOverview(block), FENCE_KNOWN);
    assert.equal(overviewMissing(result), true);
  }
});

test('a fence indented four spaces is an indented code block, not a fence', () => {
  // Four spaces makes the line indented code in CommonMark; the heading that
  // follows is regular prose and must still satisfy the check.
  const block = '    ```\n' + OVERVIEW;
  const result = lintSkillContent('fenced', skillWithOverview(block), FENCE_KNOWN);
  assert.equal(overviewMissing(result), false);
});

test('a backtick run followed by inline backticks is prose, not an opener', () => {
  // CommonMark forbids backticks in the info string of a backtick fence, so
  // this line is ordinary prose and the heading below it must still count.
  const block = '```js``` is how you write inline code for a fence\n' + OVERVIEW;
  const result = lintSkillContent('fenced', skillWithOverview(block), FENCE_KNOWN);
  assert.equal(overviewMissing(result), false);
});

test('an unterminated fence swallows everything after it and fails loud', () => {
  const block = '```\n' + OVERVIEW;
  const result = lintSkillContent('fenced', skillWithOverview(block), FENCE_KNOWN);
  assert.equal(overviewMissing(result), true);
  assert.equal(result.errors.includes('Missing required section: ## Verification'), true);
});

test('CRLF line endings are handled', () => {
  const content = skillWithOverview('```\n## Overview\n```').replace(/\n/g, '\r\n');
  const result = lintSkillContent('fenced', content, FENCE_KNOWN);
  assert.equal(overviewMissing(result), true);
});
