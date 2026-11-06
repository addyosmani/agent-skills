---
name: credential-liveness-verification
description: Proves stored third-party credentials actually work by separating present from unexpired from authorized. Use when an integration stops working overnight, when a sync, webhook, or scheduled job returns 401 or 403, when a refresh call returns invalid_grant or invalid_client, when a health check reports healthy while real work fails, or before a release that depends on credentials in config, environment, keyring, or a secret store.
---

# Credential Liveness Verification

## Overview

Three states get collapsed into one, and that collapse causes most "it broke overnight" incidents. A credential can be **present** (the file exists, the variable is set), **unexpired** (the recorded expiry is in the future), and **authorized** (a call that needs the real scope succeeds). Only the third state means the integration works. A checker that proves presence and reports health is a calendar check wearing the costume of a health check.

## When to Use

- An integration worked yesterday and fails today
- A 401 or 403 arrives from a service that "was fine"
- A refresh call returns `invalid_grant`, `invalid_client`, or `invalid_scope`
- A health check is green while real work fails
- Before a release that depends on stored credentials
- After rotating a secret, switching accounts, or re-consenting

## Process

### 1. Enumerate every source before diagnosing anything

Print each source and the identity it resolves to, not just whether it is set. Include environment variables, config files, a secrets directory or vault, the CLI credential store, CI secrets, and the OS keyring. Two sources often hold different values for the same service, and the code path you are debugging may not read the one you are looking at.

### 2. Discriminate the credential type before comparing values

An opaque bearer token and a JSON Web Token are different objects and are not interchangeable. Judge by structure, not length: a JWT is three dot-separated base64url segments whose first segment decodes to JSON containing an algorithm and a type. If a store expects a JWT and holds an opaque string, every call fails with a 401 that reads like expiry. Check the shape first, then the value.

The same service may also accept two different kinds of credential: an API key, an OAuth access token, a session cookie. Supplying one where the other is expected produces 401s that survive every refresh.

### 3. Prove liveness with a call that requires the scope you actually need

A profile or metadata endpoint proves the token is alive. It says nothing about whether the token can do the job. Pick the cheapest call that exercises the exact permission the workload uses, and record its status. The distinction is between "valid" and "authorized", and a health check pointed at the wrong endpoint reports healthy while the job fails.

### 4. Treat the API response as authoritative over any recorded expiry

A stored expiry is a time-to-live captured at issuance, not remaining life. The file can claim an hour of validity and the next call can return 401 immediately: revoked, rotated, scope removed, wrong audience, or bound to a different account. The response is the truth. Demote the expiry field to a hint, or delete the check that reads it.

### 5. Read the authorization server metadata before assuming a refresh path exists

`grant_types_supported` says what the token endpoint accepts. `scopes_supported` says what a client may ask for. An authorization server that advertises only a default scope and no offline access is positive evidence that no refresh token will be issued, and retries cannot produce one. The fix is a re-consent with the right scope or a different flow, not another attempt.

### 6. Persist rotation atomically, or the chain dies

Rotating refresh tokens are single-use. Write the replacement before the next call (temp file, flush, atomic rename), and keep exactly one writer. Two processes refreshing the same chain guarantee that one presents a consumed token. The symptom is intermittent `invalid_grant` under concurrency and success when the same code runs alone.

### 7. Record the identity, not just the result

Print who authenticated. Two credentials for the same service can belong to different accounts with different permissions, and "works when I run it by hand" is usually a different account than the one the service uses. This matters twice for read-back checks: a verification that cannot name the identities under test will report an object absent while it is present under another identity the same system legitimately uses, and the count going from zero to one is the tell that the instrument is wrong rather than the object.

### 8. Make the health check fail per state, and never let one mask another

Report missing, expired, unauthorized, and ok as four distinct outcomes with the call that produced each. A checker that returns healthy when the credential file is newer than some number of days is measuring the filesystem. A checker that returns healthy on any response that is not a 5xx is measuring the network.

## Common Rationalizations

| Excuse | Reality |
|---|---|
| "The file says it expires in an hour" | A time-to-live captured at issuance is not remaining life. Make one scoped call. |
| "It worked last week" | Credentials change without the file changing: rotation, revocation, re-consent, scope removal, account switch. |
| "A refresh will fix it" | Only if a refresh token exists and the server accepts that grant. Read the metadata before retrying. |
| "401 means expired" | 401 means the credential was not accepted. Wrong type, wrong audience, wrong account, revoked, and expired all look the same from the outside. Separate them. |
| "The health check is green" | Name the endpoint and the scope it exercises. Without both, it proves nothing. |
| "Both tokens are the same thing" | An opaque token and a JWT are different objects. Check the structure. |
| "I verified it earlier in the session" | Credentials degrade inside a session. Re-probe before the irreversible step, not after. |

## Red Flags

- Code that branches on a stored expiry field instead of a response
- A health check with no authenticated call anywhere inside it
- Credentials validated once at startup and never again
- A refresh result written after the token is already used, or written by more than one process
- "Works when I run it by hand"
- A probe or read-back that cannot name which identity it authenticated as
- Retry loops wrapped around `invalid_grant`
- A token read from a file that was never checked for shape

## Verification

The work is done when all of these hold:

- Every credential source is listed with the identity it resolves to
- Each credential has one recorded scoped call with its status
- Status distinguishes missing, expired, unauthorized, and ok
- The recorded type of each credential matches what the client actually sends
- The refresh path is either proven with a real refresh or documented as unavailable, with the metadata that shows why
- The health check fails on a 401, on an empty value, and on a wrong-type value, proven with fixtures rather than in production

Report the evidence, not the conclusion. A credential that has not answered a scoped call is untested, whatever the file says.
