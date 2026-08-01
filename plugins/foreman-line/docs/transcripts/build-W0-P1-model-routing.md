 Agent 1 = Opus 4.8 - Pasted kickstart message
 Agent 2 = Sonnet 4.6 - Fully independent - Pasted only kickstarter path.
 Agent 3 = Sonnet 5 - - Pasted only kickstarter path. Ran after commit, so Opus 4.8's approach was in the repo.
 Judge - Fable 5
 ---
 
 Schema mechanism: 
 
 - Agent 1 wins, and it's not close. JSONSchemaType<T> literals make type↔schema drift a compile error, not just a test failure — that's "enforced by tooling" in its purest form. And the composed per-boundary schema factories dissolve Agent 2's Flag 4 entirely.
 
 - Agent 2's base-envelope-with-open-payload quietly contradicts AC5's strict mode; composed schemas validate a complete stage message strictly in one shot, which is what runtime agents will actually do. Decision: composed per-boundary schemas, generated from typed factories.

 - Agent 3 proved the inheritance mechanism works. And it's the better Wednesday story: the conversation that shaped the decisions was disposable — we killed it, and the next agent needed nothing but the repo. 

---

"The Line's correlation contract is grounded in what ships in dev today — CorrelationId, SessionId, WorkflowId, RunId, verbatim. ADR-069 is a draft direction I've authored; the Line is forward-compatible with it, and if it's ever ratified, the Line is the ideal pilot — WorkloadId can be introduced here without touching production triage."

---

