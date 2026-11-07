#!/usr/bin/env node

"use strict";

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

const expectedVersion = readManifestVersion("plugin.json");
if (!expectedVersion) {
  throw new Error("plugin.json is missing a version field");
}

for (const manifestPath of manifestPaths) {
  const version = readManifestVersion(manifestPath);
  if (version !== expectedVersion) {
    throw new Error(
      `${manifestPath} has version ${version ?? "<missing>"}; expected ${expectedVersion}`,
    );
  }
}

console.log(`All plugin manifests use version ${expectedVersion}.`);

// Release pairing: compare against the base branch (the PR's base in CI,
// origin/main locally). Skipped when no base ref is available.
const { execFileSync } = require("node:child_process");
const { releasePairingErrors } = require("./lib/release-pairing.js");

const PROBITY_PACKAGE = "hooks/probity/package.json";
const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const baseRef = process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : `origin/${process.env.GITHUB_BASE_REF || "main"}`;

let mergeBase;
try {
  mergeBase = git("merge-base", baseRef, "HEAD");
} catch {
  console.log(`Release pairing: skipped (no ${baseRef} to compare against).`);
}

if (mergeBase) {
  const atBase = (path) => JSON.parse(git("show", `${mergeBase}:${path}`));
  const base = {
    probity: atBase(PROBITY_PACKAGE).version,
    plugin: atBase("plugin.json").version,
  };
  const head = {
    probity: JSON.parse(readFileSync(PROBITY_PACKAGE, "utf8")).version,
    plugin: expectedVersion,
  };
  const tags = git("tag", "-l").split("\n").filter(Boolean);
  const errors = releasePairingErrors({ base, head, tags });
  if (errors.length) {
    throw new Error(`Release pairing against ${baseRef}:\n  ${errors.join("\n  ")}`);
  }
  console.log(`Release pairing against ${baseRef}: ok (plugin ${base.plugin} → ${head.plugin}, probity-rules ${base.probity} → ${head.probity}).`);
}
