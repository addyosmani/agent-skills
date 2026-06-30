---
name: brand-guidelines
description: Apply brand colors and typography to artifacts. Use when brand colors, style guidelines, visual formatting, or company design standards apply. Ensures consistency across branded content.
source: anthropics/skills
license: Apache-2.0
---

# Brand Guidelines Application

## Purpose

Apply consistent brand styling to any artifact: documents, presentations, web pages, or marketing materials.

## Core Brand Elements

### Colors
Define your brand palette with CSS variables:

```css
:root {
  --brand-primary: #1a73e8;
  --brand-secondary: #34a853;
  --brand-accent: #ea4335;
  --brand-dark: #202124;
  --brand-light: #f8f9fa;
  --brand-text: #3c4043;
  --brand-text-muted: #5f6368;
}
```

### Typography
```css
/* Primary font for headings */
--font-display: 'Product Sans', 'Google Sans', system-ui;

/* Body font */
--font-body: 'Roboto', 'Inter', -apple-system, sans-serif;

/* Monospace for code */
--font-mono: 'Roboto Mono', 'Fira Code', monospace;

/* Type scale */
--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.25rem;
--text-2xl: 1.5rem;
--text-3xl: 1.875rem;
--text-4xl: 2.25rem;
```

### Spacing
```css
--space-1: 0.25rem;
--space-2: 0.5rem;
--space-3: 0.75rem;
--space-4: 1rem;
--space-6: 1.5rem;
--space-8: 2rem;
--space-12: 3rem;
--space-16: 4rem;
```

## Application Examples

### Buttons
```css
.btn-primary {
  background: var(--brand-primary);
  color: white;
  padding: var(--space-2) var(--space-4);
  border-radius: 4px;
  font-family: var(--font-body);
  font-weight: 500;
}
```

### Cards
```css
.card {
  background: white;
  border: 1px solid var(--brand-light);
  border-radius: 8px;
  padding: var(--space-6);
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
```

### Headers
```css
h1 {
  font-family: var(--font-display);
  font-size: var(--text-4xl);
  color: var(--brand-dark);
  font-weight: 500;
}
```

## Document Templates

### Google Docs
- Heading 1: Display font, 24pt, Brand Dark
- Heading 2: Display font, 18pt, Brand Primary
- Body: Body font, 11pt, Brand Text
- Links: Brand Primary, underlined

### Presentations
- Title slides: White text on Brand Primary background
- Content slides: Brand Dark text on white
- Accent elements: Brand Secondary or Accent

## Best Practices

1. **Consistency**: Use exact brand colors, never approximate
2. **Contrast**: Ensure 4.5:1 minimum for text readability
3. **Hierarchy**: Use size and weight to establish importance
4. **Whitespace**: Generous spacing feels premium
5. **Logo usage**: Maintain clear space around logo
