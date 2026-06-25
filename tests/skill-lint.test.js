'use strict';
/**
 * skill-lint.test.js — tests for the linter itself ("test the tests").
 *
 * skills.test.js proves the 24 real skills are valid. It cannot prove the
 * linter rejects invalid input — every real skill passes, so a linter that
 * silently accepts everything would still show green. These fixture-driven
 * cases close that blind spot: each feeds crafted invalid content to the pure
 * lintSkillContent() and asserts the specific error/warning it must raise.
 *
 * Run: npm test
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const lint = require('./lib/skill-lint');

const KNOWN = new Set(['sample-skill', 'test-driven-development']);

// A representative, fully valid SKILL.md. Cases mutate copies of this via
// string replacement so each test isolates exactly one rule violation.
// Body is padded past BODY_WARN_MIN_BYTES so the baseline raises no warnings.
const VALID = `---
name: sample-skill
description: Validates a sample thing for the linter fixtures. Use when you need a representative skill description comfortably above the minimum length guideline.
---

# Sample Skill

## Overview
${'This sentence pads the body above the minimum byte threshold so the valid baseline is warning-free. '.repeat(16)}

## When to Use
- When testing the linter

## Common Rationalizations
| Rationalization | Reality |
|---|---|
| "I'll skip it" | You won't |

## Red Flags
- Skipping the process

## Verification
- [ ] The check passed
`;

function lintContent(content, name = 'sample-skill') {
  return lint.lintSkillContent(name, content, KNOWN);
}

function hasMatch(list, substr) {
  return list.some(item => item.includes(substr));
}

// ─── Baseline: valid content is clean ─────────────────────────────────────────

test('valid content produces no errors and no warnings', () => {
  const { errors, warnings } = lintContent(VALID);
  assert.deepEqual(errors, [], `unexpected errors:\n  ${errors.join('\n  ')}`);
  assert.deepEqual(warnings, [], `unexpected warnings:\n  ${warnings.join('\n  ')}`);
});

// ─── Error cases (must block CI) ──────────────────────────────────────────────

const ERROR_CASES = [
  {
    name: 'name mismatch',
    content: VALID.replace('name: sample-skill', 'name: wrong-name'),
    expect: 'does not match directory name',
  },
  {
    name: 'missing description field',
    content: VALID.replace(/^description: .*$/m, 'foo: bar'),
    expect: "missing required field: 'description'",
  },
  {
    name: 'description over the 1024-char limit',
    content: VALID.replace(/^description: .*$/m, `description: Use when ${'x'.repeat(1100)}`),
    expect: 'exceeds the 1024-char limit',
  },
  {
    name: 'missing H1 title',
    content: VALID.replace('# Sample Skill', 'Sample Skill (no hash)'),
    expect: 'Missing top-level H1 title',
  },
  {
    name: 'missing required section',
    content: VALID.replace('## Overview', '## Summary'),
    expect: 'Missing required section: ## Overview',
  },
  {
    name: 'rationalizations section without a table',
    content: VALID.replace(
      '| Rationalization | Reality |\n|---|---|\n| "I\'ll skip it" | You won\'t |',
      'Just a paragraph, no table here.'
    ),
    expect: 'must contain a markdown table',
  },
  {
    name: 'verification section without a checkbox',
    content: VALID.replace('- [ ] The check passed', '- The check passed'),
    expect: 'must contain at least one checkbox',
  },
  {
    name: 'malformed frontmatter (no block)',
    content: VALID.replace(/^---[\s\S]*?---\n/, ''),
    expect: 'Missing or malformed YAML frontmatter',
  },
  {
    name: 'exemption bypass attempt (type: meta on non-exempt skill)',
    content: VALID.replace('name: sample-skill', 'name: sample-skill\ntype: meta'),
    expect: 'is not in',
  },
];

describe('error cases block CI', () => {
  for (const c of ERROR_CASES) {
    test(c.name, () => {
      const { errors } = lintContent(c.content);
      assert.ok(
        hasMatch(errors, c.expect),
        `expected an error containing "${c.expect}", got:\n  ${errors.join('\n  ') || '(none)'}`
      );
    });
  }
});

// ─── Warning cases (informational, must not block CI) ─────────────────────────

const WARNING_CASES = [
  {
    name: 'description below the minimum length',
    content: VALID.replace(/^description: .*$/m, 'description: Use when short.'),
    expect: `below the ${lint.MIN_DESCRIPTION_LENGTH}-char guideline`,
  },
  {
    name: 'description without a "Use when" clause',
    content: VALID.replace(
      /^description: .*$/m,
      'description: Validates a sample thing for the linter fixtures with a description long enough to clear the minimum length threshold easily.'
    ),
    expect: 'no "Use when" trigger clause',
  },
  {
    name: 'oversized body',
    content: VALID.replace('## Red Flags', `${'x'.repeat(16000)}\n\n## Red Flags`),
    expect: `above ${lint.BODY_WARN_MAX_BYTES}`,
  },
  {
    name: 'dead cross-reference',
    content: VALID.replace(
      '## Red Flags\n- Skipping the process',
      '## Red Flags\n- See the `nonexistent-skill` skill for details'
    ),
    expect: 'Dead cross-reference',
  },
];

describe('warning cases do not block CI', () => {
  for (const c of WARNING_CASES) {
    test(c.name, () => {
      const { errors, warnings } = lintContent(c.content);
      assert.ok(
        hasMatch(warnings, c.expect),
        `expected a warning containing "${c.expect}", got:\n  ${warnings.join('\n  ') || '(none)'}`
      );
      assert.deepEqual(errors, [], `warning case must not raise errors:\n  ${errors.join('\n  ')}`);
    });
  }
});

// ─── Exemption path: exempt skills skip section + format checks ────────────────

test('exempt skill skips section checks even with no standard sections', () => {
  const exemptName = Object.keys(lint.SECTION_EXEMPT_SKILLS)[0];
  const content = `---
name: ${exemptName}
description: A meta routing document. Use when you need to discover which skill applies, with a description long enough to clear the minimum.
---

# ${exemptName}

Some prose without any of the standard sections.
${'Padding to clear the body minimum byte threshold for this fixture. '.repeat(24)}
`;
  const { errors, exempt } = lint.lintSkillContent(exemptName, content, KNOWN);
  assert.equal(exempt, true, `${exemptName} should be section-exempt`);
  assert.ok(
    !hasMatch(errors, 'Missing required section'),
    `exempt skill must not raise section errors:\n  ${errors.join('\n  ')}`
  );
});
