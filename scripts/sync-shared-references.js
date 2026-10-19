#!/usr/bin/env node
/**
 * Copies each shared checklist in the repo-root `references/` into every skill
 * that links it as `references/shared/<file>.md` (from SKILL.md) or
 * `../references/shared/<file>.md` (from the skill's own references/). A
 * per-skill `npx skills add` copies only `skills/<name>/`, so the copy is
 * what ships; symlinks are out because Git for Windows checks them out as text.
 *
 * `skills/<name>/references/shared/` belongs to this script: a run rewrites it,
 * and `--check` exits 1 if it differs from what a run would write.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { stripFencedCodeBlocks } = require('./lib/skill-lint');

const ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(ROOT, 'skills');
const SHARED_DIR = path.join(ROOT, 'references');

const SKILL_LINK_RE = /(?<![A-Za-z0-9._/-])references\/shared\/([A-Za-z0-9._-]+\.md)/g;
const REFERENCE_FILE_LINK_RE = /(?<![A-Za-z0-9._/-])\.\.\/references\/shared\/([A-Za-z0-9._-]+\.md)/g;

function linkedNames(file, re) {
  const content = stripFencedCodeBlocks(fs.readFileSync(file, 'utf8'));
  return [...content.matchAll(re)].map((match) => match[1]);
}

function markdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => path.join(dir, name));
}

function skillDirs() {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  return fs.readdirSync(SKILLS_DIR)
    .sort()
    .map((name) => path.join(SKILLS_DIR, name))
    .filter((dir) => fs.statSync(dir).isDirectory() && fs.existsSync(path.join(dir, 'SKILL.md')));
}

function sharedDir(skillDir) {
  return path.join(skillDir, 'references', 'shared');
}

// Every copy the skills need, keyed by its path: { file -> content }.
function expectedCopies() {
  const copies = new Map();
  for (const skillDir of skillDirs()) {
    const names = linkedNames(path.join(skillDir, 'SKILL.md'), SKILL_LINK_RE);
    for (const file of markdownFiles(path.join(skillDir, 'references'))) {
      names.push(...linkedNames(file, REFERENCE_FILE_LINK_RE));
    }

    for (const shared of new Set(names)) {
      const source = path.join(SHARED_DIR, shared);
      if (!fs.existsSync(source)) continue;
      copies.set(path.join(sharedDir(skillDir), shared), fs.readFileSync(source, 'utf8'));
    }
  }
  return copies;
}

function toPosix(file) {
  return path.relative(ROOT, file).split(path.sep).join('/');
}

function check(copies) {
  const problems = [];
  for (const [file, content] of copies) {
    if (!fs.existsSync(file)) problems.push(`missing  ${toPosix(file)}`);
    else if (fs.readFileSync(file, 'utf8') !== content) problems.push(`stale    ${toPosix(file)}`);
  }
  for (const skillDir of skillDirs()) {
    const dir = sharedDir(skillDir);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      const file = path.join(dir, name);
      if (!copies.has(file)) problems.push(`unused   ${toPosix(file)}`);
    }
  }

  for (const problem of problems) console.log(`  ✗  ${problem}`);
  if (problems.length > 0) {
    console.log(`\n${problems.length} shared-reference copies out of date. Run: node scripts/sync-shared-references.js`);
    process.exit(1);
  }
  console.log(`${copies.size} shared-reference copies match.`);
}

function sync(copies) {
  for (const skillDir of skillDirs()) {
    fs.rmSync(sharedDir(skillDir), { recursive: true, force: true });
  }
  for (const [file, content] of copies) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  console.log(`${copies.size} shared-reference copies written.`);
}

const copies = expectedCopies();
if (process.argv.includes('--check')) check(copies);
else sync(copies);
