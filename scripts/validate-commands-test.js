#!/usr/bin/env node

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { afterEach, test } = require('node:test');

const VALIDATOR = path.join(__dirname, 'validate-commands.js');
const sandboxes = [];

function makeSandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-skills-validate-commands-test-'));
  const scriptsDir = path.join(root, 'scripts');
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.copyFileSync(VALIDATOR, path.join(scriptsDir, 'validate-commands.js'));
  sandboxes.push(root);
  return root;
}

function writeFile(root, relativePath, content) {
  const file = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function writeClaudeCommand(root, stem, descriptionLine) {
  writeFile(
    root,
    path.join('.claude', 'commands', `${stem}.md`),
    `---\n${descriptionLine}\n---\n\n# Command\n`,
  );
}

function writeTomlCommand(root, directory, stem, descriptionLine) {
  writeFile(root, path.join(directory, `${stem}.toml`), `${descriptionLine}\nprompt = "Run command"\n`);
}

function writeMatchingCommands(root, stem, description) {
  writeClaudeCommand(root, stem, `description: ${description}`);
  writeTomlCommand(root, path.join('.gemini', 'commands'), stem, `description = "${description}"`);
  writeTomlCommand(root, 'commands', stem, `description = "${description}"`);
}

function run(root) {
  return spawnSync(process.execPath, [path.join(root, 'scripts', 'validate-commands.js')], {
    cwd: root,
    encoding: 'utf8',
  });
}

afterEach(() => {
  for (const root of sandboxes.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('passes matching command twins and maps plan to planning', () => {
  const root = makeSandbox();
  const description = 'Break work into ordered tasks';
  writeClaudeCommand(root, 'plan', `description: ${description}`);
  writeTomlCommand(root, path.join('.gemini', 'commands'), 'planning', `description = '${description}'`);
  writeTomlCommand(root, 'commands', 'planning', `description = '${description}'`);

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /✓  plan \(planning in toml dirs\)/);
  assert.match(result.stdout, /1 commands checked — 0 error\(s\) — PASSED/);
});

test('fails when a Claude command is missing a TOML twin', () => {
  const root = makeSandbox();
  const description = 'Review a change';
  writeClaudeCommand(root, 'review', `description: ${description}`);
  writeTomlCommand(root, path.join('.gemini', 'commands'), 'review', `description = "${description}"`);

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /review — missing in: commands/);
  assert.match(result.stdout, /1 commands checked — 1 error\(s\) — FAILED/);
});

test('fails when a TOML command has no Claude twin', () => {
  const root = makeSandbox();
  writeTomlCommand(root, path.join('.gemini', 'commands'), 'deploy', 'description = "Deploy a change"');
  writeTomlCommand(root, 'commands', 'deploy', 'description = "Deploy a change"');

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /deploy — present in toml dirs but missing in \.claude\/commands/);
  assert.match(result.stdout, /1 commands checked — 1 error\(s\) — FAILED/);
});

test('reports all descriptions when command twins drift', () => {
  const root = makeSandbox();
  writeClaudeCommand(root, 'review', 'description: Review a change');
  writeTomlCommand(root, path.join('.gemini', 'commands'), 'review', 'description = "Inspect a change"');
  writeTomlCommand(root, 'commands', 'review', 'description = "Audit a change"');

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /\.claude:\s+Review a change/);
  assert.match(result.stdout, /\.gemini:\s+Inspect a change/);
  assert.match(result.stdout, /commands\/:\s+Audit a change/);
});

test('fails with an actionable error for a malformed description', () => {
  const root = makeSandbox();
  writeMatchingCommands(root, 'review', 'Review a change');
  writeFile(
    root,
    path.join('.gemini', 'commands', 'review.toml'),
    'prompt = "Missing description"\n',
  );

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /\.gemini\/commands\/review — missing or malformed description/);
  assert.match(result.stdout, /1 commands checked — 1 error\(s\) — FAILED/);
});

test('parses escaped quotes in double-quoted TOML descriptions', () => {
  const root = makeSandbox();
  writeClaudeCommand(root, 'review', 'description: Review "important" changes');
  writeTomlCommand(
    root,
    path.join('.gemini', 'commands'),
    'review',
    'description = "Review \\"important\\" changes"',
  );
  writeTomlCommand(
    root,
    'commands',
    'review',
    'description = "Review \\"important\\" changes"',
  );

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /1 commands checked — 0 error\(s\) — PASSED/);
});
