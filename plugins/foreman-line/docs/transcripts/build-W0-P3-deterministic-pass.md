PS C:\Repos\foreman-line-w0-p3> git log --oneline -2                      # branch hygiene: spec + Step-0 amendments committed BEFORE code (defects_lessons #8/#9 applied)
057136b docs(specs): W0-P3 Step 0 amendments (coordinator-ratified)
7ab3a5b docs(specs): W0-P3 routing policy schema + validator spec (shaped, approved, active)
PS C:\Repos\foreman-line-w0-p3> git status --short                        # blast radius: implementation only, isolated worktree
?? plugins/foreman-line/routing-policy/
PS C:\Repos\foreman-line-w0-p3> # spec-copy parity check: worktree spec vs coordinator's main-tree copy = semantically identical
PS C:\Repos\foreman-line-w0-p3> # (line-wrapping differed - builder applied amendment text from the chat-wrapped ruling; main copy synced to branch canonical)
PS C:\Repos\foreman-line-w0-p3> cd plugins\foreman-line\routing-policy
PS ...\routing-policy> node -v                                            # first command, per defects_lessons #10
v24.11.1
PS ...\routing-policy> npx tsc --noEmit                                   # exit 0
PS ...\routing-policy> npx tsx --test tests/*.test.ts
i tests 37
i pass 37
i fail 0
i cancelled 0
i skipped 0
i todo 0
PS ...\routing-policy> npx biome check .
Checked 14 files in 25ms. No fixes applied.
PS ...\routing-policy> # Runtime dependency allowlist (Step-0 amendment): dependencies = exactly {ajv 8.20.0, yaml 2.6.1}
PS ...\routing-policy> # yaml package has zero transitive dependencies (lockfile-verified)
PS ...\routing-policy> # Non-pre-emption grep (routingDecisionRef|ReceiptRef|receipt|decision record) over package:
PS ...\routing-policy> # -> single hit: README prose naming the boundary itself. No shapes smuggled.
PS ...\routing-policy> npx tsx src/cli.ts validate routing-policy.yaml    # shipped v0 policy -> exit 0
PS ...\routing-policy> npx tsx src/cli.ts validate tests/fixtures/reject-multiple.yaml   # exit 1, BOTH violations on stderr:
roles.coordinator must be 'frontier', got 'standard' (D4: coordinator is always frontier tier)
classes['security-audit'] is security_flavored but allowlist contains non-frontier tier 'standard' - security override requires every allowlisted tier to equal 'frontier'
PS ...\routing-policy> npx tsx src/cli.ts validate no-such-file.yaml     # exit 2
error: cannot read 'no-such-file.yaml': ENOENT
PS ...\routing-policy> # Fixture inventory (8 rejecting): ceiling-missing, ceiling-zero, classification-gate,
PS ...\routing-policy> #   multiple, role-pinning, security-override, security-undeclared (derived guard), structural
# Deterministic pass GREEN. 37/37, deps allowlist exact, CLI contract verified at the process boundary.

# ============================================================================
# REWORK PASS (adversarial review findings, attempt 1 — accepted)
# Coordinator closure check against disk BEFORE re-running checks:
#   Item 2: ff9f6d3 "docs(specs): W0-P3 rework amendment (coordinator-ratified)" — spec-only, before code
#   Item 1: validator.ts:36 KNOWN_FRONTIER_MODELS=['claude-opus-4-8']; :138 checkFrontierTierAnchoring; :168 wired
#           reject-frontier-anchor.yaml (haiku inside model_tiers.frontier, all else valid)
#           rejecting test asserts message names 'claude-haiku-4-5'; fixture assumption self-guarded
#   Item 3: reject-both.yaml (schema + semantic violations in one doc); cli.test.ts:94 both-layers test
#   schemas/ untouched — invariant (e) is semantic-layer code only, as ruled
# ============================================================================
PS ...\routing-policy> node -v
v24.11.1
PS ...\routing-policy> npx tsc --noEmit                                   # exit 0
PS ...\routing-policy> npx biome check .
Checked 14 files in 21ms. No fixes applied.
PS ...\routing-policy> npx tsx --test tests/*.test.ts                     # 37 -> 40, +3 exactly as Step-0 estimated
i tests 40
i pass 40
i fail 0
PS ...\routing-policy> npx tsx src/cli.ts validate tests/fixtures/reject-frontier-anchor.yaml   # exit 1:
model_tiers.frontier contains 'claude-haiku-4-5', which is not in the KNOWN_FRONTIER_MODELS registry (claude-opus-4-8) - redefining frontier requires a reviewed, tested code change, never a policy-file edit
PS ...\routing-policy> npx tsx src/cli.ts validate tests/fixtures/reject-both.yaml              # exit 1, BOTH layers in one run:
(root) must have required property 'roles'
classes['security-audit'] is security_flavored but allowlist contains non-frontier tier 'standard' - security override requires every allowlisted tier to equal 'frontier'
PS ...\routing-policy> npx tsx src/cli.ts validate routing-policy.yaml    # shipped policy still exit 0
# Rework pass GREEN. All review findings closed and verified. Parcel verification-complete.
