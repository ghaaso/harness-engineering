# R3-round3: round 3 reports and the decision rule v2, digest for the owner's track

Folder `R:` = `docs/program/evidence/round3-2026-11-18/`. Marks as the sources give them: [quoted] = a published
source as the report quotes it (the reports' "P"); [observed] = seen in our own files (their "O"); [hypothesis] =
reasoned, untested (their "H"). Nothing in round 3 was run on sessions: `R:t1-report.md` "Limits of this report"
says "Nothing was measured; every transfer to sessions is a hypothesis". Verdict words (confirmed, holds in part,
refuted) are the reports' own fold of gate and refuter. Token-saving items (the token windows, model choice, pacing)
are the teammate's: one line each, not digested.

## 1. What was built, run or measured

Round 3 is literature and file reading, folded by gate and refuter. No tokens, time, quality or hallucination figure
was measured on a tree run. Counts of what was read:

- t1 (B-tree kinds for a tree of sessions): 115 claims C01-C115; 65 confirmed, 42 hold in part, 5 refuted (C51, C59,
  C90, C108, C114), 3 cannot be checked (C64, C65, C93) [`R:t1-report.md`, "Counts by verdict"].
- w1 (several writers on one object): claims W01-W98; 57 confirmed, 39 in part, 1 refuted (W92), 1 cannot be checked
  (W96) [`R:w1-report.md` section 8].
- c1 (one serial check shared by many workers): 66 claims; 41 confirmed, 23 in part, 2 refuted (C44, C64)
  [`R:c1-report.md` section 6].
- a1 (token allowance and long units): 82 claims; 48 confirmed, 33 in part, 1 refuted (A76) [`R:a1-report.md`
  section 4]. Teammate's track for most of it.
- DECISION-RULE v2: decided 2026-11-19 by the top session; "still a hypothesis. Nothing in it was run, measured or
  tuned here. No number is set" [`R:DECISION-RULE-v2.md`, Status]. 145 draft statements: 86 confirmed, 53 narrowed,
  1 refuted, 5 not checked [same file, "What version 2 is"].

Numbers that were measured in our own files (observed, by count, not by tree run):
- One suite run takes 596 s, one test file at a time; the lane has 2 slots; over 780 commands: 365 min of runs and
  about 177 min of waiting [observed; `R:c1-report.md` 3(d), claims C46-C49].
- Coordinator numbers used in t1: H0 = 432.4k, W* = 133.2k tokens, "both from estimates; not measured on a tree run"
  [`R:t1-report.md` section 1, root-change row]. Child start P = 60,000 and S0 = 10,000 are "a guess"; 79,000 is a
  main session's median first call in other repositories (same section, Split row).
- Only session-level figure: five Sonnet readers used 767,000 tokens in four minutes, one trial (t1 section 1, Split row).

## 2. Results that decide a choice

### 2.1 The tree's shape (t1, first priority)

No kind of B-tree fits every size; three features choose: leaves the packer makes (L) against children one parent
holds per epoch (b); realised over estimated work per leaf (R) against 1/f; new keys during a run [`R:t1-report.md`,
"The answer" 1]. All three transfers to sessions are [hypothesis] on [quoted] database results.

| Case | Form chosen | Mark | Place |
|---|---|---|---|
| Small job known up front (L <= b, R rarely above 1/f, no new keys) | The bulk-loaded two-level tree we have; f computed from R; nothing splits, merges or latches while work runs. "Three levels, never more" and "no inner level" hold | [hypothesis] on [quoted] (C01, C02, C17, C28, C34, C72, C89) | t1 "The answer" 2; section 2(a) |
| Growing job (new keys, or R above 1/f at some leaves) | Add a split in the B-link form for unstarted keys only: new leaf first, the overflow record as its link, index posted by one script step under the run lock; a small remainder to an unstarted sibling or the next wave; no merge. A separator only where keys are worked in key order, else a list of ids | [hypothesis] (C86, C87, C88, C109 each "in part") | t1 "The answer" 3; section 2(b) |
| Very large (L > b) | More coordinator epochs or an inner level, whichever costs fewer tokens; a level only where its summary is much smaller than its inputs and its children run at once; depth = ceil(log_b L); width before depth | [hypothesis] (C79, C82, C83 "in part") | t1 "The answer" 4; table rows on levels |

Laws in ratios, all [hypothesis]: depth = ceil(log_b L) where levels win; b <= (g*k* - own growth per epoch)/s_summary;
f = 1/q_{1-p}(R) per capacity (one f for A_leaf and one for C_node); start tokens per useful token =
(P + S0)/(occupancy x A_leaf). "Thresholds are not given: each ratio needs its measurement" (t1 section 2).

Decided by the table, with what the record says to keep or drop:
- `fill_factor` 0.75 is read by no script (C02); it becomes a computed value in R47 [t1 table row 2; [hypothesis]].
- Fewer, fuller leaves at plan time; a running leaf that runs out ends and frees its slot (FX-CLOSE is this operation);
  no merge. An under-full leaf still costs its admission wake and end wake of the parent, plus a slot and a memory
  peak (C87 in part) [t1 table row 3; [hypothesis]; PostgreSQL never merges part-full pages, InnoDB merges below 50 %,
  LMDB below 25 %: [quoted] C96-C99].
- A small remainder goes to an unstarted sibling or the next wave, not a new leaf: a session split has no later
  arrivals, so a new leaf stays as empty as the remainder is small and pays a full start (C109 in part) [t1 row 5].
- The split's second step is one short serialised script step under the run lock; `tree-plan.json` and the task table
  get one writer (C91, C92). "No model call" holds only if a script or the watcher's tick posts it (C36 in part)
  [t1 table row 6]. Help-along (a passing session finishes the split) is not proposed: minutes and a window re-read for
  seconds of file work (C36 in part, a cost argument only) [t1 "Not proposed"].
- No re-packing into running sessions unless priced (C88 in part): costs a message and a wake of the receiver
  [t1 table row 7; R48(c) priced against P + S0].
- Copy-on-write records, one writer per shared file, keys named by question id through one map: exists (C16); a leaf
  id is a location, not a stable name, so a split rewrites one map entry (C112 in part) [t1 table; [observed] for
  what exists].
- Unit that outgrows its window: hands over (R50); a split there only under R49. FoundationDB's 5-second window is a
  reason to keep units short, not evidence for split over hand-over (C114 refuted) [t1 table].
- Merge policy by read share: each inner node keeps one bounded summary per child, rewritten per report. "Merge once
  at the top" is refuted (C51) because every parent call re-reads its window [t1 table].
- Hot leaf: drop duplicate messages in the parent's buffer; bounded restarts, then escalate. Only when observed: none
  seen in our files (C111 in part) [t1 table].

Ranked architecture for our case [t1 "The architecture proposed", [hypothesis], ranking by the cost each part acts on,
the coordinator's window first]:
1. Fewer parent wakes (a wake waits while nothing is urgent; backlog counted in tokens; trigger weighs fixed re-read
   against cost of delay). Mechanism [quoted] (B-epsilon, BetrFS, LFS: C37-C42, C48; 16x inserts for about twice the
   point-query cost is "an argument", C39; 14.3x is a worked model, C42); transfer narrowed, C50 and C113 in part.
   Batching divides only the fixed part of a wake (the re-read window) and only where the wake can wait. At each wake
   the coordinator already reads every ledger event since its last acknowledged seq (C18 in part), so content is
   already batched. Largest expected gain, unmeasured.
2. Plan-time packing with f from R per capacity.
3. Split of unstarted keys, B-link form (never fires for a small job).
4. More epochs or an inner level, priced in tokens.
5. One bounded summary per child.
6. Copy-on-write, one writer, one map (exists).
7. Duplicate-drop and bounded restarts (only when observed).

Not proposed: lock coupling (C29, C34); Bw-tree help-along; B* redistribution into live sessions unpriced (C88, C101);
merging part-full leaves (C06, C87); merge once at top (C51); FoundationDB window as reason to split (C114); a minimum
work per session from the page law (C59 refuted) [t1 "Not proposed, and why"].

What the choice changes in the 13 fixes [t1 section 3, [hypothesis] from C14]: case (a) changes none. Case (b) adds a
start act (the split) that passes FX-PLAN (`planAct`, `rowAct`), FX-CLAIM and FX-CLOSE. Case (c) makes FX-CGATE,
hand-over (FX-CGATE, FX-CLAIM, FX-W3) and FX-W3/W4 apply per inner coordinator, and the parent field goes into the
tasks schema FX-CLOSE already changes. Ten fixes edit `lib.mjs`, nine `status.mjs`, eight `watch.mjs` (C14): "the
fixes come first in every case, and (b) and (c) extend the same files after them". [observed] for the grep: nothing in
`research-tree/tcb/admit.mjs` or `watch.mjs` mentions parent, depth, level or tree-plan (t1 "Limits of this report").
R11's cut also stops running work, which the decision rule allows for memory only: either the cut becomes "commit at
soft_frac and end", or the rule names budget as a second stop (C92 in part) [t1 section 3; rule v2 decision 5 takes the
second form].

### 2.2 Several writers (w1), as it bears on running the tree

- For the tree: "Tree unchanged (W87)". Writers already have own copies (staging), objects are stored by exclusive
  create, run state has one owner by compare-and-set [observed, W87 confirmed; `R:w1-report.md` section 5 and table
  rows 2 and 5]. A reviewer reads a copy and holds no claim.
- Own copies are "the floor, not the method that gains". Only measurement on model sessions: version-checked writes
  82.5 %, one agent 66.4 %, own worktrees 63.8 %; Commit0-Lite, at most 4 writers, Sonnet 4.6, one preprint, one run
  per arm, no repeated runs (W62, W65 in part) [quoted; w1 table row 1 and section 7 item 8]. CAID reversed it:
  59.1 against 53.1 % for worktrees over one agent at 1,583.2 s against 692.6 s [quoted; DECISION-RULE-v2 Decision 3].
  "No conclusion here rests on a gap of a few points".
- Rule v2 decision 3: the floor stays as safety (own copies; every landing through the check in one order, with undo),
  not a claim that copies beat one agent [`R:DECISION-RULE-v2.md`, Decision 3; [hypothesis] for our sessions].
- Ranked architecture [w1 section 6, [hypothesis] for edits, marks per part in the file]: 1 reshape shared places so
  writes commute or land at integration (a unique "next free" number chosen by one allocator at landing; entries applied
  at landing); 2 version-checked writes with diff and short reservation on refusal; 3 claims below the file; 4 wait for
  a known hot pair; 5 checkpoints smaller than the unit; 6 every landing through the serial check, one order, undo;
  7 structured merge last. Dropped: deterministic order (needs the sets, W36, W37), OT without a server, whole-file
  CRDT, one owner per file as default.
- Overlap law (W90 in part): chance of overlap = 1 - C(F-k,k)/C(F,k), about k^2/F; a unit meets one of N-1 others with
  chance 1-(1-p)^(N-1), up to 15 times from 2 to 16 writers; textual overlap only [hypothesis]. p is measured per
  region from history, never computed from F alone.
- Harness cannot enforce today: the tier hook sees only helper and session starts (W85), so no per-file owner, claim or
  version check exists for harness builds; the Edit tool, shell writes and a timing-out hook were never tested (W86,
  W88) [observed; w1 section 5].
- Judge reads half-done edits: a test run in a shared copy judges another unit's half-done edits (Berenson P1/A1);
  design rule: no check runs in a copy holding more than the units it judges [w1 section 7 item 2, [hypothesis]; no
  measurement needed].
- Agent conflict rates [quoted]: 19.8 % same-agent and 41.7 % cross-agent co-active pairs, a lower bound (W58); 27.67 %
  of unmerged agent PRs against base (W60 in part, merged PRs excluded); STORM overlap 21.7 % at 4 writers, 35.1 % at
  8, cost up 2.2x from 2 to 8 writers, sublinear (W64 in part). None is our own pair rate.

### 2.3 The shared check (c1), as it bears on running the tree

- Workers sharing one check are the machine-repair queue. One slot: N* = (S+Z)/S [quoted: Denning and Buzen, Lazowska,
  Kleinrock via Sztrik]. For c slots no source stated it: N* = c(S+Z)/S, "computed on the exact model and following from
  two bounds for any time distribution" (C07; the refuter re-derived it) [computed, hypothesis for sessions;
  `R:c1-report.md` section 1 and 3(a)]. Waits start below N* (check 79-92 % busy at N*; C08, C66 in part). More
  workers never move the cap; less check time per change does.
- At 596 s a run: for 3 workers the cap is reached "with 2 slots only if Z/S < 0.5, with 1 slot if Z/S < 2"; for 16
  workers with 2 slots if Z/S < 7 [c1 section 3(c), computed; Z is known only as "a unit lasts minutes"].
- c1 ranked proposal for our check [c1 3(e), [hypothesis]; each mark the weakest link]: 1 shorten the run (suite files
  side by side: toward about 270 s from 596 s if files are independent, C58; select by changed files in the pre-check;
  full suite at the gate until a dependency map exists, then dependency-selected targets; prediction-based selection
  never at the gate); 2 batch what waits, capped by measured p (best pool 11 at 1 %, 4 at 10 %, 3 at 30 %, C19);
  3 test ahead on the success path (how a serial gate uses its second slot, C61); 4 let a waiting worker start its
  next unit with a cap (clock time, not tokens, C56); 5 make the queue visible and fair; 6 keep case B as worker cap.
- Our tree checker already batches "12 candidates (a guess) or when nothing else runs" [observed, C52]; the cap rule
  (p) would replace the "12". The coordinator cannot use the lane (C53) [observed].
- Published figures [quoted, several self-reported]: batching 41-72 % fewer runs (Ericsson, simulated; 41 % with flaky
  tests, C23); Ekstazi 32 % (54 % on long suites) but short suites up to 38 % slower (C38); Facebook half the cost with
  99.9 % of faulty changes caught (self-reported). C44 refuted: BMW's gate runs the dependency-selected targets, so
  "full suite at the gate" is now our own choice, not a published precedent.
- Withdrawn: C64 (a rerun differing from the first acts on batching): a split reruns the same merged code;
  non-reproduction comes from flaky tests or pair failures. Session nondeterminism enters only as the token cost of
  redoing a returned change.

### 2.4 What must NOT be ruled out yet

- Split versus hand-over: the record's conflict is open (D3-12 says a field is not split mid-research, D3-01 says the
  remaining work is split near the window's limit, D2-02 says redistribute to a sibling or defer). The B-link reading
  gives a split's mechanism, not the choice; R49 leaves it to measurement (C12; C90 refuted) [t1 section 3].
- An inner level (case c): kept alive by Dremel (two levels "off the chart" for Q3 at 1:2900, a fourth halved it; text,
  C70 in part) and RAO (196K against 1,029K tokens, 1.8-2.5x faster with 83.9 % of delegations concurrent; 18x slower
  at 1.6 % concurrent; trained agents; saving mostly cache reads, C76 in part). MacNet star 0.6267 against tree 0.6015,
  no CIs (C73), and self-formed depth at most 2 up to 64 agents (C77) point the other way. No controlled sweep of depth
  against fan-out at equal work with tokens per level exists [t1 "Not found"]. One study is not a verdict.
- Help-along and B* redistribution are dropped for cost reasons only; priced they could return (C36, C88 "a cost, not
  an impossibility").
- Whether a new leaf can start from files alone is unknown (keys share context, SELECTIONS-MAP D2-01) [t1 "Where I am
  not sure"].
- Shorter check at the gate: whether test files side by side slow each other (C66, rule measurement 3) is unmeasured;
  if they do, the 270 s figure and the second slot both move.

## 3. Open faults, open questions, missing measurements

"count" = over transcripts or files already on disk (no run); "run" = needs the owner's word (rule 3).

Tree (t1):
- Parent's tokens per wake split into the fixed re-read and what each child adds (s_summary); how many wakes could have
  waited. Count from transcripts on disk (C91). Sets rank 1 [t1 ranking table].
- R per leaf (realised over estimated work), from the pilot's predicted-against-realised log (R48(a)); spread of R per
  class of question. Needs the pilot (run).
- New keys per leaf lifetime; remainder over P + S0; whether keys are worked in key order (start order in the ledger);
  a session's start cost on a tree run (needs a run).
- Summary compression of an inner node (tokens out over read); share of children running at once (concurrent starts
  over all starts). Both needed before any level is added.
- Seconds a split posting takes; how often splits contend for the run lock: utilisation = (splits per hour) x
  (seconds per posting)/3600 [hypothesis]; neither measured.
- Whether a wake costs the same whatever it carries (caching may change it); whether occupancy figures from pages carry
  to tokens of work [t1 "Where I am not sure"]. A session's start time is "not recorded".
- r57-0505, not started: knowledge transfer between nodes and the CAP choice (C93, a scope statement that cannot be
  checked): may siblings read each other's findings (no child-to-child path today, C16); how a correction reaches a
  running leaf with an old version (C60); how stale a parent's summary may be (C71); copy logical change or whole
  record (C105, self-reported); dead sessions: availability or consistency. The report chose availability for the
  structure only [t1 section 4].
- Candidate corrections for the top session, not applied [t1 "Candidate corrections"]: `R:lane-tree.md:18` ("the owner
  then rejected the removal of the split" has no record behind it; the design step's ruling moved the split,
  `docs/program/evidence/research-tree/foundations-2026-11-16/design/result.json` lines 1034-1035); x03-0335 (Bw-tree
  failed splits are 0.25 % dedup, 1.27 % Xbox, 8.88 % synthetic, not "about 1.25 %"); x21-0318 (4.4 against 17.2 and
  -5.51 against -23.72 lack their conditions); x21-0470 (the 246 rows of room equals g*k*, shared with the
  coordinator's own calls).

Writers (w1), measurements M1-M9 [w1 section 6]: M1 count: k per unit, F per file, hot-place share, from change lists
and diffs of past units; M2 count: tokens of a redone unit, of re-applying a refused write from a diff, of the steps
since a checkpoint, from transcripts; M3 run: clock time a unit waits for an owner; M4 run: conflicts of session edits
on our neighbouring lines; M5 run: share of clean merges of two session units that fail the check; M6 count: share of
units whose change list crosses two owners; M7 run: whether a PreToolUse refusal stops Edit, whether a hook can check a
version, what a hook sees of reads; M8 count (replay): recorded units against escalation thresholds and wait-die; M9
count: minutes per unit and its spread, landings asked per hour. W97: reads inside shell commands are seen only as
command text unless a container traces file access.
- Open from refuter [w1 section 7]: Agrawal, Carey and Livny 1987 on "fake restarts" is held only as a summary, so
  "no source models a differing rerun" must not be said until read; Pradel 1986 not opened; wait-die and wound-wait
  for places found while working (M8).
- Proposed corrections [w1 section 9]: r57-0304 (OT is not ruled out for more than two writers; a central server is not
  covered); r57-0308 (19.8/41.7 % are pair rates, 27.67 % unmerged PRs, 21.1 % speed-up is the best task while the mean
  was 13.1 % slower); r57-0406 (the switch becomes the last rungs); r57-0301.

Check (c1): S and its spread, Z, p; independence of failures (C65); whether two runs at once slow each other (C66);
whether a run over k changes costs one run (C59, only while the gate runs the full suite); flaky share of our tests;
share of changes touching lib (selects every file); tokens of redoing a returned change ("no source sizes it").
BUILD-IN.md section 1 does not say whether two merges checked at once share one base or one sits on the other (matters
for C61 and C65) [`R:c1-report.md` 3(d)]. Proposed corrections c1-0500 to c1-0515 (the "reasoned" mark of the worker
cap, rule line 74 and BUILD-IN line 110, should change for c = 1: now published).

Decision rule v2 [`R:DECISION-RULE-v2.md`]: Q37 (later demand per window) is the one measurement added; Q01 to Q36
stand. Six points left open with the measurement that settles each: K9, K10, K15, K16, K17, K20; K7 order for
one-worker units (Q34); split or hand-over (Q30). Decision 4: V2-108 to V2-112 items are present in the reports;
"search terms not checked".

## 4. Costs

- Round 3 itself: no token figures stated in the five documents read; none given here.
- Tree-run costs, all [hypothesis] or estimate: child start P = 60,000 and S0 = 10,000 tokens (guesses from about 60k
  per agent today; 79,000 median first call in other repositories); H0 = 432.4k and W* = 133.2k coordinator tokens
  (estimates, not measured on a tree run); H_max = 2 hand-overs (a guess) [t1 operation-map rows Split, Root change,
  Hand-over of a leaf].
- Wakes avoided x fixed re-read is the expected saving [hypothesis]; "Per wake about the parent's window (C09), not
  measured" [t1 operation map, Buffer flush row].
- Check: one suite run 596 s [observed]; at one check per landing about 6 landings per hour; N writers with units of T
  minutes ask 60N/T per hour, check binds when T < 10N min: for 3 writers under 30 min, for 16 under 160 min (computed,
  hypothesis; w1 section 6 part 6, section 7 item 1).
- CAID's price for its gain over one agent: 1,583.2 s against 692.6 s, cost 8.1 against 1.9 as the paper counts it
  [quoted; DECISION-RULE-v2 Decision 3].
- No install, download, training or run was done in round 3 beyond reading. Papers needing the owner's sign-in, not
  fetched: Lanin and Shasha 1986, Sagiv 1986, Johnson and Shasha 1990/1993 (the 1993 utilisation by delete share would
  settle C65), Adya 1999, Cahill/Roehm/Fekete, Fekete 2005, IntelliMerge, Korth/Kim/Bancilhon, IEEE 9392370 (TSE 2021),
  ICSME 2021, shifting bottleneck (INFORMS), Duclos and Spencer, Reiser and Lavenberg (ACM). Mu'alem and Feitelson 2001
  needs OCR, which needs the owner's word.

## 5. Steps the record already proposes next for this track

- Fixes first in every case (13 fixes, branch `build`); (b) and (c) of the tree extend the same files after them
  [t1 section 3].
- Counts over files that exist, no run, come first (Q01, Q02, Q05, Q06, Q07, Q09, Q37's transcript part), then
  simulations swept over project sizes (Q08, Q33 to Q35), then runs with the owner's word (rule 3) [DECISION-RULE-v2
  section 4, r57-0515, r57-0028].
- t1: count a parent's tokens per wake and the wakes that could have waited, from transcripts on disk (C91).
- w1 counts, no run: M1, M2, M6, M8, M9. Runs: M3, M4, M5, M7.
- c1: S with files side by side and their independence (rule measurement 4); whether two runs at once slow each other
  (measurement 3); p per change at the gate; suite time on a merge of 1, 2 and 4 changes; share of batch failures whose
  changes each pass alone; flaky share; log slot count and number waiting.
- Design rule with no measurement: no check runs in a copy holding more than the units it judges [w1 section 7 item 2].
- Rule v2 decision 5: commit-and-end at a unit's cap is the checkpoint at the cap followed by the end of the session;
  the successor resumes as the tree's hand-over does (R50, "deferred and never built"). One mechanism for three places
  (stop at the cap, refusal under version checks, a leaf that outgrows its window). "Designed only; no literature
  source; untested."
- R49's ratio (split versus hand-over) is left to measurement; R48(a)'s predicted-against-realised log needs the pilot.
- Step 9 of the rule reads: kind by L against b and R against 1/f; f = 1/q_{1-p}(R); split or hand-over open (Q30);
  fewer parent wakes first; run-state files written by a script step [DECISION-RULE-v2 section 3].

Teammate's track, one line: the token-window pacing, model choice by summed price, backfilling and speculative copies
(`R:a1-report.md`; rule v2 decisions 1 and 2, Q37). The one place it reaches the tree is the parent's window rule
b <= (g*k* - own growth)/s_summary, covered in 2.1.

## 6. Not read

- The five named documents were read in full. Not opened: the lane claims files (`R:t1-claims.md`, `w1-claims.md`,
  `c1-claims.md`, `a1-claims.md`), gates, refuters, collect files, `R:RULE-V2-DRAFT.md`, `R:lane-tree.md`, the papers
  folder, the library journals (`library/journal/2026-11-19/*.jsonl`) and the owner's page `decision-rule-v2.html`.
  Every claim number above is as the report that cites it states it.
- Not opened by the sources themselves: the sign-in papers (section 4); Lanin and Shasha; Sagiv; Bayer and Schkolnick;
  Yao 1978; Baeza-Yates; Graefe 2011; Lomet 2004; arXiv 2606.05670, 2609.14767, 2609.11737, 2510.04311. Dremel Figure
  11 and Astrolabe Figure 6 not read as numbers [`R:t1-report.md` "Not found, not opened"].
- Not searched by t1: hierarchical task networks, Borg-style restart and eviction rates, TiKV, MongoDB's engine change.
- Not found in any paper read, per t1: how long a half-split lasts; a law in ratios for structure changes per insert;
  any study with 3 to 16 writers whose units last minutes; a controlled sweep of depth against fan-out at equal work
  with tokens per level for coding or research sessions; a direct LSM against B-epsilon measurement. Per w1: any
  mechanism measured with minute-long units or differing reruns; the crossover between locking and optimistic
  control; a study of AI agents in one repository measuring speed against writers with merge and test run counted.
  Per c1: N* with batch service in a closed queue; a measured suite-splitting speedup.
- The c1 addendum A1-A16 (GitHub, Shopify, Rust, Chromium, Tide, Mozilla queue accounts) is checked by the gate only,
  not refuted; all figures self-reported and none sets p. Not digested beyond this line (Shopify cap 8 and 3 batches in
  flight; GitHub 33 % lower average wait; Rust about 10 PRs a day at about 2 h a run).
