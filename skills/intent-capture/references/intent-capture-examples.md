# Intent Capture — Canonical Examples

Four canonical examples illustrating the grill → capture → confirm → route → execute flow. Each example shows what gets logged in `clarifications[]`.

---

## Example 1: Single short ask, one scope question

**Operator message:**
> "Add tests to the auth module."

**Agent (Step 2 — Grill):**
> "Should these be unit tests, integration tests, or both? I see `auth/token.py` already has two unit tests at lines 14 and 28 — do you want to extend those, or add a separate integration test against the real token endpoint?"

**Operator:**
> "Unit tests only, extending what's already there."

**Agent (Step 3 — Capture + Step 4 — Present):**

```json
{
  "asks": [
    {
      "id": "ask_a1b2c3d4e5f6",
      "original_text": "Add tests to the auth module.",
      "refined_text": "Extend the existing unit tests in auth/token.py (lines 14 and 28) with additional unit test cases. No integration tests.",
      "scope": {
        "includes": ["auth/token.py"],
        "excludes": ["integration tests", "oauth flow", "other auth files"]
      },
      "acceptance": "All existing tests still pass; at least 2 new unit test functions added covering edge cases.",
      "priority": "medium",
      "category": "feature",
      "captured_at": "2026-05-04T13:00:00Z",
      "clarifications": [
        {
          "question": "Unit, integration, or both? Extend existing at lines 14/28, or new integration test?",
          "answer": "Unit tests only, extending what's already there.",
          "asked_at": "2026-05-04T13:00:05Z"
        }
      ]
    }
  ],
  "metadata": {
    "session_id": "sess_abc123",
    "operator_id": "jota-batuta",
    "created_at": "2026-05-04T13:00:00Z",
    "agent_version": "3.8.0"
  },
  "status": "ready_for_confirmation",
  "confirmation": null
}
```

> "Is this everything, or do you have more asks?"

**Operator:** "That's it, go ahead."

**Step 6 — Route:** `category=feature`, 1 file, no new control-flow → **`implementer-haiku`**.

---

## Example 2: Loose bullets like a live session, grilling intercalado

**Operator (first message):**
> "We need to clean up the hardcodes in the BBVA parser."

**Agent (Grill):** "Which hardcodes specifically — the account codes, the Excel sheet count, or the header strings? I can see all three in `parsers/bbva.py` around lines 40-80."

**Operator:** "All of them."

**Operator (second message, before agent responds):**
> "Also fix the tamiz regex — it's hardcoded to February."

**Agent (continues grilling, adds new ask to batch):** "For the tamiz regex: should the month come from a config file, an environment variable, or a parameter passed at runtime? And should it apply to BBVA only or to all bank parsers?"

**Operator:** "Config file, BBVA only for now."

**Agent (Step 3 — Capture, two asks):**

```json
{
  "asks": [
    {
      "id": "ask_bb1parshrd01",
      "original_text": "Clean up the hardcodes in the BBVA parser.",
      "refined_text": "Replace account codes, Excel sheet count, and header strings in parsers/bbva.py with config-driven values from a dedicated constants/bbva_config.py.",
      "scope": {
        "includes": ["parsers/bbva.py", "constants/bbva_config.py"],
        "excludes": ["other bank parsers", "pipeline orchestration"]
      },
      "acceptance": "No literal account codes, sheet counts, or header strings remain in parsers/bbva.py; all reference constants/bbva_config.py.",
      "priority": "high",
      "category": "refactor",
      "captured_at": "2026-05-04T13:05:00Z",
      "clarifications": [
        {
          "question": "Which hardcodes — account codes, sheet count, or headers?",
          "answer": "All of them.",
          "asked_at": "2026-05-04T13:05:05Z"
        }
      ]
    },
    {
      "id": "ask_bb2tamizrg02",
      "original_text": "Fix the tamiz regex — it's hardcoded to February.",
      "refined_text": "Replace the hardcoded month pattern in the tamiz regex with a value read from bbva_config.py. Applies to BBVA parser only.",
      "scope": {
        "includes": ["parsers/bbva.py", "constants/bbva_config.py"],
        "excludes": ["other bank parsers"]
      },
      "acceptance": "Running the parser with month=march processes March records correctly without code change.",
      "priority": "high",
      "category": "refactor",
      "captured_at": "2026-05-04T13:06:00Z",
      "clarifications": [
        {
          "question": "Month from config file, env var, or runtime param? BBVA only or all parsers?",
          "answer": "Config file, BBVA only for now.",
          "asked_at": "2026-05-04T13:06:10Z"
        }
      ]
    }
  ],
  "metadata": {
    "session_id": "sess_abc123",
    "operator_id": "jota-batuta",
    "created_at": "2026-05-04T13:05:00Z",
    "agent_version": "3.8.0"
  },
  "status": "ready_for_confirmation",
  "confirmation": null
}
```

**Step 6 — Route:** both asks are `refactor`, 2 files each, no new control-flow → **`implementer-haiku`** for both.

---

## Example 3: Scope change mid-stream (new intent)

**Operator (after confirming Example 2 above):**
> "Actually, also add support for Bancolombia while we're at it."

**Agent (Step 1 — Detect):** New ask, not a correction to the confirmed intent — this is a new intent object.

**Agent (Step 2 — Grill):** "Adding Bancolombia support — does that mean a new parser file only, or also registration in the pipeline registry and a new config file? And do you need tests before this can be merged?"

**Operator:** "New parser + registry + tests. Full support."

**Agent creates a second intent object** (separate from the confirmed one above):

```json
{
  "asks": [
    {
      "id": "ask_bancolom001a",
      "original_text": "Add support for Bancolombia.",
      "refined_text": "Create parsers/bancolombia.py, register it in pipeline/registry.py, add constants/bancolombia_config.py, and write unit tests in tests/test_bancolombia.py.",
      "scope": {
        "includes": ["parsers/bancolombia.py", "pipeline/registry.py", "constants/bancolombia_config.py", "tests/test_bancolombia.py"],
        "excludes": ["BBVA parser", "other bank parsers", "production deployment"]
      },
      "acceptance": "pytest tests/test_bancolombia.py passes with at least 3 test cases covering normal parse, missing field, and malformed row.",
      "priority": "high",
      "category": "feature",
      "captured_at": "2026-05-04T14:00:00Z",
      "clarifications": [
        {
          "question": "New parser only, or also registry + config + tests?",
          "answer": "New parser + registry + tests. Full support.",
          "asked_at": "2026-05-04T14:00:10Z"
        }
      ]
    }
  ],
  "metadata": {
    "session_id": "sess_abc123",
    "operator_id": "jota-batuta",
    "created_at": "2026-05-04T14:00:00Z",
    "agent_version": "3.8.0"
  },
  "status": "ready_for_confirmation",
  "confirmation": null
}
```

**Step 6 — Route:** `feature`, 4 files, new tests with assertions → **`implementer`** (Sonnet). The Haiku work from Example 2 is already in progress; the Sonnet task queues after.

---

## Example 4: Read-only question — skill does NOT trigger

**Operator message:**
> "What does the tamiz regex do in the BBVA parser?"

**Step 1 — Detect:** Read-only question. No action requested. No files to change.

**Agent:** Reads `parsers/bbva.py`, finds the regex, explains it inline. No intent object created. No grilling. Skill is NOT invoked.

---

## Notes

- Each `clarifications[]` entry is the verbatim Q&A log from grilling. It is the audit trail — do not summarize or omit entries.
- `original_text` is always the raw operator message, pre-grilling. Do not clean it up.
- `refined_text` is the post-grilling restatement. This is what the subagent receives as its task description.
- A new mid-stream ask always generates a new intent object, never mutates a confirmed one.
