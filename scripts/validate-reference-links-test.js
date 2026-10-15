#!/usr/bin/env node

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { afterEach, test } = require('node:test');

const VALIDATOR = path.join(__dirname, 'validate-reference-links.js');
const sandboxes = [];

function makeSandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-skills-validate-reference-links-test-'));
  const scriptsDir = path.join(root, 'scripts');
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.copyFileSync(VALIDATOR, path.join(scriptsDir, 'validate-reference-links.js'));
  fs.mkdirSync(path.join(scriptsDir, 'lib'));
  fs.copyFileSync(path.join(__dirname, 'lib', 'skill-lint.js'), path.join(scriptsDir, 'lib', 'skill-lint.js'));
  sandboxes.push(root);
  return root;
}

function writeFile(root, relativePath, content) {
  const file = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function run(root) {
  return spawnSync(process.execPath, [path.join(root, 'scripts', 'validate-reference-links.js')], {
    cwd: root,
    encoding: 'utf8',
  });
}

afterEach(() => {
  for (const root of sandboxes.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('passes when a skill reaches the shared checklist two levels up', () => {
  const root = makeSandbox();
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
  const root = makeSandbox();
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
  const root = makeSandbox();
  writeFile(root, 'references/definition-of-done.md', '# Definition of Done\n');
  writeFile(root, 'skills/using-agent-skills/SKILL.md', 'See [DoD](references/definition-of-done.md).\n');

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /L1: references\/definition-of-done\.md/);
});

test('passes when a skill colocates its own references directory', () => {
  // CLAUDE.md allows self-contained skills to keep references under
  // skills/<name>/references/. Those links are correct as written.
  const root = makeSandbox();
  writeFile(root, 'skills/dataviz/references/palette.md', '# Palette\n');
  writeFile(root, 'skills/dataviz/SKILL.md', 'See `references/palette.md`.\n');

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /1 skills checked — 0 error\(s\) — PASSED/);
});

test('passes when a skill reference file reaches the shared checklist three levels up', () => {
  // A file under skills/<name>/references/ sits one directory deeper than
  // SKILL.md, so the shared checklists are three levels up from it, not two.
  const root = makeSandbox();
  writeFile(root, 'references/security-checklist.md', '# Security\n');
  writeFile(root, 'skills/hardening/SKILL.md', 'See [patterns](references/patterns.md).\n');
  writeFile(
    root,
    'skills/hardening/references/patterns.md',
    'Shared checklists live in `../../../references/security-checklist.md`.\n'
  );

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /✓ {2}skills\/hardening\/references\/patterns\.md/);
  assert.match(result.stdout, /1 skills checked — 0 error\(s\) — PASSED/);
});

test('fails when a skill reference file links the shared checklist with the SKILL.md prefix', () => {
  // The same off-by-a-level mistake this validator exists to catch, made from
  // inside the skill's references/ directory: the link is resolved from the
  // file that contains it, so `../../` stops at skills/.
  const root = makeSandbox();
  writeFile(root, 'references/security-checklist.md', '# Security\n');
  writeFile(root, 'skills/hardening/SKILL.md', 'See [patterns](references/patterns.md).\n');
  writeFile(
    root,
    'skills/hardening/references/patterns.md',
    ['# Patterns', '', 'See `../../references/security-checklist.md`.', ''].join('\n')
  );

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /✓ {2}skills\/hardening\/SKILL\.md/);
  assert.match(result.stdout, /✗ {2}skills\/hardening\/references\/patterns\.md/);
  assert.match(
    result.stdout,
    /L3: \.\.\/\.\.\/references\/security-checklist\.md — resolves to skills\/references\/security-checklist\.md/
  );
  assert.match(result.stdout, /1 skills checked — 1 error\(s\) — FAILED/);
  assert.match(result.stdout, /use `\.\.\/\.\.\/\.\.\/references\/<file>\.md`/);
});

test('keeps the same narrow rule inside a skill reference file', () => {
  // Same exemptions as SKILL.md: fenced examples, sibling files named without
  // a references/ prefix, and artifacts that do not exist yet.
  const root = makeSandbox();
  writeFile(root, 'references/security-checklist.md', '# Security\n');
  writeFile(root, 'skills/hardening/SKILL.md', 'See [patterns](references/patterns.md).\n');
  writeFile(
    root,
    'skills/hardening/references/patterns.md',
    [
      'Record findings in `SECURITY.md` or `docs/threat-model.md`. See also `other-patterns.md`.',
      '',
      '```markdown',
      '[wrong on purpose](../../references/security-checklist.md)',
      '```',
      '',
    ].join('\n')
  );

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /1 skills checked — 0 error\(s\) — PASSED/);
});

test('counts errors from SKILL.md and its reference files together', () => {
  const root = makeSandbox();
  writeFile(root, 'references/security-checklist.md', '# Security\n');
  writeFile(root, 'skills/hardening/SKILL.md', 'See `references/security-checklist.md`.\n');
  writeFile(root, 'skills/hardening/references/a.md', 'See `../../references/security-checklist.md`.\n');
  writeFile(root, 'skills/hardening/references/b.md', 'See `../../../references/security-checklist.md`.\n');
  writeFile(root, 'skills/hardening/references/notes.txt', 'See ../../references/security-checklist.md\n');

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /✗ {2}skills\/hardening\/references\/a\.md/);
  assert.match(result.stdout, /✓ {2}skills\/hardening\/references\/b\.md/);
  assert.doesNotMatch(result.stdout, /notes\.txt/);
  assert.match(result.stdout, /1 skills checked — 2 error\(s\) — FAILED/);
});

test('fails when a link points at a checklist that no longer exists', () => {
  const root = makeSandbox();
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
  const root = makeSandbox();
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
  const root = makeSandbox();
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

test('a link inside a fenced block is an example, not a link to resolve', () => {
  const root = makeSandbox();
  writeFile(root, 'references/definition-of-done.md', '# DoD\n');
  writeFile(
    root,
    'skills/using-agent-skills/SKILL.md',
    [
      'Shared checklists live two levels up:',
      '',
      'See `../../references/definition-of-done.md`.',
      '',
      'Do not write it this way:',
      '',
      '```markdown',
      '[Definition of Done](references/definition-of-done.md)',
      '```',
      '',
    ].join('\n')
  );

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /1 skills checked — 0 error\(s\) — PASSED/);
});

test('fence exemption follows CommonMark rather than a bare ``` match', () => {
  const root = makeSandbox();
  writeFile(
    root,
    'skills/using-agent-skills/SKILL.md',
    [
      '~~~markdown',
      '[a](references/missing-a.md)',
      '```',                                  // wrong marker: must not close the ~~~ block
      '[b](references/missing-b.md)',
      '~~~',
      '',
      '   ```markdown',                       // three-space indent is still a fence
      '[c](references/missing-c.md)',
      '   `````',                             // a longer closer is legal
      '',
    ].join('\n')
  );

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /0 error\(s\) — PASSED/);
});

test('a real broken link outside any fence is still reported', () => {
  const root = makeSandbox();
  writeFile(
    root,
    'skills/using-agent-skills/SKILL.md',
    [
      '```markdown',
      '[shown as an example](references/example-only.md)',
      '```',
      '',
      'See `references/definition-of-done.md`.',   // genuinely wrong, outside the fence
      '',
    ].join('\n')
  );

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /1 skills checked — 1 error\(s\) — FAILED/);
  assert.match(result.stdout, /L5: references\/definition-of-done\.md/);
});

for (const [ending, newline] of [['LF', '\n'], ['CRLF', '\r\n']]) {
  test(`inline backticks do not hide subsequent broken links (${ending})`, () => {
    const root = makeSandbox();
    writeFile(root, 'skills/example/SKILL.md', [
      '```js``` is inline code, not a fence opener.',
      'See [missing](references/missing.md).',
      '',
    ].join(newline));

    const result = run(root);

    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stdout, /L2: references\/missing\.md/);
    assert.match(result.stdout, /1 skills checked — 1 error\(s\) — FAILED/);
  });

  for (const marker of ['```', '~~~']) {
    test(`trailing text does not close a ${marker} fence (${ending})`, () => {
      const root = makeSandbox();
      writeFile(root, 'skills/example/SKILL.md', [
        marker + 'markdown',
        marker + ' still part of the example',
        '[example](references/example-only.md)',
        marker + ' \t',
        '[real link](references/missing.md)',
        '',
      ].join(newline));

      const result = run(root);

      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stdout, /L5: references\/missing\.md/);
      assert.match(result.stdout, /1 skills checked — 1 error\(s\) — FAILED/);
      assert.doesNotMatch(result.stdout, /example-only\.md/);
    });
  }
}

test('tilde fence info strings may contain backticks', () => {
  const root = makeSandbox();
  writeFile(root, 'skills/example/SKILL.md', [
    '~~~example `code`',
    '[example](references/example-only.md)',
    '~~~',
    '',
  ].join('\n'));

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /1 skills checked — 0 error\(s\) — PASSED/);
});

// Anchors. A `#fragment` after a references/ link must match a heading in the
// target file, slugged the way GitHub does it. Without this, renaming a heading
// silently breaks every link to it while the file itself still exists.

function hardeningSkill(root, link) {
  writeFile(root, 'skills/hardening/SKILL.md', `See [patterns](${link}).\n`);
}

test('passes when an anchor matches a heading in the target file', () => {
  const root = makeSandbox();
  hardeningSkill(root, 'references/patterns.md#cross-site-scripting-xss');
  writeFile(root, 'skills/hardening/references/patterns.md', '# Patterns\n\n## Cross-Site Scripting (XSS)\n');

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /1 skills checked — 0 error\(s\) — PASSED/);
});

test('fails when an anchor matches no heading in the target file', () => {
  // The file exists, so the existing check is satisfied; only the fragment is stale.
  const root = makeSandbox();
  hardeningSkill(root, 'references/patterns.md#injection');
  writeFile(root, 'skills/hardening/references/patterns.md', '# Patterns\n\n## Injection attacks\n');

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(
    result.stdout,
    /L1: references\/patterns\.md#injection — no heading in skills\/hardening\/references\/patterns\.md produces #injection/
  );
  assert.match(result.stdout, /1 skills checked — 1 error\(s\) — FAILED/);
  assert.match(result.stdout, /GitHub's heading slugs/);
  // The path was right, so the path hint would only mislead.
  assert.doesNotMatch(result.stdout, /use `\.\.\/\.\.\/references/);
});

test('a repeated heading gets a -1 suffix, as on GitHub', () => {
  const root = makeSandbox();
  writeFile(root, 'skills/hardening/SKILL.md', [
    'See [first](references/patterns.md#example).',
    'See [second](references/patterns.md#example-1).',
    'See [third](references/patterns.md#example-2).',
    '',
  ].join('\n'));
  writeFile(root, 'skills/hardening/references/patterns.md', '## Example\n\n## Example\n');

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /L3: references\/patterns\.md#example-2 — no heading/);
  assert.doesNotMatch(result.stdout, /L[12]:/);
  assert.match(result.stdout, /1 skills checked — 1 error\(s\) — FAILED/);
});

test('slugs come from the rendered heading text, not its markdown', () => {
  // Real headings in the pack carry emphasis, code spans and links.
  const root = makeSandbox();
  writeFile(root, 'skills/hardening/SKILL.md', [
    'See [a](references/patterns.md#why-this-is-not-a-ship-job).',
    'See [b](references/patterns.md#owasp-top-10).',
    'See [c](references/patterns.md#snake_case-names-stay).',
    'See [d](references/patterns.md#closing-hashes).',
    '',
  ].join('\n'));
  writeFile(root, 'skills/hardening/references/patterns.md', [
    '### Why this is *not* a `/ship` job',
    '## [OWASP](https://owasp.org/Top10/) Top 10',
    '## snake_case names stay',
    '## Closing hashes ##',
    '',
  ].join('\n'));

  const result = run(root);

  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('a heading-like line inside a fenced block is not an anchor', () => {
  // Bash comments in a fenced example look like H1s.
  const root = makeSandbox();
  hardeningSkill(root, 'references/patterns.md#chrome-devtools');
  writeFile(root, 'skills/hardening/references/patterns.md', [
    '# Patterns',
    '',
    '```bash',
    '# Chrome DevTools',
    '```',
    '',
  ].join('\n'));

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /#chrome-devtools — no heading/);
});

test('anchors resolve from a reference file to a shared checklist', () => {
  const root = makeSandbox();
  writeFile(root, 'references/security-checklist.md', '# Security\n\n## OWASP Top 10 Quick Reference\n');
  hardeningSkill(root, 'references/patterns.md');
  writeFile(root, 'skills/hardening/references/patterns.md', [
    'See `../../../references/security-checklist.md#owasp-top-10-quick-reference`.',
    'See `../../../references/security-checklist.md#destructive-path-operations`.',
    '',
  ].join('\n'));

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /✗ {2}skills\/hardening\/references\/patterns\.md/);
  assert.match(result.stdout, /L2: \.\.\/\.\.\/\.\.\/references\/security-checklist\.md#destructive-path-operations — no heading in references\/security-checklist\.md/);
  assert.doesNotMatch(result.stdout, /L1:/);
});

test('a missing file is reported once, not again for its anchor', () => {
  const root = makeSandbox();
  hardeningSkill(root, 'references/renamed.md#injection');

  const result = run(root);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /L1: references\/renamed\.md — resolves to skills\/hardening\/references\/renamed\.md, which does not exist/);
  assert.match(result.stdout, /1 skills checked — 1 error\(s\) — FAILED/);
});


test('heading slugs remain unique when a literal suffix collides with an allocated slug', () => {
  const root = makeSandbox();
  hardeningSkill(root, 'references/patterns.md#example-1-1');
  // A hyphen in the literal heading makes its base slug collide with Example's suffix.
  writeFile(root, 'skills/hardening/references/patterns.md', '## Example\n\n## Example\n\n## Example-1\n');
  const result = run(root);
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('a duplicate skips a slug occupied by an earlier literal heading', () => {
  const root = makeSandbox();
  hardeningSkill(root, 'references/patterns.md#example-2');
  writeFile(root, 'skills/hardening/references/patterns.md', '## Example\n\n## Example-1\n\n## Example\n');
  const result = run(root);
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
