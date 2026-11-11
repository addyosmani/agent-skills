#!/usr/bin/env python3
"""Validate every skill in skills/*/SKILL.md.

Checks, per skill (errors block the run):
  1. YAML frontmatter is present (``---`` block at the top of the file).
  2. Frontmatter ``name`` matches the skill's directory name, and the
     directory name is lowercase-hyphen-separated.
  3. Frontmatter ``description`` is 100-1024 chars and states trigger
     conditions: it must contain "Use when" (or the equivalent "Use
     before/after/during"), and a negated-only description ("Do not use
     when ...") does not count. The description value must also be valid
     YAML (no unquoted ": " inside it — a host parsing the frontmatter
     as YAML rejects the whole file otherwise).
  4. Required sections are present, per docs/skill-anatomy.md and the
     repo's own scripts/lib/skill-lint.js: ``## Overview``,
     ``## When to Use``, ``## Common Rationalizations``, ``## Red Flags``,
     ``## Verification``. Headings inside fenced code blocks do not count.
  5. A core workflow ("Process") section is present: a ``## Process`` or
     ``## Process: ...`` heading, or an equivalent heading named in
     docs/skill-anatomy.md (``Core Process``, ``The Workflow``, ``Steps``,
     ``How It Works``) or an established equivalent (``Pipeline``,
     ``Cycle``, ``Checklist`` — e.g. "The TDD Cycle", "The Quality Gate
     Pipeline", "The Triage Checklist"). The anatomy doc calls the
     section layout "a recommended pattern, not a rigid template", and
     five upstream reference-style skills carry no stepwise workflow at
     all, so those five are exempt from this check only (see
     PROCESS_EXEMPT, with reasons). Every other skill must have one.
  6. No placeholder text: bracketed unfinished markers (``[placeholder]``,
     ``[todo]``, ``[fixme]``, ``[tbd]``, ``[xxx]``). Note the check is
     deliberately narrow: words like "TODO" in example code comments,
     "Lorem ipsum" in UI-mock examples, and "placeholder" in prose about
     ``.env.example`` values are legitimate content in upstream skills
     and are NOT flagged.

``using-agent-skills`` is exempt from checks 4 and 5: it is a meta-skill
about discovering and invoking other skills, so it follows a different
anatomy. This mirrors the exemption in scripts/lib/skill-lint.js. All
other checks still apply to it.

Usage:
    python3 scripts/validate-skills.py [repo-root]

Exit code 0 when every skill passes, 1 otherwise. Python standard
library only.
"""

import re
import sys
from pathlib import Path

KEBAB_CASE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")

# A description must state WHEN to use the skill (skill-anatomy.md:
# Required). Accept "Use when ..." plus the equivalent "Use
# before/after/during ..." phrasings; reject negated-only descriptions.
DESCRIPTION_TRIGGER = re.compile(
    r"\buse (this )?when\b|\buse (before|after|during)\b", re.I
)
DESCRIPTION_TRIGGER_NEGATE = re.compile(
    r"\b(do not|don't|never) use (this )?(when|before|after|during)\b", re.I
)

# Bracketed markers that mean unfinished content. Deliberately narrow:
# see check 6 in the module docstring.
PLACEHOLDERS = ("[placeholder]", "[todo]", "[fixme]", "[tbd]", "[xxx]")

# Sections every standard SKILL.md must contain (skill-anatomy.md).
REQUIRED_SECTIONS = (
    "Overview",
    "When to Use",
    "Common Rationalizations",
    "Red Flags",
    "Verification",
)

# Headings that count as the skill's core workflow ("Process") section.
# "Process" / "Process: ..." plus the equivalents named in
# docs/skill-anatomy.md and established equivalents in use upstream.
PROCESS_PATTERNS = (
    "process",
    "workflow",
    "pipeline",
    "cycle",
    "checklist",
    "steps",
    "how it works",
)

# Skills exempt from the section checks (see module docstring).
SECTION_EXEMPT = {"using-agent-skills"}

# Upstream reference-style skills with no stepwise workflow section.
# The anatomy doc calls the section layout "a recommended pattern, not a
# rigid template", and these five are guides/templates rather than
# workflows, so they are exempt from the Process check only.
PROCESS_EXEMPT = {
    "api-and-interface-design": "Reference-style: principles + API/interface patterns, no stepwise workflow.",
    "context-engineering": "Reference-style: context hierarchy, conventions and patterns, no stepwise workflow.",
    "documentation-and-adrs": "Template-driven: the ADR template is the deliverable, no stepwise workflow.",
    "frontend-ui-engineering": "Reference-style: architecture, state and design-system guidance, no stepwise workflow.",
    "git-workflow-and-versioning": "Reference-style: branching strategy and patterns, no stepwise workflow.",
}


def strip_fenced_code_blocks(content):
    """Remove fenced code blocks (``` / ~~~) so headings and markers
    inside examples or templates are not matched by lint rules."""
    out = []
    open_fence = None  # (marker, length) while inside a fence
    for line in content.splitlines():
        if open_fence:
            close = re.match(r"^ {0,3}(`{3,}|~{3,})[ \t]*$", line)
            if close and close.group(1)[0] == open_fence[0] and len(close.group(1)) >= open_fence[1]:
                open_fence = None
            out.append("")
            continue
        start = re.match(r"^ {0,3}(`{3,}|~{3,})(.*)$", line)
        if start and not (start.group(1)[0] == "`" and "`" in start.group(2)):
            open_fence = (start.group(1)[0], len(start.group(1)))
            out.append("")
            continue
        out.append(line)
    return "\n".join(out)


def parse_frontmatter(text):
    """Return (frontmatter dict, body) or (None, text) if no frontmatter."""
    match = re.match(r"^---\n(.*?)\n---\n?", text, re.DOTALL)
    if not match:
        return None, text
    fields = {}
    for line in match.group(1).splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            fields[key.strip()] = value.strip()
    return fields, text[match.end():]


def headings(body):
    """Return the list of level-2 heading titles in the body."""
    return [m.group(1).strip() for m in re.finditer(r"^##\s+(.+)$", body, re.M)]


def has_process_section(found):
    """True if any level-2 heading is the skill's core workflow section."""
    for heading in found:
        lowered = heading.lower()
        if lowered == "process" or lowered.startswith("process:"):
            return True
        if any(pattern in lowered for pattern in PROCESS_PATTERNS):
            return True
    return False


def check_skill(path):
    """Check one SKILL.md. Return a list of error strings (empty = pass)."""
    errors = []
    name = path.parent.name
    text = path.read_text(encoding="utf-8")

    frontmatter, body = parse_frontmatter(text)
    if frontmatter is None:
        errors.append("missing YAML frontmatter (--- block)")
        return errors

    if frontmatter.get("name") != name:
        errors.append(
            f"frontmatter name {frontmatter.get('name')!r} does not match "
            f"directory name {name!r}"
        )
    if not KEBAB_CASE.match(name):
        errors.append(
            f"directory name {name!r} is not lowercase-hyphen-separated"
        )

    description = frontmatter.get("description", "")
    if len(description) < 100:
        errors.append(
            f"description is {len(description)} chars, must be >= 100"
        )
    if len(description) > 1024:
        errors.append(
            f"description is {len(description)} chars, exceeds 1024"
        )
    if ": " in description or description.endswith(":"):
        errors.append(
            "description has an unquoted ': ' — YAML reads that as a "
            "nested mapping and a host parsing the frontmatter rejects "
            "the file; wrap the value in quotes"
        )
    stripped = DESCRIPTION_TRIGGER_NEGATE.sub("", description)
    if not DESCRIPTION_TRIGGER.search(description) or not DESCRIPTION_TRIGGER.search(stripped):
        errors.append(
            'description has no "when to use" trigger — add a '
            '"Use when ..." clause'
        )

    prose = strip_fenced_code_blocks(body)
    found = headings(prose)
    if name not in SECTION_EXEMPT:
        for section in REQUIRED_SECTIONS:
            if section not in found:
                errors.append(f"missing required section: ## {section}")
        if name not in PROCESS_EXEMPT and not has_process_section(found):
            errors.append(
                "missing core workflow section: ## Process (or an "
                "equivalent heading such as Core Process / The Workflow / "
                "Steps / How It Works)"
            )

    lowered = body.lower()
    for marker in PLACEHOLDERS:
        if marker in lowered:
            errors.append(f"placeholder text found: {marker!r}")

    return errors


def main(argv):
    root = Path(argv[1]) if len(argv) > 1 else Path(__file__).resolve().parent.parent
    skill_files = sorted((root / "skills").glob("*/SKILL.md"))
    if not skill_files:
        print("no skills found under skills/")
        return 1

    total_errors = 0
    for path in skill_files:
        errors = check_skill(path)
        if errors:
            total_errors += len(errors)
            print(f"  \u2717  {path.parent.name}")
            for error in errors:
                print(f"       ERROR: {error}")
        else:
            print(f"  \u2713  {path.parent.name}")

    print()
    print(
        f"{len(skill_files)} skills checked \u2014 "
        f"{total_errors} error(s) \u2014 "
        f"{'PASSED' if total_errors == 0 else 'FAILED'}"
    )
    return 0 if total_errors == 0 else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
