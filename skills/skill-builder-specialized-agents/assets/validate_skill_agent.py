"""Validate repository skills, agent instructions, and dispatch contracts."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from skill_agent_lib import (
    validate_agent,
    validate_contract,
    validate_instruction_file,
    validate_skill,
)


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument("--root", type=Path, help="agent-skills repository root")
    group = result.add_mutually_exclusive_group(required=True)
    group.add_argument("--all", action="store_true", help="validate all repository skills in compatibility mode")
    group.add_argument("--skill", type=Path, help="strictly validate one SKILL.md")
    group.add_argument("--agent", type=Path, help="strictly validate one specialized-agent definition")
    group.add_argument("--instructions", type=Path, help="validate an AGENTS.md or other instruction file")
    group.add_argument("--contract", type=Path, help="validate one dispatch contract")
    return result


def main() -> int:
    args = parser().parse_args()
    checks: list[tuple[Path, list[str]]] = []
    if args.all:
        if not args.root:
            print("STOP: --all requires --root", file=sys.stderr)
            print("NEXT: pass the agent-skills repository root", file=sys.stderr)
            return 2
        for path in sorted((args.root / "skills").glob("*/SKILL.md")):
            checks.append(
                (path, validate_skill(path, strict=False, enforce_safety=False))
            )
    elif args.skill:
        checks.append((args.skill, validate_skill(args.skill, strict=True)))
    elif args.agent:
        checks.append((args.agent, validate_agent(args.agent, strict=True)))
    elif args.instructions:
        checks.append((args.instructions, validate_instruction_file(args.instructions)))
    else:
        checks.append((args.contract, validate_contract(args.contract)))

    failed = False
    for path, errors in checks:
        if errors:
            failed = True
            print(f"FAIL: {path}")
            for error in errors:
                print(f"  - {error}")
        else:
            print(f"PASS: {path}")
    if failed:
        print("STOP: validation failed", file=sys.stderr)
        print("NEXT: fix the listed errors and rerun this command", file=sys.stderr)
        return 1
    print(f"VALIDATION_REPORT: PASS ({len(checks)} artifact(s))")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
