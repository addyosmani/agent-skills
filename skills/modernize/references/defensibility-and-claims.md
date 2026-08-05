# Defensibility & Claims — the Parity Claim Ladder

A modernization's whole value is *provable* equivalence. The failure mode #5 closes:
a run that emits receipts and a `DEFENSIBILITY.md` *claiming* parity when
reconciliation never ran, ran only against the target, or ran with zero captured
**legacy** samples. A green checkmark on a lie is worse than vibes. Companion to
`schemas/claim.schema.json` and SKILL.md rule #9.

---

## 1. The trap

> "Equivalence is bounded by sampling coverage against *captured legacy behavior* —
> recording only the target proves nothing." (README §3)

A **paired comparison** requires BOTH a legacy sample and a target sample for the
same stimulus. A thousand target recordings with zero legacy samples prove exactly
nothing about parity. The claim a run makes must be gated on the evidence that
actually exists — never on the fact that the harness produced *some* output.

---

## 2. The claim ladder

| Tier | Means | May claim parity? |
|-|-|-|
| `unverified` | recon didn't run, OR 0 legacy samples, OR 0 paired comparisons | **No.** Target behavior recorded only. |
| `partial` | ran against legacy; coverage/contract gaps remain (unwaived) | Bounded — proven subset only; gaps named. |
| `verified` | ran against legacy; all targets met or tombstone-waived | Equivalence **within drift tolerance D, bounded by coverage C**. Never "identical". |
| `failed` | recon ran; a strict field drifted beyond tolerance / hard stop tripped | Release blocked (rule #6). |

---

## 3. Tier-decision algorithm (deterministic)

Compute the tier from `claim.reconciliation` + `claim.evidence`. Order matters:

```
if not reconciliation.ran:                         -> unverified  (gap: recon_skipped)
elif reconciliation.legacy_sample_count == 0:      -> unverified  (gap: no_legacy_samples)
elif reconciliation.paired_comparison_count == 0:  -> unverified  (gap: no_legacy_samples; target-only)
elif not reconciliation.strict_drift_within_tolerance:
                                                   -> failed      (block release; rule #6)
else:
    unwaived = [ stratum where coverage.met == false ]
             + [ contract where not covered (< min_samples OR 0 paired comparisons) ]
    unwaived = [ g for g in unwaived if g has no waived_by_tombstone ]
    if unwaived:  -> partial   (list every gap)
    else:         -> verified  (equivalence within drift tolerance, bounded by coverage)
```

A tombstone-waived gap does NOT raise the tier on its own and is NEVER removed from
`gaps[]` — it stays, marked `waived_by_tombstone`, so DEFENSIBILITY.md still names it.

---

## 4. Gating rules

- **Receipts.** `receipts/manifest.json` carries the `claim` block (this schema). A
  receipt MAY NOT assert a parity statement above its tier. At `unverified` it
  contains NO parity assertion — only "target behavior recorded".
- **DEFENSIBILITY.md.** Its headline IS the tier (verbatim from §5). It must list
  coverage achieved (real numbers) and everything NOT verified (named).
- **Never trust a stored tier.** Recompute from evidence at emission time; the tier
  is a function of the counts, not a field someone set.

---

## 5. DEFENSIBILITY.md template

Headline is the earned tier, stated plainly:

- **`unverified`** → `# ⛔ NOT A PARITY PROOF` — "Reconciliation did not run against captured legacy behavior; nothing about equivalence is proven here."
- **`partial`** → `# ◑ BOUNDED PARITY` — "Equivalence proven within drift tolerance for the sampled subset below; the listed strata/contracts are UNVERIFIED."
- **`verified`** → `# ✅ PARITY WITHIN DRIFT TOLERANCE, BOUNDED BY COVERAGE` — "Strict fields exact; non-strict within tolerance; all coverage targets met (waivers noted)."
- **`failed`** → `# ✗ RECONCILIATION FAILED` — "Strict-field drift beyond tolerance — release blocked (rule #6)."

Body (every tier):

```markdown
# <HEADLINE FOR TIER>

**Claim:** <claim.parity_statement>
**Drift rules:** <claim.drift_tolerance_ref>

## What was proven
- legacy samples: <n>   target samples: <n>   paired comparisons: <n>
- contracts covered: <covered>/<total>

## Coverage achieved (vs target)
| stratum | target | achieved | met |
|-|-|-|-|
| happy_path | ... | ... | ✓/✗ |
| error_cases | ... | ... | ✓/✗ |
| edge_cases | ... | ... | ✓/✗ |
| security_flows | ... | ... | ✓/✗ |

## What was NOT verified
- <each gap; mark "(accepted via TOMBSTONES.md#anchor)" where waived>

## How to replay
- `receipts/replay.sh` / `receipts/replay.ps1`; hashes in `receipts/hashes.sha256`.

## What drift means here
- <which fields are strict, what tolerance applies, what a future diff would signal>
```

---

## 6. Tombstone waivers

A coverage target that legitimately can't be met (e.g. security flows need prod
creds) may be **explicitly accepted** via a `TOMBSTONES.md` entry referenced from
the gap's `waived_by_tombstone`. A waiver keeps the tier at `verified` but the gap
is still named in DEFENSIBILITY.md. Unwaived gaps force `partial`. Defensible
changes, not silent ones — same doctrine as every other tombstone.
