#!/usr/bin/env node

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { afterEach, test } = require('node:test');

const VALIDATOR = path.join(__dirname, 'validate-artifact-paths.js');
const sandboxes = [];

function makeSandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-skills-validate-artifact-paths-test-'));
  const scriptsDir = path.join(root, 'scripts');
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.copyFileSync(VALIDATOR, path.join(scriptsDir, 'validate-artifact-paths.js'));
  sandboxes.push(root);
  return root;
}

function writeFile(root, relativePath, content) {
  const file = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function run(root) {
  return spawnSync(process.execPath, [path.join(root, 'scripts', 'validate-artifact-paths.js')], {
    cwd: root,
    encoding: 'utf8',
  });
}

afterEach(() => {
  for (const root of sandboxes.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('passes when producers and consumers use the canonical artifact paths', () => {
  const root = makeSandbox();
  writeFile(root, 'skills/spec-driven-development/SKILL.md', 'Save the spec as `SPEC.md`, then the plan to `tasks/plan.md` and the task list to `tasks/todo.md`.\n');
  writeFile(root, 'skills/planning-and-task-breakdown/SKILL.md', 'Save to `tasks/plan.md` and `tasks/todo.md`.\n');

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /2 files checked — 0 error\(s\) — PASSED/);
});

test('fails when a producer drifts to an unapproved artifact path (the #93 regression)', () => {
  const root = makeSandbox();
  // The producer drifts to a per-feature layout while the consumer stays on the canonical paths.
  writeFile(root, 'skills/spec-driven-development/SKILL.md', 'Save the spec to `docs/features/[feature-name]/spec.md`.\n');
  writeFile(root, 'skills/planning-and-task-breakdown/SKILL.md', 'Save the plan to `docs/features/[feature-name]/plan.md`.\n');

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /docs\/features\/\[feature-name\]\/spec\.md/);
  assert.match(result.stdout, /docs\/features\/\[feature-name\]\/plan\.md/);
  assert.match(result.stdout, /error\(s\) — FAILED/);
});

test('reports the offending file and line number', () => {
  const root = makeSandbox();
  writeFile(root, 'skills/planning-and-task-breakdown/SKILL.md', 'First line is fine.\nSave the plan to `docs/plans/plan.md`.\n');

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /skills\/planning-and-task-breakdown\/SKILL\.md/);
  assert.match(result.stdout, /L2:/);
});

test('accepts the docs/SPEC.md alternate spec location', () => {
  const root = makeSandbox();
  writeFile(root, 'skills/spec-driven-development/SKILL.md', 'Read the spec from `SPEC.md` or `docs/SPEC.md`.\n');

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /1 files checked — 0 error\(s\) — PASSED/);
});

test('ignores non-artifact markdown references (no false positives)', () => {
  const root = makeSandbox();
  writeFile(
    root,
    'skills/spec-driven-development/SKILL.md',
    'See `SKILL.md` and `references/testing-patterns.md`. Save the plan to `tasks/plan.md`.\n',
  );

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /1 files checked — 0 error\(s\) — PASSED/);
});

test('skips guarded files that do not exist', () => {
  const root = makeSandbox();
  // Only one of the two guarded files is present; the absent one is not an error.
  writeFile(root, 'skills/spec-driven-development/SKILL.md', 'Save the spec as `SPEC.md`.\n');

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /1 files checked — 0 error\(s\) — PASSED/);
});
