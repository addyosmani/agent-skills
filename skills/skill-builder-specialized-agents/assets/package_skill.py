"""Preview or package a repository-local skill with Python's standard library."""

from __future__ import annotations

import argparse
import os
import shlex
import sys
import tempfile
import zipfile
from pathlib import Path

from skill_agent_lib import find_repo_root


def stop(message: str, next_action: str) -> int:
    print(f"STOP: {message}", file=sys.stderr)
    print(f"NEXT: {next_action}", file=sys.stderr)
    return 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skill-dir", required=True, type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--replace", action="store_true", help="atomically replace an existing local archive")
    parser.add_argument("--go", action="store_true")
    args = parser.parse_args()

    skill_dir = args.skill_dir.expanduser().resolve()
    repo_root = find_repo_root(skill_dir)
    if repo_root is None:
        return stop("skill directory is outside an agent-skills Git worktree", "pass a repository-local skill")
    skills_root = (repo_root / "skills").resolve()
    if not skill_dir.is_relative_to(skills_root):
        return stop("skill directory resolves outside the repository skills directory", "pass a local skills/ path")
    if not (skill_dir / "SKILL.md").is_file():
        return stop("--skill-dir must contain SKILL.md", "pass a valid skill directory")

    if args.output:
        output_value = args.output.expanduser()
        output = (
            output_value.resolve()
            if output_value.is_absolute()
            else (repo_root / output_value).resolve()
        )
    else:
        output = skill_dir.with_suffix(".zip").resolve()
    if not output.is_relative_to(repo_root):
        return stop("archive output must remain inside the repository root", "choose a repository-local --output path")
    if not output.is_relative_to(skills_root) or output.suffix != ".zip":
        return stop("archive output must be a .zip inside the repository skills directory", "choose a local skills/*.zip path")
    if output.exists() and not args.replace:
        return stop(f"refusing to overwrite existing archive: {output}", "review it, then rerun with --replace")

    files = [
        path
        for path in sorted(skill_dir.rglob("*"))
        if path.is_file()
        and "__pycache__" not in path.parts
        and path.suffix not in {".pyc", ".pyo", ".zip"}
    ]
    print("PACKAGE_PREVIEW")
    print(f"skill: {skill_dir}")
    print(f"output: {output}")
    print(f"files: {len(files)}")
    print(f"replace: {'yes' if args.replace else 'no'}")
    if not args.go:
        entrypoint = os.environ.get("SKILL_AGENT_ENTRYPOINT", sys.argv[0])
        command = [entrypoint, *[item for item in sys.argv[1:] if item != "--go"], "--go"]
        print("STOP: missing --go; this is a dry-run")
        print(f"NEXT: {shlex.join(command)}")
        return 0

    output.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=f".{output.name}.", dir=output.parent)
    os.close(fd)
    temp_path = Path(temp_name)
    try:
        with zipfile.ZipFile(temp_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for path in files:
                archive.write(path, Path(skill_dir.name) / path.relative_to(skill_dir))
        os.replace(temp_path, output)
    except Exception as exc:
        temp_path.unlink(missing_ok=True)
        return stop(f"packaging failed without replacing output: {exc}", "resolve the error and rerun")
    print("PACKAGE_REPORT")
    print("result: CREATED")
    print(f"archive: {output}")
    print(f"files: {len(files)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
