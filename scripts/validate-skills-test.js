#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const validator = path.join(__dirname, 'validate-skills.js');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-skills-'));
const skillsDir = path.join(tmpDir, 'skills');
const rootReferencesDir = path.join(tmpDir, 'references');

function writeSkill(name, body) {
  const dir = path.join(skillsDir, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), body);
  return dir;
}

function standardSkill(name, body) {
  return `---\nname: ${name}\ndescription: Test skill used by validate-skills-test.js.\n---\n\n${body}\n\n## Overview\n${body}\n\n## When to Use\nUse this test fixture.\n\n## Common Rationalizations\nDo not skip validation.\n\n## Red Flags\nMissing references should be reported.\n\n## Verification\nRun the validator test.\n`;
}

const goodDir = writeSkill(
  'good-skill',
  standardSkill(
    'good-skill',
    [
      'See [helper](scripts/helper.sh), [guide](references/guide.md), and [anchor](#overview).',
      'Use `examples/demo.md` when testing.',
      'Runtime-mounted paths such as `/mnt/skills/user/good-skill/scripts/runtime.sh` are examples, not bundle files.',
    ].join('\n')
  )
);
fs.mkdirSync(path.join(goodDir, 'scripts'), { recursive: true });
fs.mkdirSync(path.join(goodDir, 'references'), { recursive: true });
fs.mkdirSync(path.join(goodDir, 'examples'), { recursive: true });
fs.writeFileSync(path.join(goodDir, 'scripts', 'helper.sh'), '#!/usr/bin/env bash\n');
fs.writeFileSync(path.join(goodDir, 'references', 'guide.md'), '# Guide\n');
fs.writeFileSync(path.join(goodDir, 'examples', 'demo.md'), '# Demo\n');
fs.mkdirSync(rootReferencesDir, { recursive: true });
fs.writeFileSync(path.join(rootReferencesDir, 'shared.md'), '# Shared\n');

writeSkill(
  'missing-ref-skill',
  standardSkill(
    'missing-ref-skill',
    [
      'See [missing script](scripts/missing.sh).',
      'Also check `examples/missing.md`.',
      'Shared root references such as `references/shared.md` are valid.',
      'External docs such as [docs](https://example.com/docs) should be ignored.',
    ].join('\n')
  )
);

const result = spawnSync(process.execPath, [validator], {
  env: { ...process.env, SKILLS_DIR: skillsDir },
  encoding: 'utf8',
});

assert.strictEqual(result.status, 0, result.stderr || result.stdout);
assert.match(result.stdout, /WARN:\s+Missing local reference: `scripts\/missing\.sh`/);
assert.match(result.stdout, /WARN:\s+Missing local reference: `examples\/missing\.md`/);
assert.doesNotMatch(result.stdout, /runtime\.sh/);
assert.match(result.stdout, /2 skills checked .* 2 warning\(s\) .* PASSED WITH WARNINGS/);

fs.rmSync(tmpDir, { recursive: true, force: true });
console.log('validate-skills-test.js passed');
