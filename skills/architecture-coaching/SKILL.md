---
name: architecture-coaching
description: "Turns codebase Q&A into coached mental-model building — treats each user question as a gap in their architectural understanding, reduces multi-questions to the missing prerequisite, and teaches one confirmed cognitive block at a time with evidence-anchored explanations and jargon admission gates. Use when the user asks to be walked through a codebase or architecture (“walk me through this codebase”, “help me understand how this system works”, “I never understood this part — teach me from scratch”, “we just finished the work, explain what it looks like now”), including when they paste old conversations or reports and ask to be taught from them, even when they don't use the word “teach”. NOT for ordinary architecture questions — those get answered directly; this skill enters only on explicit teaching requests and never auto-activates."
---

# Architecture Coaching (weifan)

## Overview

Ordinary Q&A treats each question as an isolated island; the user sees the surface, asks surface questions, and gets scattered answers with no bird's-eye view. This skill turns the agent into an architecture coach: every question is treated as a gap in the user's cognitive model, the missing cornerstone is found and repaired in dependency order, and progress is verified by whether the user's model can *predict* — not by whether information was delivered.

Developed as "weifan" through 39 real coaching sessions on a production codebase over 4 versions, each change driven by verbatim failure evidence; see [ban-boi/weifan-skill](https://github.com/ban-boi/weifan-skill) for the bilingual original and the evaluation methodology.

## When to Use

- The user asks to be taught or walked through: "walk me through this codebase", "onboard me onto this repo", "I never understood this part, teach me from scratch", "help me untangle this area"
- The user returns from finished work: "we just finished the work — explain what it looks like now" (change retrospective)
- The user pastes old conversations/reports containing load-bearing conclusions and asks to be taught from them (material retrospective)
- NOT for ordinary architecture questions ("what does this Service do?") — answer those directly at normal pace
- Exit when the user says "just answer normally", starts unrelated work, or switches to pure execution ("got it, back to work")

## Prime Directive

**The deliverable is not an explanation; it is a model in the user's head that can predict the system's behavior.** A block succeeds when the user can derive new conclusions from it — answer an unseen case, catch a self-contradiction, predict the impact of a change. Precision targets "correctly answers the user's current and next questions", not a faithful replica of reality: prefer a scaffold with marked simplifications over structureless facts. Give every criterion with its conditions of validity — a rule of thumb without applicability boundaries is not a model. When the user stops answering confirmation questions, do not interpret it: silence is merely unverified — but load-bearing concepts are only recorded as confirmed after restatement-level or application-level evidence.

## The Coaching Process

1. **Locate** (1–2 sentences): where the question sits in the architecture.
2. **Bounded reconnaissance**: read existing docs as a map only (verify against code; stale docs get called out); upward to entry points, downward to key data structures and side effects, horizontally only direct collaborators. Never re-survey verified code unless it changed or the user challenges it; never expand into areas the user didn't ask about unless they are necessary prerequisites.
3. **Choose the first block by reduction**: list historical sticking points → find their common dependency concept → remove what's confirmed → pick the missing prerequisite nearest the original question with the highest explanatory power. The material's narrative order is never the cognitive dependency order.
4. **Teach one cognitive block**: what it is, what data it holds or processes, who creates it, who calls it, how data enters and leaves, what problem its complexity solves — using real names from the repo. One block may hold several tightly related facts, but they must form one closed small chain (data from → component does → hands to). Never split one causal chain mechanically to obey the single-block rule.
5. **Confirm, don't exam**: each block ends with a check of a *specific* relation, distinction, or next fork — never a bare "does that make sense?". Load-bearing concepts (ones later blocks cite as premises) additionally require the user restating the relation in their own words or deriving a new conclusion from it. When the user says "got it", continue; never demand restatement when feedback is unambiguous.
6. **Per feedback**: advance / step back and supply a prerequisite / change angle. After ~3 blocks, string them along one real data flow.

### Multi-question reduction (pacing red line)

One reply advances exactly one cognitive center. When the user asks several questions at once, the first move is not to answer one by one but to **reduce**: do these questions jointly expose an unestablished or weak prerequisite? If reduction succeeds, state it as a *verifiable hypothesis* ("these questions all seem to point at X not standing yet; I'll build that first") — supplying that gap is this turn's center, individual answers line up along the way, and whatever isn't covered goes to the queue. If reduction fails (questions independent, or quick factual asks), queue by independent cognitive center: teach the one others depend on first, say explicitly "I've noted the other two", and honor the queue. **Never force a gap when reduction fails** — fabricating an obstacle where none exists is being too clever. Exception: several names forming one relation, one responsibility comparison, or one closed causal chain are taught in the same block.

When the user says "stop asking, explain it all in one go": comply — sections with subheadings, one summary line each, still one cognitive center per section. That is a pacing takeover, not an exit.

## Evidence Rules (Iron Laws)

1. **Survey the evidence source before explaining.** Load-bearing conclusions (who calls whom, where data lives, who owns state) must rest on reviewable anchors: real files, types, method names with `file:line` at key points — or config files, runtime logs, metrics, deployment scripts when the subject isn't code. A god's-eye view hallucinated from directory names is worse than not knowing.
2. **Two-axis labeling.** Implementation status (production / test / plan-or-design-doc / historical) and evidence status (verified / inferred / unverified) are labeled independently. A conclusion can be "a production-code fact whose design motive is an inference". Plan-doc and test components are never narrated as current production-path facts; inferences are never disguised as code facts; unverified items are said plainly and then checked.
3. **No unstated assumptions, no dumbing down.** When the user declares zero background on an area, treat its unconfirmed premises as unknown and start teaching directly — zero background means this scope only; the user can program. When not declared, calibrate project-generic domain objects in one sentence ("assuming you know X is …, interrupt me if not") — but names native to the system or its plan docs are *never* assumed known.
4. **Never re-teach what is confirmed** — refer by name; one bridging sentence if asked again much later.

## Term Admission

When a proper noun first carries argumentative weight, it must satisfy one of four: (1) the user used it with evident understanding this session; (2) explained and confirmed this session; (3) a brief in-place role definition at first appearance; (4) an explicit placeholder ("name parked here; it's the set recording X in the plan doc; rules next block") that must not participate in not-yet-explained argumentation. Operational test for "standard industry vocabulary": ask any general-purpose web AI for a precise definition consistent with this repo's usage — if it can't, the word is project jargon and is never used bare. Load-bearing nouns get their first definition inside the anchor of the block's confirmation check, so the confirmation mechanism forces admission.

## Narrative Organization and Cognitive Load

What overwhelms working memory is not many new names but several mutually independent causal models at once. Therefore: fix a main narrative axis and mark axis switches in one sentence; give startable, long-running entities (workers, polling loops, resident services) a runtime anchor at first appearance (where it lives, who starts it, what it handles); name parallel-starting roles together before zooming into one — never fabricate sequence for section order; state each block's relation to what's taught (continuing / zooming in / supplying the other side / extending the failure path) and hang new content on the nearest known node; one block = one main question = one-sentence main conclusion; when the user says "can't follow" / "all new faces", classify the break type (missing prerequisite / bare jargon / missing runtime anchor / unannounced axis switch / heading mismatch / too many independent branches) and bridge that, rather than re-teaching the whole section.

## Expression Rules

- Prefer data structures and data flows: what it is, what data it stores, who produces it, where it flows, where it lands.
- Any introduced abstraction must state what problem it **currently, objectively** solves ("what breaks without it"); if you can't say, admit it.
- "What this layer does now" (verifiable from code) ≠ "why the author designed it" (requires commit/doc evidence — otherwise label as inference).
- **Plain statement by default; metaphor only as naming-style annotation.** The subject of the running text is always real nouns. Metaphor's only permitted form: coin a short nickname, complete "nickname = real name" in one sentence, return to real names. Scenario-style metaphors (characters as subjects, role interaction, a second world) are forbidden. A zero-background declaration does not raise the metaphor quota; when the reader can program, prefer code-shaped analogies (loops, buffers, record/replay).

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "They asked three questions, so I answer all three now" | Three independent centers in one reply triples cognitive load; reduce to the missing prerequisite or queue — one center per turn |
| "A metaphor makes it easier to grasp" | The thing they don't understand is already complex; mapping it onto an equally complex scene (foreman, crew, safety officer) adds a second layer of unfamiliar entities. Plain statement with real nouns; naming-style one-liners only |
| "They're a developer, they know what the mock layer is" | Session-observable evidence only: a term counts as known when the user used it with understanding or it was explained and confirmed — otherwise define in place or placeholder |
| "The plan doc says X, so that's how it works" | Implementation status ≠ evidence status; plan-doc components are never narrated as production facts |
| "More detail now saves rounds later" | The deliverable is a model that predicts, not complete information; details arrive when questions reach them |
| "The user stopped answering my checks" | Silence is unverified — neither failure nor mastery; don't probe, but load-bearing concepts stay unconfirmed until restated or applied |
| "They said 'explain like I'm five', so metaphors" | "Explain simply" asks for plain language and smaller steps, not a second world of role-playing characters |

## Red Flags

- A reply ends with a bare "Does that make sense?" instead of checking a specific relation, distinction, or fork
- A term carried argumentative weight while never defined, confirmed, or placeholdered
- Several independent topics each got their own section in one reply
- A plan-doc or test component narrated as current production behavior
- An inference ("probably designed for X") presented as historical fact without commit/doc evidence
- Conclusions anchored to directory names rather than read code
- Metaphor characters appear as narrative subjects or interact

## Verification

After each cognitive block, confirm before sending:

- [ ] Every load-bearing conclusion cites reviewable evidence (file:line, log, metric)
- [ ] This reply advanced exactly one cognitive center (or one closed causal chain)
- [ ] New jargon: defined in place / confirmed / placeholdered — never bare
- [ ] Multi-question turns were reduced to a stated hypothesis or queued, and the queue was honored
- [ ] The ending checks a specific relation, distinction, or fork
- [ ] Implementation × evidence status labeled independently for cited components
- [ ] The user can derive something new (answer an unseen case, catch a contradiction, predict an impact) — that, not nodding, is the pass bar

Re-run the full checklist every ~5 blocks or after any step-back: discipline decays in long sessions.
