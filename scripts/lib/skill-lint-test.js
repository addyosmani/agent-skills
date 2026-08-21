#!/usr/bin/env node

'use strict';

/**
 * Unit tests for `lintSkillContent`.
 *
 * Two groups, added by separate changes and merged here:
 *   - section exemptions, and guardrails on the rules beside them (#505)
 *   - the fence-stripping helper behind the required-section rule (#444)
 */

const assert = require('node:assert/strict');
const { test } = require('node:test');

const { lintSkillContent } = require('./skill-lint.js');

const KNOWN = new Set(['alpha', 'beta', 'portable-skill']);

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

// ─── Guardrails on the rules those exemptions sit beside ─────────────────────

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

test('reports a missing frontmatter block', () => {
  const { errors } = lintSkillContent('alpha', '## Overview\nx\n', KNOWN);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Missing or malformed YAML frontmatter/);
});

// ─── Fenced-block stripping ──────────────────────────────────────────────────
//
// The rule is observed indirectly: a heading inside a fenced block must NOT
// satisfy `## Overview`, so "Missing required section: ## Overview" is the
// signal that the block was stripped — and its absence is the signal that
// prose outside the block survived.

/**
 * A structurally valid SKILL.md whose `## Overview` heading is supplied by the
 * caller — either as real prose or buried inside a fenced block.
 */
function skillWithOverview(overviewBlock) {
  return `---
name: portable-skill
description: Guides agents through portable work. Use when testing skill portability.
---

# Portable Skill

${overviewBlock}

## When to Use
Use for fence-parsing tests.

## Common Rationalizations
None.

## Red Flags
None.

## Verification
Verify the result.
`;
}

const overviewMissing = result => result.errors.includes('Missing required section: ## Overview');

const OVERVIEW = '## Overview\nPortable workflow.';

test('a real Overview heading satisfies the required-section check', () => {
  const result = lintSkillContent('portable-skill', skillWithOverview(OVERVIEW), KNOWN);
  assert.deepEqual(result.errors, []);
});

// A heading buried in a fenced block must not satisfy the check.
for (const [description, block] of [
  ['a plain backtick fence', '```markdown\n## Overview\n```'],
  ['an unlabeled fence',     '```\n## Overview\n```'],
  ['a tilde fence',          '~~~markdown\n## Overview\n~~~'],
  ['an indented fence',      '   ```markdown\n## Overview\n   ```'],
  ['a fence with a longer closer', '```markdown\n## Overview\n````'],
]) {
  test(`a heading inside ${description} does not satisfy the check`, () => {
    const result = lintSkillContent('portable-skill', skillWithOverview(block), KNOWN);
    assert.equal(overviewMissing(result), true);
  });
}

// Closing-fence handling: prose after the block must survive, so a closing
// fence that goes unrecognized shows up as a missing section.
for (const [description, block] of [
  ['a same-length closing fence', `\`\`\`markdown\nfenced example\n\`\`\`\n\n${OVERVIEW}`],
  ['a longer closing fence',      `\`\`\`markdown\nfenced example\n\`\`\`\`\`\n\n${OVERVIEW}`],
  ['an indented closing fence',   `\`\`\`markdown\nfenced example\n   \`\`\`\n\n${OVERVIEW}`],
]) {
  test(`prose after ${description} is still linted`, () => {
    const result = lintSkillContent('portable-skill', skillWithOverview(block), KNOWN);
    assert.equal(overviewMissing(result), false);
  });
}

test('a shorter run of backticks does not close a longer fence', () => {
  // The inner ``` and the heading it wraps belong to the ````-fenced block.
  const block = '````markdown\n```\n## Overview\n````';
  const result = lintSkillContent('portable-skill', skillWithOverview(block), KNOWN);
  assert.equal(overviewMissing(result), true);
});

test('a backtick fence does not close a tilde fence', () => {
  const block = '~~~markdown\n```\n## Overview\n~~~';
  const result = lintSkillContent('portable-skill', skillWithOverview(block), KNOWN);
  assert.equal(overviewMissing(result), true);
});

test('an unterminated fence fails loud rather than passing silently', () => {
  // Everything after an unclosed fence is treated as fenced, so the sections
  // below it are reported missing instead of being silently accepted.
  const block = '```markdown\n## Overview';
  const result = lintSkillContent('portable-skill', skillWithOverview(block), KNOWN);
  assert.equal(overviewMissing(result), true);
  assert.equal(result.errors.includes('Missing required section: ## Verification'), true);
});
