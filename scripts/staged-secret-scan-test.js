#!/usr/bin/env node

'use strict';

// Contract test for the staged-secret scans documented in
// references/security-checklist.md,
// skills/security-and-hardening/references/hardening-patterns.md, and
// skills/git-workflow-and-versioning/SKILL.md (issue #717). The earlier form
// piped the staged diff through a printing grep, so a staged credential's raw
// value was echoed into terminal output and any agent tool log. Each
// documented command is extracted verbatim and run against fixture repos: the
// staged file must be named in the output while the sentinel value itself
// never reaches stdout or stderr.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { after, test } = require('node:test');

const ROOT = path.join(__dirname, '..');
const DOCS = [
  'references/security-checklist.md',
  'skills/security-and-hardening/references/hardening-patterns.md',
  'skills/git-workflow-and-versioning/SKILL.md',
];
const SENTINEL = 'FAKE_SENTINEL_FOR_TEST_ONLY_4b8d2f1a';
// Only a --name-only pickaxe scan can satisfy the contract: any form that
// prints matched diff lines leaks the value it was meant to flag.
const SCAN = /git diff --(?:staged|cached) [^`\n]*--name-only/g;

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Secret Scan Test',
  GIT_AUTHOR_EMAIL: 'secret-scan@example.invalid',
  GIT_COMMITTER_NAME: 'Secret Scan Test',
  GIT_COMMITTER_EMAIL: 'secret-scan@example.invalid',
  GIT_CONFIG_GLOBAL: '/dev/null',
};

const sandboxes = [];
after(() => {
  for (const dir of sandboxes) fs.rmSync(dir, { recursive: true, force: true });
});

function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', env: GIT_ENV });
  assert.equal(r.status, 0, `git ${args.join(' ')} failed: ${r.stderr}`);
}

function fixture(file, contents) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'staged-secret-scan-'));
  sandboxes.push(dir);
  git(dir, 'init', '-q');
  fs.writeFileSync(path.join(dir, file), contents);
  git(dir, 'add', file);
  return dir;
}

function documentedScans() {
  return DOCS.map((rel) => {
    const md = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const cmds = md.match(SCAN) || [];
    assert.equal(cmds.length, 1, `${rel} must document exactly one --name-only staged-secret scan`);
    return { rel, command: cmds[0] };
  });
}

test('documented staged-secret scans name the file, never the secret', (t) => {
  if (spawnSync('bash', ['-c', 'true']).status !== 0) return t.skip('bash unavailable');
  const secret = fixture('config.env', `API_KEY=${SENTINEL}\n`);
  const clean = fixture('notes.txt', 'nothing sensitive here\n');
  for (const { rel, command } of documentedScans()) {
    const hit = spawnSync('bash', ['-c', command], { cwd: secret, env: GIT_ENV, encoding: 'utf8' });
    assert.match(hit.stdout, /config\.env/, `${rel}: the staged file must be named`);
    assert.ok(
      !(hit.stdout + hit.stderr).includes(SENTINEL),
      `${rel}: the secret value must never be printed`,
    );
    const miss = spawnSync('bash', ['-c', command], { cwd: clean, env: GIT_ENV, encoding: 'utf8' });
    assert.equal((miss.stdout + miss.stderr).trim(), '', `${rel}: a clean diff must print nothing`);
  }
});
