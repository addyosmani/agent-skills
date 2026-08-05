You are the Builder for parcel P2 (`DispatchOrder` `permissionProfile` field) of the goal `permission-profile-registry`, Stage C of the Foreman Line.

**Where you are:** `C:\Repos\foreman-line-P2`, branch `feat/foreman-line-P2`. This parcel ships no enforcement code and does not test the permission mechanism, so — unlike P3 later in this goal — there is no launch-mode restriction here; a normal Agent-tool background subagent is exactly right (charter D9-amendment(a), narrowed).

**This is the most sensitive parcel in the goal.** You are touching `plugins/foreman-line/contracts/`, the one genuinely frozen contract package in this repo. The charter's exception (D2, amended) authorizes an exact, narrow surface — read it precisely, don't approximate it.

## Step 0 — restate and stop

Before writing any code:
1. Read `docs/specs/active/P2-dispatch-order-permission-profile-field.md` in full — it is your complete spec (status: `active`), including its "Provisional Decisions" section (all 8 already ratified — treat them as final, not open) and its `## Verification Plan` section (dual review, five mandated focus questions).
2. Read `docs/goals/permission-profile-registry/charter.md`, specifically D2 (amended — read the exact proof-obligation wording), D7 (dual review), D9-amendment(a) as narrowed.
3. Read the exact three-artifact-plus-derivative surface in place: `plugins/foreman-line/contracts/src/stages/c-dispatch.ts`, `plugins/foreman-line/contracts/src/envelope.ts` (read-only — understand *why* the composed schema regenerates, don't edit this file), `plugins/foreman-line/contracts/schemas/dispatch-order.schema.json`, `plugins/foreman-line/contracts/schemas/stage-envelope.dispatch-order.schema.json`, `plugins/foreman-line/contracts/tests/parity.test.ts`.
4. Restate back, in your own words: the exact one-field change, its placement (tail, after `injectedSkills`), the schema constraint (`{ type: 'string', minLength: 1 }`, not in `required`), which files you will touch (exactly: `src/stages/c-dispatch.ts`, `schemas/dispatch-order.schema.json`, `schemas/stage-envelope.dispatch-order.schema.json`, `tests/parity.test.ts` — nothing else), and the test-count tripwire (baseline 66, must reach >= 70, expect 72).
5. Flag any ambiguity. Do not silently resolve anything.
6. Confirm you understand: no import from any sibling `plugins/foreman-line/*` package; no edit to `src/testing.ts`/`sampleDispatchOrder`; no edit to any file outside the four named above; absolutely no runtime code that constructs, produces, or stamps a `DispatchOrder` anywhere (that is future dispatch-automation work, explicitly out of scope — a stop-and-report if you find yourself tempted).

## After Step 0

Build against the spec's 8 Acceptance Criteria exactly. Run `npm install` first if `tsx`/`biome` aren't resolvable (this is a known environment gap noted in the spec, not a defect to fix elsewhere). Run `node -v` first (must be >=22) per lesson #10. After the edit, run `npm run generate` and verify via `git diff --stat` that exactly the two schema files changed, plus `src/stages/c-dispatch.ts` and `tests/parity.test.ts` — nothing else. Commit to `feat/foreman-line-P2` only.

Produce a completion claim mapping each of the 8 Acceptance Criteria to concrete evidence (file path + line range, or test name + pass/fail), stating the observed pre-edit test count (must be 66) and post-edit count (must be >= 70). A claim missing either count, or missing an AC mapping, is presumptively empty and will be rejected without further inspection.

Do not merge, push to main, or open a PR. Report back to the coordinator, who runs the closure check, the deterministic pass, and dispatches BOTH required independent adversarial reviews (this parcel gets dual review, not single — charter D7).
