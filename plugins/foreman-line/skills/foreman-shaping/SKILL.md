---
name: foreman-shaping
description: Run a Foreman Line Stage A shaping session - turn a raw idea into linted parcel spec drafts plus a schema-valid ShapingResult handed forward to W1-P2. Use when a developer brings an idea that needs to be shaped into one or more dispatchable parcel specs before any build. Not for building a parcel (that is a builder session) and not for filling the Epic/Story tree (that is W1-P2).
---

# /foreman-shaping — Stage A shaping session

You run the **interactive-shaping role**: turn a raw idea into one or more parcel
**spec drafts** and a schema-valid `ShapingResult`, then STOP. You produce the
artifact; you do not promote it, register it, or mint a receipt. The deterministic
machinery you call lives in `plugins/foreman-line/shaping/` — this skill is the
interaction guidance around it.

## Inputs

- **A raw idea** (required) — the concept to shape.
- **Optional context references** — related specs, plans, conventions, contracts,
  lessons files.

## The session

1. **Clarify intent.** Restate the idea in your own words. What does done mean;
   who consumes the result; what is deliberately out of scope; which constraints
   are non-negotiable; what existing canon applies.
2. **Surface constraints and propose a decomposition** into one or more parcels,
   in dependency order, each with a risk level and routing class.
3. **Ask clarifying questions in small batches** — numbered, each with a
   **recommended default** attached. Propose, let the developer dispose. Never
   silently resolve a design question.
4. **Write the drafts.** Author each parcel spec under
   `plugins/foreman-line/docs/specs/active/` at **`status: draft`** (draft is not
   dispatchable — SPEC-CONVENTION §3). Run the package's two-layer advisory
   self-check (frontmatter via frozen spec-linter + §4 body sections) to cut
   round-trips before handing off.
5. **Emit the `ShapingResult`.** One
   `<session-slug>.shaping-result.json` in `active/`, with the draft paths in
   `parcelSpecRefs` (POSIX, `>= 1`) and **`epics: []`** — W1-P2 fills the
   Epic/Story tree. Derive the slug via `deriveSessionSlug` before calling emit
   (the emitter rejects a non-canonical slug). Hand the explicit artifact path
   forward as the P1→P2 contract.
6. **STOP.** End the session with the draft paths and the `ShapingResult` path.

## STOP boundary (what you never do)

- No `status` flip (draft → active) — promotion is coordinator lint + Gate-2.
- No `epics` projection-filling — that is W1-P2.
- No Jira registration — that is W1-P4.
- No receipt emission and no hashing — that is W1-P3.

## Authority

The self-check is **advisory** — a fast local gate. **Coordinator lint remains
the sole authority**; a passing self-check never authorizes promotion to
`active`. If the idea would require changing a frozen contract (e.g. a Task tier
below Epic/Story), STOP and report — that is a loop-stop, not a shaping decision.
