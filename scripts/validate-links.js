#!/usr/bin/env node
'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const { validateDocuments } = require('./lib/markdown-link-lint');

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

function trackedPaths(root) {
  return execFileSync('git', ['ls-files', '-z', '--'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).split('\0').filter(Boolean).map(toPosix);
}

function existingPathsFor(files) {
  const existingPaths = new Set(['.', ...files]);
  for (const filePath of files) {
    let parent = path.posix.dirname(filePath);
    while (parent !== '.') {
      existingPaths.add(parent);
      parent = path.posix.dirname(parent);
    }
  }
  return existingPaths;
}

function compareDiagnostics(left, right) {
  const sourceOrder = left.source < right.source
    ? -1
    : left.source > right.source ? 1 : 0;
  const destinationOrder = left.destination < right.destination
    ? -1
    : left.destination > right.destination ? 1 : 0;
  return (
    sourceOrder
    || left.line - right.line
    || destinationOrder
  );
}

function main(root = process.cwd()) {
  const files = trackedPaths(root);
  const markdownFiles = files.filter((filePath) => /\.md$/i.test(filePath));
  const documents = new Map(
    markdownFiles.map((filePath) => [
      filePath,
      fs.readFileSync(path.join(root, filePath), 'utf8'),
    ]),
  );
  const diagnostics = validateDocuments(
    root,
    documents,
    existingPathsFor(files),
  ).sort(compareDiagnostics);

  for (const diagnostic of diagnostics) {
    console.log(
      `${diagnostic.source}:${diagnostic.line}: broken local link `
      + `'${diagnostic.destination}' — ${diagnostic.reason}`,
    );
  }

  const status = diagnostics.length === 0 ? 'PASSED' : 'FAILED';
  console.log(
    `${markdownFiles.length} Markdown files checked — ${diagnostics.length} `
    + `broken local link(s) — ${status}`,
  );
  if (diagnostics.length > 0) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  const message = String(error.message ?? error).split(/\r?\n/, 1)[0];
  console.error(`ERROR: validate-links failed unexpectedly: ${message}`);
  process.exitCode = 1;
}
