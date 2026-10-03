#!/usr/bin/env node

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { afterEach, test } = require('node:test');

const VALIDATOR = path.join(__dirname, 'validate-commands.js');
// The validator shares the frontmatter-validity rules with validate-skills, so
// the sandbox needs the lib alongside it, not just the script.
const SKILL_LINT = path.join(__dirname, 'lib', 'skill-lint.js');
const sandboxes = [];

function makeSandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-skills-validate-commands-test-'));
  const scriptsDir = path.join(root, 'scripts');
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.copyFileSync(VALIDATOR, path.join(scriptsDir, 'validate-commands.js'));
  fs.mkdirSync(path.join(scriptsDir, 'lib'), { recursive: true });
  fs.copyFileSync(SKILL_LINT, path.join(scriptsDir, 'lib', 'skill-lint.js'));
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

test('rejects commands that shadow Claude Code built-ins', () => {
  const root = makeSandbox();
  writeMatchingCommands(root, 'review', 'Review a change');

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /review: conflicts with a Claude Code built-in command/);
});

test('fails when a Claude command is missing a TOML twin', () => {
  const root = makeSandbox();
  const description = 'Review a change';
  writeClaudeCommand(root, 'audit', `description: ${description}`);
  writeTomlCommand(root, path.join('.gemini', 'commands'), 'audit', `description = "${description}"`);

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /audit .* missing in: commands/);
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
  writeClaudeCommand(root, 'audit', 'description: Review a change');
  writeTomlCommand(root, path.join('.gemini', 'commands'), 'audit', 'description = "Inspect a change"');
  writeTomlCommand(root, 'commands', 'audit', 'description = "Audit a change"');

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /\.claude:\s+Review a change/);
  assert.match(result.stdout, /\.gemini:\s+Inspect a change/);
  assert.match(result.stdout, /commands\/:\s+Audit a change/);
});

test('fails with an actionable error for a malformed description', () => {
  const root = makeSandbox();
  writeMatchingCommands(root, 'audit', 'Review a change');
  writeFile(
    root,
    path.join('.gemini', 'commands', 'audit.toml'),
    'prompt = "Missing description"\n',
  );

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /\.gemini\/commands\/audit .* missing or malformed description/);
  assert.match(result.stdout, /1 commands checked — 1 error\(s\) — FAILED/);
});

test('parses escaped quotes in double-quoted TOML descriptions', () => {
  const root = makeSandbox();
  writeClaudeCommand(root, 'audit', 'description: Review "important" changes');
  writeTomlCommand(
    root,
    path.join('.gemini', 'commands'),
    'audit',
    'description = "Review \\"important\\" changes"',
  );
  writeTomlCommand(
    root,
    'commands',
    'audit',
    'description = "Review \\"important\\" changes"',
  );

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /1 commands checked — 0 error\(s\) — PASSED/);
});

// Claude parses a command's frontmatter as YAML when the command is loaded, and
// `descriptionFromMd` splits each line on its first colon — so a command whose
// frontmatter is not valid YAML passed every check here. Same class as the
// SKILL.md gap, on the other set of files the #494 thread checked by hand.

test('a command whose frontmatter is valid YAML passes', () => {
  const root = makeSandbox();
  writeMatchingCommands(root, 'build', 'Build the thing');
  const result = run(root);
  assert.equal(result.status, 0, result.stdout);
  assert.match(result.stdout, /Checking Claude command frontmatter/);
});

test('an unquoted colon in a command description is rejected', () => {
  const root = makeSandbox();
  // Valid to the splitter, rejected by a real YAML parser: it reads a nested
  // mapping. The TOML siblings keep the same text so only the .md is at fault.
  writeClaudeCommand(root, 'build', 'description: Build the thing: quickly');
  writeTomlCommand(root, path.join('.gemini', 'commands'), 'build', 'description = "Build the thing: quickly"');
  writeTomlCommand(root, 'commands', 'build', 'description = "Build the thing: quickly"');

  const result = run(root);
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stdout, /unquoted value containing/);
});

test('quoting the same description makes it pass', () => {
  const root = makeSandbox();
  writeClaudeCommand(root, 'build', 'description: "Build the thing: quickly"');
  writeTomlCommand(root, path.join('.gemini', 'commands'), 'build', 'description = "Build the thing: quickly"');
  writeTomlCommand(root, 'commands', 'build', 'description = "Build the thing: quickly"');

  const result = run(root);
  assert.equal(result.status, 0, result.stdout);
});

test('a tab-indented command frontmatter is rejected', () => {
  const root = makeSandbox();
  writeFile(
    root,
    path.join('.claude', 'commands', 'build.md'),
    '---\ndescription: Build the thing\nmeta:\n\tlevel: core\n---\n\n# Command\n',
  );
  writeTomlCommand(root, path.join('.gemini', 'commands'), 'build', 'description = "Build the thing"');
  writeTomlCommand(root, 'commands', 'build', 'description = "Build the thing"');

  const result = run(root);
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stdout, /indents with a tab/);
});

test('the TOML directories are not put through the YAML rules', () => {
  const root = makeSandbox();
  // A TOML description legitimately carries a colon. Running the YAML rules over
  // these files would fail every command that has one.
  writeMatchingCommands(root, 'build', 'Build the thing quickly');
  const result = run(root);
  assert.equal(result.status, 0, result.stdout);
  assert.doesNotMatch(result.stdout, /\.gemini.*unquoted value/);
});
