#!/usr/bin/env node

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { afterEach, test } = require('node:test');

const SCRIPT = path.join(__dirname, 'sync-shared-references.js');
const sandboxes = [];

function makeSandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-skills-sync-shared-references-test-'));
  const scriptsDir = path.join(root, 'scripts');
  fs.mkdirSync(path.join(scriptsDir, 'lib'), { recursive: true });
  fs.copyFileSync(SCRIPT, path.join(scriptsDir, 'sync-shared-references.js'));
  fs.copyFileSync(path.join(__dirname, 'lib', 'skill-lint.js'), path.join(scriptsDir, 'lib', 'skill-lint.js'));
  sandboxes.push(root);
  return root;
}

function writeFile(root, relativePath, content) {
  const file = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function readFile(root, relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function exists(root, relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function run(root, ...args) {
  return spawnSync(process.execPath, [path.join(root, 'scripts', 'sync-shared-references.js'), ...args], {
    cwd: root,
    encoding: 'utf8',
  });
}

afterEach(() => {
  for (const root of sandboxes.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('copies a shared checklist into each skill that links it', () => {
  const root = makeSandbox();
  writeFile(root, 'references/definition-of-done.md', '# Definition of Done\n\n- [ ] Tests pass\n');
  writeFile(root, 'skills/planning/SKILL.md', 'Finish with [the DoD](references/shared/definition-of-done.md).\n');
  writeFile(root, 'skills/shipping/SKILL.md', 'See `references/shared/definition-of-done.md`.\n');

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  const expected = '# Definition of Done\n\n- [ ] Tests pass\n';
  assert.equal(readFile(root, 'skills/planning/references/shared/definition-of-done.md'), expected);
  assert.equal(readFile(root, 'skills/shipping/references/shared/definition-of-done.md'), expected);
  assert.match(result.stdout, /2 shared-reference copies written/);
});

test('copies a checklist that a skill reference file links as ../references/shared/', () => {
  const root = makeSandbox();
  writeFile(root, 'references/security-checklist.md', '# Security\n');
  writeFile(root, 'skills/hardening/SKILL.md', 'See [patterns](references/patterns.md).\n');
  writeFile(root, 'skills/hardening/references/patterns.md', 'Check [the list](../references/shared/security-checklist.md).\n');

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(readFile(root, 'skills/hardening/references/shared/security-checklist.md'), '# Security\n');
  assert.equal(readFile(root, 'skills/hardening/references/patterns.md'), 'Check [the list](../references/shared/security-checklist.md).\n');
});

test('makes no copy for a link inside a fence or a file only the skill has', () => {
  const root = makeSandbox();
  writeFile(root, 'references/definition-of-done.md', '# DoD\n');
  writeFile(
    root,
    'skills/planning/SKILL.md',
    ['```markdown', '[DoD](references/shared/definition-of-done.md)', '```', '', 'See [notes](references/notes.md).', ''].join('\n')
  );
  writeFile(root, 'skills/planning/references/notes.md', '# Notes\n');

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(exists(root, 'skills/planning/references/shared/definition-of-done.md'), false);
  assert.equal(readFile(root, 'skills/planning/references/notes.md'), '# Notes\n');
  assert.match(result.stdout, /0 shared-reference copies written/);
});

const COPY = 'skills/planning/references/shared/definition-of-done.md';
const LINKED = 'See `references/shared/definition-of-done.md`.\n';

// Each case leaves the copies out of date in one way; --check must report it
// and change nothing, and a sync must bring the copy to `after`.
const DRIFT = [
  {
    label: 'missing  ',
    drift(root) {
      writeFile(root, 'skills/planning/SKILL.md', LINKED);
    },
    after: '# DoD\n',
  },
  {
    label: 'stale    ',
    drift(root) {
      writeFile(root, 'skills/planning/SKILL.md', LINKED);
      run(root);
      writeFile(root, 'references/definition-of-done.md', '# DoD\n\n- [ ] Docs updated\n');
    },
    after: '# DoD\n\n- [ ] Docs updated\n',
  },
  {
    label: 'unused   ',
    drift(root) {
      writeFile(root, 'skills/planning/SKILL.md', LINKED);
      run(root);
      writeFile(root, 'skills/planning/SKILL.md', 'No checklist here.\n');
    },
    after: null,
  },
];

for (const { label, drift, after } of DRIFT) {
  test(`--check reports the copy as ${label.trim()} and changes nothing; a sync fixes it`, () => {
    const root = makeSandbox();
    writeFile(root, 'references/definition-of-done.md', '# DoD\n');
    drift(root);
    const before = exists(root, COPY) ? readFile(root, COPY) : null;

    const check = run(root, '--check');

    assert.equal(check.status, 1, check.stdout + check.stderr);
    assert.ok(check.stdout.includes(`${label}${COPY}`), check.stdout);
    assert.match(check.stdout, /Run: node scripts\/sync-shared-references\.js/);
    assert.equal(exists(root, COPY) ? readFile(root, COPY) : null, before);

    assert.equal(run(root).status, 0);
    assert.equal(run(root, '--check').status, 0);
    assert.equal(exists(root, COPY) ? readFile(root, COPY) : null, after);
  });
}
