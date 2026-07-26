#!/usr/bin/env node

'use strict';

/**
 * Unit tests for scripts/lib/skill-lint.js, asserting the behavior decided
 * in #387's triage: frontmatter must parse as the sanctioned YAML subset
 * (block scalars and comments accepted, malformed lines and non-string
 * name/description rejected), and cross-reference collection must ignore
 * fenced examples while still reading the fenced ASCII lifecycle diagrams.
 *
 * Run with: node --test scripts/skill-lint-test.js
 */

const assert = require('node:assert/strict');
const test = require('node:test');
const { parseFrontmatter, extractSkillReferences, lintSkillContent } = require('./lib/skill-lint');

const KNOWN = new Set(['test-driven-development', 'code-review-and-quality', 'debugging-and-error-recovery']);

function skillDoc(frontmatter, body) {
  return `---\n${frontmatter}\n---\n\n# Title\n\n## Overview\nx\n\n## When to Use\nx\n\n## Common Rationalizations\nx\n\n## Red Flags\nx\n\n## Verification\nx\n${body || ''}`;
}

// ── Frontmatter: shapes that must parse ──────────────────────────────────────

test('plain scalars parse as before', () => {
  const { fields, problems } = parseFrontmatter('---\nname: my-skill\ndescription: Does X. Use when Y.\n---\n');
  assert.deepEqual(problems, []);
  assert.equal(fields.name, 'my-skill');
  assert.equal(fields.description, 'Does X. Use when Y.');
});

test('quoted scalars are unwrapped', () => {
  const { fields, problems } = parseFrontmatter('---\nname: "my-skill"\ndescription: \'Does X: a, b. Use when Y.\'\n---\n');
  assert.deepEqual(problems, []);
  assert.equal(fields.name, 'my-skill');
  assert.equal(fields.description, 'Does X: a, b. Use when Y.');
});

test('folded block scalar (>) joins lines with spaces and preserves paragraph breaks', () => {
  const fm = parseFrontmatter('---\ndescription: >-\n  Does X across\n  several lines.\n\n  Use when Y.\n---\n');
  assert.deepEqual(fm.problems, []);
  assert.equal(fm.fields.description, 'Does X across several lines.\nUse when Y.');
});

test('literal block scalar (|) preserves newlines', () => {
  const fm = parseFrontmatter('---\ndescription: |-\n  Line one.\n  Line two.\n---\n');
  assert.deepEqual(fm.problems, []);
  assert.equal(fm.fields.description, 'Line one.\nLine two.');
});

test('comments are ignored: full-line, and trailing on unquoted scalars', () => {
  const fm = parseFrontmatter('---\n# top comment\nname: my-skill # trailing\ndescription: Use when Y.\n---\n');
  assert.deepEqual(fm.problems, []);
  assert.equal(fm.fields.name, 'my-skill');
});

test('a # without preceding whitespace is part of the value, not a comment', () => {
  const fm = parseFrontmatter('---\ndescription: Handles C# projects. Use when Y.\n---\n');
  assert.deepEqual(fm.problems, []);
  assert.equal(fm.fields.description, 'Handles C# projects. Use when Y.');
});

test('multiline description length is measured on the assembled string', () => {
  const long = Array.from({ length: 30 }, () => 'a'.repeat(40)).join('\n  ');
  const doc = skillDoc(`name: my-skill\ndescription: >-\n  Use when Y. ${long}`);
  const { errors } = lintSkillContent('my-skill', doc, KNOWN);
  assert.ok(errors.some(e => e.includes('exceeds the 1024-char limit')),
    `expected a length error, got: ${JSON.stringify(errors)}`);
});

// ── Frontmatter: shapes that must be rejected ────────────────────────────────

test('a malformed line is an error, not silently skipped', () => {
  const doc = skillDoc('name: my-skill\njust some words with no key\ndescription: Use when Y.');
  const { errors } = lintSkillContent('my-skill', doc, KNOWN);
  assert.ok(errors.some(e => e.includes('Malformed frontmatter line')),
    `expected a malformed-line error, got: ${JSON.stringify(errors)}`);
});

test('a flow-collection description is an error, not accepted as a string', () => {
  const doc = skillDoc('name: my-skill\ndescription: [use, when, y]');
  const { errors } = lintSkillContent('my-skill', doc, KNOWN);
  assert.ok(errors.some(e => e.includes("'description' is a flow collection")),
    `expected a non-string error, got: ${JSON.stringify(errors)}`);
  assert.ok(!errors.some(e => e.includes("missing required field: 'description'")),
    'the non-string error must not be doubled with a missing-field error');
});

test('a nested-collection description is an error', () => {
  const doc = skillDoc('name: my-skill\ndescription:\n  first: a\n  second: b');
  const { errors } = lintSkillContent('my-skill', doc, KNOWN);
  assert.ok(errors.some(e => e.includes("'description' is a nested collection")),
    `expected a nested-collection error, got: ${JSON.stringify(errors)}`);
});

test('an unterminated quote is an error', () => {
  const doc = skillDoc('name: my-skill\ndescription: "Use when Y.');
  const { errors } = lintSkillContent('my-skill', doc, KNOWN);
  assert.ok(errors.some(e => e.includes('unterminated double-quoted value')),
    `expected an unterminated-quote error, got: ${JSON.stringify(errors)}`);
});

// ── Cross-references ─────────────────────────────────────────────────────────

test('references inside fenced code blocks are not collected', () => {
  const refs = extractSkillReferences('Some prose.\n\n```\nsee `made-up-skill` for details\n```\n');
  assert.equal(refs.size, 0);
});

test('ASCII diagram arrows inside fences are still collected', () => {
  const refs = extractSkillReferences('```\nplan ──→ test-driven-development\n```\n');
  assert.ok(refs.has('test-driven-development'));
});

test('capitalized See/Follow and bare Follow `name` are collected', () => {
  const refs = extractSkillReferences(
    'See `code-review-and-quality` for the axes. Follow `test-driven-development` for the loop.'
  );
  assert.ok(refs.has('code-review-and-quality'));
  assert.ok(refs.has('test-driven-development'));
});

test('relationship bullets and skills/<name>/SKILL.md paths are collected', () => {
  const refs = extractSkillReferences(
    '- **`debugging-and-error-recovery`**: drop into it on failure.\n' +
    'Then follow `skills/test-driven-development/SKILL.md` exactly.\n'
  );
  assert.ok(refs.has('debugging-and-error-recovery'));
  assert.ok(refs.has('test-driven-development'));
});

test('plural `skills` suffix is collected', () => {
  const refs = extractSkillReferences('the `code-review-and-quality` skills family');
  assert.ok(refs.has('code-review-and-quality'));
});

test('single backticked words without hyphens are not collected by the new patterns', () => {
  const refs = extractSkillReferences('See `main` and follow `deploy` carefully.\n- **`main`**: the branch.');
  assert.equal(refs.size, 0);
});

test('a dead reference still warns', () => {
  const doc = skillDoc('name: my-skill\ndescription: Use when Y.', '\nSee `not-a-real-skill` for more.\n');
  const { warnings } = lintSkillContent('my-skill', doc, KNOWN);
  assert.ok(warnings.some(w => w.includes('not-a-real-skill')),
    `expected a dead-reference warning, got: ${JSON.stringify(warnings)}`);
});
