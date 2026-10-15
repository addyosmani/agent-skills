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
 * The markdown files inside a skill's own `references/` directory get the
 * same check, with each link resolved from the file that contains it. They
 * sit one directory deeper than SKILL.md, so from there the shared checklists
 * are `../../../references/`: the same off-by-a-level mistake, one level down.
 *
 * A `#fragment` after such a link must match a heading in the target file,
 * slugged the way GitHub renders anchors. The file existing is not enough:
 * renaming a heading breaks every link to it while the path still resolves.
 *
 * Scope is deliberately narrow: only `references/*.md` links, only SKILL.md
 * and `skills/<name>/references/*.md` files. It is not a general markdown
 * path linter — skills legitimately mention paths that do not exist yet
 * (`tasks/todo.md`, `PERF.md`, `docs/ideas/[idea-name].md`), and those must
 * not fail the build.
 *
 * Fenced code blocks are exempt for the same reason. Text inside a fence is
 * an example, not a link an agent will follow — and this rule in particular
 * has to be documentable: the failure message below tells authors to write
 * `../../references/<file>.md` rather than `references/<file>.md`, which no
 * skill could show as an example without failing the very check explaining it.
 *
 * Exit codes: 0 = all clear, 1 = one or more unresolvable links.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { stripFencedCodeBlocks } = require('./lib/skill-lint');

const ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(ROOT, 'skills');

// Matches a link to a references/ markdown file, with any number of leading
// `../` segments: `references/x.md`, `../../references/x.md`. Anchored on a
// non-path character so `myreferences/x.md` does not match. An optional
// `#fragment` is captured separately.
const REFERENCE_LINK_RE = /(?<![A-Za-z0-9._/-])((?:\.\.\/)*references\/[A-Za-z0-9._-]+\.md)(?:#([\p{L}\p{N}_-]+))?/gu;

// GitHub's heading anchor: the rendered text, lowercased, with everything but
// letters, numbers, `_`, `-` and spaces dropped, then spaces turned to hyphens.
function slugify(heading) {
  const text = heading
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // links and images keep their text
    .replace(/<[^>]+>/g, '');                  // inline HTML renders no text
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

// A link is resolved from the directory of the file that contains it.
function findViolations(file) {
  const violations = [];
  const baseDir = path.dirname(file);
  // Share the linter's fence rules; blanked lines preserve diagnostic positions.
  const lines = stripFencedCodeBlocks(fs.readFileSync(file, 'utf8')).split('\n');

  lines.forEach((line, i) => {
    for (const match of line.matchAll(REFERENCE_LINK_RE)) {
      const [, link, anchor] = match;
      const target = path.resolve(baseDir, link);
      if (!fs.existsSync(target)) {
        violations.push({ line: i + 1, link, target });
      } else if (anchor && !headingAnchors(target).has(anchor)) {
        violations.push({ line: i + 1, link, target, anchor });
      }
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
  let referenceFileErrors = 0;
  let anchorErrors = 0;

  const skillNames = fs.readdirSync(SKILLS_DIR).sort();
  for (const name of skillNames) {
    const skillDir = path.join(SKILLS_DIR, name);
    const skillFile = path.join(skillDir, 'SKILL.md');
    if (!fs.statSync(skillDir).isDirectory() || !fs.existsSync(skillFile)) continue;

    checked++;
    for (const file of [skillFile, ...skillReferenceFiles(skillDir)]) {
      const violations = findViolations(file);

      if (violations.length === 0) {
        console.log(`  ✓  ${toPosix(file)}`);
        continue;
      }

      console.log(`  ✗  ${toPosix(file)}`);
      for (const { line, link, target, anchor } of violations) {
        errors++;
        if (anchor) {
          console.log(`       L${line}: ${link}#${anchor} — no heading in ${toPosix(target)} produces #${anchor}`);
          anchorErrors++;
          continue;
        }
        console.log(`       L${line}: ${link} — resolves to ${toPosix(target)}, which does not exist`);
        if (file !== skillFile) referenceFileErrors++;
      }
    }
  }

  const status = errors > 0 ? 'FAILED' : 'PASSED';
  console.log(`\n${checked} skills checked — ${errors} error(s) — ${status}`);

  if (errors > 0) {
    if (errors > anchorErrors) {
      console.log('\nLinks to references/ are resolved from the directory of the file that contains them.');
      console.log('Shared checklists live in the repo-root references/, two levels up from a SKILL.md:');
      console.log('use `../../references/<file>.md`, not `references/<file>.md`.');
      if (referenceFileErrors > 0) {
        console.log('From a file inside skills/<name>/references/ they are three levels up:');
        console.log('use `../../../references/<file>.md`.');
      }
    }
    if (anchorErrors > 0) {
      console.log("\nAnchors are matched against GitHub's heading slugs: the heading text lowercased,");
      console.log('punctuation dropped, spaces turned to hyphens, and -1, -2, ... for repeated headings.');
    }
    process.exit(1);
  }
}

main();
