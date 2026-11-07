---
description: A simplification request with the function pasted inline and nothing else to read. The skill should fire, and the reply should keep every behavior of the original and say what it removed and why that is safe.
expected_outcome: A shorter normalizeTags that still returns [] for null or undefined, splits a string on commas, keeps non-string items such as 0, drops blanks and dedups in first-occurrence order, with the removals explained; code-simplification is invoked.
max_turns: 12
allowed_tools: [Read, Glob, Grep, Skill]
---

Simplify this function, it works but it is hard to read.

```js
function normalizeTags(tags) {
  var out = [];
  if (tags === null || tags === undefined) { return out; }
  if (typeof tags === 'string') { tags = tags.split(','); }
  for (var i = 0; i < tags.length; i++) {
    var t = tags[i];
    if (t === null || t === undefined) { continue; }
    t = String(t);
    t = t.replace(/^\s+/, '').replace(/\s+$/, '');
    t = t.toLowerCase();
    if (t.length === 0) { continue; }
    var dup = false;
    for (var j = 0; j < out.length; j++) {
      if (out[j] === t) { dup = true; break; }
    }
    if (dup === false) { out.push(t); }
  }
  return out;
}
```
