---
name: enterprise-ai-knowledge-platform
description: Deep knowledge of the Enterprise AI Knowledge Platform — a deterministic, dependency-free access-aware RAG simulator with hybrid search, policy enforcement, citation-first extractive answers, audit trails, evaluation, and a static dashboard. Use when designing, reviewing, extending, or implementing enterprise knowledge assistants, access-aware retrieval, citation-first systems, or when working with this specific codebase.
---

# Enterprise AI Knowledge Platform

## Overview

A self-contained Python 3 standard-library simulator of an internal enterprise knowledge assistant. It models the real control points of a production RAG system without network access, Docker, external services, paid APIs, or third-party packages.

Core loop: deterministic corpus → stable ingestion (chunks + checksums + lineage) → hybrid retrieval → policy-aware filtering → citation-first extractive answering → audit + feedback → evaluation + static dashboard.

## When to Use

- Designing or reviewing enterprise RAG / knowledge assistants
- Implementing access-aware retrieval (department + clearance)
- Building citation-first or extractive answer systems
- Adding audit trails, evaluation harnesses, or operator dashboards
- Discussing trade-offs between deterministic simulators and full production stacks
- Extending or reasoning about the sameer2191/enterprise-ai-knowledge-platform codebase

**Not for:** generic chatbot prompting, non-access-controlled RAG, or production LLM API wiring (those stay outside the required runtime path by design).

## Core Design Invariants

1. **Fully deterministic** — same source tree → identical manifests, audit ordering, metrics, and dashboard every run.
2. **Access control before generation** — policy is applied to retrieval results before any answer text is produced.
3. **Refuse stronger inaccessible matches** — if a denied chunk scores substantially higher than the best permitted chunk, return `access_denied` instead of answering from weaker evidence.
4. **Plain-file artifacts** — `manifest.json`, `audit.jsonl`, `eval_results.json`, `dashboard.html`, `feedback.jsonl`.
5. **Production integrations are optional** — FastAPI, real vector DB, SSO, React, centralized logs are described in docs but never required for the demo or tests.

## Data Flow

1. `corpus.py` — fixed demo documents with `department`, `classification`, `source`, `tags`.
2. `ingestion.py` — stable chunk IDs (`<document_id>::chunk-<zero-padded>`), checksums, lineage, corpus manifest.
3. `search.py` — hybrid index (keyword coverage + deterministic hashed-vector cosine similarity).
4. `policy.py` — principal (roles, departments, clearance) vs resource attributes; classification ladder.
5. `answering.py` — policy arbitration + citation-first extractive answers.
6. `audit.py` / `feedback.py` — deterministic JSONL events.
7. `evaluation.py` — coverage, access-denial accuracy, citation quality, policy violations.
8. `dashboard.py` — static HTML operator view (no runtime deps).
9. `demo.py` — end-to-end orchestration.

## Classification Ladder

| Level          | Rank |
|----------------|------|
| public         | 0    |
| internal       | 1    |
| confidential   | 2    |
| restricted     | 3    |

Principal must have clearance ≥ document classification **and** matching department scope (or appropriate role).

## Principal Model

```text
user_id, roles[], departments[], clearance
```

Policy decisions are explicit and auditable; the assistant never infers access from query text.

## Critical Safety Rule

If a denied result is substantially stronger than the best accessible result, the assistant returns `access_denied` rather than answering from weaker permitted evidence. This models the enterprise requirement: do not route around access policy with nearby lower-quality content.

## Quick Start (local)

```bash
python3 -m unittest discover -s tests
python3 -m enterprise_ai_knowledge_platform demo --output runs/demo
```

Artifacts land in `runs/demo/`. Open `dashboard.html` in a browser.

## Extension Points (keep local contract stable)

- Replace `build_demo_corpus()` with a source connector that emits the same `Document` shape.
- Replace `HybridSearchIndex` with a vector-DB adapter that still returns stable `SearchResult` ordering and chunk IDs.
- Replace `AccessPolicy` with an enterprise authorization service.
- Wrap `KnowledgeAssistant.answer()` + feedback behind FastAPI; keep principal construction at the boundary.
- Stream the same audit event schema to a centralized sink.
- Rebuild the static dashboard as a React operator console consuming the same JSON artifacts.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We'll just answer from the next-best permitted chunk" | That is exactly the safety hole this design closes. Stronger denied evidence → access_denied. |
| "Determinism is only for tests" | The entire demo and evaluation surface is designed to be bit-stable so behavior can be inspected without external services. |
| "We need a real LLM / vector DB to demo value" | The point of this platform is to isolate the control points (ingestion, policy, citations, audit, eval) without those dependencies. |
| "Access can be checked after generation" | Policy is applied before answer generation so denied content never enters the response path. |

## Red Flags

- Answering from a weaker permitted chunk while a stronger denied chunk exists
- Inferring access from the query text instead of an explicit Principal
- Breaking stable chunk IDs or checksums during ingestion changes
- Non-deterministic ordering in search results for equal scores
- Audit events missing principal, status, permitted/denied chunk IDs, or citation IDs
- Evaluation that does not measure policy_violations and access_denial_accuracy

## Verification

After changes or when reviewing an implementation of this pattern:

- [ ] Re-running the same demo produces identical `manifest.json`, audit order, and eval metrics
- [ ] Policy is applied before any answer text is generated
- [ ] Stronger inaccessible matches produce `access_denied`
- [ ] Citations always reference permitted chunks only
- [ ] Audit events include principal, status, permitted/denied IDs, citations
- [ ] Evaluation reports `policy_violations == 0` and `access_denial_accuracy == 1.0` on the clean suite
- [ ] Dashboard opens as static HTML with no external runtime deps

## Source

Original repository: https://github.com/sameer2191/enterprise-ai-knowledge-platform

Key modules live under `src/enterprise_ai_knowledge_platform/`. Architecture and extension notes are in `docs/`.
