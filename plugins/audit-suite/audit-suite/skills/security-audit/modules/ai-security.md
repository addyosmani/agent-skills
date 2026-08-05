---
id: sec-ai-security
title: AI & Agentic Security (NIST AI RMF, AI 600-1, agentic threat vectors)
owner: security-audit
version: 1.0.0
status: enabled
tier: mandatory
applies_when:
  - any AI/ML component in scope
  - generative or LLM component in scope
  - agentic system with tool access
why: AI surfaces carry attack vectors STRIDE alone won't surface — non-optional whenever any AI/ML or agentic component is in scope.
last_reviewed: 2026-06-12
changelog:
  - "1.0.0 (2026-06-12): initial release"
---

# AI & Agentic Security

## Coverage

**NIST AI RMF 1.0** — AI risk guidance across Govern / Map / Measure / Manage.
**Measure** (testing & monitoring) and **Manage** (mitigation & residual risk) are
the operational heart of an AI technical review; **Govern** belongs to
compliance-audit (see `comp-ai-governance`).

**NIST AI 600-1 (GenAI Profile)** — companion profile layering generative-AI-specific
risks onto the AI RMF.

**Agentic threat model** — first-class, not edge cases: the AI-native vectors that
STRIDE/ATT&CK don't enumerate.

## What to assess

STRIDE and ATT&CK still apply, but you must also probe the AI-native vectors.
Treat any agent with tool access as having an attack surface the size of its tool
permissions:

- **Prompt injection** — direct and indirect (poisoned content the agent ingests:
  retrieved documents, tool results, user-supplied files).
- **Tool / permission abuse** — can the model invoke tools beyond intent? Is the
  permission scope least-privilege?
- **Training / RAG data poisoning** — can an attacker influence what the model
  retrieves or learned?
- **Model exfiltration** — system-prompt leakage, training-data extraction.
- **Unbounded autonomous action** — what's the blast radius if the agent acts
  wrong? Are there human-in-the-loop gates on destructive actions?

Map findings to the AI RMF **Measure/Manage** functions and tag them
`AI-RMF:<function>` or by vector (e.g. `AI:prompt-injection`).

## Cross-map anchors

- Governance-side concerns (ISO 42001, AI RMF **Govern**, EU AI Act) belong to
  `comp-ai-governance` in compliance-audit — note them in Handoff Notes, don't
  absorb them.
- Tool-permission findings double as access-control evidence (SOC 2 CC6, 800-53 AC).

## Coverage limits

Assess the vectors against the system actually in scope — an LLM feature without
tools doesn't get hypothetical tool-abuse findings; an agent without RAG doesn't
get retrieval-poisoning findings. Absence of a vector is a one-line note, not
padding.
