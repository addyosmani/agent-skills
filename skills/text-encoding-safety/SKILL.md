---
name: text-encoding-safety
description: Guides agents through detecting, diagnosing, and fixing text-encoding bugs (mojibake, charset mismatches, BOM, wrong UTF-8/Latin-1 assumptions, normalization). Use when text shows garbled characters (Ã©, â‚¬, ï¿½), a decode throws UnicodeDecodeError, files/HTTP/CSV/DB columns yield corrupted strings, or non-ASCII or unknown-encoding input crosses an I/O boundary.
---

# Text Encoding Safety

## Overview

Text-corruption bugs (mojibake) are common, silent, and easy to ship. They appear
when bytes are decoded with the wrong charset, a BOM is mishandled, or a system
assumes UTF-8 but receives Latin-1 (or vice versa). This skill gives a reproducible
workflow to detect, localize, fix, and guard against encoding defects — fixing them
at the I/O boundary rather than patching strings after the fact.

## When to Use

- Strings show doubled/garbled characters: `Ã©` for `é`, `â‚¬` for `€`, `Ã¼` for `ü`, `ï¿½` for replacement char
- A decode throws `UnicodeDecodeError` / `UnicodeEncodeError`
- Reading a file, HTTP response, CSV, or DB column yields wrong characters
- Handling user input, uploads, or data from external systems with unknown encoding
- Normalization matters (case-insensitive compare, search, filenames)
- A BOM (`ï»¿`) appears at the start of a processed file

NOT for:

- Choosing a charset for a greenfield protocol — use UTF-8 everywhere (see `api-and-interface-design`)
- Pure i18n/localization copywriting

## Core Process

### Step 1: Reproduce and capture raw bytes

Never trust the displayed string — capture the actual bytes. Mojibake is diagnosable
from bytes, not from the rendered glyphs.

```bash
# Hex dump the offending file
xxd file.txt | head
python3 -c "print(open('file.txt','rb').read()[:40].hex(' '))"

# From a Python value, recover the raw bytes
python3 -c "print((bad if isinstance(bad,bytes) else bad.encode('utf-8')).hex(' '))"
```

Reference: `C3 A9` is UTF-8 for `é`. If those exact bytes are decoded as Latin-1 you
get `Ã©`. That single observation identifies the bug class.

### Step 2: Classify the corruption

```
What do you see?
├── Ã© / Ã¼ / Ã± style            → UTF-8 bytes decoded as Latin-1 / CP1252
├── â‚¬ / â€™ / â€œ            → Windows-1252 decoded as UTF-8 (smart quotes)
├── ï¿½ / Ã¯Â¿Â½               → UTF-8 read as Latin-1 then re-encoded; or replacement char
├── Ã„Â± / doubled accents       → Double-encoded UTF-8 (UTF-8 → Latin-1 → UTF-8)
├── BOM (ï»¿) at file start     → UTF-8 BOM not stripped on read
└── ????? / boxes              → Font missing glyph, or encoding entirely wrong
```

### Step 3: Recover the original text

```python
# Case A: UTF-8 bytes decoded as Latin-1 (most common: "Ã©" should be "é")
fixed = bad_str.encode('latin-1').decode('utf-8')

# Case B: Windows-1252 decoded as UTF-8 (smart-quote mojibake: "â‚¬")
fixed = bad_str.encode('utf-8').decode('windows-1252')

# Case C: double-encoded ("Ã„Â±")
fixed = bad_str.encode('latin-1').decode('utf-8').encode('latin-1').decode('utf-8')

# Case D: unknown encoding — detect as a fallback only, and log it
# pip install chardet
import chardet
raw = open('file.txt', 'rb').read()
enc = chardet.detect(raw)['encoding']   # heuristic: wrong on short/ambiguous input
text = raw.decode(enc)
```

### Step 4: Fix at the boundary, not the symptom

Encoding bugs are boundary problems. Fix where bytes cross into your process —
never by search-and-replace on the corrupted string.

- **File reads:** `open(path, encoding='utf-8')` (or the detected encoding). Never rely on the platform default, which is Latin-1 on Windows.
- **HTTP:** honor `Content-Type: ...; charset=`, default to UTF-8; send `Accept-Charset: utf-8`.
- **Databases:** set the connection/client encoding explicitly (`?charset=utf8mb4`, `client_encoding='UTF8'`).
- **CSV/JSON:** declare encoding. JSON is UTF-8 by spec — never decode JSON as Latin-1.
- **Terminals/CLIs:** emit UTF-8; set `PYTHONIOENCODING=utf-8` and `LANG=C.UTF-8`.

### Step 5: Normalize when comparison matters

```python
import unicodedata

# NFC composes characters (é as one codepoint) — use for storage and equality
a = unicodedata.normalize('NFC', a)
b = unicodedata.normalize('NFC', b)
assert a == b

# NFKC also folds compatibility chars (fullwidth → halfwidth) — use for search keys
key = unicodedata.normalize('NFKC', user_input).casefold()
```

Equal-looking strings are not equal bytes (`é` can be one codepoint or `e` + combining
acute). Normalize before comparing, hashing, or searching.

### Step 6: Guard against recurrence

Add a test that fails on the corrupt form and passes on the fixed form (see Verification).

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It's just a display issue, the data is fine" | Mojibake means wrong bytes were stored/decoded. It corrupts search, sort, hashing, and persistence. Fix the decode, not the view. |
| "I'll just strip non-ASCII characters" | That deletes user data. Preserve it by decoding correctly. |
| "UTF-8 is the default everywhere now" | Defaults lie across HTTP, databases, Windows files, and shell pipes. Declare encoding at every boundary. |
| "chardet will figure it out" | Detection is heuristic and wrong on short/ambiguous input. Prefer explicit encoding; use detection only as a logged fallback. |
| "It works in my terminal" | Your terminal is UTF-8. The bug appears in CI, on Windows, or in a customer's locale. |

## Red Flags

- Relying on locale default encoding instead of explicit `encoding=`
- Catch-all `except UnicodeDecodeError: pass` that silently drops data
- Reading JSON/CSV with Latin-1 because "it didn't error"
- Storing strings without recording their encoding
- Using `encode()` / `decode()` without an explicit codec
- A BOM present in files your code processes (not stripped on read)
- Comparing user strings without `unicodedata.normalize`

## Verification

After fixing an encoding bug:

- [ ] Raw bytes captured and the mis-decode path identified (Step 1–2 evidence)
- [ ] Original text recovered and confirmed correct (against a known-good sample)
- [ ] Fix applied at the I/O boundary (file/HTTP/DB), not via string patching
- [ ] A regression test decodes the corrupt bytes and asserts the correct string:

```python
def test_mojibake_recovery():
    # "Ã©" is what a user sees when UTF-8 bytes for "é" are read as Latin-1
    corrupt = "Ã©"
    assert corrupt.encode('latin-1').decode('utf-8') == "é"

def test_normalization_equality():
    import unicodedata
    composed = "é"                      # single codepoint
    decomposed = "e\u0301"              # e + combining acute
    assert composed != decomposed
    assert unicodedata.normalize('NFC', composed) == unicodedata.normalize('NFC', decomposed)
```

- [ ] Comparison/normalization path uses `unicodedata.normalize('NFC', ...)` where equality matters
- [ ] No `except UnicodeError: pass` silently swallowing data
