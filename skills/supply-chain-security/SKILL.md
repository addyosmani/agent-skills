---
name: supply-chain-security
description: Secures the software supply chain from dependency to deployed artifact. Use when adding, updating, or auditing a dependency, when generating or reviewing an SBOM, when verifying build provenance or signatures, or when a dependency turns malicious or a critical CVE drops. Use when setting up Dependabot or Renovate, pinning CI actions, or reviewing a lockfile diff. Use when triaging package-manager audit findings or investigating a typosquatted or dependency-confusion package.
---

# Supply Chain Security

## Overview

Your code is the smallest part of what you ship. The rest is other people's code, pulled from public registries, built by CI you did not write, and deployed without being read. A supply chain attack needs no bug in your application — one malicious package, one compromised build step, or one unsigned artifact is enough.

This skill is narrower and deeper than `security-and-hardening`. That skill hardens your own code — input validation, auth, secrets. This one covers everything you did *not* write: dependencies, registries, lockfiles, SBOMs, provenance, build pipelines, and artifact signing.

## When to Use

- Adding a new dependency to any project
- Reviewing a lockfile diff in a pull request
- Running a package-manager audit and triaging the results
- Generating, updating, or reviewing an SBOM for a release
- Setting up automated dependency updates (Dependabot, Renovate)
- Pinning CI actions, build tools, or base images
- Verifying a package, image, or release artifact before trusting it
- A CVE drops in a dependency you use, or a dependency is reported malicious

**When NOT to use:** for vulnerabilities in your own first-party code (use `security-and-hardening`), or for license compliance as a legal question.

## Process

1. **Inventory before you install.** List direct and transitive dependencies first. Never add a package to a project whose tree you have not seen.
2. **Vet the new dependency.** License, maintenance health, maintainer history, install scripts, and a read of the code for small packages.
3. **Pin it exactly and commit the lockfile.** Exact version, updated lockfile in the same change, lockfile matching the manifest.
4. **Block install scripts by default.** Install with scripts disabled until reviewed. Approve only the scripts a package genuinely needs.
5. **Audit against the committed lockfile.** Run the native audit on the lockfile, not a fresh resolve. Triage by reachability, not severity label alone.
6. **Generate the SBOM and keep it with the release.** SPDX or CycloneDX, from the same lockfile that built the artifact.
7. **Prove provenance at build time.** Pinned CI actions, minimal permissions, OIDC identity; sign the artifact and attach provenance attestation.
8. **Update on a cadence, not on a panic.** Small, tested, automated update PRs on a schedule. Patch critical CVEs out of band, the same day.
9. **Watch for compromise continuously.** A dependency that turns malicious after you installed it is the normal case, not the exception.
10. **If something is malicious, run the incident procedure.** Quarantine, rotate secrets, audit what it touched — then clean up.

## Know What You Ship

"We only use 10 packages" is always wrong. Ten direct dependencies routinely resolve to hundreds of transitive ones — packages nobody on the team has heard of, chosen by someone else's manifest, updated without anyone noticing.

- **Enumerate from the lockfile, never from memory or the manifest alone.** The manifest states intent; the lockfile states reality. Use `npm ls`, `pip freeze` against the lock, `cargo tree`, `go list -m all`, or `dotnet list package --include-transitive`.
- **Count transitive dependencies and say the number out loud.** 12 direct and 400 transitive means a 400-package attack surface. The count itself is the finding.

### SBOM

An SBOM (Software Bill of Materials) is the inventory in a machine-readable format that scanners, customers, and incident responders can consume. Generate it from the lockfile at build time, in SPDX or CycloneDX — the two formats the ecosystem has converged on. SPDX is the ISO standard, strong on licensing; CycloneDX is OWASP's format, strong on vulnerability tracking.

- **Generate it from the exact tree that built the artifact**, in the same CI job, from the same lockfile, before the artifact is published.
- **Ship it with the release, every release** — attached to the GitHub release, next to the container image, or inside the distribution package.
- **Retain SBOMs for every released version** while that version is supported. When a CVE drops six months later, the first question is "which releases contain this package at this version?"
- **Use it during incidents.** When a package is reported malicious, query your SBOMs — not memory, not a grep across repos — to find every affected release.

## Pinning and Lockfiles

A floating version range lets the registry decide what your next build contains. Pinning takes that decision back.

- **Pin exact versions for production dependencies.** `1.4.2`, not `^1.4.2`, `~1.4.0`, or `latest`. A caret range lets a minor release — new code, new transitive dependencies, new risk — into your next build without review. Applications pin; libraries may float.
- **Commit the lockfile. Always.** `package-lock.json`, `poetry.lock`, `Cargo.lock`, `go.sum`, `Gemfile.lock`, `pnpm-lock.yaml` — whichever your ecosystem uses, it is committed, reviewed, and treated as source.
- **Review lockfile diffs like code diffs.** Look for unexpected new packages, version jumps larger than the manifest change justifies, and integrity hashes that changed on a package whose version did not.
- **One lockfile per installation boundary.** Competing lockfiles (`package-lock.json` and `yarn.lock` in one project) mean two different resolutions of the same tree. Pick one manager and make CI fail if a second one appears.
- **Never bypass integrity verification.** The manager verifies each tarball's recorded hash on install. Never use flags that skip integrity checks, and never hand-edit a hash to make an install pass.
- **Detect drift between manifest and lockfile.** CI must install with a frozen flag (`npm ci`, `pnpm install --frozen-lockfile`, `cargo --locked`) so drift fails the build instead of silently resolving.

## Provenance and Attestation

Provenance answers "where did this artifact come from, and what went into it?" Without it, you trust bits you never verified, built by a build you did not observe.

**SLSA levels** grade how hard it is to tamper with an artifact between source and delivery. Level 1: provenance exists. Level 2: signed, tamper-evident, hosted build. Level 3: hardened, isolated build. Level 4: hermetic, reproducible, two-party-reviewed. Aim for Level 2 everywhere, Level 3 for production artifacts.

- **Sign release artifacts.** A signature binds an artifact to an identity (a maintainer, a CI workload) at a point in time. Unsigned releases are indistinguishable from forgeries downstream.
- **Use Sigstore/Cosign for keyless signing.** Cosign signs with short-lived certificates bound to an OIDC identity instead of long-lived keys. Verify *who* signed, not just *that* something signed — pin the expected identity.
- **Verify before you trust, every time.** Verification is a step in the install/deploy pipeline, not a manual ritual. An artifact that fails verification — or has no signature where one is expected — does not get installed, deployed, or promoted. Where Sigstore applies, check the Rekor transparency log too.
- **Build reproducibly.** A reproducible build produces byte-identical output from the same inputs, letting anyone rebuild from source and confirm the published artifact matches. Sort file listings, pin timestamps (`SOURCE_DATE_EPOCH`), avoid embedding absolute paths, pin every tool version. Rebuild and compare on a schedule.
- **Verify the source before trusting the package.** Confirm the claimed repository is the real one — the registry metadata link should be the maintainer's actual repo, not a lookalike — and that the published code matches the repo at the tagged version.

## Typosquatting and Confusion Attacks

Attackers do not need to break into a maintainer's account. They publish a package that *looks* like the one you wanted and wait for a typo or a tired copy-paste.

- **Typosquatting.** One character off the real name: `crossenv` for `cross-env`, `reqeusts` for `requests`, `loadsh` for `lodash`. The twin often copies the original's version and README. The payload usually runs at install time.
- **Dependency confusion.** Your project depends on a private package, say `acme-billing`, that exists only on your internal registry. If the same name is unclaimed on the public registry, an attacker registers it there with a high version, and resolvers checking the public registry pull the attacker's package instead.
- **Brandjacking and combosquatting.** A name borrowing a trusted brand (`react-native-official`) or combining two real names (`lodash-express`) to imply endorsement that does not exist.
- **Maintainer takeover.** A legitimate package changes hands — burnout, a sale, lost credentials — and the new owner ships a malicious release. "It was safe last year" is not evidence about this year's release.

### Spotting a malicious package before installing it

- **New maintainer, sudden version jump, or a long-dormant package shipping several releases.** Read the diff before installing.
- **Install scripts.** `postinstall`, `preinstall`, and build hooks run code at install time with your user's privileges, before you import anything. Read the script. If it downloads and executes a remote payload, decodes base64 blobs, spawns a shell, or touches `~/.ssh`, `~/.aws`, or environment files, do not install it.
- **Exfiltration behavior.** Postinstall scripts reading environment variables, shell history, SSH keys, or cloud credentials and sending them to an external host are the classic payload.

### Defenses that actually work

- **Scope internal package names** (npm scopes, private registry namespaces) and configure resolvers so internal names resolve only internally.
- **Review lockfile diffs.** A typosquatted package can only enter through a manifest change or a lockfile regeneration — both reviewable events.
- **Block install scripts by default** (`--ignore-scripts` on first install, then approve explicitly). Most projects need zero install scripts.
- **Install from a lockfile in CI, never resolve fresh.** Fresh resolution is when a newly published malicious version gets picked up. Mirror or proxy the public registry where possible.

## Vetting New Dependencies

Every dependency is code you did not write, running with your application's privileges, under a license you have not read.

- **License.** Check it first. Permissive (MIT, Apache-2.0, BSD), copyleft (GPL, AGPL) with obligations you understand, or custom and ambiguous? A missing license is unlicensed — no permission at all. Flag copyleft for anything shipping to customers.
- **Maintenance health and bus factor.** Last release date, open issue count and age, whether issues get responses and PRs merge or rot. No release in two years and 400 open issues means abandoned, not stable. One maintainer with sole publish rights is a single point of failure and compromise.
- **Read the code — especially for small packages.** A 40-line utility: read all of it before installing. For large packages, read the entry points, the install scripts, and the dependency list.
- **Downloads measure popularity, not safety.** Check for known advisories before installing, not after the audit flags it. Say no when the package is unlicensed, abandoned with no fork, maintained by a single unreachable person on a critical path, or needs install scripts that do suspicious things.

## Audit Triage

Running the audit is the easy part. Triage is deciding which findings matter, which can wait, and which are noise — and writing the decision down.

- **Use the package manager's native audit** (`npm audit`, `pnpm audit`, `pip audit`, `cargo audit`, `govulncheck`, `bundle audit`) against the committed lockfile, in CI, on every PR touching dependencies and before every release. Auditing a fresh resolve audits a tree you are not shipping.
- **Triage by reachability, not by severity label.** A critical CVE in a function your application never calls is a different fact from a critical CVE on your login path. Determine whether the vulnerable code is executed — at runtime, in the build, in tests, or in deployment.
- **Classify each finding: reachable and exploitable, reachable but not exploitable in your context, or unreachable.** Record the classification and the reasoning.
- **Do not ignore findings because "it's only dev."** A vulnerable dev dependency runs on developer machines and in CI — where production credentials, signing keys, and source access live.
- **Watch for false positives and stale advisories.** An advisory may describe a version range you are not on, a configuration you do not use, or a fix your lockfile already holds. Verify before spending a day on it — and before dismissing it.

**When a CVE does and does not matter:** matters *now* when vulnerable code is reachable in production, the exploit is public or trivial, or the advisory is actively exploited — patch the same day. Matters *soon* when the code is reachable but the exploit needs conditions you do not meet, or the package is build-time only. Matters *eventually* when the code is unreachable and the package is dev-only. It does *not* matter only when you can state, with evidence, that the vulnerable version is not present, the code is not reachable, and the advisory does not apply. Document every deferral: advisory ID, package and version, reachability call, reason, owner, and review date.

## Update Policy

Dependencies rot. The choice is "update on your schedule, or update in a panic when a critical CVE drops."

- **Fix a cadence and keep it.** Weekly or fortnightly updates, as a standing PR or sprint slot, beat sporadic heroic upgrades. Small, frequent updates are reviewable; a six-month backlog of 80 updates is not.
- **Separate patch/minor updates from major upgrades.** Patch and minor updates go through the automated pipeline. Major versions are a planned task with a changelog read, a migration note, and a test run.
- **Automate with Dependabot or Renovate, with test gates.** Small PRs, one dependency at a time, that must pass tests and CI before merging. Pinning and updating are not opposites: pinning makes updating safe, but a lockfile pinned six months ago is a list of known vulnerabilities you chose not to fix.
- **Emergency patching:** confirm reachability within the hour; patch or mitigate the same day if reachable; rebuild, re-sign, and re-issue the SBOM; check logs for exploitation before the patch; tell downstream consumers and customers on the affected version.

## CI/CD Pipeline as Supply Chain

Your build pipeline is supply chain infrastructure. A compromised step in CI can inject code into every artifact you ship.

- **Pin CI actions to commit SHAs, not tags.** A tag like `actions/checkout@v4` is a mutable pointer — whoever controls the tag controls what your build runs. A full commit SHA is immutable.
- **Pin every tool in the pipeline:** base images by digest, not tag; tool versions explicitly; package manager versions explicitly.
- **Grant minimal permissions.** CI jobs get the smallest token scope that lets them do their job — read-only where possible, no write access unless the job publishes, no secrets it does not need. Use OpenID Connect (OIDC) for cloud credentials instead of long-lived secrets.
- **Isolate jobs that run untrusted code.** Pull-request builds from forks run untrusted code by definition. They get no secrets, no write permissions, and no access to the artifact-signing identity.
- **Do not let the build fetch unpinned inputs.** `curl | bash` installers, unversioned binary URLs, and tools at `latest` are supply chain holes with a build step's privileges. Pin the URL, pin the version, verify the checksum.


## Incident Handling: A Dependency Turns Malicious

Assume this will happen: a package you depend on gets compromised.

1. **Quarantine.** Block the package at the registry proxy or mirror, pin to the last known-good version, and stop all builds that would pull the malicious version.
2. **Determine exposure from your SBOMs.** Query retained SBOMs for every release containing the package at an affected version. List every affected release, environment, and downstream consumer.
3. **Find what it touched.** Assume the worst payload the package's privileges allowed: credential theft, data exfiltration, or persistence. Read its install scripts and code, check CI and build logs for unexpected network calls or file access during the exposure window.
4. **Rotate affected secrets.** Any secret present where the malicious package ran — CI secrets, cloud credentials, signing keys, tokens, database passwords — is compromised until proven otherwise. Rotate first, investigate second.
5. **Rebuild and re-release clean artifacts.** Remove the malicious package, rebuild from clean source, re-sign, re-issue SBOMs, and redeploy. Do not try to surgically clean a built artifact — rebuild it.
6. **Notify and document.** Tell downstream consumers which versions are affected and what to do. Write the incident record: package, versions, exposure window, what it did, what was rotated, what was rebuilt, and what detection would have caught it earlier.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We only use 10 packages" | Count the transitive tree. It is almost never 10 — it is hundreds, and nobody reviewed most of them. |
| "The audit passed, so we're safe" | Audits match known advisories. They do not detect a newly malicious package, a typosquat, or a compromised maintainer. |
| "It's only a dev dependency" | Dev dependencies run on developer machines and in CI, where the production credentials and signing keys live. |

## Red Flags

- A lockfile that is uncommitted, gitignored, or regenerated silently in CI
- `latest` tags on base images, CI actions, or dependencies in a production build
- Install scripts running unreviewed, or a blanket policy approving all of them
- A dependency with no license, no recent release, and a single maintainer

## Checklist

Use this as the release gate. Every item needs evidence, not a verbal assurance.

- [ ] SBOM generated from the same lockfile that built the artifact, in SPDX or CycloneDX, and shipped with the release
- [ ] Lockfile committed, frozen install used in CI, and the lockfile diff reviewed
- [ ] No floating ranges or `latest` tags in production dependencies, base images, or CI actions
- [ ] Install scripts gated: only explicitly approved scripts run, and the policy is recorded in the repo
- [ ] Native audit run against the committed lockfile, no unmitigated reachable critical/high findings
- [ ] Every deferred audit finding has an owner and a review date
- [ ] New dependencies vetted: license, maintenance health, bus factor, install scripts read
- [ ] CI actions pinned to SHAs, jobs on minimal permissions, OIDC instead of long-lived secrets, fork PRs secretless
- [ ] Artifact signed (Cosign/Sigstore) with the expected identity, signature verified at promotion

## Verification

After applying this skill to a change or a release, confirm:

- [ ] The dependency inventory (direct + transitive) is known and the count is stated
- [ ] The SBOM parses, names exact versions, and matches the lockfile's component count
- [ ] `cosign verify` (or the ecosystem equivalent) passes for the release artifact against the expected signer identity
- [ ] The CI audit step is green on the committed lockfile; any deferral has a future review date
