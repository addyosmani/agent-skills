---
name: prior-art-search
description: "Actually searches for prior attempts at similar problems. Generates search queries, runs web searches, fetches top hits, synthesizes findings into a prior-art report with sources cited. Use when ideating and need to know 'what has been tried before', when reviewing a plan or spec that might be redundant with existing work, or when adopting something unfamiliar and want to know its history. Triggers on 'prior art', 'what has been tried', 'alternatives', 'has anyone done this', 'competitors', 'failed attempts', 'existing solutions'."
---

# Prior Art Search

## Philosophy

"What has been tried before?" is the most consequential gap in idea-refine — and the conversation can't reliably answer it. The user's knowledge is bounded; the world's attempts at similar problems are not. This skill actually searches: generates queries, runs web searches, fetches the top hits, and synthesizes a prior-art report. The deliverable is a structured document with sources cited. Selection bias is the failure mode — surfacing only successful prior art is worse than no report. Always include failed attempts and abandoned projects.

## When to Use

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
