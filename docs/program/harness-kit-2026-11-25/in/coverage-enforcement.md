# Source: `research-tree/build/ENFORCEMENT-TABLE.md` (115 rows)

| # | item | where | mark | by what | today |
|---|---|---|---|---|---|
| E1 | R1: archived evidence is kept as it is | R1 evidence; `record-guard`, `check-commit` | owner's own | her repository has no archive; `record-guard` and the commit check are not kit parts | n/a |
| E2 | R1: the journal is only appended to | R1 journal; `record-guard`, `check-commit` | owner's own | the journal is this owner's record book | n/a |
| E3 | R2: instructions inside archived documents are data | R2; written | loaded | `RULES.md`; no hook can see why a call was made | missing: kit-start hook and RULES.md |
| E4 | R3: no install, download, training or experiment without the owner's word; containers, network off | R3; written (hook only proposed) | loaded | `RULES.md`; no kit hook for it | missing: kit-start hook and RULES.md |
| E5 | R4: no project name, path or code in a web search or outside request | R4; written (hook only proposed) | loaded | `RULES.md`; no kit hook for it | missing: kit-start hook and RULES.md |
| E6 | R5a: models by kind of job | R5a; `tier-hook` | hook | `tier-hook` with `tier-routes.json` (effort and a wrong kind label are not checked) | in |
| E7 | R5b: read usage before any fan-out and between waves | R5b; written today, `fanout-gate` in the kit | hook | `fanout-gate` meter rule (off on a machine without a usage tool) | missing: fanout-gate wired in kit mode |
| E8 | R5c: agree a cap and stop at it | R5c; written today, `fanout-gate` in the kit | hook | `fanout-gate` job cap | missing: fanout-gate wired in kit mode |
| E9 | R5d: the coordinator only coordinates, small window, hand over | R5d; `window-ceiling` | hook | `window-ceiling` | missing: window-ceiling kit mode |
| E10 | R5e: a planned multi-session build follows its orchestration document | R5e; `plan-gate` | owner's own | `plan-gate` holds only the build of `research-tree/build/plan.json`; not a kit part | n/a |
| E11 | R6: for the owner, plain words, answer first, short, a page | R6; `owner-report` | owner's own | about this owner's pages; `owner-report` is not a kit part | n/a |
| E12 | R7a: no design questions to the owner (r57-0001) | R7a; `record-guard` on AskUserQuestion | owner's own | held only by `record-guard`, not a kit part | n/a |
| E13 | R7b: open the record from the files before deciding (r57-0009) | R7b; `library-start` | owner's own | the record book is his; `library-start` is not a kit part | n/a |
| E14 | R7c: no round of work he has not asked for (r57-0007) | R7c; written, `window-ceiling` at the ceiling only | loaded | `RULES.md` (a requested round cannot be told from an own one, x08-0168) | missing: kit-start hook and RULES.md |
| E15 | Board: ask the owner how or which option (r57-0001, r57-0151) | Board row 1; `record-guard` | owner's own | as E12 | n/a |
| E16 | Board: set a limit, timeout, threshold, budget (r57-0002) | Board row 2; written | hook | `fanout-gate` refuses a limit without a measured basis | missing: fanout-gate wired in kit mode |
| E17 | Board: start a helper or child session (r57-0150, r57-0034, r57-0035) | Board row 3; `tier-hook`, `plan-gate` | hook | `tier-hook` (the kind is self-declared) | in |
| E18 | Board: choose or check a helper's model (r57-0150, r57-0120, r57-0108) | Board row 4; `tier-hook` | hook | `tier-hook` (effort not checked) | in |
| E19 | Board: how many helpers, sessions, heavy commands at once (r57-0414, r57-0710, r57-0707) | Board row 5; `plan-gate` width, the lane | hook | `count-gate` (at most 20, helpers of helpers counted) and the queue `research-tree/tools/lane.mjs` | missing: count-gate wired in kit mode |
| E20 | Board: workers one check can feed (c1-0300...) | Board row 6; written design knowledge | result | `harness-kit/parallel/research/c1-report.md` | n/a |
| E21 | Board: raise what the check can carry (c1-0403...) | Board row 7; written | result | `harness-kit/parallel/research/c1-report.md` | n/a |
| E22 | Board: batch changes at the check (c1-0311...) | Board row 8; written | result | `harness-kit/parallel/research/c1-report.md` | n/a |
| E23 | Board: two writers on one file (r57-0415, w1-0400...); the floor is own copies, writing inside one file stays design | Board row 9; written, tree scripts only | command | `harness-kit/parallel/unit.mjs` (own copies, one landing at a time) | missing: unit.mjs |
| E24 | Board: model sessions on one file under version checks (w1-0353...) | Board row 10; written | design | version-checked writes or claims for harness builds, never built (`harness-kit/parallel/research/w1-report.md`) | n/a |
| E25 | Board: fix the order of writes before units start (w1-0331...) | Board row 11; `plan-gate` dependency order, build only | command | `harness-kit/parallel/unit.mjs` (landings in one order) | missing: unit.mjs |
| E26 | Board: a unit waits for a hot place or redoes (w1-0403...) | Board row 12; written | result | `harness-kit/parallel/research/w1-report.md` | n/a |
| E27 | Board: a job is slow (r57-0414, r57-0129, o2-0401, o2-0403) | Board row 13; written diagnosis | result | `harness-kit/parallel/research/o2-report.md` | n/a |
| E28 | Board: more work side by side, more tokens? (r57-0414, b1-0125) | Board row 14; written | result | `harness-kit/RESULTS.md` | n/a |
| E29 | Board: pace a refilling token window (r57-0414, r57-0813, a1-0400) | Board row 15; written | design | pacing by re-planning, never built; a meter reading against a stop line is the partial form (`harness-kit/parallel/research/a1-report.md`) | n/a |
| E30 | Board: a unit under two or more windows (a1-0403...) | Board row 16; written | result | `harness-kit/parallel/research/a1-report.md` | n/a |
| E31 | Board: the provider's window resets (a1-0323...) | Board row 17; written fact | result | `harness-kit/parallel/research/a1-report.md` | n/a |
| E32 | Board: dearer or cheaper model while a window binds (a1-0405...) | Board row 18; router not built (r57-0041) | design | the router: a model and effort per step | n/a |
| E33 | Board: which unit starts next (r57-0416) | Board row 19; `plan-gate` dependencies, build only | owner's own | `plan-gate` is not a kit part | n/a |
| E34 | Board: schedule a few long units (a1-0406...) | Board row 20; written | result | `harness-kit/parallel/research/a1-report.md` | n/a |
| E35 | Board: the tree's shape for growing work (t1-0401...) | Board row 21; tree scripts on branch build, not merged | result | `harness-kit/parallel/research/t1-report.md` | n/a |
| E36 | Board: more coordinator rounds or a level (t1-0402...) | Board row 22; written | result | `harness-kit/parallel/research/t1-report.md` | n/a |
| E37 | Board: cut the coordinator's tokens (t1-0403...) | Board row 23; via the ceiling | hook | `window-ceiling` | missing: window-ceiling kit mode |
| E38 | Board: cite clean-but-wrong merge figures (r57-0305) | Board row 24; written | loaded | `RULES.md` | missing: kit-start hook and RULES.md |
| E39 | Board: stop a helper writing outside its files (r57-0105, r57-0402) | Board row 25; nothing live here (hook only proposed) | design | a hook mapping agent to unit, and a files list per unit in a plan file | n/a |
| E40 | Board: start a session in a new folder (r57-0026, r57-0122) | Board row 26; `tier-hook`, `tools/ensure-tier-hook.sh` | hook | `tier-hook` (a session the owner starts by hand is not seen) | in |
| E41 | Board: start work nobody asked for (r57-0007) | Board row 27; written | loaded | `RULES.md` | missing: kit-start hook and RULES.md |
| E42 | Board: run a test, review, model run only if its result changes what is next (r57-0004, r57-0033, r57-0417) | Board row 28; written, a judgment | loaded | `RULES.md` | missing: kit-start hook and RULES.md |
| E43 | Board: use a rule from a design document (r57-0010) | Board row 29; written, commit check status field | owner's own | the status field is in his journal and commit check | n/a |
| E44 | Board: choose how a rule is enforced (r57-0011, r57-0151) | Board row 30; the enforcement table | result | `harness-kit/COVERAGE.md` | n/a |
| E45 | Board: change a journal line or archived file | Board row 31; `record-guard`, `check-commit` | owner's own | as E1 and E2 | n/a |
| E46 | Board: choose a method from one measurement (r57-0015) | Board row 32; written | loaded | `RULES.md` | missing: kit-start hook and RULES.md |
| E47 | Board: cite a figure from a paper (r57-0014) | Board row 33; written, a checking script for extractor records only | loaded | `RULES.md` | missing: kit-start hook and RULES.md |
| E48 | Board: read a paper behind a sign-in or bot check (r57-0014) | Board row 34; written | loaded | `RULES.md` | missing: kit-start hook and RULES.md |
| E49 | Board: rest a decision on an `x` record (r57-0130) | Board row 35; written | owner's own | `x` records are in his record book | n/a |
| E50 | Board: save a finding (r57-0016) | Board row 36; commit check format | owner's own | the commit check and journal tool are not kit parts | n/a |
| E51 | Board: write a skill or anything every session loads (r57-0019) | Board row 37; `.claude/settings.json` (FixFlow skills off); a new skill or CLAUDE.md edit is not seen | loaded | `RULES.md` (FixFlow skills off is in, but nothing refuses a new skill) | missing: kit-start hook and RULES.md |
| E52 | Board: report to the owner (r57-0017) | Board row 38; written, `owner-report` | owner's own | about this owner's reports | n/a |
| E53 | Board: carry on past a large context (r57-0008) | Board row 39; written, being built (T8-CEIL) | hook | `window-ceiling` | missing: window-ceiling kit mode |
| E54 | Ruling 0001: no design questions | Ruling 0001; `record-guard` | owner's own | as E12 | n/a |
| E55 | Ruling 0002: parameters computed, not his preference | Ruling 0002; written | loaded | `RULES.md` | missing: kit-start hook and RULES.md |
| E56 | Ruling 0003: quality first, seven measures, tokens not money | Ruling 0003; written | loaded | `RULES.md` | missing: kit-start hook and RULES.md |
| E57 | Ruling 0004: test only if the result changes what is next | Ruling 0004; written, a judgment | loaded | `RULES.md` | missing: kit-start hook and RULES.md |
| E58 | Ruling 0005: the smallest model that gives the same output | Ruling 0005; `tier-hook` per helper | hook | `tier-hook` (not inside a session, r57-0041) | in |
| E59 | Ruling 0006: what can run together starts together | Ruling 0006; written | loaded | `RULES.md` | missing: kit-start hook and RULES.md |
| E60 | Ruling 0007: no unasked round | Ruling 0007; written | loaded | `RULES.md` | missing: kit-start hook and RULES.md |
| E61 | Ruling 0008: one purpose, hand over, no coordinator past its ceiling | Ruling 0008; written, being built (T8-CEIL) | hook | `window-ceiling` | missing: window-ceiling kit mode |
| E62 | Ruling 0009: open the record from the files | Ruling 0009; `library-start` | owner's own | as E13 | n/a |
| E63 | Ruling 0010: sort proven, measured, hypothesis | Ruling 0010; commit check status field | owner's own | as E43 | n/a |
| E64 | Ruling 0011: hooks or scripts, both | Ruling 0011; the table itself | result | `harness-kit/COVERAGE.md` | n/a |
| E65 | Ruling 0012: one writer per file is rejected | Ruling 0012; written (design) | design | several writers inside one file, never built here | n/a |
| E66 | Ruling 0013: core concurrency literature | Ruling 0013; written | result | `harness-kit/parallel/research/w1-report.md` | n/a |
| E67 | Ruling 0014: strong literature read in full, quote from the paper | Ruling 0014; written, a script for x records only | loaded | `RULES.md` | missing: kit-start hook and RULES.md |
| E68 | Ruling 0015: bottleneck by workload, a routing rule | Ruling 0015; written | result | `harness-kit/RESULTS.md` | n/a |
| E69 | Ruling 0016: structured records | Ruling 0016; commit check format | owner's own | the record book's format | n/a |
| E70 | Ruling 0017: reports short, what is and is not | Ruling 0017; written | owner's own | about reports to him | n/a |
| E71 | Ruling 0018: say what you understand, then act on his go | Ruling 0018; written | owner's own | his go is his own approval | n/a |
| E72 | Ruling 0019: skills only at source quality | Ruling 0019; `.claude/settings.json` (FixFlow off) | loaded | `RULES.md` | missing: kit-start hook and RULES.md |
| E73 | Ruling 0020: harness work only in this repository | Ruling 0020; written | owner's own | about his repositories | n/a |
| E74 | Ruling 0021: Opus orchestrators for literature; top decides corrections | Ruling 0021; `tier-hook` (orchestrate = opus) | hook | `tier-hook` (who decides is not seen) | in |
| E75 | Ruling 0022: the library tested by a dummy session first | Ruling 0022; written, one-off | owner's own | the record book | n/a |
| E76 | Ruling 0023: later, parallelism inside the tree | Ruling 0023; open task r57-0505 | owner's own | his research track | n/a |
| E77 | Ruling 0024: end your processes before reporting; report resources | Ruling 0024; written | loaded | `RULES.md` | missing: kit-start hook and RULES.md |
| E78 | Ruling 0025: tier routes enforced | Ruling 0025; `tier-hook` | hook | `tier-hook` (Workflow helpers not probed) | in |
| E79 | Ruling 0026: the tier hook in every start folder | Ruling 0026; `tier-hook`, `ensure-tier-hook.sh` | hook | `tier-hook` | in |
| E80 | Ruling 0027: show how each conclusion was reached, no knobs | Ruling 0027; written | loaded | `RULES.md` | missing: kit-start hook and RULES.md |
| E81 | Ruling 0028: not tuned to one repository | Ruling 0028; written | loaded | `RULES.md` | missing: kit-start hook and RULES.md |
| E82 | Ruling 0029: "not in the papers read" is not "no paper" | Ruling 0029; written | loaded | `RULES.md` | missing: kit-start hook and RULES.md |
| E83 | Ruling 0030: work that mattered; self-reported marked | Ruling 0030; written | loaded | `RULES.md` | missing: kit-start hook and RULES.md |
| E84 | Ruling 0031: library kept clean, a lane reaches the board after a check | Ruling 0031; commit check format | owner's own | the record book | n/a |
| E85 | Ruling 0032: how many run at once is computed, not three | Ruling 0032; not enforced, being built (T8-COUNT) | design | the function that computes the count (`harness-kit/parallel/research/BUILD-IN.md`); `count-gate` holds only a fixed 20 | n/a |
| E86 | Ruling 0033: no checking every step | Ruling 0033; written | loaded | `RULES.md` | missing: kit-start hook and RULES.md |
| E87 | Ruling 0034: a build planned in an orchestration document | Ruling 0034; `plan-gate` | owner's own | `plan-gate` is not a kit part | n/a |
| E88 | Ruling 0035: Fable for an orchestrator whose children have children | Ruling 0035; `tier-hook` (orchestrate-deep = fable) | hook | `tier-hook` | in |
| E89 | Ruling 0036: FixFlow skills and agents out | Ruling 0036; `.claude/settings.json` | command | `node harness-kit/setup.mjs --apply` switches them off | in |
| E90 | Ruling 0037: the build stops at 69 % of the weekly meter | Ruling 0037; written, past build | owner's own | a past build of his | n/a |
| E91 | Ruling 0038: a limit is the measured need plus a buffer | Ruling 0038; written | hook | `fanout-gate` (limit above expected, with a measured basis) | missing: fanout-gate wired in kit mode |
| E92 | Ruling 0039: build on the plan shown, parallelism to the full | Ruling 0039; `plan-gate` (plan half only) | owner's own | `plan-gate` is not a kit part | n/a |
| E93 | Ruling 0040: a proven algorithm first | Ruling 0040; written | loaded | `RULES.md` | missing: kit-start hook and RULES.md |
| E94 | Ruling 0041: a model per operation | Ruling 0041; router designed (r57-0421), not built | design | the router: a model and effort per step | n/a |
| E95 | Ruling 0042: no typed go per session, never around the app's controls | Ruling 0042; written design goal | owner's own | about his own approvals | n/a |
| E96 | Ruling 0043: S1, S2 approved | Ruling 0043; one-time approval | owner's own | his approval | n/a |
| E97 | Ruling 0044: caps 106 M and 32 M | Ruling 0044; written | owner's own | his caps for his runs | n/a |
| E98 | Ruling 0045: cap raised to 120 M | Ruling 0045; written | owner's own | his cap | n/a |
| E99 | Ruling 0046: research run 1.2 B (superseded by 0050) | Ruling 0046; n/a | owner's own | superseded cap of his run | n/a |
| E100 | Ruling 0047: the research run widened | Ruling 0047; the run's brief | owner's own | his research track | n/a |
| E101 | Ruling 0048: top session 6, about 30 M | Ruling 0048; written | owner's own | his cap | n/a |
| E102 | Ruling 0049: top session 6 up to 69 M | Ruling 0049; written | owner's own | his cap | n/a |
| E103 | Ruling 0050: research run, cap 1.9 B | Ruling 0050; the run's gate in its folder | owner's own | his run's gate | n/a |
| E104 | Ruling 0051: start on the leftover, units only while they fit | Ruling 0051; the run's gate | owner's own | his run's gate | n/a |
| E105 | Ruling 0052: weekend reserve 4.11 points | Ruling 0052; the run's gate | owner's own | his plan and week | n/a |
| E106 | Ruling 0053: seven replays, cap 87 M | Ruling 0053; written | owner's own | his cap | n/a |
| E107 | Ruling 0054: 14 keys, cap 600 M | Ruling 0054; written | owner's own | his cap | n/a |
| E108 | Ruling 0055: three void lines may be removed | Ruling 0055; one-time | owner's own | his journal | n/a |
| E109 | Ruling 0056: enforce the method; no next work past the ceiling | Ruling 0056; T8-CEIL, T8-COUNT, T8-JOURNAL | hook | `window-ceiling` (the ceiling half; the count and journal parts are E19 and E2) | missing: window-ceiling kit mode |
| E110 | Ruling 0063: no procedural creep | Ruling 0063; `creep-gate` v2 (36 test cases) | hook | `creep-gate` | in |
| E111 | Ruling 0082: no Fable in the move to Rust | Ruling 0082; `migration-gate` | owner's own | `migration-gate` is not a kit part; his migration | n/a |
| E112 | Migration: requirements, floors, done (his words, FEEDBACK-3.md (c), (d)) | Row "migration"; `migration-gate` (83 test cases) | owner's own | `migration-gate` is not a kit part; his migration | n/a |
| E113 | Ruling 0098: Fable's line is 500 K | Ruling 0098; `window-ceiling` v2 (116 test cases), replaced by r58-0001 | hook | `window-ceiling` (this fixed line was replaced by E114) | missing: window-ceiling kit mode |
| E114 | Ruling r58-0001: no fixed line for Fable; held by the compaction cap (about 897 K on the 1M window) | Ruling r58-0001; `window-ceiling` v3 (119 test cases) | hook | `window-ceiling` | missing: window-ceiling kit mode |
| E115 | Ruling r58-0005: nothing the other person has done and pushed is modified or impeded | Ruling r58-0005; `owner-guard` (17 tests) | owner's own | `owner-guard` holds this PC to `OWNERS.json`; not a kit part | n/a |
