#!/usr/bin/env node

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { afterEach, test } = require('node:test');

const SCRIPT = path.join(__dirname, 'sync-catalog.js');
const LINT   = path.join(__dirname, 'lib', 'skill-lint.js');
const META   = 'skills/using-agent-skills/SKILL.md';
const sandboxes = [];

// A three-skill stand-in for the real catalog: the meta-skill plus two
// lifecycle skills, enough to exercise phase grouping and the Meta exclusion.
const FIXTURE_CATALOG = {
  phases: [
    { name: 'Meta', heading: 'Meta - Discover which skill applies' },
    { name: 'Build', heading: 'Build - Write the code' },
  ],
  skills: [
    { name: 'using-agent-skills', phase: 'Meta', does: 'Routes work', when: 'Starting a session' },
    { name: 'alpha-skill', phase: 'Build', does: 'Does alpha', when: 'Building alpha', summary: 'Alpha, briefly' },
    { name: 'beta-skill', phase: 'Build', does: 'Does beta', when: 'Building beta', summary: 'Beta, briefly' },
  ],
};

function writeFile(root, relativePath, content) {
  const file = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function writeSkill(root, name) {
  writeFile(
    root,
    `skills/${name}/SKILL.md`,
    `---\nname: ${name}\ndescription: Does things. Use when testing.\n---\n\n# ${name}\n`
  );
}

function writeCatalog(root, catalog) {
  writeFile(root, 'scripts/catalog.json', JSON.stringify(catalog, null, 2) + '\n');
}

/**
 * A sandbox repo whose generated regions are already in sync, so each test can
 * introduce exactly one kind of drift.
 */
function makeSandbox({ catalog = FIXTURE_CATALOG, treeSkills = null } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-skills-sync-catalog-test-'));
  sandboxes.push(root);

  fs.mkdirSync(path.join(root, 'scripts', 'lib'), { recursive: true });
  fs.copyFileSync(SCRIPT, path.join(root, 'scripts', 'sync-catalog.js'));
  fs.copyFileSync(LINT, path.join(root, 'scripts', 'lib', 'skill-lint.js'));

  writeCatalog(root, catalog);
  for (const skill of catalog.skills) writeSkill(root, skill.name);

  const treeNames = treeSkills || catalog.skills.map(skill => skill.name);
  const tree = treeNames.map((name, i) => `│   ${i === treeNames.length - 1 ? '└──' : '├──'} ${name}/`);

  writeFile(root, 'README.md', [
    '# Fixture',
    '',
    'Prose above the catalog that must survive regeneration.',
    '',
    '## All Skills',
    '',
    '<!-- catalog:start:skill-counts -->',
    '',
    'The pack includes 3 skills total — 2 lifecycle skills plus the `using-agent-skills` meta-skill.',
    '',
    '<!-- catalog:end:skill-counts -->',
    '',
    '<!-- catalog:start:skills-table -->',
    '',
    '### Meta - Discover which skill applies',
    '',
    '| Skill | What It Does | Use When |',
    '|-------|-------------|----------|',
    '| [using-agent-skills](skills/using-agent-skills/SKILL.md) | Routes work | Starting a session |',
    '',
    '### Build - Write the code',
    '',
    '| Skill | What It Does | Use When |',
    '|-------|-------------|----------|',
    '| [alpha-skill](skills/alpha-skill/SKILL.md) | Does alpha | Building alpha |',
    '| [beta-skill](skills/beta-skill/SKILL.md) | Does beta | Building beta |',
    '',
    '<!-- catalog:end:skills-table -->',
    '',
    'Prose below the catalog that must survive regeneration.',
    '',
    '## Project Structure',
    '',
    '```',
    'agent-skills/',
    '├── skills/                            # every skill (lifecycle + meta)',
    ...tree,
    '├── agents/                            # personas',
    '```',
    '',
  ].join('\n'));

  writeFile(root, 'CLAUDE.md', [
    '# Fixture',
    '',
    '## Skills by Phase',
    '',
    '<!-- catalog:start:skills-by-phase -->',
    '',
    '**Build:** alpha-skill, beta-skill',
    '',
    '<!-- catalog:end:skills-by-phase -->',
    '',
    '## Conventions',
    '',
  ].join('\n'));

  writeFile(root, META, [
    '---',
    'name: using-agent-skills',
    'description: Routes work. Use when starting a session.',
    '---',
    '',
    '## Skill Discovery',
    '',
    '```',
    'Task arrives',
    '    │',
    '    ├── Building alpha? ───→ alpha-skill',
    '    └── Building beta? ────→ beta-skill',
    '```',
    '',
    '## Quick Reference',
    '',
    '<!-- catalog:start:quick-reference -->',
    '',
    '| Phase | Skill | One-Line Summary |',
    '|-------|-------|-----------------|',
    '| Build | alpha-skill | Alpha, briefly |',
    '| Build | beta-skill | Beta, briefly |',
    '',
    '<!-- catalog:end:quick-reference -->',
    '',
  ].join('\n'));

  writeFile(root, '.github/ISSUE_TEMPLATE/skill-gap.yml', [
    'body:',
    '  - type: dropdown',
    '    attributes:',
    '      options:',
    '        # catalog:start:skill-options',
    '        - alpha-skill',
    '        - beta-skill',
    '        - using-agent-skills',
    '        # catalog:end:skill-options',
    '        - other / not sure',
    '',
  ].join('\n'));

  return root;
}

function run(root, ...args) {
  return spawnSync(process.execPath, [path.join(root, 'scripts', 'sync-catalog.js'), ...args], {
    cwd: root,
    encoding: 'utf8',
  });
}

const read = (root, relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const TARGET_FILES = ['README.md', 'CLAUDE.md', META, '.github/ISSUE_TEMPLATE/skill-gap.yml'];
const snapshot = root => Object.fromEntries(TARGET_FILES.map(file => [file, read(root, file)]));

afterEach(() => {
  for (const root of sandboxes.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('passes when every generated region and checked listing is in sync', () => {
  const root = makeSandbox();

  const result = run(root, '--check');

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /3 skills — 0 region\(s\) out of date — 0 listing error\(s\) — PASSED/);
});

test('--check reports drift without touching any file', () => {
  const root = makeSandbox();
  const before = snapshot(root);
  writeFile(
    root,
    'CLAUDE.md',
    read(root, 'CLAUDE.md').replace('**Build:** alpha-skill, beta-skill', '**Build:** alpha-skill')
  );
  const drifted = read(root, 'CLAUDE.md');

  const result = run(root, '--check');

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /CLAUDE\.md \[skills-by-phase\] — out of date/);
  assert.match(result.stdout, /--write/);
  assert.equal(read(root, 'CLAUDE.md'), drifted, '--check must not rewrite the file');
  for (const file of TARGET_FILES.filter(name => name !== 'CLAUDE.md')) {
    assert.equal(read(root, file), before[file], `${file} must be untouched`);
  }
});

test('--write repairs drift, leaves surrounding prose alone, and is idempotent', () => {
  const root = makeSandbox();
  const before = snapshot(root);
  writeFile(
    root,
    'CLAUDE.md',
    read(root, 'CLAUDE.md').replace('**Build:** alpha-skill, beta-skill', '**Build:** stale-skill')
  );

  const written = run(root, '--write');
  assert.equal(written.status, 0, written.stdout + written.stderr);
  assert.match(written.stdout, /CLAUDE\.md \[skills-by-phase\] — updated/);
  assert.equal(read(root, 'CLAUDE.md'), before['CLAUDE.md'], 'the region and its surrounding prose must both match');

  const again = run(root, '--write');
  assert.equal(again.status, 0, again.stdout + again.stderr);
  assert.match(again.stdout, /0 region\(s\) updated/);
  assert.deepEqual(snapshot(root), before, 'a second --write must change nothing');

  assert.equal(run(root, '--check').status, 0);
});

test('both README regions drift together and converge in a single --write', () => {
  const root = makeSandbox();
  const before = snapshot(root);
  writeFile(
    root,
    'README.md',
    read(root, 'README.md')
      .replace('The pack includes 3 skills total', 'The pack includes 9 skills total')
      .replace('| [beta-skill](skills/beta-skill/SKILL.md) | Does beta | Building beta |\n', '')
  );

  const written = run(root, '--write');
  assert.equal(written.status, 0, written.stdout + written.stderr);
  assert.match(written.stdout, /README\.md \[skills-table\] — updated/);
  assert.match(written.stdout, /README\.md \[skill-counts\] — updated/);
  // Two regions in one file: writing them separately would drop the first.
  assert.equal(read(root, 'README.md'), before['README.md'], 'both regions must survive one write');

  const again = run(root, '--write');
  assert.match(again.stdout, /0 region\(s\) updated/);
  assert.deepEqual(snapshot(root), before, 'a second --write must change nothing');
});

test('--check --write is rejected rather than silently writing', () => {
  const root = makeSandbox();
  writeFile(
    root,
    'CLAUDE.md',
    read(root, 'CLAUDE.md').replace('**Build:** alpha-skill, beta-skill', '**Build:** stale-skill')
  );
  const before = snapshot(root);

  const result = run(root, '--check', '--write');

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /--check and --write/);
  assert.deepEqual(snapshot(root), before, '--check must keep the run read-only');
});

test('editorial text that is absent, not a string, or multiline is rejected', () => {
  const mutations = [
    ['null',      catalog => { catalog.skills[1].does    = null; },              /'alpha-skill' is missing "does"/],
    ['number',    catalog => { catalog.skills[1].when    = 42; },                /'alpha-skill' has a non-string "when"/],
    ['object',    catalog => { catalog.skills[1].phase   = { name: 'Build' }; }, /'alpha-skill' has a non-string "phase"/],
    ['linebreak', catalog => { catalog.skills[1].summary = 'One\nTwo'; },        /'alpha-skill' has a line break in "summary"/],
  ];

  for (const [name, mutate, expected] of mutations) {
    const root = makeSandbox();
    const catalog = structuredClone(FIXTURE_CATALOG);
    mutate(catalog);
    writeCatalog(root, catalog);
    const before = snapshot(root);

    const result = run(root, '--write');

    assert.equal(result.status, 1, `${name}: ${result.stdout}${result.stderr}`);
    assert.match(result.stdout, expected, name);
    assert.deepEqual(snapshot(root), before, `${name}: an invalid entry must not be rendered`);
  }
});

test('a second Meta skill fails because the counts sentence names only one', () => {
  const root = makeSandbox();
  const catalog = structuredClone(FIXTURE_CATALOG);
  catalog.skills.push({ name: 'meta-two', phase: 'Meta', does: 'Also routes', when: 'Never' });
  writeCatalog(root, catalog);
  writeSkill(root, 'meta-two');

  const result = run(root, '--check');

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /phase 'Meta' must contain exactly 'using-agent-skills'/);
});

test('membership comes from disk, so a new skill must be declared', () => {
  const root = makeSandbox();
  writeSkill(root, 'gamma-skill');

  const result = run(root, '--check');

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /skills\/gamma-skill\/ has no entry in scripts\/catalog\.json/);
  assert.match(result.stdout, /configuration error/);
});

test('a removed skill fails as a stale catalog entry', () => {
  const root = makeSandbox();
  fs.rmSync(path.join(root, 'skills', 'beta-skill'), { recursive: true, force: true });

  const result = run(root, '--check');

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /catalog\.json lists 'beta-skill' but skills\/beta-skill\/SKILL\.md does not exist/);
});

test('a renamed skill fails on both sides of the rename', () => {
  const root = makeSandbox();
  fs.rmSync(path.join(root, 'skills', 'beta-skill'), { recursive: true, force: true });
  writeSkill(root, 'delta-skill');

  const result = run(root, '--check');

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /skills\/delta-skill\/ has no entry/);
  assert.match(result.stdout, /lists 'beta-skill' but skills\/beta-skill\/SKILL\.md does not exist/);
});

test('a duplicate catalog entry fails instead of rendering the skill twice', () => {
  const root = makeSandbox();
  const catalog = structuredClone(FIXTURE_CATALOG);
  catalog.skills.push({ ...catalog.skills[1] });
  writeCatalog(root, catalog);

  const result = run(root, '--check');

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /duplicate entry for 'alpha-skill'/);
});

test('an entry with no summary fails rather than rendering an empty cell', () => {
  const root = makeSandbox();
  const catalog = structuredClone(FIXTURE_CATALOG);
  delete catalog.skills[1].summary;
  writeCatalog(root, catalog);

  const result = run(root, '--check');

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /'alpha-skill' is missing "summary"/);
});

test('missing, duplicated, and reversed markers fail and write nothing', () => {
  const mutations = [
    ['missing', content => content.replace('<!-- catalog:start:skills-by-phase -->\n', '')],
    ['duplicated', content => content.replace(
      '<!-- catalog:end:skills-by-phase -->',
      '<!-- catalog:end:skills-by-phase -->\n\n<!-- catalog:start:skills-by-phase -->'
    )],
    ['reversed', content => content
      .replace('<!-- catalog:start:skills-by-phase -->', '@@SWAP@@')
      .replace('<!-- catalog:end:skills-by-phase -->', '<!-- catalog:start:skills-by-phase -->')
      .replace('@@SWAP@@', '<!-- catalog:end:skills-by-phase -->')],
  ];

  for (const [name, mutate] of mutations) {
    const root = makeSandbox();
    // Real, fixable drift in another file: a marker problem must block that write too.
    writeFile(root, 'CLAUDE.md', mutate(read(root, 'CLAUDE.md')));
    writeFile(
      root,
      '.github/ISSUE_TEMPLATE/skill-gap.yml',
      read(root, '.github/ISSUE_TEMPLATE/skill-gap.yml').replace('        - beta-skill\n', '')
    );
    const before = snapshot(root);

    const result = run(root, '--write');

    assert.equal(result.status, 1, `${name}: ${result.stdout}${result.stderr}`);
    assert.match(result.stdout, /CLAUDE\.md \[skills-by-phase\]:/, name);
    assert.match(result.stdout, /Nothing was written/, name);
    assert.deepEqual(snapshot(root), before, `${name}: no file may be partially mutated`);
  }
});

test('regions that enclose or cross another region in the same file write nothing', () => {
  // Each pair of markers below is still well formed on its own; only the two
  // regions together are wrong, so this has to be caught across regions.
  const mutations = [
    // skill-counts ends up enclosing skills-table.
    ['nested', content => content
      .replace('<!-- catalog:end:skill-counts -->\n\n', '')
      .replace(
        '<!-- catalog:end:skills-table -->',
        '<!-- catalog:end:skills-table -->\n\n<!-- catalog:end:skill-counts -->'
      )],
    // skills-table opens inside skill-counts and closes after it.
    ['crossing', content => content
      .replace('<!-- catalog:start:skills-table -->\n\n', '')
      .replace(
        '<!-- catalog:end:skill-counts -->',
        '<!-- catalog:start:skills-table -->\n\n<!-- catalog:end:skill-counts -->'
      )],
  ];

  for (const [name, mutate] of mutations) {
    for (const mode of ['--write', '--check']) {
      const root = makeSandbox();
      writeFile(root, 'README.md', mutate(read(root, 'README.md')));
      const before = snapshot(root);

      const result = run(root, mode);

      assert.equal(result.status, 1, `${name} ${mode}: ${result.stdout}${result.stderr}`);
      assert.match(result.stdout, /README\.md: regions \[skill-counts\] .* and \[skills-table\] .* overlap/, `${name} ${mode}`);
      assert.match(result.stdout, /Nothing was written/, `${name} ${mode}`);
      assert.deepEqual(snapshot(root), before, `${name} ${mode}: no file may be rewritten`);
    }
  }
});

test('pipes in editorial text are escaped so the tables stay valid', () => {
  const root = makeSandbox();
  const catalog = structuredClone(FIXTURE_CATALOG);
  catalog.skills[1].does = 'Handles a | b';
  catalog.skills[1].summary = 'Either | or';
  writeCatalog(root, catalog);

  assert.equal(run(root, '--write').status, 0);

  assert.match(read(root, 'README.md'), /\| Handles a \\\| b \|/);
  assert.match(read(root, META), /\| Either \\\| or \|/);
});

test('the README project tree is checked, not rewritten', () => {
  const root = makeSandbox({ treeSkills: ['using-agent-skills', 'alpha-skill'] });
  const before = read(root, 'README.md');

  const result = run(root, '--write');

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /README\.md: project tree is out of date — missing: beta-skill \(edit it by hand\)/);
  assert.equal(read(root, 'README.md'), before, 'the tree must be left for a human to edit');
});

test('the discovery tree must route to every lifecycle skill', () => {
  const root = makeSandbox();
  writeFile(root, META, read(root, META).replace('    └── Building beta? ────→ beta-skill\n', ''));

  const result = run(root, '--check');

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /discovery tree is out of date — missing: beta-skill/);
});

test('the discovery tree must not route to a skill that no longer exists', () => {
  const root = makeSandbox();
  writeFile(root, META, read(root, META).replace('→ beta-skill', '→ removed-skill'));

  const result = run(root, '--check');

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /discovery tree is out of date — missing: beta-skill; not a skill: removed-skill/);
});
