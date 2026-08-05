# Standing Constraints — included by reference in every dispatch kickstarter

Every builder and reviewer kickstarter includes this file by reference (one line: "Standing constraints apply — `plugins/foreman-line/docs/kickstarters/STANDING-CONSTRAINTS.md`"). Each rule below was earned on a real defect; the lesson number links to `docs/transcripts/defects_lessons.md` for provenance. Coordinator-side rules (shell discipline, closure checks, pre-PR gates) live in the coordinator carryover and COORDINATOR-PATTERN.md, not here.

## Builder — universal

1. **Typed try-catch at every external boundary a public API exposes.** Every external call (third-party library, Node.js I/O, network) reachable through your module's public API is wrapped in try-catch and rethrown as the module's own typed error class. Loads and writes both count; "never happens in practice" is not an exemption. (#22)
2. **Seams your tests never exercise return `unknown`.** If a fetch/adapter seam is injected/mocked in every test and its real implementation never runs in the suite, its return type is `unknown` (or a raw parsed type) — never a confident cast to the domain type the tested code consumes. Normalization/validation happens explicitly at the boundary, where it can later be tested against a real response. (#28)
3. **Default-deny gates test every structural invariant independently.** A gate parsing a `SEGMENT-SUFFIX` token ships one test per invalid shape: no delimiter, delimiter at position 0, empty prefix, empty suffix — all rejected. Checking one property while assuming the rest is default-deny-with-exception, not default-deny. (#30)
4. **Sanitize interpolated external data before emission into any line-based protocol.** GitHub annotations, log sinks, Slack messages, terminal escapes: the protocol's delimiter (newline, `::`, `\x1b`) is an injection vector if it can appear in the data. Strip/replace before it enters the template, regardless of how "trusted" the source seems. (#31)
5. **Linear-time string handling when parsing untrusted text.** Required CI scanners (CodeQL polynomial-redos) are a fourth verification net that fires after assembly — write linear-time regexes/string ops up front and pin them with hostile-input tests. (#19)

12. **Parcel-time freezes live in the deterministic pass, not the shipped suite.** A test asserting a file is byte-unchanged (or append-only) versus a moving `origin/main` proves *your parcel's* discipline — so it belongs in the coordinator's Stage-D/E `git diff` checks and dies with the parcel. If a file needs permanent protection, pin the invariant (export set, schema shape, frozen union) — never the bytes, which encode incidental order that tooling (organizeImports, formatters) legitimately changes. A shipped byte-pin hard-blocks every future chartered change to that file on its own PR. (#34)

13. **Allowlists and waivers pin identity, location, AND value.** A waiver keyed on a name alone can be squatted by a new artifact wearing that name; a waiver that suppresses a violation class regardless of value forgives future defects, not just historical ones. Pin all three axes (e.g. basename + parent directory + exact historical literal), and test each axis's refusal independently. (#36)

## Builder — conditional

6. **Classifier/heuristic parcels:** fixtures MUST cover the naming conventions that dominate real codebases (camelCase, concatenated, abbreviated), not just the canonical/textbook form — and for a *safety* classifier, the under-detect (false-negative) direction gets the most fixtures. (#29)
7. **Kompress-touching parcels:** probe content length before assembly; the ~200-token router:noop threshold is an effective ceiling in coordinator/builder sessions. Content above it is a stop condition requiring a coordinator ruling — never a silent retry. (#23)

## Reviewer

8. **Hostile-input probing is licensed.** You MAY run small one-off scripts against the live process boundary; green ACs verify the fixture space, not the input space. (#12)
9. **Prose-only contracts: attempt the naive reading.** For a parcel whose contract is prose rather than code, "is this unambiguous?" is answered by implementing the wrong-but-literal reading and showing the text excludes it — not by confirming the intended reading is present. (#14)
10. **Post-review git-detection control.** Every review cycle ends with an assertion of no commits/dirty files in the reviewer worktree; the permission envelope is a layer, not the guarantee. (#24)
11. **Mutate the fixture to prove each assertion binds to its named invariant.** For any test whose name claims an invariant (`…A→F chain…`, `…rejects hostile…`, `…inherits correlationId…`), read the validator it calls and confirm that function actually checks that property — then break the fixture in the named dimension and confirm the test fails. An invariant that lives in a *different* exported function (e.g. `isSealed` vs `validateChain`) is not checked just because the sibling was called. Passing is not evidence; failing-when-broken is. (#32)
