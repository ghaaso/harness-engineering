# The plan for the owner's track: the B-tree system, graphs, embeddings, training (top session 9, 2026-11-24)

Written by the plan helper (analyse, Opus) from `research-tree/build/TRACK-DIGEST.md` (below "TD s<n>"), opening a cited
source only where a step rests on it (list in section 9). Nothing in this file is started. Marks (r57-0010, never
upgraded): [quoted] a published source as our file quotes it; [measured]/[observed] measured or seen here; [computed]
arithmetic on marked inputs (the inputs' marks still apply); [hypothesis] reasoned or untested. Short names as in TD
(`RUN:`, `HB:`, `SYN:`, `W2:`, `JR`, `JH`, `PILOT`, `GT`, `EC`, `P2`).

## 0. The answer

1. First, cheap: merge branch `build` (one helper, about 1.4 M tokens; once more after the pilot's fix round lands), then
   four small measurements and reads that size or decide the steps after them (about 11 M together). Nothing in them
   downloads, installs or trains. Two more small ones (2c, step 9) wait for the step that decides whether they matter.
2. The B-tree system: the pilot as planned (preparation, then one field), 418 M tokens expected, cap 593 M. This week has
   room for it. With the corrections below it takes 4.2-9.2 hours of sessions (4.2-7.8 if the single-session arms run
   beside the tree), not 8.5-13.8. It is the only step that
   measures the tree's quality. The end-of-build fault list is fixed in one round after it, sized by what it finds.
3. Quality, besides the pilot: the stronger check that caught our recorded faults (the merged code's full test suite plus
   deliberately broken copies of the claimed guard), on our 10 committed fix-created defects, about 60 M (cap 122 M), in a
   container with the clinic's packages and database, which are installs needing his word.
4. Graphs and embeddings on the 12 GB card: the ranker retest with each family's best form (about 55 M plus card hours)
   and the text-retriever screen (about 47 M plus card hours), each priced as one measured builder unit with its runs. Each needs its installs named with source and size first, so it
   comes after the size step. Agent tests (384 M each) come only if these screens pass.
5. Training: only the ranker retest trains on the 12 GB card (knowledge-graph embeddings at their published settings,
   plus a rule learner on the processor). Everything tagged 24 GB waits for the 12 GB results and for the fact of the
   university card.
6. From him: 14 lines (section 8). The first four can be answered now; the rest come after the step before them.

## 1. What binds this plan

- His track is graphs, embeddings, training, the B-tree system, its enforcement and invariants; token optimisation and the
  token-saving library are his teammate's (r57-0057). Token work only if it pays in the short term (r57-0058). So the
  wave-2 replays (b)-(e) and the BM25-list arm run alone are left to the teammate (section 7).
- No design question to him (CLAUDE.md rule 7, r57-0001): mechanisms come from the record, parameters are computed with
  their basis (r57-0002), a missing fact becomes a measurement. What stays with him is his word, caps, installs and
  downloads, the rule-3 exception and facts only he has (TD s1f).
- A test is in only if its result changes what is done next (r57-0004); no round he has not asked for (r57-0007).
- Limits are the expected usage from similar work plus a buffer; a unit at its limit goes back to its orchestrator
  (r57-0038). Proven algorithms are used whole (r57-0040). The 12 GB card first, 24 GB after (r57-0047, r57-0189).
- Records are read whole before planning (r57-0059); this plan is shown before anything of it runs (r57-0060).
- Lean helper definitions exist (`.claude/agents/lean-*.md`, t9-0101): every helper below runs on the lean definition of
  its kind, with two exceptions: builder units are build-invariant on Opus, so they pass `model: opus` (the lean build
  definition defaults to Sonnet), and a helper that must start helpers uses a full definition (no lean one carries the
  start tool; `.claude/agents/lean-*.md` front matter [observed]). The lean definitions are not yet committed. The saving is about 43.6 K tokens a helper start [measured, n = 1, t9-0101]: small against the role costs
  used here, which predate it (TD s1c), so the estimates are not lowered for it.

## 2. Pacing: the meter, and what fits before the reset

- Now: all-models weekly meter 37 %, Fable 15 % (brief, 2026-11-24); reset 2026-11-30 12:00 UTC, about 159 h away
  (clock read 2026-11-23 21:17 UTC) [observed]. Top session 9's own stop line is 40 % (r57-0061).
- His own use protected to the reset: 0.21 points an hour (`PILOT-PLAN.md` line 116, [measured over 71.7 h]) x 159 h =
  about 33 points [computed]. Room for this plan this week: 100 - 37 - 33 - top session 9's remaining 3 = **about 27
  points** [computed].
- Tokens to points, three bases, each said where used:
  - 62 M a point counts every token equally (r57-0170); the readings fit it worst (r57-0175) [measured fit].
  - Fresh-token weights (r57-0175; `research-tree/build/ROUTER.md` section 2): the pilot plan's 418 M is **8.0-9.5
    points** and 7.1-8.8 Fable points (ROUTER section 0 item 2) [computed from measured weights].
  - This week's readings, other use included: the research run's 688.6 M after the reset with the meter at 22 % at 15:20
    UTC on 11-23 (`JUDGE-HANDBACK.md` section 5) gives at least 31 M a point; top session 7's 25 % at 16:46 to 31 % at about
    18:18 UTC while about 278 M ran (replays 60.6 M, wave 2 about 217 M; `TOP-STATE.md` lines 389, 468-519) gives about
    46 M a point (40-56 with whole-percent readings) [computed by me; both include other use, so both are low bounds on
    tokens a point for the plan's own mix].
  - Pacing uses the worst, 31 M a point. The PILOT figures at 62 M a point (its lines 79-97) are replaced by these.
- Sum of the steps below that can run this week (1, 2a, 2b, 2d, 2e, 3, 3b, 5, 6, 7, 8, and 2c after 8): expected about
  612-617 M with the top session's share, about 987 M at the limits [computed, section 3 table; 520-550 and 870 before
  the blind check, section 10]. At 31-56 M a point: 11-20 points expected, 18-32 at the limits. **The expected fits the
  27 points; at every limit at once on the worst conversion it passes the room (32 against 27)**, so each start passes
  the meter gate (the decision rule's stand-in, r57-0414; `PILOT-PLAN.md` section 3) and a start that does not fit
  waits for the reset.
- Fable: the pilot's coordinator is the only Fable user this plan starts: 7.1-8.8 Fable points by the weights, 16.5
  (12.4-20.5) at 5.7 M a Fable point (r57-0170), 26.0 at its upper quartile, 47.4 at its 270 M limit. His own Fable use
  is protected to the reset as PILOT counts it: 1.51 M an hour (`PILOT-PLAN.md` section 3 [measured, r57-0170]) x 159 h =
  about 240 M = 42 Fable points (32-52 over 4.6-7.6 M a point) [computed]. From 15 %: 15 + 42 + 16.5 = 74 expected, 83
  at the upper quartile (99 at 4.6 M a point), 104 at the limit [computed]: the expected and the upper quartile fit, the
  limit does not. The coordinator's Fable line at each start is 100 - the Fable reading - his protected use to the
  reset; the gate holds its successors there (`PILOT-PLAN.md` section 3).

## 3. The steps, in order of what each unblocks

Who runs them: a fresh top session (Opus, coordinates only, CLAUDE.md rule 5), except the pilot's coordinator, which he
opens on Fable (r57-0035; `PILOT-PLAN.md` row 7). Role figures: run/Sonnet 1.41 M (1.28-1.82), limit 2.6; read/Sonnet
1.79 (1.07-4.68), limit 10.1; collect/Sonnet 3.20, limit 7.4; analyse/Opus 8.05 (4.94-10.39), limit 18.6 (all from
`research-tree/build/check/E-tokens.md` 1a as `PILOT-PLAN.md` rows 3, 14, 20 and 4 quote them [measured]); the research
run's averages are lower (run 1.55, read 2.05, collect 2.80, analyse 3.72; r57-0188 [measured]). R = 4.7 M is a judgment
(TD s6) and the record's caps on R steps are 2.3 times it (`W2:` s3.0: 23.5 M, cap 54.1 M).

| # | Step | Track | Expected, M | Limit / cap, M | Basis | Time | Needs from him |
|---|---|---|---|---|---|---|---|
| 1 | Merge `build` into the working branch | tree | 1.41 | 2.6 | run/Sonnet, E 1a n = 15 | under 1 h [hypothesis] | approve |
| 2a | D4's number of held-out commits from the earlier test's per-commit scores | embeddings | 1.41 | 2.6 | run/Sonnet | under 1 h [hypothesis] | approve (with 2b, 2d, 2e) |
| 2b | Source and size of every install and of candidate public repositories; no download | graphs, embeddings | 3.20 | 7.4 | collect/Sonnet, n = 49 | under 1 h [hypothesis] | approve |
| 2d | Read the 11 helpers that said DONE after a failing last check | quality | 1.79 | 10.1 | read/Sonnet, limit as every read row; JR s4 item 1 says well under 1 M | under 1 h | approve |
| 2e | Replay (a) widened: invented project symbols, real-but-wrong symbols, version errors | quality, graphs | 4.7 | 10.8 | 1 R (W2 s3.0); the five replays that scanned these transcripts used 2.5-4.1 M each (t7-0128 [measured]) | under 1 h [hypothesis, W2] | approve |
| 3 | Pilot preparation (PILOT nodes 1-6), with three corrections | tree | 179.3 | 226.1 | PILOT s2 [computed from measured roles] | 3-4 h [estimate] | approve; cap (with 5) |
| 3b | Merge `build` again once the fix round's last unit has landed and the pilot's commit is pinned | tree | 1.41 | 2.6 | run/Sonnet, E 1a n = 15 | under 1 h [hypothesis] | approve (with 1) |
| 4 | Pilot inputs approved (field, questions, approach ids, protocol, analysis plan) | tree | in 3 | in 3 | PILOT node 4 | his reading | approve, later |
| 5 | The pilot (PILOT nodes 7-21) | tree, quality | 238.5 | 366.8 | PILOT s2 | 4.2-9.2 h plus drains [computed, s3.4] | approve the go; his acts |
| 6 | Stronger check on our fix-created defects (D1 Phase A in JR's form), in a container with the clinic's database | quality | 59.5 | 121.9 | builder unit 32.3 (limit 67.3) and refuter 10.6 (18.5), r57-0173; case building 10 x 0.248 = 2.5 (a low bound; limit 10.1, one read/Sonnet), t7-0602; 10 runs x 1.41 (2.6 each), E 1a [computed from measured roles] | not separated (D1 whole 3.5-4.2 h) plus the container [hypothesis] | approve with installs (2b); cap |
| 7 | D4: the ranker retest, each family's best form, 12 GB | embeddings, training | 55.2 | 112.2 | builder unit 32.3 (67.3) and refuter 10.6 (18.5), r57-0173; 3 runs x 1.41 (2.6) and analyse/Opus 8.05 (18.6), E 1a [computed from measured roles]; W2's 4 R = 18.8 had no part measured (W2 s3.4); the typed graph on two more repositories +42.9 (85.8) only if triples beat pairs on FixFlow | under 4 h plus card hours [hypothesis] | approve with installs; cap |
| 8 | D2 Phase A: text retriever screen, 12 GB, no agent | graphs, embeddings | 47.1 | 93.6 | builder unit 32.3 (67.3) and refuter 10.6 (18.5), r57-0173; 3 runs x 1.41 (2.6), E 1a [computed from measured roles]; W2's 1 R = 4.7 was judged | 1-2 h plus card hours [hypothesis] | approve with weights; cap |
| 2c | Count of successful localisations in our transcripts; after step 8, whatever its result | training | 3.2 | 10 | a transcript scan: the five replays over these transcripts, 2.5-4.1 M each, limit 10 (t7-0128 [measured]) | under 1 h [hypothesis] | approve (with 8) |
| 10 | Fix round on the end-of-build list, after the pilot | tree, enforcement | 129-172 [hypothesis] | sized after 5 | 3-4 units x (builder 32.3 + refuter 10.6), r57-0173 | about 1 h a unit | approve; cap, later |
| 11 | D2 Phase B: index beside grep in an agent, only if 8 passes | graphs | 384 | 894 (D2) | 20 tasks x 2 arms x 3 runs x A (SYN:671) | 4.2-5.0 h | approve; cap; a public task set download, later |
| 9 | Cross-runtime edges replay (L16), only if step 11's index "on" beats "off" | graphs | 0-4.7 | 10.8 | R8: scripting only; R5: 1 R (TD s8b) | a few hours of scripting | approve, later |
| 12 | Graph grounding against hallucination, only if 2e's share is not near zero | quality, graphs | design first: 8.05 | 18.6 | analyse/Opus | - | approve, later |
| 13 | 24 GB steps (D3 first), only if 11 shows a fall at equal resolve | graphs, embeddings | 388.7 | 894 | HB:558 | 4.2-5.0 h plus university card hours | fact; approve; cap, later |

The steps listed in section 2 plus the top session's share (15-20 M, basis r57-0061's note) give the sums there; 9 is
not in them, since it now waits for step 11. Steps 3-5 (sessions)
and 7-8 (card and processor in containers) use different resources and can run in the same days; how many at once is
the decision rule's width (r57-0414, r57-0032), memory included.

### 3.1 Step 1: merge `build` (r57-0520)
- What it is for: one line of history before more is built. Today the tree's code is only on `build` and the hooks that
  enforce the method (top session 8) only on the working branch; every session adds to the gap (enforcement and
  invariants are his track, r57-0057). Not on the pilot's path (`PILOT-PLAN.md` lines 57-59: the pinned commit stays
  reachable on `build`), so it is first because it is cheapest and everything later commits on top.
- Found today [observed, git, read only]: the working branch and `build` meet at 372d5b97, not at `main`'s head; 22
  commits on the working branch not on `build`, 111 the other way. Only two tracked files changed on both sides:
  `research-tree/build/TOP-STATE.md` and `research-tree/build/units/P0/check-commit.test.mjs` (27 and 23 lines changed);
  `build` changed nothing under `.claude/` or `tools/`. 760 untracked files lie under `research-tree/build/` and
  `research-tree/model/` (the record said 620, then 627): 681 are byte-equal to `build`'s (hashed without writing), 79
  are not on `build` at all (top session 9's briefs and outputs, replays, speed-ups, lock papers) and stay.
- How: move the 681 byte-equal copies aside (not delete), merge, reconcile the two files, run the full suite once
  (r57-0004), then remove the 20 unit worktrees (r57-0520). `hb` stays: it holds `build` (`git worktree list`
  [observed]) and the pilot's fix round lands there (`PILOT-PLAN.md` row 5, lines 56-58). If the suite fails only on
  FX-CLOSE T1 (c), that test is run alone before the merge is called red (it fails under load and passes alone, TD s1e
  [observed]; step 3 fixes it). Merges pass the commit check unchecked (r57-0518), so the helper shows the diff of the
  two files in its report.
- Changes next: one line of history. It forks again while the fix rounds of steps 3 and 10 land on `build`, so `build`
  is merged once more after each (3b, and inside step 10) and `hb` is removed after the last; nothing to measure.

### 3.2 Step 2: four small measurements that size or decide later steps (2a, 2b, 2d, 2e), and two that wait (2c, 9)
- 2a, D4's n. W2 s3.4: n = (2.8 x sd / 0.02)^2 from the earlier test's per-commit scores; about 474 held-out commits if
  the SE were on 50 commits, about 617 if on 65 (TD s3c; [computed, hypothesis on what the SE is over]). Our repositories
  hold about 230 and 432 (dated) commits, so the public repository supplies most. Whether per-commit scores exist on disk
  is not known: `docs/program/evidence/harness-bottlenecks/graph2/embeddings/result.json` holds per-arm counts [observed,
  first lines only]; if they are absent the step returns that, and n is taken at the 617 bound. The same helper computes
  D4's card hours from the earlier run's wall times x the dimension ratio (W2 s3.4: "a measurement"). Changes next: D4's
  size, and how large a public repository must be.
- 2b, installs and repositories, metadata only (rule 3 needs source and size before his word; rule 4: no project name in
  any request, generic client). Items: AnyBURL; PyKEEN 1.11.1 and the earlier runtime (present in a container image or
  not); the embedder weights SweRank-class 137M (0.55 GB fp32) and Qwen3-Embedding-0.6B (about 1.2 GB) [computed sizes,
  SYN:668-669]; an embedding runtime; tree-sitter; SQLite with FTS5 (first check whether Node 24's built-in SQLite has
  FTS5, which would need no install [hypothesis]); a search tool for the agent; GraIL's code (only named, for step 7's
  condition). For steps 6-8: whether an image exists for the clinic's suite (Python 3.13 through uv; PostgreSQL 17, which
  ran in a Docker Compose project on this PC, `replays/replay-L6/cases/c06-B.md` lines 85-106 [observed]), and if not
  the source and size of its Python packages and of the PostgreSQL 17 image; whether the earlier run's GPU image
  `graphtest-kge-gpu:1` is still present (the Docker daemon was down when the blind check looked [observed], so Docker
  Desktop is started first: a program start, watched in calls under 240 s); a Java runtime for AnyBURL, source and size
  [hypothesis that one is needed: AnyBURL is a Java program, not in the record]. Public repository candidates, derived not asked: open licence, languages of FixFlow, at least the held-out
  commits 2a computes plus a training span, its node count (which decides whether D4 stays under 6.4 GB, HB:1033). Each
  listed in the run's `DOWNLOADS.md` form with source and size. Changes next: the approve lines of steps 6, 7 and 8.
- 2c, localisations (runs after step 8, whatever its result: nothing before it uses the count). A small localiser tuned on a few hundred successful trajectories (L72; 768 in its source) is the one
  12 GB training form beyond D4 the record names; our count is not in the record (TD s4). Changes next: under about 300
  [hypothesis threshold, the source's order of magnitude] it is dropped for now; above, it is designed after step 8,
  whose tuned retriever is its baseline.
- 2d, the 11 DONE-after-red helpers (JR s4 item 1): found by pattern, never read (`TOP-STATE.md` line 429, via TD s5e).
  Changes next: a real one is the narrow gate's only clear catch (JR line 84); none, and the narrow gate is not built.
- 2e, replay (a) widened (W2 s3.0): the share of invented project symbols, same-turn catches, real-but-wrong symbols,
  version errors, causing-commit need, today's commit count. Changes next: a share near zero closes graph grounding for
  hallucination in this form; otherwise step 12 (project dependency context plus an existence check, then a pinned-version
  doc index; f2e ranked 1-2) [quoted for the method, hypothesis for its fit here].
- 9, cross-runtime edges (L16): 158 of 160 co-changed pairs the import graph cannot reach are cross-runtime (SYN:246-249)
  [observed], the one gap our own data shows; no source measures URL-literal-to-route matching (f2d C02, C23). Changes
  next: whether those edges join the typed store before step 11's graph arm. That arm runs only if step 11's index "on"
  beats "off", so step 9 runs then, with L43 and L45 (section 3.9).

### 3.3 Step 3: pilot preparation, with three corrections
What it is for (r57-0613: say this first): the pilot is the only step that runs the B-tree system as built. Nothing about
its quality has been run; the model check covers the design, not a run (TD s1a, s1c). It is one field as one leaf, so it
shows gross failures, real costs, and whether same-window review beats fresh review on planted mistakes; it does not
generalise (P2 s13).
- As planned: P3.1 (a stop ends a session with its helpers), P3.2 (the files list counted against `tcb/`), the run root
  outside every repository, the pilot's inputs drafted, and the fix round FX-PILOT, three builder units on `build`:
  children's models and the tier hook, the scorer's agent file, the single-session role with `W_quality` 300 to 280 K and
  `attempt_max_ticks` 240 to 630 (`PILOT-PLAN.md` rows 1-6, section 4). 179.3 M expected, 226.1 M at every node's upper
  quartile, of it the fix round 142.7 M (99.5-171.8) [computed from measured roles, r57-0173]. The round lands in `hb`
  (kept by step 1); once its last unit has landed and the pilot's commit is pinned, `build` is merged again (3b).
- Correction 1: `attempt_max_ticks` 630 was computed from round 3's sessions, which held a 4.3 h stop for a PC restart
  counted as work (r57-0174 [measured]). Unit 3 recomputes it from the same sessions without the stop before it sets it
  (r57-0002), inside its own budget.
- Correction 2: the flaky test FX-CLOSE T1 (c) fails under load and passes alone (TD s1e [observed]); the fix round runs
  three units and a landing suite under load, so it can fail a landing that is right [hypothesis]. Its named fix (own
  ids per test file, or a fake process list; r57-0521 item 2) goes into unit 3, inside the unit's spread.
- Correction 3: `N_max` 2 in P2 and PILOT is replaced by the decision rule's width (r57-0032, r57-0414); the protected
  line and meter gate use the bases of section 2, not 62 M a point.
- His acts before the go (PILOT s6): the user-level deny rules; importing the dead-man task
  (`research-tree/tcb/settings/deadman-task.xml`, never imported); later, opening the coordinator on Fable.

### 3.4 Step 5: the pilot
- Measures (P2 s11; PILOT nodes 7-21): comparison 1, the tree against one session (S1, S2; n = 1 per arm, descriptive,
  McNemar, blinded scoring); comparison 2, review in the writer's own window against fresh reviews (R1, R2) on k planted
  wrong assumptions found with the right reason; fault probes (kill a child, sleep once, forced hand-over, stale-epoch
  write, a loop, a lost wake); and the parameters the model check left to it: tick rates, coordinator turn lengths
  against the dead-man's deadline, whether a refused start leaves `start.json`, the lease's two delays, the app's session
  id against the CLI's (r57-0519, r57-0522).
- Why it changes what is done next: comparison 2 decides where review runs in every later run (F1; P2 s12 says no
  source compares the two); a gross failure in comparison 1 sends the tree's form back to design (one chosen field cannot rule it out; that needs a
  second field, P2 s13); the probes
  decide whether the 13 fixes hold when run unattended; the measured parameters replace the guesses step 10 needs.
- The ready material for comparison 2 exists unused: the research run moved its planted-copy brief, review form, scorer
  and blinding script to `RUN:later/f1/` (tests later, r57-0047; `RUN:briefs/COORDINATOR.md` lines 342-348) [observed].
  The pilot's input step reuses them rather than writing new ones (r57-0040).
- Tokens: 238.5 M expected, 366.8 M at upper quartiles; the coordinator 94.3 M of it on Fable (PILOT s2). A second basis
  for the coordinator [hypothesis]: the research run's Fable coordinator used 20.10 M for about 17 started units (12 parts,
  3 maps, the sheet, the closing; JH s5), about 1.2 M a unit against the build roots' 4.10 M; at 23 units that is about
  27 M, 4-10 successors instead of 17-38, and about 24-30 typed turns instead of 37-58 [computed; the units differ in
  kind]. The cap stays on PILOT's basis; the pilot's first hours measure which holds.
- Hours [computed]: PILOT's critical path with T at its measured 1.2-1.8 h without the stop (r57-0174) instead of 4.8-5.3 h:
  design checks 1-1.5 + T 1.2-1.8 + same-window review 0.5 + fresh reviews 0.5 + scorer 0.3 = 3.5-4.6 h, x 1.2-1.7 (the
  build's measured overrun in hours) = 4.2-7.8 h, if S1 and S2 run beside T. At PILOT's width of two they run one after
  the other in the second slot; at about T's time each [hypothesis: their hours are not measured] they take 2.4-3.6 h and
  set the path: 1-1.5 + 2.4-3.6 + 0.3 = 3.7-5.4 h, x 1.2-1.7 = 4.4-9.2 h. So **4.2-9.2 h** until correction 3's width is
  computed; a width above two is also outside what the model check ran (k = 2, TD s1a) [hypothesis]. Plus drains at each
  coordinator hand-over and his typed turns.
- Known costs to him in the run (`PILOT-PLAN.md` section 4; TD s1e): long coordinator turns will raise false dead-man
  notices (89 turns over 60 min measured), and nothing answers an idle child (r57-0522); both cost him typed turns,
  neither stops the run.
- His acts at the go: approve naming the page snapshots (about 60 MB a field) and the fetch script (F5; without it
  "every card is unverifiable", P2 s12); the go itself runs on this PC with the network on, outside a container, an
  exception to rule 3 (`PILOT-PLAN.md` lines 182, 235); open the coordinator on Fable in the run root.

### 3.5 Step 6: the stronger check on our own defects (quality)
- What it is for: the replays found that what caught our recorded faults was a second party with the code in hand or a
  stronger executed check, not the worker's tests, the type checker, or a reviewer reading the report (JR line 71
  [hypothesis reasoned from measured counts]; JR s2 rows L11, L8, L6 [measured]). This tests that form directly: the
  merged code's full suite plus mutation of the guard each fix claims, folded with D1 Phase A (JR s4 item 2).
- Cases: 10 of S2's 15 fix-created defects, the ones ever committed (8 in Python) (JR s4 item 2 [measured]). Tokens: the
  recorded 15 R = 70.5 M (SYN:645) and 10 R = 47 M rest on a judged R (TD s6) and have no line for building the cases,
  the mistake t7-0602 records. From measured roles instead: the harness (check out each defect's merged head, find the
  guard the fix claims, write its mutants, run the full suite against the database in a container) one builder unit
  32.3 M (18.5-38.0, limit 67.3) and a blind refuter 10.6 M (limit 18.5), r57-0173; case building 10 x 0.248 M = 2.5 M
  (t7-0602, a low bound: these cases are code at a commit, not text; limit 10.1, one read/Sonnet); 10 runs x 1.41 M
  (limit 2.6), E 1a. **59.5 M expected, limit 121.9 M** [computed], against 47-70.5 and 162 before.
- Precondition (CLAUDE.md rule 3): the clinic's suite runs on Python 3.13 through uv with PostgreSQL 17, 676 tests
  (`replays/replay-L6/cases/c06-B.md` lines 85-106 [observed]); running it at each defect's head is an experiment, so it
  runs in a container with the network off. Its packages and database image are installs: 2b names their source and
  size, and his approve line for step 6 carries them. SYN 3.1 counts about 10 h of manual work per repository where no
  container exists (f8:48) [quoted design, hypothesis].
- Changes next: a third or more caught opens D1 Phase B (256 M; JH s1) and gives fix slices test gates; fewer sends the
  check to the other stronger form the replays left untested, exact check plus reconstruction (JR line 26, s3 (c)). L6,
  L8 and L11 are not reopened: the replays found each against piloting in its form (JR s1); SYN 3.1's line ("moves the
  tree's spend to L6, L8, L11") predates them. No card; installs as above.

### 3.6 Step 7: D4, the ranker retest with each family's best form (12 GB; the embeddings retest)
- Question and arms as designed (W2 s3.4, checked): on held-out later commits of FixFlow, the clinic and one public
  repository, do learned arms add over the best untrained history forms? Untrained: decay, TARMAQ, commit-text match, the
  1/|e| commit weight. Learned: AnyBURL (rule learner, processor); knowledge-graph embeddings at their published form
  (N3 weight 0.05-0.1, rank 1000-2000, chosen on held-out link-prediction MRR, filtered negatives), the three places the
  earlier test fell short (EC s6 items 9-11). One tuned fusion weight. Baselines: plain pair counting on all three; our RRF ranker (P@10 0.2493
  pool) on FixFlow only, where its typed graph exists (one repository, about 5,400 nodes, `graph2/embeddings/RESULT.md`
  line 131 [observed]); the gain is scored against the best untrained arm, so the verdict does not need it elsewhere. On
  the clinic and the public repository the learned arms run on co-change pairs; triples there need a typed graph, built
  (one builder unit and its refuter, +42.9 M, limit 85.8, r57-0173) only if triples beat pairs on FixFlow in the
  pre-tests [hypothesis that one unit suffices]. Swept: decay per repository, d 512/1000/2000, N3 weight, fusion weight, triples against pairs.
- Scoring fixed first: recall and P@10 of files each held-out commit edited, each arm alone and unrestricted, random
  tie-breaking, leak-free splits; a gain counts at +0.02 P@10 against the best untrained arm (W2 s3.0, s3.4).
- Pre-tests first, inside the step: the surprise index of our history and triples against pairs; GraIL (an inductive
  model that fits 12 GB, HB:1179) only if they show room.
- Card: 0.16 GB at d = 2000 on 2,450 nodes to 6.4 GB at 10^5 nodes; 24 GB from about 10^6 nodes at d = 500 (HB:1033
  [computed, high for Adagrad]). Memory cap 6 GB for the card's container as before (EC s9 [measured]). AnyBURL's source ran on 4 cores and 16 GB of
  memory on benchmarks (f2c L12, C43 [quoted]); its container's memory is set from a first run on our graph in the
  pre-tests, not from the 6 GB cap. Network off. The PC sleeps after 15 idle minutes, and the earlier run lost 2 h to it
  with no session working (`COORDINATOR-REPORT.md` lines 299-303 [observed]): the helper that starts a card or
  processor run watches its log in calls under 240 s until the run ends (steps 7 and 8).
- Tokens: one builder unit 32.3 M (limit 67.3) and its refuter 10.6 M (18.5) for porting the earlier arms into a
  container and adding AnyBURL, TARMAQ, decay, commit-text match, the 1/|e| weight, the fusion weight, leak-free splits
  and scoring (r57-0173); 3 runs x 1.41 M (2.6) and one analyse/Opus 8.05 M (18.6) for the verdict (E 1a). **55.2 M,
  limit 112.2 M** [computed from measured roles]; W2's 4 R = 18.8 M had no part measured (W2 s3.4).
- Installs, each named by step 2b: AnyBURL, the public repository's clone, the earlier runtime if absent, a copy of the
  earlier arms' code into the container (never the recovered files in place, rule 1).
- Changes next (W2 s3.4): no learned arm +0.02 above the best untrained one closes identity KG embeddings at their
  published settings and AnyBURL for this ranker at our size, these forms only; text, transfer and inductive forms stay
  open (TD s3b, R9 s2); a learned arm above it joins step 11's index with the tuned weight; an untrained form
  above our co-change term replaces it at no card cost.
- Routed specialists (his earlier CureFound form) are not an arm: at our size their shortfall was the merge as written and
  they equal one model on single-area tasks (EC s4 point 6 [measured]); routing only has a case on a graph too large for
  one model, which 2b's node count shows or rules out [hypothesis].

### 3.7 Step 8: D2 Phase A, the text-retriever screen (12 GB)
- Acc@10 of the finally edited files from issue-like text on closed commits of the same three repositories, against
  BM25 and grep on all three and our RRF ranker on FixFlow only (as in step 7; the gate is against BM25); top-2
  precision (SYN:657-659). One public repository serves steps 7 and 8.
- Tokens: indexing three repositories with two embedders, the issue-like queries, BM25, grep and scoring are code: one
  builder unit 32.3 M (limit 67.3) and its refuter 10.6 M (18.5), r57-0173; 3 runs x 1.41 M (2.6), E 1a. **47.1 M, limit
  93.6 M** [computed from measured roles]; W2's 1 R = 4.7 M was judged. If a model, not a script, writes the queries,
  case building at t7-0602's 248 K a case adds to it, with n from 2a. The PC is held awake as in step 7.
- The two gates the files disagree on (0.68 at SYN:659, 0.45 at HB:557) are two different lines in f3a:34 as R9 reads it:
  under 0.45 stops, 0.68 or more allows seeding the agent's first read [hypothesis on R9's reading; TD s3d].
- Pass (6 points or more over BM25) opens step 11; fail drops these two embedders at shelf settings for our localisation and
  keeps the graph on the processor (SYN 3.2, "Changes what we do next"); tuned and larger retrievers stay open, and 2c's
  count decides whether a tuned localiser is designed.

### 3.8 Step 10: the end-of-build fault list, after the pilot
- Content: r57-0521 (surviving mutations per unit, words, CLAIM's millisecond window), r57-0522 (no tool to answer an idle
  child, nothing to judge progress by, no continue act), r57-0518 (merges and `commit -n` unchecked, manifests
  unprotected, no hook timeouts, lane races, an untested clamp, a done unit run twice), and the 1,063 of 4,042 tracked
  evidence files in no manifest, so no hook protects them (TD s1d [observed]). None breaks a unit (TD s1e).
- After the pilot because the pilot measures what r57-0522's fix needs (tick rates, turn lengths) and will add its own
  findings (`PILOT-PLAN.md` section 4). One attack round per fix (r57-0004).
- Tokens [hypothesis]: 3-4 units at the build's medians, 43 M a unit = 129-172 M plus a root's share; sized from the
  pilot's findings before his cap.

### 3.9 Steps 11-13: only if the screens pass
- Step 11 (D2 Phase B): 20 tasks over three repositories x 2 arms x 3 runs, resolved per task (McNemar), read and search
  calls, tokens; 384 M, cap 894 M for D2 (SYN:671; HB:79). It sees only gross effects (TD s5d: 2 points need about 9 runs
  per arm). Needs per-repository containers (about 10 h of manual work each where none exist: SYN 3.1 says so for D1; the same need for any agent test on our repositories [hypothesis]) and a public task
  set (his download, size a measurement). A third arm (our typed store as a traversal and closure tool) +192 M only if
  the index "on" beats "off"; its output form is set first by the offline token-bounded subgraph and union replays (L43,
  L45, 4.7 M each, HB:622-635, 367-380), which therefore run only then, with step 9 (cross-runtime edges).
- Step 12: the design of the graph-grounding test from f2e's ranked methods, priced by its design; only if 2e's share
  is not near zero.
- Step 13: D3 (7B retriever plus 7B reranker, about 14 GB of weights each, one at a time; a 24 GB fit is not shown,
  SYN 3.3) only if step 11 shows a fall at equal resolve; needs the fact of the university card.

## 4. How the quality mechanism is tested

The tree is for quality and fewer hallucinations (r57-0047). The record supports one mechanism for code: structure pays
through a check or a selection, not through splitting (f7 C02, L1, L2 [quoted]); our own catches came from a second party
with the code in hand or a stronger executed check (JR line 71 [hypothesis on measured counts]). Four tests, cheapest
first, each changing a named next step:
1. 2d (under 2 M): whether the narrow "no DONE after a failing check" gate has any real catch.
2. 2e (4.7 M): how often our sessions invent or misuse project symbols; decides whether graph grounding is tested.
3. Step 6 (about 60 M): the stronger-check form on our committed defects; decides test gates in fix slices and D1 Phase B.
4. The pilot (418 M): the tree run for real; same-window against fresh review on planted mistakes; gross failure of the
   tree's form; fault probes.
Our baselines to compare against later are the sheet's sinks (mistakes after a compaction 0.58 to 1.35 per 100 calls;
5 P1 and 10 P2 defects created by fixes; 63.2 % of a summary behind its hand-over; `RUN:sheet/SHEET.md` S1-S5
[measured, one repository pair, mostly Opus]). No step here measures the tree on coding work against them (section 7).

## 5. Training on the 12 GB card, and what waits for 24 GB

- No 12 GB fine-tuning run exists in the record, and no source measures a local method on a 12 GB card or in our meter's
  units (SYN:710; f6 answer 7) [observed: not found].
- Trained in this plan, all in step 7: the knowledge-graph embedding sweep (3 dimensions x 2 N3 weights per repository,
  up to three repositories) on the card; AnyBURL on the processor (its source ran on 4 cores and 16 GB of memory on
  benchmarks, f2c L12, C43 [quoted]; its memory on our graph is measured first, step 7); GraIL only if the pre-tests show room. Each fits 12 GB at our size [computed, HB:1033, HB:1179]; the
  public repository's node count (2b) is the one input that could move it.
- Conditional: a small localiser (2c's count decides; design after step 8). ULTRA's inference is computed to fit 12 GB
  but measured at 12.87 GB at batch 64 (TD s3e, not reconciled): not planned until step 7's pre-tests show room for an
  inductive model, then measured at a smaller batch [hypothesis].
- Waits for 24 GB (r57-0189: whether and when is not known), each also behind its 12 GB result: D3 (after step 11),
  ULTRA at its source's batch, GREPO as run, HAFix 6.7-7B, learned checkers' classifier training (L20), model-added
  cross-runtime edges, CodeScout 14B. More than 24 GB, not on this plan: CGM, NBFNet, HYPER, GCR 8B, repository
  fine-tunes (TD s3f, s4).
- The fact of the card is needed only before step 13; asking it now changes nothing earlier (r57-0004).

## 6. Corrections this plan makes to recorded figures

| Figure | Recorded | Now | Basis |
|---|---|---|---|
| Pilot in points | 62 M a point; 2.9 + 3.6-5.6 points (PILOT s0, s2) | 8.0-9.5 by fresh-token weights; 7.5-13.5 at this week's 31-56 M a point | r57-0175; ROUTER s0, s2; JH s5; TOP-STATE [computed] |
| Pilot hours | 8.5-13.8 h | 4.2-9.2 h plus drains (4.2-7.8 if S1 and S2 run beside T) | r57-0174 [measured] in PILOT's formula [computed] |
| Step 6 tokens | 15 R = 70.5 M; 10 R = 47 M; cap 162 M | 59.5 M, limit 121.9 M | r57-0173, t7-0602, E 1a [computed] |
| D4 tokens | 4 R = 18.8 M, cap 43.2 M | 55.2 M, limit 112.2 M | r57-0173, E 1a [computed] |
| D2 Phase A tokens | 1 R = 4.7 M, cap 10.8 M | 47.1 M, limit 93.6 M | r57-0173, E 1a [computed] |
| Age cap `attempt_max_ticks` | 630 | recomputed without the 4.3 h stop | r57-0174 |
| Pilot schedule | from the reset of 2026-11-23 | that week was used by the research run; this week has room | JH s5; section 2 |
| Untracked copies before the merge | 620, then 627 | 760: 681 byte-equal to `build`, 79 not on it | git today [observed] |
| Merge base | `main`'s head (TD s1d, for `main` against `build`) | 372d5b97 for the working branch against `build` | git today [observed] |
| Coordinator's typed turns | 37-58 | 24-30 if the research run's Fable coordinator rate holds | JH s5 [computed, hypothesis] |

## 7. What this plan does not cover, and why

- Token optimisation, the token-saving library, the wave-2 replays (b)-(e), the BM25-list arm run alone (L65 alone, 384 M),
  local inference for cached re-reads: the teammate's (r57-0057, r57-0058). L65's arm joins step 11 if that runs (W2 s3.2).
- Graph-guided planning (f8 L3), the one graph form with a token cut in a deployed agent (0.32-0.76x where significant,
  makers' own [quoted]): the record has no test design for it. A design step (analyse, about 8 M) belongs after step 11,
  since every agent test costs about 384 M and sees only gross effects; not placed in the order until then.
- A wider graph test with an agent baseline (4.0-10.0 B, GT s K) or a 2-point agent test (about 28.8 B, f8): beyond a
  week's whole meter at any basis above; not planned.
- The tree on coding tasks against the sheet's sinks: needs the tree to run fix slices, which needs the pilot and step
  10 first.
- Depth against fan-out and a split at a window share: no source tests either (TD s1b); the pilot's one leaf cannot.
- Rule 7's design points that P2 s12 lists as his (F1, F2, window, restart limit, hand-over point, N_max, thresholds, S2)
  are derived or measured: F1 by comparison 2; N_max by the decision rule; the rest stay at P2's silent defaults until the
  pilot measures them (TD s1f). F3 (another provider's model) is not planned: it sends project text out (rule 4).
- The enforcement table of top session 8 (`research-tree/build/ENFORCEMENT-TABLE.md`) was outside this plan's input; its
  gaps are not ranked here beyond r57-0518 and the manifests.
- The 18 unread keys and unopened sources (TD s7a, s7c): no step needs them before step 11.

## 8. The lines for him, in order

1. approve: merge branch build into the working branch: move aside the 681 byte-equal copies, merge, reconcile two files, run the suite once, then remove the 20 unit worktrees, keeping hb while fix rounds still land on build; merge build again after the preparation's fix round lands (about 1.4 M tokens each, limit 2.6 M each).
2. approve: four small measurements and reads, no download or install: D4's commit count and card hours, sources and sizes of every install, container image and public repository candidate (metadata only), the 11 helpers that said DONE after a failing check, invented-symbol replay (about 11 M expected).
3. cap: 31 M for those four (the sum of their limits).
4. approve: the pilot's preparation (P3.1, P3.2, run root, inputs drafted, three-unit fix round with the age cap recomputed and the flaky test fixed); your acts: the deny rules and importing the dead-man task.
5. cap: 593 M for the pilot's preparation and the pilot together (expected 418 M; 7.5-13.5 all-models points; the start waits if the meter gate says it does not fit before 2026-11-30 12:00 UTC).
6. approve (after step 2): the stronger check on our 10 committed fix-created defects (merged code's full suite plus mutation of each claimed guard), in a container with the network off, with the clinic's packages and database image as step 2 names them with source and size; no card.
7. cap: 122 M for it (expected 59.5 M).
8. approve (after step 2): D4 with its installs as step 2 names them with source and size; network off, in a container, memory cap 6 GB for the card's container, AnyBURL's set from its first run on our graph.
9. cap: 112 M plus the card hours step 2 computes (expected 55.2 M).
10. approve (after step 2): D2 Phase A with the embedder weights (0.55 GB and about 1.2 GB, both swept, about 1.75 GB together) and runtime as step 2 names them; after it, the count of successful localisations in our transcripts.
11. cap: 104 M plus card hours (D2 Phase A 93.6 M, the count 10 M; expected 47.1 and 3.2 M).
12. approve (after the preparation): the pilot's inputs, then the go, naming the page snapshots (about 60 MB a field) and the fetch script, and the exception to rule 3 (network on, outside a container); you open the coordinator on Fable.
13. approve, cap (after the pilot): one fix round on the end-of-build list, sized from the pilot's findings.
14. fact (only before any 24 GB step): whether and from when the university's 24 GB card can be used.

## 9. Not read

- Read: `TRACK-DIGEST.md` whole; records r57-0001, 0002, 0004, 0007, 0010, 0038, 0040, 0047, 0052, 0057 to 0061, 0109,
  0170, 0173 to 0175, 0188, 0189, 0414, 0420, 0518 to 0522, 0613, 0032, 0054, t9-0101; `PILOT-PLAN.md` lines 1-110 and the
  grep of line 116; `ROUTER.md` sections 0-2; `COMPLEXITY.md` sections 0, 5, 6; `JUDGE-HANDBACK.md` sections 4-7;
  `replays/JUDGE-REPLAYS.md` sections 4-5; `TOP9-STATE.md`; `top9/out/STEP1-SUMMARY.md`; `NEXT-STEP.md`; `TOP-STATE.md`
  lines 385-400 and meter lines 460-520 by grep; `RUN:closing/wave2/SYNTHESIS-wave2.md` sections 3-5;
  `RUN:closing/SYNTHESIS.md` lines 636-690; `RUN:later/f1/PLANTED.md` and `review-form.md` first 40 lines; the first lines
  of the earlier test's `result.json`; git counts and hashes as in section 3.1.
- Not opened: `PILOT-PLAN.md` sections 3-6 beyond grep (the preconditions are carried from TD s1c); the reader digests R1-R10;
  `ENFORCEMENT-TABLE.md`; `STATE.md`; the refute files; the f-reports and HB (carried from TD); `RUN:sheet/SHEET.md`;
  x09's per-commit scores (step 2a finds them). The research run's coordinator unit count (about 17) is my reading of
  JH s5's rows, not counted from its logs.

## 10. The blind check, folded (top session 9b, 2026-11-24)

The check is `research-tree/build/top9/out/X-refute.md` (F1-F11). Totals that moved: this week's steps 520-550 M expected
and about 870 M at the limits became about 612-617 M and 987 M (11-20 points expected, 18-32 at the limits, against a
room of 27); the four small steps' cap 39 M became 31 M; step 6 47-70.5 M (cap 162) became 59.5 M (limit 121.9); D4
18.8 M (43.2) became 55.2 M (112.2); D2 Phase A 4.7 M (10.8) became 47.1 M (93.6); the pilot's hours 4.2-7.8 became
4.2-9.2. The pilot's 418 M and 593 M cap do not move.

- F1, right (one detail in part): the clinic's suite needs Python 3.13 through uv and PostgreSQL 17 (`c06-B.md` lines
  85-106), rule 3 puts it in a container, and the fan-out gate refuses a limit with no measured record
  (`fanout-gate.mjs` lines 293-298); t7-0602 is the same unpriced case building. In part: PostgreSQL 17 already ran in a
  Docker Compose project on this PC, so 2b checks what is there before naming downloads. Changed: s3.5 (cost from
  r57-0173, t7-0602, E 1a; precondition), 2b, table row 6, s0 item 3, s8 lines 6-7.
- F2, right: SYN 3.1's fail line (SYNTHESIS.md line 650 area) predates the replays, which found L6, L8, L11 against
  piloting (JR s1). Changed: s3.5's "changes next" points at exact check plus reconstruction (JR line 26).
- F3, right: W2 s3.4 says no part of D4 is measured; both steps build code, priced below one builder unit (r57-0173);
  the RRF ranker exists for one repository (RESULT.md line 131). Changed: s3.6 and s3.7 (tokens from measured roles,
  RRF on FixFlow only, the typed graph elsewhere only if triples beat pairs), table rows 7-8, s0 item 4, s6, s8 lines
  8-11, the sums in s2.
- F4, right: `hb` holds `build` (git worktree list) and PILOT row 5 lands the fix round there. Changed: s3.1 keeps `hb`,
  new row 3b (a second merge, 1.41 M, limit 2.6), s3.3, s8 line 1, s0 item 1, the sums.
- F5, right: CLAUDE.md forbids ruling a family out after one experiment; P2 s13 and TD s3b say the same here. Changed:
  s3.4 (gross failure sends the form back to design), s3.6 (closes identity KG embeddings and AnyBURL only), s3.7 (drops
  these two embedders at shelf settings).
- F6, right: PILOT section 3 protects his own Fable use at 1.51 M an hour. Changed: s2's Fable bullet (42 points
  protected; expected and upper quartile fit, the 270 M limit does not; the Fable line at each start).
- F7, right in part: step 9 decides only step 11's typed-store arm, so it moves behind step 11's "on beats off"; 2c moves
  after step 8, but whatever step 8's result, since after F5 a fail leaves tuned localisers open. Changed: table (2c
  after 8, 9 after 11), s3.2, s3.9, s0 item 1, s8 lines 2-3 and 10-11, the sums.
- F8, right: the five replays over these transcripts used 2.5-4.1 M each (t7-0128). Changed: 2c re-priced at 3.2 M,
  limit 10; 2e keeps its 4.7 M (the five came under it) and now cites t7-0128.
- F9, right in part: the sleep (COORDINATOR-REPORT lines 299-303), the down Docker daemon and the missing Java runtime
  (hypothesis) stand; the 16 GB is AnyBURL's source's benchmark machine (f2c L12, claims C43), not a need on our graph,
  so it does not clash with the 6 GB card cap, but nothing joined the two. Changed: 2b (images, Docker start, Java),
  s3.6 (AnyBURL's memory measured first; a session watches card runs), s3.7, s5, s8 line 8.
- F10, right: PILOT section 2 runs S1 then S2 in the second slot at width two. Changed: s3.4 hours 4.2-9.2, table row 5
  (and its reference s3.4, was s4.3), s0 item 2, s6.
- F11a, right: SYN line 662 sweeps both embedders. Changed: s8 line 10 ("and", about 1.75 GB).
- F11b, right: 2d's limit was 4.68 where every read row uses 10.1. Changed: table row 2d; s8 line 3 (now 31 M for four).
- F11c, right: 418/56 = 7.5. Changed: s8 line 5.
- F11d, right in part: the lean build definition says to pass the model explicitly, so builders can use it on Opus; no
  lean definition carries the start tool. Changed: s1's lean line names both exceptions.
- F11e, right: the flaky test fails under load (TD s1e). Changed: s3.1 (re-run alone before calling the merge red).
- F11f, right in part: r57-0522 was named (s3.4 parameters, step 10); the dead-man's false notices were not. Changed:
  s3.4, a line on known costs to him.

Read by the fold: `top9/briefs/COMMON.md`; `X-refute.md` whole; `JUDGE-REPLAYS.md` lines 5-35 and 55-90;
`replay-L6/cases/c06-B.md` lines 85-106; `fanout-gate.mjs` lines 280-305; `RUN:closing/SYNTHESIS.md` lines 640-672;
`RUN:closing/wave2/SYNTHESIS-wave2.md` s3.4; `PILOT-PLAN.md` lines 36-58, 99-137 and the Fable and dead-man lines by
grep; `graph2/embeddings/RESULT.md` lines 125-135 and `COORDINATOR-REPORT.md` lines 155-165, 295-305; f2c line 44 and
claims C43; TD lines 82-86, 118-122, 294-299, 478-484; records t7-0602, t7-0128, t8-0110, r57-0173, r57-0188, r57-0179;
the lean definitions' front matter; `git worktree list`. Not checked: whether Docker images exist now (the check found
the daemon down); S1 and S2 hours (not measured anywhere); the per-commit scores 2a looks for.
