"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const VALIDATOR = path.join(__dirname, "validate-versions.js");
const VERSION = "1.2.3";
const manifestPaths = [
  "plugin.json",
  ".codex-plugin/plugin.json",
  ".claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
  ".agents/plugins/marketplace.json",
];

function writeManifest(root, manifestPath, version) {
  const file = path.join(root, manifestPath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const manifest = manifestPath.endsWith("marketplace.json")
    ? { plugins: [{ name: "agent-skills", version }] }
    : { name: "agent-skills", version };
  fs.writeFileSync(file, JSON.stringify(manifest));
}

function makeSandbox(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "validate-versions-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const manifestPath of manifestPaths) writeManifest(root, manifestPath, VERSION);
  return root;
}

function run(root) {
  return spawnSync(process.execPath, [VALIDATOR], { cwd: root, encoding: "utf8" });
}

test("the CLI validates the repository manifests", () => {
  const result = run(path.join(__dirname, ".."));
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /All plugin manifests use version .+\./);
});

test("the CLI accepts matching plugin and marketplace versions", (t) => {
  const result = run(makeSandbox(t));
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(result.stdout.trim(), `All plugin manifests use version ${VERSION}.`);
  assert.equal(result.stderr, "");
});

for (const manifestPath of manifestPaths) {
  for (const problem of ["mismatched version", "missing version", "missing file", "malformed JSON"]) {
    test(`the CLI rejects ${problem} in ${manifestPath}`, (t) => {
      const root = makeSandbox(t);
      const file = path.join(root, manifestPath);
      if (problem === "mismatched version") writeManifest(root, manifestPath, "9.9.9");
      if (problem === "missing version") writeManifest(root, manifestPath, undefined);
      if (problem === "missing file") fs.rmSync(file);
      if (problem === "malformed JSON") fs.writeFileSync(file, '{"version":');
      const result = run(root);
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.equal(result.stdout, "");
      if (problem === "malformed JSON") {
        assert.match(result.stderr, /SyntaxError/);
      } else if (problem === "missing file") {
        assert.match(result.stderr, /ENOENT/);
      } else if (manifestPath === "plugin.json" && problem === "missing version") {
        assert.match(result.stderr, /plugin\.json is missing a version field/);
      } else {
        assert.match(result.stderr, /has version .*; expected /);
        assert.ok(result.stderr.includes(manifestPath === "plugin.json" ? ".codex-plugin/plugin.json" : manifestPath));
      }
    });
  }
}

for (const version of ["", null, 123, {}, "not-a-version"]) {
  test(`the CLI rejects an invalid downstream version: ${JSON.stringify(version)}`, (t) => {
    const root = makeSandbox(t);
    writeManifest(root, ".codex-plugin/plugin.json", version);
    const result = run(root);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /\.codex-plugin\/plugin\.json has version .*; expected 1\.2\.3/);
  });
}
