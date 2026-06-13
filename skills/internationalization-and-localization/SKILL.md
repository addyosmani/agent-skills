---
name: internationalization-and-localization
description: Makes every user-facing string translatable and locale-aware through a single i18n layer. Use when adding or editing user-facing text, translation keys, or locale files; when building a language switcher or locale-prefixed routing; when formatting numbers, dates, or currency; or when rendering backend enums and dynamic labels.
---

# Internationalization and Localization

## Overview

A string is either translatable or it is a bug waiting for the second locale. The cost of i18n is near-zero when designed in from the first component and enormous when retrofitted — every hardcoded label, every `"You have " + count + " items"` concatenation, and every locale file that drifts out of sync becomes a manual hunt later. Route every user-facing string through the translation layer from the start, keep all locale files structurally identical, and format numbers/dates through `Intl` — not translation keys.

This skill is library-agnostic; examples use i18next / react-i18next and the platform `Intl` APIs, but the principles apply to any i18n stack.

## When to Use

- Adding or editing any user-facing text — labels, buttons, toasts, validation messages, `aria-label`s, empty/error/loading states, document titles, meta tags
- Adding a new translation key or a new locale file
- Building language switching or locale-prefixed routing (`/:lang/...`)
- Formatting numbers, dates, times, or currency for display
- Rendering enum values or dynamic labels that originate from the backend

**When NOT to use:** Internal logs, error codes consumed by machines, telemetry strings, and developer-only CLI output do not need translation. Don't internationalize text no user will ever read.

## Process

```
1. CONFIG    → One source of truth for languages + fallback
2. KEY       → Add a stable, semantic key to EVERY locale file
3. CONSUME   → Render via t() / <Trans> — never a literal
4. FORMAT    → Numbers/dates/currency via Intl, not keys
5. VERIFY    → No literal survives; all locales have the key
```

### Step 1: One source of truth for languages

Keep the supported-language list and the default/fallback in a single config module and import it everywhere. Never re-list languages ad hoc. Validate any language code read from storage or the URL before using it.

```ts
export const LANGS = ['en', 'ru', 'es'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'en';
export const isLang = (v: string): v is Lang => (LANGS as readonly string[]).includes(v);

i18n.use(httpBackend).use(initReactI18next).init({
  supportedLngs: LANGS,
  fallbackLng: DEFAULT_LANG,
  lng: isLang(saved) ? saved : DEFAULT_LANG,   // validated on read
  interpolation: { escapeValue: false },        // the view layer already escapes
  backend: { loadPath: '/locales/{{lng}}.json' }, // lazy-load per language
});
```

### Step 2: Add the key to EVERY locale file

A key missing from one locale silently falls back to the default language — easy to ship a gap that only the missing-locale user sees. Keep file shapes identical across locales. Use stable, semantic, dot-path keys grouped by feature, plus a shared bucket for reusable strings.

```jsonc
// en.json                          // ru.json  — SAME shape, every key present
{ "cargo": { "searchPlaceholder": "Search cargo" },
  "common": { "save": "Save", "cancel": "Cancel" } }
```
- camelCase keys; reserve `UPPER_SNAKE_CASE` for enum-value keys.
- Decide up front: namespaces (multiple files per language) vs one flat dot-path file. Be consistent.

### Step 3: Consume — never a literal

```tsx
const { t } = useTranslation();
<input placeholder={t('cargo.searchPlaceholder')} />
<span>{t('items.count', { count })}</span>          // interpolation, not concatenation
t('actions.reset', { defaultValue: 'Reset' });       // inline fallback for safety
```
- Use `{{var}}` placeholders so word order can vary per language. Never build sentences with `+`.
- Pluralization: use the i18n library's plural suffixes (`items_one` / `items_other`) — not hand-rolled singular/plural keys.
- Rich text with embedded markup: use `<Trans i18nKey="...">`.

### Backend enums / dynamic labels — one helper per domain

Never render a raw enum string from the API. Normalize it and look up a key with a graceful default:

```ts
export function enumLabel(t: TFunction, group: string, raw: string): string {
  const key = raw.trim().toUpperCase().replace(/[\s-]+/g, '_');
  return key ? t(`${group}.${key}`, { defaultValue: raw.replace(/_/g, ' ') }) : '—';
}
```
When the backend itself localizes a value (returns `{ name_en, name_ru }`), select by current language with a fallback chain (`current → default → first available`).

### Step 4: Format numbers/dates/currency via Intl

```ts
new Intl.NumberFormat(bcp47, { style: 'currency', currency: 'USD' }).format(amount);
new Intl.DateTimeFormat(bcp47, { dateStyle: 'medium' }).format(date);
```
Map app language codes to BCP-47 locales (`en → en-US`). Never store formatted numbers/dates as translation keys.

### Language switching & routing

If language lives in the URL, a provider reads the segment, validates it, calls `changeLanguage`, persists it, and redirects bare/invalid paths to a valid prefix. Send the active language to the backend via a request header (`Accept-Language` or a custom header) so server-rendered messages match.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We only ship English for now" | The first hardcoded string sets the pattern. Wire `t()` in from day one; adding a locale later is then a JSON file, not a refactor. |
| "I'll add the other locales' keys later" | "Later" ships a silent fallback gap only the other-locale user sees. Add the key to every file in the same commit. |
| "It's just one label" | One label times every component is the whole UI. There is no exception small enough. |
| "Concatenation is simpler" | Word order, gender, and pluralization differ per language. Concatenation is untranslatable by construction — use interpolation. |
| "I'll format the date with a template string" | Date/number/currency formats are locale rules, not text. `Intl` already knows them; a hand-rolled format is wrong in most locales. |
| "The backend already returns the label" | Raw enum/API strings aren't localized. Map them through a helper with a fallback. |

## Red Flags

- A user-facing string literal in JSX/markup not wrapped in `t()` / `<Trans>` (includes placeholders, `aria-label`, titles, toasts, validation messages)
- A translation key present in one locale file but not another (structural drift)
- Sentences built with `+` or template strings instead of `{{interpolation}}`
- The supported-language list re-declared in more than one place
- Dates/numbers/currency rendered via translation keys or manual formatting instead of `Intl`
- Raw enum values or unmapped API strings shown in the UI
- A language code from storage/URL used without validation against the supported list

## Verification

After any localization-related change:

- [ ] No new user-facing string literal bypasses the translation layer (grep the diff for quoted UI text)
- [ ] Every key added/changed exists in **all** locale files with identical structure
- [ ] All locale files parse as valid JSON and have the same key set (diff the key trees)
- [ ] Counts/plurals use interpolation + plural suffixes, not concatenation
- [ ] Numbers, dates, and currency render through `Intl` with a BCP-47 locale
- [ ] Backend enums/dynamic labels go through a mapping helper with a fallback
- [ ] Language codes from URL/storage are validated; invalid values fall back to the default
- [ ] Switching language updates all visible text with no leftover literals
