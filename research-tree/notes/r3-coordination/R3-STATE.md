# Round 3 state (the coordinator's hand-over file; read with R3-CHARTER.md and R3-BRIEFS.md)

Round 3 = "lift what still blocks R57" (the task of the session started by
`local_d67dafea-d072-4d04-8ca3-f5f76d8cb34c` on 2026-11-17 at 15:15). The first coordinator reached
200,000 tokens of context at 17:20 and hands over here. Everything a successor needs is in files.

## What exists (checked at 17:19 after the PC restart of 17:13)

In BUILD `model/as-built/`:
- `SEM-fence.md` (33 KB) and `SEM-wake.md` (45 KB): how the scripts really behave, step by step, with
  file:line, atomicity boundaries, the gap to the model, and the smallest faithful abstraction.
- `MODEL-MAP.md` (18 KB) and `HOWTO-RUN.md` (9 KB): the model's variables, actions, faults, flags,
  properties with lines; which mechanism is an oracle; the 31 two-fault configurations; the reason
  each D7 property is weak; exact run commands, memory, how to print a trace.
- `FIX-fence.md` (31 KB): five fixes FX-OUT, FX-CLAIM, FX-CGATE, FX-CLOSE, FX-REDO, all on one
  primitive (an exclusive create done by a hook on the session's behalf).
- `FIX-wake.md` (45 KB): seven fixes FX-W1 to FX-W7 (alarm lease and `--ensure`; arm first; acts
  refused while no alarm is pending plus a coordinator brief; an owner-installed dead-man task;
  act-due raised again with backoff; hang deadline by what the child is doing plus suspend time from
  the Windows power log plus a ping; a breakable `watcher.lock`).
- The copy `model.mjs`, `check.mjs`, `configs.mjs`, `configs-full.mjs`, `show.mjs`, `rss-at-exit.mjs`.
  `model.mjs` there was last written at 15:43 by the modeller that the freeze cut: PARTIAL EDITS.
- `model/results-as-built/baseline/` (12 files): the copy reproduces DF2-K2-R1 (2,608,525 states, no
  failing property, 15 s, whole at 400 MB) and A-RECONCILE, A-READY, X-PAUSE-DISCOUNT,
  X-ARM-AT-START with the recorded failing properties and trace lengths.
In BUILD `done/`: `r3-sem-fence.json`, `r3-sem-wake.json`, `r3-model-prep.json`, `r3-fix-fence.json`,
`r3-fix-wake.json` (each helper's return).
Checksums: `r3-protected.sha256` (0 mismatches at 17:19) and `r3-tcb.sha256` (no file under `tcb/`
changed). Compare both again before the final commit.

## What the freeze cut (15:43) and what is not started

- B1 modeller `asbuilt-fence`: cut mid-edit. No CEX-fence.md, no result. Restart (brief B1).
- B3 refuters `refute-fence`, `refute-wake`: cut at their start. No file. Restart (brief B3).
- Not started: B2 (wake group as built), B4 (designers answer the refuters), B5 (fixes and
  ablations, D7's properties), B6 (fidelity review of the new model), B7 (write-up and its check),
  then snapshot, checksum compare, commit of this round's paths only, push, report.
Order that keeps one Node user at a time: B3 (two refuters, no Node) and B1 in parallel; then B2;
B4 as soon as B3 is back; then B5; then B6; then B7.

## Facts and warnings

- BUILD = `C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/tcb-build`.
  It survived the restart. Durable copy: `C:/Users/User/Documents/projects/harness-engineering/research-tree/`
  (branch `transfer/2026-11-16-embeddings-final-and-setup`, pull request 1), written by
  `research-tree/tools/coordinator/tcb_snapshot.js` (skips `model/results` and folders named `work`,
  `tmp`, `logs`; copies `model/as-built` and `model/results-as-built`).
- The model's full run belongs to another session; it restarts it with about 16 workers for about two
  hours from 17:15. A lane timeout under that load is not a result. Never touch `model/results`.
- At 400 MB a whole configuration fits up to about 3.1 million states (`--mem-mb` caps the checker's
  own count; RSS is about 175 MB higher). The as-built model will be larger: run by parts, one after
  another inside one lane command, one result file per configuration.
- The recorder (`lane/recorder.log`) stopped at 15:45 with the freeze. It belongs to the session that
  runs the full run; this round did not restart it.
- Antivirus removed by the owner at about 17:00; the freezes were blocked program starts (record:
  harness repo `docs/program/evidence/pc-freezes-2026-11-17/VERDICT.md`). Not proven as the cause.
- Reported by the main coordinating session, for the change list (B7), not a protocol defect:
  `e2e/run-e2e.mjs` fails from a folder path over 114 characters (`git add tcb` without
  `core.longpaths`, result not checked).
- Weekly usage: 28 % (all models) at 15:45.

## The first coordinator's judgement notes (not rulings; check them)

1. FX-W6 (three activity classes, the power log, a ping) looks larger than "the smallest fix". Let the
   refuter and the designer cut it to what an ablation shows is needed.
2. The leases of FX-W1 and FX-W7 read wall time; rule R5 says counters run in ticks. Either the lease
   is counted in ticks of its holder, or R5 gets an amended sentence: say which, with the suspend case.
3. D5: a timeout cannot tell a slow call from a dead one (unreliable failure detectors). NoFalseSuspicion
   holds only under a stated bound on a healthy call; otherwise the property changes. The owner rules
   on the property: keep both branches to the end.
4. D6: by HARNESS-FACTS only the owner, a child's turn-end note or the coordinator's own background
   command wakes a session. So the outermost dead-man ends at the owner, and liveness holds only under
   "the owner answers the alert". State that assumption in the model as an explicit fairness line.
5. All five fence fixes lean on two unverified harness facts (the hook input carries `session_id`; it
   carries the Write content) and on open question 5 (the coordinator's session-tool prefixes; under
   branch (b) no session can start at all). They are script changes that cannot be built before those
   facts are probed: list the probes first in the change list.
6. D7 has no designer: the modeller owns it in B5.
7. A fix that passes its ablation in the model is "needed in the model"; it is "sound" only after B3
   and B6. Report the two separately.
8. Section 17 must say plainly whether R57 lifts: it lifts only if (a) every mechanism and fix is
   modelled as built per B6, (b) the properties hold at two faults with nothing BOUNDED, and (c) the
   full run's verdict (another session's) is in. Otherwise say what still blocks.

## Log

- 15:15 start; 15:21 checksums; 15:27 stage 1 (W, F, M) launched.
- 15:31 stage 1 files written; 15:33 MA `asbuilt-fence`, F `fix-fence`, W `fix-wake` started.
- 15:39 FIX-fence.md; 15:41 FIX-wake.md; refuters launched at about 15:40 and 15:42.
- 15:43 PC freeze; restart 17:13. Helpers lost; files above intact.
- 17:20 hand-over to a fresh coordinator session tried: the app refused the start (a session may not
  start another on a turn that a session's message began; only the owner's own words here allow it).
  So the first coordinator goes on, lean, past 200,000 tokens. If the owner wants the fresh session,
  the brief is this file plus R3-BRIEFS.md.
- 17:27 the three cut helpers resumed from their saved transcripts: B1 modeller `asbuilt-fence`,
  B3 refuters `refute-fence` and `refute-wake`. Next: B2 after B1; B4 after B3.
- 17:35 to 18:25 B3 and B4 ran as three rounds per group (attack, revise, attack the revision):
  `REFUTE-fence.md`, `-2.md`, `-3.md`; `REFUTE-wake.md`, `-2.md` (pass 3 running).
  FENCE, final for this round = `FIX-fence.md` revision 4: seven fixes FX-OUT, FX-CLAIM, FX-CGATE,
  FX-CLOSE, FX-REDO, FX-PLAN (new: one planner function for status and watch; the planners order a
  double start today, `status.mjs:542`, `watch.mjs:164`, and loop a committed row at `started` on
  `bind`) plus one safe hook write (section 0b). No hook takes the run lock. After pass 3: FX-CLAIM
  and FX-REDO stand; four needed one small change each, made in revision 4 and NOT attacked again
  (status table at the top of the file). Its last section "For the modeller" has flags, sub-flags,
  atomic steps, death points and fourteen fault schedules (5 and 6 expected to fail: one open point,
  one dependency on the wake group). Open, recorded there: P3, P4, P5, two copies of the fence rules,
  G6, probes 1(c), 6, 7(b), N8, N10.
  WAKE = `FIX-wake.md` revision 3: FX-W1 to FX-W7; the ping and the power log withdrawn (FX-W6 reduced
  to tick-counted deadlines per kind of operation, an idle child raising act-due, a cap on attempt
  age); the M5 short-suspend gap recorded open; 11 open items in its top table; new finding:
  `--interval-ms 0` is accepted today and gives every active child a false hang fence. Pass 3 of the
  refuter is running (`REFUTE-wake-3.md`); a revision 4 follows if it asks for changes.
  The modeller B1 (fence group as built) is still running; no CEX-fence.md yet.
- 18:30 the owner's ruling on testing arrived through the main coordinating session ("Yes, cut them":
  only the sizes where the fixes act; one attack round per fix, another only for a finding that would
  break it; a full suite once at the end of a change). It is in the charter and overrides briefs B5
  to B7 where they ask more: two fields and two faults only; one run with all fixes; one ablation per
  fix; no R = 2 unless the fix acts on the restart budget; no further full attack round (the wake
  pass 3 that was already running is the last; a revision 4 of FIX-wake only for a finding that would
  break a fix); B6 (fidelity review) stays, once, because R57 turns on it; B7's reader stays, once.
  (Times in the three entries above are wrong by about 40 minutes: the attack rounds ran 17:30 to
  17:55 and the ruling came at about 17:45.)
- 17:57 B1 done: `CEX-fence.md`; D4a, D4b, D3, D4c reproduce as real counterexamples; all fence
  flags together BOUNDED at 2.94 million states (does not fit in 400 MB, whole or by parts).
- 18:02 `notes/r3-changes.md` (the change list; its section 10 has 13 points where the two FIX files
  did not fit); 18:15 `FIX-JOIN.md` resolves them (five small new choices not attacked, two for the
  owner, one open), with the joint flag table, the turn order and 15 amended rule sentences.
- 18:36 B2 done: `CEX-wake.md`; the M2 gap, D1, D5, M3 acknowledged-without-act, M5 short suspends
  reproduce; D7's new property forms exist and each fails in a named configuration. A complete run of
  everything as built would need about 110 million states or more: not feasible here. So "holds" is
  shown per fix in its own configuration (complete at two fields, two faults where it fits) and the
  joint run is reported BOUNDED. The memory question sent to the parent session was withdrawn.
- 18:42 running: MB2a `fixes-fence` (the six fence fixes modelled, per-fix runs and ablations,
  `ABLATION-fence.md`, results in `model/results-as-built/fixes-fence/`) and V `fidelity-3a` (review
  of the frozen as-built model `model-asbuilt-frozen.mjs`: `FIDELITY-3.md`, `done/model-fidelity-3.json`).
  Next: MB2b `fixes-wake` (the seven wake fixes, branches, the joint BOUNDED run, the two targeted
  checks of FIX-JOIN, `ABLATION-wake.md`), then V part 2 on the modelled fixes, then B7 (findings-3,
  the section 17 draft, one reader), snapshot, checksum compare, commit, push, report.
- 18:52 `FIDELITY-3.md` part 1: R57's sentence only partly met; as built: M6, session start, D1;
  seven mechanisms as built with a gap; two artefacts (D3's short trace, D7-SLOTS); two gaps under
  the fence fixes, closed by MB2a (stop verify keeps the row stop-requested; the stale coordinator
  reads a snapshot).
- 18:49 the other session's full run ended (groups 1 to 5; commit 1a82fe4e); machine free; the
  charter's third load note allows a BOUNDED per-fix configuration alone at up to 3000 MB.
- 19:40 first draft of `notes/section17-draft-2026-11-17.md` and `inputs/model-findings-3.json`
  (seven blocks TO FILL: ablations, fidelity part 2, tokens); writer helper R.
- 20:35 MB2a done: `ABLATION-fence.md`. Complete runs, two fields, two faults: FX-OUT (with FX-PLAN
  step 1) holds, 5.68 M states at 2500 MB; FX-CLOSE holds, 4.15 M; FX-CGATE branch Q5a holds, 8.29 M;
  FX-CLAIM with FX-PLAN holds over 43 parts under lease reading (i), fails under reading (ii)
  (needs probe 5); each ablation fails its property; FX-REDO not modelled (no ledger in the model);
  branch Q5b BOUNDED with a NoDeadlock failure in 15 steps; no joint run of the fence fixes.
- 20:40 CHECKPOINT COMMIT 429f5067 pushed (128 files: `research-tree/model/as-built`,
  `model/results-as-built`, `notes`, `inputs/model-findings-3.json`, `done/r3-*`, `done/model-fidelity-3.json`).
  Not committed on purpose: `lane/log.jsonl`, `lane/recorder.log` (add the lane log at the final
  commit), and the other session's untracked files.
- 20:40 running: MB2b `fixes-wake` (budget about 75 minutes; `ABLATION-wake.md`, results in
  `model/results-as-built/fixes-wake/`) and V `fidelity-3b` (part 2 on the frozen fence-fix model
  `model-fixes-fence-frozen.mjs`). Then: V part 3 (wake fixes, short), the writer fills the blocks
  (resume helper R or a fresh writer), one reader checks the draft, final snapshot, checksums,
  commit, push, report.
- 20:50 `FIDELITY-3.md` part 2 (fence fixes): four "holds" relied on with a stated limit, branch Q5b
  not relied on; results carried no model hash (closed later by a provenance rerun: equal); a design
  hole inferred (a session that dies before claiming is counted for ever) -> `FIX-fence.md`
  "Revision 5 notes" (not attacked).
- 21:12 MB2b done: `ABLATION-wake.md` (FX-W1, W2, W4, W5, W6 modelled; FX-W4's single alert is a
  design gap at one fault; joint run of 10 of 13 fixes BOUNDED, no interaction failure seen).
  `FIX-wake.md` "Revision 5 notes": repeated alert (owner picks the pace P1 or P2); every turn ends
  with endturn (owner picks E1 or E2 for a coordinator that omits it). Not attacked.
- 21:17 `FIDELITY-3.md` part 3 (wake fixes) and closing section.
- 21:25 final modelling pass done (`ABLATION-wake.md` "Final pass", results in
  `model/results-as-built/final/`): FX-W3 and FX-W7 cannot be expressed in the model; the fence
  revision-5 change, FX-OUT without the commit shortcut, the repeated alert and endturn-always each
  hold with their ablation failing; the dead-watcher join check complete with one field, BOUNDED with
  two (21.7 M states at 3000 MB). No review verdict exists for the final pass.
- 21:30 `notes/r3-changes.md` updated (join, revision 5, model columns); 21:40 the writer filled
  every block of `notes/section17-draft-2026-11-17.md` and `inputs/model-findings-3.json`.
- 21:42 running: K `writeup-check` (independent reader; corrects plain errors in place, adds a last
  point "Reader's check"). Token correction given to it: modellers 1.29 M, sum about 6.82 M up to the
  final pass, about 7.37 M before the reader's run.
- 22:00 K `writeup-check` done: about 190 claims checked, 13 corrected in place, a last point 14
  "Reader's check" in the draft; remaining disagreements listed there (among them an unreported
  Slots failure in 14 steps in a complete part of branch Q5b, trace not walked).
- 22:05 the coordinator read points 5, 9 and 10 of the draft; final snapshot, checksum compare,
  commit and push follow (see the commit after 429f5067 on the PR branch). ROUND DONE.
  What a next round needs: `notes/section17-draft-2026-11-17.md` (points 8 to 11), `notes/r3-changes.md`,
  `inputs/model-findings-3.json`, `model/as-built/FIX-fence.md` and `FIX-wake.md` (status tables,
  "Revision 5 notes"), `FIDELITY-3.md` (closing section). This folder's files are copied into
  `research-tree/notes/r3-coordination/`.
  (kept for the record) LEFT at 21:42: read the draft's points 5, 9, 10; final snapshot through the lane; compare both checksum
  files; `git add` this round's paths plus `research-tree/lane/log.jsonl`; commit with -F; push;
  get_usage; report (what holds, what does not, what needs the owner, what was not run, tokens).
  NOTE for the report: the fixes are designs; the scripts are unchanged and still have the defects,
  so R57 cannot lift in this round whatever the model says of the fixes.
  The report must list what was deliberately not run. This round's own rule (two-fault runs only)
  is narrower than the main session's reading (three faults for changed mechanisms): three-fault runs
  are not made here and are named in the report for the owner to keep or cut.
