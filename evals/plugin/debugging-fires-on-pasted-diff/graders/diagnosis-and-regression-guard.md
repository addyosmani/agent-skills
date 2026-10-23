---
type: llm
---

PASS only if the reply does all of the following:
- Explains that slice's end is exclusive, so subtracting one from start + size drops a row when a full page is available.
- Gives a concrete minimal reproduction, either executable code or a worked input with actual and expected results (for example, at least 20 rows with page=1 and size=20 produces 19 instead of 20). It must distinguish reasoning or suggested commands from tests actually run.
- Identifies start + size as the corrected end and proposes a regression assertion that fails on the pasted implementation and passes with that correction, retaining the expected page size. The reproduction and assertion may be the same example.
- Tells the user to verify the correction with the failing test and the relevant existing suite. A recommendation is sufficient: this case provides no shell tool or runnable project.

FAIL if any of those are absent, if the reply changes the expected count to 19, or if it claims to have executed tests without tool evidence. Do not require particular headings, wording, or the skill's invocation; invocation is measured separately.
