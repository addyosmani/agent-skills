#!/usr/bin/env node

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { afterEach, test } = require('node:test');
const { makeSandbox, cleanupSandboxes, writeFile } = require('./lib/test-utils');

const VALIDATOR = path.join(__dirname, 'validate-reference-links.js');
function setupSandbox() {
  const root = makeSandbox('validate-reference-links');
  const scriptsDir = path.join(root, 'scripts');
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.copyFileSync(VALIDATOR, path.join(scriptsDir, 'validate-reference-links.js'));
  return root;
}

function run(root) {
  return spawnSync(process.execPath, [path.join(root, 'scripts', 'validate-reference-links.js')], {
    cwd: root,
    encoding: 'utf8',
  });
}

afterEach(cleanupSandboxes);

test('passes when a skill reaches the shared checklist two levels up', () => {
  const root = setupSandbox();
  writeFile(root, 'references/definition-of-done.md', '# Definition of Done\n');
  writeFile(
    root,
    'skills/using-agent-skills/SKILL.md',
    'See `../../references/definition-of-done.md`.\n'
  );

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /1 skills checked — 0 error\(s\) — PASSED/);
});

test('fails when a skill links the shared checklist as if it were colocated', () => {
  // The regression: references/ lives at the repo root, but the link is
  // resolved from skills/<name>/, so it points two levels too deep.
  const root = setupSandbox();
  writeFile(root, 'references/definition-of-done.md', '# Definition of Done\n');
  writeFile(
    root,
    'skills/using-agent-skills/SKILL.md',
    'See `references/definition-of-done.md`.\n'
  );

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /1 skills checked — 1 error\(s\) — FAILED/);
  assert.match(
    result.stdout,
    /L1: references\/definition-of-done\.md — resolves to skills\/using-agent-skills\/references\/definition-of-done\.md/
  );
  assert.match(result.stdout, /use `\.\.\/\.\.\/references\/<file>\.md`/);
});

test('checks markdown link syntax, not just backtick mentions', () => {
  const root = setupSandbox();
  writeFile(root, 'references/definition-of-done.md', '# Definition of Done\n');
  writeFile(root, 'skills/using-agent-skills/SKILL.md', 'See [DoD](references/definition-of-done.md).\n');

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /L1: references\/definition-of-done\.md/);
});

test('passes when a skill colocates its own references directory', () => {
  // CLAUDE.md allows self-contained skills to keep references under
  // skills/<name>/references/. Those links are correct as written.
  const root = setupSandbox();
  writeFile(root, 'skills/dataviz/references/palette.md', '# Palette\n');
  writeFile(root, 'skills/dataviz/SKILL.md', 'See `references/palette.md`.\n');

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /1 skills checked — 0 error\(s\) — PASSED/);
});

test('fails when a link points at a checklist that no longer exists', () => {
  const root = setupSandbox();
  writeFile(root, 'references/definition-of-done.md', '# Definition of Done\n');
  writeFile(root, 'skills/shipping-and-launch/SKILL.md', 'See `../../references/renamed.md`.\n');

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /L1: \.\.\/\.\.\/references\/renamed\.md/);
  assert.match(result.stdout, /1 skills checked — 1 error\(s\) — FAILED/);
});

test('ignores paths that are not references/ links', () => {
  // Skills legitimately name artifacts the user has yet to create. Widening
  // this validator into a general markdown linter would fail the build on them.
  const root = setupSandbox();
  writeFile(root, 'references/definition-of-done.md', '# Definition of Done\n');
  writeFile(
    root,
    'skills/planning-and-task-breakdown/SKILL.md',
    [
      'Save the task list to `tasks/todo.md` and the plan to `tasks/plan.md`.',
      'Record findings in `PERF.md` or `docs/ideas/[idea-name].md`.',
      'Related: `skills/incremental-implementation/SKILL.md`.',
      'See `../../references/definition-of-done.md`.',
      '',
    ].join('\n')
  );

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /1 skills checked — 0 error\(s\) — PASSED/);
});

test('reports every unresolvable link, not just the first per skill', () => {
  const root = setupSandbox();
  writeFile(root, 'references/security-checklist.md', '# Security\n');
  writeFile(root, 'references/performance-checklist.md', '# Performance\n');
  writeFile(
    root,
    'skills/code-review-and-quality/SKILL.md',
    ['See `references/security-checklist.md`.', 'And `references/performance-checklist.md`.', ''].join('\n')
  );

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /1 skills checked — 2 error\(s\) — FAILED/);
});
