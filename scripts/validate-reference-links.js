#!/usr/bin/env node
/**
 * validate-reference-links.js
 *
 * Guards links from skills to the shared `references/` checklists.
 *
 * Those checklists live in the repo-root `references/` directory, but every
 * SKILL.md used to link them as `references/<file>.md` — a path relative to
 * the skill's own directory, which is two levels below the root. All 18 links
 * across 11 skills resolved to files that do not exist, in the repo and in
 * every plugin-install layout (~/.claude/plugins/cache/..., ~/.codex/...).
 * Agents that followed the guidance — for example using-agent-skills pointing
 * at the Definition of Done — hit a file-not-found and stalled.
 *
 * Nothing else in CI catches this: validate-artifact-paths.js is scoped to
 * spec/plan/todo artifacts and is explicitly not a general markdown linter.
 *
 * The rule enforced here: every `references/*.md` link in a SKILL.md must
 * resolve to an existing file relative to that skill's own directory. This
 * accepts both conventions in CLAUDE.md — shared checklists reached via
 * `../../references/`, and a skill's own colocated `references/` directory.
 *
 * Scope is deliberately narrow: only `references/*.md` links, only SKILL.md
 * files. It is not a general markdown path linter — skills legitimately
 * mention paths that do not exist yet (`tasks/todo.md`, `PERF.md`,
 * `docs/ideas/[idea-name].md`), and those must not fail the build.
 *
 * Exit codes: 0 = all clear, 1 = one or more unresolvable links.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(ROOT, 'skills');

// Matches a link to a references/ markdown file, with any number of leading
// `../` segments: `references/x.md`, `../../references/x.md`. Anchored on a
// non-path character so `myreferences/x.md` does not match.
const REFERENCE_LINK_RE = /(?<![A-Za-z0-9._/-])((?:\.\.\/)*references\/[A-Za-z0-9._-]+\.md)/g;

function findViolations(skillDir, skillFile) {
  const violations = [];
  const lines = fs.readFileSync(skillFile, 'utf8').split(/\r?\n/);

  lines.forEach((line, i) => {
    for (const match of line.matchAll(REFERENCE_LINK_RE)) {
      const link = match[1];
      if (!fs.existsSync(path.resolve(skillDir, link))) {
        violations.push({ line: i + 1, link });
      }
    }
  });

  return violations;
}

function main() {
  console.log('Checking references/ links in skills...\n');

  if (!fs.existsSync(SKILLS_DIR)) {
    console.log('No skills/ directory — nothing to check.');
    return;
  }

  let checked = 0;
  let errors = 0;

  const skillNames = fs.readdirSync(SKILLS_DIR).sort();
  for (const name of skillNames) {
    const skillDir = path.join(SKILLS_DIR, name);
    const skillFile = path.join(skillDir, 'SKILL.md');
    if (!fs.statSync(skillDir).isDirectory() || !fs.existsSync(skillFile)) continue;

    checked++;
    const violations = findViolations(skillDir, skillFile);

    if (violations.length === 0) {
      console.log(`  ✓  skills/${name}/SKILL.md`);
    } else {
      console.log(`  ✗  skills/${name}/SKILL.md`);
      for (const { line, link } of violations) {
        const resolved = path.relative(ROOT, path.resolve(skillDir, link));
        console.log(`       L${line}: ${link} — resolves to ${resolved}, which does not exist`);
        errors++;
      }
    }
  }

  const status = errors > 0 ? 'FAILED' : 'PASSED';
  console.log(`\n${checked} skills checked — ${errors} error(s) — ${status}`);

  if (errors > 0) {
    console.log('\nLinks to references/ are resolved from the skill\'s own directory.');
    console.log('Shared checklists live in the repo-root references/, two levels up:');
    console.log('use `../../references/<file>.md`, not `references/<file>.md`.');
    process.exit(1);
  }
}

main();
