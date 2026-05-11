---
name: browser-testing-with-real-sessions
description: Tests in your real, logged-in browser via Chrome DevTools Protocol. Use when verifying behavior behind auth, against real cookies, or on anti-bot-protected sites where a fresh Chrome instance is rejected, blocked, or shows the wrong UI. Drives the user's actual Chrome (or a long-lived stealth browser) through `browser-harness` so logins, profile state, and session cookies persist across runs.
---

# Browser Testing with Real Sessions

## Overview

Most browser-test tooling launches a fresh Chrome — clean profile, no cookies, no extensions, headless flags exposed. That's perfect for greenfield UI bugs (see [browser-testing-with-devtools](../browser-testing-with-devtools/SKILL.md)) and wrong for everything that requires a real user identity.

This skill closes that gap. Instead of launching a new Chrome, attach to one that's already running — the user's own Chrome, a long-lived remote browser, anything reachable via CDP — and drive it as that user. Cookies persist. Logins persist. localStorage persists. Anti-bot fingerprint diff drops to zero.

The recommended tool is [`browser-harness`](https://github.com/browser-use/browser-harness): a thin Python wrapper over CDP that exposes screenshot-first, coordinate-click primitives. About 1K lines, MIT, no hidden manager layer. It is the *only* tool referenced below — alternatives (Playwright persistent context, Puppeteer `--user-data-dir`) exist but require extra plumbing this skill does not cover.

## When to Use

- Verifying anything behind auth — Stripe, Salesforce, Gmail, internal admin dashboards, SSO-gated apps
- Sites that fingerprint headless / fresh-Chrome and serve a different UI (CAPTCHAs, "verify you're human", silent block)
- Multi-tab user flows where session cookies set in tab A must survive into tab B
- Cookie-consent / paywall walls that won't dismiss in a fresh instance
- Reproducing a bug the user reports in *their* browser, with *their* extensions and state, not a hermetic clone
- Long-running monitors that need the same identity across days (status pages, queue dashboards)

**When NOT to use:** Greenfield UI work with no auth or anti-bot surface. Use [browser-testing-with-devtools](../browser-testing-with-devtools/SKILL.md) — fresh Chrome is faster, more reproducible, and isolates state. Real-session testing trades isolation for fidelity; only pay that price when fidelity is the point.

## Setup

One-time install. Paste this into the agent:

```text
Set up https://github.com/browser-use/browser-harness for me.
Read `install.md` and follow the steps to install browser-harness and connect it to my browser.
```

The agent walks the user through enabling `chrome://inspect/#remote-debugging` (one checkbox, one allow-popup). After that the `browser-harness` CLI is on `$PATH` and persists across sessions. No further config per-task.

For headless/CI or sub-agents that need their own browser, the same CLI talks to a [Browser Use Cloud](https://cloud.browser-use.com) session — `start_remote_daemon("name")` returns a watch-along live URL.

## Process

The full loop, in order. Every action verifies with a screenshot before the next one is trusted.

### 1. Attach + first screenshot

```bash
browser-harness -c '
new_tab("https://app.stripe.com/test/dashboard")
wait_for_load()
capture_screenshot("/tmp/01-arrived.png")
print(page_info())
'
```

`new_tab` opens a fresh tab in the *attached* browser — it does not clobber the user's active tab. `capture_screenshot` writes a PNG you can read back with the agent's image tool. `page_info()` is a "is this even alive" sanity probe.

### 2. Read the screenshot, decide the next click

The agent loads `01-arrived.png`, finds the target's pixel coordinates by sight, and acts. No `getBoundingClientRect`, no selector hunt — the click goes through the compositor and works through iframes / shadow DOM / cross-origin without extra work.

```bash
browser-harness -c '
click_at_xy(820, 240)        # "Customers" sidebar item, read off the screenshot
wait_for_load()
capture_screenshot("/tmp/02-customers.png")
'
```

### 3. Verify state changed before continuing

After every meaningful action: re-screenshot. Compare `01` to `02` — if the page didn't actually change, debug *now*, not three steps later. Common culprits: a modal dialog (see `interaction-skills/dialogs.md`), a stale tab (`ensure_real_tab()`), an offscreen target (`scroll_to_xy()`).

### 4. Drop to DOM only when sight isn't enough

Hidden inputs, 0×0 nodes, computed values, network-shape verification — those need DOM/JS:

```bash
browser-harness -c '
result = js("document.querySelector(\"[data-test=customer-count]\").textContent")
print(result)
'
```

Use this *after* visual confirmation says the right view is loaded. Don't lead with selectors.

### 5. Hand off when blocked, never guess credentials

If the page demands login, 2FA, a CAPTCHA, or any human-in-the-loop step: stop. Surface the live-view URL of the browser session to the user, tell them exactly what's blocking you, wait for "done". The next action picks up from where the user left off, with the new cookies persisted in the profile. Don't type passwords from a screenshot. Don't auto-solve CAPTCHAs.

### 6. Document non-obvious findings

When you discover a stable selector, a hidden API endpoint, or a site-specific quirk, write it into `agent-workspace/domain-skills/<host>/` so the next run skips the rediscovery. Don't write pixel coordinates (they break on layout); do write URL patterns, framework quirks, anti-bot trip-wires.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll just use a test account in a fresh Chrome" | Works for Salesforce. Fails for any site whose anti-bot stack diff-checks fresh-instance fingerprint vs returning-user fingerprint and serves different markup. |
| "Headless is fine — it's the same browser" | Headless flags are detectable; many anti-bot vendors gate features on the absence of those flags. The bug the user reported lives behind that gate. |
| "Tests should be hermetic" | True for unit tests. Integration tests against real third-party services trade hermeticity for fidelity — that's the entire point of running them. |
| "Real-session tests are flaky" | They're flaky when state leaks between runs. Use one persistent profile per intent (CI, dev, monitor) and the flake disappears. |
| "I can mock the auth layer" | You can mock the auth layer your code calls. You cannot mock Stripe's anti-bot heuristics, Salesforce's session-cookie rotation, or your SSO provider's MFA flow. |
| "The CDP attach is a security risk" | The user explicitly opens the port; same trust boundary as a browser extension. Don't run untrusted attach targets — that's the same rule as not running untrusted code. |

## Red Flags

- Typing credentials from a screenshot — always hand off to the user instead.
- Writing fixed pixel coordinates into a domain skill — they break on layout. Save URL patterns and selectors instead.
- Catching anti-bot blocks as "flaky" and retrying — investigate first; retrying a fingerprint-blocked request just trains the block.
- Reading cookies / localStorage tokens out of the page and writing them anywhere — persistent profile is the *only* place auth material belongs.
- Silently launching a fresh Chrome alongside the attached one — defeats the entire skill.
- Ignoring `ensure_real_tab()` warnings — the daemon is telling you the session went stale; fix it before continuing.
- Skipping the post-action screenshot because "it obviously worked" — that is when it didn't.

## Verification

After any real-session-driven change, before reporting success:

- [ ] Screenshot taken before *and* after every meaningful action, both retained
- [ ] Final state compared against the user-described expected state, not just "no error"
- [ ] Page reached the post-auth view (no login wall in the final screenshot)
- [ ] No credentials typed by the agent — all auth completed by the user via live view
- [ ] Network / DOM verification (when used) followed visual confirmation, not the other way around
- [ ] Any stable, non-obvious finding written into `agent-workspace/domain-skills/<host>/`
- [ ] Profile cookies still valid for re-run — if the session expired mid-test, that's the next bug

For fresh-Chrome scenarios (no auth surface, isolation matters), use [browser-testing-with-devtools](../browser-testing-with-devtools/SKILL.md). The two skills are complements, not substitutes.
