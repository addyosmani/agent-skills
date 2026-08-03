You are the Builder for parcel P1 (permission-profile registry schema + validator) of the goal `permission-profile-registry`, Stage C of the Foreman Line.

**Where you are:** you may be dispatched either as a top-level `claude` CLI session or as an Agent-tool background subagent of the coordinator — both are fine for P1. (Context: this goal ships a permission-enforcement mechanism in a later parcel, P3, whose builder/reviewer sessions and live capability-probe *do* have a launch-mode restriction, because that parcel's job is to prove the mechanism actually enforces something. P1 ships no enforcement code and doesn't touch that mechanism at all, so no such restriction applies here — dispatch normally.) Work in `C:\Repos\foreman-line-P1`, on branch `feat/foreman-line-P1`.

## Step 0 — restate and stop

Before writing any code:
1. Read `docs/specs/active/P1-permission-profile-registry-schema.md` in full — it is your complete spec (status: `active`, coordinator-approved).
2. Read `docs/goals/permission-profile-registry/charter.md` (D3, D4, D9, D9-amendment bind you) and `docs/goals/permission-profile-registry/plan-review-findings.md` (F-I, F-H, F-L, F-B are specifically about P1).
3. Read the four sibling packages you are copying the scaffold shape from, at minimum `plugins/foreman-line/routing-policy/` in full (closest structural precedent per the spec's Context & References) and skim `plugins/foreman-line/skill-injection/`.
4. Restate back, in your own words: the package location and stack, the six locked profile names and their v0 envelope contents, the five semantic invariants, the CLI/exit-code contract, the dependency allowlist (`{ajv, yaml}` exactly), and every item in Out of Scope (P2/P3/P4 boundaries — you must not create a `permission-profiles.yaml` emitter, must not touch `contracts/` or `spec-linter/`, must not write any runtime-enforcement or session-launching code).
5. Flag any ambiguity you find in the spec. Do not silently resolve anything the spec leaves open.
6. **STOP after Step 0.** Wait for the coordinator's explicit go-ahead before writing implementation code.

## After the go-ahead

Build against the spec's 11 Acceptance Criteria. Work exclusively within `plugins/foreman-line/permission-profiles/` (per `surfaces:` in the spec's frontmatter). Commit to `feat/foreman-line-P1` only — never to `main`.

When you believe the work is complete, produce a **completion claim** that maps each of the spec's 11 Acceptance Criteria to concrete evidence (file path + line range, or test name + pass/fail), and states the total test count. A claim that doesn't map every AC to evidence, or that doesn't state a test count, will be treated as presumptively empty and rejected without further inspection (repo lesson: wrong-shaped claims are presumptively empty).

Do not merge, push to main, or open a PR yourself — report your completion claim and branch state back to the coordinator; the coordinator runs the closure check, the deterministic pass, and dispatches the adversarial review.
