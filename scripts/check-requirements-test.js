#!/usr/bin/env node

'use strict';

// Contract test for skills/spec-driven-development/scripts/check-requirements.mjs.
// Each case is a fresh git repository with a SPEC.md and one test file; the checker
// must exit 1 when a live, non-waived ID has no tagged test, and 0 otherwise. The
// eval fixture ships its own copy of the checker, which must stay byte-identical.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { after, test } = require('node:test');

const ROOT = path.join(__dirname, '..');
const CHECKER = path.join(ROOT, 'skills', 'spec-driven-development', 'scripts', 'check-requirements.mjs');
const FIXTURE_COPY = path.join(
  ROOT, 'evals', 'fixtures', 'incremental-requirement-ids', 'scripts', 'check-requirements.mjs',
);

const sandboxes = [];

after(() => {
  for (const dir of sandboxes) fs.rmSync(dir, { recursive: true, force: true });
});

function tempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-skills-check-requirements-'));
  sandboxes.push(dir);
  return dir;
}

function spec(criteria, seamRows = ['| applyDiscount() | DSC-1, DSC-10 |']) {
  return [
    '# Spec: Discount codes',
    '',
    '| Seam | Requirement IDs |',
    '| --- | --- |',
    ...seamRows,
    '',
    'Requirement key: DSC',
    '',
    '## Success Criteria',
    ...criteria.map((c, i) => `${i + 1}. ${c}`),
    '',
  ].join('\n');
}

function makeRepo(specText, testText) {
  const root = tempDir();
  assert.equal(spawnSync('git', ['init', '-q'], { cwd: root }).status, 0);
  fs.writeFileSync(path.join(root, 'SPEC.md'), specText);
  fs.mkdirSync(path.join(root, 'test'));
  fs.writeFileSync(path.join(root, 'test', 'discount.test.js'), testText);
  return root;
}

function runChecker(cwd, ...args) {
  return spawnSync(process.execPath, [CHECKER, ...args], { cwd, encoding: 'utf8' });
}

function untested(stdout) {
  return stdout.split('UNDEFINED ID')[0].match(/DSC-\d+/g) ?? [];
}

test('check-requirements: a defined ID with no tagged test fails', () => {
  const root = makeRepo(
    spec(['DSC-1: Percentage codes reduce the total.', 'DSC-2: Never below zero.']),
    "test('DSC-1: reduces the total', () => {});\n",
  );
  const result = runChecker(root, 'SPEC.md');
  assert.equal(result.status, 1, result.stderr);
  assert.deepEqual(untested(result.stdout), ['DSC-2']);
});

test('check-requirements: every ID tagged passes', () => {
  const root = makeRepo(
    spec(['DSC-1: Percentage codes reduce the total.', 'DSC-2: Never below zero.']),
    "test('DSC-1: reduces the total', () => {});\ntest('DSC-2: never below zero', () => {});\n",
  );
  const result = runChecker(root, 'SPEC.md');
  assert.equal(result.status, 0, result.stdout);
  assert.deepEqual(untested(result.stdout), []);
});

test('check-requirements: a waived ID needs no test', () => {
  const root = makeRepo(
    spec(
      ['DSC-1: Percentage codes reduce the total.', 'DSC-2: Charged by the payment provider.'],
      ['| applyDiscount() | DSC-1 |', '| waived: needs a real payment provider | DSC-2 |'],
    ),
    "test('DSC-1: reduces the total', () => {});\n",
  );
  const result = runChecker(root, 'SPEC.md');
  assert.equal(result.status, 0, result.stdout);
});

test('check-requirements: a DSC-10 test does not cover DSC-1', () => {
  const root = makeRepo(
    spec(['DSC-1: Percentage codes reduce the total.', 'DSC-10: Unknown codes change nothing.']),
    "test('DSC-10: unknown code leaves the total unchanged', () => {});\n",
  );
  const result = runChecker(root, 'SPEC.md');
  assert.equal(result.status, 1, result.stderr);
  assert.deepEqual(untested(result.stdout), ['DSC-1']);
});

test('check-requirements: only live JS test names count as coverage', () => {
  const root = makeRepo(
    spec([
      'DSC-1: In a describe.', 'DSC-2: In test.skip.', 'DSC-3: In xit.', 'DSC-4: With skip: true.',
      'DSC-5: With a todo.', 'DSC-6: Commented out.', 'DSC-7: In an assertion.', 'DSC-8: Live, skip: false.',
    ]),
    [
      "describe('DSC-1: discounts', () => {",
      "  test.skip('DSC-2: skipped', () => {});",
      "  xit('DSC-3: x-skipped', () => {});",
      "  test('DSC-4: skip option', { skip: true }, () => {});",
      "  test('DSC-5: todo option', { todo: 'later' }, () => {});",
      "  // test('DSC-6: commented out', () => {});",
      "  test('formats the message', () => { expect(msg).toBe('DSC-7: in an assertion'); });",
      "  test('DSC-8: live', { skip: false }, () => {});",
      '});',
      '',
    ].join('\n'),
  );
  const result = runChecker(root, 'SPEC.md');
  assert.equal(result.status, 1, result.stderr);
  assert.deepEqual(untested(result.stdout), ['DSC-1', 'DSC-2', 'DSC-3', 'DSC-4', 'DSC-5', 'DSC-6', 'DSC-7']);
});

test('check-requirements: a pytest skip decorator hides the docstring tag', () => {
  const root = makeRepo(spec(['DSC-1: Live.', 'DSC-2: Skipped.']), '');
  fs.writeFileSync(path.join(root, 'test', 'test_discount.py'), [
    'import pytest',
    '',
    'def test_live():',
    '    """DSC-1: live"""',
    '',
    '@pytest.mark.skip(reason="later")',
    'def test_skipped():',
    '    """DSC-2: skipped"""',
    '',
  ].join('\n'));
  const result = runChecker(root, 'SPEC.md');
  assert.equal(result.status, 1, result.stderr);
  assert.deepEqual(untested(result.stdout), ['DSC-2']);
});

test('check-requirements: no arguments prints usage and exits 2', () => {
  const result = runChecker(tempDir());
  assert.equal(result.status, 2);
  assert.match(result.stderr, /^Usage: /);
  assert.doesNotMatch(result.stderr, /\n\s+at /);
});

test('check-requirements: outside a git repository prints one line and exits 2', () => {
  const dir = tempDir();
  fs.writeFileSync(path.join(dir, 'SPEC.md'), spec(['DSC-1: Percentage codes reduce the total.']));
  const result = runChecker(dir, 'SPEC.md');
  assert.equal(result.status, 2);
  assert.match(result.stderr, /git repository/);
  assert.doesNotMatch(result.stderr, /\n\s+at /);
});

test('check-requirements: a missing spec file prints one line and exits 2', () => {
  const root = makeRepo(spec(['DSC-1: Percentage codes reduce the total.']), '');
  const result = runChecker(root, 'NOPE.md');
  assert.equal(result.status, 2);
  assert.match(result.stderr, /NOPE\.md/);
  assert.doesNotMatch(result.stderr, /\n\s+at /);
});

test('check-requirements: narrowing to an ID the spec does not define exits 2', () => {
  const root = makeRepo(
    spec(['DSC-1: Percentage codes reduce the total.', 'DSC-2: (dropped) Never below zero.']),
    "test('DSC-1: reduces the total', () => {});\n",
  );
  const result = runChecker(root, 'SPEC.md', 'DSC-1', 'DSC-2', 'DSC-99:');
  assert.equal(result.status, 2);
  assert.match(result.stderr, /DSC-2, DSC-99/);
  assert.doesNotMatch(result.stderr, /\n\s+at /);
});

test('check-requirements: a tracked test file deleted from the working tree is skipped', () => {
  const root = makeRepo(
    spec(['DSC-1: Percentage codes reduce the total.']),
    "test('DSC-1: reduces the total', () => {});\n",
  );
  fs.writeFileSync(path.join(root, 'test', 'gone.test.js'), "test('DSC-1: old', () => {});\n");
  assert.equal(spawnSync('git', ['add', '-A'], { cwd: root }).status, 0);
  fs.rmSync(path.join(root, 'test', 'gone.test.js'));
  const result = runChecker(root, 'SPEC.md');
  assert.equal(result.status, 0, result.stderr);
});

test('check-requirements: the eval fixture copy matches the skill copy', () => {
  assert.ok(
    fs.readFileSync(FIXTURE_COPY).equals(fs.readFileSync(CHECKER)),
    `${path.relative(ROOT, FIXTURE_COPY)} drifted; copy ${path.relative(ROOT, CHECKER)} over it`,
  );
});
