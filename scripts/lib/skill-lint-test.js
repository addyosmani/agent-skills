#!/usr/bin/env node

'use strict';

/**
 * Unit tests for the fence-stripping helper behind the required-section rule.
 *
 * The rule is observed indirectly: a heading inside a fenced block must NOT
 * satisfy `## Overview`, so "Missing required section: ## Overview" is the
 * signal that the block was stripped — and its absence is the signal that
 * prose outside the block survived.
 */

const assert = require('node:assert/strict');
const test   = require('node:test');
const { lintSkillContent } = require('./skill-lint');

const KNOWN = new Set(['portable-skill']);

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
