#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  buildAnchorSet,
  extractDestinations,
  githubSlug,
  stripCode,
  validateDocuments,
} = require('./lib/markdown-link-lint');

const CLI_PATH = path.join(__dirname, 'validate-links.js');

function makeRepository(t, files, tracked = Object.keys(files)) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-skills-link-test-'));
  t.after(() => fs.rmSync(root, { force: true, recursive: true }));

  execFileSync('git', ['init', '--quiet'], { cwd: root });
  execFileSync('git', ['config', 'core.autocrlf', 'false'], { cwd: root });
  for (const [filePath, content] of Object.entries(files)) {
    const absolutePath = path.join(root, filePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content, 'utf8');
  }
  if (tracked.length > 0) {
    execFileSync('git', ['add', '--', ...tracked], { cwd: root });
  }
  return root;
}

function runCli(cwd) {
  return spawnSync(process.execPath, [CLI_PATH], {
    cwd,
    encoding: 'utf8',
  });
}

test('extracts inline and reference destinations with source lines', () => {
  const markdown = [
    '# Install & Run',
    '## Repeat',
    '## Repeat',
    '[guide](docs/guide.md#usage)',
    '[reference][guide]',
    '[guide]: docs/guide.md#usage',
    '![ignored](missing.png)',
    '`[inline](missing.md)`',
  ].join('\n');

  assert.deepEqual(extractDestinations(markdown), [
    { destination: 'docs/guide.md#usage', line: 4 },
    { destination: 'docs/guide.md#usage', line: 6 },
  ]);
});

test('ignores links inside fenced and inline code', () => {
  const markdown = [
    '[kept](docs/guide.md)',
    '```markdown',
    '[fenced](missing.md)',
    '```',
    '~~~',
    '[also-fenced](missing.md)',
    '~~~',
    '`[inline](missing.md)`',
  ].join('\n');

  assert.deepEqual(extractDestinations(markdown), [
    { destination: 'docs/guide.md', line: 1 },
  ]);
  assert.equal(stripCode(markdown).split('\n').length, markdown.split('\n').length);
});

test('ignores multiline code spans, shorter backticks, and fence-like content', () => {
  const markdown = [
    '```markdown',
    '```still code',
    '[fenced](missing.md)',
    '```',
    '`multiline',
    '[single](missing.md)',
    'code`',
    '``multiline with ` inner',
    '[double](missing.md)',
    'code``',
    '[kept](docs/guide.md)',
  ].join('\n');

  assert.deepEqual(extractDestinations(markdown), [
    { destination: 'docs/guide.md', line: 11 },
  ]);
});

test('ignores reference definitions used only by images', () => {
  const markdown = [
    '![logo][brand]',
    '[brand]: missing.png',
    '[guide][docs]',
    '[docs]: docs/guide.md',
  ].join('\n');

  assert.deepEqual(extractDestinations(markdown), [
    { destination: 'docs/guide.md', line: 4 },
  ]);
});

test('ignores escaped and unbalanced link-like text', () => {
  const markdown = [
    'not a link](missing.md)',
    '\\[literal](missing.md)',
    '[unfinished](missing.md',
    '[unfinished](<missing.md>',
    '[kept](docs/guide.md)',
  ].join('\n');

  assert.deepEqual(extractDestinations(markdown), [
    { destination: 'docs/guide.md', line: 5 },
  ]);
});

test('builds GitHub-style heading and explicit HTML anchors', () => {
  const markdown = [
    '# Install & Run',
    '## Repeat',
    '## Repeat',
    '## Repeat',
    '<a id="manual-anchor"></a>',
    '<span name="legacy-anchor"></span>',
  ].join('\n');

  assert.equal(githubSlug('Install & Run'), 'install--run');
  assert.deepEqual([...buildAnchorSet(markdown)], [
    'install--run',
    'repeat',
    'repeat-1',
    'repeat-2',
    'manual-anchor',
    'legacy-anchor',
  ]);
});

test('preserves inline code, supports Setext headings, and keeps slugs unique', () => {
  const markdown = [
    '# Use `npm test` now',
    'Setext Title',
    '============',
    '# foo',
    '# foo-1',
    '# foo',
  ].join('\n');

  assert.deepEqual([...buildAnchorSet(markdown)], [
    'use-npm-test-now',
    'setext-title',
    'foo',
    'foo-1',
    'foo-2',
  ]);
});

test('validates files, directories, encoded paths, and local fragments', () => {
  const root = path.resolve('fixture-repository');
  const documents = new Map([
    [
      'README.md',
      [
        '# Home',
        '[guide](docs/guide.md#usage)',
        '[guide query](docs/guide.md?plain=1#usage)',
        '[space](docs/My%20Guide.md#hello-world)',
        '[same document](#home)',
        '[directory](docs/)',
        '[escaped](docs/foo\\(bar\\).md)',
      ].join('\n'),
    ],
    ['docs/guide.md', '# Usage'],
    ['docs/My Guide.md', '# Hello World'],
    ['docs/foo(bar).md', '# Parentheses'],
  ]);
  const existingPaths = new Set([
    'README.md',
    'docs',
    'docs/guide.md',
    'docs/My Guide.md',
    'docs/foo(bar).md',
  ]);

  assert.deepEqual(
    validateDocuments(root, documents, existingPaths),
    [],
  );
});

test('reports missing paths and fragments with stable diagnostics', () => {
  const root = path.resolve('fixture-repository');
  const documents = new Map([
    [
      'README.md',
      [
        '[missing](docs/missing.md)',
        '[missing fragment](docs/guide.md#absent)',
        '[non-Markdown fragment](docs/guide.txt#usage)',
        '[invalid encoding](docs/%E0%A4%A.md)',
        '[escape](../../outside.md)',
      ].join('\n'),
    ],
    ['docs/guide.md', '# Usage'],
  ]);
  const existingPaths = new Set([
    'README.md',
    'docs',
    'docs/guide.md',
    'docs/guide.txt',
  ]);

  assert.deepEqual(validateDocuments(root, documents, existingPaths), [
    {
      destination: 'docs/missing.md',
      line: 1,
      reason: 'target does not exist: docs/missing.md',
      source: 'README.md',
    },
    {
      destination: 'docs/guide.md#absent',
      line: 2,
      reason: 'fragment not found in docs/guide.md: #absent',
      source: 'README.md',
    },
    {
      destination: 'docs/guide.txt#usage',
      line: 3,
      reason: 'cannot validate fragment on non-Markdown target: docs/guide.txt',
      source: 'README.md',
    },
    {
      destination: 'docs/%E0%A4%A.md',
      line: 4,
      reason: 'invalid percent encoding',
      source: 'README.md',
    },
    {
      destination: '../../outside.md',
      line: 5,
      reason: 'target escapes repository root',
      source: 'README.md',
    },
  ]);
});

test('accepts duplicate and explicit anchors but rejects malformed fragments', () => {
  const root = path.resolve('fixture-repository');
  const documents = new Map([
    [
      'README.md',
      [
        '[duplicate](guide.md#repeat-1)',
        '[manual](guide.md#manual-anchor)',
        '[encoded](guide.md#%68ello-world)',
        '[bad](guide.md#%E0%A4%A)',
      ].join('\n'),
    ],
    [
      'guide.md',
      [
        '# Repeat',
        '# Repeat',
        '# Hello world',
        '<a id="manual-anchor"></a>',
      ].join('\n'),
    ],
  ]);

  assert.deepEqual(validateDocuments(root, documents), [
    {
      destination: 'guide.md#%E0%A4%A',
      line: 4,
      reason: 'invalid percent encoding',
      source: 'README.md',
    },
  ]);
});

test('CLI scans tracked Markdown and ignores untracked files', (t) => {
  const root = makeRepository(t, {
    'README.md': '[guide](docs/guide.md#usage)',
    'docs/guide.md': '# Usage',
    'untracked.md': '[broken](missing.md)',
  }, ['README.md', 'docs/guide.md']);

  const result = runCli(root);

  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /2 Markdown files checked — 0 broken local link\(s\) — PASSED/,
  );
  assert.equal(result.stderr, '');
});

test('CLI returns one and prints stable source diagnostics for broken links', (t) => {
  const root = makeRepository(t, {
    'README.md': [
      '# Home',
      '[missing](docs/missing.md)',
      '[fragment](README.md#absent)',
    ].join('\n'),
  });

  const result = runCli(root);

  assert.equal(result.status, 1);
  assert.match(
    result.stdout,
    /README\.md:2: broken local link 'docs\/missing\.md' — target does not exist: docs\/missing\.md/,
  );
  assert.match(
    result.stdout,
    /README\.md:3: broken local link 'README\.md#absent' — fragment not found in README\.md: #absent/,
  );
  assert.match(result.stdout, /1 Markdown files checked — 2 broken local link\(s\) — FAILED/);
  assert.equal(result.stderr, '');
});

test('CLI reports Git inventory failures without a stack trace', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-skills-link-no-git-'));
  t.after(() => fs.rmSync(root, { force: true, recursive: true }));

  const result = runCli(root);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /^ERROR: validate-links failed unexpectedly: /);
  assert.doesNotMatch(result.stderr, /\n\s+at /);
});

test('CLI sorts diagnostics by locale-independent code-unit order', (t) => {
  const root = makeRepository(t, {
    'z.md': '[broken](missing-z.md)',
    'ä.md': '[broken](missing-a.md)',
  });

  const result = runCli(root);

  assert.equal(result.status, 1);
  assert.ok(
    result.stdout.indexOf('z.md:1:') < result.stdout.indexOf('ä.md:1:'),
    result.stdout,
  );
});
