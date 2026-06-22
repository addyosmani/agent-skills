# Hermes/Bob Skill and Specialized-Agent Architecture

## Current discovery and loading

Hermes scans local `~/.hermes/skills/` first and then configured external skill directories for exact `SKILL.md` filenames. It parses frontmatter, uses the frontmatter name and description in the compact system-prompt index, filters disabled or platform-incompatible skills, and loads the full body on demand through `skill_view`. Local names take precedence over external duplicates. Prompt metadata is cached in memory and in a manifest-backed disk snapshot.

Hermes `skill_manage` can create or edit live user skills. Its current structural checks require parseable frontmatter, name, description, a non-empty body, valid path segments, and size limits. Those checks do not require workflow sections, distinguish knowledge from procedure, reject vague objectives, require a SPEC, or reject operational instructions.

## Current routing and ingress gaps

`/home/chris/bin/bob-dispatch` is the live cross-agent router. It requires a SPEC for build/review/audit, routes builds to Cursor by default, routes review/audit to Pi, and refuses OpenCode unless the legacy override is explicit. Its current SPEC validator checks broad section presence and a small production-keyword set.

Vague or unsafe work can still enter through:

- direct `skill_manage` authoring with structurally valid but weak content;
- Hermes `delegate_task` goals that require only a non-empty string;
- reusable agent persona files that have no machine-checkable task contract;
- SPECs whose headings exist but whose objective or body is placeholder content;
- positive unsafe instructions not covered by the current production-keyword check.

## v1 source architecture

`skill-builder-specialized-agents` adds a repository-local boundary before runtime use:

1. The generator requires explicit purpose, trigger, and scope; previews by default; refuses overwrite; and accepts only a marked Git worktree root with local skill/agent directories.
2. Skill, specialized-agent, and AGENTS.md validators reject unsafe operational instructions; strict skill validation also checks discovery identity and procedural sections.
3. The specialized-agent validator checks role, route, identity, boundaries, outputs, and stop conditions.
4. The dispatch-contract validator checks Bob's orchestration role, execution-role separation, route policy, bounded objective/scope, existing SPEC, safety restrictions, and report schema.
5. The packager accepts only ZIP output beneath the repository `skills/` tree and replaces existing archives only with explicit `--replace`.
6. Executable entrypoints are Bash with fail-closed Python implementation assets.
7. Hermetic tests prove both acceptance and rejection behavior without touching live Hermes paths.

## Deliberately deferred runtime integration

This source package is not copied into `~/.hermes`, added to external skill directories, or wired into `bob-dispatch` or `delegate_task`. Doing so would change live runtime behavior and may require cache/reload handling. Activation is a separate rollout that must identify the install mechanism, validate the live index, and obtain explicit approval for any required restart or configuration change.
