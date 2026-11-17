# Draft: section 17 of the research-tree protocol (version 2)

Draft by helper R (`writeup`), 2026-11-17. It is not part of the protocol document. The coordinator
decides whether and how it goes in. Blocks marked `TO FILL` wait for files that are still to come.

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
| Design the fixes | F (`fix-fence` 1-4), W (`fix-wake` 1-4) | `FIX-fence.md`, `FIX-wake.md`, each at revision 4 | 17:46, 17:51 |
| Attack the fixes | `refute-fence` 1-3, `refute-wake` 1-3 | `REFUTE-fence*.md`, `REFUTE-wake*.md` | fence 17:26, 17:37, 17:44; wake 17:27, 17:40, 17:48 |
| Fidelity review, part 1 | V (`fidelity-3a`) | `FIDELITY-3.md`, `done/model-fidelity-3.json` | 18:52 |
| Change list | C (`changes`) | `notes/r3-changes.md` | - |
| Join the two designs | J (`fix-join`) | `FIX-JOIN.md` | 18:10 |
| Ablations | (to come) | `ABLATION-fence.md`, `ABLATION-wake.md` | `TO FILL` |
| Fidelity review, part 2 | V | (to come) | `TO FILL` |
| This record | R (`writeup`) | this draft, `inputs/model-findings-3.json` | - |

The times are the files' last-write times, read from the folder. They show when a file was last
written, not when its work began.

- **Three attack passes per group.** Each fix design was attacked three times (pass 1 on revision 1,
  pass 2 on revision 2, pass 3 on revision 3). Revision 4 answered pass 3. No pass read revision 4.
- **One fidelity review**, in two parts: part 1 on the mechanisms as built (done), part 2 on the
  modelled fixes (to come).
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

<!-- TO FILL: part 2 of the fidelity review (the modelled fixes). Add its verdict per fix model here,
and any change it makes to the table above. -->

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
  ignores R6.
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
(`REFUTE-fence-3.md` section 3, `REFUTE-wake-3.md` section 3); the status tables at the top of
`FIX-fence.md` and `FIX-wake.md` (revision 4) and `notes/r3-changes.md` section 1 say the same.

| Fix | Defects closed | Classical design borrowed | Verdict after pass 3 | Last change attacked? | Depends on |
|---|---|---|---|---|---|
| 0b strict hook write | N5, C9, O5/X5 as far as the hook controls | exclusive create with no fallback (part of FX-OUT, FX-CLAIM, FX-CGATE) | counted under those three | No (rev 3 primitive; H1 was its side effect) | PROBE 6, PROBE 12 |
| FX-OUT outcome log | D4a, a half-written READY, the M6 gap, N1 | test-and-set on write-once slots kept as a log (CORFU, the Paxos log) | stands with a change | No (rev 4: no slot and no tombstone without a manifest) | Q6 (same behaviour both ways); PROBE 2, 3, 6, 9 |
| FX-CLAIM one claim per attempt | D4b, the D3 child backstop, the RC gap, C1, C2/N7 | idempotency key checked at the server, a tombstone on the key, partial synchrony (a stated start-lag bound, a real-time timeout) | stands | Rev 3 change yes; rev 4 changed no step, only stated the dependency H2 | PROBE 1, 5, 7, 9; a live watcher (H2, see point 8) |
| FX-CGATE coordinator hook | D3, the coordinator's own retry, the CE gap for session tools and helpers, N2, N6 | fencing token checked at the resource; lease hand-over with a one-time nonce (Chubby's sequencer); input validation at a trust boundary | stands with a change | No (rev 4: "no such session" recorded as such) | Q5 (both branches); PROBE 1, 4, 6, 7, 8, 10 |
| FX-CLOSE release a finished child | D4c, N8 as a probe condition | close-then-verify on an observed close, driven by a supervisor's due-list (a lease was rejected) | stands with a change | No (rev 4: "no such session" counts only for this coordinator's own start or an empty list match) | Q5; PROBE 10; FX-CGATE; FX-PLAN |
| FX-REDO missing ledger line | a missing ledger line after a death | idempotent redo from the after-image (ARIES) | stands | Yes (rev 2, stands) | none; not modelled (tested through the fs seam) |
| FX-PLAN planner expectations | the planners' double start (status.mjs:542, watch.mjs:164); the committed/started `bind` loop (status.mjs:543); the Q5b wake loop (N9); N1 rest | controller expectations (Kubernetes `ControllerExpectations`) and a total transition table checked by test | stands with a change | No (rev 4: P1, P2). FX-PLAN was new in rev 3, so it was attacked once (pass 3) | Q5; the FX-CLAIM lease; FX-CGATE `start.json`; the FX-OUT log |
| FX-W1 tri-state liveness, exit markers, flag allow-list | D1 except a hard kill under L1; M1's superseded exits; endturn exit 2 hiding a dead alarm; reconcile exit 67; test-flag forgery | unreliable failure detector ("unknown" never read as "dead"); exit marker of the crash-recovery model; complete mediation of arguments | stands with a change | No (rev 4: allow-list, marker prune) | L1/L2; H2 (hook believed) |
| FX-W2 arm first, confirmed by a live slot | M2 window; D6 paths 2, 3, 4; B2.2, B2.3, B1.4 | the lost wake-up: register before testing, idempotent register; redundancy | stands | Yes (pass 3) | H1; S1/S2 |
| FX-W3 work needs a live confirmed arm | D2 (an enforcer for each act); B1.1, B1.2 | reference monitor (complete mediation, precondition computed by the trusted base) | stands with a change | No (rev 4: the alarm's `unarmed` record) | H2; FX-W1 markers; FX-W2 `turn.json` |
| FX-W4 dead-man check | D6 paths 1, 5, 6, 7; B3.2, B4.1, B4.5; B6.1's alert | watchdog outside the failure domain (dead-man's switch) | stands with a change | No (rev 4: reads `watcher-busy.json`; 3 of the last 5 runs) | H4 A/B; the owner's install; FX-W3, W5, W7 inputs |
| FX-W5 re-raise act-due | M3 gap; feeds B3.2's alert | at-least-once delivery with a visibility timeout and capped backoff | stands | Yes (pass 3) | R1/R2 |
| FX-W6 per-kind deadlines | D5 (slow call, waiting child, first tick of an epoch); B5.2 bounded; B5.3 | eventually perfect failure detector (◇P) under partial synchrony, per-operation deadlines and an overall deadline | stands with a change (pass 1 said "falls as written"; a reduced form stood from pass 2) | No (rev 4: the age cap asks, uncharged) | H5; B1/B2 |
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
  alert, and it is itself a program start (open).
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

The ablation that shows each fix is needed:

<!-- TO FILL: from ABLATION-fence.md and ABLATION-wake.md. Per fix: the main flag, its own
configuration, the result with the flag on (complete or BOUNDED, states), the ablation (property that
fails, steps, result file), and any sub-flag ablation run for a refuter finding. Mark a fix whose
ablation fails nothing as "not shown to be needed by the model". -->

**5. What the model says of the fixes.**

<!-- TO FILL: from ABLATION-fence.md, ABLATION-wake.md and part 2 of the fidelity review.
- The joint bounded run (everything as built, all fixes on): configuration, states, complete or
  BOUNDED, every property's verdict (BOUNDED = not refuted).
- Per fix: holds or fails in its own configuration; ablation result.
- The schedules expected to fail by design: F5 (P4 rollout), F6 (H2 watcher dead, a dependency),
  W4 in L1, W15 in timer branch b. Say whether each failed as expected.
- The join's two targeted checks (F6 with WATCHER_START and FIX_NOWATCHER_ALERT; JOIN_HOOK_ORDER off).
- Which fix models the fidelity review (part 2) calls as built, and what in them is still an oracle.
-->

**6. Defect D7: the weak properties.**

From `CEX-wake.md` section 5 and the review's section 5. The old forms are still checked beside the
new ones.

| Old property | Why weak | New form | Where the new form fails | What the review says |
|---|---|---|---|---|
| RestartLimit | reads the counter replace increments, so it cannot see a counter that is not kept | RestartLimitGhost: failure fences counted from the epochs (`gf`); no admission after more than R | D7-RESTART (mutation: counter frozen), complete, 2,628,513 states: fails in 17 steps; old form holds (`asbuilt-wake/D7-RESTART.json`) | says R8; can fail; `gf` is the model's own count at the fence site, independent of the mechanism |
| TwoCoordinatorsAct | restates the `--ce` fence | StaleWrites: a step of a stale coordinator changes the table or the sessions | D7-STALE (fence off, hand-over CAS, one fault), complete, 2,000,035: fails in 4; old form also 4. AB-ALL (BOUNDED): 8 (`D7-STALE.json`, `AB-ALL.json`) | stronger than R6's text (also forbids a session start); matches R57; the AB-ALL failure is the D3 artefact |
| A-FENCE-CE has no finite space | no fault, unbounded sessions | finite form: hand-over CAS plus a cap of 3 sessions per attempt | D7-STALE complete at 2,000,035 states; also Slots 12, OneSessionPerAttempt 12; EventuallyResolves 12 is an ablation artefact | (cap judged in its section 4: hides nothing for safety) |
| AtMostOneCommit | its mechanism (exclusive create) never exercised | CommitRecordStable: once COMMIT names an epoch it never names another | D7-COMMIT-NOFENCE (exclusive create off and epoch check off), BOUNDED, 2,911,018: fails in 13 (`D7-COMMIT-NOFENCE.json`). D7-COMMIT (exclusive create off, epochs compared), complete, 2,615,376: new form holds, old form fails in 6, a false positive (an identical rewrite) | says R14; fails only with both safeguards removed; exclusive create is still not shown load-bearing while the epoch check is there |
| Slots | excludes READY-but-alive children; weaker than R10 | SlotsProc (live processes ≤ N_max) and SlotsR10 (per attempt) | D7-SLOTS, complete, 2,727,196: both fail in 7; old Slots holds (`D7-SLOTS.json`) | the trace is an artefact as built (it needs z → stopped); D7_SLOTS was never run with the as-built close. The forms are untested on the as-built close |
| R5's loop rule never exercised | the loop fault never reaches LOOPS | LoopReported, with `D7_LOOPS` | D7-LOOPS (rule removed by mutation), BOUNDED, 2,910,546: fails in 8. D7-LOOPS-RULE (rule in place), BOUNDED, 2,910,399: not refuted | says R5; fails under the mutation; BOUNDED with the rule (not "holds") |

D7-COMMIT-NOFENCE also fails NoStaleAccepted and AtMostOneCommit (result file); no helper reports
their lengths.

Three properties are new with the wake group (not D7 forms). The review (section 5):

- **WakeSourceAlive** reads R6's bound with its amended clause, and counts a live child as a source
  (weaker than R6). On a first turn one fault silences the tree, so either R6's bound is broken by one
  fault or "both sources" must be restated: an owner wording question.
- **WakeChainBounded** (fewer than 3 superseding arms in a row) and **AlarmsBounded** (at most 2
  alarms per coordinator) are proxies with no rule text behind them. WakeChainBounded cannot tell D1's
  endless loop from three turns of one outage.

**7. Proposed rule sentences (proposals, not adopted).**

From `FIX-JOIN.md` part 3. Every row is marked **join** there: written in the join because neither
fix file proposes a sentence, and not attacked. Line numbers are the protocol document's as FIX-JOIN
gives them; point 12 notes one that is out of date.

| Rule | Present sentence (line) | Proposed sentence | Fix | Depends on a ruling? |
|---|---|---|---|---|
| R2 | "Every script that writes takes `--ce` and exits 64 on a stale one." (95-96) | "...; the coordinator's hook allows a session other than the one bound to the current ce (by the one-time nonce of the brief line) only Read, so a stale coordinator can neither start nor stop a session." | FX-CGATE | Q5 (start/stop clause only in Q5a); PROBE 1(c) |
| R3 | "`status.mjs --reconcile` runs at the start of every coordinator turn: a transcript on disk for the attempt folder means the start happened, so it is recorded." (106-107) | "...the attempt's claim (the first session to pass a tool call, recorded by the hook) means the start happened, so it is recorded with that session; a transcript is a second source, and any other session in the folder is an anomaly. A session start is recorded by the hook before it runs, and the planner does not order another start while that record's lease (ticks and wall time) runs." | FX-CLAIM, FX-CGATE, FX-PLAN | Q5 |
| R4 | (§16, line 957) "...and within δ on others, act-due (class 17) among them." | add: "An act-due whose condition still holds is raised again at a capped interval, and one raised three times at the cap is reported as stuck. The planner's act is one function shared with status; a row status gives to the owner raises nothing." | FX-W5, FX-PLAN | R1/R2 |
| R5 | (§16, line 947) "...No other counter of this rule reads elapsed wall time." and "Hang: h watcher ticks with no new call in any transcript of the attempt" (123) | L2 only: the lease sentence of `FIX-wake.md` ("No counter of this rule reads elapsed wall time, except when the process list cannot answer. ..."). Both branches: "Hang: a per-kind deadline in counted ticks, read from the transcript tail (a tool call: its timeout + 12; a background wait: 60; a model call: 10); an idle child and an attempt older than `attempt_max_ticks` raise an uncharged act-due, never a fence; the first tick of an epoch counts nothing." | FX-W1, FX-W7 (L2); FX-W6 | L1/L2; RL-yes/RL-no; B1/B2 |
| R6-a | (§16, line 949) "...exits 1 alarm-missing when no alarm of the current ce is known to live (...); the coordinator then starts the alarm before anything else." | "The coordinator's first call of every turn starts `watch.mjs --alarm --ensure` in the background, which registers an alarm only when no slot holds one that has not exited; its second is `status --reconcile`, which counts the slots holding an alarm with no exit marker that is alive or unknown, and records the turn as armed only if enough are." | FX-W2 (replaces M2's alarm-missing) | S1/S2 |
| R6-b | (§16, line 948) "...and exits 1 unless both sources run (2 proc-unavailable when it cannot tell)." | "...and reports each source alive, dead or unknown: exit 1 when any is dead, 2 only when none is dead and some is unknown. Every alarm writes an exit marker before it exits, so an alarm that fired or was superseded is dead, never unknown. On a dead watcher the coordinator starts a new one; on unknown it starts nothing." | FX-W1; join point 1 | L1/L2 |
| R6-c | (none) | add: "Acts that create work (a first fence, a start, a session start) need the turn to be armed: the confirmed slots hold alarms with no exit marker; revocations are never gated. On exit 75 the coordinator ends its turn and retries nothing. The coordinator brief lists these acts." | FX-W3 | none |
| R6-d | "The bound: a wake arrives while either source lives; if both wakes are lost, only the owner wakes the tree." (FIX-JOIN: 127-128; the document today: 134-135) | "The bound: a wake arrives while either source lives; a dead watcher is restarted at the next turn, within two alarm periods. A scheduled task outside the tree, which wakes the PC, alerts the owner when no alarm or no watcher lives, the process list keeps failing, an act-due is stuck (about 4.75 h), the run lock stays busy, or turns run unarmed; it cannot wake the coordinator." | FX-W4, FX-W3, join point 1 | H4 A/B; H7 a/b (a fact) |
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
| H2: a dead watcher freezes the start lease | FX-W4 only alerts; the join adds a restart act and `runs_no_watcher` (not attacked); under L1 with the list down it stays open by design | owner (L1/L2); the join's choice |
| P3: the table test does not cross the log state, the manifest or `verify_rounds` | outside rev 4 | next design pass |
| P4: an old watcher keeps the old planner after an upgrade | outside rev 4; options: exit on a `tcb_commit` change, or an upgrade requires a raise | owner or next design pass |
| P5: no owner supersede path for a refused fence-pending row | unreachable without an owner act; a hand edit resolves it | accepted or next pass |
| `predictFence` and `lib.fence` are two copies of one rule set | outside rev 4 | next design pass (one function or an agreement test) |
| FX-W6 branch B2: what shows a fence false | after FX-OUT a fenced attempt cannot land a READY, so the obvious evidence is gone | owner (evidence rule), if B2 |
| The model's own gaps for R57 (`FIDELITY-3.md` section 7): unconfirmed stop keeps `stop-requested` and verify needs ticks; the stale coordinator reads a status.json snapshot; host class from `bn`; the "process line matches" reading; `gp` reset by a watcher restart; a complete as-built configuration | model work not done in this round | coordinator (next modelling round) |
| The process list taken before the lock (S:198-205) is not modelled | inferred to cost one superseded alarm | modeller |
| No liveness verdict for AB-ALL or AB-WAKE-ALL whole | they do not fit 400 MB | owner (memory) |

<!-- TO FILL: open items the ablation files and fidelity part 2 add. -->

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
| Late session past the lease (F schedule 10) | FX-CLAIM | Slots as an invariant (needs a known lag bound) | Slots "eventually within N_max" |
| WakeSourceAlive on a first turn | R6 wording | restate "both sources" | accept that one fault silences a first turn |

Inferred, not stated in any source: the join's R6-b ("on unknown it starts nothing") takes the
start-nothing branch for the watcher, and FX-W1's markers make an exited alarm "dead", which removes
the p3b case. Whether that settles CEX-wake's exit-2 question is for the owner and the ablation run.

*Harness facts to probe before anything is built* (`notes/r3-changes.md` section 2; FIX-fence §9;
FIX-wake top table; FIDELITY-3 section 3):

| Probe | What it settles |
|---|---|
| PreToolUse input carries `session_id`; its format; whether helpers share it; where helper transcripts live (PROBE 1) | FX-CLAIM and FX-CGATE cannot be built without it |
| The Write input carries the full `content` (PROBE 2) | FX-OUT's hook half |
| A helper's tool calls run the attempt's hook (PROBE 3) | FX-OUT; also one of the three app checks the owner kept (section 16 point 12, cut 3) |
| The session tools' input names the folder or the target (PROBE 4) | FX-CGATE steps 4-6 |
| The delay from a session start to its first transcript record with a cwd (PROBE 5) | how often D4b happens; the FX-CLAIM lease |
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
enough alone:

- The scripts are unchanged. No fix of this round is in `tcb/`, so the protocol that would run is the
  one the counterexamples describe.
- The counterexamples are real. With the mechanisms as built, the design with the six fixes M1 to M6
  fails ReadyNotDiscarded, Slots, OneSessionPerAttempt, AlwaysCanResolve, EventuallyResolves,
  NoDeadlock, NoFalseSuspicion and the new wake properties (point 3), and the fidelity review walks
  them against the scripts.

What would lift it, from the records (the last two items are inferred from R57's text and section 16
point 12, not stated by a helper):

1. The fixes built into the scripts, specs and briefs (`notes/r3-changes.md`), and the probes of
   point 9 answered.
2. The fix models judged as built by the fidelity review's part 2, and the model gaps of
   `FIDELITY-3.md` section 7 closed (stop keeps `stop-requested` and needs ticks; the stale
   coordinator reads a status.json snapshot; host class from `bn`; the slot reading run or ruled out;
   `gp`).
3. A run with everything as built and all fixes on that fails nothing, except what the owner accepts
   by name as open by design (point 8). It must be complete, not BOUNDED: AB-ALL stopped at 2,858,368
   states, and a complete run is estimated at about 110 million states (about 16 GB) or, at the slower
   decay seen, billions (`CEX-wake.md` section 6, a coarse extrapolation). The review says split it by
   mechanism, not by fault parts (a pace question, not a scope cut).
4. Each fix's ablation failing a property (point 5).
5. R57's text asks for a fault budget of 4 events (line 538); the owner's ruling runs 2. Which one R57
   now means is for the owner to say; section 16 point 12 already narrows R57's "full run" to the
   sizes where the fixes act.

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
| The join's two targeted checks | fix-join | left to the modeller | (see point 5) |
| Any Node command | changes, fix-join, writeup | text-only tasks | stands |

<!-- TO FILL: the "deliberately not run" lists of the ablation helpers and of fidelity part 2. -->

**12. Disagreements in the records.**

1. **D3.** `CEX-fence.md` and `done/r3-asbuilt-fence.json` call D3 real with traces of 7 and 8 steps.
   The review (`FIDELITY-3.md` section 3) calls those traces artefacts: the stale coordinator can read
   only status.json, which does not show the admission; D3 is real only in a longer form, not run.
   StaleWrites 8 in AB-ALL is the same trace.
2. **D7-SLOTS.** `CEX-wake.md` section 5 gives SlotsProc and SlotsR10 failing in 7 as the place where
   the new form fails (noting, inferred, that lib.slotCount would count the stop). The review calls
   the trace an artefact as built (it needs z → stopped). So the new Slots forms have no failure that
   is as built.
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
   join and not attacked; under L1 with the list down it stays open by design.
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
10. **ABLATION-fence.md already exists** in `model/as-built/` (last written 19:26), with results under
    `results-as-built/fixes-fence/` (19:05-19:29). The coordinator's brief says it is still to come.
    This draft does not use it; point 5 waits for the coordinator's message.

**13. Tokens used.**

<!-- TO FILL by the coordinator. -->
