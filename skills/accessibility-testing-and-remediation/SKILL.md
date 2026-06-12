---
name: accessibility-testing-and-remediation
description: Tests, audits, and remediates accessibility (a11y) issues in web interfaces. Use when performing accessibility audits, fixing WCAG violations, writing automated a11y tests, configuring aria attributes, or verifying keyboard and screen reader support.
---

# Accessibility Testing and Remediation

## Overview

Ensuring web applications meet WCAG 2.1 AA compliance is a standard of engineering quality, legal conformity, and usability. Automated tests catch only 30-40% of accessibility issues; the rest require structured keyboard audits, screen reader validation, and focus control tests. This skill defines a workflow to audit, remediate, and verify accessibility issues in web interfaces.

## When to Use

- Conducting accessibility audits on existing pages or components.
- Fixing Web Content Accessibility Guidelines (WCAG) violations.
- Integrating automated accessibility checks into CI pipelines (e.g., `axe-core`, `pa11y`).
- Designing keyboard interaction models for custom widgets (modals, dropdowns, tabs).
- Remediating contrast, form labeling, and screen reader issues.

**When NOT to Use:**
- Writing backend services, database scripts, or build infrastructure with no user-facing UI.

## Core Process

```
[Automated Check] ──> [Keyboard Navigation Audit] ──> [Screen Reader Audit] ──> [Remediation] ──> [Regression Test]
```

### Step 1: Automated Auditing

Run automated analysis to identify low-hanging fruit (color contrast, missing labels, duplicate IDs, missing alt text).

1. **Run CLI Linters**: Use tools like `pa11y` or `axe-core` to check pages locally.
2. **Review Lighthouse/DevTools Audits**: Inspect accessibility warnings in Chrome/Firefox dev tools.

*Example CLI command:*
```bash
# Run pa11y against a local dev environment
npx pa11y http://localhost:3000/tasks
```

### Step 2: Keyboard and Focus Audit

Every interactive element must be reachable and operable using only the keyboard.

1. **Unplug your mouse** and attempt to navigate the page using only `Tab`, `Shift+Tab`, `Space`, `Enter`, and Arrow keys.
2. **Check for focus indicators**: Ensure a visible border or ring appears around the currently focused element. Never remove focus outlines without a replacement.
3. **Verify focus order**: Focus should flow in a logical, reading-order sequence (top-to-bottom, left-to-right).
4. **Audit focus traps**:
   - For modals/overlays: Focus must be trapped inside the modal when open. It must return to the triggering button when closed.
5. **Ensure no keyboard traps**: A user must never get stuck on an element with no way to tab away.

*Focus trap pattern (React):*
```tsx
import { useEffect, useRef } from 'react';

export function Modal({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements?.[0] as HTMLElement;
    const lastElement = focusableElements?.[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    firstElement?.focus(); // Focus first element on open

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" ref={modalRef} className="modal-overlay">
      <button onClick={onClose} aria-label="Close dialog">×</button>
      {children}
    </div>
  );
}
```

### Step 3: Screen Reader & ARIA Validation

1. **Semantic HTML**: Verify elements match their true purpose. Use `<button>` for actions, `<a>` for navigation, `<main>`, `<nav>`, `<header>`, `<footer>` for landmark regions.
2. **Associative Labels**: Every form control must have a programmatically linked label using `htmlFor`/`for` attributes or `aria-label`.
3. **ARIA Roles**: Only use ARIA roles when native semantic elements cannot satisfy the requirements.
4. **Dynamic Announcements**: Ensure status messages, toasts, or validation errors are announced using `role="status"` or `aria-live="polite"`.

### Step 4: Remediation Phase

1. **Do not use CSS to fix semantic issues**: E.g., don't add click event listeners to a `div` and try to make it look like a button with styling. Swap it for a `<button>`.
2. **Verify contrast ratios**: Ensure text contrast meets WCAG 2.1 AA guidelines (minimum 4.5:1 for standard text, 3:1 for large text).
3. **Use fluid typography**: Ensure text containers can scale up to 200% zoom without cutting off or overlapping text.

### Step 5: Regression Testing

Write regression tests using testing frameworks (like Playwright, Cypress, or Jest-Axe) to assert that common components remain accessible.

*Example Playwright Axe test:*
```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Task Manager Accessibility', () => {
  test('should not have any automatically detectable WCAG AA violations', async ({ page }) => {
    await page.goto('http://localhost:3000/tasks');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag21a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The page scored 100 on Lighthouse, so it's fully accessible." | Lighthouse only runs automated checks, missing keyboard trap issues, reading order flaws, and screen reader pronunciation mistakes. |
| "I'll just add `tabindex="1"` (or higher) to fix the focus order." | Positive tabindex values break the natural document tab order, creating chaotic navigation paths. Only use `tabindex="0"` or `tabindex="-1"`. |
| "Focus outlines ruin the UI design, so I'll disable them with CSS." | Removing outlines isolates keyboard-only users, who will have no visual cue of where they are on the page. Use custom `:focus-visible` styles instead. |
| "Placeholder text is enough to act as an input's label." | Placeholders disappear when a user types and are ignored by many assistive devices. Always provide a visible `<label>` or explicit `aria-label`. |

## Red Flags

- Click listeners on non-interactive elements (`div`, `span`, `p`) without keyboard listeners (key down/up for Enter and Space) and `tabindex="0"`.
- CSS files containing `outline: none` or `outline: 0` without active `:focus-visible` alternatives.
- Forms where inputs lack associated `<label>` elements or unique ID links.
- Use of color alone to convey states (e.g., marking required fields in red with no text or asterisk).
- Skipping heading hierarchy levels (e.g., `<h1>` followed directly by `<h4>`).

## Verification

After remediating a page or component:

- [ ] Interactive elements are reachable by sequential keyboard navigation (`Tab` and `Shift+Tab`).
- [ ] No keyboard traps: user can enter and leave all sections via keyboard.
- [ ] Focus outlines are highly visible on all focusable elements during navigation.
- [ ] Native HTML tags are used for semantic actions (e.g., `<button>` instead of styled clickable `<div>`s).
- [ ] Automated accessibility scans (e.g. `axe-core`, `pa11y`) yield zero violations.
- [ ] All inputs have programmatically associated labels.
- [ ] Dynamic status changes (toasts, validation errors) are announced to screen readers (`aria-live`).
- [ ] Layout behaves correctly when zoomed to 200%.
