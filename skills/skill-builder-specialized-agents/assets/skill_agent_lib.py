"""Shared generation, path-boundary, and validation logic."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Iterable


NAME_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
PLACEHOLDER_RE = re.compile(
    r"(?i)\b(?:todo|tbd|fixme|replace\s+this)\b|\[(?:fill|describe|insert)[^]]*\]"
)
VAGUE_OBJECTIVES = {
    "improve the system",
    "handle this",
    "fix it",
    "do the thing",
    "make it better",
    "work on this",
}
UNSAFE_RE = re.compile(
    r"(?ix)(?:"
    r"\bsystemctl\s+(?:--user\s+)?(?:restart|reload|start|stop|enable|disable)\b|"
    r"\bservice\s+\S+\s+(?:restart|reload|start|stop)\b|"
    r"\b(?:restart|reload|start|stop)\b.{0,40}\b(?:hermes|bob|gateway|service)s?\b|"
    r"\b(?:hermes|bob|gateway|service)s?\b.{0,40}\b(?:restart|reload|start|stop)\b|"
    r"\bdocker(?:\s+compose)?\s+(?:restart|up|down|start|stop|rm|kill)\b|"
    r"\bdeploy\b(?!\s+(?:method|status|policy|restriction|permission|approval|"
    r"step|risk|instruction|command|workflow|plan|strategy|documentation)\b)|"
    r"\btmux\b.{0,40}\bkill(?:-session|-server)?\b|"
    r"\bkill\b.{0,40}\btmux\b|"
    r"--no-verify\b|"
    r"\bgit\s+push\b.{0,80}\b(?:master|main)\b|"
    r"\bpush\s+(?:origin\s+)?(?:master|main)\b|"
    r"\b(?:edit|modify|write|replace|copy|install|delete|remove|mutate)\b.{0,60}"
    r"(?:/home/chris/\.hermes|~/?\.hermes|/home/chris/bin/bob-dispatch|"
    r"live\s+(?:runtime|config)|runtime\s+config|SOUL\.md)"
    r")"
)
NEGATION_RE = re.compile(
    r"(?i)\b(?:do not|does not|don't|must not|never|forbidden|prohibited|"
    r"refuse|reject|without explicit approval|not authorized|not permitted)\b"
    r"|\bno\s+(?:runtime|deployment|services?)\b"
)

STRICT_SKILL_SECTIONS = (
    "Overview",
    "When to Use",
    "Workflow",
    "Common Rationalizations",
    "Red Flags",
    "Verification",
)
AGENT_SECTIONS = (
    "Overview",
    "Responsibilities",
    "Routing Contract",
    "Safety Restrictions",
    "Output Format",
    "Stop Conditions",
)
CONTRACT_SECTIONS = (
    "Objective",
    "Scope",
    "Expected Outputs",
    "Verification Commands",
    "Safety Restrictions",
    "Stop Conditions",
    "Creation Report",
)
CONTRACT_FIELDS = (
    "contract_version",
    "task_id",
    "orchestrator",
    "execution_role",
    "agent",
    "task_class",
    "risk",
    "workspace",
    "spec",
)
NONTRIVIAL_CLASSES = {"build", "review", "audit", "refactor", "migration"}


def parse_frontmatter(text: str) -> tuple[dict[str, str], str, list[str]]:
    errors: list[str] = []
    if not text.startswith("---\n"):
        return {}, text, ["file must start with YAML frontmatter"]
    end = text.find("\n---\n", 4)
    if end < 0:
        return {}, text, ["frontmatter is not closed"]
    values: dict[str, str] = {}
    for line in text[4:end].splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if ":" not in line:
            errors.append(f"invalid frontmatter line: {line}")
            continue
        key, value = line.split(":", 1)
        key = key.strip()
        value = value.strip().strip("'\"")
        if not key or not value:
            errors.append(f"frontmatter field is empty: {key or '<unknown>'}")
        elif key in values:
            errors.append(f"duplicate frontmatter field: {key}")
        else:
            values[key] = value
    return values, text[end + 5 :], errors


def headings(body: str) -> set[str]:
    return {match.group(1).strip() for match in re.finditer(r"(?m)^##\s+(.+?)\s*$", body)}


def section_text(body: str, name: str) -> str:
    match = re.search(
        rf"(?ms)^##\s+{re.escape(name)}\s*$\n(.*?)(?=^##\s+|\Z)", body
    )
    return match.group(1).strip() if match else ""


def validate_identity(name: str, description: str, *, require_trigger: bool = True) -> list[str]:
    errors: list[str] = []
    if not NAME_RE.fullmatch(name):
        errors.append("name must be kebab-case")
    if not description:
        errors.append("description is required")
    elif len(description) > 1024:
        errors.append("description exceeds 1024 characters")
    elif require_trigger and "use when" not in description.lower():
        errors.append("description must include explicit 'Use when' triggers")
    return errors


def unsafe_instruction_errors(text: str) -> list[str]:
    unsafe = list(_unsafe_lines(text))
    return [f"unsafe instruction is not allowed: {line}" for line in unsafe]


def validate_instruction_file(path: Path) -> list[str]:
    if not path.is_file():
        return ["instruction file does not exist"]
    return unsafe_instruction_errors(path.read_text(encoding="utf-8"))


def validate_skill(
    path: Path, *, strict: bool = True, enforce_safety: bool = True
) -> list[str]:
    errors: list[str] = []
    if path.name != "SKILL.md":
        errors.append("skill filename must be exactly SKILL.md")
    if not path.is_file():
        return errors + ["skill file does not exist"]
    text = path.read_text(encoding="utf-8")
    values, body, parse_errors = parse_frontmatter(text)
    errors.extend(parse_errors)
    if enforce_safety:
        errors.extend(unsafe_instruction_errors(text))
    name = values.get("name", "")
    errors.extend(
        validate_identity(name, values.get("description", ""), require_trigger=strict)
    )
    if name and name != path.parent.name:
        errors.append(f"frontmatter name '{name}' must match directory '{path.parent.name}'")
    if not body.strip():
        errors.append("skill body is empty")
    if strict:
        present = headings(body)
        for required in STRICT_SKILL_SECTIONS:
            if required not in present:
                errors.append(f"missing required section: {required}")
            elif not section_text(body, required):
                errors.append(f"required section is empty: {required}")
    return errors


def validate_agent(path: Path, *, strict: bool = True) -> list[str]:
    if not path.is_file():
        return ["agent file does not exist"]
    text = path.read_text(encoding="utf-8")
    values, body, errors = parse_frontmatter(text)
    errors.extend(unsafe_instruction_errors(text))
    name = values.get("name", "")
    errors.extend(validate_identity(name, values.get("description", "")))
    if name and name != path.stem:
        errors.append(f"frontmatter name '{name}' must match filename '{path.stem}'")
    if strict:
        if values.get("role") != "specialized-agent":
            errors.append("role must be specialized-agent")
        if values.get("route") not in {"cursor", "pi", "oc"}:
            errors.append("route must be cursor, pi, or oc")
        present = headings(body)
        for required in AGENT_SECTIONS:
            if required not in present:
                errors.append(f"missing required section: {required}")
            elif not section_text(body, required):
                errors.append(f"required section is empty: {required}")
    return errors


def _unsafe_lines(text: str) -> Iterable[str]:
    for line in text.splitlines():
        for clause in re.split(r";|(?<=[.!?])\s+", line):
            if UNSAFE_RE.search(clause) and not NEGATION_RE.search(clause):
                yield clause.strip()


def validate_repo_root(root_value: Path) -> tuple[Path, list[str]]:
    root = root_value.expanduser().resolve()
    errors: list[str] = []
    if ".hermes" in root.parts:
        errors.append("live Hermes paths are not valid repository roots")
    if not (root / ".git").exists():
        errors.append("root must be a Git repository or worktree")
    for required in ("AGENTS.md", "HANDOFF.md"):
        if not (root / required).is_file():
            errors.append(f"root missing required boundary marker: {required}")
    for required in ("skills", "agents"):
        directory = root / required
        if not directory.is_dir():
            errors.append(f"root missing required directory: {required}/")
        elif not directory.resolve().is_relative_to(root):
            errors.append(f"{required}/ resolves outside the repository root")
    return root, errors


def find_repo_root(path: Path) -> Path | None:
    resolved = path.expanduser().resolve()
    for candidate in (resolved, *resolved.parents):
        if (
            (candidate / ".git").exists()
            and (candidate / "AGENTS.md").is_file()
            and (candidate / "HANDOFF.md").is_file()
            and (candidate / "skills").is_dir()
        ):
            return candidate
    return None


def _valid_spec(path_value: str) -> list[str]:
    if not path_value or path_value.upper() == "NONE":
        return ["non-trivial work requires an existing SPEC pointer"]
    path = Path(path_value).expanduser()
    if not path.is_absolute():
        return ["SPEC pointer must be an absolute path"]
    if not path.is_file():
        return [f"SPEC not found: {path}"]
    content = path.read_text(encoding="utf-8")
    if len(content.strip()) < 200 or PLACEHOLDER_RE.search(content):
        return ["SPEC is empty or contains placeholder content"]
    required = ("Objective", "Requirements")
    present = headings(content)
    missing = [section for section in required if section not in present]
    return [f"SPEC missing section: {section}" for section in missing]


def validate_contract(path: Path) -> list[str]:
    if not path.is_file():
        return ["contract file does not exist"]
    text = path.read_text(encoding="utf-8")
    values, body, errors = parse_frontmatter(text)
    for field in CONTRACT_FIELDS:
        if not values.get(field):
            errors.append(f"missing contract field: {field}")
    if values.get("contract_version") != "1":
        errors.append("contract_version must be 1")
    if values.get("orchestrator") != "bob":
        errors.append("orchestrator must be bob")
    if values.get("execution_role") not in {
        "skill-authoring",
        "agent-dispatch",
        "direct-execution",
    }:
        errors.append("execution_role must distinguish skill-authoring, agent-dispatch, or direct-execution")
    agent = values.get("agent")
    if agent not in {"cursor", "pi", "oc", "none"}:
        errors.append("agent must be cursor, pi, oc, or none")
    if agent == "oc" and values.get("oc_explicitly_requested") != "true":
        errors.append("OpenCode requires oc_explicitly_requested: true")
    if values.get("risk") not in {"low", "medium", "high"}:
        errors.append("risk must be low, medium, or high")
    if values.get("task_class") not in NONTRIVIAL_CLASSES | {"quick", "read-only"}:
        errors.append("task_class must be build, review, audit, refactor, migration, quick, or read-only")
    workspace = values.get("workspace", "")
    if workspace and not Path(workspace).expanduser().is_absolute():
        errors.append("workspace must be an absolute path")
    present = headings(body)
    for required in CONTRACT_SECTIONS:
        if required not in present:
            errors.append(f"missing required section: {required}")
        elif not section_text(body, required):
            errors.append(f"required section is empty: {required}")
    objective = section_text(body, "Objective").strip().rstrip(".").lower()
    objective_words = re.findall(r"[a-z0-9]+", objective)
    if objective in VAGUE_OBJECTIVES or len(objective_words) < 8 or PLACEHOLDER_RE.search(objective):
        errors.append("objective is vague; provide a bounded action, target, and outcome")
    scope = section_text(body, "Scope")
    if scope and len(re.findall(r"[a-z0-9]+", scope.lower())) < 6:
        errors.append("scope is vague; name concrete files, components, or boundaries")
    task_class = values.get("task_class", "").lower()
    if task_class in NONTRIVIAL_CLASSES:
        errors.extend(_valid_spec(values.get("spec", "")))
    elif values.get("spec", "").upper() == "NONE" and task_class not in {"quick", "read-only"}:
        errors.append("SPEC may be NONE only for explicitly quick or read-only work")
    errors.extend(unsafe_instruction_errors(text))
    report = section_text(body, "Creation Report")
    for label in ("Files changed", "Verification", "Remaining risks", "Stop reason"):
        if label.lower() not in report.lower():
            errors.append(f"creation report missing field: {label}")
    return errors


def render_skill(name: str, purpose: str, trigger: str, scope: str) -> str:
    description = f"Guides agents through {purpose.rstrip('.')}. Use when {trigger.rstrip('.')}."
    return f"""---
name: {name}
description: {description}
---

# {name.replace('-', ' ').title()}

## Overview

{purpose.rstrip('.')}.

## When to Use

- Use when {trigger.rstrip('.')}.
- Do not use outside this scope: {scope.rstrip('.')}.

## Workflow

1. Confirm the objective, scope, safety boundaries, and required evidence.
2. Read applicable project instructions and an on-disk SPEC for non-trivial work.
3. Perform only the bounded work and stop on missing authority or failed gates.
4. Run the exact verification commands and report evidence.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| “The task is obvious.” | Non-trivial work still requires a concrete SPEC and bounded scope. |
| “I can validate later.” | Validation is required before the artifact is used. |

## Red Flags

- The objective does not name an action, target, and outcome.
- The task requests production-impacting changes without explicit approval.
- Verification is described without exact commands.

## Verification

- [ ] Scope stayed within: {scope.rstrip('.')}.
- [ ] Required tests and validators passed.
- [ ] The report lists changed files, verification, risks, and stop reason.
"""


def render_agent(name: str, purpose: str, scope: str, route: str) -> str:
    return f"""---
name: {name}
description: Performs {purpose.rstrip('.')}. Use when a bounded dispatch contract explicitly selects this specialist.
role: specialized-agent
route: {route}
---

# {name.replace('-', ' ').title()}

## Overview

This specialist performs {purpose.rstrip('.')} within an explicit routing contract.

## Responsibilities

- Work only within this boundary: {scope.rstrip('.')}.
- Produce the expected outputs and verification evidence named by the contract.

## Routing Contract

- Bob remains the orchestrator and supplies a validated dispatch contract.
- Non-trivial work requires an existing SPEC pointer.
- Cursor is the default build route; Pi is for escalation/review; OpenCode requires explicit request.

## Safety Restrictions

- Do not restart services, deploy, kill tmux sessions, use `--no-verify`, push main/master, or modify live runtime configuration.
- Stop when the contract lacks authority for a required action.

## Output Format

Report files changed, exact verification results, remaining risks, and stop reason.

## Stop Conditions

- The objective or scope is vague.
- A required SPEC is missing or contains placeholders.
- The task requires a prohibited or production-impacting action.
"""
