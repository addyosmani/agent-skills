# AGENT-SKILLS REPOSITORY - CHI TIẾT CẤU TRÚC

## 1. CẤU TRÚC THƯ MỤC CHÍNH

agent-skills/
├── skills/                          # 24 kỹ năng (Skills)
├── commands/                        # 8 lệnh Slash
├── agents/                          # 4 Agent Personas chuyên biệt
├── docs/                            # Tài liệu thiết lập
├── evals/                           # Test cases & evaluation framework
├── hooks/                           # Session hooks
├── references/                      # Checklists & reference material
├── scripts/                         # Validation & evaluation scripts
├── .claude/                         # Claude Code plugin config
├── plugin.json                      # Plugin manifest
├── CONTRIBUTING.md                  # Hướng dẫn đóng góp
└── LICENSE (MIT)

---

## 2. DANH SÁCH TẤT CẢ 24 SKILLS

### NHÓM: Meta (1 skill)
1. using-agent-skills - Maps incoming work to right skill workflow

### NHÓM: Define (3 skills) - Làm rõ yêu cầu
2. interview-me - One-question-at-a-time interview extraction
3. idea-refine - Structured divergent/convergent thinking
4. spec-driven-development - Write PRD before code

### NHÓM: Plan (1 skill)
5. planning-and-task-breakdown - Decompose specs into verifiable tasks

### NHÓM: Build (7 skills)
6. incremental-implementation - Thin vertical slices, test, commit
7. test-driven-development - Red-Green-Refactor, test pyramid
8. context-engineering - Feed agents right information at right time
9. source-driven-development - Ground decisions in official docs
10. doubt-driven-development - Adversarial review of decisions
11. frontend-ui-engineering - Component architecture, design systems
12. api-and-interface-design - Contract-first design, boundaries

### NHÓM: Verify (2 skills)
13. browser-testing-with-devtools - Chrome DevTools MCP runtime data
14. debugging-and-error-recovery - Five-step triage workflow

### NHÓM: Review (4 skills)
15. code-review-and-quality - Five-axis review before merge
16. code-simplification - Reduce complexity, preserve behavior
17. security-and-hardening - OWASP Top 10, auth, secrets
18. performance-optimization - Measure-first, Core Web Vitals

### NHÓM: Ship (6 skills)
19. git-workflow-and-versioning - Trunk-based, atomic commits
20. ci-cd-and-automation - Shift Left, quality gates, feature flags
21. deprecation-and-migration - Code liability, migration patterns
22. documentation-and-adrs - ADRs, API docs, inline docs
23. observability-and-instrumentation - Structured logging, RED metrics
24. shipping-and-launch - Pre-launch checklist, staged rollout

---

## 3. SLASH COMMANDS - 8 LỆNH CHÍNH

/spec      - Định nghĩa cần build (Spec-driven-development)
/plan      - Lên kế hoạch (Planning-and-task-breakdown)
/build     - Viết code từng slice (Incremental-implementation + TDD)
/build auto - Auto execute entire plan
/test      - Chứng minh hoạt động (Test-driven-development)
/review    - QA gate (Code-review-and-quality)
/webperf   - Audit hiệu năng web (Web-performance-auditor)
/code-simplify - Đơn giản hóa mã (Code-simplification)
/ship      - Deploy (Shipping-and-launch + CI-CD)

---

## 4. AGENT PERSONAS - 4 Chuyên gia

1. code-reviewer - Senior Staff Engineer (Five-axis review)
2. test-engineer - QA Specialist (Coverage analysis)
3. security-auditor - Security Engineer (OWASP, vulnerabilities)
4. web-performance-auditor - Web Perf Engineer (Core Web Vitals)

---

## 5. CẤU HÌNH & FILE QUAN TRỌNG

Plugin Configuration:
- plugin.json - Main manifest (v1.0.0)
- .claude-plugin/plugin.json - Claude Code config
- .codex-plugin/plugin.json - Codex support
- hooks/hooks.json - SessionStart hook

Documentation:
- docs/skill-anatomy.md (IMPORTANT - How to create skills)
- docs/getting-started.md
- docs/agents.md
- docs/claude-setup.md, cursor-setup.md, codex-setup.md, etc.

References:
- references/definition-of-done.md
- references/testing-patterns.md
- references/security-checklist.md
- references/performance-checklist.md
- references/accessibility-checklist.md
- references/observability-checklist.md
- references/orchestration-patterns.md

---

## 6. TEMPLATE CHO SKILL MỚI

Cấu trúc folder:
skills/my-new-skill/
├── SKILL.md                 (Bắt buộc)
├── scripts/                 (Tùy chọn)
└── supporting-file.md       (Tùy chọn)

SKILL.md template:
---
name: kebab-case-skill-name
description: Guides agents through [workflow]. Use when [trigger].
---

# Skill Title

## Overview
[What this does and why]

## When to Use
- [Trigger 1]
- [Trigger 2]

## Core Process
1. [Step 1]
2. [Step 2]

## Common Rationalizations
| Excuse | Reality |
|---|---|

## Red Flags
- [Warning 1]

## Verification
- [ ] Exit criterion

---

## 7. QUY TRÌNH TẠO SKILL MỚI

1. Search existing skills (README + skills/ folder)
2. Check open PRs for duplicates
3. Read docs/skill-anatomy.md
4. Create skills/kebab-case-name/ folder
5. Create SKILL.md with frontmatter + sections
6. Create eval case: evals/cases/skill-name.json
7. Optional: Add scripts/ if runnable helpers needed
8. Run validation:
   - node scripts/validate-skills.js
   - node scripts/run-evals.js
   - node scripts/run-evals.js --behavioral skill-name

---

## 8. FRAMEWORK & CÔNG NGHỆ

- Format: Markdown + YAML frontmatter
- Installation: npx skills add addyosmani/agent-skills
- Native support: 70+ agents (Claude, Cursor, Codex, Copilot, Cline, etc.)
- Commands: TOML + prompt templates
- Testing: 3-tier (Structural → Routing → Behavioral)
- Evaluation: run-evals.js (Tier 2 & 3)

---

## 9. TÓM TẮT - TỔNG SỐ SKILLS

TỔNG CỘNG: 24 SKILLS

Phân bố:
- Meta: 1 skill
- Define (Spec, Interview): 3 skills
- Plan: 1 skill
- Build (Code, Test, Patterns): 7 skills
- Verify (Test, Debug): 2 skills
- Review (Quality gates): 4 skills
- Ship (Deploy, Launch): 6 skills

Đặc điểm:
✓ Production-grade (based on senior engineer workflows)
✓ Specific & Verifiable (actionable steps, exit criteria)
✓ Battle-tested (real engineering practices)
✓ Minimal & Focused (only needed content)

---

## 10. INSTALLATION OPTIONS

Universal CLI:
npx skills add addyosmani/agent-skills
npx skills add addyosmani/agent-skills --skill code-review-and-quality

Claude Code:
/plugin marketplace add addyosmani/agent-skills

Codex:
codex plugin marketplace add addyosmani/agent-skills

Cursor:
Copy skills to .cursor/skills/

Antigravity:
agy plugin install https://github.com/addyosmani/agent-skills.git

Gemini CLI:
gemini skills install https://github.com/addyosmani/agent-skills.git

---

SUMMARY:

Repository: agent-skills (Production-grade engineering skills)
Total Skills: 24 (23 lifecycle + 1 meta)
Slash Commands: 8
Agent Personas: 4
Supported Platforms: 70+ agents
Framework: Plugin-based, Markdown-driven
Author: Addy Osmani
License: MIT
