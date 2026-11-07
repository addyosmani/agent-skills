"use strict";

// A probity-rules release (hooks/probity/package.json version change) must
// ship with a plugin release, and every plugin version must sit above all
// plugin tags known locally, the fork's and upstream's, so the fork never
// reuses a number upstream has published.

const VERSION = /^v?(\d+)\.(\d+)\.(\d+)$/;

function parse(version) {
  const match = VERSION.exec(version);
  if (!match) throw new Error(`not an x.y.z version: ${version}`);
  return match.slice(1).map(Number);
}

function compareVersions(a, b) {
  const [pa, pb] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] > pb[i] ? 1 : -1;
  }
  return 0;
}

function newestTag(tags) {
  return tags
    .filter((tag) => VERSION.test(tag))
    .map((tag) => tag.replace(/^v/, ""))
    .sort(compareVersions)
    .at(-1);
}

// base/head: { probity, plugin } versions; tags: git tag names.
function releasePairingErrors({ base, head, tags }) {
  const errors = [];
  const newest = newestTag(tags);
  const floor = newest && compareVersions(newest, base.plugin) > 0 ? newest : base.plugin;

  if (head.probity !== base.probity && head.plugin === base.plugin) {
    errors.push(
      `probity-rules ${base.probity} → ${head.probity} is a release, so the plugin must be released too: ` +
        `bump every plugin manifest above ${floor} (the newest of the base version and all plugin tags).`,
    );
  }

  if (head.plugin !== base.plugin) {
    if (compareVersions(head.plugin, base.plugin) <= 0) {
      errors.push(`plugin version ${head.plugin} must be higher than ${base.plugin}, the base branch's version.`);
    } else if (tags.some((tag) => VERSION.test(tag) && compareVersions(tag, head.plugin) === 0)) {
      errors.push(
        `plugin version ${head.plugin} is already used by tag ${head.plugin} (a fork or upstream release); pick a version above ${floor}.`,
      );
    } else if (newest && compareVersions(head.plugin, newest) < 0) {
      errors.push(`plugin version ${head.plugin} must be above ${newest}, the newest plugin tag.`);
    }
  }

  return errors;
}

// Tag names from `git ls-remote --tags` output, peeled (^{}) lines dropped.
function tagsFromLsRemote(output) {
  return output
    .split("\n")
    .map((line) => line.split("\t")[1] ?? "")
    .filter((ref) => ref.startsWith("refs/tags/") && !ref.endsWith("^{}"))
    .map((ref) => ref.slice("refs/tags/".length));
}

module.exports = { compareVersions, releasePairingErrors, tagsFromLsRemote };
