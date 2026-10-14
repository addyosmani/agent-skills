#!/usr/bin/env node
// Requirement coverage check: every live, non-waived requirement ID in the spec has a tagged test that is not commented out or skipped.
// Copy this file into the project (scripts/check-requirements.mjs) so it runs without the skill installed. Node 20+, no packages.
// Usage: node scripts/check-requirements.mjs <spec.md | -> [ID...]   ("-" reads the spec from stdin; IDs narrow UNTESTED to one task's Covers: line)
// Exit 0: every ID is tested. Exit 1: some ID is untested. Exit 2: bad input (no spec, a missing spec file, an ID the spec does not define) or not inside a git repository.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const TEST_FILE = /(^|\/)(tests?|__tests__)\/|\.(test|spec)\.|(^|\/)test_|_test\./;
const PAREN_FILE = /\.([cm]?[jt]sx?|go)$/;
const DEF = /^\s*(async\s+)?def /;
const SKIP_DECORATOR = /^\s*@(pytest\.mark|unittest)\.skip/;
const IGNORED = /^\s*(\/\/|\/\*|\*|#)|(^|[^\w])(xit|xtest)\(|\.(skip|todo|failing)\(|\b(skip|todo)\s*:\s*(true|["'`])/;
const JS_OPENER = /(^|[^\w.])(it|test)(\.\w+)*(\(.*\))?\(\s*$/;
const GO_OPENER = /\b\w+\.Run\(\s*$/;
const PY_DOCSTRING = /^\s*[rRuU]?["']{0,2}$/;
const TAG = /["'`]([A-Z]{2,5}-\d+):/g;
const JS_TEST = /(^|[^\w.])(it|test)\(\s*(["'`]|$)/;
const GO_SUBTEST = /\bt\.Run\(\s*["'`]/;
const COMMENT = /^\s*(\/\/|\/\*|\*|#)/;

const byNumber = (a, b) => a.localeCompare(b, "en", { numeric: true });
const keyOf = (id) => id.replace(/-\d+$/, "");
const lineAbove = (lines, i) => lines.slice(0, i).findLast((l) => l.trim()) ?? "";
const nextLine = (lines, i) => lines.slice(i + 1).find((l) => l.trim()) ?? "";
const hasTag = (text) => new RegExp(TAG.source).test(text);

/** Print a one-line error and exit 2, so a usage problem never reads as a coverage result. */
function fail(message) {
  console.error(message);
  process.exit(2);
}

/** The spec's live IDs (dropped ones excluded) and the IDs its seam table waives. */
function readSpec(text) {
  const defined = [...text.matchAll(/^\s*\d+\.\s+(([A-Z]{2,5}-\d+):.*)$/gm)]
    .filter(([line]) => !line.includes("(dropped)"))
    .map(([, , id]) => id);
  const waived = new Set(text.split("\n").filter((l) => /^\|\s*waived/.test(l))
    .flatMap((l) => l.split("|")[2].match(/[A-Z]{2,5}-\d+/g) ?? []));
  return { defined: new Set(defined), waived };
}

/** Test files git knows about, tracked or not, minus ignored ones and ones deleted from the working tree. */
function testFiles() {
  const git = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" });
  if (git.status !== 0) fail("check-requirements: run this inside a git repository; it finds test files with git ls-files.");
  return git.stdout.split("\n").filter((f) => TEST_FILE.test(f) && !f.endsWith(".md") && existsSync(f));
}

/** Python: the nearest `def` at or above line i. */
function defAbove(lines, i) {
  while (i > 0 && !DEF.test(lines[i])) i--;
  return i;
}

/** Commented out or skipped: by the tagged line, the line above when the tag starts its line, or a Python skip decorator. */
function ignored(lines, i, col) {
  const opener = lines[i].slice(0, col).trim() ? lines[i] : lineAbove(lines, i) + lines[i];
  if (IGNORED.test(opener)) return true;
  let d = defAbove(lines, i);
  while (d > 0 && lines[d - 1].trim().startsWith("@")) if (SKIP_DECORATOR.test(lines[--d])) return true;
  return false;
}

/** Is the quoted ID at column col a test name: the first argument of `it(`/`test(`/`t.Run(`, or a pytest docstring's first line? Other languages: any quoted string. */
function isTestName(file, lines, i, col) {
  const before = lines[i].slice(0, col);
  const above = lineAbove(lines, i);
  const opener = before.trim() ? before : above;
  if (file.endsWith(".py")) return PY_DOCSTRING.test(before) && /^\s*(async\s+)?def test_/.test(above);
  if (file.endsWith(".go")) return GO_OPENER.test(opener);
  if (PAREN_FILE.test(file)) return JS_OPENER.test(opener);
  return true;
}

/** IDs tagged on at least one test that is neither commented out nor skipped. */
function taggedIds(files) {
  const ids = new Set();
  for (const file of files) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      for (const m of line.matchAll(TAG)) if (isTestName(file, lines, i, m.index) && !ignored(lines, i, m.index)) ids.add(m[1]);
    });
  }
  return ids;
}

function nextFunc(lines, i) {
  const end = lines.findIndex((l, j) => j > i && /^func /.test(l));
  return end === -1 ? lines.length : end;
}

/** Test declarations with no ID, as `file:line:text`: JS/TS `it(`/`test(`, a pytest `def test_` (tag in the docstring), a Go `t.Run(`, or a Go `func Test` with no subtest. */
function untagged(files) {
  return files.flatMap((file) => {
    const lines = readFileSync(file, "utf8").split("\n");
    return lines.flatMap((line, i) => {
      if (COMMENT.test(line)) return [];
      const named = JS_TEST.test(line) ? hasTag(/\(\s*$/.test(line) ? line + nextLine(lines, i) : line)
        : DEF.test(line) && /def test_/.test(line) ? hasTag(nextLine(lines, i))
        : GO_SUBTEST.test(line) ? hasTag(line)
        : /^func Test/.test(line) ? lines.slice(i + 1, nextFunc(lines, i)).some((l) => GO_SUBTEST.test(l))
        : true;
      return named ? [] : [`${file}:${i + 1}:${line}`];
    });
  });
}

const [spec, ...ids] = process.argv.slice(2);
if (!spec) fail("Usage: node scripts/check-requirements.mjs <spec.md | -> [ID...]");
if (spec !== "-" && !existsSync(spec)) fail(`check-requirements: spec not found: ${spec}`);
const { defined, waived } = readSpec(readFileSync(spec === "-" ? 0 : spec, "utf8"));
const keys = new Set([...defined].map(keyOf));
const expected = ids.length ? ids.map((i) => i.replace(/:$/, "")) : [...defined];
const unknown = expected.filter((id) => !defined.has(id));
if (unknown.length) fail(`check-requirements: ${unknown.join(", ")} not defined in the spec (a typo, or dropped); fix the Covers: line.`);
const files = testFiles();
const tagged = taggedIds(files);
const keyTag = new RegExp(`["'\`](${[...keys].join("|")})-\\d+:`);
const specFiles = files.filter((f) => keyTag.test(readFileSync(f, "utf8")));

const untested = expected.filter((id) => !tagged.has(id) && !waived.has(id)).sort(byNumber);
const undefinedIds = [...tagged].filter((id) => keys.has(keyOf(id)) && !defined.has(id)).sort(byNumber);

console.log("UNTESTED (fails):");
untested.forEach((id) => console.log(`${id}:`));
console.log("UNDEFINED ID (warns):");
undefinedIds.forEach((id) => console.log(`${id}:`));
console.log("NO ID (warns):");
untagged(specFiles).forEach((line) => console.log(line));
process.exit(untested.length ? 1 : 0);
