# Grilling Taxonomy

Five categories of grilling questions for intent-capture Step 2. Use the selection criteria at the bottom to choose which category to open with.

---

## 1. Scope

Clarifies what the ask covers and — crucially — what it does not.

**Examples:**
- "Does this change apply to the `auth` module only, or also the `oauth` middleware?"
- "Should the fix cover the happy path only, or also error and timeout paths?"
- "Are you targeting the BBVA parser or all bank parsers?"

**Use first when:** the ask names a feature or module but the blast radius is unclear.

---

## 2. Ambiguity

Resolves overloaded terms or vague verbs before committing to an interpretation.

**Examples:**
- "You said 'simplify' — reduce line count, improve variable naming, or remove a feature entirely?"
- "You said 'update the schema' — add a column, rename one, or change a constraint?"
- "You said 'fix the import' — remove the unused import, or replace it with the correct one?"

**Use first when:** the verb in the operator's message maps to more than one concrete action.

---

## 3. Constraint Discovery

Surfaces non-obvious constraints the agent cannot infer from code alone.

**Examples:**
- "Does this need to pass in CI, or is local-only OK for now?"
- "Is there a deadline — does it block a client demo or can it land in the next sprint?"
- "Does the change touch production data, or only dev/staging fixtures?"

**Use first when:** the ask involves infrastructure, scheduling, or production exposure — contexts where wrong assumptions carry high cost.

---

## 4. Rejected Alternative

Confirms whether the operator has already ruled out approaches the agent would otherwise consider.

**Examples:**
- "I could replace the hardcoded dict with a YAML config file, or with `os.environ` — did you already decide which?"
- "The standard fix for this is to add a retry with exponential backoff. Did you rule that out for a specific reason, or is it still on the table?"
- "I see two endpoints that could serve this — `GET /auth/login` and `GET /oauth/callback`. Did you mean a specific one?"

**Use first when:** multiple approaches are obvious and the operator's message gives no signal about which was preferred.

---

## 5. Acceptance

Pins the completion criterion so the agent does not ship and guess.

**Examples:**
- "How do we know this is done — a specific test passing, a curl response that looks a certain way, or a manual walkthrough?"
- "Should I write a new test that covers this case, or does the existing suite already cover it once the fix is applied?"
- "Is 'working' defined as zero errors in CI, or does the client also need to approve the output format?"

**Use first when:** the ask describes an outcome (e.g. "make it work") without specifying a verifiable signal.

---

## Selection Criteria

Priority order for the first question:

1. If the blast radius is unclear → **Scope** first.
2. If the verb is ambiguous → **Ambiguity** first.
3. If the ask involves production or deadline risk → **Constraint** first.
4. If multiple implementations are obvious → **Rejected Alternative** first.
5. If everything else is clear but "done" is undefined → **Acceptance** last.

**Code-over-asking rule**: before picking any category, check whether the vault, ADRs, code-graph, or source files already answer the question. If they do, cite the evidence and make it a confirmation ("I found `auth.py:42` — is that the file you mean?") rather than an open question.
