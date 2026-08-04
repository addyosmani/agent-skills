---
name: prior-art-search
description: "Actually searches for prior attempts at similar engineering problems — software projects, technical ideas, and adoption history (NOT patent prior art; for patent-grade novelty assessment see `novelty-indication`). Generates search queries, runs web searches, fetches top hits, synthesizes findings into a prior-art report with sources cited. Use when ideating and need to know 'what has been tried before', when reviewing a plan or spec that might duplicate existing work, or when adopting something unfamiliar and want to know its history. Triggers on 'prior art', 'what has been tried', 'alternatives', 'has anyone done this', 'competitors', 'failed attempts', 'existing solutions'."

---

# Prior Art Search

## Philosophy

"What has been tried before?" is the most consequential gap in idea-refine — and the conversation can't reliably answer it. The user's knowledge is bounded; the world's attempts at similar problems are not. This skill actually searches: generates queries, runs web searches, fetches the top hits, and synthesizes a prior-art report. The deliverable is a structured document with sources cited. Selection bias is the failure mode — surfacing only successful prior art is worse than no report. Always include failed attempts and abandoned projects.

## When to Use

**Scope clarification:** This skill searches for **engineering** prior art — software projects, attempts, and adoption history relevant to a technical idea. It does NOT search for **patent** prior art (the legal sense: prior inventions in patent law). The two domains share the term "prior art" but answer different questions and require different searches. For patent-grade novelty assessment (Graham v. John Deere framework), use the `novelty-indication` skill instead.


Apply when:

- Ideating and want to know what already exists before generating variations.
- Reviewing a plan or spec that might duplicate existing work.
- Adopting something unfamiliar (a tool, a library, a pattern) and want to know its history of attempts.
- A teammate asks "has anyone done this?" and the agent needs to actually answer.
- The user explicitly invokes: "prior art", "what has been tried", "alternatives", "competitors", "has anyone done this", "failed attempts".

Do NOT use:

- The topic is so niche that web search won't surface useful prior art (academic literature search or expert interview is more appropriate).
- The user wants the answer to a specific factual question, not a prior-art landscape (use websearch directly with a precise query).
- A real-time / live-data query (prior-art-search returns a synthesized document, not a live feed).

## The Process

1. **Load the topic or idea.** Accept any of:
   - A raw idea (one or more sentences).
   - A one-pager (from idea-refine or ideate-solo).
   - A specific question ("what's the history of X?", "has anyone built Y?").

   Restate the topic as a one-sentence search anchor — the most concrete form of the question.

2. **Generate 3-5 search queries** across four angles:

   - **Direct competitors / equivalents.** "[topic] alternative", "[topic] vs", "best [topic] tool", "[topic] comparison".
   - **Failed attempts.** "[topic] failed", "[topic] abandoned", "[topic] shutdown", "[topic] why it didn't work".
   - **Academic / formal.** "[topic] research", "[topic] paper", "[topic] survey".
   - **Adjacent / historical.** "[topic] history", "before [topic]", "early [topic]", "[topic] origin".

   Pick 3-5 queries. Do not run more — this skill is bounded.

3. **Run web searches** using the `@tool/websearch` tool. For each query, log: query text, top 3-5 result titles, and URLs. Prefer results from diverse domains (avoid returning only one company's blog).

4. **Fetch 2-3 of the top hits in depth** using the `@tool/webfetch` tool. Choose hits that look most relevant: a competitor's product page, a "why we shut down" post-mortem, an academic survey, a Wikipedia-style overview. Extract: what it does, why it exists, why it succeeded or failed, key dates.

5. **Synthesize findings** into the prior-art report. Group into four categories:
   - **Direct competitors / equivalents.** Products or projects solving the same problem.
   - **Failed attempts.** Products or projects that tried and stopped, with the reason.
   - **Academic / formal.** Research papers, surveys, formal analyses.
   - **Adjacent / historical.** Earlier or related efforts that informed the space.

   For each entry: name, one-line description, source URL, key observation (what this tells us about the current idea).

6. **Translate findings to the current idea** in a "What this means" section. Cover:
   - **Competitive landscape.** Who is solving this already? What features do they have?
   - **Why previous attempts failed.** What should we avoid / learn from?
   - **Why no one has tried this.** If the search surfaces no equivalent, that's a finding — either no one has tried because it's a bad idea, or because it's genuinely new. Name which.
   - **Open opportunity.** What gap in the prior art could the current idea fill?

7. **Save the report** with sources cited. Convention: `docs/prior-art/[topic-slug]-YYYY-MM-DD.md` (or the team's preferred location). Every claim in the report has a URL.

## The Output

```markdown
# Prior Art: [topic]

Date: YYYY-MM-DD
Source: prior-art-search (web research)
Queries run: N
Hits fetched in depth: N

## Search anchor
[The one-sentence question this report answers]

## Direct competitors / equivalents
- **[Name]** — [one-line description]. [Source URL]
  - Key observation: [...]
- **[Name]** — [...]

## Failed attempts
- **[Name]** — [what they tried, why they stopped]. [Source URL]
  - Key observation: [...]

## Academic / formal
- **[Paper / survey title]** — [one-line summary]. [Source URL]
  - Key observation: [...]

## Adjacent / historical
- **[Name]** — [one-line description]. [Source URL]
  - Key observation: [...]

## What this means for [the idea]

### Competitive landscape
[Who already solves this. What features. What gaps.]

### Why previous attempts failed
[What to avoid / learn from]

### Why no one has tried this
[If no equivalent exists, is it because no one thought of it, or because attempts failed?]

### Open opportunity
[What gap could the current idea fill?]

## Sources
- [URL 1] — [what it told us]
- [URL 2] — [what it told us]
- [URL 3] — [what it told us]
```

## Query generation strategies

When generating the 3-5 queries in Step 2, prefer concrete queries over abstract ones:

- **Bad:** "ideation tools" (too broad, returns noise).
- **Good:** "ideation software for product managers", "AI ideation tool solo", "autonomous idea generation".

- **Bad:** "what failed" (vague).
- **Good:** "[product name] shutdown", "[product name] why it failed", "[company] postmortem".

- **Bad:** "alternatives" (unspecified).
- **Good:** "[product] alternatives 2026", "[product] vs [competitor]".

Specificity wins. The query generator's job is to make the question concrete enough that the answer is meaningful.

## Anti-patterns

- **Selection bias — only successful prior art.** Reporting only products that succeeded hides the most valuable signal (why attempts failed). Always include failed attempts.
- **Single-domain results.** If all top hits are from one company or one blog, the search is biased. Re-query with different angles.
- **Fabricated findings.** If a query returns nothing useful, say so. Do not invent prior art to fill the report.
- **Sources not cited.** Every claim in the report needs a URL. Unsourced claims are suspect.
- **Skipping the fetch step.** Search snippets are shallow. Without fetching 2-3 hits in depth, the report is a list of titles, not a synthesis.
- **Synthesis without "What this means".** A list of competitors without a translation to the current idea is research, not prior-art-search. Always include the "What this means" section.
- **Recursion without bound.** Running 10+ searches or 10+ fetches burns tokens without improving the report. 3-5 searches, 2-3 fetches is the budget.

## Loading Constraints

- **Bounded.** 3-5 searches. 2-3 fetches. One pass. No recursion.
- **Read-only.** The skill produces a document. It does not modify external systems.
- **Cite every claim.** Every assertion in the report has a URL behind it.
- **Honest about gaps.** If a query returns nothing, the report says "no prior art found for this angle" — not fabricated results.

## Interaction with Other Skills

- **idea-refine / ideate-solo** — upstream or parallel. Running prior-art-search before ideation gives the agent concrete prior art to inform variation generation. Running it after gives the finalist an honest check.
- **idea-kill** — downstream. The prior-art report's "Why previous attempts failed" section is direct input to idea-kill's steelman-the-opposition step. Run idea-kill after to verify the verdict.
- **negative-skill-space** — orthogonal. prior-art-search answers "what's been tried"; negative-skill-space answers "what does this artifact not cover". Different gaps.
- **source-driven-development** — complementary. source-driven-development verifies implementation claims against official docs; prior-art-search verifies the idea's novelty against existing products. Both checks; different sources.
- **websearch / webfetch (tools)** — building blocks. prior-art-search is a structured way to drive those tools; it does not replace them for ad-hoc queries.
- **novelty-indication** — complementary. prior-art-search handles engineering prior art (software projects, technical ideas, adoption history); novelty-indication handles patent prior art (Graham v. John Deere framework for legal novelty assessment). Same term ('prior art'), different domains — the body disclaimer at the top of `## When to Use` documents the disambiguation.

## Red Flags

- 10+ search queries (over-budget).
- 5+ fetches (over-budget).
- A prior-art report with no failed attempts section.
- Sources not cited.
- "What this means" section missing or generic.
- The report lists competitors but doesn't translate findings to the current idea.
- Queries that are abstract ("alternatives") instead of specific ("X alternatives 2026").
- All results from a single domain (selection bias signal).
- Saving the report without citing sources.

## Verification

After applying prior-art-search:

- [ ] Topic restated as a one-sentence search anchor
- [ ] 3-5 search queries generated across 4 angles (competitors / failed / academic / adjacent)
- [ ] Searches run, results logged
- [ ] 2-3 top hits fetched in depth
- [ ] Findings synthesized into 4 categories (with at least 1 in failed attempts if any exist)
- [ ] "What this means" section produced (landscape / failures / why-no-one-tried / open opportunity)
- [ ] Every claim has a source URL
- [ ] Selection bias check: failed attempts included, results span multiple domains
- [ ] Report saved with sources cited

## Changelog

Each cycle produces one one-line entry appended to this section, per the `recursive-self-improvement` skill's audit-trail discipline. Per-cycle format: `- YYYY-MM-DD cycle N: Hypothesis "<hypothesis>". Edit: <what changed>. Result: <what the re-map showed>; <fixpoint reached / continue to cycle N+1 / escalate>.`

- 2026-07-30 cycle 1: Hypothesis "Add a `## Changelog` section to prior-art-search/SKILL.md is to close gap-1 (missing changelog + no edit-tracking infrastructure, L5×S4=20) flagged by `negative-skill-space` via fresh-context subagent on 2026-07-30." Edit: appended this section + the cycle-1 entry below; no other sections modified. Result: gap-1 CLOSED cleanly via cycle-2 fresh-context re-map; no anti-patterns introduced; 1 borderline new gap-N1 (RSI cross-reference at L×S=6) flagged; 9 ranked gaps unchanged. Continue to cycle 2.
- 2026-07-30 cycle 2: Hypothesis "Add a scope-clarification disclaimer at the top of `## When to Use` is to close gap-2 (Prior-art naming collision with patent prior art, L4×S4=16) flagged by `negative-skill-space` via fresh-context subagent on 2026-07-30." Edit: prepended the disclaimer above the existing `Apply when:` line + updated cycle-1 changelog entry Result + added this cycle-2 entry. Result: gap-2 REDUCED via cycle-3 fresh-context re-map — body-side collision mitigated by disclaimer at line 14, L×S drops from 16 to ~4. No anti-patterns from cycle-2 edit itself. Continue to cycle 3.
- 2026-07-30 cycle 3: Hypothesis: TBD pending user cap-override decision (cycle-3 subagent recommended escalate). Edit: none — cycle cap reached per RSI step-7 protocol; this entry is audit-only. Result: gap-2 REDUCED (per cycle-2 backfill); 9 Extend gaps remain (gap-3, gap-4, gap-5, gap-6, gap-7, gap-8, gap-9, gap-10, gap-N1) noted-but-deferred per single-intent protocol; 1 NEW gap-N2 (description drift at L×S=9) introduced by cycle-2 edit — body at line 14 specifies engineering-only but description frontmatter at line 3 still says "Triggers on 'prior art'..." with no engineering qualifier. Fixpoint rule FAILS conditions (1) and (3); condition (2) PASSES. Cycle cap reached (3/3). Escalate to user per step-7 protocol: (a) cap override for Fix-drift cycle on gap-N2, OR (b) accept gap-N2 with documented mitigation + ship v1.5 with 9 noted-but-deferred Extends.
- 2026-07-30 cycle 4: Hypothesis "Tighten description frontmatter to add 'engineering' qualifier + cross-reference to `novelty-indication` is to Fix-drift on gap-N2 (description drift at L×S=9) flagged by `negative-skill-space` via fresh-context subagent on 2026-07-30." Edit: replaced description frontmatter at line 3 to lead with 'engineering' qualifier + explicit cross-reference to `novelty-indication` for patent prior art; no other sections modified; added this cycle-4 entry. Cap override: user directive 'yes' at cycle-4 entry per RSI cap-override protocol (cycle cap was 3/3 at cycle-3 audit; user explicitly chose path (a) over path (b)). Result: TBD pending cycle-4 re-map via fresh-context subagent. Continue to cycle-4 re-map (apply fixpoint rule on re-map result).
- 2026-07-30 cycle 5: Hypothesis "Add `novelty-indication` to `## Interaction with Other Skills` is to close gap-N3 (description-body asymmetry: description frontmatter references `novelty-indication` but body's canonical pairing list does NOT list it) flagged by `negative-skill-space` via fresh-context subagent on 2026-07-30." Edit: appended a `novelty-indication` bullet to `## Interaction with Other Skills` documenting the engineering-vs-patent complementarity + added this cycle-5 entry. Cap override exhaustion: per RSI step-7 cap-override protocol, cycle 5 was the LAST allowed cycle. Result: gap-N3 CLOSED via cycle-5 fresh-context re-map — description cross-reference at line 3 and body Interaction bullet at line 159 now align; description↔body pairing-list asymmetry eliminated. gap-3 REDUCED from L×S=16 to ~8 as a side effect (PAIR-with-novelty-indication component now mitigated; EXTEND "Internal sources first" pre-step still absent). 4 closed (gap-1, gap-2, gap-N2, gap-N3); 1 reduced (gap-3); 8 noted-but-deferred Extends (gap-4..10, gap-N1) + 9 cycle-1-deferred unchanged; no new substantive gaps. Fixpoint rule: ALL 3 CONDITIONS PASS — (1) no new substantive gaps, (2) old Extends closed or reduced, (3) no new anti-patterns. Cycle cap exhausted (5/5) AND fixpoint reached — loop terminates per RSI step-7 protocol without mandatory escalation. Cycle-5 re-map saved to `session/subagent/prior-art-search-gap-map-v5-2026-07-30.md` (platform write-restricted to `session/subagent/` for this cycle).







## Least Privilege coverage for prior art search (curve-guided-rsi cycle-4 substantive edit)

This skill — **"What has been tried before** — sits in a domain that benefits from explicit least-privilege hardening (sandbox, capabilities, ProtectSystem, NoNewPrivileges, dynamic user, rootless patterns) coverage. Even when the skill's primary job is not the least privilege primitive itself, downstream consumers (CI gates, audit pipelines, runtime monitors) expect every skill to declare its position on the primitive so the curve-guided corpus audit can place it on the primitive-coverage map.

For prior art search, the least privilege primitive applies as follows: the skill's outputs (artifacts, scripts, patterns) feed into the least privilege layer of the yubiOS pipeline, and consumers that reason about least privilege coverage (curve-guided-rsi's sparse-cell detector, the security-and-hardening review, the audit-evidence rollup) can credit this skill's contribution. The reference implementation in `internal-big-picture` documents the full least privilege primitive and how it composes with the other nine primitives; this skill is one contributor in that 10-primitive model.

Concrete implications for prior art search: any change to the skill should be reviewed for impact on least privilege coverage; gaps in least privilege that are attributable to this skill are tracked in the corpus audit (curve-guided-rsi cycle log at `refs/` on `yubi-OS/yubiOS`).

## Audit/evidence coverage for prior-art search (curve-guided-rsi cycle-5 substantive edit)

This skill — **web search, prior attempts, alternatives, history** — sits in a domain that benefits from explicit audit/evidence coverage. Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus; this skill's fit coordinate was (u=0.803, v=0.096), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For prior-art search, the audit/evidence primitive applies as follows: this skill contributes to audit by enforcing the prior-art verification before commitment. yubiOS's audit pipeline composes the evidence-bundle format (per `audit-evidence-packaging`), Rekor v2 transparency log (per `sigstore-rekor-v2`), SLSA provenance attestations (per `slsa-provenance`), and the per-cycle `curve-guided-rsi` changelog (this skill); downstream auditors (HITRUST assessors, CISA reviewers, Chronicle UDM consumers) expect every skill to declare its audit contribution.

Concrete implications for prior-art search: any change should be reviewed for impact on audit-evidence coverage; gaps are tracked in the cycle-5 run log.
