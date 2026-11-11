---
name: secret-management
description: Manages the full lifecycle of secrets — API keys, tokens, passwords, private keys, and cloud credentials — from detection and storage to rotation, runtime injection, and leaked-secret incident response. Use when adding or changing any credential, API key, or token in a codebase. Use when setting up a vault or secret manager, wiring secrets into CI/CD or Docker, or reviewing a repository for leaked values. Use when a secret may have been exposed in git history, logs, screenshots, or chat, or when rotating credentials after a staff departure or suspected breach.
---

# Secret Management

## Overview

A secret is any value that proves identity or grants access: an API key, a token, a password, a private key, a session cookie, a cloud credential, a webhook signing secret, an encryption key. If someone else learning the value lets them act as you or your service, it is a secret — treat it like one from the moment it is created until the moment it is revoked.

Secrets fail in predictable ways. They get committed to git, pasted into chat, baked into Docker images, logged in error messages, and embedded in URLs. They are created as "temporary" and never rotated. They are shared between services so one leak compromises everything. This skill covers the whole lifecycle — inventory, detection, storage, access, injection, rotation, and incident response — so a secret is never handled by habit or convenience. The generic `security-and-hardening` skill covers application security broadly; this skill goes deep on one thing: keeping credentials out of every place they do not belong and recoverable when they escape.

## When to Use

- Adding, changing, or removing any API key, token, password, private key, or cloud credential
- Setting up a vault or secret manager (HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, Google Secret Manager, 1Password, Doppler, Infisical) for a project
- Wiring secrets into CI/CD, Docker, Kubernetes, or any deployment
- Reviewing a repository, pull request, log file, or screenshot for leaked values
- Rotating credentials — scheduled rotation, after a staff departure, or after a suspected leak
- Designing how a service authenticates to another service (machine-to-machine auth)
- Handling a suspected or confirmed secret exposure
- Onboarding a new developer or service that needs access to existing secrets

### Not for

- Password hashing for user accounts — that is application security; see `security-and-hardening`
- General authentication and authorization design (OAuth flows, session management) beyond credential handling
- Compliance certification paperwork — this skill gives you the practices; your auditor defines the evidence

## Process

Follow these steps in order whenever you introduce, move, or change a secret. Skipping ahead to "just get it working" is how secrets end up in git.

### Step 1 — Inventory every secret before you touch any of them

1. **List all secrets the system uses.** Walk the codebase, the deployment configs, and the CI settings. Every API key, database password, signing key, webhook secret, and cloud credential goes on the list. If you cannot name a secret, you cannot rotate it or revoke it.
2. **For each secret, record:** what it grants access to, which service or person holds it, where it is stored, when it was created, when it last rotated, and who can revoke it. A secret with no owner and no revocation path is a liability, not an asset.
3. **Classify by blast radius.** A read-only key for a public weather API is not the same as a production database password or a cloud root credential. Spend your effort where a leak hurts most: production, payment, and infrastructure credentials first.
4. **Delete secrets you no longer need.** Unused keys for dead integrations, old deploy tokens, test accounts nobody remembers — revoke them. The smallest inventory is the safest inventory.

### Step 2 — Decide where each secret lives

1. **Production and shared secrets live in a vault or managed secret manager** — HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, Google Secret Manager, or a team password manager such as 1Password for human-held credentials. The vault encrypts at rest, controls who can read what, and logs every access.
2. **Local development secrets live in a `.env` file that is never committed.** One file per developer, one file per machine. It holds only what that environment needs.
3. **Never store a secret in:** source code, committed config files, Docker images, build artifacts, chat messages, tickets, screenshots, emails, or URLs. If a value appears in any of those places, treat it as leaked and go to Step 8.
4. **Separate secrets per environment.** Development, staging, and production each get their own credentials. A dev key must never unlock production. If a staging database password works in production, the separation is fiction.
5. **Prefer managed rotation where the platform offers it.** AWS Secrets Manager, Azure Key Vault, and Vault can rotate database and cloud credentials automatically. Use the platform feature instead of a manual process nobody runs.

### Step 3 — Set up `.env` hygiene

1. **Add `.env` (and `.env.*` except `.env.example`) to `.gitignore` on day one**, before the first secret exists. Verify with `git status` that the file is ignored — do not assume.
2. **Ship a `.env.example` with placeholder values only.** It documents which variables the app needs and what format they take. Placeholders look like `DATABASE_URL=postgres://user:password@localhost:5432/app` — obviously fake, never a real value.
3. **Fail fast on missing variables.** At startup, validate that every required secret is present and non-empty, and exit with a clear error naming the variable — not a cryptic failure ten minutes later. Never fall back to a hardcoded default secret.
4. **Never log a secret.** Sanitize error messages, request logs, and debug output. Redact values that look like tokens or keys before they reach a log line. If a log already contains one, treat it as a leak.

### Step 4 — Scan for leaks before they ship

1. **Run a secret scanner on every commit and every pull request.** gitleaks, trufflehog, and git-secrets are the common tools; pick one and make it a merge gate, not an optional check. A scan that warns but still merges is decoration.
2. **Scan git history, not just HEAD.** Removing a secret from the current code does not remove it from history — anyone who clones the repo can still read it. Run the scanner across all branches and all history at least once per repository, and after any suspected leak.
3. **Scan container images and build artifacts.** A secret baked into a Docker layer survives even if you delete it from the source file. Scan the built image before pushing it to a registry.
4. **Scan logs and error output.** Keys appear in stack traces, request dumps, and verbose debug output. Periodically grep logs for high-entropy strings and known key prefixes (`sk-`, `AKIA`, `ghp_`, `xoxb-`).
5. **Act on every finding the same day.** A scanner alert that sits unread for a week is the same as no scanner. Triage it: real secret or false positive, and if real, go to Step 8.

### Step 5 — Grant access by least privilege

1. **Only the services and people that need a secret get it.** A frontend service does not need the database password. A CI job that runs tests does not need production deploy keys.
2. **Scope every token as narrowly as the platform allows.** Read-only where read-only is enough. A single repository instead of the whole organization. An expiry date instead of forever.
3. **Never share one secret across services.** Each service gets its own credential. When one service is compromised, you revoke its key without breaking the others — and the access logs tell you exactly which service was abused.
4. **Prefer short-lived credentials.** OIDC federation in CI (GitHub Actions, GitLab CI) issues tokens that live for minutes instead of long-lived keys that live for years. Temporary cloud credentials from an identity provider beat a static access key in every way that matters.
5. **Audit who can read what, regularly.** Vault access logs and cloud IAM reviews are the check. A developer who left the team six months ago should not still hold the production keys — remove access on departure, the same day, and rotate the secrets they could have seen.

### Step 6 — Inject secrets at runtime, never at build time

1. **Build-time secrets and run-time secrets are different things.** A build needs a package-registry token to install dependencies; the running app needs its database password. Neither belongs in the image.
2. **Never bake a secret into a Docker image.** Do not `COPY .env` into an image, do not `ARG` a secret into a `RUN` step (it stays in the layer history), and do not embed keys in a compiled binary that ships to users. Use multi-stage builds and secret mounts (BuildKit `--mount=type=secret`) for anything the build itself needs, so the value never lands in a layer.
3. **Inject at runtime through one of these, in order of preference:**
   - The platform's secret store (Kubernetes Secrets with a vault injector, ECS secrets, Cloud Run Secret Manager integration)
   - Environment variables supplied by the orchestrator or process manager
   - A file mounted into the container at runtime (e.g. a tmpfs mount), read once at startup
4. **Keep secrets out of client-side code entirely.** Anything shipped to a browser or a mobile app is public. A key in JavaScript, a mobile binary, or a frontend bundle is a published key. Client-side code gets only public, revocable, tightly-scoped keys — or better, calls your own backend, which holds the real secret.
5. **Never put a secret in a URL or query string.** URLs are logged by proxies, stored in browser history, and shared in screenshots and tickets. Pass tokens in headers or request bodies instead.

### Step 7 — Rotate on a schedule, and test the rotation

1. **Rotate on a fixed schedule.** Ninety days is a common default for long-lived credentials; high-privilege credentials rotate more often. Put the date on a calendar or in the vault's rotation policy — a rotation nobody schedules never happens.
2. **Rotate immediately on these triggers:** a staff departure, a suspected leak, a vendor breach notification, a lost laptop, or a repository going from private to public.
3. **Rotate without downtime using dual-active secrets.** Issue the new credential while the old one still works, deploy the new one everywhere, verify the new one is actually being used, then revoke the old one after a grace period. Revoking first and deploying second is an outage with extra steps.
4. **Test the rotation before you need it for real.** An untested rotation runbook fails at 2 a.m. during an incident. Run the procedure in staging, time it, and write down what broke.
5. **Know what breaks when rotation is skipped.** A leaked key that never rotates is an open door with no expiry date. An expired key nobody rotated is an outage. Both failure modes are prevented by the same habit: rotation as routine, not as emergency.

### Step 8 — Handle a leaked secret as an incident

1. **Revoke or rotate the secret immediately — before investigating.** Every minute a leaked key stays valid is a minute it can be used. Assume it has been used until the logs prove otherwise.
2. **Check access logs for misuse.** Look at what the credential did since the leak: which resources were accessed, from where, and whether anything was created, changed, or exfiltrated. CloudTrail, vault audit logs, and API provider dashboards are the sources.
3. **Purge the value from every place it spread.** Git history, CI logs, chat messages, screenshots, tickets, cached artifacts, container images. This is the slow part — a secret copied into ten places needs ten cleanups.
4. **Decide about git history rewriting deliberately.** Rewriting history with `git filter-repo` or BFG removes the value from the repo, but it rewrites every commit after the leak, invalidates open pull requests, and forces every collaborator to re-clone. It is a last resort that requires coordinating with the whole team — and it does not help at all if anyone already cloned the repo or if the value was copied elsewhere. Revocation first, history rewrite second, and only with the team aligned.
5. **Notify affected parties.** If customer data could have been accessed, the people responsible for disclosure need to know promptly. Do not sit on a leak while deciding whether it matters.
6. **Write a short postmortem.** How did the secret get there, how long was it exposed, what was accessed, and what changes so it cannot happen the same way again. File the fix — scanner rule, `.gitignore` entry, CI gate — in the same change as the postmortem.

### Step 9 — Lock down CI/CD secrets

1. **Use masked variables.** CI platforms mask secret values in logs; verify the masking actually works for your values, and never `echo` a secret to debug a pipeline.
2. **Prefer OIDC over long-lived tokens.** Federated identity lets the CI runner request a short-lived credential for exactly one job. No stored key means no stored key to leak.
3. **Never expose secrets to pull-request builds from forks.** A fork PR runs code you have not reviewed; giving it your secrets is giving it your keys. CI platforms disable secrets for fork PRs by default — leave that default alone.
4. **Make secret scanning a merge gate.** The scanner runs on every PR and blocks the merge on a finding. A gate that can be bypassed with a click is a suggestion, not a gate.
5. **Scope CI secrets to the jobs that need them.** A lint job does not need deploy credentials. Environment-scoped secrets (production only, protected branches only) beat repository-wide secrets.
6. **Rotate CI secrets when the pipeline changes hands.** New maintainer, new runner, new cloud account — new credentials.

## What Counts as a Secret

Any value that proves identity or grants access. If in doubt, treat it as a secret.

| Secret | Examples | Never put it in |
|---|---|---|
| API keys | Stripe, OpenAI, AWS access keys | Code, config, logs, URLs |
| Tokens | OAuth access/refresh tokens, JWT signing keys, CI deploy tokens | Client-side code, localStorage |
| Passwords | Database, admin, service-account passwords | Tickets, chat, screenshots |
| Private keys | SSH, TLS, PGP, signing keys | Repos, images, backups without encryption |
| Session cookies | Auth session values | URLs, logs, error reports |
| Cloud credentials | IAM keys, service-account JSON | Build artifacts, `.env` in git |
| Webhook signing secrets | Stripe/GitHub webhook secrets | Frontend code, public docs |
| Encryption keys | Data-at-rest keys, KMS references | Same repo as the data they protect |

What is **not** a secret: public keys, usernames on their own, non-sensitive configuration (ports, timeouts, feature flags), and placeholder values in `.env.example`. But a username combined with its password is a credential — protect the pair.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It's just a dev key, it doesn't matter." | Dev keys unlock dev systems that hold real data, real cloud spend, and often the same code paths as production. Attackers do not care which environment you meant. |
| "I'll remove it before I commit." | You will forget, once, and that once is the leak. The scanner and `.gitignore` exist because humans forget. |
| "The repo is private, so it's fine." | Private repos get cloned to laptops, forked, made public by accident, and breached. A secret in a private repo is a secret in every clone of that repo. |
| "I deleted it from the file, so it's gone." | Git history keeps every version. Deleting from HEAD removes it from view, not from the repository. |
| "It's only in the Docker image, nobody looks there." | Images are pulled, scanned, shared, and pushed to registries. Layer history is trivially readable. |
| "Rotation is too risky — something might break." | Rotation breaks things only when it is untested. Untested rotation during an incident breaks things worse, at 2 a.m., with an attacker already inside. |
| "We use one shared key because it's simpler." | One shared key means one leak compromises every service, and you cannot tell from the logs which service was abused. |
| "The scanner has too many false positives, so we ignore it." | Tune the scanner's allowlist for the known false positives. Ignoring the scanner means ignoring the real finding buried in the noise. |
| "I'll rotate it after the launch." | After the launch there is always another launch. The secret stays, the launch ships, and the key is still the one from the first week of the project. |

## Red Flags

- A real-looking key, token, or password visible in a pull request diff
- `.env` present in `git log`, in a Docker layer, or in a deployed artifact
- Secrets referenced by value instead of by name in code or config (`api_key = "sk-..."`)
- One credential used by multiple services or environments
- A credential with no creation date, no owner, and no rotation history
- CI logs showing a secret value in plain text, or a pipeline that `echo`s variables for debugging
- Secrets in URLs, query strings, or `Referer` headers
- Client-side code containing anything more powerful than a public, scoped key
- A "temporary" key that is months old and load-bearing in production
- Screenshots, tickets, or chat messages containing credential values
- No one on the team can say who can revoke a given production credential
- A repository that went from private to public without a full history scan first

## Verification

After completing this skill's process, confirm:

- [ ] Every secret in the system is inventoried, with an owner and a revocation path
- [ ] No real secret exists in source code, committed config, git history, Docker images, logs, or chat
- [ ] `.env` is in `.gitignore` and verified ignored; `.env.example` contains placeholders only
- [ ] A secret scanner runs on every commit and PR and blocks merges on findings
- [ ] Production secrets live in a vault or managed secret manager, not in files or env dumps
- [ ] Dev, staging, and production use separate credentials
- [ ] Each service holds its own scoped credential — no shared secrets across services
- [ ] CI uses OIDC or short-lived credentials where supported; fork PRs receive no secrets
- [ ] A rotation schedule exists and the rotation procedure has been tested in staging
- [ ] Access logs for secret reads are enabled and reviewed
- [ ] The leaked-secret runbook (revoke, check logs, purge, notify, postmortem) is written down and the team knows where it is

## Checklist — New Project Setup

Use this when starting a project or onboarding a secret into an existing one:

1. Create the vault or secret-manager store for the project
2. Add `.env` to `.gitignore` before writing the first secret
3. Write `.env.example` with placeholders and a comment per variable
4. Add startup validation that fails fast on missing required variables
5. Enable the secret scanner in CI as a merge gate
6. Create separate credentials per environment
7. Record each secret's owner, scope, creation date, and rotation date
8. Confirm no secret is baked into the Docker image or build artifact
9. Confirm fork PRs cannot access CI secrets
10. Schedule the first rotation date before the project ships
