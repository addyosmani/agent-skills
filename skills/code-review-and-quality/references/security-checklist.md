# Security Review Checklist

Run this alongside the Security axis of the five-axis review for any change
that touches input handling, data flow, authentication, dependencies, or
anything deployable. Lead with what matters: a confirmed vulnerability is a
**Critical:** finding regardless of diff size.

## Secrets & credentials

- [ ] No secrets, tokens, or connection strings in code, logs, or version control
- [ ] Secrets come from environment/config, never hardcoded with fallbacks
- [ ] Log statements cannot leak sensitive values (request bodies, headers, tokens)
- [ ] Error messages returned to clients don't reveal internals (stack traces, paths, SQL)

## Input handling

- [ ] All user input validated and sanitized at the system boundary
- [ ] SQL queries parameterized — no string concatenation anywhere
- [ ] Output encoded to prevent XSS (context-aware: HTML, attribute, JS, URL)
- [ ] Command execution does not interpolate untrusted input
- [ ] File uploads: extension/content validation, size limits, no path traversal
- [ ] External data (APIs, logs, user content, config files, webhooks) treated as untrusted

## Access control

- [ ] Authentication required on every protected route/operation
- [ ] Authorization checked per resource, not just at the endpoint level
- [ ] No IDOR: object access verified against the caller's permissions
- [ ] Sensitive operations require re-auth or elevated checks where appropriate
- [ ] Default is deny; explicit allowlists for anything open

## Data & dependencies

- [ ] Sensitive data encrypted at rest and in transit (TLS everywhere)
- [ ] Dependencies from trusted sources; `npm audit` / equivalent shows no known
      vulnerabilities in the changed set
- [ ] New dependencies justified (see Dependency Discipline in SKILL.md); no
      typosquat-style names or unmaintained packages
- [ ] Lockfile committed and reviewed; no hand-edits

## Common blind spots

- [ ] SSRF: can user-controlled URLs make the server fetch internal resources?
- [ ] Redirects/forwards use validated, allowlisted targets
- [ ] Rate limiting / abuse protection on auth, upload, and mutation endpoints
- [ ] Session and token lifecycle: expiry, rotation, revocation
- [ ] CSRF protection on state-changing requests
- [ ] Cryptography uses vetted libraries — no hand-rolled primitives
- [ ] Debug/backdoor code (test hooks, hardcoded admin paths) removed before merge

## Verdict

- [ ] **Critical** issues: none, or all fixed before merge
- [ ] Security findings labeled with severity and a concrete exploit scenario
- [ ] If a finding is deferred, it has a filed bug with an owner — "later" is not a plan
