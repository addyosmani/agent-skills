# @jjchill/probity-rules

Versioned [Probity](https://github.com/nizos/probity) rule presets and CLI
tooling for the [agent-skills](https://github.com/addyosmani/agent-skills)
catalog. Turns three of the catalog's prose disciplines —
test-driven-development, ports-and-adapters, acceptance-testing — into hard
PreToolUse gates, plus spec-test parity and ubiquitous-language checks. See
[`hooks/PROBITY.md`](../PROBITY.md) for full rule semantics.

Rules and scripts live in this package now instead of being copied into a
project; a project's `probity.config.ts` imports from it, so `npm update`
brings rule fixes in instead of a fork rotting.

## Install

```sh
npm install -D @nizos/probity @jjchill/probity-rules
```

Kotlin parser support for the deterministic single-test fast path is included
as exact-version optional dependencies. Supported installs receive it
automatically. `npm install --omit=optional` disables that optimization; Kotlin
writes then delegate to the AI TDD rule with an explicit diagnostic. Kotlin
layouts outside the default classic/KMP `src/*Test/{java,kotlin}` shape can
pass `testFilePattern` to `withKotlinFastPath`.

## Presets

Each preset is a factory returning `RuleEntry[]` from `@nizos/probity`. Copy
the matching thin config template from the package root (`probity.config.ts`,
`probity.config.kotlin.ts`, `probity.config.kmp.ts`,
`probity.config.swift.ts`) into your project root, then edit its options.

| Preset | Import | Config template |
| --- | --- | --- |
| Plain JS/TS | `@jjchill/probity-rules/presets/js` — `jsRuleEntries(options?)` | `probity.config.ts` |
| Kotlin/JVM/Android | `@jjchill/probity-rules/presets/kotlin` — `kotlinRuleEntries(root, options?)` | `probity.config.kotlin.ts` |
| Kotlin Multiplatform | `@jjchill/probity-rules/presets/kmp` — `kmpRuleEntries(root, parity?)` | `probity.config.kmp.ts` |
| Swift/iOS | `@jjchill/probity-rules/presets/swift` — `swiftRuleEntries(root)` | `probity.config.swift.ts` |

Minimal example (plain JS/TS):

```ts
// probity.config.ts
import { defineConfig } from '@nizos/probity'
import { jsRuleEntries } from '@jjchill/probity-rules/presets/js'

export default defineConfig({
  rules: jsRuleEntries({
    coreGlobs: ['src/core/**', 'src/domain/**'],
  }),
})
```

Kotlin Multiplatform:

```ts
// probity.config.kmp.ts
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from '@nizos/probity'
import { kmpRuleEntries } from '@jjchill/probity-rules/presets/kmp'

const ROOT = dirname(fileURLToPath(import.meta.url))
export default defineConfig({ rules: kmpRuleEntries(ROOT) })
```

Every preset's options and their current defaults are documented at the top
of its module in `presets/`.

## Bins

- `npx probity-scope-report [--config probity.config.ts] [--root .] [--strict]`
  — dry-runs your config's `{ files, rules }` blocks against your real repo
  and reports dead scopes (globs matching zero files) and suspicious claims
  (core-purity rules touching adapter code, the language rule touching
  driver code).
- `npx probity-spec-parity` — the CI mirror of the spec↔test traceability
  rule: checks that every non-`wip` scenario under `docs/specs` is claimed
  by an acceptance test.

## Updating

Run `/probity-update` (a plugin slash command) from your project to update
the package, migrate your config to new options, refresh the Kiro shim
files, and re-verify scoping — see the command for the full procedure.

## Kiro

`kiro/` ships the Kiro hook shim (unchanged install model: copy into your
project's `.kiro/hooks/`). `/probity-update` re-copies changed files from
here.

## Releasing

Releases are published by GitHub Actions
(`.github/workflows/publish-probity-rules.yml`) through npm **trusted
publishing**: the workflow proves its identity to npm with a short-lived
OIDC token, so there is no npm token to store and no second-factor prompt,
and npm attaches a provenance statement linking the package to the exact
commit and workflow run.

To cut a release:

1. Bump `version` in `hooks/probity/package.json` (semver: patch for rule
   fixes, minor for new rules or options, major for changed option shapes
   or removed exports).
2. Add a `## <version>` entry to `CHANGELOG.md`. `/probity-update` reads
   these entries to tell consumers what changed, so write them for the
   consumer: which rule changed, what a config may need.
3. Release the plugin in the same PR: set the same new version in every
   manifest that `scripts/validate-versions.js` lists (`plugin.json`,
   `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json`,
   `.claude-plugin/marketplace.json`, `.agents/plugins/marketplace.json`).
   Pick the next patch above both the base branch's version and the newest
   plugin tag, upstream's included (`git ls-remote --tags upstream` lists
   them), so the fork never reuses a number upstream has published. CI
   fails a probity-rules version change that leaves the plugin version
   alone, and a plugin version that a fork or upstream tag already uses
   (it reads upstream's tags from addyosmani/agent-skills directly).
4. Merge to `main`. The workflow runs typecheck, build, tests, the Kiro
   shim tests, the 48-step eval, and a pack dry run; if the version is not
   yet on the registry it publishes. If the version is already published,
   the workflow succeeds without publishing.
5. Tag the plugin release on the merge commit (`git tag 0.6.14 && git push
   origin 0.6.14`), so the next release's check sees it.

Do **not** create a bare git tag such as `0.1.1` for an npm release. The
repository's `scripts/validate-versions.js` reads every `x.y.z` tag as a
plugin release, so an npm-version tag would be mistaken for one. Plugin releases keep their tags; npm releases are tracked by
`package.json` and the registry.

### One-time setup on npmjs.com

Trusted publishing must be enabled once per package by a package
maintainer, in the browser:

1. Open https://www.npmjs.com/package/@jjchill/probity-rules/access
   (Settings → Publishing access).
2. Under **Trusted Publisher**, choose **GitHub Actions** and enter:
   - Organization or user: `JJChill`
   - Repository: `agent-skills`
   - Workflow filename: `publish-probity-rules.yml` (filename only)
   - Environment: leave empty
3. Save. Optionally set the package to "Require two-factor authentication
   or a trusted publisher" so that manual publishes still need a passkey
   while the workflow does not.

Until this is done, the workflow's publish step fails with an
authentication error; the test job is unaffected.

Manual fallback (not normally needed): from `hooks/probity`, with npm
10.9 or later in an interactive terminal, `npm publish --access public`
completes the second factor in the browser with a passkey.
