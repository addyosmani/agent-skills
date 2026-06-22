"""Preview or create a repository-local skill and optional specialist agent."""

from __future__ import annotations

import argparse
import os
import shlex
import shutil
import sys
import tempfile
from pathlib import Path

from skill_agent_lib import NAME_RE, render_agent, render_skill, validate_repo_root


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument("--root", required=True, type=Path)
    result.add_argument("--name", required=True)
    result.add_argument("--purpose", required=True)
    result.add_argument("--trigger", required=True)
    result.add_argument("--scope", required=True)
    result.add_argument("--agent-name")
    result.add_argument("--agent-route", choices=("cursor", "pi", "oc"), default="cursor")
    result.add_argument("--oc-explicitly-requested", action="store_true")
    result.add_argument("--go", action="store_true", help="write repository-local artifacts")
    return result


def stop(message: str, next_action: str) -> int:
    print(f"STOP: {message}", file=sys.stderr)
    print(f"NEXT: {next_action}", file=sys.stderr)
    return 1


def main() -> int:
    args = parser().parse_args()
    for label, value in (("name", args.name), ("agent-name", args.agent_name)):
        if value and not NAME_RE.fullmatch(value):
            return stop(f"{label} must be kebab-case", "correct the name and rerun")
    if args.agent_route == "oc" and not args.oc_explicitly_requested:
        return stop(
            "OpenCode route requires --oc-explicitly-requested",
            "use Cursor/Pi or record Chris's explicit OpenCode request",
        )
    for label in ("purpose", "trigger", "scope"):
        if len(getattr(args, label).split()) < 3:
            return stop(f"{label} is too vague", f"provide a concrete {label} and rerun")

    root, root_errors = validate_repo_root(args.root)
    if root_errors:
        return stop(root_errors[0], "pass the assigned agent-skills Git worktree root")
    skills_dir = (root / "skills").resolve()
    agents_dir = (root / "agents").resolve()
    skill_dir = skills_dir / args.name
    agent_path = agents_dir / f"{args.agent_name}.md" if args.agent_name else None
    targets = [skill_dir] + ([agent_path] if agent_path else [])
    if any(not path.resolve().is_relative_to(root) for path in targets):
        return stop("target resolves outside the repository root", "use repository-local names and paths")
    existing = [str(path) for path in targets if path.exists()]
    if existing:
        return stop(f"refusing to overwrite existing target: {existing[0]}", "choose a new name")

    print("CREATION_PREVIEW")
    print(f"skill: {skill_dir / 'SKILL.md'}")
    print(f"agent: {agent_path or 'not requested'}")
    print("runtime_install: not performed")
    if not args.go:
        entrypoint = os.environ.get("SKILL_AGENT_ENTRYPOINT", sys.argv[0])
        command = [entrypoint, *[item for item in sys.argv[1:] if item != "--go"], "--go"]
        print("STOP: missing --go; this is a dry-run")
        print(f"NEXT: {shlex.join(command)}")
        return 0

    stage_root = Path(tempfile.mkdtemp(prefix="skill-agent-stage-", dir=root))
    created: list[Path] = []
    try:
        staged_skill = stage_root / args.name
        staged_skill.mkdir()
        (staged_skill / "SKILL.md").write_text(
            render_skill(args.name, args.purpose, args.trigger, args.scope), encoding="utf-8"
        )
        staged_agent = None
        if agent_path:
            staged_agent = stage_root / agent_path.name
            staged_agent.write_text(
                render_agent(args.agent_name, args.purpose, args.scope, args.agent_route), encoding="utf-8"
            )
        os.replace(staged_skill, skill_dir)
        created.append(skill_dir)
        if staged_agent and agent_path:
            os.replace(staged_agent, agent_path)
            created.append(agent_path)
    except Exception as exc:
        for path in reversed(created):
            if path.is_dir():
                shutil.rmtree(path)
            elif path.exists():
                path.unlink()
        return stop(f"creation failed without retained partial output: {exc}", "resolve the error and rerun")
    finally:
        shutil.rmtree(stage_root, ignore_errors=True)

    print("CREATION_REPORT")
    print("result: CREATED")
    print("files changed:")
    print(f"  - {skill_dir / 'SKILL.md'}")
    if agent_path:
        print(f"  - {agent_path}")
    print("verification: run scripts/validate-skill-agent.sh on each created artifact")
    print("remaining risks: source artifacts are not installed in any runtime")
    print("stop reason: task complete")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
