#!/usr/bin/env node
/**
 * sync-references.js
 *
 * Copies the shared checklists from the repository-root `references/` into the
 * consuming skills, so every link inside a skill resolves under that skill's
 * own directory. OMP's `skill://` containment guard rejects a link that leaves
 * the skill; a per-skill install copies only `skills/<name>/` and would leave a
 * root-relative link pointing at nothing.
 *
 * The root copy stays canonical: edit `references/<file>.md`, never the copy,
 * then run this script. `validate-reference-links.js` fails the build when a
 * copy differs from its source, so a hand-edited copy cannot land.
 *
 * Both this script and the validator read the pair list from
 * `scripts/lib/reference-manifest.js`.
 *
 * Exit codes: 0 = copies are current, 1 = a source or skill directory is
 * missing (nothing is written in that case).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { COPIES } = require('./lib/reference-manifest');

const ROOT = path.resolve(__dirname, '..');

function main() {
  const problems = [];
  for (const { skill, file } of COPIES) {
    const source = path.join(ROOT, 'references', file);
    const skillFile = path.join(ROOT, 'skills', skill, 'SKILL.md');
    if (!fs.existsSync(source)) problems.push(`Missing canonical checklist: ${path.relative(ROOT, source)}`);
    if (!fs.existsSync(skillFile)) problems.push(`Missing skill: ${path.relative(ROOT, skillFile)}`);
  }

  if (problems.length > 0) {
    for (const problem of problems) console.error(problem);
    process.exit(1);
  }

  let created = 0;
  let unchanged = 0;

  for (const { skill, file } of COPIES) {
    const source = path.join(ROOT, 'references', file);
    const target = path.join(ROOT, 'skills', skill, 'references', file);
    const bytes = fs.readFileSync(source);

    if (fs.existsSync(target) && bytes.equals(fs.readFileSync(target))) {
      unchanged++;
      continue;
    }

    fs.mkdirSync(path.dirname(target), { recursive: true });
    const temp = `${target}.tmp`;
    fs.writeFileSync(temp, bytes);
    fs.renameSync(temp, target);
    created++;
  }

  console.log(`created ${created}, unchanged ${unchanged}`);
}

main();
