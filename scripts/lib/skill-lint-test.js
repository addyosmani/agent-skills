#!/usr/bin/env node

'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');

const fs   = require('node:fs');
const os   = require('node:os');
const path = require('node:path');

const { lintSkillContent, lintSkillLayout } = require('./skill-lint.js');

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
