#!/usr/bin/env node
/**
 * validate-reference-links.js
 *
 * Guards links from skills to the shared `references/` checklists.
 *
 * The checklists have one editable source at the repository root, but a skill
 * may be installed on its own, and OMP's `skill://` containment guard rejects a
 * link that leaves the skill directory. So every consuming skill carries a
 * byte-identical copy at `skills/<name>/references/<file>.md`, written by
 * `node scripts/sync-references.js`, and every link inside the skill resolves
 * inside the skill.
 *
 * Three rules are enforced here:
 *
 *   1. A `references/*.md` link is resolved from the file that contains it and
 *      must not leave the skill directory. `../../references/x.md` used to be
 *      the convention; from a SKILL.md it now escapes the skill, so it fails.
 *   2. Inside `skills/<name>/references/`, a sibling is linked bare (`x.md` or
 *      `./x.md`) and gets the same existence and anchor checks.
 *   3. Every generated copy must be byte-identical to its canonical source.
 *      The pair list is `scripts/lib/reference-manifest.js`, the same list
 *      `sync-references.js` writes, so writer and checker cannot drift.
 *
 * A `#fragment` after such a link must match a heading in the target file,
 * slugged the way GitHub renders anchors. The file existing is not enough:
 * renaming a heading breaks every link to it while the path still resolves.
 *
 * Scope is deliberately narrow: only links to markdown reference files, only
 * SKILL.md and `skills/<name>/references/*.md` files. It is not a general
 * markdown path linter — skills legitimately mention paths that do not exist
 * yet (`tasks/todo.md`, `PERF.md`, `docs/ideas/[idea-name].md`), and those must
 * not fail the build. Fenced code blocks are exempt for the same reason: text
 * inside a fence is an example, not a link an agent will follow.
 *
 * Exit codes: 0 = all clear, 1 = one or more violations.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { stripFencedCodeBlocks } = require('./lib/skill-lint');
const { COPIES } = require('./lib/reference-manifest');

const ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(ROOT, 'skills');

// A link into a references/ directory, with any number of leading `../`
// segments. Anchored on a non-path character so `myreferences/x.md` does not
// match. The leading segments are captured so an escaping link can be named as
// such even when its target happens to exist.
const REFERENCE_LINK_RE = /(?<![A-Za-z0-9._/-])((?:\.\.\/)*)(references\/[A-Za-z0-9._-]+\.md)(?:#([\p{L}\p{N}_-]+))?/gu;

// A markdown file beside the one containing it. Only applied inside a skill's
// references/ directory, and only for a name the manifest copies there: other
// bare `.md` names (`AGENTS.md`, `CONSTRAINTS.md`) are artifacts the skill
// refers to, not links to a local file.
const SIBLING_LINK_RE = /(?<![A-Za-z0-9._/-])(?:\.\/)?([A-Za-z0-9._-]+\.md)(?:#([\p{L}\p{N}_-]+))?/gu;
const CHECKLIST_FILES = new Set(COPIES.map(({ file }) => file));

// GitHub's heading anchor: the rendered text, lowercased, with everything but
// letters, numbers, `_`, `-` and spaces dropped, then spaces turned to hyphens.
function slugify(heading) {
  // One left-to-right pass, so markup inside a code span is left alone: GitHub
  // renders `<dialog>` in a code span as the text <dialog>, which slugs to `dialog`.
  const text = heading.replace(
    /(`+)([\s\S]*?)\1|!?\[([^\]]*)\]\([^)]*\)|<[^>]+>/g,
    (match, ticks, code, linkText) => {
      if (ticks) return code;                      // code spans keep their text as written
      if (linkText !== undefined) return linkText; // links and images keep their text
      return '';                                   // inline HTML renders no text
    }
  );
  return text.toLowerCase().replace(/[^\p{L}\p{M}\p{N}_\- ]/gu, '').replace(/ /g, '-');
}

// The anchors a file's ATX headings produce, outside fenced blocks. A repeated
// slug gets `-1`, `-2`, ... as on GitHub.
function headingAnchors(file) {
  const anchors = new Set();
  const seen = new Map();
  for (const line of stripFencedCodeBlocks(fs.readFileSync(file, 'utf8')).split('\n')) {
    const match = line.match(/^ {0,3}#{1,6}[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/);
    if (!match) continue;
    const slug = slugify(match[1]);
    let count = seen.get(slug) || 0;
    let anchor = count === 0 ? slug : `${slug}-${count}`;
    while (anchors.has(anchor)) anchor = `${slug}-${++count}`;
    anchors.add(anchor);
    seen.set(slug, count + 1);
  }
  return anchors;
}

// A link is resolved from the directory of the file that contains it, and must
// stay inside the skill directory.
function findViolations(file, skillDir = path.dirname(file)) {
  const violations = [];
  const baseDir = path.dirname(file);
  const allowSiblings = path.basename(baseDir) === 'references';
  // Share the linter's fence rules; blanked lines preserve diagnostic positions.
  const lines = stripFencedCodeBlocks(fs.readFileSync(file, 'utf8')).split('\n');

  function record(line, link, anchor) {
    const target = path.resolve(baseDir, link);
    const relative = path.relative(skillDir, target);
    const outsideSkill = relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative);
    if (outsideSkill) {
      violations.push({ line, link, target, escapes: true });
    } else if (!fs.existsSync(target)) {
      violations.push({ line, link, target });
    } else if (anchor && !headingAnchors(target).has(anchor)) {
      violations.push({ line, link, target, anchor });
    }
  }

  lines.forEach((line, i) => {
    const spans = [];
    for (const match of line.matchAll(REFERENCE_LINK_RE)) {
      spans.push([match.index, match.index + match[0].length]);
      record(i + 1, `${match[1]}${match[2]}`, match[3]);
    }
    if (!allowSiblings) return;
    for (const match of line.matchAll(SIBLING_LINK_RE)) {
      if (!CHECKLIST_FILES.has(match[1])) continue;
      const start = match.index;
      const end = start + match[0].length;
      if (spans.some(([from, to]) => start < to && end > from)) continue;
      record(i + 1, match[1], match[2]);
    }
  });

  return violations;
}

// The markdown files directly inside a skill's own references/ directory.
function skillReferenceFiles(skillDir) {
  const dir = path.join(skillDir, 'references');
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return [];
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => path.join(dir, name))
    .filter((file) => fs.statSync(file).isFile());
}

// Generated copies that no longer match their canonical checklist. A pair with
// either side absent is skipped: a missing copy is already reported as a broken
// link, and a sandbox fixture may ship only the files it exercises.
function findDrift() {
  const drift = [];
  for (const { skill, file } of COPIES) {
    const canonical = path.join(ROOT, 'references', file);
    const copy = path.join(ROOT, 'skills', skill, 'references', file);
    if (!fs.existsSync(canonical) || !fs.existsSync(copy)) continue;
    if (!fs.readFileSync(canonical).equals(fs.readFileSync(copy))) drift.push({ canonical, copy });
  }
  return drift;
}

function toPosix(file) {
  return path.relative(ROOT, file).split(path.sep).join('/');
}

function main() {
  console.log('Checking references/ links in skills...\n');

  if (!fs.existsSync(SKILLS_DIR)) {
    console.log('No skills/ directory — nothing to check.');
    return;
  }

  let checked = 0;
  let errors = 0;
  let missingErrors = 0;
  let anchorErrors = 0;
  let escapeErrors = 0;

  const skillNames = fs.readdirSync(SKILLS_DIR).sort();
  for (const name of skillNames) {
    const skillDir = path.join(SKILLS_DIR, name);
    const skillFile = path.join(skillDir, 'SKILL.md');
    if (!fs.statSync(skillDir).isDirectory() || !fs.existsSync(skillFile)) continue;

    checked++;
    for (const file of [skillFile, ...skillReferenceFiles(skillDir)]) {
      const violations = findViolations(file, skillDir);

      if (violations.length === 0) {
        console.log(`  ✓  ${toPosix(file)}`);
        continue;
      }

      console.log(`  ✗  ${toPosix(file)}`);
      for (const { line, link, target, anchor, escapes } of violations) {
        errors++;
        if (escapes) {
          console.log(`       L${line}: ${link} — leaves ${toPosix(skillDir)}/, resolving to ${toPosix(target)}`);
          escapeErrors++;
          continue;
        }
        if (anchor) {
          console.log(`       L${line}: ${link}#${anchor} — no heading in ${toPosix(target)} produces #${anchor}`);
          anchorErrors++;
          continue;
        }
        console.log(`       L${line}: ${link} — resolves to ${toPosix(target)}, which does not exist`);
        missingErrors++;
      }
    }
  }

  const drift = findDrift();
  for (const { canonical, copy } of drift) {
    errors++;
    console.log(`  ✗  ${toPosix(copy)}`);
    console.log(`       generated copy differs from ${toPosix(canonical)}`);
  }

  const status = errors > 0 ? 'FAILED' : 'PASSED';
  console.log(`\n${checked} skills checked — ${errors} error(s) — ${status}`);

  if (errors > 0) {
    if (escapeErrors > 0) {
      console.log('\nA link must resolve inside the skill directory.');
      console.log('Shared checklists are copied into each consuming skill: from a SKILL.md link');
      console.log('`references/<file>.md`; from a file inside `skills/<name>/references/` link');
      console.log('the sibling as `<file>.md`.');
    }
    if (missingErrors > 0) {
      console.log('\nEdit the canonical checklist in `references/` and run `node scripts/sync-references.js`');
      console.log('to regenerate the copies. Never edit a generated copy.');
    }
    if (drift.length > 0) {
      console.log('\nEdit `references/<file>.md` and run `node scripts/sync-references.js` to refresh the copies.');
    }
    if (anchorErrors > 0) {
      console.log("\nAnchors are matched against GitHub's heading slugs: the heading text lowercased,");
      console.log('punctuation dropped, spaces turned to hyphens, and -1, -2, ... for repeated headings.');
    }
    process.exit(1);
  }
}

main();
