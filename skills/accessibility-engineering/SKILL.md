---
name: accessibility-engineering
description: Guides agents through building and auditing accessible interfaces. Use when building UI components, before shipping user-facing changes, or when accessibility (a11y) compliance is required. Use when verifying keyboard navigation, screen reader support, color contrast, or WCAG 2.2 AA compliance.
---

# Accessibility Engineering

## Overview

Accessibility is not a polish step — it's a legal requirement in many jurisdictions, an engineering quality standard, and a prerequisite for shipping. This skill covers the full workflow: building accessible components, auditing existing interfaces, and fixing common violations. The goal is WCAG 2.2 AA compliance verified by automated tools and manual testing.

## When to Use

- Building new UI components or pages
- Before shipping any user-facing change (invoked by `/ship`)
- When a11y issues are reported (e.g., "screen reader can't read this", "keyboard navigation broken")
- When auditing an existing interface for compliance
- When working with forms, modals, navigation, or interactive widgets

**Do NOT use** for backend-only changes, CLIs, or library code with no UI output.

## Workflow

### Phase 1: Build Accessible Components

Follow these rules when creating UI:

**Semantic HTML first. ARIA second.**

```tsx
// Good: native elements have built-in accessibility
<button onClick={handleClick}>Save</button>
<nav aria-label="Main">
  <a href="/tasks">Tasks</a>
</nav>

// Avoid: re-creating native behavior with ARIA
<div role="button" tabIndex={0} onClick={handleClick}>Save</div>
```

**Label every interactive element:**

```tsx
// Visible label
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// Icon-only button
<button aria-label="Delete task">
  <TrashIcon />
</button>
```

**Manage focus for dynamic content:**

```tsx
function Dialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) closeRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <h2 id="dialog-title">Confirm</h2>
      <button ref={closeRef} onClick={onClose}>Close</button>
    </div>
  );
}
```

**Announce dynamic updates:**

```tsx
// Status updates
<div role="status" aria-live="polite">
  {isSaved ? 'Task saved' : 'Saving...'}
</div>

// Error messages
<div role="alert">
  Title is required
</div>
```

**Support keyboard navigation:**

- All interactive elements reachable via Tab
- Focus order matches visual order
- No keyboard traps (always Tab-away-able)
- Custom widgets handle Enter, Escape, Arrow keys
- Visible focus indicator (never `outline: none` without a replacement)

### Phase 2: Run Automated Audit

Execute accessibility checks in this order:

```bash
# Static analysis
npx axe-core http://localhost:3000 --save report.json

# Or use @axe-core/cli for programmatic checks
npx @axe-core/cli http://localhost:3000

# Pa11y for HTML validation
npx pa11y http://localhost:3000
```

Review the violations grouped by severity:
- **Critical** — Blocks screen reader access entirely (missing alt text on info images, empty buttons)
- **Serious** — Makes content difficult or impossible to access (low contrast, missing labels)
- **Moderate** — Causes confusion or extra effort (heading level skips, redundant ARIA)
- **Minor** — Cosmetic or progressive enhancement (missing lang attribute on inner elements)

For each violation, verify it's a real issue (not a false positive) by inspecting the element in the browser.

### Phase 3: Manual Testing

Automated tools catch ~30% of a11y issues. Manual testing catches the rest.

**Keyboard audit:**
1. Tab through every interactive element — can you see where you are?
2. Activate buttons and links with Enter/Space
3. Close modals with Escape
4. Navigate lists with Arrow keys
5. Verify no keyboard traps exist

**Screen reader audit (VoiceOver on macOS, NVDA on Windows):**
1. Navigate by heading (VoiceOver: Ctrl+Option+Cmd+H) — is the structure logical?
2. Navigate by landmark (Ctrl+Option+Cmd+L) — are regions labeled?
3. Navigate by link (Ctrl+Option+Cmd+L, then Tab) — do link descriptions make sense out of context?
4. Interact with a form — are labels announced? Are error messages read?
5. Navigate a dynamic update — are changes announced?

**Visual audit:**
1. Verify color contrast (4.5:1 text, 3:1 large text, 3:1 UI components)
2. Zoom to 200% — does layout break or overlap?
3. Test with forced colors / high contrast mode (Windows High Contrast)
4. Reduce motion (prefers-reduced-motion) — are animations disabled?
5. Test focus visibility — is the focus ring visible against all backgrounds?

### Phase 4: Fix Violations

For each finding, apply the remediation in order:

1. **Fix the root cause** — Replace a `<div>` with `<button>`, add `<label>`, set `alt` text
2. **Add ARIA as bridge** — If native HTML can't express the pattern, add ARIA attributes
3. **Test the fix** — Re-run the automated check and manual verification

Apply the accessibility checklist (`references/accessibility-checklist.md`) as a minimal baseline.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We'll fix a11y later" | Retrofitting accessibility costs 3-5x more than building it in. In many jurisdictions, shipping inaccessible software is a legal liability. |
| "Automated tools caught everything" | Automated tools detect ~30% of WCAG failures. Keyboard and screen reader testing are mandatory. |
| "Screen reader users are a tiny minority" | 15% of the global population has some disability. Accessibility improvements benefit everyone (keyboard nav helps power users, captions help noisy environments). |
| "This is an internal tool, it doesn't need a11y" | Internal tools are subject to the same regulations. Disabled employees and contractors need access. |
| "I'll just use aria-label everywhere" | ARIA is a bridge, not a foundation. Semantic HTML first. Overusing ARIA creates maintenance burden and can make things worse. |
| "The design system handles accessibility" | Design systems provide accessible primitives. How you compose them determines whether the result is accessible. |
| "The audit passed axe-core, so we're done" | Pass axe-core as a smoke test, then test with screen readers and keyboard. A green lighthouse score is not a clean bill of health. |

## Red Flags

- Elements that look clickable but aren't keyboard-focusable
- Color as the sole indicator of state (red for error, green for success)
- Focus outline removed without a visible replacement
- Missing labels on form inputs
- No heading hierarchy or skipped heading levels
- Empty or unlabeled buttons and links
- Modals that don't trap focus or restore focus on close
- No `alt` text on meaningful images (or `alt=""` missing on decorative ones)
- Touch targets smaller than 44x44px on mobile
- Autoplaying video or audio without controls
- Low contrast text (especially on hover, disabled states, placeholders)

## See Also

- `references/accessibility-checklist.md` — Quick reference for WCAG 2.1 AA
- `skills/frontend-ui-engineering/SKILL.md` — Building accessible components from the start
- `agents/accessibility-auditor.md` — Dedicated a11y audit persona for deep reviews

## Verification

After completing the accessibility workflow:

- [ ] Automated audit passes with no Critical or Serious violations
- [ ] All interactive elements are keyboard accessible (Tab, Enter, Escape, Arrow keys)
- [ ] Screen reader can navigate the page by heading, landmark, and link
- [ ] Focus order matches visual order
- [ ] Color contrast passes 4.5:1 text / 3:1 large text / 3:1 UI components
- [ ] All form inputs have associated labels
- [ ] All images have appropriate `alt` text
- [ ] Dynamic content changes are announced (aria-live)
- [ ] Page is usable at 200% zoom with no content loss
- [ ] Touch targets are at least 44x44px on mobile breakpoints
