PS C:\Repos\foreman-line-sec-1> git log --oneline -2
491fb80 docs(kickstarters): SEC-1 dispatch directive (yaml GHSA-48c2-rrv3-qjmp bump, Dependabot #6)
33fe17b chore(specs): close W0-P4 - spec active/ -> done/ (Stage F, merged via PR #16)
PS C:\Repos\foreman-line-sec-1> # (491fb80 committed by the second coordinator session during the brief dual-coordinator
PS C:\Repos\foreman-line-sec-1> #  overlap — content verified identical to the dispatching coordinator's directive text;
PS C:\Repos\foreman-line-sec-1> #  benign, convention-consistent. The coordinator lock in the loop directive now prevents this.)
PS C:\Repos\foreman-line-sec-1> git status --short                        # blast radius: exactly the two dependency files
 M plugins/foreman-line/routing-policy/package-lock.json
 M plugins/foreman-line/routing-policy/package.json
PS C:\Repos\foreman-line-sec-1> # Builder Step 0 caught: fresh worktree had no installed baseline. Ruled procedure:
PS C:\Repos\foreman-line-sec-1> # install at 2.6.1 -> observe baseline (40/40 GREEN) -> bump -> compare. Both observed, delta zero.
PS C:\Repos\foreman-line-sec-1> # Builder flagged caret-vs-exact-pin style; ruled: exact pin 2.9.0 (house style; ajv 8.20.0 precedent).
PS C:\Repos\foreman-line-sec-1> cd plugins\foreman-line\routing-policy
PS ...\routing-policy> node -v                                            # first command, per defects_lessons #10
v24.11.1
PS ...\routing-policy> npx tsc --noEmit                                   # exit 0
PS ...\routing-policy> npx tsx --test tests/*.test.ts
i tests 40
i pass 40
i fail 0
PS ...\routing-policy> npx biome check .
Checked 14 files in 25ms. No fixes applied.
PS ...\routing-policy> npx tsx src/cli.ts validate routing-policy.yaml                   # exit 0
PS ...\routing-policy> npx tsx src/cli.ts validate tests/fixtures/reject-multiple.yaml   # exit 1, both violations on stderr
PS ...\routing-policy> npx tsx src/cli.ts validate no-such-file.yaml                     # exit 2
PS ...\routing-policy> # Lockfile: node_modules/yaml = 2.9.0, integrity identical across caret-range and exact-pin installs,
PS ...\routing-policy> # zero transitive dependencies (no 'dependencies' key). npm audit: 0 vulnerabilities (was 1 moderate).
PS ...\routing-policy> # yaml 2.9.0 >= 2.8.3 (first patched) clears GHSA-48c2-rrv3-qjmp / CVE-2026-33532 (range >=2.0.0 <2.8.3).
# Deterministic pass GREEN (builder's run + independent coordinator re-run, both 40/40).
# Mini-parcel: no adversarial review per directive — dependency patch, no source change.
