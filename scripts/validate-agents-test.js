#!/usr/bin/env node

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { afterEach, test } = require('node:test');

const VALIDATOR  = path.join(__dirname, 'validate-agents.js');
// The validator reuses the frontmatter parsing and YAML-validity rules from
// the skill linter, so the sandbox needs the lib alongside it.
const SKILL_LINT = path.join(__dirname, 'lib', 'skill-lint.js');
const sandboxes = [];

function makeSandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-skills-validate-agents-test-'));
  const scriptsDir = path.join(root, 'scripts');
  fs.mkdirSync(path.join(scriptsDir, 'lib'), { recursive: true });
  fs.copyFileSync(VALIDATOR, path.join(scriptsDir, 'validate-agents.js'));
  fs.copyFileSync(SKILL_LINT, path.join(scriptsDir, 'lib', 'skill-lint.js'));
  sandboxes.push(root);
  return root;
}

function writeFile(root, relativePath, content) {
  const file = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

/** A persona that satisfies every rule; callers override pieces to break one. */
function persona({ name = 'code-reviewer', frontmatter, body } = {}) {
  const fm = frontmatter ?? [
    '---',
    `name: ${name}`,
    'description: Reviews changes across five axes. Use before merging.',
    '---',
  ].join('\n');
  const text = body ?? [
    '# Persona',
    '',
    'You are a reviewer.',
    '',
    '## Rules',
    '',
    '1. Be precise.',
    '',
    '## Composition',
    '',
    '- **Invoke directly when:** asked to review.',
    '- **Invoke via:** `/ship`.',
    '- **Do not invoke from another persona.**',
    '',
  ].join('\n');
  return `${fm}\n\n${text}`;
}

function writePersona(root, name, overrides = {}) {
  writeFile(root, `agents/${name}.md`, persona({ name, ...overrides }));
}

function run(root) {
  return spawnSync(process.execPath, [path.join(root, 'scripts', 'validate-agents.js')], {
    cwd: root,
    encoding: 'utf8',
  });
}

afterEach(() => {
  for (const root of sandboxes.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// ─── Per-file contract ───────────────────────────────────────────────────────

test('a conforming persona passes', () => {
  const root = makeSandbox();
  writePersona(root, 'code-reviewer');

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /✓ {2}agents\/code-reviewer\.md/);
  assert.match(result.stdout, /1 personas checked, 0 spawn reference\(s\).* — 0 error\(s\) — PASSED/);
});

test('fails when the frontmatter name disagrees with the file name', () => {
  const root = makeSandbox();
  writeFile(root, 'agents/code-reviewer.md', persona({ name: 'reviewer' }));

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /name 'reviewer' does not match file name 'code-reviewer'/);
  assert.match(result.stdout, /subagent_type/);
});

test('fails when description is missing', () => {
  const root = makeSandbox();
  writePersona(root, 'code-reviewer', { frontmatter: '---\nname: code-reviewer\n---' });

  const result = run(root);

  assert.equal(result.status, 1);
  assert.match(result.stdout, /missing required field: 'description'/);
});

test('fails on frontmatter that a host would reject as invalid YAML', () => {
  const root = makeSandbox();
  writePersona(root, 'code-reviewer', {
    frontmatter: '---\nname: code-reviewer\ndescription: Reviews: everything. Use before merging.\n---',
  });

  const result = run(root);

  assert.equal(result.status, 1);
  assert.match(result.stdout, /Frontmatter line/);
});

for (const field of ['hooks', 'mcpServers', 'permissionMode']) {
  test(`fails on the silently ignored '${field}' field and names it`, () => {
    const root = makeSandbox();
    writePersona(root, 'code-reviewer', {
      frontmatter: `---\nname: code-reviewer\ndescription: Reviews changes. Use before merging.\n${field}: something\n---`,
    });

    const result = run(root);

    assert.equal(result.status, 1);
    assert.match(result.stdout, new RegExp(`field '${field}' is silently ignored`));
  });
}

test('fails when the Composition section is missing', () => {
  const root = makeSandbox();
  writePersona(root, 'code-reviewer', { body: '# Persona\n\n## Rules\n\n1. Be precise.\n' });

  const result = run(root);

  assert.equal(result.status, 1);
  assert.match(result.stdout, /Missing "## Composition" section/);
});

test('fails when Composition is not the last section', () => {
  const root = makeSandbox();
  writePersona(root, 'code-reviewer', {
    body: '# Persona\n\n## Composition\n\n- **Invoke via:** `/ship`.\n\n## Output Format\n\nA report.\n',
  });

  const result = run(root);

  assert.equal(result.status, 1);
  assert.match(result.stdout, /must be the last section, but "## Output Format" follows it/);
});

test('fails when agents/ has no persona files', () => {
  const root = makeSandbox();
  fs.mkdirSync(path.join(root, 'agents'));

  const result = run(root);

  assert.equal(result.status, 1);
  assert.match(result.stdout, /no persona files found/);
});

// ─── Listings ────────────────────────────────────────────────────────────────

test('fails when a persona is missing from the docs/agents.md and README tables', () => {
  const root = makeSandbox();
  writePersona(root, 'code-reviewer');
  writePersona(root, 'test-engineer');
  writeFile(root, 'docs/agents.md', '# Personas\n\n| Persona | Role |\n|---|---|\n| [code-reviewer](../agents/code-reviewer.md) | Reviewer |\n');
  writeFile(root, 'README.md', '## Personas\n\n| Persona | Role |\n|---|---|\n| [code-reviewer](agents/code-reviewer.md) | Reviewer |\n');

  const result = run(root);

  assert.equal(result.status, 1);
  assert.match(result.stdout, /docs\/agents\.md: persona 'test-engineer' is not listed/);
  assert.match(result.stdout, /README\.md: persona 'test-engineer' is not listed/);
  assert.doesNotMatch(result.stdout, /persona 'code-reviewer' is not listed/);
  assert.match(result.stdout, /2 error\(s\) — FAILED/);
});

test('listing files that do not exist are skipped, not failed', () => {
  const root = makeSandbox();
  writePersona(root, 'code-reviewer');

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
});

// ─── Spawn references ────────────────────────────────────────────────────────

test('resolves every phrasing a command uses to spawn a persona', () => {
  const root = makeSandbox();
  writePersona(root, 'code-reviewer');
  writePersona(root, 'security-auditor');
  writePersona(root, 'web-performance-auditor');
  writeFile(root, '.claude/commands/ship.md', [
    '---', 'description: Ship it', '---', '',
    'Spawn three subagents. Each call passes `subagent_type` matching the persona name:',
    '',
    '1. **`code-reviewer`** — review.',
    '2. **`security-auditor`** — audit.',
    '',
  ].join('\n'));
  writeFile(root, '.claude/commands/webperf.md', '---\ndescription: Audit\n---\n\nSpawn the `web-performance-auditor` subagent. Pass it the URL.\n');
  writeFile(root, 'commands/webperf.toml', 'description = "Audit"\nprompt = """\nRun the `web-performance-auditor` persona on the page.\n"""\n');

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /4 spawn reference\(s\) in commands \(3 distinct persona\(s\)\)/);
});

test('fails with file and line when a command spawns a persona that does not exist', () => {
  const root = makeSandbox();
  writePersona(root, 'code-reviewer');
  writeFile(root, '.claude/commands/ship.md', '---\ndescription: Ship it\n---\n\nFan out:\n\n1. **`code-reviewer`** — review.\n2. **`accessibility-auditor`** — a11y.\n');

  const result = run(root);

  assert.equal(result.status, 1);
  assert.match(result.stdout, /\.claude\/commands\/ship\.md: L8 spawns 'accessibility-auditor' but agents\/accessibility-auditor\.md does not exist/);
});

test('a backticked name that is not a spawn is not treated as a persona reference', () => {
  const root = makeSandbox();
  writePersona(root, 'code-reviewer');
  writeFile(root, '.claude/commands/review.md', '---\ndescription: Review\n---\n\nInvoke the `code-review-and-quality` skill, then read `tasks/plan.md`.\n');

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /0 spawn reference\(s\)/);
});
