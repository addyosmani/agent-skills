# Changelog

## Unreleased

`requireReviewRecord` no longer misses a merge that switches branches first ([#195](https://github.com/JJChill/agent-skills/issues/195)).

- **Before:** PreToolUse runs before the whole command, so `git switch main && git merge --no-ff b -m "…"` was judged while HEAD was still the feature branch. The gate saw an unprotected branch and passed a merge into `main` with no record. Only `probity-review-record` in CI caught it. The issue blamed the router selecting no agents; that wasn't the cause.
- **Now:**
  - A `git switch` or `git checkout` earlier in the same command, in the same repository (`cd`, `git -C`), sets the branch the merge is judged against.
  - Merge files, fast-forward detection and routing are measured from that branch, not HEAD.
  - `git switch -` is treated as unknown and enforced (fail safe).
  - Path checkouts (`git checkout -- <path>`, `git checkout <tree> <path>`) don't count as switches.
- **For custom adapters:** `ReviewRecordGit.mergeFiles` and `wouldFastForward`, and the `routeMerge` dependency, take an optional third `head` argument (default `HEAD`). Existing two-argument adapters still type-check.
- **Docs:** code-review-and-quality's Review Record says what to write when the router selects no agents.

## 0.4.65

`requireReviewRecord` gates GitLab merges ([#193](https://github.com/JJChill/agent-skills/issues/193)).

- **Before:** the gate covered `git merge` and `gh pr merge` only. A `glab mr merge` from an agent session went unchecked until the CI checker ran after the merge.
- **Now:**
  - `glab mr merge` and `glab mr accept` into a protected branch need a record in `-m`/`--message`, which glab uses as the merge commit message.
  - The target branch and files come from `glab mr view -F json` and `glab mr diff --raw`, and routed agents from the same raw diff.
  - When the project's merge method is fast-forward (`merge_method: ff`, from `glab api projects/<id>`), the gate denies the merge and names the setting to change. If the method can't be read, the gate still judges the message.
- **For custom adapters:** `ReviewRecordGit` gains optional `mrBase`, `mrFiles` and `mrMergeMethod`; adapters without them fall back to the glab defaults. `requireReviewRecord` takes an optional `routeMr`.

## 0.4.64

`probity-scope-report` explains a config kept outside the repository ([#186](https://github.com/JJChill/agent-skills/issues/186)).

- **What was confusing.** With `--config` pointing outside `--root`, the report printed bare DEAD SCOPE warnings. Probity anchors relative globs at the config file's directory, so the warnings were accurate, but nothing said why. It also didn't mention the worse effect: relative `!` exclusions such as `excludeGlobs`' `spikes/**` stopped excluding anything.
- **Now:**
  - The report prints the directory it anchors globs at.
  - It warns once, as `CONFIG OUTSIDE ROOT`, explaining both effects and the fix.
  - `anchorGlob` in `rules/scoping.ts` now joins paths the way Probity's does (`path.posix.join`). Before, `./` and `..` segments in a glob resolved differently here than in enforcement, so the scope report and the review router could disagree with what Probity actually scoped.

## 0.4.63

A merge can now show whether it was reviewed ([#178](https://github.com/JJChill/agent-skills/issues/178)).

- **What was missing.** A green test run was enforced before a commit, but nothing recorded whether a review happened before a merge. A merge with no review fixes looked the same whether the code was reviewed and found clean or never reviewed.
- **Now:**
  - **The review record** is git trailers in the last paragraph of the merge message (code-review-and-quality, Step 6): `Reviewed-by-agent: <agent> (ran, N findings[, M fixed])` or `(skipped: <reason>)`, plus optional `Review-obligation:` and `Visual-check:` lines.
  - **Agent names** may carry a plugin prefix (`agent-skills:code-reviewer`); the record stores the bare persona name.
  - **`requireReviewRecord(review)`** denies a `git merge` or `gh pr merge` into a protected branch that touches `enforceForPaths` without a valid record, or one that would fast-forward.
  - **`probity-review-record --range`** checks the same record in CI, including merges no agent made.
  - **`reviewConfig`** types the new `export const review` in probity.config.ts.
  - **Review routing ([#181](https://github.com/JJChill/agent-skills/issues/181)).** `routes`, `fallback`, `always`, `ignore`, `testPaths` and `nonCode` in `review` map a diff to the agents it warrants, with no model calls. `probity-review-route` prints them as `agent|why` lines (or JSON) against the merge-base with main. It greps only real added lines: not diff headers, non-code files, binaries or ignored paths.
  - **`record.requireRoutedAgents`** makes the gate deny a record that misses a routed agent. `probity-review-record --routed-range <before>..HEAD` checks the same thing in CI, for newly pushed merges only.
  - **Review obligations (#181).** A TDD exemption in `tddGlobs` (Kotlin, JS, Swift), in `tddExemptions` (KMP), or in a `reviewedBlock`'s files can be `{ glob, id, reviewWith, check, reason }`. The router lists the obligations a diff incurs and routes their reviewer. `record.requireObligations` with `requireReviewRecord(review, { obligationsFrom })` requires `Review-obligation: <id> (addressed by <agent>)` from a reviewer who ran. `probity-scope-report` lists obligations and warns about plain `!` exemptions that declare none.
- **Behavior change.** `probity-scope-report --strict` now exits 1 on a plain `!` negation in `tddGlobs` that declares no review obligation. Convert it to the object form, or move the glob to `excludeGlobs` if no rule should check it. `/probity-update` proposes the edit. `tddGlobs` must also contain at least one include glob: a list of only exemptions would widen TDD to the whole repo, so it now throws.

## 0.4.62

The Kiro shim judges kiro-cli 3.x writes again (#176).

- **What broke.** kiro-cli auto-updated to 3.1.0, whose V3 engine renames
  the mutating tools, and Probity judged none of Kiro's writes. In
  mysudo-core a build agent wrote a new public class to `sdk/core` with no
  test, and nothing blocked it. The hooks still ran: on 3.x the matchers
  `write` and `shell` match by capability tag. The shim couldn't read
  what they sent:
  - **`fs_write`:** sends `{path, text}`, but the shim read `content`, so
    Probity judged an empty file.
  - **`str_replace`, `fs_append` and `delete_file`:** weren't recognised,
    so they passed unjudged.
  - **Session files:** they moved, and have a new line format, so the
    history rules (TDD, green gate) would have seen no history.
- **Now:** the shim maps the 3.x tools and keeps the 2.x names:
  - `fs_write` {path, text} → `Write`;
  - `str_replace` {path, oldStr, newStr, replace_all} → `Edit`;
  - `fs_append` → `Write` of the file on disk plus the text, with Kiro's
    newline;
  - `delete_file` → `Bash` `rm`;
  - `execute_bash`, `execute_pwsh`, `run_command` and a background
    process `start` → `Bash`, judged in the call's own `cwd`.
- **Fails closed:**
  - **Untranslatable tools:** a write or shell tool the shim can't
    express (`edit_code`, `semantic_rename`, `smart_relocate`,
    `create_hook`) is blocked. So is a translator failure. Both used to
    be allowed.
  - **Slow judges:** kiro-cli 3.x ignores an agent hook's `timeout_ms`
    and lets a call through when the hook runs past 60 s. On a 3.x event
    the shim gives Probity 55 s (`PROBITY_KIRO_TIMEOUT_S`) and blocks a
    call it hasn't judged by then.
- **History:** the shim finds a 3.x session file
  (`~/.kiro/sessions/<workspace>/sess_<id>/messages.jsonl`) from the hook
  event's `session_id`, before `KIRO_SESSION_ID`, which on 3.x names the
  root conversation. The transducer reads 3.x `user`, `assistant`,
  `tool_call` and `tool_result` events. It rewrites a shell result ("…
  Exit Code: N") into 2.x's exit-status envelope, so the green gate's Kiro
  check works on both versions. Zero counts only when Kiro marked the call
  successful.
- **Checked against real sessions:** all 144 local kiro-cli 3.1 session
  files convert. An end-to-end test runs the real shim on 3.x events;
  against 0.4.61's shim it fails as reported.
- **Agent setup:** keep the matchers `write` and `shell`, which cover
  every 3.x write and shell tool. Per-tool matchers beside them would
  judge each call twice. `docs/kiro-setup.md` covers both versions and the
  60 s limit.

## 0.4.61

Check compaction later without a live shadow: record, then replay
(#174).

- **What was missing.** After 0.4.59, mysudo-core-sdk ran a
  `wholeFiles(kiroJudge())` shadow for 5 hours (1,444 verdicts):
  - compacted against whole prompts disagreed on 2 of 170 (1.2%);
  - whole against whole disagreed on 8 of 965 (0.8%), the noise between
    two runs of the same judge.

  The shadow doubles judge cost, so the owner wanted to stop it and
  keep a way to check compaction later.
- **Record:** `compactJudgeFiles: { record: { log, sample } }` (default
  sample 0.1) appends, for a sampled share of compacted verdicts:
  - the whole-file prompt that wasn't sent, built locally with no model
    call;
  - the compacted prompt's SHA-256;
  - the judging task;
  - the verdict and reason the compacted prompt got.

  The record also keeps the primary's telemetry. The log is kept at
  `0600`, and recording never changes or blocks a verdict. Each judge
  call is recorded, so a deny that `withContradictionRetry` later
  retries is recorded as it was given.
- **Replay:** `npx probity-shadow-replay <log>` asks a judge each recorded
  prompt and prints the same agreement, leaks and friction (with
  `--show`) as `probity-shadow-report`.
  - **Judge:** it defaults to the one the recorded primary ran on
    (`kiro`, `claude`, `claude:<model>`), so disagreements measure
    compaction rather than a different model. On another judge, the
    report's heading says so.
  - **Options:** `--judge claude|kiro`, `--model ID`, `--limit N` (caps
    the spend), `--concurrency N` (default 4). An unknown option, or one
    missing its value, is an error, so a mistyped `--limit` can't
    silently replay the whole log.
  - It streams the log line by line.
  - The report's output now comes from one shared formatter, so both
    read the same.
- **Size and privacy:** about 120 KB per recorded prompt, so about
  10 MB a day at 10% of 800 compacted verdicts. The prompts hold code
  and session context: keep the log local.

## 0.4.60

More self-contradicting judge denies are retried (#169), and the docs say
to pin the judge's model (#169–#171).

- **What happened.** A JS/TS project whose judge ran on Sonnet
  (`claudeJudge()` follows the CLI's default model) hit three kinds of
  judge mistake. It denied single-test writes with text concluding they
  were allowed (#169). It counted tests already on disk as new (#170).
  It refused an import sent alone before the code using it (#171).
- **Retry:** `withContradictionRetry` also retries a deny whose last
  sentence ends "this/it is a valid … add/step/write" or "Correction:
  …, which is allowed …". The second verdict stands. Qualified forms
  aren't retried, such as "which is allowed only after …" or "Neither is
  a valid red step".
- **Docs:** "Choosing the AI judge" in `hooks/PROBITY.md` says the TDD
  rules were measured on Opus. It says to set
  `claudeJudge({ model: 'claude-opus-5-5' })`, or to measure with a
  shadow judge first.
- **Not shipped:** fast paths that pass, without the judge, a write
  adding one test or only imports. Three adversarial reviews each got
  past a version of them. The bypasses were real writes that made a
  failing test pass or be skipped: `expect.extend`, a test that skips
  its siblings, code hidden from the parser, a new test placed under an
  unbraced `if`. Skipping the judge safely would need to prove arbitrary
  test code harmless.

## 0.4.59

Judges get a diff, not the whole file twice, for an edit to a large file
(#168).

- **What was missing.** Probity applies an edit before the rules see it,
  so a write carries the whole file. Every judge prompt held it twice,
  as the current content and the pending one. In mysudo-core-sdk the
  median judge prompt was 42 KB, and the Opus judge was about a quarter
  of the week's Kiro credits. One build run's 173 small edits resent a
  few large files 173 times each.
- **Now:** every preset sends the judge a unified diff in place of the
  `Current file content` and `Pending action` sections, with up to 20
  unchanged lines either side of each change. The file's import and
  package lines are kept wherever they are, because some judges tell an
  adapter from core code by its imports. This applies when:
  - the file is at least 8,000 bytes;
  - it already exists;
  - the prompt holds those exact sections. Probity's `enforceTdd` and
    most of this package's AI rules do;
  - and the result is clearly smaller.

  Past 1,000 changed lines the file is sent whole. Any other prompt is
  sent as before. Upstream's TDD instructions already allow the pending
  action as a diff.
- **Effect:** a one-line edit to a 45 KB file cut the TDD prompt from
  100 KB to 13 KB. Shadow logs shrink with it.
- **Unchanged:** rules still see the whole file, so deterministic
  checks and fast paths behave as before.
- **Options:** `compactJudgeFiles: { minBytes, contextLines }` tunes
  it, and `compactJudgeFiles: false` sends whole files again. Outside a
  preset, wrap rules with `withCompactJudgeFiles(entries)`.
- **Measuring it.** The judge now sees 20 lines either side of a change
  rather than the whole file, and whether that changes verdicts isn't
  measured yet.
  - The shadow log records each compacted verdict's full and sent
    prompt size.
  - `probity-shadow-report` prints how many verdicts were compacted,
    and each candidate's agreement on compacted and whole prompts.
  - `wholeFiles(candidate)` asks a shadow candidate the uncompacted
    prompt. On the primary's model, its disagreements are exactly what
    the diff changed:
    `shadowJudge(primary, [wholeFiles(sameModel)], { log })`.

## 0.4.58

Two fixes for the JS/TS preset (#150, #166).

- **The commit gate counts only a command that runs the suite (#150).**
  The default command pattern, `/npm (run )?test|vitest|jest/`, matched
  those words anywhere in a shell command. A `gh issue create` whose body
  mentioned vitest was recorded as the latest test run, and the next
  commit was denied as not green. In reverse, `echo "Test Files 4
  passed"` mentioning vitest could pass as a green run.
  - **Now:** the default counts a command only when one of its
    top-level commands starts the suite: `npm test`, `npm run
    test[:…]`, pnpm, yarn or bun the same way, or vitest or jest,
    directly or through npx. Pipes and chains still count (`cd /repo
    && npm test | tail`).
  - The check is exported as `isJsTestInvocation`.
  - The Gradle check and this one now share one quote-aware splitter.
  - **Unchanged:** a custom `commitCommand` is used as given; its doc
    now says to anchor it.
- **The JS/TS TDD judge allows a type-only fix for a type-check
  failure (#166).** vitest doesn't type-check. In the Tax repo, a green
  step widened a union, and `tsc --noEmit` then failed in an existing
  test. Every type-only fix was refused as "not driven by a failing
  test": narrowing a return type, splitting the type, and restating the
  assertion. That left no path forward.
  - **Now:** a write that changes only types to make the type check pass
    is part of the step that caused the failure, or a refactor under
    green. That covers production or test code. A restated assertion
    must stay at least as strong.
  - **Still judged as usual:** a write that also changes runtime
    behavior or weakens an assertion. A block must say which part of
    the write isn't type-only.

## 0.4.57

Three fixes from real sessions (#164, #162, #151).

- **The shadow report reads a log of any size (#164).** In
  mysudo-core-sdk a week of verdicts made a 620 MB log, because every
  record keeps its ~100 KB judge prompt. `probity-shadow-report` read
  the file into one string and failed: `Cannot create a string longer
  than 0x1fffffe8 characters`.
  - **Now:** the report reads the log line by line and drops each
    prompt as it goes.
  - **New option:** `shadowJudge({ includePrompt: 'disagreements' })`
    keeps a prompt only where a candidate disagreed with the primary,
    the leaks and friction that `--show` lists.
- **The commit gate says when a run lost its summary line (#162).** A
  run of `npm test 2>&1 | grep -E 'FAIL|Error' | head` passed every test,
  but the filter removed the summary line the gate reads as green. The
  deny said the run "was not green", which suggests there were failures.
  - **Now:** a run with no failure and no summary line gets its own
    message. It names the summary pattern it looked for and says that
    `| grep`, `| head` and `| tail` drop it. A run that shows a failure
    keeps the old message.
- **The TDD judges accept generalising as the minimum green (#151).**
  In a JS/TS project, code hard-coded a sale spilling into a second
  parcel. A test that needed three parcels was refused both as a loop
  and as a recursive call, because the judge wanted a hard-coded third
  parcel. Only refactoring under green got the agent through, and the
  deny never mentioned that route.
  - **Now:** the Kotlin, Swift and JS/TS TDD judges are told that
    replacing special cases with a loop or recursion is the minimum
    green when the failing test needs the general case.
  - **Still over-implementation:** a write that also adds behavior no
    failing test needs.
  - **When the judge blocks over-implementation,** it names the step it
    would accept and the refactor-under-green route.

## 0.4.56

A new rule, `enforceLayeredImports`, keeps ordered layers pointing
down (#154).

- **What was missing.** mysudo-core builds its Compose design system
  with atomic design, one package per level: tokens, atoms, molecules,
  organisms, templates. A level may use the levels below it, never one
  above. A unit test scanned the sources for upward imports, so it
  caught one only after the write. Probity had no rule for an ordered
  set of layers.
- **Now:** `enforceLayeredImports({ layers })` blocks a write that adds
  a reference from a layer to one above it, naming the edge, the
  references and the layer order:
  - Kotlin `import` lines and fully-qualified names in code; Swift
    `import` lines. Comments and strings are skipped.
  - `strict: true` allows only the layer directly below.
  - Siblings at one rank may not use each other: a nested array of
    layers, or a `*` package segment (`com.x.feature.*`) for feature
    modules nobody lists.
  - Delta-based: existing upward imports don't freeze their file.
- **Opt-in.** No preset turns it on; add a block scoped to the layered
  code. See "Layered imports" in `hooks/PROBITY.md`.

## 0.4.55

The thin driving adapter judge lets a screen decide what to show from
the rows it already shows (#159).

- **What was missing.** In mysudo-core a Compose view function hid the
  Home screen's "Edit order" link when fewer than two Sudos were shown.
  The judge refused it as a domain rule for `sdk/core`, although the
  core's `order()` accepts any order, one Sudo included. Hiding "Move
  up" on the first row and "Move down" on the last passed in the same
  change.
- **Now:** the judge's always-pass list names display conditions over
  the data the view already holds: an empty state, a single item, the
  first or last row. A pure view function over the screen's state is
  named as a fine home for them.
- **Still blocked:** a display condition that repeats a rule the core
  enforces, such as hiding "Delete" on the last admin when the core
  refuses that delete.

## 0.4.54

Scenario fidelity lets a scenario and its test gain a step together
(#155).

- **What was missing.** In mysudo-core-sdk a new business rule gave
  seven claimed scenarios an extra precondition, and their tests the
  matching DSL call. Each write was judged against the other side's old
  text: the test write was refused because the scenario didn't state the
  step, the spec write because the test didn't establish it. Marking the
  scenario `@wip` didn't help, so the only route was to remove each
  test's `Covers:` claim and add it back.
- **Now:** a scenario marked wip (`@wip`, `@planned`, `(wip)`) is not
  held to its claims on a spec write. The step lands in three writes:
  1. mark the scenario wip and add the step;
  2. update the claiming test, which is judged against the new text;
  3. remove the marker, which judges every claim on the scenario again.
     A Gherkin `@wip` tag line sits outside the scenario's text, so its
     removal now counts as a change too.
- **Limit:** a scenario left wip is not judged against its claims until
  the marker comes off.

## 0.4.53

The commit-on-green gate judges the worktree being committed, not the
last test run anywhere in the session (#152).

- **What was missing.** In mysudo-core-sdk one session had two sibling
  worktrees open. A docs commit in `-234`, whose build was green, was
  blocked by a deliberate red TDD run in `-382`:
  `requireGreenTestRun` took the last matching run in the transcript,
  wherever it ran.
- **Now:** when the repository has more than one worktree, the gate
  leaves out:
  - **runs placed in another worktree**: a command that starts with
    `cd <absolute path> &&` (or `;`) into a different worktree;
  - **writes to another worktree**, which no longer demand a rerun
    in this one.
- **Still counted everywhere:** a run with no leading `cd`, or a
  relative one. The transcript doesn't record where a command ran, so
  the gate can't tell, and stays fail closed. A nested worktree
  (`.claude/worktrees/<name>`) is told apart from the main checkout
  that contains it.

## 0.4.52

The Language Test judges a step the same way in every feature file and
sees a whole glossary (#146).

- **What was missing.** The judge saw only the file being written and
  the first 8,000 characters of the glossary:
  - **One step, two verdicts.** `And nothing was asked of the service`
    passed in a feature file that already used it, then was rejected
    minutes later in another file as protocol mechanics.
  - **A glossary verb rejected.** In mysudo-core-sdk the glossary is
    21,000 characters long. The entry that uses "provision" lies past
    the cut, so "provisioned" in a scenario title was rejected as
    back-end vocabulary.
- **Now:**
  - **Settled wording.** With `specsDir`, the prompt lists each step the
    write adds that another specification already uses word for word,
    with where it is used. The judge doesn't block on those. If such a
    step leaks mechanics, it says so in the reason and still passes,
    since the fix belongs across all the specifications at once. Every
    preset passes its specs directory.
  - **The glossary limit** is raised from 8,000 to 32,000 characters.
    A glossary over the limit is cut with a note that a missing term
    is no reason to block.
  - **Word forms.** A word the glossary or the specifications already
    use for a domain action counts as domain language in any grammatical
    form ("provisioned" and "Provisioning").
- **Cost.** The prompt grows with the glossary, to about 41,500
  characters on mysudo-core-sdk. Scanning the specs adds about 50 ms
  per judged write.
- **Decision to check.** A settled step is passed even if the judge
  thinks it leaks, so one leak accepted in the past can spread. The
  alternative, a judge that can reject wording the specs already use,
  is the inconsistency this release removes. The judge still names the
  leak in its reason, so it can be fixed across the specifications.

## 0.4.51

New rules get a judging-task label without anyone remembering to add it.

- **What was missing.** The presets label their own rules (0.4.50), but
  a rule a project adds next to a preset reached the judge unlabelled,
  and a new preset in this package could be added without the label and
  pass CI.
- **Now:**
  - **`probityConfig({...})`** is Probity's `defineConfig` with every rule
    the config lists labelled. The templates use it, and
    `/probity-update` proposes the switch. Rules that are already
    labelled are not wrapped twice.
  - **A test lists `presets/`** and checks that every `*RuleEntries`
    preset it finds runs each rule under its own task, so a new preset
    without the label fails CI.
  - **`probity-shadow-report` flags unlabelled verdicts**: how many, and
    how to label them.
- **Still manual.** A rule that asks the judge a second, different
  question has to label that call with `withJudgeTask`. Nothing detects
  a missing one.

## 0.4.50

`probity-shadow-report` breaks each candidate judge down by judging task,
with bounded rates, so it can show that a cheaper judge is good enough
for one rule and not another.

- **What was missing.** A judge sees only a prompt, never the rule that
  asked, so the shadow log could only compare a candidate across all
  rules at once. A plain tally also hid how little a small sample says:
  zero leaks in 20 verdicts is not evidence of a safe judge.
- **Now:**
  - **Every preset runs its rules labelled with their judging task**
    (`withJudgeTasks`, `rules/judge-task.ts`): the innermost name of the
    rule's wrapper chain, e.g. `enforceTdd`. Rule names in Probity's trace
    are unchanged. `withExtractionUnderGreen`'s own judge call is
    `extractionUnderGreen`. Rules added outside a preset can be wrapped in
    `withJudgeTasks([...])`.
  - **`shadowJudge` logs each verdict's `task`.**
  - **The report** gives leaks as a share of the primary's denials and
    friction as a share of its passes, each with its one-sided 95%
    Clopper-Pearson upper bound (`rateUpperBound`), adds a table by task,
    and names the task of each listed disagreement.

## 0.4.49

The Claude judge runs the Claude Code installed on the machine, not the
copy bundled with Probity's Agent SDK.

- **What was wrong.** Probity's Claude judge starts the `claude` binary
  bundled with the Agent SDK version Probity pins (0.3.204 with Probity
  1.10). That binary's defaults decide the judge's model, so verdicts
  ran on `claude-opus-4-8` while the user's own Claude Code had moved
  on, and they would shift again whenever a Probity upgrade bumped the
  SDK.
- **Now:**
  - **`claudeJudge()` runs the installed Claude Code**: the binary
    running the current session (`CLAUDE_CODE_EXECPATH`, which hooks
    inherit), else the first `claude` on `PATH`, else the bundled copy.
    `executable: 'installed' | 'bundled' | <path>` overrides it;
    `'installed'` reports the judge unavailable when there is none, so a
    `judgeChain` moves on. `installedClaude()` is exported.
  - **The config templates set `ai: claudeJudge()`.** Without an `ai`,
    Probity uses its own judge, which always runs the bundled copy.
    `/probity-update` proposes the line for configs that set none.

## 0.4.48

`shadowJudge` measures a candidate judge, such as a cheaper model, on a
project's real traffic, and `probity-shadow-report` scores it.

- **What was missing.** To decide whether a cheaper judge is good
  enough, you need its verdicts on the prompts your rules actually send.
  Probity's `--debug` trace records verdicts but not prompts, so they
  could not be replayed on another model.
- **Now:**
  - **`shadowJudge(primary, candidates, { log })`** asks the primary and
    every candidate the same prompt in parallel, returns the primary's
    verdict, and appends the prompt and all verdicts (with per-model
    token use) to a JSONL log. A candidate that fails, hangs past
    `candidateTimeoutMs` (default 60 s) or can't be logged never changes
    or blocks the verdict. `includePrompt: false` keeps only a hash.
  - **`probity-shadow-report <log> [--show leaks|friction|all]`** prints
    agreement per candidate, splitting disagreements into leaks (it
    passed what the primary denied) and friction (it denied what the
    primary passed), with latency and tokens per model.
- **Cost while measuring.** Each candidate adds its own spend, and a
  write waits for the slowest candidate up to the timeout.

## 0.4.47

`claudeJudge({ model })` picks the Claude model the judge runs on.

- **What was missing.** Probity's Claude judge names no model, so every
  verdict ran on the Agent SDK's default. A config could not choose a
  cheaper model, or pin one so verdicts don't change when the default
  does.
- **Now:** `claudeJudge({ model: 'claude-haiku-5-5' })` runs each verdict
  on that model and keeps Probity's other judge settings (one turn, no
  tools, no thinking). It works in a `judgeChain` or as `ai` on its own.
  With a model, the judge is named `claude:<model>`, so `judgeChain`
  tracks its availability apart from the default judge. Without one,
  nothing changes.

## 0.4.46

Commits pass again after a green run, and an issue body that mentions a
commit is no longer gated (#138).

- **What was wrong.** Claude Code now writes `api-request-blob` entries
  to the session transcript. Each records an assistant message a second
  time, after that call's tool_result, with the same tool_use id. Probity
  reads every tool_use as a new call, so each run appeared twice in
  history, the second time with empty output. `requireGreenTestRun`
  judged that empty copy as the last test run and denied every commit,
  however green the run was. Rules that read history, the TDD judge
  included, saw each call twice.
- **Now:**
  - **`probity-claude` drops request blobs.** When the transcript has
    any, Probity gets a private copy without them (after taking the tail
    of an oversized transcript), deleted when Probity exits. Projects
    hooked through the bare `probity` bin still see the duplicates.
  - **A substitution counts only if its own command commits.** A body
    passed as `--body "$(cat <<'EOF' … EOF)"` that mentions `git commit`
    is data again, and so are backticks inside single quotes, which the
    shell never runs. `"$(git commit …)"`, backticks inside double
    quotes, and a substitution in an unquoted heredoc still count.
  - **A red-run deny names the run it judged**, shortened to 200
    characters: ``Judged run: `./gradlew check …` ``.
- **Ruled out.** The failure pattern never read command text, so a
  `grep -E "BUILD|FAILED"` filter in the command does not make a run red.

## 0.4.45

A red test denied as retrofitting now names the restart-the-cycle path
(#136).

- **What was missing.** A Kotlin/Native iOS test expected
  `NotSetUp(NotSignedIn)`. After the production change it failed with
  `ProtectedStoreUnavailable`: the simulator test host has no Keychain,
  so the expectation was wrong about the environment, not the code.
  Correcting it was denied as retrofitting, even though the correction
  was exact and would still fail against the old code. The denial gave
  no way forward, so the agent had to ask the owner.
- **Now:**
  - **The denial names the route.** A test-source write the TDD judge
    denies as retrofitting gets a note: revert the production change
    and the test, write the test again with the corrected expectation,
    watch it fail against the unchanged code, then reapply the change.
    The re-added test is a new test, so it is its own red step.
  - **No misleading markers.** A retrofit denial no longer also carries
    the characterization note or the mutation-probe note. Both offered a
    way past the judge that would pin what the code now does.
  - **The test-driven-development skill** describes the same restart in
    its green step.
- **Decision to check.** The judge still denies the correction itself.
  The proposed test, that the correction is no looser and would still
  fail against the old code, also passes an ordinary retrofit: a buggy
  green whose wrong value is copied into the test. Whether a failure
  comes from the environment or from the code isn't something the
  session shows reliably, while the restart costs one cycle and leaves
  an observed red.

## 0.4.44

A deliberate break that the TDD judge denies now names the
mutation-probe marker (#134).

- **What was missing.** A sabotage check, breaking a test-support stub
  to watch an app-tier scenario fail, was denied as a behaviour change
  under green. The stub lived in a `src/main` source set of a module
  used only by tests, so the judge treated it as production code. The
  denial gave no route, and the same edit was allowed in another
  harness, because the judge saw a different session.
- **Now:**
  - **The denial names the route.** A TDD denial for an untested change
    (no red, never observed failing, under green) gets a note: if the
    write is a deliberate break, in production code or in a stub or
    fake, mark it `// probity: mutation-probe`, watch the tests fail,
    then revert. Other denials are unchanged.
  - **The marked write is deterministic.** It passes with no model call
    in every harness, and the commit gate keeps commits blocked until
    the file is reverted.
- **Decision to check.** There is no option to declare a `src/main`
  module test-only. Treating the stub as test code would leave a
  sabotage to the judge's reading of the session. It would also skip
  the probe round-trip, which is what guarantees the stub is restored.
  Stubs keep their TDD coverage, with a scenario's red authorizing new
  stub behaviour.

## 0.4.43

A dependency's checked coverage replaces unchecked "covered by the SDK"
exclusions (#114).

- **What was missing.** An app built on an SDK that consumes the same
  specs could only exclude SDK-internal scenarios with a reason naming
  the SDK. Nothing checked the reason, so a later SDK that stopped
  covering a scenario, or a scenario whose steps changed, stayed green.
- **Now:**
  - **The SDK writes its claims.** `spec-parity.mjs --write-claims
    <file> [--claims-source <text>]` writes every scenario a finished
    test claims, one line each, pinned to a hash of the scenario's
    steps (`@id:<slug> sha=<hash>`, or the title form).
  - **The app checks them.** It commits the file and passes it as
    `dependencyClaimsPaths` (gate and presets) or `--dependency-claims`
    (CLI, repeatable). A claim covers a scenario the app has no
    finished test for while the steps still hash the same.
  - **Changed steps void a claim**, and the uncovered scenario is
    reported with the claim's source. A reworded title keeps an id
    claim.
  - **Scope floors:** a dependency claim meets `defaultScopes`, never a
    scope tagged on the scenario.
  - **Stale entries:** an exclusion or wip line for a dependency-covered
    scenario is stale.
  - **Reporting:** claims for scenarios the app's specs don't have are
    ignored. The CLI lists dependency coverage with its source. A commit
    that changes a claim file runs the gate.
- **Decisions to check:**
  - **The claim list is committed in the app**, offline and reviewable,
    not read from a build cache.
  - **Exclusions stay separate** rather than turning into claims.
  - **Spec mismatches:** the hash is of the scenario's steps only, so a
    different spec revision on either side shows up as a void claim
    rather than silently passing.

## 0.4.42

Claims from live (opt-in) tests are visible as weaker coverage (#112).

- **What was missing.** A scenario whose only claim is a live test,
  which CI skips unless an environment variable is set, looked exactly
  as well covered as one exercised on every build.
- **Now:**
  - **`liveTestPattern`** (CLI `--live <regex>`) marks live test files
    by path. Their claims still count as coverage.
  - **The CLI reports live-only coverage** as its own group: a count in
    the summary line, then the list.
  - **`liveFloorScopes`** (CLI `--live-floor a,b`, which needs `--live`
    and declared scopes) requires a claim from a test that isn't live on
    scenarios tagged with those scopes. The gate and the CLI both
    enforce it.
  - **Exclusions:** a live claim on an excluded scenario makes the
    exclusion stale, as any claim does.
  - **Presets:** KMP, Swift and JS pass both options through to the
    gate.
- **Decisions to check:**
  - **Path-based, not a `Covers (live):` marker.** Live tests usually
    sit in their own source set or naming scheme, and a pattern leaves
    every tool that parses `Covers:` untouched.
  - **Reported, not blocking,** unless a floor is configured.

## 0.4.41

Mechanical checks for two of the acceptance-testing skill's tier rules
(#129).

- **What was missing.** The tier rules added in 0.4.38 were skill text
  only. A feature file could reach an external system with no app-tier
  scenario, and a scenario whose outcome the wire decides could sit at
  the component tier, without anything saying so.
- **Walking skeleton (CLI):** `spec-parity.mjs --app-scope <name>` (a
  declared `--scope`) lists every feature file that has scenarios
  needing proof (not wip, excluded or baselined) but no finished claim
  at that scope.
  - **Warning by default.** The exit code doesn't change, because not
    every feature file reaches an external system, and the commit gate
    can't warn (a pass reason only reaches the trace).
  - **`--strict-skeleton`** makes a missing skeleton, or a stale
    exemption, fail (exit 1) for CI.
  - **`--skeleton-exempt <file>`** lists feature files that reach no
    external system, one `<spec>.feature # <reason>` per line with the
    reason required. A line for a feature with an app-scope claim, or
    for no feature, is stale.
- **Tier check (fidelity judge):** `enforceScenarioFidelity({ appScope
  })`, and the KMP, Swift and JS preset option `appScope`, add the tier
  rules to the same judge call, at no extra model cost. The judge
  reports an untagged scenario whose own text shows the wire, wiring or a
  platform service decides its outcome. It never reports a tagged
  scenario as over-tiered, because walking skeletons and escaped-defect
  scenarios are app-tier for reasons the text can't show.

## 0.4.40

An opt-in judged check that the acceptance DSL keeps tests isolated, and
the course's remaining isolation advice in the skill (#119, items 2, 3
and 5).

- **What was missing.** Nothing checked functional or temporal
  isolation. A DSL could pass a test's names straight to a shared SUT,
  program stubs with raw names, write to a shared fixture, or clean up
  after itself, and only the skill text said otherwise.
- **Now:** `enforceTestIsolation({ instructions? })` in
  `rules/acceptance-language.ts` judges DSL writes that add code. It
  denies an unaliased entity, a stub keyed on a raw name, a shared
  writable fixture, and clean-up of test data. Closing driver resources
  is fine, and a DSL that builds a fresh SUT per test passes the
  aliasing and clean-up checks. The prompt carries the file's first 30
  lines and the changed lines with context rather than the whole file,
  and a write that adds no code (only removals, comments or imports) is
  not judged. Every preset takes `dslIsolationGlobs`, off by default.
- **Skill (acceptance-testing):**
  - **DSL:** defaults on every call, and a DSL organised by concept.
  - **Drivers:** failure messages in domain language.
  - **Aliasing:** a reference alias and sequence helper, with stubs keyed
    on aliased ids.
  - **Data and retries:** synthetic data only, and no automatic retries.
  - Matching red flags, a new rationalization row, and a checklist item.

## 0.4.39

A judged rule checks that a `Covers:`-tagged test says what its scenario
says (#120).

- **What was missing.** `enforceSpecTestParity` and
  `requireSpecBackedAcceptanceTest` check that a test's `Covers:` tag
  resolves, and the Language Test judges each side's wording. Nothing
  compared the two sides, so a test could claim a scenario while setting
  up a different precondition or asserting a different outcome, and
  parity stayed green.
- **Now:** `enforceScenarioFidelity({ specsDir, testRoots?,
  testFilePattern?, instructions? })` in `rules/scenario-fidelity.ts`.
  On a test write, it sends each claimed test the write adds or changes
  to the judge, beside the text of the scenario it claims (by title or
  `@id`). The judge reads the test through its DSL and denies a
  different Given, When or Then, or an outcome the scenario doesn't
  state. On a spec write, it judges each changed scenario against the
  tests that already claim it. A test that delegates to a shared body in
  a sibling `*Scenarios.*` file is judged with that file.
- **How far a test reaches.** A test runs from its tag to where its
  braces close. A test with no braces (a Kotlin expression body, a JS
  arrow) runs while its lines end mid-expression or the next line is
  indented deeper, so a wrapped chained call is read in full.
- **Cost:** no model call for a write that changes no claim, for a claim
  that resolves to no scenario (the parity rules report it), or for a
  test whose body matches another test already claiming the same
  scenario (a second driver).
- **Presets:** KMP and Swift wire it by default on their acceptance tests
  and specs. JS wires it once `specsDir` is set. `scenarioFidelity:
  false` turns it off. It is wrapped in the presets' usual judge-failure
  diagnostics and contradiction retry.
- **Supporting changes.** `rules/spec-test-parity.ts` exports
  `findTestFiles`, `OWNER_DECLARATION`, `COMMENT_OR_ANNOTATION_LINE` and
  `DEFAULT_TEST_FILE_PATTERN`, and records each scenario's heading line.
  The workflow eval tells the new judge apart from the language
  validator, and asserts it stays silent when a second driver test
  leaves the claimed test unchanged.

## 0.4.38

The acceptance suite must exercise the whole deployable unit, with rules
for which scenarios prove it (#118). Docs and examples only; no rule
behavior changes.

- **What was wrong.** The acceptance-testing skill offered a view-model
  driver that fakes at the use-case ports as the default driver set, and
  the KMP preset's scope example made `view-model` the default scope. A
  suite like that decides releasability without ever running the
  adapters, the wire or the composition root.
- **Now:**
  - **Two tiers.** The skill names an **app tier**: a driver that builds
    the app through the composition entry point the app ships with and
    fakes only outbound ports. The presentation-only rung becomes the
    **component tier**, where most scenarios live. A suite of
    component-tier scenarios alone is never releasable.
  - **Tier rules.** A scenario goes to the app tier when the wire,
    wiring or a platform service decides its outcome, as the walking
    skeleton of a feature that reaches an external system, or after an
    escaped defect. Everything else stays at the component tier, and
    each scenario is claimed at one tier.
  - **Preset example.** The KMP scope example declares `component`,
    `app` and `system` scopes, tags app-tier scenarios `[app]`, and sets
    no `defaultScopes`.
- **Adopting it.** Scopes stay opt-in: no preset sets `driverScopes`, so
  existing parity results don't change. A consuming project declares the
  scopes and tags its app-tier scenarios.

## 0.4.37

The Kotlin, KMP and JS/TS presets screen the acceptance suite for new
fixed waits, as the Swift preset already did (#119, item 1).

- **What was missing.** Only the Swift preset blocked sleeps in
  acceptance code. A Kotlin or JS/TS driver or DSL could add
  `Thread.sleep(500)` or `page.waitForTimeout(1000)` without anything
  stopping it, and the acceptance-language judge mentions sleeps only
  in spec files.
- **Now:** `forbidNewFixedWaits({ patterns })` in `rules/gates.ts`
  blocks a write that adds a fixed wait, and names it. The deny points
  the agent at polling for the concluding event through the suite's
  one poll helper, or at advancing a test clock. Kotlin patterns
  (`KOTLIN_FIXED_WAIT_PATTERNS`): `Thread.sleep`, `TimeUnit.*.sleep`,
  `SystemClock.sleep`, `delay(`. JS/TS patterns
  (`JS_FIXED_WAIT_PATTERNS`): `waitForTimeout`, `setTimeout`, numeric
  `cy.wait`, `sleep(`, `browser.pause`. The rule is delta-based, so
  waits already in a file don't block edits to it, and waits named in
  comments don't count. The presets wire it on `fixedWaitGlobs`
  (default `['**/acceptance/**']`, so DSL and driver files are
  covered too). Exempt the poll helper with a `!` glob, or pass `[]`
  to turn the screen off. The JS preset wires it by default, unlike
  its opt-in parity rules: a project with no `acceptance/` directory
  sees no change.

## 0.4.36

The commit gates recognise a commit by what a command runs, not by the
words it contains (#121).

- **What was wrong.** Every commit gate tested the raw command text for
  `git … commit`, so a command that only wrote a Markdown file whose
  text mentioned a commit (a heredoc to `cat`, an issue body for `gh`, a
  `grep` pattern) was treated as one, and `requireGreenTestRun` blocked
  it. The regex also missed `git --no-pager commit`.
- **Now:** `isGitCommit` parses the command with the shell-write
  screen's parser. A command is a commit when `git` runs with `commit` as
  its subcommand, after any global options, or when the words reach a
  command that might execute them: a shell, `eval`, `xargs`,
  `find -exec`, an interpreter, a pipeline into one, or a `$(…)`/backtick
  substitution the shell expands (including in an unquoted heredoc).
  Data commands (`cat`, `echo`, `printf`, `tee`, `gh`, `glab`, `grep`,
  `rg`, …) don't count. An unknown command still counts, so the gates
  fail closed. `requireGreenTestRun`, `enforceSpecTestParity`,
  `enforceProbeReversion` and `enforceCharacterizationResolution` all
  use it. `GIT_COMMIT` now also accepts any global option before
  `commit`.

## 0.4.35

In-progress acceptance tests are committed expected-to-fail (#115).

- **What was missing.** A spec that drives a feature fails until the
  feature works, and `requireGreenTestRun` blocks any commit after a red
  run. `@Ignore` sends the write to the judge as a disabling control, and
  parity left "keeping in-progress specs out of the pipeline" to a
  pipeline nothing configured. So the spec, DSL, driver and code landed in
  one green commit, the opposite of committing in small steps.
- **Now:**
  - A test carrying an **expected-to-fail marker** passes only while its
    scenario fails: `= inProgress {` (a project-owned Kotlin helper; the
    acceptance-testing skill gives it), Jest `test.failing`, Vitest
    `test.fails`, Swift Testing `withKnownIssue`, XCTest
    `XCTExpectFailure`. The build stays green; the green gate is
    unchanged.
  - **Parity** (`inProgressPattern`, CLI `--in-progress`; default
    `DEFAULT_IN_PROGRESS_PATTERN`; presets pass `inProgressPattern`): a
    `Covers:` tag belongs to the test it sits on or inside, and a claim
    from a marked test is in progress. It is not coverage, so a scenario
    claimed only in progress must be wip, or the gate blocks.
  - **Behaviour change:** a wip scenario a finished test claims now
    blocks as promoted for the spec's own `@wip`/`(wip)` marker too (under
    `sharedWip: 'honor'`), not only for wip-file lines. Remove the marker
    in the change that finishes the test.
  - Scope checks count finished claims only; dangling tags and exclusion
    contradictions count every claim.
  - The Kotlin, Swift and JS **TDD judges** are told that an
    expected-to-fail test's green run is no evidence and no red, that
    adding a new one is allowed, that removing the marker makes it an
    ordinary test, and that adding the marker to an existing test disables
    it.

## 0.4.34

Work in progress is per project for a shared spec repository (#111).
Opt-in: nothing changes until a project adds a wip file or sets
`sharedWip: 'ignore'`.

- **What was missing.** `@wip` lives in the spec file. In a spec
  repository shared by several consumers, the first consumer to automate
  a scenario drops `@wip` for everyone, and no consumer can mark a
  scenario in progress, or blocked on a missing seam, for itself only.
  The agent can't edit the shared spec either, so the stop-and-ask
  protocol had nowhere to record the block.
- **Now:**
  - **wip file** (`wipPath`, CLI `--wip`; KMP and Swift default
    `docs/spec-wip.txt`, JS `parityWipPath` with no default): same line
    format as exclusions (`<spec>.feature :: <title> # <note>` or
    `@id:<slug> # <note>`), note required. Listed scenarios are exempt
    like `@wip` ones, skip scope checks, are left out by
    `--write-baseline`, and are listed with their notes by the CLI.
  - **`sharedWip: 'honor' | 'ignore'`** (`--shared-wip`): `ignore` makes
    the specs' own `@wip`/`@planned`/`(wip)` markers informational.
    Default `honor`, today's behaviour.
  - **Kept apart from the other lists:** a wip line for a claimed
    scenario (promoted: delete it), an excluded one, a baselined one, or
    none fails. The baseline is now documented as a snapshot from
    adoption that only shrinks; that is a convention, not enforced.
  - A commit changing only the wip file runs the gate.
  - The stop-and-ask protocol (`hooks/PROBITY.md`, acceptance-testing
    skill) says where the record goes in a shared repository.

## 0.4.33

Scenarios can carry a stable id, so a shared spec repository can reword
a title without breaking every consumer's references (#106). Opt-in per
scenario; title references keep working.

- **What was missing.** Scenario keys were titles. With one consumer, a
  rename is one guided change. With a spec repository shared by several
  projects (#105), rewording a title in the shared repository broke every
  consumer's `Covers:` tags, baseline lines and exclusions at their next
  submodule bump, and nothing in the shared repository could see them.
- **Now:**
  - **Declaring an id:** a Gherkin `@id:<slug>` tag, or `id:<slug>` in
    the Markdown bracket list (`## Scenario [system, id:<slug>]: …`).
    Optional, unique across the specs directory, one per scenario;
    duplicates and double ids fail the commit gate and the CLI (exit 2).
    An id is never a driver scope.
  - **Citing an id:** `// Covers: @id:<slug>`, a baseline line
    `@id:<slug>`, an exclusion line `@id:<slug> # <reason>`. An unknown
    id is dangling, like a stale title. `--write-baseline` writes the id
    form for scenarios that have one.
  - **Write-time rules:** `requireSpecBackedAcceptanceTest` accepts a
    `Covers:` tag by id. `surfaceScenarioLinkBreakage` passes a reworded
    title claimed only by id, blocks dropping an id tests still cite, and
    with its new optional `specsDir` (the KMP, Swift and JS presets pass
    it) lets an id move to another spec file.
- **Not done** (from the issue): ids are written by hand, not generated;
  they are not mandatory for shared repositories; retired ids are not
  tracked, so reuse is not detected. The rename-detection fallback was
  only needed if ids were rejected.

## 0.4.32

Spec parity supports a spec repository shared by several consumers
(#105). Opt-in: nothing changes until a project adds an exclusions file
or `ignoreTags`.

- **What was missing.** mysudo-core-sdk reads its scenarios from a
  shared Gherkin repository (a `specs` submodule), and more consumers
  are coming. Parity required every scenario without `@wip`/`@planned`.
  "A blocked number cannot reach the owner" (mysudo-core #241) is
  enforced by the backend, so no client should be forced to automate it,
  but it could only stay `@planned`, which is inaccurate. The baseline
  was the wrong place for it (it is debt meant to empty), and a shared
  tag such as `@service` failed every consumer that didn't declare it
  as a driver scope.
- **Now:**
  - **Exclusions file** (`exclusionsPath` on `enforceSpecTestParity`,
    `--exclusions` on the CLI): one `<spec>.feature :: <title> #
    <reason>` per line, reason required. Excluded scenarios skip the
    orphan and scope checks; the CLI lists them with their reasons.
    A malformed line, an exclusion matching no scenario, one for a
    scenario a test now claims, and one for a baselined scenario all
    fail. `--write-baseline` leaves excluded scenarios out.
  - **`ignoreTags`** (`--ignore-tags`): shared tags that are not driver
    scopes here. Unlisted unknown tags still fail. A tag that is both a
    declared scope and ignored, or `wip`/`planned`, fails as a
    contradiction.
  - **Presets:** KMP and Swift take `exclusionsPath` (default
    `docs/spec-exclusions.txt`) and `ignoreTags`; JS takes
    `parityExclusionsPath` (no default) and `ignoreTags`.
  - A commit that changes only the exclusions file runs the gate.
- **Differs from the #105 plan:** the plan said a stale exclusion (now
  claimed, or still baselined) would be reported. The commit gate has
  no warning channel (a passing rule's reason reaches only the trace),
  so both fail instead, in the gate and the CLI alike.

## 0.4.31

The spec-parity commit gate now runs when a commit changes only a
baseline file outside the specs directory (#107).

- **What was missing.** `enforceSpecTestParity` ran only for commits
  recording the specs path or an acceptance-test path. A baseline inside
  `docs/specs` (the KMP default) was covered by that, but one elsewhere
  was not: the JS preset's `parityBaselinePath` has no default, and a
  project consuming a shared spec repository as a submodule should keep
  its baseline outside the shared tree (#105). Deleting a baseline line
  for a scenario that still had no claiming test committed cleanly, and
  the failure surfaced later on an unrelated specs or acceptance-test
  commit.
- **Now:** a commit recording the configured `baselinePath` runs the
  gate. The CLI (`probity-spec-parity`) has no commit scoping and is
  unchanged.

## 0.4.30

Vendor adapters whose success path only a live session can exercise can
now land (#102). They are held to forwarding-only instead of the TDD
gate. Opt-in.

- **What was missing.** mysudo-core #195 puts Twilio Voice and Video
  behind small ports (`RoomEvents`/`RoomConnection`,
  `PhoneEvents`/`PhoneConnection`). The decisions are plain Kotlin,
  driven by 22 host tests, and device tests cover Twilio rejecting a bad
  token. The rest of `TwilioConnectors.kt` is forwarding:
  `onConnected` → `events.joined(…)`, `leave()` → `room.disconnect()`,
  invites held for `accept`/`reject`. Those callbacks fire only during a
  live call with a valid token or a real push, so no offline test can go
  red on them, and the TDD gate denied every line. The only ways out
  were a forbidden workaround or leaving the success path as `TODO()`.
- **Now:**
  - **`vendorAdapterGlobs`** (KMP, Kotlin and Swift presets, no default)
    takes the named files out of the TDD block. A new block, listed
    before the TDD block, holds them to `enforceForwardingOnlyAdapter`.
  - **`enforceForwardingOnlyAdapter`** (`rules/ports-and-adapters.ts`)
    is an AI judge of what a write adds:
    - **Passes:** one-to-one forwarding between the SDK and a port;
      reading what vendor objects hold (ids, error codes, a plain enum
      mapping, the size of the room's participant list); holding and
      releasing the vendor objects the forwarding needs; listeners;
      wiring; boundary telemetry.
    - **Blocks:** a decision, state beyond the held vendor objects,
      policy (retries, backoff, de-duplication, sequencing), or
      computation the adapter works out itself. The deny says to move
      it behind the port, where a host test drives it red first.
  - Adapter observability and the shell-write screen still cover these
    files.
  - `presets/vendor-adapter.ts` builds the block for all three presets.
- **Measured** on the real `TwilioConnectors.kt` from #195 (its
  `TODO()` stubs on disk), through the KMP preset's new block, 5 runs
  per case. 70/70 correct:

  | Case | Expect | Kiro judge (mysudo-core's) | Claude judge (default) |
  |---|---|---|---|
  | Room listener stubs filled with forwarding, `leave()` → `disconnect()` | allow | 5/5 | 5/5 |
  | Voice: `handleMessage`, invites held by call SID, `accept`/`reject`, call listener | allow | 5/5 | 5/5 |
  | The Room forwarding plus boundary telemetry | allow | 5/5 | 5/5 |
  | Reconnect retry with backoff on a dropped signalling connection | deny | 0/5 | 0/5 |
  | Participant set, de-duplication, and leaving once the room is empty | deny | 0/5 | 0/5 |
  | Treating Twilio's token-expired code as a clean end | deny | 0/5 | 0/5 |
  | An expiry timer that rejects invites older than 30 s | deny | 0/5 | 0/5 |

  The first prompt listed "aggregates" under computation, and the Claude
  judge then denied passing `room.remoteParticipants.size` as the port's
  `remaining` count. The final wording counts reading vendor state as
  reading. The table is the final wording.
- **Action needed:** none until you set `vendorAdapterGlobs`. Name only
  the vendor-facing files; keep tests out. See hooks/PROBITY.md, "Vendor
  adapters only a live session can exercise".
- New exports: `enforceForwardingOnlyAdapter`
  (`rules/ports-and-adapters`), and `vendorAdapterBlock` and
  `vendorAdapterExclusions` (`presets/vendor-adapter`).
## 0.4.29

The shell-write screen now judges a write into a worktree that the same
command creates (#101).

- **What was missing.** In mysudo-core, one Bash call created a worktree
  and copied a `.feature` file into its `specs` submodule:
  `git worktree add -b … ../mysudo-core-sdk-198 origin/main; cd
  ../mysudo-core-sdk-198 && git submodule update --init specs; cd specs &&
  … && cp …/keeping-up-to-date.feature features/devices/…`. It was allowed
  with no judgment.
  - The issue suspected the submodule. A replay showed it wasn't the
    cause: writes in a submodule, from either checkout and from a session
    opened inside the submodule, were already denied.
  - The cause was the new worktree. When the hook ran it didn't exist yet,
    so `probity-claude` couldn't route the write to it (#92). The main
    checkout's screen then skipped a path outside its root.
- **Now:** the screen reads `git [-C <dir>] worktree add [options] <path>`
  and treats a path under `<path>` as a path in a checkout of the same
  repository: it's judged against this config's scopes, relative to the
  new worktree's root. The issue's command is denied, naming
  `specs/features/devices/keeping-up-to-date.feature`.
  `git worktree list` and `remove` create nothing and change nothing.
- **Action needed:** none.

## 0.4.28

`judgeChain` now remembers an unavailable judge across hook runs (#87),
so a hanging kiro-cli no longer costs every write the full timeout.

- **What was missing.** `judgeChain` (0.4.20) skipped a judge found
  unavailable for `skipUnavailableMs` (5 minutes), but only in memory.
  Probity starts a new process for every tool call, so the skip lasted
  one hook run. When kiro-cli hung instead of failing fast, each write
  waited `kiroJudge`'s full `timeoutMs` (60 s) before the Claude fallback
  answered.
- **Now:**
  - `kiroJudge()` and `claudeJudge()` carry a `name` (`kiro`, `claude`;
    new type `NamedJudge`).
  - `judgeChain` keeps a named judge's "unavailable until" time in a
    state file, `<tmpdir>/probity-kiro-judge/judge-chain.json` by
    default, beside the Kiro judge's working directory. The next hook
    run reads it and skips that judge until the time is up. An answer
    from the judge (any real verdict) clears its entry.
  - The file is keyed by judge name, so it's shared across projects on
    the machine: a Kiro outage is machine-wide.
  - The last judge in a chain is still always asked, so a single-judge
    config retries every time.
  - New option `stateFile`: a path, or `false` to keep the skip in
    memory as before. Unnamed judges are only remembered in memory.
  - A state file that can't be read or written only loses the memory;
    it never blocks a verdict.
- **Fallbacks are visible (#86).** A verdict that came from a later judge
  carries `meta.fallbackFrom` in the `--debug` trace: each earlier judge,
  and why it didn't answer ("Kiro judge unavailable: no answer within
  60000 ms", or "skipped: unavailable earlier").
- **Nested Kiro judge checked (#86).** A write in a live Kiro session
  (Kiro → shim → Probity → `kiro-cli` judge, config
  `judgeChain([kiroJudge(), claudeJudge()])`) is judged by Kiro.
  - In 7 headless Kiro sessions, 13 of 14 verdicts came from Kiro.
  - Latency was 8 to 32.5 s: boundary median 8.9 s, TDD median 25.4 s.
    Standalone, 0.4.20 measured a 15 s median and a 42 s worst case.
  - The nested judge inherits the parent session's environment
    (`KIRO_SESSION_ID`, `KIRO_CLI_ACP_CLIENT_NAME`, `Q_SET_PARENT_CHECK`)
    and answered regardless. A direct `kiro-cli` call from inside the
    hook answered in 7 s.
  - The one miss was the first verdict of the first session: Kiro timed
    out at 60 s and Claude answered. Its cause wasn't recorded, which is
    what `fallbackFrom` now fixes.
- **Action needed:** none.
## 0.4.27

The Swift preset can now keep SwiftUI views thin (#77), in an app with
its core in the same repo or in a UI-only app on a core package or
framework. Opt-in. `swiftRuleEntries` also takes its main code globs as
options.

- **What was missing.** #72 and #76 wired `enforceThinDrivingAdapter`
  and `forbidNewDomainDiscriminantChecks` for JS, Kotlin and KMP. In a
  Swift project, a SwiftUI view could grow permission checks,
  multi-port handlers or copied domain rules, and only the TDD judge
  saw it. `swiftRuleEntries` had hard-coded paths and no option for it.
- **Now:**
  - **Options with today's paths as defaults:** `tddGlobs`,
    `coreGlobs` (the ports-boundary judge) and `adapterGlobs` (boundary
    observability). Existing configs see no change.
  - **`drivingAdapterGlobs`, off unless set.** When set, the block runs
    before the TDD judge. Views inside `coreGlobs` (a module folder with
    views and view models) move to it and out of the ports-boundary
    judge, so a view write costs one AI call there, not two. View models
    (`ObservableObject`, `@Observable`) stay core, as presenters.
  - **`domainDiscriminants`** with Swift patterns: `viewer.role ==
    .superUser` or `Role.manager != viewer.role`, string literals,
    `switch viewer.role`, and `if`/`guard`/`while case .draft =
    timesheet.status`. Look-alikes (`roleName == .x`, `let role: Role =
    .x`, `viewer.role == other.role`, `role != nil`) don't match.
  - **Core exports:** `coreExportsInJudge` reads `coreGlobs` Swift
    source with `swiftExportedNames`. Swift's default visibility is
    `internal`, so it lists whatever isn't `private`/`fileprivate`:
    top-level types, functions and constants, plus member and extension
    functions and extension properties as `Type.name`. Views are left
    out of the list.
  - **`coreApiPaths`** for a UI-only app: `.swiftinterface` files or
    directories holding them (an XCFramework), read by
    `readSwiftInterface` as `Owner: members` lines. Enum cases are kept;
    initializers, operators and generated members are dropped.
    `.private` and `.package` interfaces are skipped.
  - **`SWIFT_DRIVING_ADAPTER_ADDENDUM`**: layout, modifiers, `@State`,
    `@Binding`, `@FocusState`, `@Environment`, a `.task {}` starting one
    load, navigation and sheets, and previews are view state or wiring;
    one view-model intent or use case per user action is the pattern.
  - `drivingAdapterBlock` takes `excludeCore: false`, for a preset that
    takes its views out of the core block instead.
- **Measured** with Probity's default Claude judge on SwiftUI versions
  of the #72 cases, through the Swift preset's driving-adapter block
  with `coreExportsInJudge: true`. 5 runs per case, 40/40 correct.
  - Blocked: a view running the whole submit use case (save, notify,
    "a failed notification never fails the submit"); a
    `role == .superUser || role == .manager` check beside an exported
    `Viewer.canApprove`; a copied display-name rule beside the exported
    `Viewer.displayName`; a framework-free bulk-approve use case filed
    under `Views/`.
  - Allowed: a pure render change; calling `canApprove(_:)`; one
    view-model intent; `@State` with a sheet.
  - The role-check deny named `Viewer.canApprove` from the core export
    list. With `domainDiscriminants: ['role']`, the free screen blocks
    that case before any AI call (unit-tested).
- Starting globs for both layouts are in hooks/PROBITY.md, "Driving
  adapters by project layout"; the Swift template shows them commented.
- New exports (`rules/swift`): `swiftExportedNames`, `SWIFT_EXPORTS`,
  `readSwiftInterface`, `SWIFT_INTERFACE`,
  `swiftDomainDiscriminantPatterns`, `SWIFT_DRIVING_ADAPTER_ADDENDUM`.
## 0.4.26

The Swift preset's TDD judge gets the #80 rules (#85, Swift half). It no
longer blocks a new protocol method a failing test needs, stops repeating
a fix that was already tried, and lets a red test be tightened.

- **What was missing.** 0.4.18 added three rules to the Kotlin/KMP TDD
  addendum. The Swift preset ran Probity's plain `enforceTdd()`, with no
  addendum, so a Swift project hit the same #80 failure. A replica of
  the #145 session in Swift (a gateway protocol that reads one Sudo at a
  time, a test expecting another Sudo's messages offline) reproduced the
  0.4.17 denial nearly word for word: "Adding changes(since:) to the
  protocol plus the MessageChanges type and cursor is new port surface no
  assertion requires."
- **Now:** `enforceSwiftTdd()` (`internal/swift-tdd.ts`) is `enforceTdd()`
  with `SWIFT_TDD_ADDENDUM`, used by the Swift preset:
  - **A port method can be the minimal green.** When no existing protocol
    requirement can deliver the data a test asserts, adding the one that
    can, its result type and the fake's implementation is the minimal
    green. The code behind it stays held to the test's assertions.
  - **A tried route is ruled out.**
  - **Tightening a red test is part of the red step; weakening it is
    denied.** The Swift wording adds what the replica needed: the added
    assertion may name a fake or port member that doesn't exist yet, and
    the compile failure that follows doesn't replace the earlier
    assertion failure as the red.
- **Measured** with Probity's default Claude judge, wired as the Swift
  preset wires it, on the Swift replica: files on disk, a hand-written
  transcript of `xcodebuild test` runs. 5 runs per case, allowed counts,
  0.4.24 → 0.4.26:

  | Case | Expect | Allowed |
  |---|---|---|
  | `changes()` after the proposed store merge was tried (the reported write) | allow | 0/5 → 5/5 |
  | `changes()` straight after the first red | allow | 0/5 → 5/5 |
  | the gateway-call assertion added to the still-red test | allow | 3/5 → 5/5 |
  | `changes()` after the tightened test ran red | allow | 0/5 → 5/5 |
  | the minimal use case after the port and fake exist | allow | 5/5 → 5/5 |
  | `changes()` with no failing test, after a green run | deny | 0/5 → 0/5 |
  | a full changes-feed sync (paging, cursor, deletions, retries) | deny | 0/5 → 0/5 |
  | the port gaining two methods no test needs | deny | 0/5 → 0/5 |
  | the red test's outcome assertion replaced by one current code passes | deny | 0/5 → 0/5 |

  The first wording of the tightening rule (the Kotlin one) brought the
  third and fourth rows only to 1/5 and 3/5: the judge read the missing
  `accountReads` member as a reason to deny. The table is the final
  wording.
- **Not changed:** the JS/TS judge (`JS_TDD_ADDENDUM`) still lacks these
  rules; #85 stays open for it.
- **Action needed:** none for configs that use `swiftRuleEntries`.
## 0.4.25

Android device tests now count as test runs, including a Gradle call with
an environment prefix (#95).

- **What was missing.** mysudo-core #183 runs instrumented tests through
  AGP 9's `com.android.kotlin.multiplatform.library` with
  `./gradlew :sdk:mysudo:connectedAndroidDeviceTest`, prefixed with
  `ANDROID_SERIAL=emulator-5554` to keep off an attached phone. Neither
  the task nor the prefixed call was recognized as a test run. So a
  device test's compile red went unrecorded, and the TDD gate judged the
  `TODO()` stub that followed as an extraction under green, and denied it
  twice. This is the same failure #94 fixed for `iosSimulatorArm64Test`.
- **Now:**
  - Android device-test tasks count: `connectedAndroidTest`,
    `connected<Variant>AndroidTest`, `connectedAndroidDeviceTest`,
    `connectedCheck`, KMP's `androidConnectedCheck`, and Gradle Managed
    Device tasks (`atd33AndroidDeviceTest`, `allDevicesAndroidDeviceTest`,
    `pixel2api30DebugAndroidTest`). Tasks that only build the test APK
    (`assemble…`, `package…`, `compile…`) still don't.
  - Environment assignments before `gradlew`, and `env`, are skipped when
    reading a Gradle call: `ANDROID_SERIAL=… ./gradlew check` counts.
  - This applies to the commit gate and to the extraction-under-green
    check alike.

## 0.4.24

The KMP and Kotlin presets now support adapters that can only be checked
inside an app, such as an iOS Keychain adapter run from a device harness
(#94). Also, KMP target test tasks such as `iosSimulatorArm64Test` now
count as test runs.

- **What was missing.** The iOS Keychain refuses an unsigned Kotlin/Native
  simulator test process (errSecNotAvailable). In mysudo-core #187, the
  Keychain adapter could only be checked by a shared contract run in the
  device harness, which logs the failing check names. On 0.4.23:
  - The TDD judge accepted that run as the red for the contract's
    behaviors, then denied the Telemetry events the observability rule
    requires at those Keychain calls as unasserted.
  - A harness check written to observe them could never be green: its
    Gradle test reaches no keychain, so only its catch branch ran, and
    the judge denied the rest as over-implementation.
  - A `TODO()` stub after a compile red was denied once and allowed on an
    identical retry. Cause: `iosSimulatorArm64Test` wasn't recognized as
    a test task, so the compile red was invisible. The extraction-under-
    green wrapper (#70) saw an older green build, judged the new stub
    file as a "move", and sometimes called it new behavior.
- **Now:**
  - **`harnessGlobs`** (KMP and Kotlin presets, e.g. `['harness/**']`)
    takes test-infrastructure paths out of the TDD block. Every other block
    still covers them.
  - **TDD judge addendum** (Kotlin/KMP), three clauses:
    - A harness run naming failing checks, with the checks' source in the
      session, is a red for the adapter they exercise. A Gradle test that
      reaches only the refusal path doesn't narrow it.
    - The event the observability rule requires at each external call a
      red covers is part of that call's minimum green. A platform attribute
      that changes what is stored or who can read it (a Keychain
      accessibility class, an access group) still needs its own red.
    - After a compile red for a missing symbol, a `TODO()`-only
      declaration is the authorized placeholder, in a new file too.
  - **KMP target test tasks** (`iosSimulatorArm64Test`, `iosX64Test`,
    `macosArm64Test`, `jsNodeTest`, `wasmJsBrowserTest`, `desktopTest`,
    `linuxX64Test`, …) count as test runs, for the commit gate and the
    extraction wrapper. Compile, link and `…TestBinaries` tasks still don't.
- **Measured** on a replica of the #187 session: the real transcript sliced
  at each denied write, the files as they were, and only the KMP TDD block
  through Probity's bin. 5 runs per case. Allowed counts, 0.4.23 → 0.4.24:

  | Case | Expect | Kiro judge (project's) | Claude judge (default) |
  |---|---|---|---|
  | A: adapter for the contract, with its boundary events | allow | 2/5 → 5/5 | 4/5 → 5/5 |
  | B: A plus an unasserted `kSecAttrAccessible` | deny | 2/5 → 0/5 | 1/5 → 1/5 |
  | C: B after a boundary check's harness red | allow | 5/5 → 5/5 | 5/5 → 5/5 |
  | D: A plus an unasserted in-memory cache | deny | 0/5 → 0/5 | 0/5 → 0/5 |
  | E: A with no harness run in the session | deny | 0/5 → 0/5 | 0/5 → 0/5 |

  On the Kiro judge, B's denials on 0.4.24 name only the attribute; on
  0.4.23 they named the events too. The Claude judge lets B through 1 time
  in 5 on both versions. No judge failures in 100 runs.
- **Upgrading.** For a device harness, add `harnessGlobs` to the preset
  call. No other change.

## 0.4.23

A shell command run from the main checkout that writes into a sibling
worktree is now judged by that worktree's config, in Claude Code and in
Kiro (#92).

- **What was missing.** 0.4.22 picked a sibling worktree's config from the
  call's cwd, or a leading `cd`/`git -C`. A Bash call keeps the session's
  cwd, though, so it usually reaches a sibling by path:
  `sed -i … /abs/sibling/src/A.kt`, `sed -i … ../sibling/src/A.kt`, or a
  python script that opens the sibling file. Those ran under the main
  checkout's config, whose shell-write screen skips paths outside the
  project, and passed with no output. Kiro had the same gap: its shim
  called the bare `probity` bin, with none of `probity-claude`'s worktree
  handling.
- **Now:**
  - `probity-claude` reads the files a Bash command writes with the
    shell-write screen's parser (new export `shellWritePaths`) and also
    runs Probity in each other worktree they lie in, the main checkout
    included when the session is in a sibling. The first deny stands.
    The extra run happens only for commands that write into another tree;
    other calls cost the same as before (282 ms against 291 ms on 0.4.22,
    median of 5).
  - The screen resolves a command's relative paths from the session's cwd,
    which `probity-claude` passes as `PROBITY_SESSION_CWD`. It used the
    config root before, which got `../sibling/...` right only by
    coincidence and missed relative paths from a subdirectory.
  - `sed`/`perl` script arguments (`s/a/b/`, `-e` values, BSD's
    `-i ''` suffix) are no longer read as file paths.
  - The Kiro shim runs `probity-claude` (falling back to `probity`), and
    passes the shell call's cwd, so Kiro gets the same worktree routing and
    the #81 config-edit guard.
- **Upgrading.** Re-copy the Kiro shim files (`/probity-update` step 5).
  No config change.

## 0.4.22

Probity now judges calls in a git worktree beside the main checkout, in
Claude Code and in Kiro, and no longer lets calls through when its
packages aren't installed (#90).

- **What was missing.** A worktree made with `git worktree add ../<name>`
  sits beside the project, not inside it.
  - Claude Code: `probity-claude` switches to a worktree's own config only
    for worktrees nested in the project (#66). For a sibling it stayed on
    the main checkout's config, whose rules don't cover paths outside the
    project. So a `sed -i` on a scoped file in the sibling was allowed with
    no output, and globs anchored at the project root (the spec layer, for
    one) missed Write and Edit too. Seen in mysudo-core on 0.4.21: a
    session in a sibling worktree wrote scoped `.feature` files with a
    `python3` heredoc and nothing blocked it.
  - Kiro: the shim takes its root from its own location. In a sibling
    worktree that is the worktree, which usually has no `node_modules`,
    and the shim then allowed every call ("probity not installed").
- **Now:**
  - `probity-claude` finds sibling worktrees of the project's repository
    through `git worktree list` (run only when the target is outside the
    project) and starts Probity there when the worktree has its own
    `probity.config.*`.
  - Both `probity-claude` and the Kiro shim fall back to the main
    checkout's packages: the main checkout's `node_modules` is appended to
    `NODE_PATH`, which Node consults only after the worktree's own. The
    Kiro shim also runs the main worktree's Probity bin when its own tree
    has none.
  - When the packages resolve nowhere, every call is denied with "Run npm
    ci in <tree>", except a bare install command (`npm ci`, `npm install`,
    pnpm/yarn/bun install) so the session can recover. For the Kiro shim
    this replaces the old allow.
- **Upgrading.** Re-copy the Kiro shim files (`/probity-update` step 5
  does this). No config change.

## 0.4.21

Every preset now denies a shell command that writes a file its rules
cover, so the edit goes through the write tool, where the rules judge
it. On by default (#79).

- **What was missing.** The content rules (the TDD gate, the boundary
  and thin-adapter rules, `forbidContentPattern` and the rest) judge
  write actions only. A file changed from the shell (`sed -i`,
  `cat > file <<EOF`, a `python3 - <<'EOF' … open(p, 'w')` script)
  reached Probity as a command and passed unjudged. Seen in
  timesheet-tracker on 0.4.16, and on 0.4.20 through kiro-cli in
  mysudo-core: a green step on a scoped `jvmMain` file made by a
  Python heredoc passed, while the same session's write-tool edits
  were judged and blocked 3 times.
- **Now:** `forbidShellWritesToScopedFiles` (in `rules/shell-writes.ts`)
  reads each command for the files it writes and denies it when one
  falls inside a files-scoped block, after `excludeGlobs`. It is
  deterministic, runs first, and costs no AI call. It works the same
  for Claude Code's `Bash` and Kiro's `shell`.
  - Recognized: redirects and `tee`; `sed -i` and `perl -i`;
    `cp`/`mv`/`install`/`ln`/`rsync` destinations; `dd of=`;
    `truncate`; `git apply` and `patch` from a heredoc or a patch
    file; inline `python`/`node`/`ruby`/`perl`/`bun`/`deno`/`php`
    scripts that call a file-writing API. Shell variables, `for` loop
    variables and `cd` are followed.
  - For an inline script, any scoped path the command mentions counts,
    since the script can take its target from a variable. A script that
    reads a scoped file and writes a report elsewhere is denied too.
  - Not seen, so still passing: script files named on the command line,
    `find -exec`/`xargs`, and paths computed at run time.
- **Options.** Each preset takes `shellWriteScreen` (default `true`);
  `swiftRuleEntries` gains an options argument for it.
  `withShellWriteScreen(entries, { root })` screens a hand-built list,
  for a config that adds its own blocks to a preset's (see
  hooks/PROBITY.md).
- **Upgrading.** No config edit needed for a config that uses a preset
  as it is.

## 0.4.20

Probity's AI judge can now run on kiro-cli, with a fallback between
judges, so judged writes keep working when the Claude login hits its
spend limit. Opt-in.

- **What was missing.** The judged rules (the TDD gate and the other AI
  rules) ask Probity's default judge: the Claude Agent SDK on the
  user's Claude login. In mysudo-core, the org's monthly Claude spend
  limit was hit twice in a week. Every judged write then failed closed
  ("judge returned no verdict … spend limit"), including writes made in
  kiro-cli through the Kiro shim, since the shim asks the same judge.
  Probity's config already takes a custom judge (`ai`), but there was
  no kiro-cli judge and no way to fall back.
- **Now:** three new exports, in `rules/kiro-judge.ts`:
  - **`kiroJudge(options?)`** answers each verdict with one
    `kiro-cli chat --no-interactive` run. The prompt goes on stdin,
    since judge prompts can pass Linux's 128 KB per-argument limit.
    The answer is parsed like Probity's own (bare, fenced, or the last
    JSON object). Defaults: `claude-opus-5.5`, `high` effort, 60 s
    timeout.
    - It fails closed with a "Kiro judge unavailable" reason when
      kiro-cli is missing, exits non-zero, prints nothing, or times
      out. On a timeout it stops kiro-cli and the processes it started.
      An answer that isn't a valid verdict is reported like Probity
      reports one, so the presets ask once more.
  - **`judgeChain([...])`** asks judges in order and moves on only when
    one is unavailable: Kiro unavailable, or Claude reporting a spend
    limit, quota, rate limit or authentication failure. A real verdict
    stands, and so does a malformed answer. Within one hook run, a
    judge found unavailable is skipped for the run's later verdicts, so
    a dead judge can't eat the hook's time across several verdicts.
    Probity starts afresh per tool call, so a hanging kiro-cli still
    costs each write the full `timeoutMs`.
  - **`claudeJudge()`** is Probity's default Claude judge, for use in a
    chain. Probity doesn't export it, so it is loaded from the installed
    `@nizos/probity`. If that ever fails, it reports "Claude judge
    unavailable" instead of crashing.
- **Hook safety.** `--trust-tools=` alone doesn't make a Kiro run
  tool-free: the built-in `kiro_default` agent still read a file in its
  working directory. So `kiroJudge` writes its own agent,
  `probity-judge`, with no tools, hooks or resources, into a working
  directory of its own (`<tmpdir>/probity-kiro-judge`). Asked to read a
  file, that agent answered without reading it. A judge run therefore
  can't edit files, run commands, set off the Kiro shim's hook, or get
  the default agent's prompt hook added to its prompt. Kiro's saved
  sessions for judge runs stay out of the project's session list; they
  accumulate in that directory, one per verdict.
  `withJudgeFailureDiagnostics` reports "<name> judge unavailable" as
  an infrastructure failure, not as a policy deny, and doesn't retry it.
- **Measured** on the #80 replica (the mysudo-core #145 session: port,
  store, use case, fake and test on disk, plus a hand-written
  transcript), through the KMP preset's TDD rule, 5 runs per case.
  Allowed counts:

  | Case | Expect | Claude | Kiro, medium | Kiro, high |
  |---|---|---|---|---|
  | P0–P4: port method and the steps around it (5 cases) | allow | 5/5 each | 5/5 each | 5/5 each |
  | C1: port method with no failing test, after green | block | 0/5 (+0/10) | 1/5 (+2/10, +4/10) | 0/5 (+0/10) |
  | C2: full sync engine for the red test | block | 0/5 | 0/5 | 0/5 |
  | C3: assertion added to a passing test | not a control | 5/5 | 1/5 | 0/5 |
  | C4: red test's assertion loosened | block | 0/5 | 0/5 | 0/5 |
  | C5: port gains two unneeded methods | block | 0/5 | 0/5 | 0/5 |

  At `high`, Kiro agreed with Claude on every case that has a right
  answer. At `medium`, it let C1 through 7 times in 25, always with an
  empty reason, so `high` is the default. On C3, Kiro is stricter than
  Claude. That is a policy grey area: neither version blocks it on
  purpose.

  Latency per verdict:
  - Kiro, high: 15 s median, 22 s p90, 42 s max.
  - Kiro, medium: 16 s median, 40 s max.
  - Claude: 8 s median, 12 s max.

  Fallbacks, timed through Probity's real CLI and config loader:
  - kiro-cli missing: found in 4 ms, then Claude answered.
  - A Kiro timeout set to 3 s: Claude answered 6.5 s after the start.
- **Kiro shim timeout raised.** `kiro/kiro-agent.template.json` now gives
  the Probity preToolUse hooks 300 s (`timeout_ms: 300000`), not 120 s.
  A write can take up to three verdicts, and three slow Kiro verdicts
  can pass 120 s. A hook that times out doesn't block: Claude Code's
  docs say the tool call then proceeds, and Kiro's behavior wasn't
  checked. Claude Code's default limit for a command hook (10 minutes)
  is already enough.
- **Not measured:** a judge run started from inside a live Kiro session
  (the Kiro shim calling Probity, which calls kiro-cli). The judge's
  agent has no tools or hooks, so it can't trigger the shim. Whether
  kiro-cli behaves differently when nested was not tested.
- **Action needed:** none; nothing changes unless `ai` is set. To use
  it, see hooks/PROBITY.md, "Choosing the AI judge". If you use
  `kiroJudge` under Kiro, raise `timeout_ms` on the Probity hooks in
  your `.kiro/agents/*.json` to 300000 (`/probity-update` refreshes the
  shim, not your agent config).
- New exports: `kiroJudge`, `claudeJudge`, `judgeChain`,
  `isJudgeUnavailable`, `KIRO_JUDGE_AGENT`, and the types
  `KiroJudgeOptions`, `KiroRun`, `KiroRunResult`, `JudgeChainOptions`.

## 0.4.19

`probity-claude` keeps a broken `probity.config.ts` fixable (#81).

- **What happened.** Probity loads its config on every tool call and
  fails closed when the load throws. An agent added
  `withMutationProbe(...)` to the config in one Edit and its import in
  the next. After the first edit, every Bash, Edit and Write was denied
  with `Probity: withMutationProbe is not defined`, including the
  Edit that would add the import. Only a human could revert the file.
- **Edits to the config are checked first.** For an Edit or Write to
  the config Probity would load (the nearest `probity.config.*`, or
  `--config`), the wrapper applies the edit to a scratch copy beside
  the config, loads it with Probity's own loader, and denies the edit
  if it would not load. The deny names the load error and says to
  import before use, or to write the file in one Write. The scratch
  copy is always removed.
- **A config that is already broken can still be edited.** If the
  config fails to load, Edit and Write calls to it are not blocked: the
  wrapper returns no decision, so Claude Code's normal permission flow
  decides. Every other call stays denied, and the deny now ends with
  the config's path and that editing it is the way out.
- **Cost.** The config is loaded in the wrapper only for edits to the
  config itself, and when Probity fails closed outside its rules. Other
  calls run as before.
- **Tradeoff.** While the config is broken, Edit and Write calls to it
  are not judged by any rule, including rules that guard the config.
  A config that does not exist yet (the hook wired before the file)
  still blocks everything; that case is not covered here.
- **If the check cannot run** (no scratch file can be written beside
  the config, say), the wrapper leaves the edit to Probity as before
  instead of failing open.
- **Upgrading.** No config or hook change if the hook already runs
  `probity-claude`. The bare `probity` bin does not get this.

## 0.4.18

The Kotlin and KMP TDD judge no longer blocks a new port method that a
failing test needs (#80). It also stops repeating a fix that was already
tried, and lets a red test be tightened.

- **What went wrong.** In mysudo-core #145, a test read Sudo A online,
  went offline, then expected Sudo B's messages from the local store. B
  was never read online. The gateway port (`TextMessageGateway`) could
  only read one Sudo at a time, so no store logic could make the test
  pass. The fix needed a new port method,
  `changes(account, since: Long?)`. The judge denied it four times as
  over-implementation: "the test only needs the kept store to retain
  every Sudo's messages … it never exercises a changes-feed". It reasoned
  from the store, not from what the port can deliver. The store merge it
  proposed was written, and the test still failed. When the red test was
  then edited to assert the Account-wide gateway call, the judge called
  that "retrofitting".
- **Now:** the Kotlin TDD addendum (`internal/kotlin-tdd.ts`) has three
  new rules:
  - **A port method can be the minimal green.** The judge checks what
    the existing port methods and the test's fakes can deliver. When no
    existing method can deliver the data the test asserts, adding the
    one port method that can (with its result type and the fake's
    implementation) is the minimal green. The judge does not deny it
    over its signature: a parameter the test passes as null, or a result
    field it ignores, does nothing by itself. The code behind the port
    is still held to the test's assertions. Paging, cursors, retries and
    deletion handling the test doesn't assert are still denied.
  - **A tried route is ruled out.** If a change an earlier denial
    proposed was written, and the same test still failed the same way,
    the judge must not propose it again.
  - **Tightening a red test is part of the red step.** Adding or
    strengthening an assertion in a test that is still failing is not
    retrofitting. Retrofitting means editing a test after production
    code makes it pass. Replacing or loosening a red test's assertion so
    current code passes is weakening, and is denied.
- **Measured** with Probity's real Claude Code judge, wired as the KMP
  preset wires it, on a replica of the #145 session (port, store, use
  case, fake and test files on disk, plus a hand-written transcript).
  Five runs per case, 0.4.17 → 0.4.18. Cases that must be allowed:
  - adding `changes()` after the proposed store merge was tried and the
    test still failed (the reported write): **1/5 → 5/5**;
  - adding `changes()` straight after the first red run: **0/5 → 5/5**;
  - adding the gateway-call assertion to the still-red test:
    **0/5 → 4/5**;
  - adding `changes()` after that tightened test ran red (the issue's
    workaround): **0/5 → 5/5**;
  - the minimal use-case green after the port and fake exist:
    5/5 → 5/5.

  Cases that must stay denied (allowed count, 0.4.17 → 0.4.18):
  - `changes()` with no failing test, after a green run: 1/5 → 0/5;
  - a full changes-feed sync (paging loop, cursor store, deletions) for
    the red test: 0/5 → 0/5;
  - the port gaining two more methods no test needs: 0/5 → 0/5;
  - the red test's outcome assertion replaced by one current code
    passes: **3/5 → 0/5**.

  The original transcript wasn't replayed. The hand-written replica
  reproduced the reported denial wording on 0.4.17.
- **Not changed:**
  - The JS/TS (`JS_TDD_ADDENDUM`) and Swift judges don't get these rules
    yet.
  - Adding an assertion to a test that already passes is still allowed.
    The judge allowed it 5/5 on 0.4.17 and 4/5 on 0.4.18.
- **Action needed:** none. Configs that use `kotlinRuleEntries` or
  `kmpRuleEntries` get it on upgrade.

## 0.4.17

The Kotlin and KMP presets can now keep driving adapters thin (#76):
Compose screens and CLI commands, in the same repo as the core or in a
separate app that consumes it as a library. Opt-in.

- **What was missing.** 0.4.16 wired `enforceThinDrivingAdapter` and
  `forbidNewDomainDiscriminantChecks` into the JS preset only. Kotlin
  had three more gaps:
  - Its discriminant screen matched only string literals, but Kotlin
    compares to enum entries (`role == Role.SUPER_USER`).
  - The export list only read JS/TS `export` declarations.
  - A UI-only app depending on the core as a library has no core
    source to scan at all.
- **Opt-in, unlike JS.** `kotlinRuleEntries` and `kmpRuleEntries` get
  a `drivingAdapterGlobs` option with **no default**. A core-only repo
  (mysudo-core has no `@Composable` files) has no UI, so a default glob
  would only show up as `DEAD SCOPE`. Upgrading changes nothing until
  the option is set. When set, the block is listed before the TDD
  judge, and `coreGlobs` are excluded from it (in KMP, that keeps
  `presentation/` ViewModels core). Starting globs per layout are in
  hooks/PROBITY.md, "Driving adapters by project layout".
- **New options** (both presets):
  - `domainDiscriminants`: turns on the free screen with Kotlin
    patterns. It blocks net-new `role == Role.X` (either order) or
    string-literal comparisons, `when (viewer.role)` subjects, and
    `status is Status.Draft`.
  - `domainHint`: appended to the screen's deny.
  - `coreExportsInJudge`: the judge gets the public names declared in
    `coreGlobs` sources. Capped at `coreExportsMaxChars`, default
    16,000.
  - `coreApiPaths`: for a UI-only app. The judge gets the core's public
    API read from binary-compatibility-validator dumps (`.api` and
    `.klib.api`, as files or directories). Generated members (getters,
    `component1`, `copy`, `equals`…) are dropped; on kotlinx.coroutines'
    real dumps this cuts 125 KB to about 10 KB.
- **Kotlin judge addendum** (`KOTLIN_DRIVING_ADAPTER_ADDENDUM`). A CLI
  command's options, help text, precondition checks and exhaustive
  `when` over its use case's sealed outcome (to exit code, error code,
  message and JSON) are translation. Branching on domain state,
  retrying, or chaining use cases is not. It also lists Compose view
  state and wiring (`remember`, `collectAsState`, `LaunchedEffect`
  forwarding one intent, `@Preview`) as allowed.
- **Export scanning (all presets).** Nested worktrees and submodules
  (a directory with a `.git` file, such as `.claude/worktrees/*`) are
  skipped, as the parity rule already does (#55). Paths are printed
  relative to the directory the modules share. On mysudo-core, the
  worktree copies would otherwise have filled the cap several times
  over. Kotlin nested types (mostly sealed-outcome cases) are left out,
  which takes mysudo-core's core list from 29,000 to 13,000 characters.
- **Shared block.** `presets/driving-adapter.ts` (`drivingAdapterBlock`)
  builds the block for all three presets. The JS preset's wiring is
  unchanged.
- **Measured** with Probity's real Claude Code judge, wired as the KMP
  preset wires it, 5 runs per case.
  - **mysudo-core's CLI** (`cli/src/main/**/commands/**`, its real
    `coreGlobs`, `coreExportsInJudge: true`):
    - Allowed: four real writes (adding the real `sudos delete`
      command, the real `RegisterCommand` with its extra read for
      display, the real 432-line `PhoneCallsCommand`, and a help-text
      change).
    - Blocked: four splices into real commands (label validation the
      `CreateSudo` use case already does; a last-Sudo rule plus a retry
      in `delete`; a role/status filter in `list`; a locked-account
      sign-out-and-deregister policy in `register`).
    - Result: 40/40 correct. The free screen caught the two enum cases
      before any AI call.
  - **Synthetic Compose versions** of the #72 cases (blocked) and
    controls (allowed: a pure render change, calling `canApprove()`,
    one ViewModel intent, local `remember` state): 40/40 correct.
  - **Addendum check.** Without the Kotlin addendum, the CLI set was
    also correct (39/39 verdicts, 1 run failed on the judge's login).
    So the addendum is guidance these cases didn't need, not a measured
    fix.
- **Scope.** `probity-scope-report` was run on mysudo-core's tree from
  a scratch copy of its config. Relative globs are anchored to the
  config's own directory, so that copy used the unanchored
  `**/cli/src/main/**/commands/**`. It reported the block with no
  warning but also matched `.claude/worktrees/` copies (123 files). In
  mysudo-core's own config, the anchored `cli/src/main/**/commands/**`
  matches the 31 command files. A scope-report test confirms the block
  leaves out `Composition.kt`.
- New exports: `drivingAdapterBlock` (`presets/driving-adapter`).
  `ExportLanguage`, `JS_EXPORTS`, `ApiDumpFormat` and
  `listPublishedApi` (`rules/ports-and-adapters`). `kotlinExportedNames`,
  `KOTLIN_EXPORTS`, `readKotlinApiDump`, `KOTLIN_API_DUMP`,
  `kotlinDomainDiscriminantPatterns` and `KOTLIN_DRIVING_ADAPTER_ADDENDUM`
  (`rules/kotlin`). `forbidNewDomainDiscriminantChecks` takes
  `patternsFor`; `enforceThinDrivingAdapter` takes `publishedApi` and a
  `coreExports.language`.

## 0.4.16

The JS preset now keeps driving adapters (UI components, pages, route
handlers) thin (#72). Business logic leaking out of the core into UI
code is blocked, and the deny names where it should go.

- **What went wrong.** The existing ports-and-adapters rules stop
  vendors getting *into* core code. Nothing stopped logic leaking *out*
  of it. In a React consumer on 0.4.14, with clean and fully policed
  core boundaries, `src/ui/` grew:
  - a submit handler running a whole use case (domain `submit()`,
    `repository.save()`, `notifier.timesheetSubmitted()`, and a "a
    failed notification must never fail the submit" policy)
  - `viewer.role === 'SuperUser'` permission checks in four places,
    next to a domain that already exported `canEdit` and `canApprove`
  - a display-name rule copied seven times, with two copies disagreeing
  - a React-free use case filed under `src/ui/`

  Each one had a component test, so the TDD judge had no reason to
  object. It checks whether code is tested, not where it belongs.
- **Now:** two new rules in `rules/ports-and-adapters.ts`.
  - `enforceThinDrivingAdapter`, an AI judge. It blocks a write that
    adds (a) a decision in domain terms, (b) coordination of more than
    one port or use-case call, (c) a re-implementation of something the
    core exports, or (d) a framework-free use case under a UI path. The
    deny names the extraction target: a domain function or a use case.
    Rendering, display formatting, local view state, and one call per
    user intent pass. Only what a write adds is judged, so an existing
    thick component doesn't freeze.
  - `forbidNewDomainDiscriminantChecks`, a free deterministic screen.
    It blocks net-new comparisons of configured fields to a literal
    (`viewer.role === 'SuperUser'`, either order) and points to a domain
    function. Off until you list the fields: there is no default,
    because `status === 'loading'` is ordinary view state.
- **Preset wiring (JS only).** `jsRuleEntries` gets a block on the new
  `drivingAdapterGlobs` option, **on by default**: `src/ui/**`,
  `src/components/**` and `src/**/*.tsx`, minus `*.test.*`, `*.spec.*`
  and `*.stories.*`. It runs before the TDD judge, so a denial costs one
  AI call. New options:
  - `drivingAdapterGlobs`: the scope; `[]` switches the rules off.
  - `domainDiscriminants`: turns on the free screen, e.g. `['role']`.
  - `domainHint`: appended to the screen's deny, e.g. where permission
    rules live.
  - `coreExportsInJudge`: gives the judge the export names of every
    module under `coreGlobs` (capped at 8,000 characters), so it can
    name the existing function a copy duplicates. Off by default; it
    scans the tree on each judged write.
- **Measured** with Probity's real Claude Code judge, 5 runs per case,
  on synthetic writes built from the four cases above plus five
  controls that must pass: a pure render change, adding a `canX()`
  call, a single use-case call, a local `status === 'loading'` check,
  and calling an existing `displayName` export. These are written from
  the issue's descriptions, not replays of the consumer's real writes.
  With and without the export list, 90/90 verdicts were correct (40
  blocked, 50 allowed). The prompt's examples were then made
  domain-neutral and the replay rerun: 76 of 90 runs returned a verdict
  and all 76 were correct. The other 14 hit a judge login failure in
  the test environment. On 0.4.14 no rule judged these writes, so all
  would pass.
- **Cost:** one extra AI call per write to a matching UI file, on top of
  the TDD judge.
- **Migration.** Consumers calling `jsRuleEntries` get the new block on
  upgrade. Check it with `probity-scope-report`: it lists the block and
  flags it `DEAD SCOPE` if your UI lives elsewhere. Then set
  `drivingAdapterGlobs` to your layout, or `[]` to opt out. Hand-composed
  configs add the block themselves:

  ```ts
  {
    files: ['src/ui/**', '!**/*.test.*'],
    rules: [
      forbidNewDomainDiscriminantChecks({ discriminants: ['role'] }),
      withJudgeFailureDiagnostics(withContradictionRetry(enforceThinDrivingAdapter())),
    ],
  }
  ```

  The Kotlin, KMP and Swift presets are unchanged; Compose and SwiftUI
  globs are a follow-up.
- New exports: `enforceThinDrivingAdapter`,
  `forbidNewDomainDiscriminantChecks`, `domainDiscriminantPatterns`,
  `exportedNames` and `listCoreExports`.
- Skills: `ports-and-adapters` gets a "Driving adapters are equally
  thin" section with a checklist, red flags and a rationalization;
  `frontend-ui-engineering` points to it.

## 0.4.15

The JS/TS TDD judge no longer blocks adding a new red test (#73), and it
now blocks a production write whose new test was never run.

- **What went wrong.** In #73, a JS/TS project on 0.4.14 added one new
  failing `it(...)` to an existing Vitest file, straight after a green
  run, with no production change. The judge denied it: "This test has
  not been observed failing … here it is being added as a green->red
  crossing without that observed red." A test can't fail before it
  exists. This is the #43 bug in the Kotlin judge, fixed in 0.4.3. The
  JS preset runs Probity's built-in `enforceTdd()`, which never got
  that fix. Its default rules say both "adding a test is the red step"
  and "judge a new red at the green->red boundary too" (the refactor
  check), and the judge read the second as a demand for a failing run.
- **Now:** a new rule, `enforceJsTdd()` (in `rules/js-tdd.ts`,
  exported), is `enforceTdd()` with an addendum, wrapped the way the JS
  preset already wrapped it. The JS preset uses it. The addendum says:
  - Adding one failing test is the red step and needs no prior run.
    "Must be observed failing" applies only to the production write
    that follows. This holds even when the test contradicts what the
    previous cycle just implemented.
  - At a test write, the only green->red question is whether the prior
    green left a refactor unmade. A passing prior run is never a reason
    to block a new test.
  - A production write still needs an observed failing test: a run,
    after the test was written, whose output shows that test failing.
    A test written but never run does not count. Neither does an
    earlier failing run of a different test.
- **Measured** against the live judge (Probity's `claudeCode()` agent,
  as the hook runs it), replaying the real #73 write. The input was the
  session's own transcript, cut just before the write and read with
  Probity's transcript reader, plus the test and production files as
  they stood on disk then (10 runs each, 0.4.14 → 0.4.15):
  - the reported write: allowed **2/10 → 10/10**. On 0.4.14 the
    denials read like the reported one ("has not been observed
    failing");
  - the same session, then a production write with the new test never
    run: blocked **4/10 → 9/10**;
  - the same session, then the new test run and seen failing, then the
    production write: allowed 10/10 → 10/10.

  A replica built from the same files, but with a hand-written session,
  never reproduced the denial (allowed 20/20 on both versions). On it,
  the controls that must stay blocked, as 0.4.14 → 0.4.15 (5 runs
  each unless noted):
  - a production write before any test for it: 5/5 → 5/5;
  - a test plus a production change in one write (an in-source `it` in
    `account.ts`): 5/5 → 5/5;
  - two new tests in one write: 5/5 → 5/5;
  - a production write after the new test was added but never run:
    1/10 → 15/15.
- **Not changed:** Probity's own `enforceTdd({ fastPath: true })` stays
  off. It would pass a single-test write with no AI call, but it skips
  the refactor check at the green->red boundary. It also lacks the
  byte-preservation checks the Kotlin fast path has.
- **Action needed** if your `probity.config.ts` wires the TDD rule
  itself rather than through `jsRuleEntries`. Replace
  `withJudgeFailureDiagnostics(withContradictionRetry(enforceTdd()))`
  with `enforceJsTdd()`, imported from `@jjchill/probity-rules` or
  `@jjchill/probity-rules/rules/js-tdd`. Configs that use
  `jsRuleEntries` get it automatically.
- New exports: `enforceJsTdd`, `JS_TDD_ADDENDUM`.

## 0.4.14

Extracting existing code into a new file under green now passes in the
Kotlin and KMP presets (#70), and a move with new behavior spliced in
is now blocked instead of slipping through.

- **What went wrong.** In #70, after a green `./gradlew build`, moving a
  547-line JVM composition function into `commonMain` behind an
  interface was blocked twice as "net-new logic": the new
  `ClientComposition.kt` ("a parallel new common-source entry point")
  and the new `JvmPlatformAdapters.kt` implementing the interface. The
  Kotlin TDD judge sees each session event clipped to 6,000 characters,
  head and tail. The 26,934-character source file it was moved from was
  mostly invisible, and the original still on disk read as duplication.
  The same blindness cuts the other way: a moved file with one small
  new behavior added (a new `https` check) was allowed by the TDD judge,
  in 0.4.13 too.
- **Now:** a new wrapper, `withExtractionUnderGreen` (in `gates.ts`,
  exported), sits around the Kotlin TDD judge. When a write creates a
  new production file and the latest matching build or test run in the
  session was green, it gives a separate judge the full, current
  on-disk content of the production files the session read or edited
  (up to 120,000 characters, most-related first). The judge answers
  with one of three findings:
  - **move**: every behavior is already there. The write passes, with
    an `extraction-under-green` trace note.
  - **new behavior**: the file produces an outcome a caller could
    observe that no source has (a new rejection, call, side effect or
    value). The write is blocked, naming it: under green there is no
    failing test to justify it. A different route to an existing
    outcome (try/catch instead of a null check, logic moved into a
    caller) is not new behavior.
  - **unsure**, any other answer, or a judge error: the TDD judge
    decides, as before.
- **Measured** by replaying the two real #70 writes with the session's
  own transcript cut just before each one, and the files the session
  had written by then on disk (5 runs each). `JvmPlatformAdapters.kt`:
  blocked 3/3 on 0.4.13, now "move" and allowed 5/5.
  `ClientComposition.kt`: "unsure" 5/5, then allowed by the TDD judge as
  on 0.4.13 (its original denial did not reproduce). The same two
  writes with one new behavior spliced in were "new behavior" and
  blocked 10/10; on 0.4.13 one of them was allowed 3/3.
- **Applies to** new production files only (`src/main/` and
  `src/<target>Main/`). Edits to existing files are unchanged. The cost
  is one extra AI call for a qualifying write, two when the finding is
  "unsure".
- New exports: `withExtractionUnderGreen`, `GreenRunOptions`, and in the
  Kotlin rules `kotlinGreenRunOptions()` and
  `KOTLIN_PRODUCTION_SOURCE_PATTERN`. `requireGreenTestRun` now shares
  its green check with the wrapper; its behavior is unchanged.

## 0.4.13

The adapter-observability judge no longer demands telemetry on calls
through the codebase's own interfaces (#68). Applies to every preset that
wires `enforceAdapterObservability` (Kotlin, KMP, Swift).

- **What went wrong.** In #68, `AccountKeySecrets`, an internal class
  under `adapter/`, called `SecretBackend`, an interface declared in
  the same module. Its implementations (`FileSecretBackend`,
  `KeychainSecretBackend`) are the real boundary and already emit
  events. The judge read `secrets.get/create/delete` as "external I/O
  through the keychain/keystore adapter" and demanded an event. The TDD
  judge then rejected that event as over-implementation, because the
  red test didn't assert it. Each write was blocked by one rule or the
  other, until every test of the internal helper asserted telemetry.
- **Now:** the judge's instructions say a new path needs observability
  when the file itself calls a vendor SDK, HTTP client, database
  driver, the filesystem, or a platform API. Calls on an interface or
  class the codebase declares (same package, or imported from the
  project's own packages) are delegation: the implementation behind it
  owns the boundary and is judged when it is written.
- **Measured** by replaying #68's writes through the real rule and judge
  (3 runs each): adopting a legacy key and adding `delete` through
  `SecretBackend` went from 0/3 to 3/3 pass. Two controls stayed
  blocked 3/3: a `FileSecretBackend` method calling `java.nio.file`
  directly, and a new Ktor HTTP adapter, both without events.
- Not changed: an adapter that does call the platform still needs its
  event asserted in the failing test first, as the block message says.

## 0.4.12

`probity-claude` now runs Probity in the worktree a session is working
in, so rules judge that tree's specs and files (#66).

- **What went wrong.** The documented hook is
  `cd "$CLAUDE_PROJECT_DIR" && ./node_modules/.bin/probity-claude`.
  After a session moves into a worktree (`EnterWorktree`, or an
  `isolation: "worktree"` sub-agent), `CLAUDE_PROJECT_DIR` still names
  the main checkout. Probity finds `probity.config.ts` by searching
  upward from its working directory, so it loaded the main checkout's
  config, and `ROOT`, `specsDir` and `glossaryPath` all pointed there.
  In #66 the spec-first rule blocked an acceptance test whose
  `Covers:` scenario existed only in the worktree's `specs/`
  submodule, and named the main checkout's `specs/features`.
- **Now:** the wrapper finds the git worktree the action targets: the
  edited file's location, or for a command its `git -C <dir>` or
  leading `cd <dir> &&`, else the session's `cwd`. When that worktree
  is nested inside the project and has its own `probity.config.*`, the
  wrapper starts Probity there. Its config's imports resolve from the
  project's `node_modules` (one level up the folder tree), so the
  worktree needs no install. Work in the main checkout, worktrees
  without a Probity config, and paths outside the project run as before.
- A relative `--debug <path>` is anchored to the project directory, so
  the debug log stays in one place.
- Only hooks that run `probity-claude` get this. A worktree outside the
  project folder still runs against the project.
- Consumers: no config change. The worktree's own `probity.config.ts`
  (from its branch) is the one that runs.

## 0.4.11

The commit-on-green gate now catches every form of `git commit`, and
scopes a worktree's commit by that worktree's staged files (#63).

- **What went wrong.** `requireGreenTestRun` recognized a commit only
  by the literal text `git commit`. `git -C <dir> commit` and
  `git -c key=value commit` never matched, so a commit written either
  way skipped the "tests must be green" check entirely. Agents often
  write `git -C <path> commit` to avoid a `cd`. With `enforceForPaths`
  set, the gate also listed staged files in the hook's checkout. A
  commit made inside a linked worktree nested in the project
  (`.claude/worktrees/<name>/`) was scoped by the main checkout's
  staged files, usually none, and passed as "no code touched".
- **Now:** the gate matches commits with the shared `GIT_COMMIT`
  pattern the marker and parity gates use. With `enforceForPaths`, it
  lists the staged files of the tree the commit is made in. The
  transcript check (a green run after the last write) is per session,
  so it is unchanged.
- `GIT_COMMIT` no longer matches plumbing commands that only start
  with the word, such as `git commit-tree` and `git commit-graph`. This
  applies to every commit gate.
- `listCommitFiles` (the test hook option) now also receives the root
  of the tree being committed as a second argument, in
  `requireGreenTestRun` and the Kotlin wrapper. One-argument functions
  keep working.

## 0.4.10

The spec↔test parity gate now checks the worktree a commit is made in
(#57).

- **What went wrong.** `enforceSpecTestParity` always checked the
  hook's own checkout, the project root. Claude Code puts
  `isolation: "worktree"` sub-agents in linked worktrees inside the
  project (`.claude/worktrees/<name>/`). A commit made there was
  checked against the main checkout's staged files, which usually
  touch no specs or acceptance tests, so the gate passed without
  looking. A sub-agent could commit a new scenario with no covering
  test. The gate also missed `git -C <dir> commit` entirely: it only
  fired on the literal text `git commit`.
- **Now:** like the marker gates (#39), the gate reads the commit's
  directory from `git -C <dir> commit` or `cd <dir> && git commit`.
  When that is a git working tree nested inside the project, the gate
  checks that tree. `specsDir`, `testRoots` and `baselinePath` under
  the project root are mapped to the same paths inside it, and the
  staged-file listing runs there. A scenario left uncovered in the main
  checkout no longer blocks a worktree's commit, and the reverse.
- The gate now fires on `git -C <dir> commit` and
  `git -c key=value commit` as well.
- `listCommitFiles` (the test hook option) now also receives the root
  of the tree being committed as a second argument. One-argument
  functions keep working.
- Internal: the commit-target helpers the marker gates used moved to
  `rules/commit-target.ts`, shared by both rules.

## 0.4.9

Long sessions no longer lock every commit once the session transcript
passes 100 MiB (#54).

- **What went wrong.** Probity refuses to read a transcript larger than
  100 MiB. Every rule that reads session history (the commit-on-green
  gate, the TDD judge, characterization-marker release) then failed
  with `rule error: file at <path> exceeds 104857600 bytes`, on every
  call, until the session was restarted and its context lost. Other
  commands whose text contains `git commit`, such as a
  `gh issue create` whose body quotes it, were blocked the same way.
- **Now:** `probity-claude` checks the transcript's size before running
  Probity. When it is over the limit, the wrapper copies its newest
  32 MiB (whole lines only) to a private temp file, points Probity at
  that copy, and deletes it when Probity exits. The gates only need
  recent events: the last test run, the red before a green. A red or a
  test run older than that window is no longer visible; rerun it.
- When a rule still hits the limit (a project running Probity's bare
  `probity` bin, or a Kiro session), it now denies with the cause and
  the fix (use `probity-claude`, or start a new session) instead of an
  opaque rule error. This covers `requireGreenTestRun`,
  `withCharacterizationTest`, and every TDD judge wrapped by
  `withJudgeFailureDiagnostics`. Any other failure to read history
  still blocks as a rule error.
- New export: `transcriptLimitViolation(error)` turns that error into
  the deny above and rethrows anything else, for custom rules that
  read `ctx.history()`.
- Cost: once a transcript is over the limit, every hook call the
  wrapper handles reads and writes that 32 MiB copy, whether or not a
  rule reads history (tens of milliseconds on an SSD).
- Consumers on the bare bin should switch the hook to `probity-claude`
  (see PROBITY.md); no config change is needed.

## 0.4.8

Spec↔test parity no longer counts Covers tags from other checkouts
nested inside the project (#55).

- **What went wrong.** The `probity-spec-parity` CLI and the
  `enforceSpecTestParity` and `surfaceScenarioLinkBreakage` rules
  walked every directory under the test roots. That included linked git worktrees Claude Code
  creates at `.claude/worktrees/<name>/`, which are full checkouts with
  their own `// Covers:` tags. In #55 a parity run reported 510 Covers
  tags for 257 scenarios, about twice the real number. A scenario
  claimed only by a test in the nested worktree counted as covered in
  the main checkout, so the gate could pass with no test for it there.
- **Now:** the scan skips any directory below a root that holds a
  `.git` file (a linked worktree or submodule), as the marker gates
  have since 0.4.2 (#39). A root that is itself a linked worktree is
  still scanned.
- Not changed: a commit made inside a nested worktree is still gated
  against the hook's own checkout, not the worktree's (the marker
  gates retarget; the parity gate does not).

## 0.4.7

A judge answer that is not valid JSON is no longer reported as an
outage (#52), in every preset.

- **What went wrong.** The judge sometimes writes its verdict as broken
  JSON: an unescaped `"` or a line break inside `reason`, or an answer
  cut off mid-string. Probity then reports "could not parse verdict",
  and `withJudgeFailureDiagnostics` rewrote that as "returned no
  verdict … an infrastructure failure … retrying … will not help". In
  #52 the judge had in fact denied the write for over-implementation.
  The agent was told the judge was down, and that retrying was
  pointless.
- **Now:** the wrapper tells the two causes apart.
  - The provider reports it is unavailable (spend limit, quota, rate
    limit, auth), or no AI agent is configured: unchanged. No retry;
    the message still says retrying will not help until the judge is
    back.
  - The judge answered, but not as a valid verdict: it is asked once
    more, and a well-formed second verdict stands. If the second answer
    is still malformed but reads as a deny, the block is reported as
    the policy decision it is, with the judge's reason quoted in full.
    Anything else stays blocked, with the judge's output in full, and
    the message says retrying the same write may succeed.
- Agents already retry a blocked write, so the automatic retry changes
  what the agent is told, not how many chances the write gets.
- Tested with scripted verdicts run through Probity's own parser: an
  unescaped quote, a raw line break, a cut-off answer, a malformed
  pass, and prose. The raw output of the #52 answer was not recorded,
  so this is not a replay of it. `hooks/PROBITY.md` now points at the
  `--debug <path>` hook option for capturing such output.

## 0.4.6

A TDD judge deny that ends in a bare "Pass." is now judged again (#50).

- `withContradictionRetry` (0.4.4, all presets) re-runs the judge once
  when a deny's last sentence concludes the write is allowed. It only
  recognised phrases like "This is permitted." and "should pass". A
  recorded deny ended "Reconsidering: ... It is not
  over-implementation. Pass." and was not retried; the identical write
  passed on the agent's own retry. The pattern now also matches a bare
  verdict word ("Pass.", "Allowed.", optionally after "So," or
  "Verdict:") and a closing "is not over-implementation" or "is not a
  violation". It still ignores "does not pass", "is not permitted",
  and sentences like "the tests pass". The second verdict still
  stands, deny or pass. Tested with scripted verdicts, including the
  recorded #50 reason.

## 0.4.5

The Kotlin and KMP TDD judge no longer blocks a behavior-preserving
extraction under green (#48).

- **Moving tested logic into a helper is allowed as a refactor, not
  only as green.** The 0.4.4 instruction for #46 described the move
  only as a green step for a failing test. The judge then read it as
  the sole way an extraction could pass, and required a fresh red for
  a plain refactor. Removing duplicated logic from two use cases was
  blocked with every test green: "the move-existing-logic allowance
  requires ... a failing test needing this call path". The
  instruction now names both phases. In green, the move serves a
  failing test. In refactor, no failing test is needed when the most
  recent relevant test or build run passed and none is outstanding.
  It also says a move includes rewiring a caller to the helper, and
  renaming the helper, its parameters or its result type. A helper
  with logic that appears nowhere in the session, or a move that adds
  a branch, still needs its own red.
  Live judge on a replica of the recorded #48 session (green build,
  both copies grepped, no failing test): adding the helper was allowed
  2 of 6 times on 0.4.4 and 8 of 8 on 0.4.5. Rewiring a caller passed
  on both. Controls stayed denied 8 of 8 on 0.4.5: a helper with new
  logic under green, moved logic plus a new branch, and the three
  0.4.4 controls.

## 0.4.4

Fixes for a one-test Kotlin write that reached the AI judge and was
denied by a reason that said it was permitted (#45), and for
extracting a shared helper under green (#46).

- **Kotlin fast path: a new test may reuse other tests' local names
  (#45).** The fast path passes a write adding exactly one `@Test`
  without an AI call. Its shadowing screen, which stops a write from
  redefining something existing tests call, counted every `val`
  inside the new test's body as a class-level declaration. Tests in
  one file routinely declare the same locals (`val cli`,
  `val composition`), so the #45 write went to the judge. Declarations
  inside a function body, lambda, initializer or accessor are now
  skipped: they are visible only there. Replayed on the recorded #45
  write and the file as committed just before it: 0.4.3 called the
  judge, 0.4.4 passes with no judge call.
- **A deny that concludes "permitted" is judged again (#45), in every
  preset.** Probity's judge answers `{"kind", "reason"}` in that
  order, with thinking disabled, so it picks `kind` before it
  reasons. The #45 block ended "... adds only ONE new test (the delete
  test). This is permitted." and still denied; the identical retry
  passed. New wrapper `withContradictionRetry` (in `rules/gates.ts`)
  re-runs the judge once when a deny's last sentence says the write is
  permitted, allowed, or should pass. The second verdict stands, deny
  or pass. Every other verdict is untouched. The JS, Swift, Kotlin and
  KMP presets all use it. Tested against the recorded #45 reason with
  scripted verdicts; the contradiction did not recur in 6 live runs,
  so the retry is not measured live.
  Asking the judge to reason before choosing `kind` was tried and
  rejected: it let a production write with no recorded failing test
  through 5 of 8 times, against 0 of 8 without it.
- **Moving tested logic into a shared helper is minimum green (#46),
  Kotlin and KMP judge.** When a second use case's failing test needs
  logic that production code already has, moving that logic into a
  helper (and a small result type) is no longer over-implementation.
  The helper may keep every branch the existing logic has. This
  applies only when the same logic appears in the current file or in
  a production file read or edited in the recent session. A helper
  whose logic appears nowhere else still needs its own red. Live
  judge on a replica: 0.4.3 allowed 0 of 6, 0.4.4 allowed 8 of 8.
  Three negative controls stayed denied 8 of 8: the same helper with
  no sign of the logic in the session, moved logic plus one new
  branch, and a production write whose test was sent but never run.
- **Parallel dependent edits (#46): documentation only.** Each write
  is judged against the file on disk, before its siblings land, and
  the judge cannot tell a parallel sibling from a finished write.
  Telling it that a session action with no output yet is an in-flight
  sibling was tried and dropped. Where the sibling is visible, 0.4.3
  already allowed the call-site edit (6 of 6), and the instruction let
  a production write through when its test had only been sent and
  never run (6 of 6 allowed; 0.4.3 denied 6 of 6). `hooks/PROBITY.md`
  now says to send dependent edits one after another, and to extract a
  helper in place in the file that holds the logic before calling it
  from elsewhere.

## 0.4.3

The Kotlin TDD judge no longer blocks adding a new red test (#43).

- **Fast path missed tests inserted above another test.** The Kotlin
  fast path passes a write that adds exactly one `@Test` without an AI
  call. It located the inserted text with a greedy common prefix, so a
  test inserted ABOVE an existing test (an Edit anchored on the next
  test's header) shared the `@Test` / `fun` header text, the inserted
  span started mid-header, and the write went to the judge. The fast
  path now considers every equivalent placement of the insertion and
  uses the one holding the new test whole. The file is the same in
  every placement, so the existing safety checks are unchanged.
- **The judge demanded a failing run before a test could exist.** When
  a new test did reach the judge, it could apply "must be observed
  failing first" to the test write itself. The Kotlin judge
  instructions now state that adding a failing test is the red step and
  needs no prior run, whether the behavior is missing or present but
  wrong (including uncommitted production changes); the observed-red
  requirement applies only to the production write that follows.
  Checked against the live judge on a replica of the reported case: the
  0.4.2 instructions denied 3 of 3 runs, the new ones allowed 3 of 3.

## 0.4.2

Fixes for Claude Code sub-agents and git worktrees.

- **Sub-agent work is invisible to Probity (#40).** When a Claude Code
  sub-agent calls a tool, the hook payload carries the parent session's
  `transcript_path` plus an `agent_id`. The sub-agent's own tool calls
  are recorded only in `<session>/subagents/agent-<agent_id>.jsonl`, so
  every history-based rule judged sub-agent work against the parent's
  history. The characterization marker could never be released, and the
  TDD judge never saw a sub-agent's red runs. New bin `probity-claude`
  points `transcript_path` at the sub-agent's transcript, then runs
  Probity unchanged. **Action needed:** change the PreToolUse hook
  command to `cd "$CLAUDE_PROJECT_DIR" && ./node_modules/.bin/probity-claude`.
- **Large test output hid the proof (#40).** Claude Code keeps only a
  2KB preview of a large tool output in the transcript and saves the
  rest under `tool-results/`. The characterization removal check now
  reads that saved output, so a long Gradle run's `FAILED` line counts.
- **Worktrees blocked each other's commits (#39).** The mutation-probe
  and characterization commit gates scanned every file under the root,
  including linked worktrees Claude Code creates at
  `.claude/worktrees/agent-<id>/`. They now skip any directory holding
  a `.git` file (a linked worktree or submodule), and a commit made in
  a worktree nested inside the root is checked against that worktree's
  markers only. The target tree is read from `git -C <dir> commit` or
  `cd <dir> && git commit`, else the hook's working directory.
- Both gates now also trigger on `git -C <dir> commit` and
  `git -c key=value commit`; before, only the literal `git commit`
  was gated.

## 0.4.1

More preset options, so a project with its own conventions can call a
preset instead of copying its rules:

- KMP preset: `seamHint` (the core ambient-effect screen's pointer to
  your clock/randomness port), `conventionHint` (your telemetry
  convention, given to the adapter-observability judge), and
  `acceptanceLanguageGlobs` (which files get the acceptance Language
  Test, e.g. `*Spec.kt` only when driver/DSL files use other names).
- Kotlin preset: `conventionHint`.

Every default is unchanged.

## 0.4.0

Preset options, so projects stop forking rule lists:

- **KMP preset options (#19).** `kmpRuleEntries(root, options)` takes a
  `KmpPresetOptions` object: `specsDir`, `specGlobs`, `glossaryPath`,
  `coreGlobs`, `acceptanceTestGlobs`, `testRoots`, `testFilePattern`,
  `testDeclarationPattern`, `baselinePath`, `driverScopes`,
  `defaultScopes`. Each defaults to the previous hardcoded value, and
  the old `kmpRuleEntries(root, { driverScopes, defaultScopes })` call
  still works.
- **Excluding spikes and build output (#21).** The JS, Kotlin, and KMP
  presets take `excludeGlobs`, default `['spikes/**', '**/build/**']`,
  appended as `!` negations to every files-scoped block. Pass `[]` to
  turn it off. **Behavior change:** writes under `spikes/` or a `build/`
  directory are no longer checked by these presets' rules.
- **JS spec-to-test traceability (#18).** Setting `specsDir` on
  `jsRuleEntries` wires `requireSpecBackedAcceptanceTest`,
  `surfaceScenarioLinkBreakage`, `enforceSpecTestParity`, and (with
  `glossaryPath`) `surfaceGlossaryTermBreakage`, as the KMP preset
  does. Off by default.
- **TypeScript test declarations (#12).** New `JS_TEST_DECLARATION`
  matches vitest/jest/mocha `it(`/`test(` and their `.only`/`.skip`/
  `.each(...)(` variants; the JS preset uses it by default.
- New helper `withExcludeGlobs(entries, globs)` in `rules/scoping.ts`.

`probity-scope-report --allow-empty <glob>` (repeatable) marks a block
as expected to be empty, so a greenfield repository can run `--strict`
in CI from its first commit (#20). A flag that matches no block's glob
is a warning; a flag whose block now has files is noted.

## 0.3.0

Kotlin and KMP presets now wire the characterization round-trip the
Swift preset already had (issue #34). A test that pins behavior
production already has — for example a branch an independent mutation
review found untested — is born green, so no red can precede it, and
the TDD judge could block it with no honest way forward. Now:

- a test-source write (`src/test`, or any `src/<name>Test` source set)
  carrying `// probity: characterization` above the test passes without
  the judge; the marker does nothing in production source;
- the marker comes off only when the session transcript records that
  test failing (typically under a `// probity: mutation-probe`), and the
  new `enforceCharacterizationResolution` commit gate blocks `git commit`
  while any marker is on disk;
- `withCharacterizationTest` (all presets that use it) appends a note
  naming the marker when it denies an unmarked test-layer write for
  lacking a red, and resolves backticked Kotlin test names
  (``fun `rejects blank ids`()``) in full for the removal proof.

**Behavior change:** Kotlin/KMP commits are now blocked while a
`probity: characterization` marker is on disk. No existing project
carries the marker unless it opted in.

The TDD judge in every preset reports a judge that returned no verdict
as an infrastructure failure (issue #32). A spend-limit, quota, or auth
notice used to surface as `could not parse verdict from validator
output: …`, which reads as a rejection of the change. The write is
still blocked (fail closed), but the deny text now says it was not
judged, whether the provider reported itself unavailable, and which
writes still pass deterministically. The wrapper is exported as
`withJudgeFailureDiagnostics` from `rules/gates.ts`.

`probity-scope-report` no longer flags test files under a core-purity
rule as "adapter/DI/UI-looking" (issue #26). A test-wide
`forbidContentPattern` (such as a no-mocking-library screen over every
test source set) legitimately covers adapter tests; the old warning
suggested excluding them, which would weaken the check. Production
adapter paths are still flagged.

## 0.2.3

`enforceSpecTestParity` now inspects the pending Git commit before scanning
specifications and acceptance tests. It runs only when that commit records the
specs path (including a git-submodule pointer) or a path matching the configured
acceptance-test pattern; Git inspection failures retain full enforcement.

This restores the documented specs-first order for projects whose specs live in
a separate repository: committing an `@wip` removal inside the specs checkout,
or committing unrelated parent-repository work while that checkout is dirty, no
longer scans an uncommitted submodule worktree that cannot yet contain its
covering SDK test. The later parent commit that records the new specs pointer or
acceptance test still enforces bidirectional parity. No config change is needed.

## 0.2.2

Kotlin and KMP presets now retain up to 20 recent session events, each
clipped at 6,000 characters, for the AI TDD judge. This keeps a nearby
targeted red visible after normal source inspection while bounding prompt
growth. Their Kotlin-specific guidance also makes explicit that:

- as an exception to generic placeholder guidance, a targeted relevant test
  executing `TODO()`/`kotlin.NotImplementedError` is clean red without a
  second assertion-failure run, while implementation remains bounded by
  assertions in that test source visible in recent history;
- compile/import/signature failures authorize scaffolding only, not the
  asserted production behavior;
- one observed failure may drive one cohesive write across every method or
  branch those visible assertions require, without artificial reruns
  mid-write; and
- Git staging/index state is irrelevant to the judgment.

JavaScript and Swift presets retain their existing instructions and history
windows.

## 0.2.1

`requireGreenTestRun`'s Kotlin/Gradle defaults are stricter and cover more
real Gradle usage:

- Accepts `build`/`check` (run tests without the word "test"),
  module-qualified tasks, `allTests`, `jvmTest` — but rejects `--dry-run`,
  `-x`/`--exclude-task`, flag values that read like a task (`--args=build`),
  and lookalike tasks that don't run one (`assembleAndroidTest`, ...).
- Recognizes verification invocations inside compound/piped strings while using
  a structured command check to reject `./gradlew test; echo gradlew` as proof
  from exit status alone.
- Under Kiro, a quiet run with no `BUILD SUCCESSFUL` banner is accepted via
  the tool result's structured `exit_status`, only when that Gradle
  invocation is provably last; piped/chained/`|| true` runs still need the
  banner. A malformed envelope or non-zero `exit_status` is always red.
- Failure detection also recognizes `FAILURE:` and `Execution failed for
  task`.
- `gates.ts`'s `requireGreenTestRun` gained additive, optional hooks:
  `commandPredicate`, `extraSuccessPredicate`, `extraFailurePredicate`.
  Unused by default; no behavior change for existing callers.
- Fixed an isolation defect: the Swift preset no longer inherits
  Gradle-flavored deny text or the Kiro shortcut — both apply only when
  `command` is referentially `GRADLE_TEST_COMMAND`.
- `options.reason`, when set, now appends on both deny paths (previously
  only "no run recorded" did).

## 0.2.0

Kotlin presets now receive the ast-grep Kotlin parser automatically through
exact-version optional dependencies. A normal `@jjchill/probity-rules`
install can therefore recognize a single new red `@Test` deterministically
instead of silently sending it to the AI TDD judge.

The Kotlin fast path is also conservative: only a Kotlin test-source write
that adds one runnable, structurally annotated test and preserves every prior
source byte and test function bypasses the judge. Existing files may make one
contiguous insertion containing only the test (plus comments/whitespace) or a
separate test class with no additional functions; brand-new files may include
imports and property fixtures. Test deletion, disabling or weakening, new disable controls, changes
to existing test-container headers, declarations that shadow identifiers used
by existing tests, and multi-test additions continue to delegate. Production-source paths now always delegate, closing a
latent bypass that becomes material when parser support is installed by
default. If parser support or current-file content is unavailable, the
delegated result carries an explicit fast-path-unavailable diagnostic. As
with Probity's built-in fast paths, a deterministic pass skips the AI judge's
refactor-readiness check for that write.

The optional parser packages include platform-specific native artifacts and
the Kotlin grammar's install script. npm tolerates an unsupported optional
install and the rule falls back as above; consumers that do not use Kotlin or
need to avoid optional install work can use `npm install --omit=optional`.

## 0.1.0

First packaged release. Previously, consumers `cp`'d `probity.config.ts` +
`rules/` + `scripts/` into their project; rule fixes in this fork never
reached them. Rules and scripts are now a versioned npm package
(`@jjchill/probity-rules`); the config stays project-owned and imports
preset factories from the package.

Migrating from the copied-templates layout:

- `./rules/<x>.js` imports → `@jjchill/probity-rules/rules/<x>`
- `npx tsx scripts/scope-report.ts` → `npx probity-scope-report`
- `node scripts/spec-parity.mjs` → `npx probity-spec-parity`

Or run `/probity-update`, which detects the legacy layout and offers to
migrate it for you.
