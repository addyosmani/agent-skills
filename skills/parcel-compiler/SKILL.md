---
name: parcel-compiler
description: Develop, inspect, and verify the proof-gated Parcel Compiler scaffold and its frozen command contracts. Use when extending pcc, reviewing its canonicalization or Git utilities, or preparing a parcel that implements one of its currently stubbed commands. Do not use it as an operational compiler yet because the command handlers are not implemented.
---

# Parcel Compiler

Use this skill to work on the `pcc` trust-path CLI without overstating its
current maturity.

## Current boundary

The package at `tool/` is a tested `0.1.0-scaffold`. Its command routing,
canonical JSON, hashing, and Git primitives are implemented. Operational
commands such as `compile`, `verify`, and `receipt verify` intentionally return
`NOT_IMPLEMENTED`, and the package is not yet a globally executable binary.

## Workflow

1. Read `tool/README.md` and the relevant spec under `docs/specs/`.
2. Preserve the zero-runtime-dependency contract unless a ratified parcel
   explicitly changes it.
3. Implement only the command and files named by the parcel's exact
   `Allowed Files`.
4. Add failing tests before implementing behavior.
5. Run the deterministic checks from `tool/`:

   ```powershell
   npm install
   npm test
   npm run typecheck
   npm run lint
   npm audit --omit=dev
   ```

6. Report implemented commands separately from remaining stubs. Never describe
   the scaffold as a functioning end-to-end compiler.

## Stop conditions

- A command contract or exit-code meaning must change.
- Receipt hash or signature semantics are not already ratified.
- Implementation requires a runtime dependency.
- A required file is absent from the parcel's `Allowed Files`.

Stop and request a contract amendment instead of making any of those decisions
silently.
