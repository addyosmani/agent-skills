#!/bin/bash
set -e

# Agent Skills — Windsurf Global Installer
# Installs agent-skills globally for Windsurf IDE

AGENTS_DIR="${HOME}/.agents/skills"
WINDSURF_MEMORIES_DIR=""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Detect OS and set Windsurf memories directory
detect_os() {
    case "$(uname -s)" in
        Darwin*)
            WINDSURF_MEMORIES_DIR="${HOME}/.codeium/windsurf/memories"
            ;;
        Linux*)
            WINDSURF_MEMORIES_DIR="${HOME}/.codeium/windsurf/memories"
            ;;
        CYGWIN*|MINGW32*|MSYS*|MINGW*)
            WINDSURF_MEMORIES_DIR="${USERPROFILE}/.codeium/windsurf/memories"
            ;;
        *)
            echo "Unsupported OS. Please install manually."
            exit 1
            ;;
    esac
}

# Check if running from the agent-skills repository
check_repo() {
    if [ ! -f "${REPO_DIR}/AGENTS.md" ] || [ ! -d "${REPO_DIR}/skills" ]; then
        echo "Error: This script must be run from the agent-skills repository."
        echo "Please clone https://github.com/addyosmani/agent-skills.git and run:"
        echo "  bash scripts/install-windsurf.sh"
        exit 1
    fi
}

# Copy skills to global location
install_skills() {
    echo "📦 Installing skills to ${AGENTS_DIR}..."
    mkdir -p "${AGENTS_DIR}"
    cp -R "${REPO_DIR}/skills/"* "${AGENTS_DIR}/"
    echo "✅ Installed $(ls -1 "${AGENTS_DIR}" | wc -l | tr -d ' ') skills"
}

# Create global rules file
create_global_rules() {
    echo "🌐 Creating global rules for Windsurf..."
    mkdir -p "${WINDSURF_MEMORIES_DIR}"
    
    cat > "${WINDSURF_MEMORIES_DIR}/global_rules.md" << 'EOF'
# Global Agent Skills — Intent Mapping

These rules apply to ALL projects. When a task matches a skill, you MUST use it.

## Core Rules

- If a task matches a skill, you MUST use it
- Skills are located in `~/.agents/skills/<skill-name>/SKILL.md`
- Never implement directly if a skill applies
- Always follow the skill instructions exactly (do not partially apply them)
- When invoking a skill, read its `SKILL.md` and follow it strictly

## Intent → Skill Mapping

- Feature / new functionality → `spec-driven-development`, then `incremental-implementation`, `test-driven-development`
- Planning / breakdown → `planning-and-task-breakdown`
- Bug / failure / unexpected behavior → `debugging-and-error-recovery`
- Code review → `code-review-and-quality`
- Refactoring / simplification → `code-simplification`
- API or interface design → `api-and-interface-design`
- UI work → `frontend-ui-engineering`
- Performance issues → `performance-optimization`
- Security concerns → `security-and-hardening`
- CI/CD setup → `ci-cd-and-automation`
- Documentation → `documentation-and-adrs`
- Git workflow → `git-workflow-and-versioning`
- Shipping / launch → `shipping-and-launch`
- Deprecation or migration → `deprecation-and-migration`
- Testing with browser DevTools → `browser-testing-with-devtools`
- Context engineering → `context-engineering`
- Source-driven development → `source-driven-development`

## Lifecycle Mapping (Implicit Commands)

Windsurf does not support slash commands like `/spec` or `/plan`.

Instead, you must internally follow this lifecycle:

- DEFINE → `spec-driven-development`
- PLAN → `planning-and-task-breakdown`
- BUILD → `incremental-implementation` + `test-driven-development`
- VERIFY → `debugging-and-error-recovery`
- REVIEW → `code-review-and-quality`
- SHIP → `shipping-and-launch`

## Execution Model

For every request:

1. Determine if any skill applies (even 1% chance)
2. Read the appropriate skill from `~/.agents/skills/<skill-name>/SKILL.md`
3. Follow the skill workflow strictly
4. Only proceed to implementation after required steps (spec, plan, etc.) are complete

## Anti-Rationalization

The following thoughts are incorrect and must be ignored:

- "This is too small for a skill"
- "I can just quickly implement this"
- "I'll gather context first"

Correct behavior:

- Always check for and use skills first
EOF

    echo "✅ Global rules created at ${WINDSURF_MEMORIES_DIR}/global_rules.md"
}

# Install workspace rules in current directory
install_workspace_rules() {
    read -p "📁 Install workspace rules in current project? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        return
    fi

    if [ ! -d ".git" ]; then
        echo "⚠️  Current directory does not appear to be a git repository."
        read -p "   Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return
        fi
    fi

    echo "📁 Installing workspace rules..."
    mkdir -p ".windsurf/rules"

    # Base rules
    cat > ".windsurf/rules/agent-skills.md" << 'EOF'
---
trigger: always_on
---

# Agent Skills Base Rules

This project uses agent-skills workflows. Always check if a skill applies before acting.

## Core Principles

- Spec before code
- Test before implementation
- Review before merge
- One logical change per commit (~100 lines)
EOF

    # TDD rule
    cat > ".windsurf/rules/test-driven-development.md" << 'EOF'
---
trigger: model_decision
description: Use when implementing logic, fixing bugs, or changing behavior. Triggers for "add tests", "fix bug", "implement feature", "TDD".
---

# Test-Driven Development

Read `~/.agents/skills/test-driven-development/SKILL.md` and follow its workflow.

Key principles:
- Red-Green-Refactor cycle
- Test pyramid (80% unit, 15% integration, 5% E2E)
- DAMP over DRY in tests
- Beyonce Rule: if you liked it, you should have put a test on it
EOF

    # Spec-driven rule
    cat > ".windsurf/rules/spec-driven-development.md" << 'EOF'
---
trigger: model_decision
description: Use when starting a new project, feature, or significant change. Triggers for "design", "spec", "PRD", "plan feature".
---

# Spec-Driven Development

Read `~/.agents/skills/spec-driven-development/SKILL.md` and follow its workflow.

Key principles:
- Write spec before code
- Cover objectives, commands, structure, code style, testing, boundaries
EOF

    # Debugging rule
    cat > ".windsurf/rules/debugging-and-error-recovery.md" << 'EOF'
---
trigger: model_decision
description: Use when tests fail, builds break, or behavior is unexpected. Triggers for "fix bug", "debug", "error", "crash", "500".
---

# Debugging and Error Recovery

Read `~/.agents/skills/debugging-and-error-recovery/SKILL.md` and follow its workflow.

Key principles:
- Reproduce → Localize → Reduce → Fix → Guard
- Stop-the-line rule
- Safe fallbacks
EOF

    # Code review rule
    cat > ".windsurf/rules/code-review-and-quality.md" << 'EOF'
---
trigger: model_decision
description: Use before merging any change. Triggers for "review", "PR", "quality", "check this code".
---

# Code Review and Quality

Read `~/.agents/skills/code-review-and-quality/SKILL.md` and follow its workflow.

Key principles:
- Five-axis review (correctness, design, readability, testing, maintainability)
- Change sizing (~100 lines)
- Severity labels (Nit/Optional/FYI)
EOF

    echo "✅ Workspace rules installed in .windsurf/rules/"
    echo ""
    echo "Installed rules:"
    ls -1 ".windsurf/rules/" | sed 's/^/  - /'
}

# Create AGENTS.md template
create_agents_md() {
    if [ -f "AGENTS.md" ]; then
        echo "📄 AGENTS.md already exists. Skipping."
        return
    fi

    read -p "📄 Create AGENTS.md in current project? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        return
    fi

    cat > "AGENTS.md" << 'EOF'
# AGENTS.md

## Project Context

[Describe your project here — tech stack, architecture, team conventions]

## Agent Behavior

- Always check if a skill applies before implementing
- If a skill applies, you MUST use it
- Never skip required workflows (spec, plan, test, review)
- Follow the lifecycle: DEFINE → PLAN → BUILD → VERIFY → REVIEW → SHIP
EOF

    echo "✅ AGENTS.md created"
}

# Main
main() {
    echo "🌊 Agent Skills — Windsurf Installer"
    echo "====================================="
    echo ""

    detect_os
    check_repo
    install_skills
    create_global_rules
    install_workspace_rules
    create_agents_md

    echo ""
    echo "====================================="
    echo "✅ Installation complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Restart Windsurf if it's already running"
    echo "  2. Open any project and try: 'Design a feature for adding login'"
    echo "  3. Cascade should detect the skill and follow its workflow"
    echo ""
    echo "Documentation: https://github.com/addyosmani/agent-skills/blob/main/docs/windsurf-setup.md"
}

main "$@"
