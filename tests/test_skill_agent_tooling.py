#!/usr/bin/env python3
"""Hermetic tests for skill generation and dispatch-contract validation."""

from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SKILL_DIR = ROOT / "skills" / "skill-builder-specialized-agents"
TOOL_DIR = SKILL_DIR / "scripts"
ASSET_DIR = SKILL_DIR / "assets"
sys.path.insert(0, str(ASSET_DIR))

from skill_agent_lib import (  # noqa: E402
    unsafe_instruction_errors,
    validate_agent,
    validate_contract,
    validate_instruction_file,
    validate_skill,
)


CREATE = TOOL_DIR / "create-skill-agent.sh"
PACKAGE = TOOL_DIR / "package-skill.sh"


class SkillAgentToolingTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.root = Path(self.tempdir.name) / "agent-skills"
        (self.root / "skills").mkdir(parents=True)
        (self.root / "agents").mkdir()
        (self.root / ".git").write_text("gitdir: test\n", encoding="utf-8")
        (self.root / "AGENTS.md").write_text("# Test instructions\n", encoding="utf-8")
        (self.root / "HANDOFF.md").write_text("# Test handoff\n", encoding="utf-8")
        self.spec = Path(self.tempdir.name) / "valid-spec.md"
        self.spec.write_text(
            """# Validation Feature SPEC

## Objective

Implement a bounded validator for generated skill and dispatch artifacts.

## Requirements

- Validate concrete source files in a temporary repository.
- Reject unsafe or incomplete dispatch contracts deterministically.
- Keep all test data isolated from live runtime directories.

## Pass/fail gates

- All unit tests pass and negative fixtures return the intended errors.
""",
            encoding="utf-8",
        )

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def generator_command(self, *extra: str, root: Path | None = None) -> list[str]:
        return [
            str(CREATE),
            "--root",
            str(root or self.root),
            "--name",
            "example-validator",
            "--purpose",
            "validate generated skill artifacts",
            "--trigger",
            "a reusable skill needs structural validation",
            "--scope",
            "temporary source fixtures and reports only",
            *extra,
        ]

    def write_contract(
        self,
        *,
        objective: str = "Implement deterministic validation for generated skill and agent source artifacts.",
        scope: str = "Modify validator source, hermetic tests, and repository documentation only.",
        spec: str | None = None,
        task_class: str = "build",
    ) -> Path:
        path = Path(self.tempdir.name) / "contract.md"
        path.write_text(
            f"""---
contract_version: 1
task_id: validate-skill-artifacts
orchestrator: bob
execution_role: agent-dispatch
agent: cursor
task_class: {task_class}
risk: medium
workspace: {self.root}
spec: {spec if spec is not None else self.spec}
oc_explicitly_requested: false
---

# Dispatch Contract

## Objective

{objective}

## Scope

{scope}

## Expected Outputs

- Validator source, tests, and documentation.

## Verification Commands

- Run the targeted unittest module and require exit zero.

## Safety Restrictions

- Do not restart services, deploy, kill tmux sessions, or modify live runtime configuration.

## Stop Conditions

- Stop on missing authority, scope conflict, or failed gates.

## Creation Report

- Files changed: list paths.
- Verification: list commands and outcomes.
- Remaining risks: list limitations or none.
- Stop reason: task complete or exact blocking gate.
""",
            encoding="utf-8",
        )
        return path

    def test_generator_dry_run_creates_nothing(self) -> None:
        result = subprocess.run(self.generator_command(), capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("STOP: missing --go; this is a dry-run", result.stdout)
        self.assertIn("create-skill-agent.sh", result.stdout)
        self.assertFalse((self.root / "skills" / "example-validator").exists())

    def test_generator_creates_valid_skill_and_agent(self) -> None:
        result = subprocess.run(
            self.generator_command("--agent-name", "example-specialist", "--go"),
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        skill = self.root / "skills" / "example-validator" / "SKILL.md"
        agent = self.root / "agents" / "example-specialist.md"
        self.assertEqual(validate_skill(skill, strict=True), [])
        self.assertEqual(validate_agent(agent, strict=True), [])
        self.assertIn("CREATION_REPORT", result.stdout)

    def test_ft1_vague_task_rejected(self) -> None:
        errors = validate_contract(self.write_contract(objective="Improve the system"))
        self.assertTrue(any("objective is vague" in error for error in errors), errors)

    def test_ft2_missing_spec_rejected(self) -> None:
        missing = Path(self.tempdir.name) / "missing-spec.md"
        errors = validate_contract(self.write_contract(spec=str(missing)))
        self.assertTrue(any("SPEC not found" in error for error in errors), errors)

    def test_ft3_unsafe_restart_instruction_rejected(self) -> None:
        errors = validate_contract(
            self.write_contract(scope="Modify the validator, then run service hermes-gateway restart.")
        )
        self.assertTrue(any("unsafe instruction" in error for error in errors), errors)

    def test_unsafe_instruction_inside_skill_rejected(self) -> None:
        created = subprocess.run(self.generator_command("--go"), capture_output=True, text=True, check=False)
        self.assertEqual(created.returncode, 0, created.stderr)
        skill = self.root / "skills" / "example-validator" / "SKILL.md"
        skill.write_text(
            skill.read_text(encoding="utf-8") + "\nRun service bob restart.\n",
            encoding="utf-8",
        )
        errors = validate_skill(skill, strict=True)
        self.assertTrue(any("unsafe instruction" in error for error in errors), errors)

    def test_unsafe_instruction_inside_agents_md_rejected(self) -> None:
        agents_md = self.root / "AGENTS.md"
        agents_md.write_text("# Agent instructions\n\nRun service hermes-gateway restart.\n", encoding="utf-8")
        errors = validate_instruction_file(agents_md)
        self.assertTrue(any("unsafe instruction" in error for error in errors), errors)

    def test_unsafe_instruction_inside_specialized_agent_rejected(self) -> None:
        created = subprocess.run(
            self.generator_command("--agent-name", "unsafe-specialist", "--go"),
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(created.returncode, 0, created.stderr)
        agent = self.root / "agents" / "unsafe-specialist.md"
        agent.write_text(
            agent.read_text(encoding="utf-8") + "\nRun docker restart bob.\n",
            encoding="utf-8",
        )
        errors = validate_agent(agent, strict=True)
        self.assertTrue(any("unsafe instruction" in error for error in errors), errors)

    def test_all_required_unsafe_patterns_rejected(self) -> None:
        unsafe_instructions = (
            "Restart Hermes now.",
            "Restart Bob after this change.",
            "Run service hermes-gateway restart.",
            "Deploy the change.",
            "Run docker compose restart.",
            "Run tmux kill-session -t bob.",
            "Commit with --no-verify.",
            "Run git push origin master.",
            "Modify /home/chris/.hermes/config.yaml.",
        )
        for instruction in unsafe_instructions:
            with self.subTest(instruction=instruction):
                self.assertTrue(unsafe_instruction_errors(instruction), instruction)

    def test_ft4_name_frontmatter_mismatch_rejected(self) -> None:
        skill = self.root / "skills" / "wrong-directory" / "SKILL.md"
        skill.parent.mkdir()
        skill.write_text(
            """---
name: correct-name
description: Validates source artifacts. Use when strict artifact checks are required.
---

# Correct Name

## Overview
Validates artifacts.
## When to Use
Use for source checks.
## Workflow
Run checks.
## Common Rationalizations
Do not skip checks.
## Red Flags
Missing evidence.
## Verification
Require pass output.
""",
            encoding="utf-8",
        )
        errors = validate_skill(skill, strict=True)
        self.assertTrue(any("must match directory" in error for error in errors), errors)

    def test_ft5_overwrite_refused(self) -> None:
        first = subprocess.run(self.generator_command("--go"), capture_output=True, text=True, check=False)
        self.assertEqual(first.returncode, 0, first.stderr)
        second = subprocess.run(self.generator_command("--go"), capture_output=True, text=True, check=False)
        self.assertNotEqual(second.returncode, 0)
        self.assertIn("refusing to overwrite", second.stderr)

    def test_ft6_placeholder_spec_rejected(self) -> None:
        placeholder = Path(self.tempdir.name) / "placeholder-spec.md"
        placeholder.write_text(
            """# Placeholder SPEC

## Objective
TODO: describe the objective.

## Requirements
TODO: list requirements with enough filler to exceed the minimum content threshold for this fixture.
""",
            encoding="utf-8",
        )
        errors = validate_contract(self.write_contract(spec=str(placeholder)))
        self.assertTrue(any("placeholder" in error for error in errors), errors)

    def test_valid_bounded_dispatch_accepted(self) -> None:
        self.assertEqual(validate_contract(self.write_contract()), [])

    def test_opencode_route_requires_explicit_request(self) -> None:
        contract = self.write_contract()
        content = contract.read_text(encoding="utf-8").replace("agent: cursor", "agent: oc")
        contract.write_text(content, encoding="utf-8")
        errors = validate_contract(contract)
        self.assertTrue(any("OpenCode requires" in error for error in errors), errors)

    def test_packager_excludes_bytecode(self) -> None:
        created = subprocess.run(self.generator_command("--go"), capture_output=True, text=True, check=False)
        self.assertEqual(created.returncode, 0, created.stderr)
        skill_dir = self.root / "skills" / "example-validator"
        cache = skill_dir / "scripts" / "__pycache__"
        cache.mkdir(parents=True)
        (cache / "ignored.pyc").write_bytes(b"bytecode")
        dry_run = subprocess.run(
            [str(PACKAGE), "--skill-dir", str(skill_dir)],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(dry_run.returncode, 0, dry_run.stderr)
        self.assertIn("package-skill.sh", dry_run.stdout)
        self.assertFalse(skill_dir.with_suffix(".zip").exists())
        applied = subprocess.run(
            [str(PACKAGE), "--skill-dir", str(skill_dir), "--go"],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(applied.returncode, 0, applied.stderr)
        import zipfile

        with zipfile.ZipFile(skill_dir.with_suffix(".zip")) as archive:
            self.assertFalse(any("__pycache__" in name or name.endswith(".pyc") for name in archive.namelist()))

    def test_generator_rejects_root_outside_git_worktree_boundary(self) -> None:
        outside = Path(self.tempdir.name) / "outside"
        (outside / "skills").mkdir(parents=True)
        (outside / "agents").mkdir()
        result = subprocess.run(
            self.generator_command("--go", root=outside),
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Git repository or worktree", result.stderr)
        self.assertFalse((outside / "skills" / "example-validator").exists())

    def test_packager_rejects_external_output_path(self) -> None:
        created = subprocess.run(self.generator_command("--go"), capture_output=True, text=True, check=False)
        self.assertEqual(created.returncode, 0, created.stderr)
        outside = Path(self.tempdir.name) / "outside.zip"
        result = subprocess.run(
            [
                str(PACKAGE),
                "--skill-dir",
                str(self.root / "skills" / "example-validator"),
                "--output",
                str(outside),
                "--go",
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("repository root", result.stderr)
        self.assertFalse(outside.exists())

    def test_packager_rejects_non_zip_repository_output(self) -> None:
        created = subprocess.run(self.generator_command("--go"), capture_output=True, text=True, check=False)
        self.assertEqual(created.returncode, 0, created.stderr)
        protected = self.root / "HANDOFF.md"
        original = protected.read_text(encoding="utf-8")
        result = subprocess.run(
            [
                str(PACKAGE),
                "--skill-dir",
                str(self.root / "skills" / "example-validator"),
                "--output",
                str(protected),
                "--replace",
                "--go",
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(".zip inside", result.stderr)
        self.assertEqual(protected.read_text(encoding="utf-8"), original)

    def test_executable_skill_scripts_are_compliant_bash(self) -> None:
        scripts = sorted(TOOL_DIR.iterdir())
        self.assertTrue(scripts)
        self.assertTrue(all(path.suffix == ".sh" for path in scripts if path.is_file()))
        for script in scripts:
            if not script.is_file():
                continue
            content = script.read_text(encoding="utf-8")
            self.assertTrue(content.startswith("#!/bin/bash\n"), script)
            self.assertIn("set -e", content, script)

    def test_quick_read_only_contract_may_omit_spec(self) -> None:
        contract = self.write_contract(spec="NONE", task_class="read-only")
        self.assertEqual(validate_contract(contract), [])


if __name__ == "__main__":
    unittest.main()
