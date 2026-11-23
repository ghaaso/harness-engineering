# X-refute: blind check of `research-tree/build/TRACK-PLAN.md` (top session 9, 2026-11-24)

Helper: refute, Opus. Read the plan, the digest (`TRACK-DIGEST.md`, "TD") and the originals one step rests on. No
session's reasoning about the plan was read. Marks as r57-0010: [quoted], [measured]/[observed], [computed],
[hypothesis]; a mark is never raised above its source's. "Plan l.N" = `TRACK-PLAN.md` line N.

## 0. The answer

The plan's order and its arithmetic mostly hold: the merge facts check out against git, the six-step and all-steps sums
add up, and the pilot's figures follow PILOT-PLAN. It breaks in five places that matter:
1. **Step 6** (the stronger check on the clinic's defects) has a missing precondition (the clinic's suite needs
   PostgreSQL and its Python environment, in a container under rule 3) and no case-building cost, which is the recorded
   mistake t7-0602 again; its "fail" branch points at three forms the replays already ruled against piloting.
2. **Steps 7 and 8** (D4, D2 Phase A) are priced below one measured builder unit, on a judged R, and they need baselines
   (the typed graph, the RRF ranker) that exist only for FixFlow. The fan-out gate built on 2026-11-24 refuses any start
   whose limit cites no measured record, so these limits cannot be used as written.
3. **Step 1 against step 3:** step 1 removes the `hb` worktree; the pilot preparation's fix round lands in `hb` on
   `build`. After step 1 the "single line" also forks again, since that round commits on `build`.
4. **Two families ruled out on one screen:** step 8 "fail drops learned retrievers", step 7 "closes the encoder family",
   and the pilot's "gross failure rules the tree's form out for research fields" go past what one test can say.
5. **The Fable check omits his own Fable use to the reset,** which PILOT-PLAN counts. With it the coordinator fits at its
   expected and its upper quartile, but not at its 270 M limit.

Smaller: 2c and step 9 run before the step that decides whether their result matters (r57-0004); 2c is priced below
every measured transcript scan; no keep-awake for card runs; AnyBURL's RAM against the 6 GB cap; the embedder "or" reads
as a choice put to him. Each finding below gives its place, what breaks, and the smallest fix.

## 1. Findings, most serious first

### F1. Step 6: missing precondition (containers, database), and the cost leaves out case building
- Place: plan l.86 (table row 6, "no card, no install"), l.191-199 (s3.5), l.323 (line 6 for him: "no card, no install").
- What breaks:
  - The cases are the clinic's committed fix-created defects (JR s4 item 2: "10 of S2's 15 defects (8 in Python)"
    [measured L8]; L8 ran them against the clinic, `replays/JUDGE-REPLAYS.md` line 25 [measured]). The clinic's full
    suite runs on Python 3.13 through uv with PostgreSQL 17 in a Docker Compose project, 676 tests
    (`replays/replay-L6/cases/c06-B.md` lines 85-106 [observed]). Running "the merged code's full suite" at each
    defect's head is an experiment. CLAUDE.md rule 3 says it runs in a container with the network off. No such image
    for the clinic is in the record, so it needs its packages downloaded (an install, named with source and size) or a
    rule-3 exception like the pilot's. SYN 3.1, the design step 6 folds into, says "containers per repository about 10 h
    of manual work each where none exist (f8:48)" (`RUN:closing/SYNTHESIS.md` line 648 [quoted design, hypothesis]).
    The plan applies that line only to step 11 (l.244).
  - Cost: 10 cases x R = 47 M (l.197) has no line for building the cases: each needs its merged head checked out, the
    guard the fix claims found, mutants written, and the suite run against a database. The record has this exact
    mistake: t7-0602 [measured]: "replay-L6's plan gave building its cases no cost ... 12.40 M ... 33.7 M against 9.4 M
    expected. When planning a replay or pilot whose cases must first be built from records: put a token figure on case
    building." R = 4.7 M is itself "a judgment" (TD s6, l.482).
  - The fan-out gate (`.claude/hooks/fanout-gate.mjs` lines 293-298 [observed]; t8-0110 [observed]) refuses a start whose
    limit cites no measured or observed record. "10 or 15 R" cites none.
- Smallest fix: add to step 6 (a) a measurement in step 2b: does a clinic image exist, and if not, the source and size of
  its packages and the PostgreSQL image; (b) an approval line for that install or for a rule-3 exception; (c) a cost from
  measured records: case building (t7-0602, about 248 K a case for text cases, a low bound here), the harness as one
  builder unit (r57-0173, 32.3 M, 18.5-38.0) and the runs as run helpers (r57-0188, 1.55 M each); cite them in the limit.

### F2. Step 6's "fail" branch is stale
- Place: plan l.198-199 ("fewer moves the tree's checking spend to L6, L8, L11").
- What breaks: that line comes from SYN 3.1 (`SYNTHESIS.md` line 650), written before the replays. The replays then found
  all three "against piloting, each for one form on these records" (JR s1, `replays/JUDGE-REPLAYS.md` lines 10-13
  [measured]). A fail would move spend onto forms already judged not worth piloting, so the branch decides nothing.
- Smallest fix: on a fail, the next form is the other stronger check JR names as untested ("exact check plus
  reconstruction", JR line 26 and lines 60-62), not L6, L8, L11.

### F3. Steps 7 and 8: priced below one measured role, and baselines unbuilt for two of three repositories
- Place: plan l.87-88 (rows 7, 8), l.201-229, l.325-328.
- What breaks:
  - D4 at 18.8 M (4 R) and D2 Phase A at 4.7 M (1 R). W2 itself says "no part is costed from a measurement ... R borrowed
    from a closing sample reader" (`RUN:closing/wave2/SYNTHESIS-wave2.md` s3.4 [observed in file]). D4 has to port the
    earlier arms into a container, add AnyBURL, TARMAQ, decay, commit-text match, the 1/|e| weight, a fused weight, a
    sweep of 3 d x 2 N3 weights per repository on three repositories, leak-free splits and scoring. That is building
    code, and the measured builder unit is 32.3 M (18.5-38.0) (r57-0173 [measured]). 18.8 M is below one unit. D2 Phase A
    at 4.7 M has to index three repositories with two embedders, derive issue-like queries from closed commits (case
    building, t7-0602), and run BM25, grep and RRF baselines. That is below one analyse/Opus helper (8.05 M, E 1a,
    plan l.70).
  - Both name "our RRF ranker (P@10 0.2493 pool)" as a baseline on FixFlow, the clinic and a public repository (plan
    l.206, l.224-225). That ranker and its typed graph were built and measured on one repository: "One repository,
    about 233 commits ... about 5,400 nodes" (`docs/program/evidence/harness-bottlenecks/graph2/embeddings/RESULT.md`
    line 131 [observed]). `GRAPH-TEST-RESULT-2026-11.md` has no match for "clinic" [observed, grep]. Building the graph
    for two more repositories is neither priced nor listed as a precondition [hypothesis that it is needed: the plan
    names it as a baseline there].
  - The fan-out gate refuses both limits as written (F1, last point).
- Smallest fix: price both from measured roles and cite them (builder unit r57-0173 for the code; run helpers r57-0188;
  case building t7-0602). Add "build the typed graph and RRF ranker for the clinic and the public repository" to each
  step, or drop the RRF baseline outside FixFlow and say so. Re-sum section 2 and lines 9 and 11 for him.

### F4. Step 1 removes `hb`; step 3 lands in `hb` on `build`
- Place: plan l.111 ("then remove the 20 unit worktrees and `hb`"), l.113 ("a clean single line for steps 3 and 10"),
  l.152-153 ("the fix round FX-PILOT, three builder units on `build`").
- What breaks: `hb` is the worktree that has `build` checked out (`git worktree list`: `C:/Users/User/Documents/projects/hb
  fa8d28c1 [build]` [observed]). PILOT-PLAN row 5 lands the fix round "in `hb`, as in the build", and the pilot pins "the
  commit the fix round's last unit lands on `build`" (`PILOT-PLAN.md` lines 41, 56-58 [observed]). Step 1 removes the
  landing place. If the round still commits on `build`, the working branch and `build` diverge again at once, so the
  "single line" in l.113 does not hold for step 3. r57-0520 also says "anything written there later goes onto build
  first" for the untracked copies; the plan keeps 79 of them off `build` (l.109).
- Smallest fix: say where step 3 lands. Either keep `hb` until the pilot's commit is pinned (remove only the 20 unit
  worktrees in step 1), or land FX-PILOT on the merged branch and have PILOT's pin name that commit. Then merge once more
  after step 3.

### F5. Families ruled out on one screen (CLAUDE.md "do not rule a family of methods out after one experiment")
- Place: plan l.228-229 (step 8: "fail drops learned retrievers for our localisation"); l.216-217 (step 7: "closes the
  encoder family for this ranker at our size, with these forms named"); l.174 (pilot: "a gross failure in comparison 1
  rules the tree's form out for research fields").
- What breaks:
  - Step 8 screens two off-the-shelf embedders. A fail would drop the family, including the repository-tuned localiser
    that 2c sizes and that l.134 designs "after step 8, whose tuned retriever is its baseline".
  - Step 7 tests identity KG embeddings and a rule learner (GraIL only conditionally). The record keeps the wider encoder
    family's premise open for text, transfer and inductive forms ("Both parts are stated; do not shrink the second", TD
    s3b, l.296-298, R9 s2 [quoted]).
  - The pilot: "The one pilot field is chosen, not drawn, so nothing it shows generalises" (P2 s13 via TD s1c, l.84-85
    [design]). COMPLEXITY s5 says a single-session run "can only rule that form out, never in" (TD l.120-121); that
    statement is about S1's form, not about the tree's form for every research field.
- Smallest fix: word each as "this form": step 8, "drops these two embedders at shelf settings for our localisation;
  tuned and larger forms stay open"; step 7, "closes identity KG embeddings and AnyBURL at published settings for this
  ranker"; pilot, "a gross failure sends the tree's form back to design; ruling it out needs a second field".

### F6. Fable check leaves out his own Fable use to the reset
- Place: plan l.63-64 ("the pilot's coordinator is the only Fable user ... from 15 % it fits").
- What breaks: PILOT-PLAN counts his own Fable use as protected demand: "his own Fable use, 22.8 M in 15.1 h = 1.51 M an
  hour [m: r57-0170]" (`PILOT-PLAN.md` s3) and "his top sessions are Fable mains" (s5); version 2 change 4: "The Fable
  meter counts his own Fable use to the reset". Over 159 h that is about 240 M = 42 Fable points at 5.7 M a point (32-52
  over 4.6-7.6) [computed on measured inputs]. 15 + 42 + the coordinator: 16.5 expected gives 74; 26.0 at its upper
  quartile gives 83 (99 at 4.6 M a point); 47.4 at its 270 M limit gives 104 [computed]. Expected and upper quartile fit;
  the limit does not. The Fable line, which PILOT says is what holds the coordinator's successors, is not given.
- Smallest fix: add the protected Fable term to section 2. State the coordinator's Fable stop line as 100 minus the
  reading minus protected use to the reset, applied at each start.

### F7. Steps that run before the step that decides whether their result matters (r57-0004)
- Place: plan l.80 and l.131-134 (2c); l.89 and l.141-143 (step 9).
- What breaks: 2c's count matters only if a learned localiser is designed. That happens "after step 8", and step 8's
  fail "drops learned retrievers for our localisation" (l.228), so after a fail 2c changes nothing. Step 9 "changes
  whether those edges join the typed store before step 11's graph arm". Step 11 runs only if step 8 passes (l.91), and
  its typed-store arm runs only if "on" beats "off" (l.245-246). Both are cheap, but each is a test whose result can
  change nothing on most branches.
- Smallest fix: move 2c and step 9 behind step 8's pass (step 9 behind step 11's "on beats off"). The six small steps
  become four; section 0 item 1, l.95 and line 2 for him change with them.

### F8. 2c is priced below every measured transcript scan
- Place: plan l.80 (run/Sonnet 1.41 M, limit 2.6).
- What breaks: counting successful localisations means scanning the transcripts and defining "successful". The
  replays that scanned the same transcripts cost 2.50 M (L2), 2.96 M (L24) and 3.6 M (L5) (JR s2 table, lines 24-29
  [measured]; t7-0128 [measured]: five replays 2.5-4.1 M each). All are above 2c's expected and at or above its
  2.6 M limit.
- Smallest fix: price 2c as one replay on t7-0128 (expected about 3.6 M, the five at 2.5-4.1, limit about 10 as the
  replays had). Also cite t7-0128 for 2e instead of the judged R.

### F9. Card runs: sleep, memory cap against AnyBURL, and Docker
- Place: plan l.212-215 (step 7: "Memory cap 6 GB in a container as before"), l.273-274 (s5: AnyBURL "4 cores, 16 GB of
  memory", f2c L12), l.96-97.
- What breaks:
  - The earlier embeddings run lost 2 h to the PC sleeping while it trained in the background: "no session was holding
    the PC awake" (EC s9, `COORDINATOR-REPORT.md` lines 299-303 [observed]). The PC sleeps after 15 idle minutes
    (CLAUDE.md). Steps 7-8 run card hours in the background, and the plan says nothing on keeping the PC awake.
  - The plan quotes AnyBURL at 16 GB of memory (f2c L12, `RUN:fields/2c-graphs/f2c-report.md` line 44 [quoted]) and
    sets the container cap at 6 GB. The two do not fit.
  - The Docker daemon was not running when I checked (`docker images`: cannot connect to dockerDesktopLinuxEngine
    [observed, 2026-11-24]). Whether `graphtest-kge-gpu:1` (torch 2.15.0+cu132, sm_120; `INSTALL-GPU.md` [observed])
    still exists is unverified. Starting Docker Desktop is a program start on a PC whose freezes were blocked program
    starts (CLAUDE.md, r57-0032).
  - AnyBURL is a Java program, so a Java runtime is an install not on 2b's list [hypothesis: general knowledge, not in
    the record].
- Smallest fix: 2b also checks that the image is present and the Java runtime's source and size. Step 7 sets AnyBURL's
  container memory from the 16 GB figure, or measures it on our graph first. Steps 7-8 name who holds the PC awake during
  card hours.

### F10. Pilot hours assume S1 and S2 are off the critical path
- Place: plan l.184-186 (4.2-7.8 h).
- What breaks: PILOT-PLAN's formula says "S1 then S2 run in the second slot beside T (N_max 2); if together they run
  past T, they set the path" (`PILOT-PLAN.md` s2, Time). With T cut to 1.2-1.8 h (r57-0174 [measured]), S1 then S2 in
  series take about two T's if a single session reads a field in about T's time [hypothesis: S1/S2 hours are not
  measured]. That is 2.4-3.6 h, longer than T plus the reviews (2.2-2.8 h). The path is then 3.7-5.4 h x 1.2-1.7 =
  4.4-9.2 h [computed]. The plan's range holds only if correction 3's width runs S1 and S2 beside T, and that width is
  not computed yet (r57-0414 is an untested hypothesis).
- Smallest fix: give 4.2-9.2 h until the width is computed, or state the width the pilot runs at. The model check ran
  at the smallest forms only (k = 2 parts; TD s1a, s1e; `research-tree/model/results-build/VERDICT.md` on `build`, table
  in s2 [measured for the model]), so a width above 2 is also outside what was checked [hypothesis].

### F11. Smaller points
- l.327 (line 10 for him): "the embedder weights (0.55 GB or about 1.2 GB)" reads as a choice put to him. The design
  sweeps both (`SYNTHESIS.md` line 662: "Swept: embedder (137M, 0.6B)"). Fix: "and", total about 1.75 GB.
- l.320 (line 3 for him): the 39 M cap takes 2d's limit as 4.68 (the read role's upper quartile), while l.70 gives the
  read role's limit as 10.1. With 10.1 the sum is 44.3 M [computed]. Fix: use one rule for every row.
- l.322 against l.289: the pilot's points read "8-13.5" in one and "7.5-13.5" in the other (418/56 = 7.5). Fix: 7.5-13.5.
- l.38: "every helper below runs on the lean definition of its kind". FX-PILOT's units are build-invariant on Opus
  (`PILOT-PLAN.md` row 5); `lean-build` is set to Sonnet, and no lean definition carries the tool that starts helpers
  (`.claude/agents/lean-*.md` front matter [observed]). The definitions are also uncommitted (git status). Fix: name the
  exceptions (builders take `model: opus` explicitly; anything that starts helpers uses a full definition).
- l.110: the step-1 suite runs before step 3 fixes the flaky FX-CLOSE T1 (c) (TD s1e [observed]), so it can fail
  without a real fault. Fix: the brief says to re-run that test alone before calling the merge red.
- r57-0522 and the dead-man's false toasts on long coordinator turns (`PILOT-PLAN.md` s4, TD s1e) are not named among
  the pilot's risks. They are not breaking (an idle child still reaches the owner), but they will cost him typed turns.

## 2. What holds (checked)

- Merge facts (plan l.104-109) [observed, git, read only]: merge base 372d5b97; 22 commits one way, 111 the other. 26
  tracked paths changed on both sides, 24 of them byte-equal on both. `git merge-tree` reports conflicts in exactly the two
  files the plan names (`TOP-STATE.md`, `units/P0/check-commit.test.mjs`). `build` changes nothing under `.claude/`,
  `tools/` or `library/`. There are 22 worktrees (main, 20 unit worktrees, `hb`). Untracked files under
  `research-tree/build` and `research-tree/model`: 763 now against the plan's 760 (top session 9's own outputs since).
  `git merge-tree --write-tree` wrote loose objects into the object store; no ref or file was changed.
- Sums [computed]: the six small steps 12.5-17.2 M; steps 1-9 with 15-20 M for the top session 517-550 M expected and
  about 870 M at the limits; 9.3-17.7 points expected and 15.5-28 at the limits at 31-56 M a point; the room 100 - 37 -
  33 - 3 = 27. These match l.59-61. Pilot 179.3 + 238.5 = 417.8 M, cap 226.1 + 366.8 = 592.9 M (PILOT s2). D1's cap ratio
  751/326.5 x 70.5 = 162 M. The hours 3.5-4.6 x 1.2-1.7 = 4.2-7.8 (on its own assumption; see F10).
- Bases cited correctly: r57-0174 (the 4.3 h stop), r57-0175 (fresh-token meter, Fable 2.7-5.6), r57-0188 (role
  averages, no fixed overrun factor), r57-0170 (62 M a point, 5.7 M a Fable point), r57-0061 (40 % stop), r57-0057 and
  0058 (track split), r57-0520 (merge), r57-0522; the 31 M a point from JUDGE-HANDBACK line 210; the replay costs JR
  line 33 / t7-0128.
- D4's design, the n formula and the 474/617 figures match W2 s3.4 and TD s3c. The 6 GB cap is EC's (line 161). The
  GPU image and its install are on record (`INSTALL-GPU.md`).
- Track: nothing in steps 1-13 is the token-saving library or token optimisation. The BM25-list arm and replays (b)-(e)
  are left to the teammate (l.28-30, l.299-300), as r57-0057 and r57-0058 say. 2e is about hallucinations, his track
  (r57-0047).
- Rule 7: apart from F11's "or", no line for him asks a design choice. They are approvals, caps, installs, the rule-3
  exception and one fact (the 24 GB card), as TD s1f separates them.
- Order: the pilot is the only step that runs the tree. The merge is off the pilot's path, as PILOT s1 says. 24 GB
  steps wait for 12 GB results and his fact (r57-0189).

## 3. Not read

- PILOT-PLAN sections 4 and parts of 3 beyond what is quoted above; P2 itself (carried through TD and PILOT); the reader
  digests R1-R10; STATE.md; ROUTER.md beyond s0 item 2, s2 lines 118-142 and 218-226; ENFORCEMENT-TABLE beyond lines
  40-53 and 165-200; the f-reports beyond the AnyBURL lines of f2c, f3c, f3d; HAND-BACK.md; GV; the earlier test's
  lane files beyond names (whether per-commit held-out scores exist was not opened: `lane/grader-returns/heldout.json`
  and `lane/train/heldout/` exist [observed names only]); the 11 DONE-after-red helpers; `RUN:sheet/SHEET.md`.
- Not verified: the meter readings of 37 % and 15 % (the brief's); the 681/79 split of untracked copies (not re-hashed);
  whether Docker images exist (daemon down); AnyBURL's runtime (general knowledge, marked hypothesis); S1/S2 durations
  (no measurement found).
