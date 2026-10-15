#!/usr/bin/env node

'use strict';

// Contract test for skills/constraint-driven-development/references/floor-guard.md.
// The fenced `js` block is extracted unchanged and run, with real git, against small
// fixtures: each is a fresh repository with one source file, one test file and a
// CONSTRAINTS.md carrying a floor bullet, a coverage minimum, a bundle maximum and an
// Exceptions table. Loosening moves must exit 1, tightening and no-op moves must exit 0.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { after, before, test } = require('node:test');

const REFERENCE = path.join(
  __dirname, '..', 'skills', 'constraint-driven-development', 'references', 'floor-guard.md',
);
const CONSTRAINTS = [
  '# Constraints',
  '',
  'Last reviewed: 2026-08-08 by @owner',
  '',
  '## Floor',
  '- No skipped tests.',
  '- Latency: p95 under 200 ms and p99 under 900 ms.',
  '',
  '| Dimension | Rule |',
  '|---|---|',
  '| Coverage | >= 80% |',
  '| Bundle | <= 200 KB |',
  '',
  '## Exceptions',
  '',
  '| ID | Rule | Owner | Expires |',
  '|---|---|---|---|',
  '| W1 | no-explicit-any | @owner | 2026-11-01 |',
  '',
].join('\n');

let scratch;
let guard;
const sandboxes = [];

before(() => {
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-skills-floor-guard-test-'));
  const source = fs.readFileSync(REFERENCE, 'utf8');
  const match = source.match(/```js\n([\s\S]*?)\n```/);
  assert.ok(match, 'floor-guard.md must contain one fenced js block');
  guard = path.join(scratch, 'floor-guard.mjs');
  fs.writeFileSync(guard, match[1] + '\n');
});

after(() => {
  for (const dir of sandboxes) fs.rmSync(dir, { recursive: true, force: true });
  if (scratch) fs.rmSync(scratch, { recursive: true, force: true });
});

function git(cwd, ...args) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Floor Guard Test',
      GIT_AUTHOR_EMAIL: 'floor-guard@example.invalid',
      GIT_COMMITTER_NAME: 'Floor Guard Test',
      GIT_COMMITTER_EMAIL: 'floor-guard@example.invalid',
      GIT_CONFIG_GLOBAL: '/dev/null',
    },
  });
  assert.equal(result.status, 0, `git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout;
}

function makeRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-skills-floor-guard-fixture-'));
  sandboxes.push(root);
  git(root, 'init', '-q');
  fs.writeFileSync(path.join(root, 'app.js'), 'module.exports = 1;\n');
  fs.writeFileSync(
    path.join(root, 'app.test.js'),
    "const assert = require('assert');\nassert.equal(require('./app'), 1);\n",
  );
  fs.writeFileSync(path.join(root, 'CONSTRAINTS.md'), CONSTRAINTS);
  git(root, 'add', '.');
  git(root, 'commit', '-qm', 'baseline');
  return root;
}

function editConstraints(root, from, to) {
  const file = path.join(root, 'CONSTRAINTS.md');
  const text = fs.readFileSync(file, 'utf8');
  assert.ok(text.includes(from), `fixture CONSTRAINTS.md must contain ${JSON.stringify(from)}`);
  fs.writeFileSync(file, text.replace(from, to));
}

function commitFile(root, name, text) {
  fs.writeFileSync(path.join(root, name), text);
  git(root, 'add', name);
  git(root, 'commit', '-qm', `add ${name}`);
}

function runGuard(root, cwd = root) {
  return spawnSync(process.execPath, [guard, '--base', 'HEAD'], { cwd, encoding: 'utf8' });
}

const cases = [
  ['unchanged repository is clean', 0, () => {}],
  ['a suppression added to a tracked file is a violation', 1, (root) => {
    fs.writeFileSync(path.join(root, 'app.js'), '// @ts-ignore\nmodule.exports = 1;\n');
  }],
  ['a suppression in a new untracked file is a violation', 1, (root) => {
    fs.writeFileSync(path.join(root, 'new.js'), '// @ts-ignore\nmodule.exports = 1;\n');
  }],
  ['a skipped test in a new untracked file is a violation', 1, (root) => {
    fs.writeFileSync(path.join(root, 'new.test.js'), "test.skip('regression', () => {});\n");
  }],
  ['a suppression in a staged new file is a violation', 1, (root) => {
    fs.writeFileSync(path.join(root, 'new.js'), '// @ts-ignore\nmodule.exports = 1;\n');
    git(root, 'add', '-A');
  }],
  ['a deleted test file is a violation', 1, (root) => {
    fs.unlinkSync(path.join(root, 'app.test.js'));
  }],
  ['a staged deleted test file is a violation', 1, (root) => {
    fs.unlinkSync(path.join(root, 'app.test.js'));
    git(root, 'add', '-A');
  }],
  ['an assertion removed from a surviving test file is a violation', 1, (root) => {
    fs.writeFileSync(path.join(root, 'app.test.js'), "const assert = require('assert');\n");
  }],
  ['lowering a minimum is a violation', 1, (root) => {
    editConstraints(root, '| Coverage | >= 80% |', '| Coverage | >= 60% |');
  }],
  ['raising a minimum is silent', 0, (root) => {
    editConstraints(root, '| Coverage | >= 80% |', '| Coverage | >= 90% |');
  }],
  ['raising a maximum is a violation', 1, (root) => {
    editConstraints(root, '| Bundle | <= 200 KB |', '| Bundle | <= 300 KB |');
  }],
  ['lowering a maximum is silent', 0, (root) => {
    editConstraints(root, '| Bundle | <= 200 KB |', '| Bundle | <= 150 KB |');
  }],
  ['deleting one threshold from a rule is a violation', 1, (root) => {
    editConstraints(root, 'p95 under 200 ms and p99 under 900 ms.', 'p95 under 200 ms.');
  }],
  ['a number inserted before a threshold is silent', 0, (root) => {
    editConstraints(root, '| Coverage | >= 80% |', '| Coverage | per ADR 7, >= 80% |');
  }],
  ['adding a threshold to a rule is silent', 0, (root) => {
    editConstraints(root, '| Bundle | <= 200 KB |', '| Bundle | <= 200 KB, <= 60 KB gzipped |');
  }],
  ['a deleted floor rule is a violation', 1, (root) => {
    editConstraints(root, '- No skipped tests.\n', '');
  }],
  ['a new exception row is a violation', 1, (root) => {
    const file = path.join(root, 'CONSTRAINTS.md');
    fs.appendFileSync(file, '| W2 | temporary waiver | @owner | 2026-10-01 |\n');
  }],
];

for (const [name, expectedExit, mutate] of cases) {
  test(`floor guard: ${name}`, () => {
    const root = makeRepo();
    mutate(root);
    const result = runGuard(root);
    assert.equal(
      result.status, expectedExit,
      `expected exit ${expectedExit}, got ${result.status}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
    );
  });
}

test('floor guard: a removed exception row is silent', () => {
  const root = makeRepo();
  editConstraints(root, '| W1 | no-explicit-any | @owner | 2026-11-01 |\n', '');
  const result = runGuard(root);
  assert.equal(result.status, 0, result.stderr);
});

test('floor guard: a missing merge base exits 2, never 0', () => {
  const root = makeRepo();
  const result = spawnSync(process.execPath, [guard, '--base', 'no-such-ref'], {
    cwd: root, encoding: 'utf8',
  });
  assert.equal(result.status, 2, result.stderr);
});

test('floor guard: a threshold with no readable direction is reported when it changes', () => {
  const root = makeRepo();
  editConstraints(root, '| W1 | no-explicit-any | @owner | 2026-11-01 |', '| W1 | no-explicit-any | @owner | 2027-11-01 |');
  const result = runGuard(root);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /threshold-changed/);
});

test('floor guard: a renamed rule is reported as removed, with a note that its label may have changed', () => {
  const root = makeRepo();
  editConstraints(root, '| Coverage | >= 80% |', '| Code coverage | >= 80% |');
  const result = runGuard(root);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /\[rule-removed\]/);
  assert.match(result.stderr, /label changed/);
});

test('floor guard: a threshold that loses its direction words is reported as removed, with a note saying so', () => {
  const root = makeRepo();
  editConstraints(root, '| Coverage | >= 80% |', '| Coverage | 80% |');
  const result = runGuard(root);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /\[threshold-removed\]/);
  assert.match(result.stderr, /direction words/);
});

// Inside a hunk every line is content. An added line that starts with `++` shows in the diff
// as `+++...`, and a removed line that starts with `--` as `---...`: neither is a file header.
test('floor guard: an added line that starts with ++ is still checked', () => {
  const root = makeRepo();
  fs.writeFileSync(
    path.join(root, 'app.js'),
    'let n = 0;\n++n; // eslint-disable-line no-plusplus\nmodule.exports = n;\n',
  );
  const result = runGuard(root);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /\[silenced-checker\] app\.js:/);
});

test('floor guard: an added line that starts with "++ " does not rename the file for later hunks', () => {
  const root = makeRepo();
  commitFile(root, 'counter.test.js', [
    "const assert = require('assert');",
    'let n = 0;',
    'n += 1;',
    'const m = 2;',
    'assert.equal(n, 1);',
    'assert.equal(m, 2);',
    '',
  ].join('\n'));
  const file = path.join(root, 'counter.test.js');
  const text = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, text.replace('n += 1;', '++ n;').replace('assert.equal(m, 2);\n', ''));
  const result = runGuard(root);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /\[assertion-removed\] counter\.test\.js:/);
});

test('floor guard: a removed line that starts with -- is still checked', () => {
  const root = makeRepo();
  commitFile(root, 'countdown.test.js', [
    "const assert = require('assert');",
    'let n = 1;',
    '--n; assert.equal(n, 0);',
    '',
  ].join('\n'));
  const file = path.join(root, 'countdown.test.js');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('--n; assert.equal(n, 0);\n', ''));
  const result = runGuard(root);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /\[assertion-removed\] countdown\.test\.js:/);
});

// `git ls-files` lists only the current directory's subtree, relative to it, while `git diff`
// covers the whole tree with paths from the top. Run from a subfolder, the guard has to see the
// same files, under the same names, as it does from the top.
test('floor guard: run from a subfolder, an untracked file outside it is still checked', () => {
  const root = makeRepo();
  fs.mkdirSync(path.join(root, 'sub'));
  fs.writeFileSync(path.join(root, 'new.js'), '// @ts-ignore\nmodule.exports = 1;\n');
  const result = runGuard(root, path.join(root, 'sub'));
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /\[silenced-checker\] new\.js:/);
});

test('floor guard: run from a subfolder, an untracked file inside it is named from the top', () => {
  const root = makeRepo();
  fs.mkdirSync(path.join(root, 'sub'));
  fs.writeFileSync(path.join(root, 'sub', 'new.js'), '// @ts-ignore\nmodule.exports = 1;\n');
  const result = runGuard(root, path.join(root, 'sub'));
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /\[silenced-checker\] sub\/new\.js:/);
});

test('floor guard: outside a git work tree exits 2, never 0', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-skills-floor-guard-no-repo-'));
  sandboxes.push(dir);
  const result = runGuard(dir);
  assert.equal(result.status, 2, result.stderr);
});
