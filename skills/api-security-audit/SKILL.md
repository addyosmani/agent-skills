---
name: api-security-audit
description: Audits and tests a REST, GraphQL, or webhook API for security flaws. Use when testing whether one user can read or change another user's data through an API, when reviewing authentication, tokens, or OAuth flows, or when probing for mass assignment, rate-limit, or business-logic flaws. Use when webhooks need signature and replay verification, or when writing a report with proof-of-concept requests.
---

# API Security Audit

## Overview

An API security audit tests the API the way an attacker would use it: by sending real requests and watching what the server allows, not by assuming the code's checks work. The frontend is never the security boundary — anything the UI hides, disables, or validates can be bypassed by calling the endpoint directly. If a check only exists in JavaScript, it does not exist.

This skill is the testing specialty next to `security-and-hardening` (which covers building secure code). This one covers attacking a live API surface — mapping it, breaking its auth, abusing its business rules, and proving each finding with a reproducible request/response pair, grounded in the OWASP API Security Top 10 (2023).

Three rules govern the whole audit:

1. **Get authorization in writing before testing anything you do not own** — a bug bounty scope list, a signed testing agreement, or the owner's explicit permission. Prefer staging; in production, stay in scope and never touch other users' real data.
2. **Prove it with two accounts.** Most API authorization flaws are invisible with one account. You need user A and user B, each with their own credentials, so you can show that A's token reaches B's data. A finding you cannot reproduce is a hypothesis, not a report.
3. **One finding, one report.** A report bundling five issues gets closed as "informative" or bounced for triage confusion. Each vulnerability gets its own report, its own proof, and its own fix.

## When to Use

- Testing whether one authenticated user can access another user's objects (orders, invoices, files, messages, settings)
- Reviewing or attacking an API's authentication: JWTs, opaque tokens, API keys, sessions, OAuth 2.0
- Probing for mass assignment, parameter tampering, or fields the client should never control (roles, prices, flags)
- Checking rate limits, enumeration, pagination abuse, or expensive queries usable as denial of service
- Auditing business logic: prices, quantities, discounts, state transitions, refunds, race conditions
- Verifying webhook receivers: signature checks, replay protection, duplicate delivery, secret rotation
- Reviewing what an API returns: excessive fields, internal errors, GraphQL introspection and query cost
- Checking whether old API versions, debug endpoints, or undocumented routes are still live
- Writing a vulnerability report with a reproducible proof of concept

## Process

### Phase 1 — Recon: map the real API surface


1. **Collect the documented surface.** Get the OpenAPI/Swagger spec, the Postman collection, the GraphQL schema, and the API docs. If the spec is served at runtime (`/openapi.json`, `/swagger.json`, `/v3/api-docs`), fetch it — it often describes endpoints the docs page hides.
2. **Discover what the docs omit.** Drive the real client through a proxy and record every request it makes. Endpoints the client calls that are not in the spec are shadow endpoints. Also probe `/api/docs`, `/graphql`, `/actuator`, `/health`, `/metrics`, `/debug`, `/.well-known/`, and versioned prefixes (`/v1/`, `/v2/`).
3. **Enumerate versions.** Old versions rarely die; they linger with weaker authentication, missing authorization checks, or deprecated fields. Test every version. If v2 requires a scope that v1 never checked, v1 is the vulnerability.
4. **Hunt for admin and debug endpoints.** Try `/admin`, `/internal`, `/debug`, `/test`, `/api/admin`, `/actuator/env` with a low-privilege token. A 404 is fine; a 200, or a 403 that differs from the 404 shape, tells you the endpoint exists.
5. **Build an inventory table.** One row per endpoint: method, path, auth required, roles allowed, parameters, documented or not. Every row gets tested; "undocumented" or "legacy" rows get tested first.

### Phase 2 — Authentication

1. **Identify the token type.** JWT (three base64 segments), opaque bearer token, API key in a header, API key in a query string, session cookie, or OAuth access token. Each has its own failure modes; test the ones that apply.
2. **JWT checks.** Decode the header and payload, then send mutated tokens: `alg: none` with an empty signature (acceptance = broken auth); an RS256 token re-signed with HS256 using the public key as the HMAC secret; a claim flipped (`sub` to another user, `role` to `admin`) without re-signing (acceptance = signature not verified); `exp` stripped or set far in the future (stolen tokens never die); and, for HS256, common secrets tried offline — a guessable signing secret is a master key. The payload is base64, not encrypted, so check for anything that should not be client-visible.
3. **Tokens in URLs.** Tokens in query strings land in server logs, browser history, referer headers, and analytics. Flag any flow that puts a bearer token, API key, or reset token in a query string. Tokens belong in the `Authorization` header.
4. **Sessions and API keys.** Log in, log out, replay the old token — it must be dead. Change your password, replay the old session — it must be dead. Cookies must be `httpOnly`, `secure`, and `SameSite=Lax` or `Strict`; refresh tokens must rotate, and reusing one should invalidate the whole token family. Search the client bundle, mobile app, and public repos for hardcoded API keys — a key shipped in client-side JavaScript is a public key. Check keys are scoped and revocable.
5. **OAuth flows (RFC 6749 / RFC 6750).** Test `redirect_uri` validation with an attacker-controlled domain, subdomain, open-redirect path, or host-confusion trick (`https://app.example.com@evil.example.com`) — a loose match leaks the authorization code. On public clients (mobile, SPA), the code exchange must require PKCE; without it, a stolen code is usable. `state` must be random, per-request, and bound to the session, or CSRF on login is possible. Request a broader scope than granted; try one client's token against another client's endpoints. Tokens in the URL fragment (implicit flow) are exposed to page scripts and history — recommend authorization code with PKCE.

### Phase 3 — Authorization: the two-account test

1. **Set up two accounts.** User A and user B, both low-privilege, both fully registered. Create resources as each (an order, a document, a profile, a payment method) and record each user's object IDs.
2. **BOLA / IDOR — object-level authorization.** Take an endpoint that returns or modifies a single object (`GET /api/orders/{id}`, `PUT /api/users/{id}`, `DELETE /api/files/{id}`). As user A, request B's object ID, then the other way. Also try sequential IDs, UUIDs from your own responses, IDs in the body instead of the path (`{"orderId": <B's id>}`), and IDs in headers, query parameters, or through a different endpoint (B's invoice ID at the download endpoint). A successful read is a finding; a successful write or delete is critical.
3. **BFLA — function-level authorization.** Call every admin-only endpoint from your inventory (user management, role changes, refunds, config, bulk export) as a low-privilege user, then with no token at all. A 200 where a 403 belongs is a finding even if the response looks harmless.
4. **Horizontal vs. vertical escalation.** Horizontal: A reaches B's data at the same privilege level (BOLA). Vertical: a regular user reaches admin functions or data (BFLA, role tampering). Name which one you found — different fixes, different severities.
5. **Test every method on the same path.** An endpoint may check authorization on `GET` but not on `PUT` or `DELETE` for the same resource. Test all methods the route accepts, including `PATCH`.
6. **Test the negative space.** Some endpoints authorize the parent but not the child: you can list your own project, but can you fetch a task inside someone else's project by ID, or comment on a private document you were never shared on? Nested resources are a classic blind spot.

### Phase 4 — Input handling and mass assignment

1. **Mass assignment.** Take a normal update request (`PUT /api/users/me {"name": "A"}`) and add fields the client never sends: `role`, `isAdmin`, `isVerified`, `balance`, `price`, `status`. Try all forms, on creation endpoints and nested objects (`{"profile": {"role": "admin"}}`). If any extra field sticks — verify by reading the object back — it is a finding.
2. **Type confusion.** Send a string where a number is expected, an array where a scalar is expected, an object where a string is expected, a number where a boolean is expected. Watch for 500s, coercion that changes meaning, and array injection (`{"role": ["admin"]}`) that bypasses a string comparison.
3. **Schema validation gaps.** Send oversized strings (10k, 1M characters), negative numbers, zero where a positive is required, nulls, empty objects, and extra unknown fields. Missing validation on one endpoint while its sibling validates is a pattern worth reporting.
4. **Injection through API fields.** Where input reaches a query, shell, template, or downstream service, test the standard injection classes (SQL/NoSQL, command, template, LDAP) — but keep it non-destructive: use a benign probe that shows an error-shape change, not a data dump, and stop at proof of injection. Never exfiltrate data you are not authorized to see.

### Phase 5 — Rate limiting and resource abuse

1. **Map the limits per endpoint.** Hit login 20 times fast with wrong passwords, hit password-reset repeatedly, burst a search endpoint. Record status codes and headers (`Retry-After`, `X-RateLimit-*`). Auth, OTP, and email-sending endpoints matter most.
2. **Test what the limit keys on.** Per-account, per-IP, or per-token? An IP-only limiter is bypassed by rotating IPs, and in a shared-IP environment one abusive user locks out everyone behind the same NAT.
3. **Enumeration.** Sequential IDs, order numbers, invoice numbers, usernames, emails: can you walk them and distinguish "exists" from "does not exist" by response code, timing, or error message? A password-reset endpoint that says "user not found" for one address and "email sent" for another is a user-enumeration oracle — as is a login that says "wrong password" vs. "no such user".
4. **Pagination and cursor abuse.** Request `?page=-1`, `?limit=1000000`, `?offset=-5`, and a forged cursor token. A huge honored page size lets you pull the whole table in one request; a predictable or unsigned cursor (a base64-encoded offset, a raw timestamp) can be forged to jump to arbitrary positions.
5. **Expensive queries as DoS.** Deep filters, unbounded date ranges, wildcard searches, sorting on unindexed fields, deeply nested GraphQL queries (see Phase 8). One expensive request repeated a few dozen times is often enough to degrade the service — measure response time, do not take the service down.
6. **File upload abuse.** Upload a file with a spoofed extension and content type, an oversized file, a path-traversal name (`../../evil`), an SVG with embedded script, and a polyglot. Check where the file is stored, whether it is served from the same origin (stored XSS), and whether any content check runs at all.

### Phase 6 — Business logic

1. **Price, quantity, and discount manipulation.** Change the price, quantity, or currency in the checkout request. Try negative quantities (a refund in disguise), zero or fractional quantities, and a quantity larger than stock. Apply a discount code twice, stack two codes, reuse a single-use or expired code, or apply a coupon meant for another user or region. Refund an order and check whether goods or credit are kept.
2. **State-machine bypass.** Map the intended order (cart → checkout → payment → confirm → ship), then skip a step: confirm without paying, ship an unpaid order, call payment twice, call "complete" on an already-completed workflow. Replay a completed step (payment callback, webhook) and see whether the effect happens twice.
3. **Race conditions.** Send two identical requests at the same time: two withdrawals, two coupon redemptions, two seat reservations. If the server checks the balance and then deducts it without a lock or transaction, both can succeed — a double-spend. Use a small parallel burst (5–10 requests), not a flood; you are proving a logic flaw, not load-testing.
4. **Workflow constraints.** Can a user approve their own request? Can a reviewer edit a submission after review? Can a booking be moved into the past, or a deadline extended by editing a date field the client controls? Every "the UI doesn't allow it" is a test case for the API.

### Phase 7 — Webhooks

1. **Signature verification.** Send a payload with no signature, a wrong signature, a signature computed with the wrong secret, and a valid signature with a tampered body. The receiver must reject all but the last. The standard is HMAC-SHA256 over the raw body — not the parsed JSON, since re-serialization changes whitespace and breaks the hash.
2. **Timestamp tolerance and replay protection.** Replay a genuine, previously delivered webhook minutes or hours later. If it is accepted again, there is no replay protection. Check whether the signature includes a timestamp and whether the receiver rejects timestamps older than a few minutes. A signature without a timestamp is replayable forever.
3. **Endpoint authentication.** Webhook endpoints must not accept unsigned calls from anyone who can forge events (fake "payment succeeded", fake "subscription cancelled").
4. **Retries and duplicate delivery.** Providers retry failed deliveries. Send the same event twice and confirm the receiver is idempotent — a second "payment succeeded" must not credit the account twice. Check for an idempotency key or event-ID deduplication.
5. **Secret rotation.** Ask how webhook secrets are rotated and whether old secrets stop working. A secret that cannot be rotated cannot be revoked after a leak. Check the secret is not shared across environments — a staging secret must not validate production events.

### Phase 8 — Output and data exposure

1. **Excessive data exposure.** Compare what the endpoint returns with what the client actually displays. Extra fields — internal IDs, other users' emails, password hashes, tokens, internal flags, soft-deleted records, draft content — are exposure even if the UI never shows them.
2. **Error messages.** Trigger errors deliberately: bad IDs, malformed JSON, missing fields, unauthorized access. A 500 returning a stack trace, SQL error, file path, or framework version leaks internals. A 404 that differs between "exists but forbidden" and "does not exist" is an enumeration oracle (see Phase 5).
3. **Verbose status codes.** A `403` on one object and a `404` on another for the same caller leaks existence. Consistent error shapes (same code, same generic body) for all authorization failures is the fix.
4. **GraphQL specifics.** Run introspection (`{ __schema { types { name } } }`) — if it works in production, the whole schema, including admin mutations, is public. Test query depth and complexity: deeply nested queries and aliased batching can exhaust the server; check for depth limits, cost analysis, and per-query timeouts. Test field-level authorization inside resolvers, not just at the query root: a `user` query may be protected while a nested `user.orders` field is not.
5. **Sensitive data in responses.** Search responses for tokens, secrets, API keys, and internal URLs. Check response headers too (`Server`, `X-Powered-By`, debug headers, internal IPs in `Location`).

### Phase 9 — Versioning and deprecation
1. **Old versions still live.** Test the oldest version you can reach — old versions often predate the current auth checks, rate limits, and validation. A v1 that still accepts a deprecated auth scheme is a live bypass for v2's controls.
2. **Sunset discipline.** Check for `Sunset` and `Deprecation` headers, and whether deprecated endpoints actually stop working on the announced date. An endpoint deprecated a year ago that still returns 200 is unmaintained attack surface. Confirm the old version does not silently accept new field names or expose new privileged fields through the old contract.

### Phase 10 — Reporting

1. **One finding per report.** Never bundle. Each report has one vulnerability, one proof, one fix.
2. **Structure every report the same way:**
   - **Title:** specific and searchable — "BOLA: user A can read user B's invoices via GET /api/v2/invoices/{id}" beats "IDOR vulnerability".
   - **Summary:** one paragraph, plain language, what happens and why it matters.
   - **Impact in business terms:** not "CVSS 7.5" alone — "any authenticated user can read every customer's invoice, including billing addresses and payment references." Tie it to money, data, or reputation.
   - **Steps to reproduce:** numbered, exact, from a clean state, with the raw request and raw response. Use your two test accounts.
   - **Proof:** the response showing the cross-account access, the price change that stuck, the double credit. Screenshots help; raw HTTP is better — unambiguous and replayable.
   - **Fix guidance:** concrete, not generic — "add an ownership check after loading the resource: `if invoice.user_id != current_user.id: return 403`", plus the general principle (authorize every object access, allowlist mass assignment, enforce server-side price lookup).
   - **Severity:** honest, not inflated. Reading another user's display name is not critical; writing to their payment method is. Inflated severity burns triage trust.
3. **Retest after the fix.** Replay the exact proof request against the fixed version and confirm it now fails with a 403 or 404. A fix that only hides the endpoint from the UI is not a fix — the API must reject the request.

## Checklist

- [ ] API inventory built: documented, undocumented, versioned, admin, and debug endpoints listed
- [ ] Two test accounts created (A and B) with resources owned by each
- [ ] JWT flaws tested: alg=none, algorithm confusion, tampered claims, missing/weak expiry, weak signing secret
- [ ] BOLA/IDOR tested on every single-object endpoint, read and write, both directions (A→B, B→A)
- [ ] BFLA tested: every admin endpoint called as a low-privilege user and unauthenticated
- [ ] Price, quantity, currency, and discount manipulation tested
- [ ] State-machine bypass, replay of completed steps, and race conditions tested
- [ ] Webhook signature, timestamp tolerance, replay, idempotency, and secret rotation tested
- [ ] Excessive data exposure, error leaks, and GraphQL introspection/depth/cost tested
- [ ] Every finding reported separately, with raw request/response proof and business impact

## Common Mistakes

| Mistake | Why it hurts |
|---|---|
| Testing only the happy path | Findings live in the error paths, the skipped steps, and the fields the UI never sends. |
| Trusting client-side checks | Anything enforced only in JavaScript or by hiding a button is not enforced at all. |
| Forgetting the second account | With one account you cannot prove cross-account access. Every authorization test needs A and B. |
| Testing production without authorization | A policy violation at best and a legal problem at worst — and it risks real users' data. Get scope in writing first. |

## Common Rationalizations

| Rationalization | Why it is wrong |
|---|---|
| "The frontend only sends valid values, so the API doesn't need to check" | Attackers don't use your frontend. They send raw requests. Every check that matters must live server-side. |
| "This endpoint is internal, nobody outside will find it" | Internal endpoints leak through client bundles, mobile apps, error messages, and logs. If it is reachable, it is part of the attack surface. |
| "We have rate limiting on the login endpoint, so enumeration is covered" | One protected endpoint does not cover the other forty. Each endpoint needs its own limit, tested individually. |
| "JWTs are signed, so the token can't be abused" | A signed token is still valid if it never expires, is never revoked, or carries more privilege than the caller should have. |
| "Our webhooks are fine — the URL is secret" | A secret URL is not authentication. Without signature verification and replay protection, anyone who learns the URL can forge events. |
| "Mass assignment isn't a risk, our framework ignores extra fields" | Verify that claim with a test. Many frameworks bind extra fields silently, and one config change can turn a safe default into an open one. |

## Red Flags

- An endpoint that returns a different user's data when the ID in the URL is changed
- An admin-only action that succeeds with a regular user's token
- A request body that accepts fields the UI never sends, and those fields take effect
- No rate limit on any endpoint that returns user data or sends email/SMS
- A webhook endpoint that accepts unsigned or replayed payloads
- Error responses that include stack traces, SQL, or internal paths
- A v1 endpoint with weaker auth still live after v2 shipped
- A JWT accepted after logout, after password change, or with no expiry
- Pagination that accepts negative offsets or page sizes in the thousands

## Verification

After the audit, confirm the work holds up:

- [ ] Every endpoint in the inventory was tested, or is explicitly listed as untested with a reason
- [ ] Every finding replays from a clean state using only the steps in its report
- [ ] Every report names the exact endpoint, request, and response that proves it
