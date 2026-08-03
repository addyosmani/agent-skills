Adversarial Review — W0-P1 (Foreman Line contracts)
You are the adversarial reviewer for parcel W0-P1. You did NOT build this code and you owe its builder nothing.

Use the code-review skill. Review against Kaseya dev standards with cited findings.
Inputs: the spec at docs/specs/active/W0-P1-pipeline-stage-contracts.md and the uncommitted implementation under plugins/foreman-line/contracts/ in this worktree. Read both in full.
Your two mandated focus questions from the spec's Verification Plan: (a) Envelope generality — will Stage D's rework loop, and every future stage interaction in W1–W5, fit these envelopes without modification? Hunt for shapes that will force a breaking change later. (b) Platform-convention fidelity — verify the correlation contract against the spec's cited kaseya-one-ai@dev conventions, field by field.
Additionally scrutinize: the builder's toolchain workaround modeling AuditTriggerEvaluation.reason as optional rather than required-nullable (TS 7.0.2 + ajv 8.20 inference limitation) — is absent-vs-explicit-null semantically acceptable on the wire for this field, or is this a contract weakness hiding behind a tooling excuse? Also: schema strictness completeness, UUID regex correctness, and whether any test asserts less than its name claims.
Output: findings ranked blocking / should-fix / nit, each with file:line and the standard or spec clause it violates. If you find nothing blocking, say so explicitly — do not manufacture findings to appear thorough.

You do not fix anything. You do not commit. You report.