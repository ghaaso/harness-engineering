# Top session: hand-over to top session 2 (2026-11-20, 07:50 UTC)

From top session 1 (app id local_81c25c0a-6160-477f-b5a3-f978bfe951a4, transcript 34cb9690, Opus; its window was at
300 K of 400 K) to top session 2. The owner's word in chat, 2026-11-20 ("yes do it"), approved this: close out the
build (write its records into the library, commit the loose files, archive the six finished sessions), then hand over
to a fresh top session, which works out the pilot's plan and cap and brings it to him. Top session 1 handed over
first, because each of its calls re-read 300 K; the close-out is yours.

## Where things stand (checked by top session 1 at 07:40 UTC)
- The build (r57-0507) is done through slice 2 and the one fix the model check sent back (FX-W6). Nothing is
  running: root 3 stopped at a quiet point (`research-tree/build/STATE.md`, NOW section, 07:25 line).
- Finished child sessions, all idle: build plan local_0c069eba-815f-4f5f-adf2-c1fe5602ca53; harness check and plan
  local_427ef5e7-5536-4e06-a301-62c9c3c5a778; nesting probe local_1fb77d3c-3a8a-4f91-80de-7d2a116fa887; root 1
  local_a4b13878-b721-4778-a8db-a7ce6c2eafce (slices 0 and 1); root 2 local_14481c3f-4c14-4ace-87c9-acf5b0ccaa1c
  (slice 2); root 3 local_f7dc42a2-7023-45a7-a7b7-2478d955dc1d (FX-W6).
- Branch `build` (worktree `C:/Users/User/Documents/projects/hb`): W6 landed at 96bc34cc, records commit a1a46e4e.
  Landings: `research-tree/build/landings.jsonl`. Nothing merged into another branch, nothing pushed.
- Reports: `research-tree/build/reports/slice-0.md`, `slice-1.md`, `slice-2.md`, `fx-w6.md`, each with an `.html`
  page; fx-w6 is the private Artifact https://claude.ai/artifact/3kvgESgxWgEysZFXDFCnUW.
- Meter at 07:40: 80 % all models, 53 % Fable (63 % at the go, 2026-11-19 14:50 UTC). The build's line was 81 %
  (the owner's `cap:` answer, 02:15 UTC). The week resets 2026-11-23 12:00 UTC.
- Library: no record of the build after r57-0518 (`journal/2026-11-19/r57.jsonl`, 97 lines); the board's NEXT is
  still r57-0507.
- Uncommitted in the main checkout: about 60 entries under `research-tree/` (the build's newest records: STATE.md,
  usage.jsonl, landings, briefs, facts, refute, reports, units, tools; `research-tree/lane/log.jsonl` modified). Some
  have older copies on `build` (root 3's a1a46e4e holds 44 files). Also uncommitted and not yours:
  `docs/program/pipeline-diagram/` (the owner's own pipeline session). Never touch it.

## Your steps, in order
1. Read CLAUDE.md, the board (`library/INDEX.md`), `library/README.md` (how records are written: append-only journal,
   field order), the NOW section and End list of STATE.md, the four reports, ORCHESTRATION.md section 13, and
   BUILD-PLAN.md slice 3 (lines 140-145). Open records from the files, not from this note (r57-0009).
2. Commit the loose build records where the build keeps them: on `build` through `hb`, as root 3 did (STATE.md, 07:25
   line), so that the later merge has one copy. Compare main's `research-tree/build/` (and `research-tree/model/`
   results, if any) with `build`'s; copy what is newer or missing into `hb`; commit there. Do not commit them on the
   working branch. Do not merge or push: that needs the owner's `approve:`. When `build` is merged later, the
   identical untracked copies in main must be removed first.
3. Write the build's records into the library: a new file `library/journal/2026-11-20/r57.jsonl`, next ids checked
   with `bash library/lookup.sh` first (facts from r57-0166, open from r57-0519, mistakes from r57-0612). Record:
   what slices 0, 1, 2 and FX-W6 built and measured (tests, model-check results, tokens per slice, the meter, from
   the reports and usage.jsonl); the roots' hand-overs; the End list of STATE.md and root 3's three new items (the
   brief tells the coordinator to "answer" an idle child but it has no tool to message a session; "stop it unless it
   is making progress" has nothing to judge by and no stop reason; there is no "continue" act, and the timings are
   guesses); r57-0507 done through slice 2; a new open record for the pilot (slice 3: P3.1, P3.2, P3.3, each needing
   the owner's word, and a cap); an open record for merging `build` (needs `approve:`); the mistake of 2026-11-20 (a
   tree map drawn as boxes listing helpers with models and tokens, which the owner rejected; memory note
   `feedback-tree-is-nodes-and-lines.md`). Update the board (NEXT, facts, Open, Journal files; at most 220 lines).
   Commit the library and this file on the working branch `transfer/2026-11-16-embeddings-final-and-setup`.
4. Archive the six finished sessions listed above (the owner said yes). Leave top session 1 for the owner.
5. Fix stale memory: the MEMORY.md line "Research tree: start here" and its file still say the 13 fixes are designs
   only; they are now built.
6. Then the pilot: compute its plan and cap from what slices 0 to 2 measured (tokens per unit and per slice, from the
   reports and usage.jsonl; ORCHESTRATION.md section 3's method), show the owner a page (CLAUDE.md rule 6) and ask
   only with `approve:` or `cap:` (rule 7). At 80 % the pilot needs a line above 81 % or waits for the reset. Start
   nothing before his word (r57-0007).

## Rulings to keep in view
r57-0001 and r57-0151 (no design questions; a question starts `approve:`, `cap:` or `fact:`); r57-0007 (nothing he
has not asked for); r57-0018 (say what you understand and intend, then act on his go); r57-0033 (test only where the
result changes what is done next); r57-0035 (you run on Fable: your children will have children); r57-0038 (a limit
is the expected need plus a buffer); r57-0024 (end your processes before reporting, report resource use unasked);
CLAUDE.md rules 1 to 7. He wants plain words, the answer first, short (memory notes `feedback-plain-wording.md`,
`feedback-tree-is-nodes-and-lines.md`).

## Top session 2 (app local_b8dee401-7bf8-4328-b309-33c328e3a1b2, Opus, kind orchestrate), progress, 2026-11-20
- Step 2 done: of 621 uncommitted files under `research-tree/` in the main checkout, 618 were byte-equal on `build`;
  STATE.md and usage.jsonl had only root 3's 07:25 lines more: committed on `build` through `hb`, **17be051d**. The
  lane log (`research-tree/lane/log.jsonl`, main's tracked file, 1,583 to 2,846 lines) goes on the working branch.
- Step 4: five of six archived. The sixth, local_427ef5e7 (harness check and plan), was refused by the app's
  auto-mode classifier; not retried; left for the owner.
- Step 5 done: memory line and file "Research tree: start here" now say the fixes are built.
- Step 3 done: `library/journal/2026-11-20/r57.jsonl` (r57-0166 to r57-0173, r57-0519 to r57-0522, r57-0612); board
  version 1.4 (NEXT r57-0519). Measured for the records (transcripts, once per message id): the build's window
  997.1 M tokens, the build 907.7 M (roots 154.1 M), about 62 M a meter point; per role in r57-0173.
- Step 6 (the pilot's plan and cap): one Opus helper (`analyse: pilot plan and token cap`, started about 09:20
  UTC, limit 30 M) computes it from the brief `briefs/PILOT-PLAN.md` into `research-tree/build/PILOT-PLAN.md`; then
  the owner's page (`reports/pilot-plan.html`, a private Artifact) with only `approve:` and `cap:` asks.
  Done: version 1 (10.3 M tokens); blind review `refute/PILOT-PLAN.md` CORRECT: 14 findings (9.8 M); the top
  session accepted all 14 (decisions in `briefs/PILOT-PLAN-fold.md`); version 2 by an Opus helper (3.0 M):
  expected 418 M, cap 593 M. The page by a Sonnet helper (0.6 M), corrected by the top session (the pilot's "when";
  every agent its own node in the tree; the meter read 81 % at 10:24 UTC, so the preparation's line is 85 %), checked
  once by screenshot and published: private Artifact https://claude.ai/artifact/RPdurZvvLXWQcyFCf7M8wx. The plan,
  four briefs, verdict and page are committed on `build` through `hb` (**fed8113c**); library r57-0419. Then the two
  asks: `approve:` the preparation and `cap:` 593 M. Nothing is started before his answer.
- When `build` is merged (r57-0520), the identical untracked copies in main go first: 627 now (620 + these 7).
- This session was compacted once (at the fold); at 10:30 UTC its context was about 175 K of 400 K. A successor takes
  over at an owner-typed turn when it nears the measured hand-over point (247-273 K, r57-0171).

## Top session 1's commits (branch transfer/2026-11-16-embeddings-final-and-setup, none pushed)
372d5b97, 6a391755, e09778ae (build start, review fixes, owner page); c7da4d98 and 8151831a (the agent tree in
`docs/program/agent-session-map/`; add sessions to `sessions.json` and run `build/tree.mjs` to redraw it); and the
commit that holds this file.
- 10:50 UTC: the owner asked about the pilot (what it is and whether it is an A/B test, why S1 and S2 cannot run as
  single sessions, what the cap means, preparation against pilot, which field, whether the tree is his B+ tree, why
  8.5-13.8 h and 37-58 of his turns, top session against coordinator, how it serves the goal after the embeddings
  test, whether it is over-engineered) and asked for a complexity analysis of the plan: can it be reduced, at the
  widest parallelism this PC allows, and what the parallel readers and writers work saves. Answered in chat. The
  `approve:` and `cap:` asks are on hold. Proposed (r57-0018), waiting for his go: one Opus analyse helper, a blind
  Opus refuter and a page, about 21 M tokens, limit 30 M. Mistake r57-0613.

## Hand-over to top session 3 (2026-11-20, about 11:10 UTC)
From top session 2 (app local_b8dee401-7bf8-4328-b309-33c328e3a1b2, Opus): its window stood at 315 K of 400 K, past
the measured hand-over point (220-245 K after a compaction, r57-0171), so a fresh top session takes over (r57-0008).

**Approved, not started:** the complexity analysis. The owner's words (about 11:05 UTC): "I approve you doing
comprehensive, good complexity, and also that gives the accurate, correct complexity." Brief:
`research-tree/build/briefs/COMPLEXITY.md` (untracked; commit it on `build` through `hb` with the outputs). Limit for
the round 30 M tokens (expected about 21 M: analysis about 12, blind review about 8, page about 1).

**On hold:** the pilot's `approve:` and `cap:` asks (r57-0419, r57-0613) until he has seen the analysis.

**Asked in the same message, waiting for his go (r57-0018: say what you understand and intend, then act on his go):**
- B. An audit of the tree's algorithms ("Are we still making shit out on our own? ... a very good, proven algorithm
  already exists"): every mechanism marked as a proven algorithm used whole, adapted (where and why) or invented here;
  where a proven implementation would replace our own code; where each fault so far came from (13 in the R57 round,
  3 breaking in the build's reviews, FX-W6, the plan's 3 gaps). One Opus analyse helper, about 10 M.
- C. Model routing per operation ("the sub operations inside that session should also have the optimal models ... if
  we're running scripts, we use Haiku"): whether the routes in force (`.claude/hooks/tier-routes.json`, version 1,
  from `docs/ORCHESTRATION-DESIGN-2026-10.md` section 3; r57-0201, r57-0206, r57-0207) and the plan's assignments are
  good enough; a model for every operation inside a session, built from what each model is measured to do well;
  checked against that design (he remembers a comprehensive one from the EMS workshop folder; confirm which file) and
  the build's ORCHESTRATION.md; each row marked measured or reasoned, with the measurements still missing. One Opus
  analyse helper, about 12 M.
- D. The correct tree, drawn (nodes and lines, memory `feedback-tree-is-nodes-and-lines.md`): the full run's B+ tree
  (root coordinator, eight leaves = fields, readers under each; split and hand-over noted) and the pilot as one leaf
  with the test marked apart. The owner saw this sketch:
  ```
  coordinator (root: the question list and the separators between leaves)
  ├── leaf 1: one research session, field 1's questions packed to fit one window
  │     ├── reader
  │     └── …
  │   …
  └── leaf 8: field 8
        └── readers …
  Pilot: coordinator ── T (leaf for field X) ── readers   | S1, S2 | R1, R2 | checks
  ```
  Sonnet build, about 1 M.

**Answered in chat (do not re-ask):** what S1 and S2 are and why they cannot run today; why he types "go" (r57-0109,
the app's own control, not to be worked around; helpers or a workflow need no turns from him, and the analysis costs
that path); "are we making things up" (the layers are borrowed whole; the glue, about 25 scripts, is ours, and the
fill factor is in thresholds.json but no built script reads it); routing (a table of twelve kinds and four models, per
start only; never measured smaller against larger).

**Your steps:** read CLAUDE.md, the board, this file, the brief and PILOT-PLAN.md section 0 (r57-0009); read usage;
start the analysis helper; then a blind Opus refuter (as `briefs/PILOT-PLAN-refute.md`); decide its findings
(r57-0021) and have them folded; then his page (Sonnet build, one look, a private Artifact): answer first, the paths as
a table, the reduced plan. When he writes in your session, give B, C and D in a few lines and act on his go. Start
nothing else; the preparation and the pilot wait for his decision after the analysis. Meter at 10:59 UTC: 81 % all
models, 53 % Fable.

## Top session 3 (started by top session 2; Opus, kind orchestrate), progress, 2026-11-20
Clock note: top session 2 found today's times above about 1.5 h early (his approval of the analysis is stamped 12:39
UTC in its transcript). Times below are read from `date -u`.
- 12:55 UTC: meter 81 % all models, 53 % Fable (reset 2026-11-23 12:00 UTC). Started the analysis helper
  (`analyse: complexity of the pilot plan`, Opus, limit 18 M) on `briefs/COMPLEXITY.md`. Wrote the blind review's
  brief `briefs/COMPLEXITY-refute.md` (limit 12 M).
- 13:00 UTC: top session 2 relayed the owner's words of 12:39 and 12:49 UTC (verbatim in the shared note
  `side-session-notes/local_81c25c0a-6160-477f-b5a3-f978bfe951a4/top2-to-top3-2026-11-20.md`): S1 and S2 approved;
  his go to design a router (a model and effort per operation inside a session) and to look into running without his
  typed "go" (never around the app's controls); the tree drawing (D) asked; the audit (B) not yet his go. Top session 2
  writes nothing more here or to the journal: this session is the one writer. To record in the library: his approval of
  S1 and S2, the router directive, the running-without-him directive.
- 13:05 UTC: one `cap:` put to him in this session for the router, running without him, the audit and the tree, each
  of the first three with a blind review and a fold, one page: expected 79 M, cap 106 M (3 x (analyse 8.05 + refute
  10.6 + fold 3.0) + tree 1 + page 1 + this session 12; cap at each Q3: 3 x (10.39 + 13.4 + 4.5) + 2 + 2 + 17). Not
  started before his answer.
- 13:05-13:30 UTC: the analysis returned (7.11 M); its blind review `refute/COMPLEXITY.md`: CORRECT, 14 findings
  (7.47 M); all accepted with five decisions (`briefs/COMPLEXITY-fold.md`); the fold helper (`analyse: fold of the
  complexity analysis`, Opus, limit 6 M) writes version 2, version 1 kept as `COMPLEXITY-v1.md`. Rulings r57-0040 to
  r57-0043 appended to `library/journal/2026-11-20/r57.jsonl` and put on the board (not committed yet).
- 13:33 UTC: the owner typed "Yes, 106 M" to the ask "cap: 106 M tokens for the router, running without you, the
  faults audit and the tree?". Top session 3 (window about 215 K, hand-over point 247-273 K, r57-0171) hands the four
  pieces to top session 4 and finishes the complexity round itself (fold, page, Artifact, commit, records).
- 14:30 UTC: the owner raised the round's limit to 32 M ("Yes, 32 M"). The page (Sonnet helper, 0.54 M; the totals of e and e2 re-added, within 1 %) looked at once at 1870 px and published: private Artifact https://claude.ai/artifact/JQsXXJ43jk7CJBgbJCZeG9 (`reports/complexity.html`). The round's briefs, analysis v1 and v2, review and page committed on `build` through `hb`: 10174e8c. Records r57-0044, r57-0174, r57-0420 and the board on the working branch (the commit that holds this line). Round tokens about 32.1 M of 32 M.
- Top session 3 closed (14:30 UTC): top session 4 is the one writer of this file and the journal from now on. Add the four pieces' results to the complexity page above (read it with the Artifact tool first).

## Hand-over to top session 4 (2026-11-20, 13:35 UTC): the four pieces under the owner's cap of 106 M
From top session 3 (Opus). Read first, from the files (r57-0009): CLAUDE.md; the board `library/INDEX.md`; this
section and "Hand-over to top session 3" above (items B, C, D, the sketch for D, "Answered in chat"); the owner's two
messages of 12:39 and 12:49 UTC verbatim, with top session 2's pointers for the router and for running without him:
`C:/Users/User/AppData/Local/Claude-Data/claude_pzs8sxrjxfjjc/side-session-notes/local_81c25c0a-6160-477f-b5a3-f978bfe951a4/top2-to-top3-2026-11-20.md`;
his rulings r57-0040 to r57-0043 (`bash library/lookup.sh -f <id>`; journal `library/journal/2026-11-20/r57.jsonl`).

**The pieces.** You write each brief (models by the tier routes). Each of 1-3 is one Opus analyse helper, then one blind
Opus refuter in a fresh context whose findings you decide (r57-0021) and have folded, as top session 3 did for the
complexity analysis (`briefs/COMPLEXITY.md`, `-refute.md`, `-fold.md` show the form). Figures, M tokens, expected /
limit: analyse 8.05 / 18.6 (E 1a analyse/opus, n=19), refute 10.6 / 18.5 (r57-0173, n=16), fold 3.0 / 6.
1. **Router** (item C, r57-0041): a model and effort for each operation inside a session, not one model for a
   session's life; built from what each model is measured to do; the objective is the two weekly meters (their weight
   per model and for cache reads is not measured: name what measures it). Check it against the routes in force
   (`.claude/hooks/tier-routes.json`), `docs/ORCHESTRATION-DESIGN-2026-10.md` section 3 (r57-0201, r57-0206 to
   r57-0210), the build's `research-tree/build/ORCHESTRATION.md`, `check/E-tokens.md`, `check/G-models.md`, and the
   orchestration document he remembers from the EMS workshop folder (`../EMS_workshop1`, r57-0155: find the file).
   Every row marked measured or reasoned.
2. **Running without his typed "go"** (r57-0042): the ways the app itself allows work to start without his turns, and
   what each needs from him; never a way around the app's controls. Build on the complexity analysis version 2
   (`research-tree/build/COMPLEXITY.md`: path b and variant e2); start this piece only once that file has its
   "Changes from version 1" section, and do not redo it. Public documentation only, read raw, nothing of the project in
   any request (CLAUDE.md rule 4, r57-0110). A probe of the app's behaviour is a small test: his word first (r57-0506).
3. **Where the faults came from** (item B, r57-0040): for each fault on record (13 of the R57 round, 3 breaking in the
   build's reviews, FX-W6, the pilot plan's gaps), whether a proven design was applied wrongly or our own glue was at
   fault, and where a proven implementation would replace our code; from the records now; new papers only where an
   adapted mechanism has no source, quoted from the paper (r57-0014).
4. **The tree drawn** (item D): every agent its own node with a short name, lines for who starts whom, no models or
   tokens on it (memory note `feedback-tree-is-nodes-and-lines.md`, mistake r57-0612); the sketch above. Sonnet build,
   1 / 2.
5. **His page**: add the results to the complexity page (a private Artifact; its URL will be in top session 3's closing
   line below; read it with the Artifact tool before publishing to it), answer first. Sonnet build, 1 / 2.
Your own turns: about 12 M. The cap for all of it is **106 M**: read usage before each fan-out (CLAUDE.md rule 5);
stop new starts at the cap and ask him with `cap:` (r57-0038). Start pieces 1 and 3 together now (r57-0006); piece 2
when its input exists.

**Writers.** Top session 3 stays the one writer of this file and the journal until it writes "Top session 3 closed"
as the last line of its section above; until then keep your progress in your shared notes folder. After that line you
are the one writer. Commit your briefs and outputs on `build` through `hb` (`C:/Users/User/Documents/projects/hb`;
`git -c core.longpaths=true`; `-F` message files ending with the Co-Authored-By line; identity Muhammad Bilal /
Tempest-Zero); records and this file on the working branch `transfer/2026-11-16-embeddings-final-and-setup`. Never
touch `docs/program/pipeline-diagram/` (the owner's own session). Do not merge or push `build`. Start nothing else: the
research run waits for one plan with the router's models, put to him with `approve:` and `cap:` after these pieces
(r57-0007). He wants plain words, the answer first, short; results on a page (CLAUDE.md rule 6).

## Top session 4 (started by top session 3; Opus, kind orchestrate), progress, 2026-11-20
Its notes until 14:30 UTC are in the shared folder
`side-session-notes/local_7181a103-c014-45de-bce9-8c950eb0b2e0/top4-progress.md`; in short:
- 13:36 UTC: meter 82 % all models, 53 % Fable. The build's orchestration document is `research-tree/ORCHESTRATION.md`;
  the EMS folder's `docs/ORCHESTRATION-DESIGN-2026-10.md` is byte for byte this repository's (cmp).
- 13:40 UTC: started the router (`briefs/ROUTER.md`) and the faults audit (`briefs/FAULTS.md`), Opus analyse each.
- 13:52 UTC: COMPLEXITY.md version 2 landed (path e2); started running without the typed go (`briefs/UNATTENDED.md`,
  Opus) and the tree (`briefs/TREE.md`, Sonnet). The tree done at 13:55: `research-tree/build/tree/` (1.37 M).
- The router: 8.0 M to its context line, finished by a second helper (`briefs/ROUTER-2.md`, 6.7 M); review
  `refute/ROUTER.md` CORRECT 11 (7.27 M), all accepted (`briefs/ROUTER-fold.md`); fold running.
- The faults audit: 12.19 M; review `refute/FAULTS.md` CORRECT 16 (14.08 M), all accepted (`briefs/FAULTS-fold.md`);
  fold running.
- Running without the typed go: 18.6 M (at its limit, "Left to do" minor for e2, not extended, r57-0038); review
  running (`briefs/UNATTENDED-refute.md`).
- 14:36 UTC: top session 3 closed at 14:30; top session 4 is the one writer of this file and the journal. Complexity
  page: https://claude.ai/artifact/JQsXXJ43jk7CJBgbJCZeG9 (`reports/complexity.html`).
- The faults fold returned (3.35 M): `FAULTS.md` version 2, version 1 kept as `FAULTS-v1.md` (same sha256). At least 56
  faults: glue 23, borrowed design with a step missed or changed 16, planned part never written 6, made here where a
  proven one existed 4, borrowed design whose assumption fails 3, two units clashing at landing 2, test 1, guess 1.
  COMPLEXITY.md lines 269-273 leave out three checks path e2 drops (fencing a replaced helper, a restart limit, hang
  detection): named on the page, file not edited. Tally of the cap: 71.6 M of helpers so far, plus own.
- The router fold returned (about 4.2 M): `ROUTER.md` version 2, version 1 as `ROUTER-v1.md`. Worth it but small: on
  e2 13-49 M of 986 M tokens, 0.7-2.7 of 13-17 points; the provider's documented pattern (one model per session,
  helpers on cheaper models, effort lowered first); a session cannot switch its own model (the app refuses it); the
  largest lever a waiting Fable coordinator waking at least hourly to keep its cache. Its own recomputations differ
  from the review's in four places (stated in its changes list); accepted. Tally: about 75.8 M of helpers, plus own.
- 14:58 UTC: the review of running without the typed go returned "CORRECT: 14 findings" (18.40 M, at its limit); all 14
  accepted (`briefs/UNATTENDED-fold.md`, fold not started). The cap: counted by tokens-self.mjs at 14:58, helpers
  95.8 M (router 8.47 + 6.73, faults 12.50, unattended 18.6 by its report, tree 1.48, reviews 14.24 + 7.57 + 18.40,
  folds 3.61 + 4.23) and this session 12.65 M: 108.5 M against the 106 M cap. No new start; `cap:` put to the owner
  for 120 M (left: the third fold about 3.5 M, the page about 1 M, records and commits, own turns; expected about 9 M).
- About 15:05 UTC: the `cap:` question was cancelled before an answer; the owner then typed: "What's up? Stopped? What
  happened? Uh, If it's not done yet, to reach the gap to 120 million, I suppose, don't stop here." Read as his word
  for a cap of 120 M for the four pieces. Fold of the third review started.
- About 15:40 UTC: the third fold returned (about 2.1 M): `UNATTENDED.md` version 2. The page helper (3.61 M, over its
  2 M limit) published the four pieces on the complexity page, version 2 of
  https://claude.ai/artifact/JQsXXJ43jk7CJBgbJCZeG9 (`reports/complexity.html`); top session 4 looked at its
  screenshots. One command of that helper, taskkill on msedge.exe (it would have closed the owner's Edge windows), was
  refused by the permission system and not run. `NEXT-STEP.md`: one plan for the research run (path e2 with the
  router's models, from the reset), put to him with approve: and cap: 1.2 B. Records r57-0045, r57-0175 to r57-0179,
  r57-0421, r57-0422, r57-0614, r57-0711 and the board's lines. Commits: dcbb8be4 on build (briefs, outputs, reviews,
  tree, page) through hb; records and this file on the working branch.
- Tally of the cap of 120 M: helpers 101.5 M (analyses 46.3, reviews 40.2, folds 9.9, tree 1.5, page 3.6), this
  session 17.6 M to 15:40 UTC: about 119 M, with the last calls about 120 M.
- Top session 4 done (15:40 UTC). Next: his answer to approve: and cap: for the research run (r57-0422). Start nothing
  else before it.

## Hand-over to top session 5 (2026-11-20, about 15:50 UTC): prepare the research run
From top session 4 (Opus; window at about 340 K of 400 K, past its hand-over point, r57-0008, r57-0171).
**Approved:** at about 15:45 UTC the owner typed "Yes, 1.2 B" to "approve: the research run as on the page, with a
cap: of 1.2 B tokens?" (r57-0046). The plan: `research-tree/build/NEXT-STEP.md` (r57-0422): path e2 of
`COMPLEXITY.md` version 2 (section 5), the models and efforts of `ROUTER.md` version 2 (section 4), the start of
`UNATTENDED.md` version 2 (sections 0 and 5), the three checks e2 drops (`FAULTS.md` version 2, section 0).
**Your task** (kind orchestrate, Opus): prepare the run so that he can open its coordinator with one typed go:
1. the run's folder outside every repository (protocol v2), with the tier hook (`tools/ensure-tier-hook.sh <folder>
   --force`; r57-0026, r57-0122) and the run's own CLAUDE.md holding the router's models and efforts (they apply only
   once written, r57-0176, r57-0421; at source quality, r57-0019);
2. the coordinator's brief (Fable, r57-0035) and the field helper's brief, from COMPLEXITY section 5 and protocol v2:
   the seven fields, the problem sheet, the checks kept, the cap and its gate, the hourly wake while it waits, restarts
   after a five-hour limit, quiet scripts;
3. the paper downloads named with source and size for his go (CLAUDE.md rule 3; about 420 MB) and the rule-3
   exception for the review test;
4. the go he types, in both forms (at the reset at his desk; or before it with Windows set not to sleep on mains
   power and one wake at the reset), and the settings that are his (Auto mode, Remote Control on the coordinator alone);
5. one blind review of the two briefs before he opens the coordinator (they govern about 1 B tokens).
**Limits:** within the cap of 1.2 B; this week's meter about 84 % all models, 53 % Fable (reset 2026-11-23 12:00 UTC):
keep the preparation small, read usage before each fan-out, protect his own use until the reset. Start neither the
coordinator nor any field: he opens it with his go. Do not merge or push `build`; never touch
`docs/program/pipeline-diagram/`. Plain words to him, the answer first; results on a page (CLAUDE.md rule 6).
