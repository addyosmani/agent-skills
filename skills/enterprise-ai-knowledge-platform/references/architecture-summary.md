# Architecture Summary — Enterprise AI Knowledge Platform

## System Overview

Local, deterministic simulator of the main control points in an internal knowledge assistant. Favors plain files, small interfaces, and inspectable behavior with zero external services.

## Runtime Components

### Corpus
Documents carry: `document_id`, `title`, `department`, `classification`, `source`, `tags`, `body`.

### Ingestion
Stable chunk IDs: `<document_id>::chunk-<zero-padded-index>`.
Each chunk carries source URI, department, classification, token count, checksum, lineage. Manifest includes document/chunk counts and a corpus checksum derived from document checksums.

### Retrieval
Hybrid score = weighted blend of:
- Keyword score (query-term coverage)
- Hashed-vector score (deterministic token hashing + cosine similarity)

Results sorted by score then stable identifiers → deterministic ordering.

### Policy-Aware Answering
Retrieval results are filtered by principal (roles, departments, clearance) before answer generation. If a denied result is substantially stronger than the best permitted result → `access_denied`.

### Audit & Feedback
JSONL events with deterministic sequence numbers and timestamps. Query events record principal attributes, status, answer metadata, permitted/denied chunk IDs, citation IDs. Feedback links rating + comment back to answer ID.

### Evaluation
Fixed cases measuring answer coverage, access-denial accuracy, citation quality, policy violations.

### Dashboard
Static HTML. No runtime dependencies. Open directly from the filesystem.

## Design Boundary

Production integrations (FastAPI, vector DB, SSO, React, centralized logging) are intentionally outside the required runtime path. The executable demo stays portable and dependency-free. Keep the local artifact contract (`manifest.json`, `audit.jsonl`, `eval_results.json`, `dashboard.html`) stable when extending.
