# Changelog

All notable changes to the agent-skills project will be documented in this file.

## 2026-06-21 - Add skill-builder and specialized-agent safety gates

**What:** Added source-only skill/agent generation, strict artifact and dispatch-contract validation, a specialist persona, hermetic failure tests, architecture documentation, and a quick-start guide.

**Why:** Bob needed deterministic boundaries for deciding when to create skills, rejecting vague or unsafe dispatches, and requiring SPEC pointers for non-trivial specialized-agent work.

**Verification:** Targeted unittests, strict/compatibility validators, Python compilation, diff checks, and CP7 agent-standards verification.

**Agent:** Codex

**Follow-up hardening:** Applied unsafe-instruction checks to skills, specialized agents, and AGENTS.md; expanded prohibited-action coverage; enforced Git-worktree-local generation and packaging; replaced executable Python scripts with compliant Bash wrappers; and added regression tests for every reviewed blocker.

## 2026-05-06

### Added
- `HANDOFF.md` — Created handoff document for cross-session continuity
- `CHANGELOG.md` — Created changelog

### Changed
- `AGENTS.md` — Full rewrite with all 7 required CP7 Agent Operating Standard v1 sections:
  - Purpose
  - Key Facts
  - Architecture
  - Agents and Crons
  - Gotchas
  - Active Work
  - Decisions

## Earlier Changes

See git history for changes prior to 2026-05-06.
