"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");

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

test("all plugin manifests use the root plugin.json version", () => {
  const expectedVersion = readManifestVersion("plugin.json");
  assert.ok(expectedVersion, "plugin.json must define a version");

  for (const manifestPath of manifestPaths) {
    assert.equal(
      readManifestVersion(manifestPath),
      expectedVersion,
      `${manifestPath} must use version ${expectedVersion}`,
    );
  }
});

// A probity-rules release must also bump the plugin, to a version above
// every plugin tag known (the fork's and upstream's), so the two lines
// never share a number.
const { releasePairingErrors, compareVersions } = require("./lib/release-pairing.js");

test("compares x.y.z versions numerically", () => {
  assert.equal(compareVersions("0.6.10", "0.6.9"), 1);
  assert.equal(compareVersions("0.6.14", "0.6.14"), 0);
  assert.equal(compareVersions("0.7.0", "0.6.99"), 1);
});

const base = { probity: "0.4.63", plugin: "0.6.12" };
const tags = ["0.6.11", "0.6.12", "0.6.13"];

test("passes when nothing is released", () => {
  assert.deepEqual(releasePairingErrors({ base, head: base, tags }), []);
});

test("fails a probity-rules release that leaves the plugin version alone", () => {
  const errors = releasePairingErrors({ base, head: { probity: "0.4.64", plugin: "0.6.12" }, tags });
  assert.match(errors.join("\n"), /probity-rules 0\.4\.63 → 0\.4\.64 .*plugin/);
});

test("passes a probity-rules release with a plugin bump above every tag", () => {
  assert.deepEqual(releasePairingErrors({ base, head: { probity: "0.4.64", plugin: "0.6.14" }, tags }), []);
});

test("fails a plugin version an existing tag already uses (an upstream release)", () => {
  const errors = releasePairingErrors({ base, head: { probity: "0.4.64", plugin: "0.6.13" }, tags });
  assert.match(errors.join("\n"), /0\.6\.13 .*tag/);
});

test("fails a plugin version below the newest tag", () => {
  const errors = releasePairingErrors({ base, head: { probity: "0.4.63", plugin: "0.6.12" }, tags: [...tags, "0.6.20"] });
  assert.deepEqual(errors, [], "an unchanged plugin version is not judged");
  const bumped = releasePairingErrors({ base, head: { probity: "0.4.63", plugin: "0.6.15" }, tags: [...tags, "0.6.20"] });
  assert.match(bumped.join("\n"), /above 0\.6\.20/);
});

test("fails a plugin version that goes backwards", () => {
  const errors = releasePairingErrors({ base: { probity: "0.4.63", plugin: "0.6.14" }, head: { probity: "0.4.63", plugin: "0.6.13" }, tags: [] });
  assert.match(errors.join("\n"), /higher than 0\.6\.14/);
});

test("ignores non-version tags", () => {
  assert.deepEqual(
    releasePairingErrors({ base, head: { probity: "0.4.64", plugin: "0.6.14" }, tags: [...tags, "v1-docs", "probity-rules-0.4.64"] }),
    [],
  );
});
