# AGENT-SKILLS REPOSITORY - COMPREHENSIVE ANALYSIS REPORT

## QUICK FACTS

- Total Skills: 24 (23 lifecycle + 1 meta-skill)
- Slash Commands: 8
- Agent Personas: 4
- Supported Platforms: 70+
- Framework: Plugin-based, Markdown-driven
- Author: Addy Osmani
- License: MIT

---

## 24 SKILLS BY LIFECYCLE STAGE

### DEFINE (3)
1. interview-me
2. idea-refine
3. spec-driven-development

### PLAN (1)
4. planning-and-task-breakdown

### BUILD (7)
5. incremental-implementation
6. test-driven-development
7. context-engineering
8. source-driven-development
9. doubt-driven-development
10. frontend-ui-engineering
11. api-and-interface-design

### VERIFY (2)
12. browser-testing-with-devtools
13. debugging-and-error-recovery

### REVIEW (4)
14. code-review-and-quality
15. code-simplification
16. security-and-hardening
17. performance-optimization

### SHIP (6)
18. git-workflow-and-versioning
19. ci-cd-and-automation
20. deprecation-and-migration
21. documentation-and-adrs
22. observability-and-instrumentation
23. shipping-and-launch

### META (1)
24. using-agent-skills

---

## 8 SLASH COMMANDS

/spec - spec-driven-development
/plan - planning-and-task-breakdown
/build - incremental-implementation + test-driven-development
/build auto - Execute entire plan autonomously
/test - test-driven-development
/review - code-review-and-quality
/webperf - web-performance-auditor
/code-simplify - code-simplification
/ship - shipping-and-launch + ci-cd-and-automation

---

## DIRECTORY STRUCTURE

skills/              - 24 skill definitions
commands/            - 8 command definitions (TOML)
agents/              - 4 agent personas (Markdown)
evals/               - Test framework
docs/                - 11 setup guides
references/          - 7 reference checklists
scripts/             - Validation and runners
hooks/               - Session hooks
plugin.json          - Main manifest
.claude-plugin/      - Claude Code config
.codex-plugin/       - Codex config


