// Task Ledger — durable work state for this repo.
// Format: one record per task. Status: todo | doing | blocked | done.
// History is append-only: add dated notes, never rewrite receipts.

## T-001: Add capitalize()

- **Status:** done
- **Depends on:** —
- **Updated:** 2026-09-02
- **Acceptance:** capitalize('hello world') === 'Hello world'; empty string safe
- **Receipt:** commit 4f21ab9 — src/capitalize.test.js "capitalizes first letter" green

## T-002: Handle emoji initials

- **Status:** blocked
- **Depends on:** —
- **Updated:** 2026-09-05
- **Acceptance:** capitalize('👍 ok') capitalizes without corrupting the emoji
- **Blocked because:** product decision pending on whether emoji-led notes should be title-cased at all (asked in #design 2026-09-05). Unblocked when product answers.

## T-003: Add trim option to capitalize()

- **Status:** todo
- **Depends on:** T-001
- **Updated:** 2026-09-05
- **Acceptance:** capitalize('  hi ', { trim: true }) === 'Hi'; default (no opts) behavior unchanged: capitalize('  hi ') === '  Hi '; test added for both

## T-004: Deprecate capitalizeWords()

- **Status:** todo
- **Depends on:** T-003
- **Updated:** 2026-09-05
- **Acceptance:** capitalizeWords throws a deprecation notice pointing at capitalize; release notes updated

## T-005: Split fixture data out of tests

- **Status:** doing
- **Depends on:** —
- **Claimed by:** session 2026-09-05 (notes-app agent)
- **Updated:** 2026-09-05
- **Acceptance:** test fixtures live under src/fixtures/, tests import from there
