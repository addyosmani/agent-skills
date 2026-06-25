'use strict';
/**
 * skills.test.js — per-skill validation battery.
 *
 * Generates one describe() block per skill so failures point at the exact
 * skill. Hard errors (structure + format correctness) become assertions that
 * fail CI; soft findings (length thresholds, missing "Use when", dead refs)
 * surface as non-failing diagnostics.
 *
 * Run: npm test   (or: node --test)
 */

const { test, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const lint = require('./lib/skill-lint');

const skillDirs   = lint.listSkillDirs();
const knownSkills = new Set(skillDirs);

assert.ok(skillDirs.length > 0, 'expected at least one skill under skills/');

for (const dirName of skillDirs) {
  describe(`skill: ${dirName}`, () => {
    const { errors, warnings, metrics, exempt } = lint.lintSkill(dirName, knownSkills);

    it('has no structural or format errors', () => {
      assert.deepEqual(
        errors,
        [],
        errors.length ? `\n  - ${errors.join('\n  - ')}` : undefined
      );
    });

    it('description is within the hard 1024-char limit', () => {
      if (metrics.descriptionLength == null) return; // missing description already failed above
      assert.ok(
        metrics.descriptionLength <= lint.MAX_DESCRIPTION_LENGTH,
        `description is ${metrics.descriptionLength} chars (limit ${lint.MAX_DESCRIPTION_LENGTH})`
      );
    });

    it(`reports length metrics${exempt ? ' (section checks exempt)' : ''}`, (t) => {
      t.diagnostic(
        `description=${metrics.descriptionLength ?? 'n/a'} chars, body=${metrics.bodyLength ?? 'n/a'} bytes`
      );
      for (const w of warnings) t.diagnostic(`WARN: ${w}`);
    });
  });
}

// Suite-wide invariant: no two skills share a description (would confuse routing).
test('skill descriptions are unique', () => {
  const seen = new Map();
  for (const dirName of skillDirs) {
    const file = lint.skillPath(dirName);
    const fs = require('node:fs');
    const { frontmatter } = lint.splitFrontmatter(fs.readFileSync(file, 'utf8'));
    const fm = lint.parseFrontmatter(frontmatter);
    const desc = fm && fm.description;
    if (!desc) continue;
    if (seen.has(desc)) {
      assert.fail(`'${dirName}' and '${seen.get(desc)}' share an identical description`);
    }
    seen.set(desc, dirName);
  }
});
