# R1 tree design (digest for top session 9)

Reader: R1 (Sonnet), 2026-11-24. Sources read in full: `research-tree/START-HERE.md`, `research-tree/DESIGN-RECORD.md`,
`research-tree/SELECTIONS-MAP.md`, `research-tree/FAULTS-AND-FIXES.md`, and `docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md`
(called "protocol" below; read sections 1, 2, 5, 6, 7, 8, 10 to 13, 15, 16; sections 3, 4 only as rule headings; section 9 table not read).
Marks: [quoted] = the file states it as a published source or as a record; [measured] = measured or seen in this project, as the
file says; [hypothesis] = reasoned, untested, or the file marks it a guess/estimate/stand-in. I never upgrade a mark.
Caution from START-HERE.md ("Where it stands", intro): the digests (SELECTIONS-MAP, DESIGN-RECORD) were extracted by small-model readers and
are not checked row by row.

## 0. What the tree is for, and how it is shaped (context for sections 1 to 5)

- Purpose: a tree of research sessions ("fields" = experts, each owning a range of question ids) that researches, writes cited
  "cards", and reviews, so that each answer is backed by a source whose quote and number are checked by script. The aim is fewer
  mistakes and fewer hallucinations in research output: the protocol's checks are about citation failures, unverified cards,
  planted-fault detection and a comparison of the tree against one session (protocol §11 "Comparison 1", "Comparison 2"; §5, §6).
  The owner's core idea: "the child that researched also reviews" (protocol header "Status"; §15 item 2, which says the 300,000
  ceiling and the second-expert form were the coordinator's additions, not his word) [quoted].
- Method: "no rule is made up for the occasion": each of 21 problems (P1-P21) is an instance of a solved problem in a field of
  computer science, the whole design is borrowed, and where its assumptions fail for language-model sessions the document says so
  (protocol §1, the owner's quoted words) [quoted].
- Seven layers (protocol §1 table; DESIGN-RECORD §1): 1 execution (master-worker batch job under a supervision tree, crash-only,
  admission by reservation, progress-kicked watchdog, level-triggered wakes); 2 storage (append-only, content-addressed,
  multi-version store, views, truth maintenance); 3 integrity (Clark-Wilson, Biba low-water labels, least privilege);
  4 evidence (rapid systematic review with GRADE certainty); 5 assurance (independent V&V with seeded faults, acceptance sampling);
  6 shape and cost (B+ tree bulk loading, square-root hand-over law, load control, Smith's rule, internal pilot);
  7 completeness (STPA and FMEA blind analyses, capture-recapture, a model-checked protocol, FRACAS).
- Rules R1 to R60 across the protocol; the pilot set is 25 scripts plus `lib.mjs` (DESIGN-RECORD §1, ruling `pilot_set_final`;
  protocol §10).
- The record says the claim of borrowed guarantees is conditional: "No source measured a tree of language-model sessions like this
  one" (protocol §13) [quoted]. Of about 226 checked citations about 26 were looked up by web search, none in D4; the rest checked
  "mostly from memory of standard records" (protocol §13) [quoted].

## 1. What was built, run or measured, with numbers

Tokens and time were not measured for the tree's quality (it has not run); what exists is the design, the build of its scripts and
a model check of the control protocol. Measures named: quality (via checks), time and tokens only as design estimates (section 4).

### 1a. Design and its checks (2026-11-16)
- Version 2 written by six designers from 103 mappings (13+13+14+12+14+13+13+11 across eight fields D1-D8), model-checked, attacked by
  four refuters (46 findings), revised on a mapper's ruling (27 edits) (protocol §15; DESIGN-RECORD §3, §1) [quoted].
- First model check on the composition: 13 configurations, 2,952,880 states, six flaws F1-F6 plus A1-A8 amendments
  (DESIGN-RECORD §3, §4; model.flaws lines 450-507 of `foundations-2026-11-16/design/result.json`) [measured, as recorded].
  Its fidelity review: reproduced every count, but found weak or vacuous properties (AtMostOneCommit, Slots at N_max=3, RestartLimit,
  FailedTaskStopped, NoFalseSuspicion) and "FIX_*" switches that are oracles, not designs (DESIGN-RECORD §3) [measured].

### 1b. The trusted scripts (2026-11-17, protocol §16 point 1, 7, 9)
- Built in 31 stages, 20,560 lines (START-HERE "Where it stands"); an interface contract plus 26 specs attacked by two refuters
  (48 findings) before code; `tcb/lib.mjs` with 88 exports and 58 schema files; 24 scripts in five units; 11 role profiles; two
  agent files; eight briefs (protocol §16 point 1) [quoted].
- Tests: coordinator's run after the closing round: 26 test files, 1,018 tests, 965 pass, 0 fail, 53 skipped (all skipped need the real
  app); end-to-end 232 of 232 steps (protocol §16 point 9, "The coordinator's own run"; `done/verify-2026-11-17.txt`) [measured].
  The earlier e2e-build run was 22 of 24 steps (246 of 250 checks), four failures found then fixed (protocol §16 point 7) [measured].
- Review and mutation checks per unit (protocol §16 point 1 table): e.g. U1 31 of 40 mutations caught, U2 27 of 32, U3 20 of 26,
  U4 31 of 40, U5 21 of 26; mutation counts disagree inside two records (lib-review 13 of 14 vs list 15 with 14; review-U2
  26 of 30 vs list 32 with 27) [measured; inconsistency noted by the file].
- Six scripts (admit, check-queue, handover, replace, seed, stop) did nothing and exited 0 when started through a junction;
  fixed in the closing round; `main-guard.test.mjs` 24 of 24 (protocol §16 points 1, 9) [measured].
- Fixes M1 to M6 (alarm busy loop, dead first turn, watcher never exits, three sessions beside N_max=2, double sleep counted as two
  hang ticks, planned hand-over fencing a written READY) written into the contract and U1 scripts; tests 245/0/17 (protocol §16 point 2)
  [measured].

### 1c. The protocol model run (protocol §16 point 11)
- Groups 1 to 5 only, 59 configurations, 5,163 parts: 5,154 complete, 9 BOUNDED, none failed; 3.43 billion states, 53,447 cpu-seconds;
  about 2 h 15 min in all (estimate had been about 4 h for 4 workers) [measured]. The nine BOUNDED parts are all A-FENCE-CE (state
  space has no end per the fidelity review), so none is rerun [quoted].
- The adopted design before the six fixes fails the same seven properties at every size (Slots, ReadyNotDiscarded, NoFalseSuspicion,
  NoDeadlock, AlwaysCanResolve, NoBusyLoop, EventuallyResolves); with the six fixes the idealised design holds all 14 properties
  at: 2 fields with 2, 3, 4 faults (4 faults: at most one of each kind) and 3 fields with 2 faults, R = 1 and R = 2 [measured].
- Each of the six fixes shown needed in the model (every "X-" row fails at 2 and 3 faults). 2 of 20 ablations (A-DRAIN, A-WX) fail
  nothing; the file says this is about the model, not that the safeguards can go (protocol §16 point 11) [measured].
- Largest early-run ladder: 92 parts needed 1,150 MB, 26 needed 2,600 MB, 2 needed 6,000 MB (largest 28.1 million states, 3,115 MB)
  (protocol §16 point 11, "Sizes") [measured].

### 1d. Things measured elsewhere that the design uses (protocol §11 "On record already", §7, §16 point 5)
- P = 79k tokens fixed context per session, about 60k per agent, g = 2.8k tokens per call (`SPLIT-RULE-2026-11.md`,
  `TOKEN-BOTTLENECK-2026-11.md`, cited by protocol §11) [measured, as the protocol states; sources not opened by me].
- A build session's fixed context before any message was about 75,000 tokens (system 13,565; tools 21,412; connector tools 13,758;
  memory files 16,330; skills 9,972); stood at 179,773 at 12:10, 217,073 at 13:05, passed 250,000 about 14:10 (protocol §16 point 5)
  [measured].

## 2. Results that decide a choice

Nothing about the tree's quality (the tree against one session; same-window review against fresh review) has been run: both are
pilot comparisons (protocol §11). What decided design choices is the paper design, the model run and the attack.

### 2a. Choices the record made (and the source of each)
- Two trust grades: a script certifies only that quote and number are in the stored page ("witnessed"); what the number means is
  judgment ("confirmed", measured), never "certified" (protocol §1 "Where the experts' mappings overrule the frame"; D7-01, D1-05) [quoted].
- Same-model agreement never raises a claim; independence is measured, never assumed; diversity must come from inputs, method or
  another model (R37; D6-01, D4-02, D1-04, D5-05, D7-09, D8-03; SELECTIONS-MAP) [quoted]. The cheapest real diversity is another
  provider's model (F3) (protocol §12) [hypothesis, as the protocol marks it "silent: none"].
- Do not fuse research and review stages (pipes and filters, D8-07), but the owner's idea is the opposite (same child reviews);
  amendment 1 stays the silent default until the pilot's two reviews are compared (protocol §12 F1; §15 item 3) [quoted]. The record
  states: "no source compares the two here" (protocol §12 F1).
- The tree is a B+ tree only where something must share a window: the pack at review. Bulk load at fill factor f = 0.75, split by key
  range at plan time, never a split of the pack afterward (R46 to R48; D2-01, D2-02). Source check: ln 2 occupancy holds only for
  high-order B-trees (protocol R47) [quoted]. At seven leaves: only node capacity, fill factor, key-range split with a separator, and
  never dropping a key are borrowed; height, search, latches, merges add nothing (protocol §7 "Where the classical assumptions fail")
  [quoted].
- Hand-over by the square-root law with a state-growth term: k* = sqrt((2H0 + sigma*n_rem)/g); the plain law handed over about twice too
  often on stand-in inputs (16 calls against 35 found by simulation) (protocol §7 R50; DESIGN-RECORD §7; derived here, "D3-12 has no
  source") [hypothesis: stand-in inputs, parameters guessed].
- Left out on purpose: consensus, two-phase commit, distributed locks, same-model voting, debate/Delphi (conformity), injection
  filters, GRADE upgrades, meta-analysis, backup tasks (double tokens), bidding (sessions cannot estimate own cost), a database
  engine, FMEA risk numbers and fault trees (false precision) (protocol §10 "Left out on purpose"; SELECTIONS-MAP "do_not" list) [quoted].
- Deleted not deferred: SPRT, pause detection by tick gaps (later partly restored as M5), watcher deadline exit, stored escrow, intent
  files other than owner messages, R57 as a gate in the original form, "LCF kernel" and "forward integrity" claims (protocol §10; but
  §16 says "strike" on the pause-detection entry) [quoted].

### 2b. Model-check results (idealised design)
- Without the six fixes the design fails seven properties at every size; with them none of 14 fail at the sizes run (section 1c)
  [measured, for the idealised model only].
- With the fixes as built (four oracles removed), the fidelity review found that NoDeadlock and AlwaysCanResolve fail with one fault
  within 2 steps, ReadyNotDiscarded within 5 steps in 43 of 43 parts, NoFalseSuspicion within 6 steps (protocol §16 point 2) [measured].
  So the model result is not a verdict on the built scripts.

### 2c. What the record says must NOT be ruled out yet (one null is not a verdict)
- Whether R_same (review in the child's own window) beats a fresh review: not tested, not decided; pilot writes both (Comparison 2,
  protocol §11; §12 F1; "can show whether R_same's extra sentences carry correct knowledge the pack lost"; "not equivalence").
- Whether a second expert (F2) or a second provider's model (F3) buys quality: measured before bought; the D6-10 crossed design
  (a review of pack B from an independent research run) can answer at the cost of about one more research run (protocol §12 F2, §11)
  [hypothesis].
- Whether amendment 1's single session to 300k, or roll-overs at W*, give better reviews: not known (DESIGN-RECORD §5 "Open facts")
  [quoted]. The 300k figure is "the coordinator's, not his" (protocol §12).
- Backup tasks, consensus and bidding are ruled out for stated reasons (cost and same-model correlation), not by experiment
  (SELECTIONS-MAP). The model-check results also leave open: 3 fields with 3 or 4 faults, two faults of a kind, A-FENCE-CE with 2 and 3
  faults were not run (protocol §16 point 11 "Not shown").
- The tree compared against one session: "It can show a difference above |S1 - S2|, a gross failure and real costs; not equality, nor
  other fields" (protocol §11). So even a pilot null would be one field, n = 1 per arm.

## 3. Open faults, open questions, missing measurements, and what each needs

### 3a. Faults in the scripts as built (research-tree/FAULTS-AND-FIXES.md "What the scripts get wrong today"; protocol §16 "Open defects")
1. A child's finished result can be thrown away by a fence that races it (READY races the fence) [observed in failing traces `CEX-fence.md`].
2. Two sessions can be started for one attempt (a late transcript).
3. A finished child can hold its slot for ever (a close only a session performs), so the tree stops admitting.
4. A stale coordinator can start a session, if coordinators have the session tools (no --ce fence on the session-tool start).
5. One coordinator turn that dies can leave nothing to wake the tree (proposed fix: a dead-man check outside the tree).
6. A healthy slow call of about ten minutes is taken for a hang and fenced; NoFalseSuspicion fails in every part within 4 steps, at the
   cost of the one restart R = 1 allows (proposed fix: count transcript growth).
7. A due act is raised once; a coordinator that ignores it leaves it unraised for ever.
Also: no coordinator brief carries R6's acts; a row committed at `started` cannot be stopped; test flags of the scripts can be
reached by the coordinator; possible wake loop when the process list is unavailable (untested); weak properties (RestartLimit vacuous,
TwoCoordinatorsAct restates the fence, AtMostOneCommit's mechanism never exercised, Slots weaker than R10, R5's loop rule never
exercised) (FAULTS-AND-FIXES; protocol §16). Status: START-HERE's table (dated 2026-11-18) says "Thirteen fix designs. None built";
START-HERE's "Next" paragraph says the build was started on 2026-11-19 with `research-tree/build/STATE.md`. I did not read STATE.md;
the present state of the 13 fixes belongs to another reader.

### 3b. Facts to measure first
- Does a hook's input carry the session id? FX-CLAIM and FX-CGATE (two of four large fixes) cannot be built without it
  (FAULTS-AND-FIXES "Two facts to measure first") [open].
- Can a coordinator start a session on a turn the owner did not type? On 2026-11-17 the app refused it for a session started by another
  session; if so, FX-CGATE's gate on session starts has nothing to gate (same file) [observed once].
- Ten harness facts "believed, not verified" (protocol §13): hooks fire before every tool call, helpers included, and honour exit 2;
  transcripts carry reader results and checker verdicts parseably and link helpers to parents; a stop ends helpers; a background script
  keeps the PC awake; each child session is a separate OS process findable and killable by its folder; start time readable (PowerShell)
  against PID reuse; a background command's exit starts a coordinator turn (also during a turn, sleep, after ce changed); user-level denies
  bind every session and cannot be bypassed through `node`; which settings files apply in an attempt folder; whether a pre-call hook sees
  an Agent call's schema and transcript path. Each has a probe in the pilot's fault list (R42) and a stated fallback.
- The 21 facts about the app that the fix designs lean on; 3 are file checks (FAULTS-AND-FIXES "How big the rest is").
- After the owner's 2026-11-17 ruling on testing (protocol §16 point 12), the app checks before the pilot shrink to three: the guard hook
  firing for helpers, a stop ending a session with its helpers, a background command's exit waking the coordinator; all others "only if
  the pilot shows a need" [quoted].

### 3c. Model and design questions the record left open
- R57 is blocked by its own rule: "A counterexample blocks the change... until the extended model holds" and gate.mjs passes only when
  R57 passes, and admission needs the gate (protocol R55, R57, §16 point 2). The model does not yet model four fixes as built (M2, M6, M5,
  M3 close to an oracle), nor reconcile nor the --ce fence; M1 is half modelled; M4 reads true liveness (protocol §16 point 2).
- Six rulings the build left with the owner (protocol §16 point 9 table): U3-F8 is the mapper a helper or a task role; U2-F2 harvested
  cards URL-checked or not; U5-PF-1 which file's hash the owner line records; LR-4 report an unreadable lock; coordinator session
  tools (host tool prefixes; until then guard-hook refuses them); M6 library half (widen lib.fence's READY re-check or keep). These are
  design points; CLAUDE.md rule 7 says they are derived or measured, not put to the owner.
- Splitting rules disagree with each other: D2-01 and D2-02 split by question range at plan time; D3-12 says a field is not split in the
  middle of its research; D3-01 says remaining work is split when the window nears its limit (FAULTS-AND-FIXES, "Two things in the record
  to respect"). To be settled from the record before touching splitting.
- Five fixes use another variant of the same family than the record selects (FX-OUT, FX-CLOSE, FX-PLAN, FX-W2, FX-W5); the build should
  use the recorded form (FAULTS-AND-FIXES table).
- Doubts left open by the composer (DESIGN-RECORD §5): the document's length (612 lines against "about 520"); one ledger with
  commit.mjs reading attempt folders is the composer's simplification, lock contention not measured; the capacity check in the guard
  hook assumes briefs name question ids parseably and that hooks fire for Agent calls (neither verified); checker calibration of 112 items
  at d0 = 0.8 is a real pilot token cost; about 34 pilot scripts in the first composition (cut to 25 by the ruling); quoted figures
  (2.4 to 4.4 times; completeness 40 to 80, about 7) come from guessed or contaminated inputs; source-check counts differ per field.
- Open facts (DESIGN-RECORD §5, ruling.not_established): pilot total token cost; coordinator calls per wake and owner start latency; whether
  amendment 1's single 300k session or W* roll-overs give better reviews; whether held-out seed recall overstates coverage; whether the
  coordinator can start its own successor cheaply.
- Completeness estimate "is not valid" (Chao2 gives roughly 40 to 80 unseen risks; a two-method Chapman about 7 but that pass read the
  lists first); it is reported as a reading, never a stop or gate (protocol §8 "What the estimate says today").
- Quality-measuring gaps: hand-made seeded faults may be easier than real ones; 2 to 4 plants per expert give no rate (pooled);
  same-model checker independence is a worst case (protocol §6 "Where the classical assumptions fail"; SELECTIONS-MAP D4-01, D4-11,
  D5-05). Checker detection rate per class (d_k) is unmeasured: the pilot measures it (protocol §11).

### 3d. Unmeasured parameters (protocol §11, §13 "Unmeasured": "every parameter except those on record")
c and h (stall and hang counts; "guesses until the pilot measures them"), Delta and delta (poll gaps), peak spend rate, wake latency,
peak memory (reserve, N_max), tokens per meter percent, W_cc, H_max, Z, g, S0, sigma, h_c, o, q_f, w per role, t_q, kappa_q, unit costs,
serial fraction, estimate error, harvest exactness, quote-found rate, false mismatches, d_k, plants found, held-out seed recall.
The one pilot field "is chosen, not drawn, so nothing it shows generalises" (protocol §13).

## 4. Costs and their bases

- Coordinator window: hand-over interval W*_coord = 133.2k (count) or 157.1k (weighted cost); k* = 17.6 calls (26.1 weighted); with a
  script-written status W* = 133.0k; H0 = 432.4k; fixed lines in force: coordinator 200k, child 300k quality cap. Basis: stand-in inputs,
  tagged E (estimated) and G (guessed) in the record (DESIGN-RECORD §7 "Hand-over rule"; `result.json` line 343) [hypothesis]. Recorded
  main-session average 333.0k to 396.0k per call [measured per DESIGN-RECORD; source not opened].
- Research child (n = 237 work calls, state growth 8.0k per epoch, cap 300.0k): at g = 2.8k, k* = 16.1, W* = 115.0k; best constant k by
  simulation 35 at 37.17M tokens; adaptive 37.56M with 8 hand-overs; one session reaches 730.8k (over the 300k cap); hand-over total
  44.98M; hand-over pays from n = 29 calls at g = 2.8k, 22 at 5.0k, 16 at 10.0k (DESIGN-RECORD §7) [hypothesis: g, S0, sigma guessed].
- F1 price (same-window versus hand-over): 126.42M against 52.57M tokens, ratio 2.40 at g = 2.8k; 3.24 at 5.0k; 4.37 at 10.0k
  (DESIGN-RECORD §7; protocol §11 "2.4 to 4.4 times") [hypothesis, stand-in inputs]. The window passes 300k after about 82 calls at
  g = 2.8k (DESIGN-RECORD §7).
- Pack capacity C_node = W_quality - P - R_rev = 180.0k; P = 79k session, 60k agent [measured for P; C_node computed] (DESIGN-RECORD §7).
- Speed-up: S(1..3) = 1.00, 1.67, 2.14 at serial share s = 0.2; 1.00, 1.43, 1.67 at s = 0.4; 1.00, 1.25, 1.36 at s = 0.6; "time only; tokens
  never fall with N" (DESIGN-RECORD §7; D3-11) [hypothesis: s and memory guesses]. N_max = 2 until peak memory is measured, never above 3
  (protocol R10). Note: CLAUDE.md of the repository says the old "three at most" was a memory rule, withdrawn (r57-0032); the protocol
  and DESIGN-RECORD still carry 2 to 3; the live rule is the decision rule (r57-0414) per CLAUDE.md, which I did not open.
- Escrow factor 1.82 until two fields are measured; with 6 pilot-units left at most 3 pilot-sized fields at once; re-plan when
  actual/estimate > 1.5 (DESIGN-RECORD §7) [hypothesis]; whether 1.82 survived the rename to "admission reservation" is not recorded.
- Calibration cost: 14 checker calls per class at d0 = 0.8 (Clopper-Pearson counts calls); 112 checker items if one seed per call
  (DESIGN-RECORD §7, §5 doubt 4) [computed; real pilot token cost].
- Pilot arms T, R_same, R1, R2, S1 and S2 (optional): S1 runs no fan-out to the 300k line (protocol §11); the pilot's total tokens over all
  arms must be stated before the pilot (R53); off by more than 2x, no fan-out choice rests on the model (R53) [hypothesis].
- Model check cost: groups 1 to 5: about 2 h 15 min, 53,447 cpu-seconds, 3.43 billion states; the whole 77-configuration matrix was
  estimated about 21 days, peak about 8,300 MB, and was not run after the owner's decision (protocol §16 points 1, 11) [measured/quoted].
  Peak memory ladder in section 1c.
- Build size of the remaining fixes: 14 units, 4 large (FX-OUT, FX-CLAIM, FX-CGATE, FX-W4), 8 medium, 2 small; 12 scripts and
  `thresholds.json` change; 2 new source files; 52 tests to add (FAULTS-AND-FIXES "How big the rest is"; `BUILD-SIZE.md`, estimates from
  the change list, not from a diff) [hypothesis]. Ten fixes edit `lib.mjs`, nine `status.mjs`, eight `watch.mjs`.
- The build of 2026-11-17: tokens not recorded (protocol §16 point 4: "The token count at the stop is not recorded").
- Installs: PDF text extraction is "an install, needs the owner's word" and is deferred; F5's Node fetch script, local page snapshots
  outside git, and a PDF text package are owner items; without F5 every card is unverifiable and the pilot only measures (protocol §10,
  §12). Sizes and sources not stated in the files I read.
- Incidents (time cost): the build lost time to program-start blocks on 2026-11-17 at 01:26, 02:50, 05:12 and 15:43; the cause is
  not established; the antivirus was uninstalled 17:13 as the test (protocol §16 point 4) [observed]. A helper stalled for 22 minutes
  at 13:57 when a long command was moved to the background after 180 s (protocol §16 point 4) [observed].

## 5. Steps the record already proposes next, with cost and preconditions

- Build order if the owner says build (protocol §15 item 5): stage 0 probes of ten harness facts plus the extended model; stage 1
  execution and storage core; stage 2 integrity and assurance; stage 3 pilot comparisons. The build's go was given 2026-11-19 and a
  root session runs it from `research-tree/build/ROOT-START.md` (START-HERE "Next") [quoted; current state not read by me].
- Build the 13 (or 14) fixes against the recorded selections: lanes computed by the plan check from four limits (collisions, the check, the
  review, the token window) in `research-tree/BUILD-PLAN.md`; precondition: fix function signatures and file formats between the files
  (`planAct`, `outcomeState`, `liveness`, `realProc`, `requireArmed`, `acquireLock`, the kind returned by `parseTranscript`, `slotCount`,
  the 13 runtime file kinds, the keys of `thresholds.json`) before a cut by file (FAULTS-AND-FIXES).
- New thresholds ship as marked guesses; the pilot measures them (FAULTS-AND-FIXES "Parameters").
- Measure first: hook input carries the session id; whether a coordinator can start a session on a turn the owner did not type
  (FAULTS-AND-FIXES).
- R57 extension: model the four oracle fixes, reconcile and --ce as built, rerun at the sizes where the fixes act (owner's cut 1, protocol
  §16 point 12); cost not stated beyond the 2 h 15 min of groups 1 to 5.
- Before the pilot (protocol §10 "Before the go"): both blind analyses (STPA, FMEA) on the design cut, hazards mapped, a passing gate with
  the extended model's passing run; the tcb commit hash in the owner's go message; user-level deny rules applied by the owner; approved
  question list, approach ids, frozen protocol and frozen analysis plan with the predicted total over every arm; run root outside every
  repository; lean baseline from a control session in an empty folder.
- The pilot (protocol §10-11): one field as one frozen leaf; Comparison 1 (tree against one session S1, optional S2: McNemar, blinded
  scoring, "descriptive, n = 1 per arm") and Comparison 2 (R_same, R1 fresh, R2 spread; k planted wrong assumptions; plants found with the
  right reason); fault-injection probes (kill a child, sleep once, forced hand-over, stale-epoch write, a loop, one lost wake); it also
  measures the section 3d parameters. Preconditions: owner's go; cap and allowance (F4); F5 (fetch script, snapshots) else every card is
  unverifiable; thresholds approved or logged as silent defaults (d0 = 0.8, beta = 0.05); approvals of question lists, protocols, the
  analysis plan. Cost: "about 35 pilot scripts" were cut to 25 plus lib; a total pilot token figure is not stated (R53 requires one) [open].
- After the pilot: plan-tree.mjs bulk load on measured t_q; budget from unit costs (R52); order by Smith's rule (R51: F2 3.00, F7 2.50,
  F6 2.22, F4 2.14, F5 1.67, F3 1.25 by weight per estimate, weights an owner item); certainty.mjs before the first synthesis; later
  scripts (fracas, salvage, stop-check, second-opinion, correct-rates, challenge, cooke) (protocol §10 "Moved to later").
- If the build is judged too big, the record's honest alternative is a pilot on stages 0 and 1 only, with every card labelled unverified
  (protocol §15 item 6).
- Ruling on testing in force (protocol §16 point 12): "a test runs only if its result can change what we do next"; one attack round per
  fix; the full suite once at the end of a change.

## 6. Not read

- `research-tree/build/STATE.md`, `BUILD-PLAN.md`, `BUILD-SIZE.md`, `ORCHESTRATION.md`, `RULINGS.md`, `ATTACK-AND-COST-RECORD.md`,
  `FIX-VS-SELECTIONS.md`, `model/as-built/*` (FIX-fence, FIX-wake, FIX-JOIN, CEX-*), `notes/r3-changes.md`: named by the files I read; I
  cannot say what changed after 2026-11-18 (START-HERE's date). START-HERE says the 13 fixes are not built; the "Next" paragraph says the
  build started 2026-11-19; the file does not say where it stands.
- The sources behind the record: `docs/program/evidence/research-tree/foundations-2026-11-16/map/result.json`, `.../design/result.json`
  (line numbers cited via DESIGN-RECORD and SELECTIONS-MAP), `attack-2026-11-16/`; the cited papers. Every statement about a borrowed design
  rests on the extracts and on the protocol, not on a reading of the source mappings or the papers.
- Protocol sections 3, 4 (storage, integrity) read only as rule headings; section 9 (every problem and its fix, the 58-row table);
  section 14 (sources); section 8's remaining lines after R58; section 11 comparison details beyond what is quoted above.
- `docs/program/RESEARCH-DIRECTION-2026-11-16.md`, protocol version 1, amendments 1 to 3 (named as the record of how the problems were
  found); the quality-mechanism "how the tree is tested" beyond protocol §11 and §6.
- `docs/program/evidence/harness-method-status-2026-11-18/README.md` and `pc-freezes-2026-11-17/VERDICT.md` (named only).
- Named but possibly missing: `tree-v2/cost/cost.js` and `tree-v2/model/model.mjs` ("existing prototype" in protocol §7, §8) are not
  located by me; `SPLIT-RULE-2026-11.md` and `TOKEN-BOTTLENECK-2026-11.md` are named in protocol §11 as the source of P = 79k and g = 2.8k
  (not opened). I did not check whether they exist.
- The "teammate's" token-saving work (the store, the router, caching) appears in the tree only as the hand-over law and cost model; not
  digested here.
