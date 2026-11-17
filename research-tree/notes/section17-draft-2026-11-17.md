# Draft: section 17 of the research-tree protocol (version 2)

Draft by helper R (`writeup`, first pass; `writeup-2`, second pass), 2026-11-17. It is not part of
the protocol document. The coordinator decides whether and how it goes in. The second pass filled
every block that waited for the ablations (`ABLATION-fence.md`, `ABLATION-wake.md` with its section
"Final pass"), parts 2 and 3 of the fidelity review, and the revision 5 notes of `FIX-fence.md` and
`FIX-wake.md`, and brought the earlier points in line with them.

Paths are relative to `tcb-build/` (BUILD) unless they say otherwise. "Inferred" means reasoned by a
helper and not run or checked. BOUNDED means the run stopped at its memory limit: a property that did
not fail there is "not refuted", never "holds". Every number below names the file it comes from.

## 17. The round that modelled the oracles as built (2026-11-17, afternoon and evening)

**1. What this round did and how.**

The aim (charter `R3-CHARTER.md`, "Goal of the round"): model M2, M3, M5, M6, `status --reconcile`
(RC) and the `--ce` fence (CE) the way the scripts do them, find the counterexamples, design the
smallest fix for each open defect D1 to D7, show by one ablation per fix that each fix is needed, and
list what each fix changes. No script under `tcb/` was changed in this round.

| Stage | Helper (label) | What it wrote | Last write of its main file |
|---|---|---|---|
| Copy and baseline | model-prep | `model/as-built/` copies, `HOWTO-RUN.md`, `MODEL-MAP.md`, `results-as-built/baseline/` | baseline files 15:26-15:29 |
| Read the scripts | F (`sem-fence`), W (`sem-wake`) | `SEM-fence.md`, `SEM-wake.md` | 15:30, 15:31 |
| Model as built | MA (`asbuilt-fence`), MB1 (`asbuilt-wake`) | `AB_*` and `D7_*` flags in `model/as-built/model.mjs`; `CEX-fence.md`, `CEX-wake.md`; `results-as-built/asbuilt-fence/`, `asbuilt-wake/` | 17:57, 18:36 |
| Design the fixes | F (`fix-fence` 1-4), W (`fix-wake` 1-4) | `FIX-fence.md`, `FIX-wake.md`, each at revision 4 | returns 17:46, 17:51 (both files were written again by revision 5: 20:51, 21:14) |
| Attack the fixes | `refute-fence` 1-3, `refute-wake` 1-3 | `REFUTE-fence*.md`, `REFUTE-wake*.md` | fence 17:26, 17:37, 17:44; wake 17:27, 17:40, 17:48 |
| Fidelity review, part 1 | V (`fidelity-3a`) | `FIDELITY-3.md`, `done/model-fidelity-3.json` | return 18:52 (`FIDELITY-3.md` itself was last written at 21:17, by part 3) |
| Change list | C (`changes`, second pass `changes-2`) | `notes/r3-changes.md` | 21:29 (second pass) |
| Join the two designs | J (`fix-join`) | `FIX-JOIN.md` | 18:10 |
| Model the fence fixes | MB2a (`fixes-fence`) | fence `FX_*` flags; `ABLATION-fence.md`; `results-as-built/fixes-fence/` (results 19:05-20:34) | 21:23 (a two-line pointer added by the final pass) |
| Fidelity review, part 2 (fence fixes) | V (`fidelity-3b`) | `FIDELITY-3.md` sections 9-14; key `part2` of `done/model-fidelity-3.json` | return 20:49 |
| Revision 5 of the fence design | F (`fix-fence-5`) | "Revision 5 notes" of `FIX-fence.md`; its status table | return 20:52 |
| Model the wake fixes | MB2b (`fixes-wake`) | wake `FIX_*` flags; `ABLATION-wake.md`; `results-as-built/fixes-wake/` (20:44-21:03), `provenance/` (21:04-21:11) | return 21:12 |
| Revision 5 of the wake design | W (`fix-wake-5`) | "Revision 5 notes" of `FIX-wake.md`; its status and open tables | return 21:15 |
| Fidelity review, part 3 (wake fixes) and closing | V (`fidelity-3c`) | `FIDELITY-3.md` sections 15-16; key `part3` | 21:17 |
| Final modelling pass | MB2b (`fixes-final`) | `FX_R5_*`, `FIX_ENDTURN_ALWAYS` flags; `ABLATION-wake.md` "Final pass"; `results-as-built/final/` (21:17-21:24) | 21:24 (return 21:25) |
| This record | R (`writeup`, `writeup-2`) | this draft, `inputs/model-findings-3.json` | - |

**The fidelity review did not see the final pass.** `FIDELITY-3.md` was last written at 21:17; the
final pass wrote its results from 21:17 to 21:24. Every `FN-*`, `N1-*` and `N2-*` result below has no
fidelity verdict.

The times are the files' last-write times, read from the folder. They show when a file was last
written, not when its work began.

- **Three attack passes per group.** Each fix design was attacked three times (pass 1 on revision 1,
  pass 2 on revision 2, pass 3 on revision 3). Revision 4 answered pass 3. No pass read revision 4.
  Revision 5 (both groups) answered the model and the fidelity review; it was not attacked either
  (`done/r3-fix-fence-5.json` "attacked": false; `done/r3-fix-wake-5.json` "not_attacked").
- **One fidelity review**, in three parts: part 1 on the mechanisms as built, part 2 on the modelled
  fence fixes, part 3 on the modelled wake fixes, with a closing section (`FIDELITY-3.md` section 16).
- **Rule breaches: Node commands outside the lane.** Four returns report one: `sem-wake` (two short
  read-only `node -e`, `done/r3-sem-wake.json`), `asbuilt-wake` (one `node -e` comparison and one
  empty `node -e ""`, `done/r3-asbuilt-wake.json` "rule_breaches"), `fixes-wake` (its first edit
  script `ed1.cjs` by a bare `node` call, `done/r3-fixes-wake.json` "rule_deviation") and `fixes-final`
  (one `node -e 1` no-op in a shell pipeline, `done/r3-fixes-final.json`; `ABLATION-wake.md` F5). None
  started a model run. `fixes-wake` and `fixes-final` are one helper (MB2b) in two tasks, so the four
  returns are three helpers in four tasks (point 12, item 14). By the returns, every model run went
  through the lane.
- **The PC froze at 15:43 and was restarted at 17:13** (charter, load notes). From about 17:15 to
  18:49 the model run of section 16 point 11 shared the machine. Its groups 1 to 5 ended at 18:49
  (`model/results/SUMMARY.md`, updated 13:48:51 UTC = 18:48:51 local; committed in the harness
  repository as 1a82fe4e at 18:52:39).
- **The owner's ruling on testing** (charter: "about 17:45"; section 16 point 12: "about 17:50"). The
  rule: a test runs only if its result can change what we do next. What it cut in this round
  (charter):
  - model runs at two fields and two faults only: one run with everything as built and all fixes
    on, one ablation per fix (main flag off), a sub-flag ablation only for a refuter finding that
    would break the fix;
  - no three-fault, four-fault or three-field run; no R = 2 run unless the fix acts on the restart
    budget; no matrix of each flag alone beyond what names the mechanism behind a failure;
  - a line in the notes before any run over about ten minutes, naming the decision it changes;
  - no further full attack round; a finding that would break a fix gets its change and one targeted
    check;
  - checks that guard something costly or irreversible stay (nothing stale accepted; a READY not
    discarded; a stop never ends a process that is not ours).
- **Memory.** 400 MB per run by default. After 18:50 a per-fix configuration that ends BOUNDED may run
  once more alone at up to 3,000 MB (charter, third load note).

**2. The mechanisms modelled as built.**

The flags are in `model/as-built/model.mjs` (all off = the model before this round). With every new
flag off, `DF2-K2-R1` gives 2,608,525 states, complete, all 14 properties hold, the same as before
(`results-as-built/asbuilt-fence/DF2-K2-R1.json`, `asbuilt-wake/DF2-K2-R1.json`). The verdict column is
the fidelity review, part 1 (`FIDELITY-3.md` section 0; `done/model-fidelity-3.json`).

| Mechanism | How it is modelled now (flag) | Fidelity verdict | Gap that remains |
|---|---|---|---|
| M1 superseded alarm | `AB_ALARM_SUPERSEDE`, `AB_ALARM_MIDTURN`: a new alarm supersedes the old; the old exits 0 at the end of its own sleep, and that exit wakes | as built, with a gap | The re-arm token is abstracted to "may fire whenever idle or mid-turn" (more wakes than built). The cap of 3 alarm processes can leave no current alarm, but only after AlarmsBounded already failed |
| M2 arm at start | `AB_ARM_SPLIT`: reconcile asks for the alarm by its own view; the start is a separate op (AR), and a turn death can fall before it | as built, with a gap | The model's coordinator always runs reconcile and always obeys the arm request except by fault x. D2 ("no brief says so") is not a behaviour of the model |
| M3 act-due (class 17) | `AB_ACT_DUE`: one key per row act, raised once per onset, silent after the ack, slot count with an empty process list; fault o omits a turn's acts | as built, with a gap | `start-session` and `bind` are one act in the model; the stop-verify acts are absent; the planner is the model's `plans()`, not status `next` (checked to agree on the M3 trace) |
| M4 slot count, list unknown | `AB_SLOTCOUNT`, `AB_PROCLIST`: lib.slotCount in its worst reading (no process line matches); fault u makes the list unavailable | as built in the worst reading, fence configurations only | Every wake configuration admits on true liveness. The reading "a process line names the folder" (HARNESS-FACTS 10, open) was never run |
| M5 pause discount | `AB_PAUSE_GAP`: the discount reads the gap the watcher saw; a short pause is missed | as built, with a gap | `gp` survives a watcher restart, while a new watcher's start evaluation rewrites `last_tick_at` (W:729): the model can over-discount. H_HANG = 2 stands for h = 10 |
| M6 READY re-check | `AB_READY_SPLIT`: the child's READY is a hook step and a land step; replace reads only a landed READY | as built | None in the mechanism. Fences from `admitted` and the reasons memory, cut, drop and tainted are not modelled (scope) |
| RC reconcile | `AB_TRANSCRIPT_LAG`, `AB_NO_COMMIT_RECONCILE`: exactly one visible transcript marks `started`; no "COMMIT means committed" branch | as built in the fence configurations | The wake configurations still read true session existence (M:294) |
| CE fence | `FENCE_CE` + `AB_START_UNFENCED` + `AB_HANDOVER_NOKILL`: scripts refuse 64 in their own lock hold; the session-tool start is unfenced, with a yield before it | as built, with a gap | The stale coordinator plans from the live table (M:313). As built it can read only `run/status.json`, which may not show the admission. Other unfenced acts (`plan/` writes, helpers, session close) are not modelled |
| Session start | tool call apart from `bind`; the session id is lost on a turn death | as built | `bind` reads true session existence (M:551); a failed start is not modelled |
| Transcript lag, stop verify | `tv` bit; stop = request + close + verify in one op | as built, with two gaps that matter | Fault z moves the row to `stopped` (M:500), while as built an unconfirmed stop stays `stop-requested` (stop.mjs:441-446). Verify needs no watcher ticks in the model (stop.mjs:362, 393) |
| Close of a committed child | `AB_COMMIT_CLOSE`: stop-request and stop-verify as two ops | as built, with a gap | The two ops run back to back in one turn, with no ticks; verify always confirms |
| D1 supersede chain | as M1 + M2 with the list down | as built | The property is a three-link proxy, not non-termination |
| D5 hang rule | `AB_HANG_CALLS`: one planned healthy slow call | as built, with a gap | Ticks still wait for every other healthy child (timeliness oracle `tickEnabled`, M:721-728) |
| D6 seven paths | diagnostic tags p1 to p7 | p2, p4, p5, p7 as built; p1, p3, p3b, p6 with gaps | p1 lacks "never runs reconcile"; p3/p3b's shortest traces need an alarm to expire inside its own turn (untimed); p6 is the unknown-fact branch |

What still acts atomically on true state is listed in `FIDELITY-3.md` section 2 (12 items).

**R57 as the review reads it** (`FIDELITY-3.md` section 0): partly met. The eight mechanisms of the
charter are modelled from what is on disk, and each has a counterexample that walks against the
scripts. Not met as a whole, for four reasons: the stop and close machinery is still partly an
oracle; the timeliness assumption stays for every healthy child but one slow call; the stale
coordinator reads the live table; and no configuration with every flag on is complete.

**What changed in the table after part 1** (`ABLATION-fence.md` section 1; `FIDELITY-3.md` sections
10 and 15.4):

- **Stop verify and transcript lag: the gap is closed behind a flag.** `AB_STOP_HELD`: an unconfirmed
  verify keeps the row `stop-requested` and resamples; verify waits for two watcher ticks; the owner's
  end of a zombie no longer confirms. The review: "closed as I meant" (section 10, gap 1). Still open
  inside it: the only source of "unconfirmed" is fault z; a live idle process that is not a zombie
  confirms, because the close always kills it (part-1 gap 4, the process-line reading).
- **CE fence: the stale read is closed behind a flag.** `AB_STALE_SNAPSHOT`: the stale coordinator
  plans from the last status.json snapshot, not the live table. The review: "closed as I meant"
  (section 10, gap 2); the model's write points are a subset of the real ones (section 9.3).
- **D7-SLOTS was an artefact, now shown.** D7-SLOTS + `AB_STOP_HELD` (`D7-SLOTS-HELD`): complete at
  1500 MB, 3,093,274 states, SlotsProc and SlotsR10 hold, and every other property
  (`results-as-built/fixes-fence/D7-SLOTS-HELD-1500.json`; review section 10: "honest").
- **D3 in its real, longer form.** With `AB_STALE_SNAPSHOT`, the ablation of FX-CGATE fails
  TwoCoordinatorsAct in 7 steps through an admit followed by a status build and a stale start from
  that snapshot (`fixes-fence/FX-CGATE-X.json`, BOUNDED at 400 MB; review section 10: "honest").
- **`gp` across a watcher restart: closed behind `AB_GP_RESTART`**, which is on only in the joint
  run FXW-ALL (BOUNDED) (`ABLATION-wake.md` section 8; review section 15.4).
- **Still open** (review section 15.4 and `ABLATION-fence.md` section 6): `tickEnabled` timeliness
  (part-1 gap 1; under FX-W6 it is the B1 premise); the process-line reading (gap 4); host class from
  `bn` (gap 5); admission on true liveness and session existence in every wake configuration (gap 9;
  on only in FXW-ALL); endturn without a list counts any watcher.lock holder (gap 11); M1's token and
  alarm cap; M2 (fault o is in no wake part); M3's merged start-session and bind in `rowAct`; D6 p1
  (needs FX-W3); "a complete as-built configuration: still none".

**The fidelity review's verdicts on the modelled fixes** (part 2, `FIDELITY-3.md` section 9; part 3,
section 15; `done/model-fidelity-3.json` keys `part2`, `part3`). Point 5 gives them per fix beside
the runs. In one line each: FX-OUT and FX-CLAIM can be relied on for safety only (FX-CLAIM under a
stronger timing assumption than the design states); FX-CGATE (Q5a), FX-CLOSE and FX-PLAN with a
stated limit; FX-CGATE (Q5b) cannot be relied on; FX-W1, FX-W2 and FX-W5 with a stated limit; FX-W6's
"holds" is its own premise; FX-W4 as designed cannot be relied on. The final pass that answered part
of these limits came after the review (point 1) and has no verdict of its own.

**Provenance.** Part 2 found no fence result proven to come from the frozen file: the fence results
carry no model hash, and the Q5b parts run spans a model edit at 20:09 (section 9). The provenance
rerun on the final model of the wake pass (`d527b879`; the final modelling pass later ran on
`ceea34f3`) with every wake flag off reproduced FX-OUT-PLAN, FX-CLOSE, FX-CGATE (Q5a)
and the three FX-CLAIM `r` parts exactly: states, transitions, completeness, every verdict and trace
length (`ABLATION-wake.md` section 10; `results-as-built/provenance/`). Part 3: settled for those four
"holds"; the 40 FX-CLAIM parts at 1500 MB, the ablation and sub-flag runs and Q5b were not re-run
("a difference there is unlikely", inferred) (section 15.6). The wake results written after the
request carry `sha256` of the model and configs (`ABLATION-wake.md`, provenance table); the earlier
ones carry another hash or none and are quoted only where the later edits cannot reach them.

**3. The counterexamples.**

All at 2 fields, R = 1, all six fixes M1 to M6 on, `--mem-mb 400`, two faults (K2; the fence group
adds fault u, the wake group u, o, y and a planned slow call s, still at most two faults). A failure
found in a BOUNDED run is a real trace of the model (the search is breadth-first). Verdict "real" or
"artefact" is the fidelity review's (`FIDELITY-3.md` section 3), unless it says otherwise.

| Defect | Property, steps | Configuration (run, states) | Result file | Fidelity verdict |
|---|---|---|---|---|
| D4a READY races the fence | ReadyNotDiscarded 6 | AB-READY-SPLIT (43 of 43 parts complete, 8,026,033 states summed) | `asbuilt-fence/AB-READY-SPLIT.json` | real |
| | ReadyNotDiscarded 7 | AB-FENCE-ALL (BOUNDED, 2,936,143); AB-ALL (BOUNDED, 2,858,368) | `asbuilt-fence/AB-FENCE-ALL.json`, `asbuilt-wake/AB-ALL.json` | real |
| D4b late transcript, double start | Slots 3, OneSessionPerAttempt 3 | AB-TRANSCRIPT-LAG (BOUNDED, 3,027,210) | `asbuilt-fence/AB-TRANSCRIPT-LAG.json` | real, timing-dependent |
| | Slots 6, OneSessionPerAttempt 5 | AB-FENCE-ALL; AB-ALL (both BOUNDED) | as above | real, timing-dependent; prefer the 6-step alarm form (see point 12) |
| D3 stale coordinator starts a session | TwoCoordinatorsAct 7, OneSessionPerAttempt 8, Slots 9 | AB-START-UNFENCED (BOUNDED, 2,910,886) | `asbuilt-fence/AB-START-UNFENCED.json` | real in a longer form; the shortest trace is an artefact |
| | TwoCoordinatorsAct 8; StaleWrites 8 | AB-FENCE-ALL; AB-ALL (both BOUNDED) | as above | same |
| | the longer real form: TwoCoordinatorsAct 7, StaleWrites 7, OneSessionPerAttempt 8, Slots 9, OneWriterPerAttempt 10 | FX-CGATE-X = C_CGATE (with `AB_STALE_SNAPSHOT`) minus FX_CGATE (BOUNDED at 400 MB) | `fixes-fence/FX-CGATE-X.json` | real (`FIDELITY-3.md` sections 9.3 and 10) |
| D4c committed child holds its slot | AlwaysCanResolve 5, EventuallyResolves 12 | AB-COMMIT-CLOSE (complete, 2,948,455) | `asbuilt-fence/AB-COMMIT-CLOSE.json` | real, given a coordinator that commits a `started` row |
| | AlwaysCanResolve 7 | AB-FENCE-ALL, first run (BOUNDED, 2,935,625) | `asbuilt-fence/AB-FENCE-ALL.pre-zombie-fix.json` | real (same mechanism) |
| M2 gap (D6 path 1) | WakeSourceAlive 1 | AB-WAKE-ALL (BOUNDED, 2,933,921); AB-ALL | `asbuilt-wake/AB-WAKE-ALL.json`, `AB-ALL.json` | real |
| | NoDeadlock 2, AlwaysCanResolve 2 | AB-WAKE-ALL part k=1,x=1 (complete, 301,865) | `asbuilt-wake/AB-WAKE-ALL__k=1,x=1.json` | real |
| D1 wake loop | WakeChainBounded 9, AlarmsBounded 8 | AB-WAKE-ALL (BOUNDED) | `asbuilt-wake/AB-WAKE-ALL.json` | real |
| | WakeChainBounded 12, AlarmsBounded 10; NoBusyLoop holds | part k=1,u=1 (complete, 1,001,430) | `asbuilt-wake/AB-WAKE-ALL__k=1,u=1.json` | real |
| | WakeChainBounded 13, AlarmsBounded 12 | AB-ALL (BOUNDED) | `asbuilt-wake/AB-ALL.json` | real |
| Endturn exit 2 hides alarm-missing (D6 p3b, branch B2) | WakeSourceAlive 4, NoDeadlock 6 | part k=1,u=1 (complete) | `asbuilt-wake/AB-WAKE-ALL__k=1,u=1.json` | real in kind; the shortest trace needs an alarm to expire inside its own turn (untimed) |
| same, branch B1 | WakeSourceAlive not refuted; WakeChainBounded 6, AlarmsBounded 5 | AB-WAKE-ALL-B1 part k=1,u=1 (BOUNDED, 2,841,685) | `asbuilt-wake/AB-WAKE-ALL-B1__k=1,u=1.json` | not walked separately |
| D5 healthy slow call suspected | NoFalseSuspicion 6 (whole), 7 (parts), 8 (AB-ALL) | AB-WAKE-ALL; its four parts; AB-ALL | `asbuilt-wake/` | real; the trace is one tick short of the script |
| M3 acknowledged, not acted on | EventuallyResolves 13 | AB-W-ACT-DUE part k=2,o=1,cs=1 (complete, 119,490) | `asbuilt-wake/AB-W-ACT-DUE__k=2,o=1,cs=1.json` | real (the planner side verified: S:550, S:489) |
| M5 short suspends | NoFalseSuspicion 6 | AB-W-PAUSE-GAP (BOUNDED, 2,911,241) | `asbuilt-wake/AB-W-PAUSE-GAP.json` | real in kind, compressed (two suspends stand for about ten) |
| M4 unknown + wake group | NoDeadlock 8 | AB-FENCE-ALL, first run (BOUNDED) | `asbuilt-fence/AB-FENCE-ALL.pre-zombie-fix.json` | real as modelled, caused by the wake group (CEX-fence 4.2; not in the review's table) |
| Hand-over exit 2 + lost wake | WakeSourceAlive 4 | AB-W-PAUSE-GAP (BOUNDED) | `asbuilt-wake/AB-W-PAUSE-GAP.json` | real in kind, two faults (CEX-wake 4.7; not in the review's table) |
| Artefacts | EventuallyResolves 7 (process list never returns) | AB-FENCE-ALL first run | `AB-FENCE-ALL.pre-zombie-fix.json` | artefact (CEX-fence 4.2) |
| | EventuallyResolves 13 (slow call never returns) | AB-WAKE-ALL part k=2,o=2 (complete) | `AB-WAKE-ALL__k=2,o=2.json` | artefact (CEX-wake 4.6) |
| | EventuallyResolves 11 (zombie keeps its slot) | AB-COMMIT-CLOSE before the zombie fix | `AB-COMMIT-CLOSE.pre-zombie-fix.json` | artefact, removed by a model fix |
| Not walked by any helper | EventuallyResolves 6, AlwaysCanResolve 5 (part k=1,u=1); EventuallyResolves 11 (part k=2,o=1,x=1) | AB-WAKE-ALL parts (complete) | `asbuilt-wake/` | no verdict; neither CEX-wake nor the review walks these traces |

Each trace in a few lines (from `CEX-fence.md` section 4 and `CEX-wake.md` section 4):

- **D4a, 6 steps.** The coordinator starts f0 and its turn dies before `bind`. The child writes a card,
  then calls Write on READY.json: the hook passes and the write is in flight. The alarm wakes the
  coordinator; reconcile marks f0 started and the plan is a planned hand-over. `replace fence` reads
  READY.json as absent (not landed) and fences e1 to e2; the READY of e1 then lands in the fenced
  attempt. The window is one Write call (milliseconds to seconds); the model's is unbounded.
- **D4b, 3 steps.** One turn admits and starts f0 and f1; it dies before `bind f1`. The alarm wakes
  the coordinator. Reconcile finds no transcript of f1e1 with a cwd record yet, so the row stays
  admitted, and the coordinator starts f1e1 again: three processes against N_max = 2.
- **D3, 7 steps (AB-START-UNFENCED).** Drain, turn death, alarm, hand-over raise. The owner starts
  coord1, which admits f0 and yields before its session start. The stale coord0 takes a pending wake,
  reads f0 at admitted and starts f0e1 with no `--ce`; then coord1 starts f0e1 too. The review: coord0
  can read only status.json, which coord1 wrote before its admit, so this exact trace cannot happen; a
  longer form can (coord1 runs a status build between admit and start, or dies there). Both forms need
  the session tools allowed to the coordinator (today they are not) and a stale coordinator that
  ignores R6. The longer form was run later as FX-CGATE's ablation: drain; x; alarm; hand-over, ce
  goes to 1; coord1 admits f0 and a status build writes status.json; the stale coord0 starts f0e1 from
  that snapshot (TwoCoordinatorsAct 7, `fixes-fence/FX-CGATE-X.json`; `FIDELITY-3.md` section 9.3).
- **D4c, 5 steps.** f0 is admitted and started; the turn dies before `bind`. The child writes a card
  and READY. The coordinator drains and commits f0 at `started` (commit.mjs:937 accepts it). From here
  f1 can never start: stop refuses a committed row at `started` (stop.mjs:276-278), bind refuses a
  committed row (replace.mjs:987), and the hand-over never sees a slot count of 0. Status `next` says
  `bind` for this row (S:543), so the trace needs a coordinator that acts on the READY rather than on
  `next`.
- **M2 gap, 1 step.** The first turn's reconcile exits 1 alarm-missing; the turn dies before it starts
  the alarm. No watcher, no alarm: only the owner can wake the tree.
- **D1, 9 steps.** The process list becomes unavailable. Each reconcile then says alarm-missing
  (`aliveIn(null)`, S:128, S:596) and each turn starts an alarm that supersedes the live one; the
  superseded alarm exits 0 at the end of its sleep (W:778-788) and wakes the coordinator; and again.
  Each link waits a full alarm period, so NoBusyLoop does not see it; the counted form does.
- **p3b, 6 steps.** List down; the turn arms; that alarm exits inside the turn; endturn exits 2
  proc-unavailable (S:652-654), which returns before the alarm-missing check; in branch B2 the
  coordinator starts nothing. Silence once the list returns.
- **D5, 6 steps.** A healthy child starts a long call (no new message). The watcher starts; two ticks
  with no new call raise a hang of the healthy child (H_HANG = 2 stands for h = 10, about ten
  minutes).
- **M3, 13 steps.** A child is stuck; the watcher raises a hang; the woken turn omits its fence (fault
  o); endturn acknowledges the hang; the key stays silent while the hang lasts, and status shows
  nothing to do. AlwaysCanResolve holds, so the owner or a new event can still resolve it.
- **M5, 6 steps.** Two short suspends (no wall gap over 2Δ, W:342-345), each counted as a tick: hang
  of two healthy children. Harmful only in timer branch (b), which nobody has measured.

**4. The fixes.**

Thirteen fixes and one shared primitive. Verdicts are those of the third attack pass
(`REFUTE-fence-3.md` section 3, `REFUTE-wake-3.md` section 3); `notes/r3-changes.md` section 1 says
the same. The column "Last change attacked?" follows the status tables at the top of `FIX-fence.md`
and `FIX-wake.md` as revision 5 left them: where revision 5 changed a fix, its last change is the
revision 5 one, and **no revision 5 change was attacked**.

| Fix | Defects closed | Classical design borrowed | Verdict after pass 3 | Last change attacked? | Depends on |
|---|---|---|---|---|---|
| 0b strict hook write | N5, C9, O5/X5 as far as the hook controls | exclusive create with no fallback (part of FX-OUT, FX-CLAIM, FX-CGATE) | counted under those three | No (rev 3 primitive; H1 was its side effect) | PROBE 6, PROBE 12 |
| FX-OUT outcome log | D4a, a half-written READY, the M6 gap, N1 | test-and-set on write-once slots kept as a log (CORFU, the Paxos log) | stands with a change | No (rev 5: liveness depends on FX-CLOSE, now stated, no step changed; last step change rev 4: no slot and no tombstone without a manifest) | FX-PLAN step 1 and FX-CLOSE (shown by the model, point 5); Q6 (same behaviour both ways); PROBE 2, 3, 6, 9 |
| FX-CLAIM one claim per attempt | D4b, the D3 child backstop, the RC gap, C1, C2/N7 | idempotency key checked at the server, a tombstone on the key, partial synchrony (a stated start-lag bound, a real-time timeout) | stands (FIDELITY-3 found a design hole, fixed in rev 5) | No (rev 5: a tombstone confirms at once only with no visible folder session; every session step 7 counts gets a close; the lease fence is refused once a claim exists, `--if-unclaimed`; the timing assumption restated). Rev 3 change yes | PROBE 1, 5, 7, 9, 10(b); a live watcher (H2, see point 8) |
| FX-CGATE coordinator hook | D3, the coordinator's own retry, the CE gap for session tools and helpers, N2, N6 | fencing token checked at the resource; lease hand-over with a one-time nonce (Chubby's sequencer); input validation at a trust boundary | stands with a change | No (rev 4: "no such session" recorded as such) | Q5 (both branches); PROBE 1, 4, 6, 7, 8, 10 |
| FX-CLOSE release a finished child | D4c, N8 as a probe condition | close-then-verify on an observed close, driven by a supervisor's due-list (a lease was rejected) | stands with a change | No (rev 4: "no such session" counts only for this coordinator's own start or an empty list match) | Q5; PROBE 10; FX-CGATE; FX-PLAN |
| FX-REDO missing ledger line | a missing ledger line after a death | idempotent redo from the after-image (ARIES) | stands | Yes (rev 2, stands) | none; not modelled (tested through the fs seam) |
| FX-PLAN planner expectations | the planners' double start (status.mjs:542, watch.mjs:164); the committed/started `bind` loop (status.mjs:543); the Q5b wake loop (N9); N1 rest | controller expectations (Kubernetes `ControllerExpectations`) and a total transition table checked by test | stands with a change | No (rev 5: a new act `close-session <sid>`; the lease act passes `--if-unclaimed`; rev 4: P1, P2). FX-PLAN was new in rev 3, so it was attacked once (pass 3) | Q5; the FX-CLAIM lease; FX-CGATE `start.json`; the FX-OUT log |
| FX-W1 tri-state liveness, exit markers, flag allow-list | D1 except a hard kill under L1; M1's superseded exits; endturn exit 2 hiding a dead alarm; reconcile exit 67; test-flag forgery | unreliable failure detector ("unknown" never read as "dead"); exit marker of the crash-recovery model; complete mediation of arguments | stands with a change | No (rev 4: allow-list, marker prune) | L1/L2; H2 (hook believed) |
| FX-W2 arm first, confirmed by a live slot | M2 window; D6 paths 2, 3, 4; B2.2, B2.3, B1.4 | the lost wake-up: register before testing, idempotent register; redundancy | stands | No (rev 5: premises (a) and (b) stated, "correct only with FX-W4", and the rule that every turn ends with endturn); rev 3 attacked in pass 3 | H1; S1/S2; FX-W4 (shown by the model, point 5) |
| FX-W3 work needs a live confirmed arm | D2 (an enforcer for each act); B1.1, B1.2 | reference monitor (complete mediation, precondition computed by the trusted base) | stands with a change | No (rev 5: brief rule "every turn ends with endturn, also after handover exit 2 and exit 75"; rev 4: the alarm's `unarmed` record) | H2; FX-W1 markers; FX-W2 `turn.json` |
| FX-W4 dead-man check | D6 paths 1, 5, 6, 7; B3.2, B4.1, B4.5; B6.1's alert | watchdog outside the failure domain (dead-man's switch) | stands with a change; modelled: a hole in once-per-onset (point 5) | No (rev 5: re-alert while the cause holds, pace P1/P2; premise (c) stated; rev 4: reads `watcher-busy.json`; 3 of the last 5 runs) | H4 A/B; the owner's install; FX-W3, W5, W7 inputs |
| FX-W5 re-raise act-due | M3 gap; feeds B3.2's alert | at-least-once delivery with a visibility timeout and capped backoff | stands | Yes (pass 3) | R1/R2 |
| FX-W6 per-kind deadlines | D5 (slow call, waiting child, first tick of an epoch); B5.2 bounded; B5.3 | eventually perfect failure detector (◇P) under partial synchrony, per-operation deadlines and an overall deadline | stands with a change (pass 1 said "falls as written"; a reduced form stood from pass 2) | No (rev 5: the B1 premise stated; rev 4: the age cap asks, uncharged) | H5; B1/B2 |
| FX-W7 watcher lock under the run lock | D1b; the restart loop on exit 67; two writers of watcher state; B6.1 | lock leases plus fencing (Chubby); shed work under contention | stands with a change | No (rev 4: evaluate a copy, adopt after the hold) | L1/L2; RL-yes/RL-no |

Which classical assumption fails for language-model sessions, and what is done (from each fix's
section in `FIX-fence.md` and `FIX-wake.md`):

- FX-OUT: each participant runs its own test-and-set. A child has only the harness Write tool, so the
  hook, which the child cannot skip, runs it for the child.
- FX-CLAIM: clients keep their keys; a server knows a duplicate; dead workers stop; timeouts run on a
  clock nobody else drives. The hook writes the claim; a tombstone cancels; the lease needs ticks and
  wall time.
- FX-CGATE: requests carry their token; a deposed node obeys refusals; callers name only their own
  resources. The hook checks the session bound to the current ce and validates every name.
- FX-CLOSE: a lease would assume sessions stop at expiry or can be killed. Neither holds, so the close
  is observed and then verified.
- FX-PLAN: the actuator reports its own actions. The coordinator forgets them, so the hook writes the
  expectation; observation is bounded only by the measured lease.
- FX-W1: a detector's subject is up or crashed. An alarm that already fired leaves its record, so it
  announces its exit with a marker.
- FX-W2: an atomic "register and sleep" and a client that follows the protocol. Confirmation reads
  only what the scripts wrote.
- FX-W3: a client whose turns are atomic. "Armed" is a fact about the alarm pending now, read from
  files.
- FX-W4: a watchdog that can reset its subject and shares none of its failure modes. This one can only
  alert, and it is itself a program start (open). Revision 5 adds that "alert once per onset" is the
  shape of notification deduplication, not of a watchdog, which keeps barking while the fault
  persists (`FIX-wake.md` N1).
- FX-W5: a consumer that acks after processing. The coordinator acks at endturn whatever it did, so
  the trigger is "the condition still holds".
- FX-W6: silence means a crash or a delay. The child writes its own evidence, so every kind gets a
  finite deadline and the attempt an age cap.
- FX-REDO and FX-W7: no failed assumption is stated in the parts of the files read for this draft.

How the two designs fit (`FIX-JOIN.md`): 13 points resolved; a turn order with both groups' fixes on
(part 2b, rows 0 to 9: wake, successor bind, ensure, reconcile, restart a dead watcher, revocations,
work-creating acts only if armed, bind, exit 75, endturn); 17 places where two fixes touch the same
state (part 2c). Five choices were made in the join and were not attacked (`done/r3-fix-join.json`):
the restart act in the coordinator brief and the dead-man's `runs_no_watcher` (point 1); the profile
key `session_tools` (point 3); the marker prune in reconcile's hold 2 (point 6); one PreToolUse entry
per role with every read-only check before the `start.json` create (point 9); the amendment of
CONTRACT decision 20 (point 4).

Where `FIX-JOIN.md` (18:10) and the revision 5 notes of `FIX-wake.md` (21:14) differ, revision 5 is the
later text: the join's row 8 ends a turn on exit 75 and retries nothing, while revision 5 N2 makes every
turn's last call `status --endturn`, also after `handover` exit 2 and after any exit 75; and the join's
dead-man alert (`runs_no_watcher`, "once per onset like the other causes", point 1) is, after revision 5
N1, repeated while the cause holds. Neither revision 5 change was attacked.

The ablation that shows each fix is needed is in point 5, in one table with the run of each fix and
the review's verdict. In short: nine of the thirteen fixes have a modelled ablation that fails a
property (FX-OUT, FX-CLAIM, FX-CGATE, FX-CLOSE, FX-PLAN, FX-W1, FX-W2, FX-W4, FX-W6), one has its
ablation in the recorded as-built run (FX-W5); FX-REDO, FX-W3 and FX-W7 are not modelled, and 0b is
merged into each hook step with no flag of its own.

The join was checked by the model in the final pass, in part (point 5, "The join's targeted checks");
those results have no review verdict.

**5. What the model says of the fixes.**

Sources: `ABLATION-fence.md` (helper MB2a), `ABLATION-wake.md` with its section "Final pass" (helper
MB2b), `FIDELITY-3.md` parts 2 and 3. Every run: two fields, R = 1, two faults (K2 for the fence fixes;
K2W for the wake fixes: u, o, y as faults and one planned slow call s). A failure found in a BOUNDED
run is a real trace of the model. BOUNDED is "not refuted", never "holds". "Holds" in a part is for
that part's fault multiset only. The fixes are designs; no script changed.

Two things to know before the table:

- **The wake configurations with FX-W2 never complete whole.** FXW-4 at 3000 MB stopped BOUNDED at
  23,229,448 states (`fixes-wake/FXW-4-3000.json`). The verdicts for FX-W1, FX-W2 and FX-W4 come from
  five complete maximal parts at 400 MB: k=1,x=1; k=1,u=1; k=2,u=1,x=1; k=2,x=2; k=2,u=1,l=1
  (`ABLATION-wake.md` section 1). These parts leave out faults o, y, cs/cv/cd, and l together with x
  (review section 15.3).
- **The fence configurations each switch on only the as-built flags their defect needs.** C_OUT and
  C_CGATE run without the held stop verify (`AB_STOP_HELD`), so their liveness "holds" is
  optimistic (review section 11). The wake configurations admit on true liveness (gap 9), except the
  joint run.

**Per fix.**

| Fix | Modelled? | Configuration | Run | Verdict with the fix | Ablation (fix off): what fails | How far the "holds" can be relied on (fidelity review) |
|---|---|---|---|---|---|---|
| 0b hook write | merged into each hook step; no flag of its own (`ABLATION-fence.md`) | - | - | - | none of its own | not judged separately |
| FX-OUT | yes, `FX_OUT` | C_OUT = FIXES + AB_READY_SPLIT + FX_OUT + FX_PLAN (FX-PLAN step 1 is a dependency) | complete at 2500 MB, 5,682,597 states; BOUNDED at 400 MB (2.91 M, `ABLATION-fence.md` section 1; `fixes-fence/FX-OUT.json` is the run without FX-PLAN) | all 19 properties hold (`fixes-fence/FX-OUT-PLAN-2500.json`; equal in the provenance rerun) | ReadyNotDiscarded, 6 steps, BOUNDED at 400 MB: the D4a trace (`fixes-fence/FX-OUT-X.json`). Without FX-PLAN: AlwaysCanResolve 8, EventuallyResolves 17, BOUNDED (a torn fence; `fixes-fence/FX-OUT.json`) | **safety only** (ReadyNotDiscarded, NoStaleAccepted). Slots and liveness rested on an oracle: commit closes a still-writing child, a behaviour FX-OUT itself makes possible; no held stop verify; SlotsProc and SlotsR10 not checked (section 9.1) |
| FX-OUT with FX-CLOSE (final pass, after the review) | yes | FN-OUT-CLOSE = C_CLOSE + AB_READY_SPLIT + FX_OUT: no oracle close, a committed child holds its slot until stop request and verify; held stop verify; D7_SLOTS | complete at K2, 8,225,714 states (one fault: 401,036); memory cap not stated in the source | every property holds, AlwaysCanResolve and SlotsProc included (`final/FN-OUT-CLOSE-K2.json`, `final/FN-OUT-CLOSE.json`) | FX_CLOSE off, one fault: AlwaysCanResolve 6, EventuallyResolves 18, complete, 552,329 states (`final/FN-OUT-CLOSE-X.json`) | **no review verdict** (the review's 9.1 (a) asked for exactly this run) |
| FX-CLAIM | yes, `FX_CLAIM` | C_D4B = FIXES + AB_TRANSCRIPT_LAG + AB_SLOTCOUNT + AB_STOP_HELD + FX_CLAIM + FX_CGATE + FX_PLAN; lease reading (i) | complete over 43 parts: 40 at 1500 MB; the three `r` parts at 3000 MB (11,799,897; 17,317,214; 14,114,426 states, `fixes-fence/FX-CLAIM-rparts-3000.json`); about 148 M states summed (ABLATION-fence's sum) | holds (`fixes-fence/FX-CLAIM-parts.json`; the `r` parts equal in the provenance rerun) | Slots, 16 steps, BOUNDED at 400 MB (`fixes-fence/FX-CLAIM-X-400.json`) | **safety only, under a stronger assumption than stated.** With `FX_CLAIM` on, the model lets a session only die before its first tool call, never stall (MF:1144), and the ablation trace uses exactly that stall. So reading (i) as modelled means "every live session makes its first tool call, or dies, within the lease". Liveness not relied on: step 7 counts on true liveness and hid a slot leak (section 9.2) |
| FX-CLAIM revision 5 point 1 (final pass) | yes, `FX_R5_DEADCOUNT`, `FX_R5_ORPHAN` | C_D4B with step 7 counting a visible session with no done record, alive or dead; part k=2,cd=2 | without the rule: complete, 4,796,168; with it: complete, 4,724,454 (model hash `67c4dec4`, before a later edit behind a flag that is off there) | with the rule: every property holds (`final/FN-R5.json`) | without the rule: AlwaysCanResolve 7 (two children die after their transcript appears and before their first tool call; their dead sessions fill N_max = 2 for ever), EventuallyResolves 15 (`final/FN-R5-DEAD.json`) | **no review verdict**. Not modelled: the `close-session` act for a session that appears after a confirmation; point 2 (`--if-unclaimed`, the stall with a visible transcript) not run |
| FX-CGATE, branch Q5a | yes, `FX_CGATE` | C_CGATE = FIXES + AB_START_UNFENCED + AB_STALE_SNAPSHOT + FX_CGATE | complete at 2000 MB, 8,290,758 states (peak 1063 MB) | all 19 hold (`fixes-fence/FX-CGATE-2000.json`; equal in the provenance rerun) | TwoCoordinatorsAct 7, StaleWrites 7, OneSessionPerAttempt 8, Slots 9, OneWriterPerAttempt 10; BOUNDED at 400 MB (`fixes-fence/FX-CGATE-X.json`): D3 in its real, longer form | **with a stated limit:** a narrow configuration (no transcript lag, no table slot count, the old stop verify, no lease); the nonce bind and the window between the hook's allow and the tool's effect are merged, so schedules 12 and 14 cannot be expressed (section 9.3) |
| FX-CGATE, branch Q5b | yes, `FX_Q5B` | C_CGATE + FX_Q5B + FX_PLAN + FX_CLAIM | **BOUNDED**: 41 of 43 parts run, 33 complete, 8 BOUNDED near 11.5 M states, about 190 M summed (`fixes-fence/FX-CGATE-Q5B-parts.json`) | NoDeadlock 15 and AlwaysCanResolve 12 (part k=2,cd=1,l=1): hand-started children wake no coordinator; the trace rests on "hand-over skipped, the turn ends", which is INFERRED. Slots 13 (part k=2,z=1,r=1): an artefact by the modeller's reading | a branch, not a fix: no ablation. Without FX_CLAIM: AlwaysCanResolve 5 (kept in `fixes-fence/SUPERSEDED-runs.json`; `ABLATION-fence.md` names it `FX-CGATE-Q5B-noclaim-2500.json`) | **cannot be relied on**: BOUNDED; liveness analysed in 30 of 43 parts; the Slots "artefact" not shown to be one (section 11) |
| FX-CLOSE | yes, `FX_CLOSE` | C_CLOSE = FIXES + AB_COMMIT_CLOSE + AB_NO_COMMIT_RECONCILE + AB_STOP_HELD + D7_SLOTS + FX_CLOSE + FX_CGATE + FX_PLAN | complete at 1500 MB, 4,151,883 states | all 21 hold, SlotsProc and SlotsR10 included (`fixes-fence/FX-CLOSE.json`; equal in the provenance rerun) | AlwaysCanResolve 5 (the D4c trace), EventuallyResolves 17; complete, 3,968,248 (`fixes-fence/FX-CLOSE-X.json`). Sub-flag `FX_PLAN_OWNEREND` off: AlwaysCanResolve 7, EventuallyResolves 28; complete, 4,090,782 (`fixes-fence/FX-CLOSE-NOOWNEREND.json`) | **with a stated limit:** the process list is always there (no fault u, so H3's list branch is never exercised); PROBE 10(a) and 10(b) assumed true; the close, its effect and its done record are one step (section 9.4) |
| FX-PLAN | yes, `FX_PLAN` (sub-flags STARTWAIT, OWNEREND) | inside C_D4B, C_OUT and C_CLOSE | as those three | holds in all three | part k=2,cd=2 of C_D4B: AlwaysCanResolve 3, EventuallyResolves 10; complete, 2,523,662 at 2500 MB (`fixes-fence/FX-PLAN-X-cd2.json`). STARTWAIT off: AlwaysCanResolve 4, EventuallyResolves 20; complete, 4,683,570 (`fixes-fence/FX-PLAN-NOSTARTWAIT-cd2.json`) | **with a stated limit:** its ablation shows a defect that FX-CGATE's one-shot start creates, not an as-built one; FX-PLAN is shown needed by the other fixes, not alone. The watcher hands only some rows to `planAct`; `rowAct` is not rewired; step 1's owner branch is absent (section 9.5) |
| FX-REDO | **no**: the model has no ledger lines | - | - | - | none | - |
| FX-W1 | yes, `FIX_ALARM_MARKER` | FXW-4R = WA + FX-W1 + FX-W2 + the hard-kill branch + FIX_DEADMAN + the re-alert candidate | five parts complete at 400 MB, 2,940,572 states summed (`fixes-wake/FXW-4R-parts.json`) | in the five parts NoDeadlock and AlwaysCanResolve hold; NoSilenceAfterFirstCall 2 (hard kill, outside FX-W1/W2 by design) and WakeSourceAlive 1 (p0) in parts k=1,x=1, k=2,u=1,x=1 and k=2,x=2; in part k=1,u=1 both fail in 9 (the join gap, `ABLATION-wake.md` section 2), in part k=2,u=1,l=1 both in 5; EventuallyResolves 10 an artefact (the list never returns), 11 in part k=2,u=1,x=1 (`fixes-wake/FXW-4R-parts.json`) | part k=1,u=1 (complete): NoSilenceAfterFirstCall 5, schedule W3 (`fixes-wake/FXW-4R-X1-parts.json`). Liveness holds there: FX-W1's load is on silence | **with a stated limit:** five parts; judged inside a configuration with the re-alert the design then lacked; faults o and y in no part, so the exit-67 change is untested; allow-list and marker prune not modelled (section 15) |
| FX-W2 | yes, `FIX_ARM_FIRST` (`ALARM_SLOTS` for S2) | FXW-4R | as FX-W1 | as FX-W1 | NoSilenceAfterFirstCall 1, the M2 gap (`fixes-wake/FXW-4R-X2-parts.json`). Without the dead-man (`fixes-wake/FXW-12-X2.json`, BOUNDED): NoDeadlock 2, AlwaysCanResolve 2, EventuallyResolves 5. FX-W2 without FX-W4 (`fixes-wake/FXW-12-S2.json`, BOUNDED): NoDeadlock 2, a death before call 1 | **with a stated limit:** five parts; rests on timing premises (a) and (b); schedules 2 (x, o), 8 and 9 not covered; the hard kill (p6) open by design (section 15) |
| FX-W3 | **no**: not expressible in this model (below) | - | - | - | none | - |
| FX-W4 as designed (once per onset) | yes, `FIX_DEADMAN` | FXW-4 = WA + FX-W1 + FX-W2 + the hard-kill branch + FIX_DEADMAN | five parts complete at 400 MB, 1,786,607 summed; whole BOUNDED at 3000 MB, 23.2 M (`fixes-wake/FXW-4-parts.json`, `FXW-4-3000.json`) | **fails at one fault x: NoDeadlock 8, AlwaysCanResolve 7.** The dead-man alerts once; the owner starts coord1; coord1's first turn dies before call 1; the cause never cleared, so no second alert: silence for ever. Final pass, part k=1,x=1: the same, complete, 63,270 states (`final/N1-FXW-4.json`; no review verdict) | part k=1,x=1 (complete): NoDeadlock 2, AlwaysCanResolve 2: the first turn dies before call 1 and nothing else can wake anyone (`fixes-wake/FXW-4-X-parts.json`) | **cannot be relied on as designed** (section 15) |
| FX-W4 with the re-alert (revision 5 N1) | yes: `CAND_REALERT`, which N1 makes the design (`FIX_REALERT`) | FXW-4R | five parts complete at 400 MB; final pass part k=1,x=1 complete, 91,370 states | NoDeadlock and AlwaysCanResolve hold in all five parts (`fixes-wake/FXW-4R-parts.json`, `final/N1-FXW-4R.json`) | the as-designed run above | **with a stated limit, reviewed when it was not yet the design** (on the five parts; the final-pass run `final/N1-FXW-4R.json` has no review verdict): the owner's answer to an alert sits inside the dead-man step, which is weakly fair, so the model assumes the owner always answers at once; WakeToRun assumed; the list window is a saturating counter; the stuck, busy and unarmed inputs are absent. The pace (P1 or P2) is untimed: one model for both |
| FX-W5 | yes, `FIX_ACT_RERAISE` (branch R1) | FXW-5 = AB-W-ACT-DUE's flags + FIX_ACT_RERAISE | complete at 3000 MB, 7,005,647 (BOUNDED at 400: 2.91 M) | every safety property and NoBusyLoop hold; NoDeadlock 6, AlwaysCanResolve 5, EventuallyResolves 5, WakeSourceAlive 4, all from the hand-over path under u, not from the tick (FX-W4 is not in this configuration) (`fixes-wake/FXW-5-3000.json`) | recorded as built: part k=2,o=1,cs=1 of AB-W-ACT-DUE, EventuallyResolves 13. The same part with the fix: complete, 119,202, every property holds (`fixes-wake/FXW-5__o1cs1.json`) | **with a stated limit:** shown only in that one part; masked elsewhere by the hand-over/u failures; the two runs of the ablation are from different model versions, and the fixed one carries no hash (sections 15, 15.2) |
| FX-W6 | yes, `FIX_OP_DEADLINE` (branch B1) | FXW-6 = AB-W-HANG-CALLS's flags + FIX_OP_DEADLINE | complete at 3000 MB, 13,993,281 | NoFalseSuspicion holds; the same four liveness failures as FXW-5, same cause (`fixes-wake/FXW-6-3000.json`) | NoFalseSuspicion 6, BOUNDED at 400 MB: CEX-wake's D5 trace (`fixes-wake/FXW-6-X.json`) | **the "holds" is its premise:** a healthy slow child's hang count is capped below the threshold (WM:1136), so under B1 the property cannot fail; kinds, the transcript-tail reading, idle and the age cap are not modelled; the first-tick change alone is untested (section 15) |
| FX-W7 | **no**: not expressible in this model (below) | - | - | - | none | - |

**Why FX-W3 and FX-W7 cannot be expressed** (`ABLATION-wake.md` F1). First reason given was the budget
(section 1); the final pass gives a model reason:

- FX-W3's ablation must fail on a turn that creates work on a stale `confirmed` without its own arm
  calls. Under FX-W2 every model turn runs ensure and reconcile before any act, and fault o skips only
  acts, so no state reaches the gate with a stale arm. It needs `turn.json`'s arm state and an o that
  skips the arm calls: a new fault semantics.
- FX-W7's ablation must fail SingleWatcher or NoBusyLoop. Both hold in every as-built configuration.
  The model's tick is one atomic step that never takes the run lock; run.lock is held only by a dead
  holder; there is no live hung holder and no lease bit. The defect FX-W7 fixes must be modelled first.

**Owner branches that were modelled.**

| Branch | Runs | Result |
|---|---|---|
| Q5a / Q5b (coordinator session tools) | FX-CGATE-2000; FX-CGATE-Q5B-parts | Q5a holds (complete). Q5b BOUNDED, NoDeadlock 15 and AlwaysCanResolve 12 on an INFERRED step; stays open |
| Q6 (a) / (b) (M6 library half) | - | one model step for both (`ABLATION-fence.md`); not run apart |
| Lease reading (i) / (ii) (PROBE 5) | FX-CLAIM-parts; `fixes-fence/FX-CLAIM-II-400.json` | (i) holds. (ii): Slots 8 and NoChargeWithoutFault 8, BOUNDED at 400 MB, both traces fault-free; the second fences a healthy claimed session. Revision 5's `--if-unclaimed` would remove the charge failure, not the Slots one (`FIX-fence.md` point 2; not run) |
| S1 / S2 (FX-W2) | FXW-4R; `fixes-wake/FXW-4R-S2-parts.json` (4 parts complete, k=2,u=1,x=1 BOUNDED) | S2 removes the 9-step silence of part k=1,u=1 and adds its own: NoSilenceAfterFirstCall 1, a hard kill between the two ensures. Liveness holds in both |
| Endturn exit 2: B1 / B2 (CEX-wake's names) | FXW-4R (B2); `fixes-wake/FXW-4R-B1-parts.json` (2 parts complete, 3 BOUNDED at 400 MB) | no verdict change in the complete parts; B1 does not remove the 9-step silence |
| Every turn ends with endturn (revision 5 N2; the compliant case of E1) | part k=1,u=1 of FXW-4R, off and on | off: NoSilenceAfterFirstCall 9 and WakeSourceAlive 9; complete, 363,670 (`final/N2-FXW-4R.json`). On: both hold; complete, 363,706 (`final/N2-FN-N2.json`). EventuallyResolves 9 remains, the known artefact. Final pass: no review verdict |
| Re-alert off / on (revision 5 N1; P1 and P2 are one untimed model) | part k=1,x=1 | off: NoDeadlock 8, AlwaysCanResolve 7; on: both hold (rows above; final pass, no review verdict) |
| R1 / R2 (FX-W5) | FXW-5; AB-W-ACT-DUE | R1 holds in the defect's part; R2 (as built) fails EventuallyResolves 13 |
| FX-W6 B1 / B2 | FXW-6 | B1 only; B2 (the refund) not modelled |
| L1 / L2 | - | L1 only; L2 (leases) not modelled |
| RL-yes / RL-no, H4 A / B, E2 | - | not modelled (RL needs FX-W7; in H4 the owner's act is merged into the dead-man step; E2 is a new mechanism) |

**The joint run** (`ABLATION-wake.md` section 4; `fixes-wake/FXW-ALL.json`). FXW-ALL: every as-built
flag of both groups, the D7 observers, FX_PROPS, AB_STOP_HELD, AB_STALE_SNAPSHOT, AB_GP_RESTART, the
five modelled fence fixes and the five modelled wake fixes: 10 of 13 (FX-REDO, FX-W3 and FX-W7 are not
in the model). At 400 MB: **BOUNDED, 2,579,912 states (1,350,125 expanded)**, 8,205,402 transitions.
Failures, each a real trace:

| Property | Steps | Cause, as the modeller reads it |
|---|---|---|
| NoFalseSuspicion | 14 | two short suspends counted as ticks (timer branch b, the M5 gap): open by design |
| NoDeadlock / AlwaysCanResolve | 7 / 7 | the FX-W4 once-per-onset gap (the alert's wake is consumed mid-turn, then the turn dies) |
| EventuallyResolves | 9 | artefact: the process list never returns, and a reset leaves run.lock |
| WakeSourceAlive | 1 | the first turn dies before call 1 (p0), FX-W4's case by design |
| NoSilenceAfterFirstCall | 2 | a hard kill after the ensure (p6), open by design |

Every fence-group property is **not refuted within the bound**, never "holds". No failure shows an
interaction between the two groups' fixes. What the run cannot see (review section 15.5):

- **It is shallow.** BFS levels 0 to 13 are complete, level 14 partly. No safety trace longer than 13
  steps was seen, while the fence fixes' own traces run to 16-17 steps (Q5b's to 15). Each fence configuration alone
  needed 3 to 17 million states; this run covers all of them in 2.6 million.
- **Liveness counts every unexpanded state as able to resolve** (check.mjs:189), so an interaction
  shows only if its whole dead end or cycle lies inside the expanded part.
- **It is not the design as it now stands.** It ran at 21:03, before the final pass: no re-alert, no
  "every turn ends with endturn", no revision 5 orphan rule (`final/` 21:17-21:24). Not in it at all:
  FX-W3, FX-W7, FX-REDO, branch Q5b, lease reading (ii), E2, L2.
- **No complete run of the joint model exists**, with or without the fixes.

**The join's targeted checks** (`ABLATION-wake.md` F2; FIX-JOIN point 1 and point 9). Final pass: no
result below has a review verdict.

| Check | Result |
|---|---|
| (i) a dead watcher, its restart, and the start lease (L1, list known): FN-JOIN-WSTART = C_D4B with the lease at watcher ticks + FX-W1, W2, W4 with the re-alert and the hard-kill branch; part k=2, x=1, cd=1 | two fields: **BOUNDED** at 3000 MB, 21.7 M states (`final/FN-JOIN-WSTART.json`); with the designed FX-W4 (`-D`), BOUNDED at 1500 MB. **One field: complete, 393,461 states; EventuallyResolves, NoDeadlock, AlwaysCanResolve and every safety property hold** (`final/FN-JOIN-WSTART-1F.json`); WakeSourceAlive 1 and NoSilenceAfterFirstCall 2, both known. The restart in the model is endturn's watcher start, not the join's brief act |
| (i') the restart act omitted, against `FIX_NOWATCHER_ALERT` | **not expressible**: in the model endturn itself restarts the watcher, so no turn omits the restart |
| L2 branch of (i) | not modelled |
| (ii) the hook order reversed (`JOIN_HOOK_ORDER`) | **not expressible**: the order is between FX-W3's armed check and FX-CGATE's `start.json` create, and FX-W3 is not modelled |

**The schedules the designs expect to fail.**

| Schedule | Expected | What happened |
|---|---|---|
| Fence 5 (an old watcher during rollout, P4) | fail | not expressible; nothing run (`ABLATION-fence.md`) |
| Fence 6 (the watcher dead, the H2 dependency) | fail without a restart | not expressible in the fence configurations (there the watcher never dies); the join check (i) covers a dead watcher with its restart: holds in one field, BOUNDED in two (final pass, no review verdict) |
| W4 (a hard kill under u, L1) | fail (open in L1) | `ABLATION-wake.md` section 5 says covered by FXW-4 and expected to fail; its branch table (section 3) says W4 is "not shown either way" because L2 is not modelled. The result files support "not shown either way": no failing trace combines the hard kill with u. The hard-kill failure that does appear, NoSilenceAfterFirstCall 2 (p6), needs no u (the same 2-step trace in parts with and without u), and in FXW-4R's part k=2,u=1,x=1 NoDeadlock and AlwaysCanResolve hold (`fixes-wake/FXW-4R-parts.json`). See point 12, item 13 |
| W15 (short suspends, timer branch b) | fail | not run alone with FX-W6 ("its verdict is known"); FXW-ALL fails NoFalseSuspicion 14 by two short suspends, which is this case |

**Fixes, or parts of fixes, shown needed only by argument and attack, not by the model:**

- **Whole fixes:** FX-REDO (no ledger lines in the model), FX-W3 and FX-W7 (not expressible), 0b (merged
  into each hook step).
- **FX-PLAN** is shown needed only because the other fixes need it; its own as-built targets are
  already blocked by FX-CGATE's hook and FX-CLOSE (review section 9.5).
- **Parts not modelled:** FX-W1's flag allow-list (schedules W5, W6) and marker prune; FX-W2's nonces,
  the `abandoned` path and the slow query (W8); FX-W4's stuck, busy and unarmed inputs and its "3 of
  the last 5" list window (a saturating counter in the model); FX-W5's `stuck_count` and owner
  exclusion; FX-W6's kinds, idle, age cap and the B2 refund; FX-CLAIM's `--if-unclaimed` and the
  `close-session` act (revision 5); FX-PLAN step 1's refusal and owner branches; FX-CGATE's nonce bind
  window (schedule 14) and hook-to-effect window (12); FX-CLOSE's "close success that is only a
  request" (11) and H3's process-list branch; FX-OUT's no-manifest rule (1) and the tainted reason
  (7, partly); E2; the join's restart act (i') and hook order (ii).
- **Schedules not expressible**, fence (of fourteen): 1, 4, 5, 6, 11, 12, 14; 9 not reachable; 7 and
  8 partly. Wake (of eighteen): W1, W5, W6, W7, W8, W9, W10, W11, W13, W14, W16, W17, W18; W2 and
  W12 partly; W15 not run (`ABLATION-fence.md`; `ABLATION-wake.md` section 5).

**Model corrections made on the way** (`ABLATION-fence.md`): the drain-skip retry; a torn hand-over
spends h once; a tombstone bug that gave Slots 21. The earlier runs are kept in
`fixes-fence/SUPERSEDED-runs.json`. **Three timing premises** are encoded in the wake model, each a
rule the design must state and not a mechanism (`ABLATION-wake.md` section 8; `FIX-wake.md` N3): (a) no
alarm fires between its own ensure and the same turn's reconcile; (b) at most one current alarm of a
coordinator fires inside one of its turns; (c) the dead-man does not count while a wake is pending.
Without (a), FXW-12 failed at 3 steps; without (b), FXW-12-S2 failed at 6.

**6. Defect D7: the weak properties.**

From `CEX-wake.md` section 5 and the review's section 5. The old forms are still checked beside the
new ones.

| Old property | Why weak | New form | Where the new form fails | What the review says |
|---|---|---|---|---|
| RestartLimit | reads the counter replace increments, so it cannot see a counter that is not kept | RestartLimitGhost: failure fences counted from the epochs (`gf`); no admission after more than R | D7-RESTART (mutation: counter frozen), complete, 2,628,513 states: fails in 17 steps; old form holds (`asbuilt-wake/D7-RESTART.json`) | says R8; can fail; `gf` is the model's own count at the fence site, independent of the mechanism |
| TwoCoordinatorsAct | restates the `--ce` fence | StaleWrites: a step of a stale coordinator changes the table or the sessions | D7-STALE (fence off, hand-over CAS, one fault), complete, 2,000,035: fails in 4; old form also 4. AB-ALL (BOUNDED): 8 (`D7-STALE.json`, `AB-ALL.json`) | stronger than R6's text (also forbids a session start); matches R57; the AB-ALL failure is the D3 artefact |
| A-FENCE-CE has no finite space | no fault, unbounded sessions | finite form: hand-over CAS plus a cap of 3 sessions per attempt | D7-STALE complete at 2,000,035 states; also Slots 12, OneSessionPerAttempt 12; EventuallyResolves 12 is an ablation artefact | (cap judged in its section 4: hides nothing for safety) |
| AtMostOneCommit | its mechanism (exclusive create) never exercised | CommitRecordStable: once COMMIT names an epoch it never names another | D7-COMMIT-NOFENCE (exclusive create off and epoch check off), BOUNDED, 2,911,018: fails in 13 (`D7-COMMIT-NOFENCE.json`). D7-COMMIT (exclusive create off, epochs compared), complete, 2,615,376: new form holds, old form fails in 6, a false positive (an identical rewrite) | says R14; fails only with both safeguards removed; exclusive create is still not shown load-bearing while the epoch check is there |
| Slots | excludes READY-but-alive children; weaker than R10 | SlotsProc (live processes ≤ N_max) and SlotsR10 (per attempt) | D7-SLOTS, complete, 2,727,196: both fail in 7; old Slots holds (`D7-SLOTS.json`) | the trace is an artefact as built (it needs z → stopped). Later shown: D7-SLOTS-HELD (with the held stop verify) is complete, 3,093,274 states, and SlotsProc and SlotsR10 hold (`fixes-fence/D7-SLOTS-HELD-1500.json`). So the new forms have no failure as built; with FX-CLOSE they hold in C_CLOSE (point 5). No run shows them failing on the as-built close, so they are not shown able to fail there |
| R5's loop rule never exercised | the loop fault never reaches LOOPS | LoopReported, with `D7_LOOPS` | D7-LOOPS (rule removed by mutation), BOUNDED, 2,910,546: fails in 8. D7-LOOPS-RULE (rule in place), BOUNDED, 2,910,399: not refuted | says R5; fails under the mutation; BOUNDED with the rule (not "holds") |

D7-COMMIT-NOFENCE also fails NoStaleAccepted in 8 and AtMostOneCommit in 6 (result file); no helper
reports these lengths.

Three properties are new with the wake group (not D7 forms). The review (section 5):

- **WakeSourceAlive** reads R6's bound with its amended clause, and counts a live child as a source
  (weaker than R6). On a first turn one fault silences the tree, so either R6's bound is broken by one
  fault or "both sources" must be restated: an owner wording question.
- **WakeChainBounded** (fewer than 3 superseding arms in a row) and **AlarmsBounded** (at most 2
  alarms per coordinator) are proxies with no rule text behind them. WakeChainBounded cannot tell D1's
  endless loop from three turns of one outage.

Three more came with the fix models:

- **OneWriterPerAttempt** (fence, `FX_PROPS`): an observer on the writer mark, set at the claim, at
  the READY hook and at a card write by a session that is not stale. It can fail: FX-CGATE-X fails it
  in 10 steps (`FIDELITY-3.md` section 12).
- **NoChargeWithoutFault** (fence, `FX_PROPS`): in the model, "no charge while no fault has happened
  anywhere on the path". The review: weaker than its rule ("no charge to an attempt unless that
  attempt had a fault"); after one unrelated fault a spurious charge is invisible, and at K = 2 there
  is room for exactly one such fault. It can fail: FX-CLAIM-II, 8 steps. Inferred by the review:
  under lease reading (i) no healthy session is crash-fenced, so the weak form hides nothing known
  there (section 12).
- **NoSilenceAfterFirstCall** (wake, `WFX_PROPS`): WakeSourceAlive minus three cases: a death before
  the turn's first tool call (tag p0, which FX-W2 leaves to FX-W4 by its own text), the host reset,
  and the owner's two-loss case. WakeSourceAlive stays checked beside it and fails at 1 step in every
  wake-fix configuration (the first turn dies before call 1) (`ABLATION-wake.md` section 1); in a
  part without fault x it can hold (N2 on, part k=1,u=1, `final/N2-FN-N2.json`; final pass, no review
  verdict). The review did not judge this form separately.

**7. Proposed rule sentences (proposals, not adopted).**

From `FIX-JOIN.md` part 3. Every row is marked **join** there: written in the join because neither
fix file proposes a sentence, and not attacked. Line numbers are the protocol document's as FIX-JOIN
gives them; point 12 notes one that is out of date. Revision 5 of `FIX-wake.md` came after FIX-JOIN and
changes two of these texts (marked in R6-c and R6-d); revision 5 is the later text, and it was not
attacked either.

| Rule | Present sentence (line) | Proposed sentence | Fix | Depends on a ruling? |
|---|---|---|---|---|
| R2 | "Every script that writes takes `--ce` and exits 64 on a stale one." (95-96) | "...; the coordinator's hook allows a session other than the one bound to the current ce (by the one-time nonce of the brief line) only Read, so a stale coordinator can neither start nor stop a session." | FX-CGATE | Q5 (start/stop clause only in Q5a); PROBE 1(c) |
| R3 | "`status.mjs --reconcile` runs at the start of every coordinator turn: a transcript on disk for the attempt folder means the start happened, so it is recorded." (106-107) | "...the attempt's claim (the first session to pass a tool call, recorded by the hook) means the start happened, so it is recorded with that session; a transcript is a second source, and any other session in the folder is an anomaly. A session start is recorded by the hook before it runs, and the planner does not order another start while that record's lease (ticks and wall time) runs." | FX-CLAIM, FX-CGATE, FX-PLAN | Q5 |
| R4 | (§16, line 957) "...and within δ on others, act-due (class 17) among them." | add: "An act-due whose condition still holds is raised again at a capped interval, and one raised three times at the cap is reported as stuck. The planner's act is one function shared with status; a row status gives to the owner raises nothing." | FX-W5, FX-PLAN | R1/R2 |
| R5 | (§16, line 947) "...No other counter of this rule reads elapsed wall time." and "Hang: h watcher ticks with no new call in any transcript of the attempt" (123) | L2 only: the lease sentence of `FIX-wake.md` ("No counter of this rule reads elapsed wall time, except when the process list cannot answer. ..."). Both branches: "Hang: a per-kind deadline in counted ticks, read from the transcript tail (a tool call: its timeout + 12; a background wait: 60; a model call: 10); an idle child and an attempt older than `attempt_max_ticks` raise an uncharged act-due, never a fence; the first tick of an epoch counts nothing." | FX-W1, FX-W7 (L2); FX-W6 | L1/L2; RL-yes/RL-no; B1/B2 |
| R6-a | (§16, line 949) "...exits 1 alarm-missing when no alarm of the current ce is known to live (...); the coordinator then starts the alarm before anything else." | "The coordinator's first call of every turn starts `watch.mjs --alarm --ensure` in the background, which registers an alarm only when no slot holds one that has not exited; its second is `status --reconcile`, which counts the slots holding an alarm with no exit marker that is alive or unknown, and records the turn as armed only if enough are." | FX-W2 (replaces M2's alarm-missing) | S1/S2 |
| R6-b | (§16, line 948) "...and exits 1 unless both sources run (2 proc-unavailable when it cannot tell)." | "...and reports each source alive, dead or unknown: exit 1 when any is dead, 2 only when none is dead and some is unknown. Every alarm writes an exit marker before it exits, so an alarm that fired or was superseded is dead, never unknown. On a dead watcher the coordinator starts a new one; on unknown it starts nothing." | FX-W1; join point 1 | L1/L2 |
| R6-c | (none) | add: "Acts that create work (a first fence, a start, a session start) need the turn to be armed: the confirmed slots hold alarms with no exit marker; revocations are never gated. On exit 75 the coordinator ends its turn and retries nothing. The coordinator brief lists these acts." Revision 5 N2 (later): every turn's last call is `status --endturn`, also after `handover` exit 2 and after any exit 75; act on its exit 1 once, then end the turn | FX-W3 | none (E1/E2 for a coordinator that omits endturn) |
| R6-d | "The bound: a wake arrives while either source lives; if both wakes are lost, only the owner wakes the tree." (FIX-JOIN: 127-128; the document today: 134-135) | "The bound: a wake arrives while either source lives; a dead watcher is restarted at the next turn, within two alarm periods. A scheduled task outside the tree, which wakes the PC, alerts the owner when no alarm or no watcher lives, the process list keeps failing, an act-due is stuck (about 4.75 h), the run lock stays busy, or turns run unarmed; it cannot wake the coordinator." Revision 5 N1 (later): the alert repeats while the same cause holds, every `realert_runs` runs, not once per onset | FX-W4, FX-W3, join point 1 | H4 A/B; H7 a/b (a fact); P1/P2 (the re-alert pace) |
| R7 | (§16, line 950, M6) "...so a READY written before the re-check wins; one written after it can still be fenced (open defect)." | "The outcome of an attempt is a log of write-once slots that the hook writes for the child's READY and the fence writes for itself, each by exclusive create; the fence first runs every refusal check, then refuses with exit 5 ready-wins on an uncommitted ready slot for every reason except first and tainted, then takes the next slot; whichever slot comes first decides, and nothing follows a fenced slot. READY.json is a copy no decision reads." | FX-OUT | Q6 (same behaviour both ways) |
| R8 | "A failed task is replaced at most once (R = 1, any class)." (145) | add: "A fence of an attempt that no session ever claimed (a no-start) is uncharged for a failure reason only while fewer than `H_nostart` such fences ran in a row, and charged after; it is never charged for a planned reason." B2 only, add: "One fence per task later shown false is refunded, and R is counted as R + 1." | FX-CLAIM; FX-W6 B2 | B1/B2 (the evidence rule for B2 is open) |
| R9 | "...after the coordinator's stop it checks for 2Δ that no transcript of the session or its helpers grows, then kills processes naming the attempt folder" (153-154) | "...after the coordinator's close, recorded by the hook from the close tool's answer, it confirms only when the claim holder and every other session of the folder has a counting close record and no transcript grew over `stop_verify_deltas` ticks and `stop_verify_ms`; a committed child at started or bound is stopped the same way; after three unconfirmed rounds the owner records the close. No script kills a process." | FX-CLOSE, FX-CGATE | Q5; PROBE 10 |
| R10 | (§16, line 951) "...it is the current attempt of an active row at admitted, started or bound or the last attempt of a committed row, or a transcript of it exists..." | append: "; and every session found in an attempt folder that has no close record and is not the claim holder of a stop-confirmed attempt takes one more slot." | FX-CLAIM step 7 | none |
| R12 | "...handover.mjs kills the watcher and the alarm and raises ce; the owner starts a fresh coordinator from a one-line brief." (181-182) | "...handover.mjs raises ce and writes a one-time nonce; the old watcher and alarm exit 64 on their next check; the owner starts a fresh coordinator from a one-line brief that carries the nonce and the coordinator brief, and the first session to bind with that nonce is the coordinator. If the coordinator is dead or locked out, the owner drains and raises from a terminal." | FX-CGATE, FX-W3 | PROBE 7(b) |
| R13 | "A session writes only its `staging/`; ... only lib.mjs appends to the ledger. [guard-hook prevents; fsck detects.]" (206-210) | add: "The guard-hook takes no lock and writes only by strict exclusive create (no fallback, no folder creation, within its deadline): outcome slots, `claim.json`, `start.json`, `coord-session-<ce>` and close records, none of them a path a script writes." | 0b, FX-OUT, FX-CLAIM, FX-CGATE (also CONTRACT decision 20) | none |
| R29 | "guard-hook.mjs refuses out-of-role paths, writes to `.claude/`, Bash (except the coordinator's `node tcb/scripts/*`), ..." (310-312) | "...Bash (except the coordinator's `node tcb/scripts/*` with the flags each script's production calls use; any other flag is refused), ..." | FX-W1 step 5 | none |

No sentence is proposed for FX-REDO (no rule changes), for FX-W7 in L1 (R5 unchanged), or for class 17
(a CONTRACT text, C:97).

**8. What stays open.**

| Item | Why it is open | Whose decision |
|---|---|---|
| A hard-killed alarm during a process-list outage (L1) | no exit marker is written; nothing tells it from a sleeping alarm while the list is unknown | owner: L1 or L2 |
| Suspends shorter than 2Δ counted as ticks (M5 gap, timer branch b) | what Windows logs for a suspend (H6) is unchecked | owner: run the H6 check |
| Do timers count while the PC sleeps (H7 b) | not in HARNESS-FACTS | owner: one measured suspend |
| Alert reach (a toast from a scheduled task; branch A) | unverified | owner |
| The dead-man is itself a program start; the task can be missing or disabled | common mode; only a status anomaly shows a missing task | owner (an alert channel off this PC) |
| A child that imitates activity | since rev 4 the age cap only asks | coordinator or owner, per task |
| A healthy operation longer than its kind's deadline (D5 in FX-W6 branch B1) | the ping was withdrawn | owner: B1 or B2 |
| Every flag denial rests on the hook (H2 believed) | not observed | owner (observe one denial) |
| Helpers started through the coordinator's Agent tool (checker, mapper) | their profiles were not read | next reader |
| The content of the flag allow-list | new, not attacked | implementer, one targeted check |
| The `stuck` alert takes about 4.75 h | bounded by the FX-W5 cap | owner (stated in R6) |
| The 10 s process query times out under load | makes the L1 hard-kill row more frequent | owner, with L1/L2 |
| The script cannot know which status.json the model read | limit of a file interface | accepted (FIX-wake) |
| G6: a `plan/` Write in flight across a raise | needs the write itself fenced; no small change | open (FIX-fence §10) |
| PROBE 6: a harness that lets a timed-out hook's tool run | harness side unknown | a probe |
| PROBE 7(b): `session_id` changes on compaction | no stable identity | a probe |
| PROBE 1(c): coordinator helpers with their own ids | protocol choice | owner |
| N8 / PROBE 10(a): a close "success" that is not a stop | harness semantics | a probe |
| N4 / PROBE 10(b) false: every crashed child goes to the owner | the stated trade | owner accepts or not |
| N10: helper transcripts counted as sessions | PROBE 1 | a probe |
| H2: a dead watcher freezes the start lease | FX-W4 only alerts; the join adds a restart act and `runs_no_watcher` (not attacked); under L1 with the list down it stays open by design. The model's join check (i) holds in one field with the list known (point 5; final pass, no review verdict); the omitted act cannot be expressed | owner (L1/L2); the join's choice |
| P3: the table test does not cross the log state, the manifest or `verify_rounds` | outside rev 4 | next design pass |
| P4: an old watcher keeps the old planner after an upgrade | outside rev 4; options: exit on a `tcb_commit` change, or an upgrade requires a raise | owner or next design pass |
| P5: no owner supersede path for a refused fence-pending row | unreachable without an owner act; a hand edit resolves it | accepted or next pass |
| `predictFence` and `lib.fence` are two copies of one rule set | outside rev 4 | next design pass (one function or an agreement test) |
| FX-W6 branch B2: what shows a fence false | after FX-OUT a fenced attempt cannot land a READY, so the obvious evidence is gone | owner (evidence rule), if B2 |
| The model's own gaps for R57 (`FIDELITY-3.md` section 7). Closed later in this round behind flags: the held stop verify, the status.json snapshot, `gp` across a restart (on only in FXW-ALL). Still open: host class from `bn`; the "process line matches" reading; `tickEnabled`; admission on true liveness in the wake configurations; endturn without a list; a complete as-built configuration | model work not done in this round | coordinator (next modelling round) |
| The process list taken before the lock (S:198-205) is not modelled | inferred to cost one superseded alarm | modeller |
| No liveness verdict for AB-ALL or AB-WAKE-ALL whole | they do not fit 400 MB | owner (memory) |

Added by the ablations, revision 5 and parts 2 and 3 of the review (none of the revision 5 changes was
attacked; the final-pass results have no review verdict):

| Item | Why it is open | Whose decision |
|---|---|---|
| FX-W4's re-alert pace | once-per-onset fails at one fault (FXW-4: NoDeadlock 8); the re-alert holds in the model; the pace is untimed there | owner: P1 or P2 (`FIX-wake.md` N1) |
| A coordinator that omits endturn anyway | "every turn ends with endturn" is a rule of the brief only; it holds in the model for a coordinator that follows it (`final/N2-FN-N2.json`) | owner: E1 or E2 (`FIX-wake.md` N2; E2 is new and unchecked) |
| Premise (b) under S2: every turn shorter than 0.5 × `alarm_ms` (30 min) | unmeasured | probe (the longest recorded coordinator turn), then the owner: slot 2's period to 2 × `alarm_ms`, or "not covered" |
| Premises (a) and (c) | stated; each fails only toward the safe side (an unconfirmed turn; a spurious alert) | stated (`FIX-wake.md` N3) |
| FX-W6 holds only under B1, by construction | the bound "a healthy operation of kind k ends within its deadline" is a premise about the environment that the watcher does not compute | owner (B1 or B2), and a measurement |
| Branch Q5b | BOUNDED; NoDeadlock 15 on an INFERRED step; the Slots 13 "artefact" not shown (no run with AB_STOP_HELD and AB_SLOTCOUNT) | owner (Q5) |
| Lease reading (ii) | Slots 8 fault-free when the transcript lag has no bound; revision 5 restates the assumption ("claim or visible transcript within the lease") and adds `--if-unclaimed` for the charge | PROBE 5 (lag and time to the first tool call); owner only if no bound: "Slots eventually" or a longer lease |
| The pre-claim stall | the model forbids it while FX_CLAIM is on (MF:1144); revision 5 point 2 (a) is the check; not run | modeller |
| FX-CLAIM revision 5 point 2 and the `close-session` act | designed, not attacked, not modelled | modeller (one targeted check each) |
| The hand-over exit 2 under u with no FX-W4 | FXW-5 and FXW-6 fail four liveness properties by it (CEX-wake 4.7); FX-W4 and the endturn rule cover it, together only in the model's parts | coordinator: a joint run with the final design |
| The hard kill (p6) | FX-W1 and FX-W2 do not cover it by design: NoSilenceAfterFirstCall 2 (S1), 1 (S2); FX-W4 recovers liveness | owner (L1 or L2) |
| FX-W3 and FX-W7 in the model | not expressible without new mechanism (a fault that skips the arm calls; a split tick under a hung run lock) | coordinator (next modelling round) |
| The join's hook order and the omitted restart act | not expressible (FX-W3 not modelled; endturn restarts the watcher in the model) | coordinator |
| No complete joint run; FXW-ALL is shallow and predates the final design | BOUNDED at 2.58 M states, levels 0-13 | coordinator, memory |
| The fidelity review of the final pass | the review ended at 21:17; the final pass wrote 21:17-21:24 | coordinator |
| The fence results without a hash | the 40 FX-CLAIM parts at 1500 MB, the ablations, the sub-flag runs and Q5b were not re-run on the final model | coordinator (a rerun), or accepted as inferred |
| NoChargeWithoutFault is weaker than its rule | it reads "no fault anywhere yet", not "no fault in this attempt" | no source names one; inferred: the modeller, with a per-attempt form |
| FX-W5 masked in its whole run | its liveness is shown in one part only | no source names one; inferred: a run with FX-W4 on |

**9. What needs the owner.**

*The six questions of section 16 point 9* (the ruling table, today at lines 1233-1240), as far as they
bear on a fix (`notes/r3-changes.md` section 7):

| Question | Fixes it touches | Branch (a) | Branch (b) |
|---|---|---|---|
| U3-F8: is the mapper a task role or a helper? | none directly; FIX-wake's open row on the helpers' profiles is related | drop the mapper from the coordinator's agent types | a second profile anchored at the root |
| U2-F2: are harvested cards URL-checked? | none | commit checks them | the witness stays the backstop |
| U5-PF-1: which file is the draft whose hash the owner line records? | none (FX-CGATE's owner act `closed` is a different owner line) | a fixed path per subject | `status owner --file` |
| LR-4: should status report an unreadable lock? | related to FX-W7 and FX-W4 (stuck run lock); RL-yes/RL-no is the nearby choice | a lock-unreadable anomaly | none; the library breaks it after about 30 s |
| Coordinator session tools (Q5) | FX-CGATE, FX-CLOSE, FX-PLAN, FX-CLAIM; and D3 is real only in Q5a | Q5a: the tools are allowed; the coordinator hook gates start and stop (FX-CGATE steps 4-6); a profile key `session_tools` (new in the join) | Q5b: the tools stay refused; FX-PLAN answers `owner` for start and stop; the owner starts sessions by hand |
| M6 library half (Q6) | FX-OUT | the log check moves into `lib.fence`; replace.mjs:473-477 goes | replace runs steps 1-5 itself before `lib.fence`; the same behaviour |

*Property and design choices the fixes leave to the owner* (FIX-wake "Owner branches"; FIX-fence §3,
§10, §12):

| Choice | Fixes | Branch 1 | Branch 2 |
|---|---|---|---|
| L1 / L2 | FX-W1, FX-W7, FX-W2 | L1: no lease; a hard kill under u stays open; R5 unchanged | L2: leases (`lease_ms`, `beat_ms`, `watcher_lease_ticks`); R5 amended to read wall time while the list cannot answer |
| S1 / S2 | FX-W2 | one alarm slot; a death right after an alarm wake leaves no source (FX-W4 covers it) | two slots, the second with period 1.5 × `alarm_ms` |
| B1 / B2 (FX-W6) | FX-W6 | a stated bound per kind and for the age cap | one refund per task; RestartLimit restated as R + 1 |
| R1 / R2 | FX-W5 | re-raise act-due while its condition holds | as built |
| RL-yes / RL-no | FX-W7 | a run-lock lease while the list is unknown | none; FX-W4 alerts in both |
| H4 A / B | FX-W4 | an app-level scheduled session messages the coordinator | a toast |
| Exit 2 of endturn: B1 / B2 (CEX-wake's names) | wake model | start both sources anyway: removes the p3b silence, feeds D1 sooner | start nothing: the p3b silence (WakeSourceAlive 4) |
| Late session past the lease (F schedule 10) | FX-CLAIM | Slots as an invariant: needs every started session to claim or show its transcript within the lease (revision 5's wording; PROBE 5 measures both delays) | Slots "eventually within N_max", or a longer lease; asked only if PROBE 5 finds no bound (`FIX-fence.md` point 2) |
| WakeSourceAlive on a first turn | R6 wording | restate "both sources" | accept that one fault silences a first turn |
| The pace of the repeated alert (new in revision 5, N1) | FX-W4 | P1, constant: `realert_runs` = 6, every 30 min | P2, backoff: 6, 12, 24 runs, then capped at 24 (every 2 h). Both give liveness in the model, which is untimed; P2 nags less and waits longer |
| A coordinator that omits endturn (new in revision 5, N2) | FX-W3's brief rule, FIX-JOIN 2b | E1, brief only: FX-W4's next alert recovers the omission; silence until then (5-10 min with WakeToRun) | E2, brief plus a backstop: an alarm whose period ends while a turn of its ce is open defers its exit once, by one more `alarm_ms`. A new mechanism; it changes premise (b) and needs its own check before adoption; not modelled |
| Slot 2's period under S2, if a turn can exceed 30 min (revision 5, N3) | FX-W2 | slot 2's period rises to 2 × `alarm_ms` | the case is stated as not covered |

The model's results bear on the first two new rows but do not decide them: the re-alert holds in
the model whatever its pace (`final/N1-FXW-4R.json`), and the endturn rule holds for a coordinator that
follows it (`final/N2-FN-N2.json`); E2 was not modelled. Both runs are of the final pass and have no
review verdict.

Inferred, not stated in any source: the join's R6-b ("on unknown it starts nothing") takes the
start-nothing branch for the watcher, and FX-W1's markers make an exited alarm "dead", which removes
the p3b case. The model ran both exit-2 branches with the fixes on: no verdict changed in the complete
parts, and B1 does not remove the 9-step silence (`fixes-wake/FXW-4R-B1-parts.json`; point 5). What
removes it is S2 or the endturn rule. So the model does not settle CEX-wake's exit-2 question; it is
still the owner's.

Q5 and the lease reading also gained model evidence (point 5): Q5a holds in its configuration; Q5b
is BOUNDED with a liveness failure on an INFERRED step; lease reading (ii) fails Slots with no fault.
None of these is a ruling.

*Harness facts to probe before anything is built* (`notes/r3-changes.md` section 2; FIX-fence §9;
FIX-wake top table; FIDELITY-3 section 3):

| Probe | What it settles |
|---|---|
| PreToolUse input carries `session_id`; its format; whether helpers share it; where helper transcripts live (PROBE 1) | FX-CLAIM and FX-CGATE cannot be built without it |
| The Write input carries the full `content` (PROBE 2) | FX-OUT's hook half |
| A helper's tool calls run the attempt's hook (PROBE 3) | FX-OUT; also one of the three app checks the owner kept (section 16 point 12, cut 3) |
| The session tools' input names the folder or the target (PROBE 4) | FX-CGATE steps 4-6 |
| The delay from a session start to its first transcript record with a cwd, and to its first tool call (PROBE 5; the second delay added in revision 5) | how often D4b happens; the FX-CLAIM lease; whether Slots is an invariant |
| The longest coordinator turn in the recorded transcripts (revision 5, N3; read-only) | premise (b) under S2 |
| What the harness does with a hook that times out (PROBE 6) | whether a READY can land with no slot |
| `session_id` survives compaction and resume (PROBE 7) | FX-CLAIM, FX-CGATE |
| The input carries `tool_use_id`; duplicate hook entries (PROBE 8) | FX-CGATE step 4 |
| Matcher `*` runs the hook for every tool, MCP tools included (PROBE 9) | every hook-based fix |
| PostToolUse for the session-stop tool: does success mean gone; is "no such session" distinct (PROBE 10) | FX-CLOSE, FX-CGATE |
| Does a deny win when several hooks answer (PROBE 11) | not needed for the FX-CGATE + FX-W3 pair (one hook entry, join point 9) |
| Hard links in `run/` and `wt/` (PROBE 12) | 0b; `selftest` answers it at run time |
| A hook denial observed once (H2) | every flag and arm denial |
| A Node `setTimeout` across a Windows suspend (H7 b; CONTRACT §7 item 6) | M5 timer branch, FX-W4 timing |
| What Windows logs for a suspend (H6) | a reader for the M5 gap |
| A toast from a scheduled task shows (branch B) | FX-W4 alert reach |

The owner's ruling kept only three app checks before the pilot (section 16 point 12, cut 3). The fix
designs ask for the probes above before the build. That is a tension the owner should settle: either
these probes count as design checks before the build, or the fixes that lean on them wait.

**10. Rule R57.**

R57 says: "A counterexample blocks the change", and "Current verdict: blocked, until the extended
model holds" (protocol, lines 538-540 today). **It does not lift in this round.** Two reasons, each
enough alone, and a third that bears on the fixes:

- The scripts are unchanged. No fix of this round is in `tcb/`, so the protocol that would run is the
  one the counterexamples describe.
- The counterexamples are real. With the mechanisms as built, the design with the six fixes M1 to M6
  fails ReadyNotDiscarded, Slots, OneSessionPerAttempt, AlwaysCanResolve, EventuallyResolves,
  NoDeadlock, NoFalseSuspicion and the new wake properties (point 3), and the fidelity review walks
  them against the scripts.
- Even for the designed fixes, the model's evidence is partial: no complete joint run, FX-W4 as
  designed failing at one fault, Q5b open, and three fixes not modelled (point 5).

**Where the model stands at the end of the round.**

- **Modelled as built:** the eight mechanisms of the charter, each with a counterexample that walks
  against the scripts (point 2, point 3). Two of part 1's gaps were closed later behind flags: the
  held stop verify (`AB_STOP_HELD`) and the stale coordinator's status.json snapshot
  (`AB_STALE_SNAPSHOT`); a third, `gp` across a restart (`AB_GP_RESTART`), only in the joint run. With
  the held verify, D7-SLOTS's failure is gone (an artefact), and D3 fails in its real, longer form.
- **Still a gap** (review sections 15.4 and 16): `tickEnabled` timeliness (gap 1; the B1 premise under
  FX-W6); the process-line reading (gap 4); host class from `bn` (gap 5); admission on true liveness
  and session existence in every wake configuration but the joint run (gap 9); endturn without a list
  (gap 11); M1's token, M2 (no fault o in a wake part), M3's merged start and bind; D6 p1. "A complete
  as-built configuration: still none."
- **No complete run of the joint as-built model exists**, with or without fixes. AB-ALL stopped
  BOUNDED at 2,858,368 states (`asbuilt-wake/AB-ALL.json`); FXW-ALL, with 10 of 13 fixes, stopped
  BOUNDED at 2,579,912, BFS levels 0-13, and predates the final design (point 5). A complete AB-ALL is
  estimated at about 110 million states (about 16 GB) or, at the slower decay seen, billions
  (`CEX-wake.md` section 6, a coarse extrapolation).
- **The fixes are designs. No script changed** in this round (`done/r3-fix-fence-5.json` and `r3-fix-wake-5.json`: no
  script changed; `ABLATION-wake.md`: "The fixes are designs; no script changed"; `FIX-wake.md`: "No
  script was changed").
- **What the model shows of the fixes:** each modelled fix holds in its own configuration, complete
  for the fence fixes and the whole FX-W5 and FX-W6 runs, in five parts for FX-W1, W2 and W4; the
  review relies on most of them only with a stated limit (point 5). FX-W4 as designed failed at one
  fault, and revision 5's re-alert holds in the model. FX-OUT's liveness was later shown with FX-CLOSE
  (complete at K2), and FX-CLAIM's orphan rule and the endturn rule hold in their parts; none of these
  three final-pass results has a review verdict, and none was attacked.

What would lift it, from the records. Items 1 to 7 restate the review's closing list (`FIDELITY-3.md`
section 16) and the modeller's open lists, updated for the final pass; items 8 and 9 are inferred from
R57's text and section 16 point 12, not stated by a helper.

1. **The fixes built** into the scripts, specs and briefs (`notes/r3-changes.md`), with revision 5's
   changes, and the probes of point 9 answered (PROBE 5 with its second delay; the longest turn).
2. **Joint complete runs.** The review asks for FX-OUT with FX-CLOSE (now done at K2 for that pair,
   `final/FN-OUT-CLOSE-K2.json`, not reviewed) and the wake fixes with the fence hand-over (not done).
   The review says split by mechanism, not by fault parts (a pace question, not a scope cut).
3. **The pre-claim stall allowed and step 7 counting dead sessions.** Step 7 is done in one part
   (`final/FN-R5*.json`, not reviewed); the stall is not (revision 5 point 2's checks were not run).
4. **Endturn after the hand-over's exit 2** (done in the model: `final/N2-FN-N2.json`, not reviewed) and the owner's
   choice of E1 or E2 for a coordinator that omits it.
5. **The owner's re-alert ruling**, P1 or P2.
6. **Premises (a), (b), (c), the B1 bound and PROBE 5 stated in the design and measured** (revision 5
   states them; none is measured).
7. **Part-1 gaps 1, 4, 5 and 11 closed** in the model, and FX-W3 and FX-W7 made expressible (both need
   new mechanism: `ABLATION-wake.md` F1).
8. **A run with everything as built and all fixes on that fails nothing** except what the owner
   accepts by name as open by design (point 8), complete, not BOUNDED; and each fix's ablation failing
   a property (point 5 has nine plus FX-W5's recorded one).
9. **The fault budget.** R57's text asks for 4 events (line 538); the owner's ruling runs 2. Which one
   R57 now means is for the owner to say; section 16 point 12 already narrows R57's "full run" to the
   sizes where the fixes act.

Not in the review's list but in the records: a fidelity review of the final pass, and a rerun on the
final model of the fence results that carry no hash (the 40 FX-CLAIM parts, the ablations, Q5b).

**11. What was deliberately not run.**

Collected from every return of this round. "Owner may" says whether the cut can stand without his
word: "stands" where the source gives a reason that no decision waits on it; "owner's call" where the
result could change what happens next.

| Not run | Who | Reason given | Owner may |
|---|---|---|---|
| Three-fault runs of the changed mechanisms (and R = 2, three fields) | asbuilt-fence, asbuilt-wake, fix-wake-4 | the ruling; every failure here needs at most two faults; memory | owner's call (R57's text says 4 events) |
| A complete run of the joint as-built model (AB-ALL), whole or by parts | asbuilt-wake | estimated about 110 M states or more; a part is as large as the whole | owner's call (no R57 lift without it) |
| A further attack round: the last changes of revision 4 (FX-OUT, FX-CGATE, FX-CLOSE, FX-PLAN, FX-W1, FX-W3, FX-W4, FX-W6, FX-W7) and five choices of the join were not attacked | charter (ruling), FIX-wake, FIX-JOIN | the ruling: no further full round; one targeted check per change | owner's call |
| AB-SLOTCOUNT alone | asbuilt-fence | AB-COMMIT-CLOSE includes it and reproduces the D4c traces | stands |
| AB-HANDOVER-NOKILL alone | asbuilt-fence | AB-START-UNFENCED shows D3 without it | stands |
| AB-PROCLIST alone | asbuilt-fence | its traces name it; one is an artefact | stands |
| Parts runs of every fence configuration | asbuilt-fence | parts are BOUNDED at 400 MB too; 30-50 min each | stands |
| AB-FENCE-ALL with a fair process-list recovery | asbuilt-fence | D4c already breaks liveness (inferred) | stands |
| A-WX with AB_NO_COMMIT_RECONCILE | asbuilt-fence | answered earlier (RV-WX-ONLY fails in 6) | stands |
| The single-flag matrix beyond AB-W-PAUSE-GAP and AB-W-ACT-DUE | asbuilt-wake | every trace names its mechanism | stands |
| Liveness of whole AB-WAKE-ALL and AB-ALL | asbuilt-wake | needs about 104-113 MB more than 400 MB leaves | owner's call (memory) |
| AB-WAKE-ALL-B1 whole and its other parts | asbuilt-wake | only part k=1,u=1 differs between B1 and B2 | stands |
| The other maximal parts of AB-WAKE-ALL | asbuilt-wake | would reproduce traces already found | stands |
| A forced process-list recovery | asbuilt-wake | would show only the D1 chain draining | stands |
| D7-STALE with two faults | asbuilt-wake | the one-fault run is complete and fails at 4 | stands |
| Every model run and trace print in the review | fidelity-3a | traces read from the result files | stands |
| AB-START-UNFENCED with a status.json snapshot | fidelity-3a | D3 is real in a longer form either way | stands |
| A run with z keeping `stop-requested` | fidelity-3a | changes liveness only; no as-built liveness fits 400 MB | owner's call (part of R57 item 2) |
| The "process line matches" slot reading | fidelity-3a | listed as a model fix | owner's call (part of R57 item 2) |
| Schedule W4 with an extra suspend `sp`; W15 with B2's second episode | fix-wake-4 | three faults | stands under the ruling |
| Every "each flag alone" matrix | fix-wake-4 | the ruling | stands |
| The join's two targeted checks | fix-join | left to the modeller | run in the final pass where expressible (point 5; no review verdict) |
| Any Node command | changes, fix-join, fix-fence-5, fix-wake-5, writeup | text-only tasks | stands |
| **Fence fixes** (`ABLATION-fence.md`; `done/r3-fixes-fence.json`) | | | |
| FX-CLAIM-II-X (the ablation of reading ii) | fixes-fence | reading (ii) already fails | stands |
| FX-PLAN-X and FX-PLAN-NOSTARTWAIT over all 43 parts | fixes-fence | one failing complete part is the ablation's verdict | stands |
| FX-CGATE-X, FX-OUT-X, FX-CLAIM-X and FX-CLAIM-II above 400 MB; FX-OUT without FX-PLAN above 400 MB | fixes-fence | a real safety trace already fails at 400 MB | stands |
| The joint run of all fence fixes; AB_STOP_HELD added to C_OUT or C_CGATE | fixes-fence | memory | owner's call (the liveness "holds" of FX-OUT and FX-CGATE stay optimistic; FX-OUT with FX-CLOSE was later run, point 5) |
| Three-fault runs | fixes-fence | the ruling | stands under the ruling |
| The rest of Q5b (2 parts not run; 8 BOUNDED) | fixes-fence | memory and time | owner's call (Q5b stays open) |
| AB-START-UNFENCED-SNAP without FX_PROPS | fixes-fence | not needed for a verdict (as listed) | stands |
| **Wake fixes** (`ABLATION-wake.md` sections 7 and F5; `done/r3-fixes-wake.json`, `r3-fixes-final.json`) | | | |
| FX-W3 and FX-W7: no model, no ablation, no branch | fixes-wake, fixes-final | first the budget, then "not expressible" without new mechanism | owner's call (two of thirteen fixes have no model evidence) |
| Branches L2, B2 (FX-W6 refund), RL, R2 as a fix; sub-flags FIX_FLAG_ALLOWLIST, FIX_MARKER_PRUNE, FIX_UNARMED_REC; E2; FIX_NOWATCHER_ALERT | fixes-wake, fixes-final | not modelled, or not expressible | owner's call for L2 and E2 (open choices); stands for the rest |
| Whole FXW-4 and FXW-4R beyond the one BOUNDED run at 3000 MB | fixes-wake | 23.2 M states and not completing; the five maximal parts instead | stands (a pace question) |
| FXW-4R-B1's three BOUNDED parts and FXW-4R-S2's part k=2,u=1,x=1 at more memory | fixes-wake | memory | stands |
| FXW-ALL above 400 MB | fixes-wake, fidelity-3c | "a larger run would only raise the bound" | owner's call (the joint run is shallow: levels 0-13) |
| W15 with FX-W6 | fixes-wake | its verdict is known (fails in branch b) | stands |
| FIX_DEADMAN with the hard kill off | fixes-wake | the FX-W4 gap does not need it | stands |
| FX-W5 or FX-W6 with FX-W4 outside FXW-ALL | fixes-wake | not stated beyond the list | owner's call (FX-W5's liveness is masked without it) |
| FN-JOIN-WSTART with two fields above 3000 MB | fixes-final | BOUNDED; the one-field run decides the schedule | stands |
| FN-OUT-CLOSE-X at two faults | fixes-final | the one-fault failure is the ablation's verdict | stands |
| FIX-fence revision 5 point 2 checks (a) and (b); the `close-session` act | fixes-final | not asked in the final pass | owner's call (they test the timing assumption behind Slots) |
| **Fidelity review, parts 2 and 3** (`FIDELITY-3.md` sections 14 and 15.7) | | | |
| A repeat of one recorded fence run on the frozen file | fidelity-3b | its brief allowed trace prints only; recommended to the modeller | done since for the four "holds" (provenance rerun); not for the rest |
| FX-CLAIM with a pre-claim stall allowed; step 7 counting dead folder sessions | fidelity-3b | both need model edits | step 7 done since (FN-R5; final pass, no review verdict); the stall owner's call |
| Q5b with AB_STOP_HELD and AB_SLOTCOUNT | fidelity-3b | Q5b stays open either way | stands |
| Any trace print through the lane | fidelity-3b | every trace was in the result files | stands |
| FXW-4R with endturn after the hand-over's exit 2 | fidelity-3c | needs a model edit | done since (`final/N2-FN-N2.json`; final pass, no review verdict) |
| FX-W6 with its first-tick change alone | fidelity-3c | changes no verdict: B1 carries the "holds" | stands |
| **Revision 5 designers** | | | |
| Any model run; the probe of the longest coordinator turn; E2 before a ruling | fix-wake-5 | the modeller's work; the probe decides only premise (b) under S2; E2 is new | owner's call for the probe (premise (b)) |
| Any model run | fix-fence-5 | text-only | stands |
| A fidelity review of the final pass | (no helper) | it came after the review | owner's call (three results with no review verdict) |

**12. Disagreements in the records.**

1. **D3.** `CEX-fence.md` and `done/r3-asbuilt-fence.json` call D3 real with traces of 7 and 8 steps.
   The review (`FIDELITY-3.md` section 3) calls those traces artefacts: the stale coordinator can read
   only status.json, which does not show the admission; D3 is real only in a longer form.
   StaleWrites 8 in AB-ALL is the same trace. **Since settled:** the longer form ran as FX-CGATE's
   ablation with the snapshot read (TwoCoordinatorsAct 7, `fixes-fence/FX-CGATE-X.json`), and the
   review calls that rerun honest (section 10). The 7- and 8-step traces of `asbuilt-fence/` stay
   artefacts.
2. **D7-SLOTS.** `CEX-wake.md` section 5 gives SlotsProc and SlotsR10 failing in 7 as the place where
   the new form fails (noting, inferred, that lib.slotCount would count the stop). The review calls
   the trace an artefact as built (it needs z → stopped). **Since settled:** with the held stop verify
   both forms hold (`fixes-fence/D7-SLOTS-HELD-1500.json`, complete, 3,093,274 states). So the new
   Slots forms have no failure that is as built.
3. **OneSessionPerAttempt 5 (D4b).** The trace's wake is a crash note. The review says HARNESS-FACTS 1
   promises a note only at a turn end, and prefers the 6-step alarm form.
4. **Time of the owner's ruling.** The charter says about 17:45, section 16 point 12 about 17:50. The
   third attack passes were last written at 17:44 (fence) and 17:48 (wake). The records do not say
   whether the third passes were started before or after the ruling. Section 16 point 12 records cut 2
   as "one round per fix; another only for a finding that would break it"; this round ran three
   passes per group.
5. **The H2 dependency.** FIX-fence (rev 4) says FX-CLAIM's lease depends on "the wake group's
   dead-man fix". FX-W4 only alerts and cannot restart a watcher (`notes/r3-changes.md` section 10
   item 1). FIX-JOIN point 1 closes the gap with a restart act and `runs_no_watcher`, both new in the
   join and not attacked; under L1 with the list down it stays open by design. The model's join check
   (i) holds in one field with the list known (`final/FN-JOIN-WSTART-1F.json`; final pass, no review
   verdict), but the restart there
   is endturn's, and a turn that omits the restart cannot be expressed. So the model does not test the
   join's restart act itself.
6. **The names B1 and B2** mean two different things: in `CEX-wake.md` the two answers to endturn's
   exit 2 (start both sources, or start nothing); in `FIX-wake.md` the two branches of FX-W6 (a stated
   bound, or a refund). This draft names them apart.
7. **Line numbers of the protocol document.** FIX-JOIN gives R6's bound at 127-128; the document has
   it at 134-135 today (the review cites 134-135). Section 16 point 2's R6 rows cite 126-129; the text
   is at 130-133 today. The charter gives point 9 as 1168-1202 and `notes/r3-changes.md` as 1187-1194;
   the ruling table is at 1233-1240 today. The document grew; the texts are the same.
8. **R29's proposed sentence** keeps `node tcb/scripts/*`. The build is flat, `tcb/<name>.mjs`
   (section 16 point 1). The sentence should say what the hook matches.
9. **D5's trace length in section 16 point 2.** Its open-defects list says NoFalseSuspicion fails
   "within 4 steps"; the fidelity bullet of the same point says 6; point 11 and `model/results/DIGEST.md`
   give 6 (8 at four faults). As built this round: 6 to 8.
10. **FX-OUT's liveness.** The review (section 9.1 a) reads the commit's oracle close as hiding "new
    behaviour the fix brings": after its ready slot a child may still run. `FIX-fence.md` revision 5
    point 3 calls it "a model reading only": the child is inert after commit (guard-hook.mjs:406-407)
    and FX-PLAN step 3 with FX-CLOSE closes it, by design. Both agree FX-OUT's liveness needs FX-CLOSE.
    The final pass ran that pair with no oracle: every property holds at K2
    (`final/FN-OUT-CLOSE-K2.json`). That run supports the design's reading; the review has not seen
    it.
11. **The first FX-CLAIM `r` part.** `ABLATION-fence.md` section 1 gives it as 17.3 M states; the file
    and the provenance rerun give 11,799,897 (review section 9.2). The sum "about 148 M" does not carry
    the misquote: the 40 complete parts of `FX-CLAIM-parts.json` and the three `r` parts of
    `FX-CLAIM-rparts-3000.json` add to 148.4 M (checked by the reader).
12. **Why FX-W3 and FX-W7 are not modelled.** `ABLATION-wake.md` section 1 says "budget, priority
    order"; its final pass (F1) says they cannot be expressed in this model without new mechanism.
    Both are in the same file; the second is the later and stronger reason.
13. **W4 (a hard kill under u, L1).** `ABLATION-wake.md` section 5 says it is covered by FXW-4 and
    expected to fail; section 3 says that with L2 not modelled, W4 is "not shown either way". The
    result files support the second: no failing trace combines a hard kill with u (point 5, schedules).
14. **Node outside the lane.** Settled: four returns name one (`sem-wake`, `asbuilt-wake`, `fixes-wake`,
    `fixes-final`; point 1), and the last two are the same helper (MB2b) in two tasks, so three helpers
    in four tasks, as the coordinator's brief says. None of these started a model run.
15. **The re-alert's pace in the model.** The modeller's candidate alerts again after two runs (the
    review: "every 2 runs = 10 min", section 15.5); revision 5's P1 is every 6 runs (30 min), P2 a
    backoff to 24. The model is untimed, so the verdict carries over (`FIX-wake.md` N1: "P1 and P2 are
    one model"), but the reviewed form is not the designed pace.
16. **Schedule 3 of FIX-fence.** The design table names NoBusyLoop as what fails when FX-PLAN's
    STARTWAIT is off; the model fails AlwaysCanResolve (4 steps) and NoBusyLoop holds, because the loop
    is paced by watcher ticks. The review agrees with the modeller (section 9.5).
17. **FX-W4's failing part.** `ABLATION-wake.md` section 1 gives NoDeadlock 8 and AlwaysCanResolve 7
    for FXW-4; the review says the trace it read is in part k=1,x=1 and "F 8 is in another part"
    (section 15.5); the final pass reports NoDeadlock 8 and AlwaysCanResolve 7 in part k=1,x=1 itself
    (`final/N1-FXW-4.json`; no review verdict). The final pass's file is the latest record; the
    earlier `fixes-wake/FXW-4-parts.json` also gives NoDeadlock 8 and AlwaysCanResolve 7 in part
    k=1,x=1.
18. **Tokens.** Settled by the coordinator: the modellers' figure is 1.29 million, not 1.39, so the rows
    add to about 6.82 million, which matches "about 6.8 million" (point 13).

Settled since the first pass, kept for the record: ABLATION-fence.md existed before the brief said it
would (first-pass item 10); it is used throughout this pass. The review's part-2 doubt about which
model file the fence results came from is settled for the four "holds" by the provenance rerun
(`ABLATION-wake.md` section 10; review section 15.6), not for the rest.

**13. Tokens used.**

From the coordinator, as the harness reported the helper runs. No money figures.

- **About 6.8 million tokens over 31 runs of 15 helpers**, up to the final modelling pass.

| Helpers | Tokens |
|---|---|
| designers | 2.42 million |
| refuters | 1.44 million |
| modellers | 1.29 million |
| the fidelity reviewer | 0.94 million |
| the join | 0.23 million |
| the change list | 0.15 million |
| the writer's first pass | 0.35 million |

The rows add to about 6.82 million (point 12, item 18). The grouping of runs into rows is the
coordinator's.

- **After the final modelling pass:** the change list's second pass (0.25 million) and the writer's
  second pass (0.30 million), together about 7.37 million before the reader's check, which is not
  counted.
- **The coordinator's own tokens and the week's usage** are in the coordinator's report, not here.

**14. Reader's check** (helper K, `writeup-check`; text only, no Node).

- Checked about 190 claims: every state count, trace length, completeness and memory figure of points 2, 3, 5 and 6 against the result files (`asbuilt-*`, `fixes-*`, `provenance`, `final`); the verdict words against `FIDELITY-3.md` sections 0, 3, 9, 15-16, `ABLATION-fence.md`, `ABLATION-wake.md`; the times against the files; R57's text (protocol lines 538-540); the four Node returns.
- Corrected 13 (was, now, source):
  1. modellers 1.39 M, rows 6.92 M -> 1.29 M, 6.82 M; then 0.25 + 0.30 M -> about 7.37 M (coordinator).
  2. "brief says three, returns name four" -> three helpers in four tasks (`done/r3-fixes-wake.json`, `r3-fixes-final.json`: both MB2b).
  3. FX-OUT at 400 MB cited `FX-OUT.json` -> that file is the run without FX-PLAN (`ABLATION-fence.md` section 1).
  4. FX-W1 "NoSilenceAfterFirstCall 2" -> 2 in three parts, 9 and 5 in the u parts, EventuallyResolves 10 and 11 (`FXW-4R-parts.json`).
  5. FXW-ALL "fence traces 15-17" -> 16-17, Q5b 15 (`FIDELITY-3.md` 15.5).
  6. W4: "see item 16" -> item 13, and settled for "not shown either way" (`FXW-4R-parts.json`, `FXW-4-parts.json`).
  7. D7-COMMIT-NOFENCE lengths "not reported" -> NoStaleAccepted 8, AtMostOneCommit 6 (result file).
  8. Item 11 "sum not checked" -> 148.4 M from the files, no misquote in the sum.
  9. Stage times 17:46/17:51 and 18:52 given as file writes -> return times (files 20:51, 21:14, 21:17); change list 21:29.
  10. "provenance rerun on the final model" -> `d527b879`, not the final pass's `ceea34f3` (`ABLATION-wake.md` 10, "Final pass").
  11. "no review verdict" added at 17 uses of final-pass results (points 4-12).
  12. Revision 5 marked as the later text against FIX-JOIN (point 4; point 7 R6-c, R6-d).
  13. Item 17: `FXW-4-parts.json` also has NoDeadlock 8 / AlwaysCanResolve 7 in part k=1,x=1.
- Unconfirmed: the token figures and "31 runs of 15 helpers" (coordinator only); the rule sentences of point 7 other than R6-c (not compared word for word with FIX-JOIN part 3); the classical-design column; the protocol line numbers of point 12 item 7.
- Disagreements that remain: `FIDELITY-3.md` 15.5 ("F 8 is in another part") against both FXW-4 result files; `ABLATION-fence.md`'s 17.3 M for the first `r` part against the file (11.8 M); `FX-CGATE-Q5B-parts.json` also fails Slots 14 in the complete part k=2,cd=1,z=1, which no helper and neither file of this record reports; the S2 row's "liveness holds in both" while EventuallyResolves 10 (the u artefact) fails in both.
