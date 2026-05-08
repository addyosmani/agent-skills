---
name: semantic-paradigm-auditor
description: Guides agents through high-fidelity reasoning reviews to detect architectural mismatches. Use when scaffolding new projects, selecting tech stacks, or reviewing technical specifications.
---

# Semantic Paradigm & Architecture Auditing

## Overview
AI systems frequently suffer from architectural mismatches, such as relying on raw LLM generations for deterministic computation or structuring improper retrieval indices. This skill establishes a high-fidelity reasoning gate to evaluate whether the chosen agent pattern aligns with the physics of the problem space.

## When to Use
- Scaffolding initial project architectures or generating Product Requirement Documents (PRDs)
- Evaluating retrieval-augmented generation (RAG) index schemas and chunking strategies
- Designing boundary isolation between multiple specialized agents
- Assessing complex domain logic that involves exact arithmetic or stateful transactional consistency

**When NOT to use:** Modifying pure UI styling elements or updating inline code documentation.

## The Gated Workflow

Follow these four linear phases. Do not proceed to implementation until architectural alignment passes.

```
EXTRACT-INTENT ──→ COMPARE-MATURITY-RULES ──→ FLAG-MISMATCHES ──→ ALIGN-PATTERN
```

### Phase 1: Extract Intent
Deconstruct the project goals to isolate core functional requirements, data persistence patterns, and computational complexity boundaries.

### Phase 2: Compare Maturity Rules
Evaluate the extracted intent against verified architectural laws:
1. Never use plain generative models for exact mathematical calculations.
2. Enforce strict context window cordoning to separate untrusted user input from system instructions.
3. Ensure dense retrieval systems match the query embedding space correctly.

### Phase 3: Flag Mismatches
Identify and document all detected violations, such as improper tool usage, unconstrained recursive loops, or excessive context packing.

### Phase 4: Align Pattern
Propose and inject the verified structural pattern (e.g., introducing a dedicated code interpreter sandbox for arithmetic tasks or implementing distinct agent personas).

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The latest foundation model is smart enough to do this directly." | Generative models fundamentally hallucinate deterministic logic. Relying on prompt cleverness over verified structural tool patterns introduces systemic fragility. |
| "Adding extra tools and sandboxes makes the architecture too complex." | Structural complexity is predictable and auditable; prompt-based behavioral complexity is unpredictable and fragile. Clear tooling boundaries reduce overall risk. |
| "We can just tune the system prompt if the outputs are inaccurate." | Prompt engineering cannot overcome fundamental computational physics. Deterministic operations require deterministic execution environments. |

## Red Flags
- Assigning arithmetic or cryptographic validation tasks to plain text generation prompts
- Mixing user-provided data directly into executable system tool payloads without validation
- Structuring massive unindexed text blobs for RAG without semantic chunking strategies

## Verification
Before approving the architectural design, confirm:
- [ ] Deterministic tasks (math, formatting, transactions) are explicitly delegated to external tools
- [ ] Boundary isolation completely separates unverified input from prompt execution contexts
- [ ] The proposed architecture passes all established rules in the technical maturity registry
- [ ] Review documentation explicitly logs the approved structural patterns and rationales
