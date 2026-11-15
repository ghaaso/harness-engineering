# Harness v2: what the two refuter passes changed (2026-11-11)

Two Opus refuters attacked the first draft of `design.json`: one on fidelity to the record (`refute-fidelity.md`, 27 findings), one on soundness and coverage (`refute-design.md`, 23 attacks). The main session checked their cited lines against the evidence before ruling. Rulings are the main session's. "Taken" means the data was changed; the page and the record are generated from it.

## Fidelity pass

| # | Finding | Ruling | What changed |
| --- | --- | --- | --- |
| 1 | The write probe ran in bypass mode; which cause hit the clinic is unknown | Taken | B16's correction and diagnosis say so; the 15-minute probe stays the first step |
| 2 | Round three of the cutoff-guards chain was an Opus re-review; the root read only the last diff | Taken (checked: sweep-tables.txt:66, sweep-cards.txt:141, 186) | Fix-round demo step 7 and B01's diagnosis reworded |
| 3 | A fresh reviewer is new spend, not "moved" | Taken | Budget ledger: "added, capped"; phase 3's agent cost rewritten |
| 4 | Two more recorded waits (700 s, 742 s) | Taken (checked: map-full.txt:257) | 19 waits, median 409 s; the build script recomputes both |
| 5 | "Tokens did not stop the build" overstates | Taken | "The three-day stop was a power-off"; limits on other days are named as unmeasured |
| 6 | Settings and an outside benchmark were tagged measured | Taken | A fifth tag, Setting, for chosen values; the vendor benchmark's numbers were removed; two unused inferred figures dropped |
| 7 | "5 of 6 high-risk" needs its caveat | Taken | The number's source, the glossary, the merge demo and the limits say the list was never named |
| 8a | The 3 owner hours were counted twice | Taken | One figure, for the replay's human sample and the three-merge trial together |
| 8b | "71 such ideas as brief lines" misdescribes the 71 | Taken | Phase 3's reason reworded: 71 practised, 33 worked, 38 failed |
| 8c | "29 of 87 reduce to eleven" is off by the promoted idea | Taken | "All but one of those thirty" |
| 8d | Phase 1 said the idea lists reach none of it | Taken | "One small guard" |
| 8e | "Accepted only by its replay" contradicts mechanisms 5, 10, 11 | Taken | Each mechanism states its own test; mechanism 7 is a baseline count |
| 8f | "Seven decisions" against 19 cards | Taken | Thesis reworded; a note on the board explains seven problems, 22 cards |
| 8g | Mechanism 2 dropped the flaky-test rerun rule | Taken | Stated as an open point |
| 8h | Auto-archive on PR close cannot fire without a remote | Taken | B15 names only the idle-session setting |
| 8i | The 11 November merge was shown as "moved after review" | Taken | The merge demo now asks who read the final commit, not whether the branch moved |
| 8j | "This happened on most slices" | Taken | "On record for three branches" |
| 8k | Queue durations came from different code | Taken | Windows alone is now the same-code figure (367 s); the mismatch of days is an on-screen assumption |
| Demos | Each assumption list was short | Taken | Seven assumptions added across the six demos |
| Notes 22 to 27 | Root baseline, D-card wording, the 48-agent caveat, a double count in phase 4, 65 against 36 merges | Taken, except the last | The page keeps the compile's "65 recorded merges" and notes that 36 went straight onto main |

## Soundness pass

| # | Attack | Ruling | What changed |
| --- | --- | --- | --- |
| 1 | The one budget ignores FixFlow, which shares the PC and the usage limit | Taken | Rule 1 covers agent lanes as well as the Docker gate; a scope line says v2 runs on the clinic build only |
| 2 | The budget rule starts in phase 1 but its figure was set in phase 5 | Taken | The figure is decision D07, under phase 1, due before the first replay |
| 3 | The netting does not net; replays and probes were uncounted | Taken | Ledger rewritten with every replay and probe that has a count on record |
| 4 | The gate workflow was assumed but never built | Taken | A phase 3 build, after a probe that a workflow agent can run the check |
| 5 | Same as fidelity 5 | Taken | |
| 6 | Restarting every database at sign-in adds load before the diagnosis | Taken | Two databases at most until diagnosed; the second-slot condition needs days with build load |
| 7 | Bottlenecks claimed by more than one phase | Taken | Builds have `answers` (home phase only, enforced by the build script) and `supports` |
| 8 | Same as fidelity 8e | Taken | |
| 9 | Missing owner decisions: a battery backup, the reports folder, board edits by script, the nightly scheduled task; D10's options | Taken | D08 and D13 added; D15 widened; D02 and D06 name the scheduled task and the sign-in script; D12's option carries "stale when the code changes, never by age" |
| 10 | D02's lean was ambiguous about leaving the PC | Taken | "An encrypted external drive"; a cloud folder sits with the third-party option. One fact was checked by one command: `cleanupPeriodDays` is not set in the user settings file |
| 11 | D17 hid what leaves the PC | Taken | The card says code, a test database and alerts leave for a day, with made-up data only |
| 12 | The candidate-fix replay was dropped without a decision | Partly | Not scheduled, because it costs agent runs against the one budget. It is now decision D20, and the cheap half (a test written first, a scripted guard removal) stays in |
| 13 | The touch list was used but never tested | Taken | A zero-token test on the ten recorded cases is a phase 3 build, with the compile's two drop rules |
| 14 | Two samplers where the compile asks for one | Taken | One logger, set up in phase 1, read in phase 2 |
| 15 | The reaper could remove an open session's worktree | Taken | It skips any worktree whose session is still open |
| 16 | Lowering the stall limit needs a false-kill proof | Taken | 20 runs on a loaded day first |
| 17 | The reason for phase 4's place was wrong | Taken | It draws on check minutes, rig memory and the owner's presence |
| 18 | Phase 1 competes with P0a for the owner's time | Taken | "Your part of phase 1 comes after P0a" |
| 19 | Not-built list incomplete | Partly | The frozen validation contract line was added. The 22 downgraded ids are not listed one by one: they are inside the 58 FixFlow-only ideas, and the number's source says so |
| 20 | An unrecorded reordering inside phase 3 | Taken | Listed under the order changes |
| 21 | Same as fidelity 4 | Taken | |
| 22 | D04 omitted that keep-awake is already on | Taken | |
| 23 | One conflict's resolution was shortened | Taken | The dropped sentence is back |
| Plain language | Ten rewrites | Taken | "changed lines", "Windows-side tools", "with-and-without test", "re-read tokens", and the rest |

## What neither pass could check

- The ship plan's section 0 was outside the fidelity refuter's folders. The soundness refuter worked from a reader's summary of it (`read/rules-and-prs.md`).
- Neither refuter opened the clinic repository. Every claim rests on the compile's evidence files.

## Architecture pass (after the owner asked for the architecture itself)

One Opus refuter ran the model code unchanged in node and checked the claims (`refute-architecture.md`, 14 items). It confirmed that the flows conserve slices and that the steady-state function agrees with the run to within 5 %. Rulings:

| # | Finding | Ruling | What changed |
| --- | --- | --- | --- |
| 1 | Which limit binds first rests on guessed numbers, above all the token window | Taken | The token window is a slider; the page says the order of the limits depends on it; October's runs fitted about 2.5 lane-hours and the page says so |
| 2 | The default run never showed the token loop, and "all merged" was the tail of a smooth model | Taken | A plan counts as merged when under half a slice is left; the window slider makes the stop fire; stops are counted in the summary |
| 3 | The library's saving was counted twice and it cost nothing | Taken | It lowers token burn only; every lookup costs; with few entries it costs more than it saves. Its exposure is the compile's later figure: lookup-only calls re-read 43.6 % of tokens |
| 4 | A smooth model has no queue below a limit, so "lanes at the knee" means full use | Taken | The planner runs at about 0.8 of the knee; the parameter note that claimed a calibration to recorded waits was removed |
| 5 | Five loops were drawn but not computed | Taken | The governor now slows the lanes in the equations; the planner sets the lanes; entries go stale with merges, not with time; the scheduler staggers starts. R1 and R2 are stated as what they are in the model: a measured share and a measured average |
| 6 | "The merges broke main" was wrong | Taken (checked: sweep-cards.txt:178-181) | The first check on merged main failed for two slices, on hand edits to shared documents |
| 7 | The plan check widened waves without shortening the plan, and missed read-write conflicts, sizes, slice-level starts and footprint enforcement | Taken | The objective is the shortest finish; a sixth declaration (what a slice reads); eight rules; the sample plan now shows a check that costs a wave and a re-split that wins it back |
| 8 | Review had unlimited capacity | Taken | Review is one gate at a time. In the testbed the root also merges. With the page's numbers the testbed's first limit is the root, and v2's is the review |
| 9 | Three numbers tagged measured were comparisons or estimates | Taken | The context factor, the context mix and the route-by-window line are tagged as estimates or as a comparison across models |
| 10 | FixFlow's 7,500 tokens is not a subagent's fixed cost | Taken | The comparison was removed |
| 11 | The second slot should use the measured two-at-once check times | Taken | 266 to 267 s in the container, 435 s on Windows |
| 12 | The library departs from the knowledge-store design without saying so, and names no writer or trigger | Taken | The three departures are listed; each way it changes names who writes and when; that design's stop rule is carried over |
| 13 | The residency calculator leaves out the lookup turn and compaction | Partly | Each route costs one call, the same for all three, so it is left out and the page says so; compaction is named as ending the re-reading early |
| 14 | Missing from the architecture: the owner and the machine's availability; a governor that works without knowing how re-reads count; a failing lane; pass bars per part; one budget for reviewers and replays; isolation per lane | Taken | Each part now has "how we will know it works"; the governor learns the window from limit messages and holds one budget; the scheduler returns a failed lane's slice to the backlog; lanes state their isolation; what the model leaves out is listed |

## Window-fill addition (11 November, owner-approved, relayed by the parent session)

The compile gained a checked measurement of what fills session windows (its §6; `evidence/harness-bottlenecks/fill/`). Folded in as data; both pages and the record are generated from it.

| # | Change | Where |
| --- | --- | --- |
| a | The two exposures replace any reading that an index cannot touch slice-session windows: fetched content is about 27 to 28.5 % of context, and calls that only read or search re-read 43.6 % of all tokens. Both are exposures, not savings, and they overlap | Architecture page: the library's standing, the token section, the limits. Plan page: phase 5 lever 1, the limits |
| b | Graph server, model-built graph and embeddings stay out, for the outside evidence and this PC's memory. The 6 to 17 % result is now stated as what it was: a compaction adapter on another project, which tested no index and no graph | Plan page: "What is not being built". Both number registries. Loop R3 |
| c | The zero-token index replay is a candidate trial: a phase 3 build beside the touch-list test, after the sealed replay exists. It adds nothing before phase 1 and delays nothing. Its pass marks are a new decision card, D23, with the refuter's 3 % and 0.8 as one option and no lean | Plan page: phase 3, D23. Architecture page: the library's standing and proof, build order |
| d | Two pictures: what the windows hold (one bar), and a read costs by staying (19 million in, about 950 million processed) | Architecture page, token section |
| e | Decision cards: 22 become 23. The six starting decisions are unchanged | Plan page |

Also corrected: the earlier "7.0 points of re-opened files" reading. Nearly all of it is another part of the same file; content seen earlier in the same window is 0.5 to 1.5 %, so a cache of files already read saves almost nothing. The limits the measurement carries are on the page: estimates; the path key is the last two segments; the first run counted some heredoc writes as reads; output tokens are left out; how cache reads count against the plan's limits is unknown; whether the fetched content was needed is unmeasured; nothing shows a shorter digest can stand in for the lines.
