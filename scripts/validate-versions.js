#!/usr/bin/env node

"use strict";

const { execFileSync } = require("node:child_process");
const { readFileSync } = require("node:fs");

const manifestPaths = [
  "plugin.json",
  ".codex-plugin/plugin.json",
  ".claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
  ".agents/plugins/marketplace.json",
];

function readManifestVersion(manifestPath) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  return manifest.version ?? manifest.plugins?.[0]?.version;
}

const expectedVersion = execFileSync(
  "git",
  ["describe", "--tags", "--abbrev=0"],
  { encoding: "utf8" },
).trim();

for (const manifestPath of manifestPaths) {
  const version = readManifestVersion(manifestPath);
  if (version !== expectedVersion) {
    throw new Error(
      `${manifestPath} has version ${version ?? "<missing>"}; expected ${expectedVersion}`,
    );
  }
}

console.log(`All plugin manifests use version ${expectedVersion}.`);
