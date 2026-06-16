---
name: web-browser-automation
description: Controls a real, persistent browser via the `web` CLI skill to browse, search, inspect, and act on live web pages. Use when you need to fill forms, log into web apps, submit data, scrape dynamic content, or take any action that requires a real browser with JavaScript rendering. Use when a URL alone is insufficient — the page requires interaction, authentication, or JS execution.
---

# Web Browser Automation

## Overview

Use the `web` CLI (WebCLI by DOSAYGO) to operate a real Chromium browser from agent workflows. Unlike headless scrapers or screenshot-based approaches, WebCLI exposes a **structured action tree**: every clickable element, input, and interactive control gets a numbered reference. The agent reads the tree, picks a ref, acts, and re-inspects — a tight look→act→re-inspect loop with no guessing.

**What you get:** persistent tabs, real JS execution, file uploads, multi-frame navigation, and a page state that reflects actual DOM state — not a static snapshot.

## When to Use

- Filling and submitting multi-step web forms
- Logging into web apps (hand off credentials to human via `web human-drives`)
- Scraping pages that require JavaScript or user interaction
- Navigating cloud consoles, dashboards, or SaaS portals
- Uploading files via browser file pickers
- Performing any web task a human would do manually

**When NOT to use:** Static HTML that can be fetched with `curl`. REST APIs that have documented endpoints. Prefer direct API calls when available.

## Setup

Install WebCLI (requires a license from [webcli.sh](https://webcli.sh)):

```bash
npm install -g webcli
web --version
```

Position the browser window at session start (especially important for recordings):

```bash
web resize 1280x900 --move-to 0x0
```

## Core Loop

```bash
web inspect            # 1. Read the current page state (action tree)
web do <ref>           # 2. Click, type, choose, upload, or press by ref number
web inspect            # 3. Re-inspect to confirm state changed
```

Always re-inspect after acting. The ref numbers reset after every page change.

## Process

### 1. Orient

```bash
web inspect            # Check current tab, URL, visible actions
```

Look at the tab list and active URL first. If a file chooser, dialog, or overlay is blocking the page, resolve it before doing anything else.

### 2. Navigate

```bash
web go https://example.com
web tab new https://other.com   # open in a new tab
web tab switch 2                # switch by tab index
```

If navigation is blocked by an auth gate you don't need to complete, escape with:

```bash
web eval "window.location.href = 'https://example.com'"
```

### 3. Read the action tree

```bash
web inspect                     # visible elements only
web inspect --ignore-viewport   # all elements including offscreen
web inspect --verbose           # includes href, aria, extra attributes
web inspect --layer active      # inspect active modal or dropdown
```

Refs are short-lived — re-inspect after every action.

### 4. Interact

```bash
web do <ref>                    # click / interact with element
web type <ref> "text"           # type via keyboard events (triggers React state)
web say <ref> "text"            # paste text (use when type is too slow)
web press Tab                   # keyboard shortcut
web press Enter
web scroll down                 # scroll page
web find "label text"           # find element by visible text
web do <ref> --file /path/file  # supply a file when a file chooser is open
```

### 5. Search and read

```bash
web search "query"              # web search (opens results in current tab)
web read                        # get a plain-text summary of the current page
```

### 6. Hand off to human

```bash
web human-drives    # give control to human (login, MFA, CAPTCHA)
# ... human completes the action in the browser ...
web agent-drives    # take control back
```

Use `human-drives` **only** when a human must complete something (entering credentials, solving a CAPTCHA, approving an OAuth grant). If you accidentally landed on a login page you don't need, navigate away yourself — don't hand off.

## Common Rationalizations

**"I'll just use curl / fetch the HTML."**
Dynamic pages won't render. Forms won't submit. Auth tokens won't persist. Use `web go` and inspect the live DOM.

**"The auth page appeared, I need to hand off."**
Only if you need to authenticate. If you navigated there accidentally, use `web eval "window.location.href='...' "` to leave without handing off.

**"I'll use AppleScript / osascript to move the window."**
Use `web resize WxH --move-to XxY` instead — it's built in and doesn't require system permissions.

**"The ref from my last inspect still works."**
It doesn't. Refs reset after every page change, navigation, or re-inspect. Always use fresh refs.

## Red Flags

- Acting on a stale ref (from a previous `inspect` call) — always re-inspect first
- Calling `web human-drives` when you can just navigate away
- Using `web go` when the page is in an auth gate state (it will be blocked — use `web eval` instead)
- Ignoring `can_scroll_more=true` — there may be more actions below the fold; use `--ignore-viewport`
- Treating `web say` (paste) and `web type` (keyboard events) as equivalent — React forms need `web type`

## Verification

After completing a form or action sequence, confirm the outcome:

```bash
web inspect         # verify new page state, URL, or success message
web read            # read page text to confirm content changed
```

Check: Did the URL change as expected? Is a success message visible? Is the submitted data reflected on the page?
