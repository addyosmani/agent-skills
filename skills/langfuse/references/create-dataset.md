---
name: langfuse-dataset-construction
description: Collaborative Langfuse dataset creation workflow. Use when the user needs to create, design, seed, reshape, review, or upload a Langfuse dataset or dataset version; especially when they need a minimal but complete dataset, e.g. for quality checks or avoiding regression.
metadata:
  required_access:
    - LANGFUSE_PROJECT_INTERFACE
    - LANGFUSE_PROJECT_SCRIPT
---

# Langfuse Dataset Construction

## Primary Guide

Follow the [Langfuse Academy datasets guide](https://langfuse.com/academy/datasets) as the human-readable source of truth for dataset design; fetch current docs before implementation.

Use CLI schema/help discovery for current Langfuse API mechanics.

## Workflow

Guide the user through dataset creation as an interview, proposal, approval, implementation loop:

1. Read the primary guide and relevant current Langfuse docs.
2. Clarify the problem the user is facing, interviewing them if context is thin, to decide the goal, release, or evaluation decision the dataset should support.
3. Inspect available context: the user's goal, the application path or codebase when available, existing datasets, traces, prompts, scores, monitors, user feedback, tickets, expert examples, existing eval and dataset assets.
4. Interview the user on available sources beyond production traces.
5. For each step going forward, propose a direction and get the user's approval, specifically:
   - Dataset distribution dimensions (propose and get user input).
   - Item schema: input, expected output, metadata (propose and get user input).
6. Generate the first minimal draft of items against the approved schema and distribution, then present it for approval.
7. Heavily prompt the user to review expected outputs, as AI-generated expected outputs cannot be considered ground truth. Send a link with instructions to review.

## Critical Rules
- Do not create, upsert, reshape, or upload a live Langfuse dataset until the user has approved the dataset goal, source mix, item schema, and first minimal draft, unless the user already gave those details and explicitly asked for immediate mutation.
- Design the smallest complete dataset version that can serve the goal. Prefer a minimal reviewable v0 over broad coverage. A first draft is usually 5-12 high-signal items unless the user asks for a different size.
- Keep `input`, `expectedOutput`, and `metadata` responsibilities separate. Put additional information, notes, and comments into `metadata`, not into `input` or `expectedOutput`.
