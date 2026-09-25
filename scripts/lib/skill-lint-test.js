#!/usr/bin/env node

'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');

const fs   = require('node:fs');
const os   = require('node:os');
const path = require('node:path');

const { lintSkillContent, lintSkillLayout, topLevelFrontmatterKeys } = require('./skill-lint.js');

const KNOWN = new Set(['alpha', 'beta']);

/**
 * Build a throwaway skill directory. `dirs` are created empty; `files` maps a
 * path within the skill to its contents, creating parents as needed.
 */
function makeSkillDir({ dirs = [], files = {} } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-layout-'));
  for (const d of dirs) fs.mkdirSync(path.join(root, d), { recursive: true });
  for (const [rel, body] of Object.entries(files)) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  }
  return root;
}

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
  // Two errors: 'exempt' is not a spec key, and the exemption itself is refused.
  assert.equal(errors.length, 2);
  assert.equal(errors.filter(e => /not in the validator's SECTION_EXEMPT_SKILLS allowlist/.test(e)).length, 1);
  assert.equal(errors.filter(e => /Frontmatter key 'exempt' is not an Agent Skills spec field/.test(e)).length, 1);
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

test('a description whose only triggers are negated is rejected regardless of how many there are', () => {
  const content = withAllSections(
    [
      '---',
      'name: alpha',
      'description: Designs alphas. Do not use when building betas. Never use when the input is JSON.',
      '---',
    ].join('\n')
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

// ── Frontmatter must be valid YAML, not merely splittable ────────────────────
// `parseFrontmatter` splits each line on its first colon, which is forgiving by
// design. The hosts that read these skills are not: Cursor parses the
// frontmatter as YAML when a skill is attached to a message, and a parse
// failure fails the whole request and takes the chat's context with it (#494).
// Each shape below was confirmed rejected by a strict parser (ruby psych) while
// passing every other check in this linter.

/** Frontmatter that is otherwise complete, so only YAML validity varies. */
function fmLines(...lines) {
  return withAllSections(['---', 'name: alpha', ...lines, '---'].join('\n'));
}

const yamlErrors = result => result.errors.filter(e => e.startsWith('Frontmatter line '));

test('a valid frontmatter reports no YAML error', () => {
  const result = lintSkillContent('alpha', fmLines('description: Use when you need alpha'), KNOWN);
  assert.deepEqual(yamlErrors(result), []);
});

test('an unquoted value containing a colon is rejected', () => {
  // YAML reads `Use when: X` as a nested mapping and errors; the split-on-first
  // -colon parser reads it as a plain string and never notices.
  const result = lintSkillContent(
    'alpha',
    fmLines('description: Use when you need alpha: auth, secrets and review'),
    KNOWN,
  );
  assert.equal(yamlErrors(result).length, 1);
  assert.match(yamlErrors(result)[0], /unquoted value containing/);
});

test('quoting the same value makes it valid again', () => {
  const result = lintSkillContent(
    'alpha',
    fmLines('description: "Use when you need alpha: auth, secrets and review"'),
    KNOWN,
  );
  assert.deepEqual(yamlErrors(result), []);
});

test('a colon with no trailing space is left alone', () => {
  // `https://example.com` is a perfectly good YAML scalar. The rule keys on
  // colon-space, not on colons, so ordinary URLs do not trip it.
  const result = lintSkillContent(
    'alpha',
    fmLines('description: Use when you need alpha', 'docs: https://example.com/a:b'),
    KNOWN,
  );
  assert.deepEqual(yamlErrors(result), []);
});

test('a tab used for indentation is rejected', () => {
  const result = lintSkillContent(
    'alpha',
    fmLines('description: Use when you need alpha', 'meta:', '\tlevel: core'),
    KNOWN,
  );
  assert.equal(yamlErrors(result).length, 1);
  assert.match(yamlErrors(result)[0], /indents with a tab/);
});

test('an unterminated quote is rejected', () => {
  const result = lintSkillContent('alpha', fmLines('description: "Use when you need alpha'), KNOWN);
  assert.equal(yamlErrors(result).length, 1);
  assert.match(yamlErrors(result)[0], /never closes/);
});

test('a duplicate key is not reported, because YAML accepts it', () => {
  // Deliberate boundary: `safe_load` accepts duplicate keys, so flagging them
  // here would fail files no host rejects. The rule tracks the parser, not taste.
  const result = lintSkillContent(
    'alpha',
    fmLines('description: Use when you need alpha', 'description: Use when you need alpha'),
    KNOWN,
  );
  assert.deepEqual(yamlErrors(result), []);
});

test('the error names the line so the fix is obvious', () => {
  const result = lintSkillContent(
    'alpha',
    fmLines('description: Use when you need alpha', 'owner: team: platform'),
    KNOWN,
  );
  assert.match(yamlErrors(result)[0], /^Frontmatter line 4 /);
});

// ─── Context budget ──────────────────────────────────────────────────────────

test('warns when SKILL.md exceeds the 500-line context budget', () => {
  const padded = withAllSections(VALID_FRONTMATTER) + '\n'.repeat(600);

  const { errors, warnings } = lintSkillContent('alpha', padded, KNOWN);

  assert.equal(errors.length, 0, 'an over-budget skill must not block CI');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /over the 500-line context budget/);
});

test('a SKILL.md at exactly the budget is not flagged', () => {
  const base = withAllSections(VALID_FRONTMATTER);
  const baseLines = (base.match(/\n/g) || []).length;
  const atBudget = base + '\n'.repeat(500 - baseLines);

  assert.equal((atBudget.match(/\n/g) || []).length, 500, 'fixture must sit exactly on the boundary');
  const { warnings } = lintSkillContent('alpha', atBudget, KNOWN);

  assert.equal(warnings.length, 0);
});

// ─── Layout ──────────────────────────────────────────────────────────────────

test('reports an empty scripts/ directory', () => {
  const dir = makeSkillDir({ dirs: ['scripts'] });

  const errors = lintSkillLayout(dir);

  assert.equal(errors.length, 1);
  assert.match(errors[0], /Empty directory `scripts\/`/);
});

test('reports a directory that only nests more empty directories', () => {
  const dir = makeSkillDir({ dirs: ['references', 'references/deep'] });

  const errors = lintSkillLayout(dir);

  assert.equal(errors.length, 1, 'the outermost empty directory is named once, not every level');
  assert.match(errors[0], /Empty directory `references\/`/);
});

test('a directory holding a file is not empty', () => {
  const dir = makeSkillDir({ files: { 'scripts/helper.sh': '#!/bin/bash\nset -e\n' } });

  assert.deepEqual(lintSkillLayout(dir), []);
});

test('reports a supporting .md file that is not lowercase-hyphen-separated', () => {
  const dir = makeSkillDir({ files: { 'Refinement_Criteria.md': 'x\n' } });

  const errors = lintSkillLayout(dir);

  assert.equal(errors.length, 1);
  assert.match(errors[0], /Supporting file `Refinement_Criteria\.md` is not lowercase-hyphen-separated/);
});

test('names a badly named supporting file by its path within the skill', () => {
  const dir = makeSkillDir({ files: { 'references/Floor_Guard.md': 'x\n' } });

  const errors = lintSkillLayout(dir);

  assert.equal(errors.length, 1);
  assert.match(errors[0], /`references\/Floor_Guard\.md`/);
});

test('SKILL.md is exempt from the supporting-file naming rule', () => {
  const dir = makeSkillDir({ files: { 'SKILL.md': 'x\n', 'examples.md': 'x\n' } });

  assert.deepEqual(lintSkillLayout(dir), []);
});

test('non-markdown files are left to the Script Requirements conventions', () => {
  const dir = makeSkillDir({ files: { 'scripts/Idea_Refine.sh': '#!/bin/bash\nset -e\n' } });

  assert.deepEqual(lintSkillLayout(dir), []);
});

// ─── Spec-only top-level frontmatter keys ────────────────────────────────────
//
// docs/advanced-per-agent-configuration.md: the specification reserves the top
// level for name, description, license, compatibility, metadata and
// allowed-tools. Vendor and runtime fields go under `metadata` or in a
// per-agent adapter file, never at the top level of a published SKILL.md.

function skillWithFrontmatter(lines) {
  return withAllSections(['---', ...lines, '---'].join('\n'));
}

const SPEC_KEY_RE = /is not an Agent Skills spec field/;

test('a vendor field at the top level is rejected and the message names the key', () => {
  const { errors } = lintSkillContent('alpha', skillWithFrontmatter([
    'name: alpha',
    'description: Designs alphas. Use when building one.',
    'model: claude-opus-5',
  ]), KNOWN);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Frontmatter key 'model'/);
  assert.match(errors[0], SPEC_KEY_RE);
  assert.match(errors[0], /advanced-per-agent-configuration\.md/);
});

test('every unknown top-level key is reported, not just the first', () => {
  const { errors } = lintSkillContent('alpha', skillWithFrontmatter([
    'name: alpha',
    'description: Designs alphas. Use when building one.',
    'max_turns: 10',
    'tools: [read_file]',
    'context: fork',
  ]), KNOWN);
  const keyErrors = errors.filter(e => SPEC_KEY_RE.test(e));
  assert.deepEqual(keyErrors.map(e => e.match(/key '([^']+)'/)[1]), ['max_turns', 'tools', 'context']);
});

test('all six specification keys are accepted at the top level', () => {
  const { errors } = lintSkillContent('alpha', skillWithFrontmatter([
    'name: alpha',
    'description: Designs alphas. Use when building one.',
    'license: MIT',
    'compatibility: Requires git and a test runner',
    'allowed-tools: Read Grep',
    'metadata:',
    '  author: someone',
  ]), KNOWN);
  assert.deepEqual(errors.filter(e => SPEC_KEY_RE.test(e)), []);
});

test('vendor fields nested under metadata are not top-level keys', () => {
  const { errors } = lintSkillContent('alpha', skillWithFrontmatter([
    'name: alpha',
    'description: Designs alphas. Use when building one.',
    'metadata:',
    '  model: gemini-3-pro',
    '  max_turns: 10',
    '  tools:',
    '    - read_file',
  ]), KNOWN);
  assert.deepEqual(errors.filter(e => SPEC_KEY_RE.test(e)), []);
});

test('topLevelFrontmatterKeys sees only column-zero keys, in order', () => {
  const content = [
    '---',
    'name: alpha',
    '# a comment: with a colon',
    'metadata:',
    '  model: x',
    '  tools:',
    '    - a',
    'allowed-tools: Read',
    '---',
    '',
    'body: not frontmatter',
  ].join('\n');
  assert.deepEqual(topLevelFrontmatterKeys(content), ['name', 'metadata', 'allowed-tools']);
});

test('topLevelFrontmatterKeys returns [] without a frontmatter block', () => {
  assert.deepEqual(topLevelFrontmatterKeys('## Overview\nx\n'), []);
});

test('the spec-key check tolerates CRLF frontmatter', () => {
  const content = skillWithFrontmatter([
    'name: alpha',
    'description: Designs alphas. Use when building one.',
    'temperature: 0.2',
  ]).replace(/\n/g, '\r\n');
  const { errors } = lintSkillContent('alpha', content, KNOWN);
  assert.equal(errors.filter(e => /key 'temperature'/.test(e)).length, 1);
});
