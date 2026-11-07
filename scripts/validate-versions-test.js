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

// Upstream's plugin tags are read straight from its remote, since a CI
// checkout (or a stale clone) has only the fork's tags.
const { tagsFromLsRemote } = require("./lib/release-pairing.js");

test("reads tag names from git ls-remote --tags output", () => {
  const output = [
    "3d48c77a6ccace108ea643dd9b6449206f75fb31\trefs/tags/0.6.14",
    "eb07f19f52c2669f2364897aaa293e2aaddd7b1c\trefs/tags/0.6.14^{}",
    "a350e34334688f28b692ba93ed0538e157ce51d4\trefs/tags/0.6.15",
    "",
  ].join("\n");
  assert.deepEqual(tagsFromLsRemote(output), ["0.6.14", "0.6.15"]);
});

test("an upstream-only tag blocks reusing its number", () => {
  const upstream = tagsFromLsRemote("abc\trefs/tags/0.6.14\nabd\trefs/tags/0.6.15\n");
  const errors = releasePairingErrors({ base, head: { probity: "0.4.64", plugin: "0.6.14" }, tags: [...tags, ...upstream] });
  assert.match(errors.join("\n"), /0\.6\.14 is already used by tag/);
  assert.match(errors.join("\n"), /above 0\.6\.15/);
});

// End to end: run validate-versions.js in a scratch repo whose upstream is a
// local repository, so the ls-remote path and its failure handling are real.
const { execFileSync, spawnSync } = require("node:child_process");
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");

const SCRIPT = resolve(__dirname, "validate-versions.js");

function scratchRepo(t, { plugin, probity }) {
  const dir = mkdtempSync(join(tmpdir(), "validate-versions-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const run = (...args) => execFileSync("git", args, { cwd: dir, stdio: "pipe" });
  run("init", "-q", "-b", "main");
  run("config", "user.email", "t@example.com");
  run("config", "user.name", "t");
  run("config", "commit.gpgsign", "false");
  const write = (version, probityVersion) => {
    for (const path of manifestPaths) {
      mkdirSync(join(dir, path, ".."), { recursive: true });
      const body = path.endsWith("marketplace.json") ? { plugins: [{ version }] } : { version };
      writeFileSync(join(dir, path), JSON.stringify(body));
    }
    mkdirSync(join(dir, "hooks/probity"), { recursive: true });
    writeFileSync(join(dir, "hooks/probity/package.json"), JSON.stringify({ version: probityVersion }));
    run("add", "-A");
    run("commit", "-q", "--allow-empty", "-m", `v${version}`);
  };
  write(plugin.base, probity.base);
  run("update-ref", "refs/remotes/origin/main", "HEAD");
  write(plugin.head, probity.head);
  return { dir, run };
}

function upstreamWithTags(t, tagNames) {
  const dir = mkdtempSync(join(tmpdir(), "validate-versions-upstream-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const run = (...args) => execFileSync("git", args, { cwd: dir, stdio: "pipe" });
  run("init", "-q", "-b", "main");
  run("-c", "user.email=t@example.com", "-c", "user.name=t", "-c", "commit.gpgsign=false", "commit", "-q", "--allow-empty", "-m", "x");
  for (const tag of tagNames) run("tag", tag);
  return dir;
}

function validate(dir, env) {
  const { GITHUB_BASE_REF, CI, ...rest } = process.env;
  return spawnSync(process.execPath, [SCRIPT], { cwd: dir, encoding: "utf8", env: { ...rest, ...env } });
}

test("validate-versions rejects a plugin version only upstream has tagged", (t) => {
  const { dir } = scratchRepo(t, { plugin: { base: "0.6.12", head: "0.6.14" }, probity: { base: "0.4.63", head: "0.4.64" } });
  const upstream = upstreamWithTags(t, ["0.6.14", "0.6.15"]);
  const result = validate(dir, { PLUGIN_UPSTREAM_REPO: upstream });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /0\.6\.14 is already used by tag/);
});

test("validate-versions passes a plugin version above upstream's tags", (t) => {
  const { dir } = scratchRepo(t, { plugin: { base: "0.6.12", head: "0.6.16" }, probity: { base: "0.4.63", head: "0.4.64" } });
  const upstream = upstreamWithTags(t, ["0.6.14", "0.6.15"]);
  const result = validate(dir, { PLUGIN_UPSTREAM_REPO: upstream });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Release pairing .*: ok/);
});

test("validate-versions fails in CI when upstream's tags can't be listed", (t) => {
  const { dir } = scratchRepo(t, { plugin: { base: "0.6.12", head: "0.6.16" }, probity: { base: "0.4.63", head: "0.4.63" } });
  const result = validate(dir, { PLUGIN_UPSTREAM_REPO: join(dir, "no-such-repo"), CI: "true" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /could not list .*no-such-repo.* tags/);
});

test("validate-versions warns but passes locally when upstream's tags can't be listed", (t) => {
  const { dir } = scratchRepo(t, { plugin: { base: "0.6.12", head: "0.6.16" }, probity: { base: "0.4.63", head: "0.4.63" } });
  const result = validate(dir, { PLUGIN_UPSTREAM_REPO: join(dir, "no-such-repo") });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout + result.stderr, /could not list .*no-such-repo.* tags; checking local tags only/);
});

test("validate-versions skips the upstream lookup when no version changed", (t) => {
  const { dir } = scratchRepo(t, { plugin: { base: "0.6.12", head: "0.6.12" }, probity: { base: "0.4.63", head: "0.4.63" } });
  const result = validate(dir, { PLUGIN_UPSTREAM_REPO: join(dir, "no-such-repo"), CI: "true" });
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout + result.stderr, /could not list/);
});
