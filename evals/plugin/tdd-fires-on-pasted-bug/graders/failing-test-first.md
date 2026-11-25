---
type: llm
---

PASS if the reply gives a test that reproduces the bug (splitCents(100, 3) summing to 100, or the missing cent) and presents it as the first step, to be run and seen failing before the function is changed, with the fix coming after it.

FAIL if the reply changes the function without a reproducing test, or adds tests only after the fix as an afterthought, or never says the test should fail first.
