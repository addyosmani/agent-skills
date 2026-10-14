# Floor guard: reference implementation

Every numbered dimension in `CONSTRAINTS.md` maps to a de facto tool (Step 4). The **floor** does not: it is a diff-scoped check for the five moves in Step 6, and without a shipped reference every agent invents its own, so two runs (or a Python repo and a Go one) produce two different guards. That is the exact non-determinism this skill exists to remove.

This is the reference. Adapt the patterns to your stack; keep the contract identical.

## Contract

- **Input:** the diff between the merge base and the working tree (added *and* removed lines, plus untracked files). A guard that reads only `git diff` misses new files and staged-but-uncommitted work.
- **Detects the five Step 6 moves:** a weakened threshold in `CONSTRAINTS.md`, a test made easier (`.skip`, a deleted test file, an assertion removed from a test that stayed), a silenced checker (a new suppression comment), unfinished work (a stub or empty `catch`), a new Exceptions row.
- **Exit codes:** `0` clean, `1` at least one floor violation (block the change), `2` the guard could not run (no merge base, not a git repo). Never let a `2` read as a `0`.
- **Reports the rule and the location, never the matched secret value.** Redaction is not optional (Step 4).
- **Tightening is silent, loosening is loud:** only surfaces moves that lower the bar.

## Reference (Node, ~stack-agnostic patterns)

```js
#!/usr/bin/env node
// floor-guard.mjs — diff-scoped enforcement of the CONSTRAINTS.md floor.
// Usage: node floor-guard.mjs [--base <ref>]   (default base: origin/main)
import { execFileSync } from 'node:child_process';
import { closeSync, lstatSync, openSync, readSync } from 'node:fs';

const base = (() => {
  const i = process.argv.indexOf('--base');
  return i > -1 ? process.argv[i + 1] : 'origin/main';
})();

// `git diff --no-index` exits 1 whenever the two sides differ, which is the normal case for a
// new file, so that output is kept. Any other failure is null, and null never reads as clean.
// The guard parses git's output, so the user's config and environment must not reshape it:
// color codes, an external diff driver or textconv, or a missing a/ b/ prefix would each turn a
// violation into lines the parser skips, and skipped lines read as clean. GIT_EXTERNAL_DIFF and
// GIT_DIFF_OPTS are dropped from the environment for the same reason.
const env = { ...process.env };
delete env.GIT_EXTERNAL_DIFF; delete env.GIT_DIFF_OPTS;
const MAX_DIFF_BYTES = 8 * 1024 * 1024;
const git = (args, { diffExit = false } = {}) => {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8', env, maxBuffer: MAX_DIFF_BYTES, stdio: ['ignore', 'pipe', 'pipe'],
    });
  }
  catch (e) { return diffExit && e.status === 1 && typeof e.stdout === 'string' ? e.stdout : null; }
};
const bail = (msg) => { console.error('floor-guard: ' + msg); process.exit(2); };

// Run from the top of the work tree. `git ls-files` lists only the current directory's subtree,
// relative to it, so a guard started in a subfolder would miss untracked files elsewhere and name
// the rest differently from `git diff`, which always covers the whole tree.
const top = git(['rev-parse', '--show-toplevel'])?.trim();
if (!top) bail('not inside a git work tree');
process.chdir(top);

// Merge base; bail to exit 2 rather than pretending a shallow/rootless clone is clean.
const mergeBase = git(['merge-base', base, 'HEAD'])?.trim();
if (!mergeBase) bail('no merge base against ' + base);

// Unified diff plus untracked files (git diff alone cannot see new files). Let Git classify
// binaries; forcing --text on every path expands binary blobs into huge output and makes a NUL
// anywhere in a text diff look like proof that the whole file is binary.
const DIFF = ['--unified=0', '--no-color', '--no-ext-diff', '--no-textconv', '--find-renames',
  '--src-prefix=a/', '--dst-prefix=b/'];
const tracked = git(['diff', ...DIFF, mergeBase, '--']);
if (tracked === null) bail('could not diff against ' + mergeBase);
const renameStatus = git(['diff', '--name-status', '-z', '--find-renames', mergeBase, '--']);
if (renameStatus === null) bail('could not identify renamed files against ' + mergeBase);
const renames = [], changedFiles = [];
const statusFields = renameStatus.split('\0').filter(Boolean);
for (let i = 0; i < statusFields.length;) {
  const status = statusFields[i++];
  const pathCount = status[0] === 'R' || status[0] === 'C' ? 2 : 1;
  const paths = statusFields.slice(i, i + pathCount);
  if (status[0] === 'R') renames.push(paths);
  if (status[0] !== 'D') changedFiles.push(paths[pathCount - 1]);
  i += pathCount;
}
const untrackedFiles = git(['ls-files', '--others', '--exclude-standard', '-z']);
if (untrackedFiles === null) bail('could not list untracked files');
let diffBytes = Buffer.byteLength(tracked, 'utf8') + 1;
if (diffBytes > MAX_DIFF_BYTES) bail('diff exceeds the 8 MiB safety limit');
const diffParts = [tracked];
const untrackedPaths = untrackedFiles.split('\0').filter(Boolean);
for (const f of untrackedPaths) {
  const d = git(['diff', '--no-index', ...DIFF, '/dev/null', f], { diffExit: true });
  if (d === null) bail('could not diff untracked file ' + f);
  diffBytes += Buffer.byteLength(d, 'utf8') + 1;
  if (diffBytes > MAX_DIFF_BYTES) bail('diff exceeds the 8 MiB safety limit');
  diffParts.push(d);
}

// A deliberate `-diff` attribute suppresses even text hunks. Preserve the guard for those files
// without forcing text mode on every path: only retry explicitly disabled, regular files that
// have no NUL in Git's 8 KiB binary-classification window.
for (const f of new Set([...changedFiles, ...untrackedPaths])) {
  const attr = git(['check-attr', '-z', 'diff', '--', f]);
  if (attr === null) bail('could not inspect diff attribute for ' + f);
  const attrFields = attr.split('\0');
  if (attrFields[2] !== 'unset') continue;

  let fd;
  try {
    if (!lstatSync(f).isFile()) continue;
    fd = openSync(f, 'r');
    const prefix = Buffer.alloc(8000);
    const bytesRead = readSync(fd, prefix, 0, prefix.length, 0);
    if (prefix.subarray(0, bytesRead).includes(0)) continue;
  } catch {
    continue;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }

  const isUntracked = untrackedPaths.includes(f);
  const args = isUntracked
    ? ['diff', '--no-index', '--text', ...DIFF, '/dev/null', f]
    : ['diff', '--text', ...DIFF, mergeBase, '--', f];
  const textDiff = git(args, { diffExit: isUntracked });
  if (textDiff === null) bail('could not inspect text file with diff disabled: ' + f);
  diffBytes += Buffer.byteLength(textDiff, 'utf8') + 1;
  if (diffBytes > MAX_DIFF_BYTES) bail('diff exceeds the 8 MiB safety limit');
  diffParts.push(textDiff);
}
const diff = diffParts.join('\n');

// Walk the diff. `---` and `+++` are file headers only between a file's `diff` line and its first
// `@@` hunk; inside a hunk every line is content, so an added `++i` (shown as `+++i`) or a removed
// `-- comment` is a change, not a header. Both headers name the file, so a deletion
// (`+++ /dev/null`) keeps its name.
const added = [], removed = [], deleted = [];
const pathOf = (s) => s.replace(/^[ab]\//, '');
let file = '', oldFile = '', inHeader = false;
for (const line of diff.split('\n')) {
  if (line.startsWith('diff ')) { inHeader = true; file = ''; oldFile = ''; }
  else if (line.startsWith('@@')) inHeader = false;
  else if (inHeader) {
    if (line.startsWith('--- ')) oldFile = pathOf(line.slice(4));
    else if (line.startsWith('+++ ')) {
      const newFile = pathOf(line.slice(4));
      file = newFile === '/dev/null' ? oldFile : newFile;
      if (newFile === '/dev/null') deleted.push(file);
    }
  }
  else if (line.startsWith('+')) added.push({ file, text: line.slice(1) });
  else if (line.startsWith('-')) removed.push({ file, text: line.slice(1) });
}

const findings = [];
const flag = (rule, f, text) => findings.push({ rule, file: f, text: text.trim().slice(0, 120) });
const isTest = (f) => {
  const normalized = f.replace(/\\/g, '/');
  const name = normalized.slice(normalized.lastIndexOf('/') + 1);
  if (/(?:^|\/)(?:__fixtures__|fixtures?)(?:\/|$)/i.test(normalized)) return false;
  if (!/\.(?:c|cc|cpp|cxx|h|hpp|js|jsx|mjs|cjs|ts|tsx|mts|cts|py|pyi|go|rs|java|kt|kts|rb|php|swift|cs|sh)$/i.test(name)) {
    return false;
  }
  return /(?:^|\/)(?:test|tests|__tests__|spec|specs)\//i.test(normalized)
    || /(?:^|\/)[^/]+\.(?:test|spec)\.[^.]+$/i.test(normalized)
    || /(?:^|\/)[^/]+_(?:test|spec)\.[^.]+$/i.test(normalized)
    || /(?:^|\/)test_[^/]+\.[^.]+$/i.test(normalized);
};
const isConstraints = (f) => /CONSTRAINTS\.md$/.test(f);

for (const [from, to] of renames) {
  if ((isTest(from) && !isTest(to)) || (isConstraints(from) && !isConstraints(to))) {
    deleted.push(from);
  }
}

// 1. Silenced checker — extend this list for your ecosystem.
const SUPPRESSIONS = /@ts-ignore|@ts-nocheck|eslint-disable|biome-ignore|# *noqa|# *type: *ignore|istanbul ignore|nosemgrep|gitleaks:allow|Stryker disable/;
// 4. Unfinished work.
const STUBS = /throw new (Error|NotImplemented).*[Nn]ot implemented|catch\s*\(\w*\)\s*\{\s*\}|catch\s*\{\s*\}|\bTODO\b|\bpass\s*# *stub/;
// 2. A test made easier (added skips).
const SKIPS = /\.(skip|todo)\b|\bxit\(|\bxdescribe\(|@pytest\.mark\.skip|t\.Skip\(/;

for (const { file, text } of added) {
  if (SUPPRESSIONS.test(text)) flag('silenced-checker', file, text);
  if (STUBS.test(text)) flag('unfinished-work', file, text);
  if (SKIPS.test(text)) flag('test-made-easier', file, text);
  if (isConstraints(file) && /^\| *(W|E)\d+ *\|/.test(text)) flag('new-exception', file, text);
}

// 2b. A test file deleted, or an assertion removed from a test file that still exists.
for (const f of deleted) if (isTest(f)) flag('test-deleted', f, 'file deleted');
for (const f of deleted) if (isConstraints(f)) flag('rule-removed', f, 'CONSTRAINTS.md deleted');
for (const { file, text } of removed) {
  if (isTest(file) && !deleted.includes(file) && /\b(expect|assert|should)\b/.test(text)) {
    flag('assertion-removed', file, text);
  }
}

// 1b/2c. A rule in CONSTRAINTS.md weakened or removed. A rule is a floor bullet or a table row,
// identified by the bullet's text before its first colon or by the row's first cell. Each number
// carries a direction read from the words around it: a minimum (>=, at least, must not fall) is
// loosened by going down, a maximum (<=, at most, under, must not grow) by going up. A number whose
// direction cannot be read is reported whenever it changes, because the guard cannot tell
// tightening from loosening and staying quiet is the wrong default. Numbers are paired within
// their direction (the first minimum with the first minimum, and so on), so a number added
// elsewhere in the text does not shift the pairing; a threshold with no counterpart after the
// edit was removed, and an added one tightens.
const ruleKey = (t) => {
  const s = t.trim();
  if (s.startsWith('|')) return s.split('|').map((c) => c.trim()).filter(Boolean)[0] ?? '';
  if (/^[-*] /.test(s)) return s.slice(2).split(':')[0].trim();
  return null; // prose, headings, dates: not a rule
};
const isException = (t) => /^\| *(W|E)\d+ *\|/.test(t.trim());
const MIN_BEFORE = /(>=|>|≥|at least|minimum|\bmin\b|no less than|not fall|not drop)\s*$/;
const MAX_BEFORE = /(<=|<|≤|at most|maximum|\bmax\b|no more than|under|below|not grow|not exceed)\s*$/;
const MIN_AFTER = /^\s*\S*\s*(or more|or higher|must not fall|must not drop)/;
const MAX_AFTER = /^\s*\S*\s*(or less|or lower|must not grow|must not exceed)/;
const thresholds = (t) => {
  const out = [], re = /\d+(?:\.\d+)?/g;
  let m;
  while ((m = re.exec(t))) {
    const before = t.slice(Math.max(0, m.index - 24), m.index).toLowerCase();
    const after = t.slice(m.index + m[0].length, m.index + m[0].length + 40).toLowerCase();
    const dir = MIN_BEFORE.test(before) || MIN_AFTER.test(after) ? 'min'
      : MAX_BEFORE.test(before) || MAX_AFTER.test(after) ? 'max' : null;
    out.push({ n: Number(m[0]), dir });
  }
  return out;
};
const removedRules = removed.filter((l) => isConstraints(l.file) && ruleKey(l.text) !== null);
const addedRules = added.filter((l) => isConstraints(l.file) && ruleKey(l.text) !== null);
for (const r of removedRules) {
  const a = addedRules.find((x) => ruleKey(x.text) === ruleKey(r.text));
  if (!a) {
    if (!isException(r.text)) flag('rule-removed', r.file, r.text); // dropping an exception tightens: silent
    continue;
  }
  const before = thresholds(r.text), after = thresholds(a.text);
  let verdict = null;
  for (const dir of ['min', 'max', null]) {
    const was = before.filter((x) => x.dir === dir), now = after.filter((x) => x.dir === dir);
    was.forEach((b, i) => {
      const n = now[i];
      if (verdict) return;
      if (!n) verdict = 'threshold-removed';
      else if (n.n === b.n) return;
      else if (dir === 'min' ? n.n < b.n : dir === 'max' ? n.n > b.n : true) {
        verdict = dir ? 'threshold-loosened' : 'threshold-changed';
      }
    });
  }
  if (verdict) flag(verdict, r.file, r.text + '  ->  ' + a.text);
}

if (findings.length === 0) { console.log('floor-guard: clean'); process.exit(0); }
console.error('floor-guard: ' + findings.length + ' floor violation(s):');
for (const f of findings) console.error(`  [${f.rule}] ${f.file}: ${f.text}`);
if (findings.some((f) => f.rule === 'rule-removed')) {
  console.error('\nA rule-removed finding can also mean the rule\'s label changed: rename a rule in one commit and change its thresholds in another.');
}
if (findings.some((f) => f.rule === 'threshold-removed')) {
  console.error('\nA threshold-removed finding can also mean a number gained or lost its direction words (">= 80%" becoming "80%", or the reverse): compare the two lines before assuming a threshold was deleted.');
}
console.error('\nEach is a move that lowers the bar. Fix the code, or route it through a tracked exception.');
process.exit(1);
```

## Adapting it

- **Patterns are the only stack-specific part.** Add your language's suppression and stub forms to the three regexes; the diff plumbing, the CONSTRAINTS.md checks, and the exit codes stay as-is.
- **A `.constraintsignore`** (one glob per line) lets you exempt a path the guard would otherwise flag; check each added line's file against it before flagging, so a genuine exception is a tracked file rather than a loosened rule.
- **This is a starting point, not a finished tool.** It is deliberately regex-shallow: it catches the cheap-road-to-green moves agents actually make, not a determined human hiding a change. That is the right trade for a check that runs on every diff. Once you outgrow it, move to a real runner (Escalation Path level 3).
