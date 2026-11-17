# FIDELITY-3: is the as-built model as built? (round 3, helper V, label fidelity-3a, 2026-11-17)

Part 1 of 2 (the as-built mechanisms). Part 2 (the modelled fixes) follows by message.

Reviewed: `model/as-built/model-asbuilt-frozen.mjs` (989 lines, frozen 18:37) with `configs-asbuilt-frozen.mjs`,
and `model/as-built/check.mjs`. `M:n` = a line of the frozen model. Script lines (`W:` watch.mjs, `S:` status.mjs,
`L:` lib.mjs, plus replace/stop/commit/handover/guard-hook) are lines **I read myself** today unless marked
"(SEM)" (taken from SEM-fence/SEM-wake, not re-read). Traces were read from the result JSON files in
`model/results-as-built/` (no Node process started, no lane used). INFERRED = reasoned, not run.

## 0. Verdict in one table

| Mechanism | Verdict | The gap (and what it could hide) |
|---|---|---|
| M1 superseded-alarm exits | as built, with a gap | re-arm token abstracted to "may fire whenever idle/mid-turn" (more wakes than built, optimistic for silence); the 3-process cap (M:373) can leave no current alarm once AlarmsBounded already failed |
| M2 arm at start | as built, with a gap | arm request read on reconcile's own view (M:886-890) and AR a separate op (M:905); but the coordinator always runs reconcile and always obeys the arm request except by fault x (fault `o` keeps AR, M:905) - D2's "no brief" is not a behaviour of the model |
| M3 act-due 17 | as built, with a gap | keys from the table with the empty-list count, once per onset, ack-silenced, fault `o` (M:761-781, 901); `start-session` and `bind` merged into one act 5 (M:394), stop-verify's sample/tick wait gone; the planner is the model's `plans()`, not status `next` |
| M4 slot counting + unknown | as built (worst reading) only in fence configs | `slotCountAB` (M:175-184) and `pl` (M:927-930) are faithful; every wake-group config without AB_SLOTCOUNT still admits on true liveness (M:413-417); the other reading of HARNESS-FACTS 10 (a process line names the folder) was never run |
| M5 pause discount | as built, with a gap | reads the wall-gap bit `gp`, short pauses missed (M:748, 919-925); `gp` survives a watcher restart (M:760 only clears it in a tick) while W:729 lets a new watcher's uncounted start evaluation reset `last_tick_at` - the model can over-discount |
| M6 READY re-check | as built | hook then land (M:809-820), replace reads only a landed READY (M:451), torn = absent (replace.mjs:193-198); one-lock merge of re-check+CAS+ledger justified |
| RC `status --reconcile` | as built in AB-FENCE-ALL/AB-ALL only | exactly-one-visible-transcript rule (M:293 = S:266-270), no COMMIT branch (M:295 off); wake-group-only configs still read true session existence (M:294) |
| CE fence | as built, with a gap | scripts refuse 64 in their own lock hold (M:439), the session-tool start is unfenced with a yield (M:525-538, 683); but the stale coordinator plans from the **live table** (M:313), while as built it can read only `run/status.json` (profiles/coordinator.json read_prefixes), which may not show the admission |
| Session start | as built | tool call apart from bind; SID lost on a turn death (M:693); bind reads true session existence (M:551) |
| Transcript lag + stop verify | as built, with two gaps | lag faithful (M:808, 293); but stop = request+close+verify in one op (M:474-507) needing **no watcher ticks** (stop.mjs:362 `no-watcher` 2, 393 wait), and fault z moves the row to `stopped` (M:500) while as built an unconfirmed stop **stays stop-requested** (stop.mjs:441-446; CONTRACT.md:340) |
| Close of a committed child | as built, with a gap | SR and SV are two ops (M:594-603) and committed-at-started is never stoppable (stop.mjs:276-278; replace.mjs:987) - D4c faithful; but SV runs right after SR in the same turn, needs no ticks, always confirms |
| Supersede chain D1 | as built | W:778-788 superseded exit 0, S:595-596 alarm-missing on no list; the property counts 3 links, not non-termination |
| Hang rule D5 | as built, with a gap | one planned slow call (M:845), first counted tick of a new epoch +1 (M:749 = W:375,398-399); the timeliness oracle `tickEnabled` (M:721-728) still holds every other healthy child; the +1 fires on a new watcher's first tick, which as built is uncounted (W:729) |
| D6 seven paths | p2 p4 p5 p7 as built; p1, p3, p3b, p6 with gaps | p1 lacks "never runs reconcile" (D2); p3/p3b shortest traces need an alarm to expire inside the turn that started it (untimed MIDTURN); p5's stale run.lock arises only from a host reset; p6 is the unknown-fact branch |

**R57.** "It must model the adopted designs as built, not oracles": **partly met.** The eight mechanisms named
in the charter (M1-M6, RC, CE) are now modelled from what is on disk, behind flags, and each has a
counterexample that walks against the scripts. R57 is **not yet met** as a whole, for four reasons:
(1) the stop/close machinery is still partly an oracle (z → `stopped`, no ticks, verify outcome by budget);
(2) the timeliness assumption remains for every healthy child but one slow call; (3) the stale coordinator
reads the live table; (4) no configuration with every flag on is complete: AB-ALL is BOUNDED at 2,858,368
states with no liveness checked, and AB-WAKE-ALL keeps the fence group's oracles (true liveness for
admission, true session existence for reconcile). Smaller ones are listed in section 2.

## 1. Mechanism by mechanism

Format: what the model does (lines) / the script / the reads / merges / unknown cases / verdict.

**M1 (AB_ALARM_SUPERSEDE, AB_ALARM_MIDTURN).** `startAlarm` M:368-375 marks the live alarm superseded
(bit 3) and adds the new one; a superseded alarm's only step is exit 0 + wake, at any time (M:866-873).
Script: W:770-773 registration a6 under the run lock; W:776-788 sleep, ce check (64), superseded exit 0.
Merge: start + a6 (one step). Justified: the lag only leaves the previous alarm current a little longer
and adds one more superseded exit (a wake), never removes one. Token re-arm (W:789-792) is abstracted: the
current alarm may fire whenever its coordinator is idle (M:869) or mid-turn (MIDTURN). As built it exits 30
only after a whole `alarm_ms` with no endturn. This over-approximates exits: sound for safety, and it may
**hide a silence** in a trace where the model wakes via an early alarm that, as built, would not fire for
another hour (INFERRED; liveness verdicts are "eventual" anyway). Unknown cases: alarm.json unreadable
reads as superseded (W:779-787) - modelled only as reconcile/endturn 67 (fault y, M:931), the alarm
itself keeps firing as current (same effect: a wake). Cap: at most 3 alarm processes per coordinator
(M:373); with 3 alive a new start pushes nothing and has already marked the current one superseded, so
the state has **no current alarm** - only reachable after AlarmsBounded (≥3) already failed on that path.
Verdict: **as built, with a gap** (token; post-violation cap).

**M2 (AB_ARM_SPLIT).** Reconcile exits 1 alarm-missing when no current alarm of i is in `A` or `pl = 0`
(M:888); the alarm start is op AR first in the plan (M:905) with fault x possible before it (M:684-697);
reconcile exits 75 on a stale run.lock with no list (M:882) and 67 when alarm.json is unreadable (M:885),
both with an empty plan. Script: S:593-602 (`alive === true` else exit 1; `aliveIn` null on no list,
S:126-128); S:354 readState → 67 inside the lock; L:1327/1377 (SEM) 75. Reads: `A.includes(i)` stands
for "alarm.json names a live process" - with the registration merged and the list available this is the
same fact. Not modelled: the list taken at r5 before r14's read of alarm.json (S:562 vs S:586), which can
only add one superseded alarm (a wake). Gap: fault `o` replaces the planned acts but keeps AR
(M:905), and nothing else lets a coordinator ignore alarm-missing; D2 (no brief tells it to) is covered
only through x, whose effect on the wake sources is the same. Verdict: **as built, with a gap**.

**M3 (AB_ACT_DUE).** Per row act (M:387-397) from the table with the empty-list count (M:380-386 →
slotCountAB with `pl` forced 1, i.e. no process ever matches, = W:548), raised when the act changes, silent
after the ack (M:771, 779; ack M:423-426 by the seq read at turn start), fault `o` = a turn that reaches
endturn without its acts (M:901). Script: W:543-567, W:583-663, rowAct W:135-168; S:627-631 ack by K.
Faithful: once-per-onset, ack-silence, the empty-list count, the run-level `handover`/`run-terminal`.
Merged: (a) admitted → one act 5 (M:394), where W:157-165 gives `start-session` then `bind` once a
transcript exists (a new ident, one more raise as built: the model has **fewer** wakes, pessimistic);
(b) stop-requested's `stop-verify@<tick>` vs `stop-session` vs `stop-verify@-` (W:142-156) are absent
because the model has no stop-requested step for a fenced row (see stop); (c) coalescing (W:650-663)
untimed; (d) the shared ack bit for READY and act-due (merge 5 of CEX-wake) errs towards "still due".
Gap that matters: the coordinator's acts on a 17 are the model's `plans()` (M:305-351), not status
`next` (S:520-551). I checked the M3 counterexample's crux against status: `next` for a bound row without
READY is `none` (S:550) and `events_pending` lists only seqs above acked_seq (S:489), so after the ack
status shows nothing to do - the model's planner agrees there. Verdict: **as built, with a gap**.

**M4 (AB_SLOTCOUNT, AB_PROCLIST).** `slotCountAB` (M:175-184) = L:3063-3102 in the worst reading (no
process line matches): per attempt once, stop not confirmed, and unconfirmed / current-open /
last-committed / transcript. Unknown: `pl = 0` → 99 → nothing admitted (M:176, 512), handover raise exits
2 (M:580 = handover.mjs:271-276), stop verify exits 2 (M:497-499, 600). Script checked: L:3063-3102,
handover.mjs:271-281, 318-330. Gaps: (a) only AB-FENCE-ALL and AB-ALL have it; AB-WAKE-ALL and every
AB-W-* config admit on `liveCount` (true live processes, M:413-417); (b) the reading "a process line names
the folder or session id" (HARNESS-FACTS 10 is open) is never run - the CEX called it a configuration,
none exists; (c) `n.S` only holds sessions canon keeps (M:191-199); an attempt whose session was dropped
cannot be counted by transcript - INFERRED harmless because canon keeps every not-yet-stopped attempt.
Verdict: **as built in the worst reading, with a gap** (other reading not run; true liveness in the wake
configs).

**M5 (AB_PAUSE_GAP).** A long pause sets `gp` (M:923), a short one only freezes the children (`pu`,
M:921); the tick discounts only on `gp` (M:748) and clears it (M:760). Script: W:342-345, 398-399. Gap 1:
as built `last_tick_at` is rewritten by every evaluation, including a new watcher's uncounted start
evaluation (W:729, 666), so a pause before a watcher (re)start is not seen by its first counted tick; the
model keeps `gp = 1` across SW and discounts it: **it can hide a false suspicion** (INFERRED, small).
Gap 2: H_HANG = 2 stands for h = 10, so "two short suspends" stands for about ten; the model does not
distinguish timer branch (a), where a missed short pause is harmless (SEM-wake 6.2), from (b). Verdict:
**as built, with a gap**.

**M6 (AB_READY_SPLIT).** Hook step (M:809-814: row active, epoch equal, admitted/started/bound = 
guard-hook.mjs:404) sets `rh`; land step sets `p = 2` with no re-check (M:815-820). Replace reads only
`p === 2` (M:451) = readyValid (replace.mjs:183-201: missing, link or unparseable → false). Re-check + CAS
+ ledger are one step: one run-lock hold (replace.mjs:466-481; L:1463-1472 SEM). Torn READY: a writer that
dies clears `rh` (M:203). Not modelled (scope, not fidelity of M6): fences from `admitted`
(replace.mjs:473 allows it), reasons memory/cut/drop/tainted. Verdict: **as built**.

**RC (AB_TRANSCRIPT_LAG, AB_NO_COMMIT_RECONCILE, plus M2's arm).** Exactly one visible transcript →
`started`, none → stays admitted, >1 → anomaly, no change (M:293 = S:265-270, 288-300). The COMMIT ⇒
committed branch is gone (M:295 under the flag; no such branch in S:263-317). Merge: the pre-read of
transcripts outside the lock (S:234-247) with the apply under it - a transcript appearing in between is
the same as one appearing later (the model has both orders). Gap: configs without AB_TRANSCRIPT_LAG
(all wake-group configs) read `cur(n, f)` = true session existence (M:294). Verdict: **as built in the fence
configs**.

**CE (FENCE_CE + AB_START_UNFENCED + AB_HANDOVER_NOKILL).** Every script op of a stale coordinator ends the
turn with 64 (M:439) - one lock hold with the act (L:1467, SEM; checked S:557, S:610, handover.mjs:258
SEM). The session-tool start is excluded and has a yield before it (M:683). The old watcher exits at its
next tick and wakes (M:732), the old alarm stays and wakes (M:866-873) - W:315, W:777. Gap that matters:
the stale coordinator's plan reads the **live** table (M:313). As built it cannot read `run/tasks.json`
(profiles/coordinator.json `read_prefixes`: only `run/status.json` under `run/`), its own status build exits
64 before writing (S:557), so it sees the last status.json some current coordinator wrote. In the
8-step D3 trace that status.json was written by coord1's reconcile **before** coord1's admit, so it shows
f0 not admitted (section 3). Also not modelled: the other unfenced acts (writes under `plan/`, helpers,
session close/message; SEM-fence 3.2). Verdict: **as built, with a gap**.

**Session start.** OP.T (M:523-545) is a tool call apart from replace start and bind; the SID is known
only to the starting turn (`bd`, M:535/542) and lost on its death (M:693); a stale start at a closed epoch
makes an IDLE session whose tool calls the hook denies (guard-hook.mjs:404-406). Bind from admitted is
skipped unless a session truly exists (M:551) - as built bind takes the SID from the tool result and does
not check the session (replace.mjs:980-1007); the difference arises only if the start tool call fails,
which is not modelled. Verdict: **as built**.

**Transcript lag and stop verify.** `tv` becomes 1 by the child's own step (weakly fair) or its first
progress (M:808, 812, 817). The fenced attempt's stop (OP.S, M:474-507) is one op: request, close of the
sessions it can name (`bd` or `tv`), verify; unnamed ones are confirmed while alive (M:484-487) =
stop.mjs:282-291 (no session, manifest → request) and 410-414 (confirmed = no growth and no matched
process). Gaps: (1) **z → `stopped`**: with fault z the row still goes to `stopped` (M:500); as built
verify records `stop: unconfirmed` and leaves the step `stop-requested` (stop.mjs:441-446, CONTRACT.md:340),
so the task cannot be restarted until a later verify confirms. The model restarts the task beside its
zombie: more behaviour than built (safety: an over-approximation; liveness: optimistic, it skips the wait
for the owner and a re-verify). (2) **No ticks**: verify needs `watcher.json` ticks (stop.mjs:362, exit 2
`no-watcher`) and `stop_verify_deltas` = 2 ticks after its sample (stop.mjs:367-399); the model confirms in
the same op, with no watcher at all. Liveness-optimistic: a state with no watcher can never confirm a stop
as built. (3) The verify outcome is chosen by the z budget, not from growth or a match; with the worst
reading (no match) an idle READY child can never be unconfirmed as built. Verdict: **as built, with two
gaps that matter** (1, 2).

**Close of a committed child (AB_COMMIT_CLOSE).** `cl` holds the slot (M:180); SR (M:594-597) only from
committed/bound (= stop.mjs:276-278 `committedBound`), SV (M:598-603); committed at `started` gets `cl = 3`,
never released (M:562, 570; bind refuses a committed row, replace.mjs:987 `row.state !== 'active'`; the
handover lock re-check counts committed rows at started/bound whose stop is not confirmed,
handover.mjs:320-330). Gaps: SR and SV run back to back in one turn (M:325) with no ticks and no watcher
needed; SV always confirms (no z); the session-tool close is dropped (MA's merge, justified only in the
worst reading). Verdict: **as built, with a gap** (liveness-optimistic).

**Supersede chain D1.** Reconcile with no list → arm (M:888, S:595-596), AR supersedes (M:372), the
superseded exit wakes (M:870, W:786-787), the next reconcile asks again. Counter `ch` (M:372, reset M:889).
Verdict: **as built** (the property is a proxy, section 5).

**Hang rule D5 (AB_HANG_CALLS).** One planned slow call (`s`, M:845) during which ticks run (M:725 ignores
SLOW); hang counts ticks with no call (M:749-752 = W:375, 398-399). Gaps: `tickEnabled` (M:721-728) still
blocks every tick until each other healthy current child has moved - the timeliness assumption is relaxed
for one call per run only; the fresh-epoch +1 (M:749) also fires on the first tick of a newly started
watcher, which as built is the uncounted start evaluation (W:729) - one tick too many in the shortest
trace (not in the verdict: a slow call lasts any number of ticks). Verdict: **as built, with a gap**.

**D6's seven paths (WAKE_PROPS tags M:688, 613-621, 940, 695).** p1: the model's first turn always runs
reconcile; "never runs it" (D2) is not a behaviour. p2: as built. p3: as built, but its shortest trace uses
an alarm that expires inside the turn that started it (1 h; artefact of untimed MIDTURN). p3b: S:652-654
checked (exit 2 returns before the missing reasons); shortest trace has the same timing artefact.
p4: as built. p5: 67 via fault y as built (S:354); 75 only from a run.lock left by a host reset (M:933-937),
not from a script killed otherwise. p6: the unknown-fact branch (AB_X_KILLS_BG). p7: as built (owner's).

## 2. What still acts atomically on true state (frozen model lines)

1. `tickEnabled` M:721-728: a tick waits until every healthy current child has made a call or card
   (true mode `s.m`), except SLOW (one per run) and paused children. Timeliness oracle.
2. `eligibleHO` M:299-302: a planned hand-over is planned only for a child that is alive, `MODE.OK` and has
   exactly one card - true health, which no file shows the coordinator.
3. `plans` M:313 (stale coordinator): reads the live table, not the last status.json.
4. OP.B M:551: bind skipped unless the session truly exists.
5. OP.F M:463: host class from the reset flag `s.hb` set on every session (M:935), not boot ids. As built
   the host class needs `att.boot`, written only by bind (replace.mjs:463, 1002): an attempt that
   reconcile marked `started` and nobody bound is charged to R after a reset.
6. OP.S M:474-507: request + close + verify in one step; outcome by budget; z → `stopped` (M:500); no
   watcher ticks needed.
7. OP.SR/OP.SV M:594-603: back to back, no ticks, SV always confirms.
8. Owner's end of a zombie M:852 merged with the coordinator's `stop-verify@-` (W:153): the slot frees with
   no coordinator turn and no watcher.
9. `admitCount` M:413-417 and `reconcile` M:294 in every config without AB_SLOTCOUNT/AB_COMMIT_CLOSE and
   AB_TRANSCRIPT_LAG: true process liveness, true session existence (all AB-W-* and AB-WAKE-ALL*).
10. `macro` M:676-702: coordinator ops between yield points (yields only before F, after F, before E,
    before T when unfenced, M:683) are atomic with respect to every other actor; reconcile + plan + the
    first ops are one step (M:878-908). Between E and SW/SA, AR and the next op, SR and SV, A and T nothing
    else can happen. Unproven reduction; the ones that matter are SR→SV and the stop (ticks) above.
11. Endturn without a list M:619: any watcher.lock holder counts as "a record present", whatever its ce;
    as built the watcher record counts only if watcher.json's ce is the caller's (S:647). After a hand-over
    with the old watcher alive this gives exit 2 where the script gives watcher-missing; the alarm record
    usually gives exit 2 anyway (INFERRED).
12. `gp` M:760: survives a watcher restart (M5 gap 1).

## 3. The reported counterexamples, walked against the scripts

All from `model/results-as-built/` (whole runs BOUNDED where marked; a failure found in a BOUNDED run is a
real trace of the model). Each step below was compared with the script lines given.

| Defect | Trace (file, property, steps) | Walk | Verdict |
|---|---|---|---|
| D4a | AB-ALL ReadyNotDiscarded 7; AB-READY-SPLIT 6 (43/43 parts) | x before bind (replace.mjs:999-1007 never runs); card; hook passes (guard-hook.mjs:404); alarm wakes; reconcile → started (S:288-300); bind from started; planned hand-over fence: readyValid false for a missing file (replace.mjs:186) → fence e1→e2 (replace.mjs:475-481) | **real**. Window is the hook-to-landing time of one Write call (ms to s); the model's is unbounded, so the trace's "alarm 1 h later while the write is in flight" is an abstraction of timing, not of logic |
| D4b | AB-ALL Slots 6, OneSessionPerAttempt 5; AB-TRANSCRIPT-LAG 3 | start, x before bind; wake; reconcile finds no cwd transcript (S:270 continue), `next` = start-session (S:542); second start; bind; `replace start f1`: slotCount counts f0e1 once (L:3071-3076) → 3 processes | **real**, timing-dependent: needs a reconcile before the first session's first record with a cwd. Cannot tell how often: measure the delay from a session-tool start to its first transcript record. The 5-step form uses a crash note as the wake; HARNESS-FACTS 1 promises a note only at a turn end, so prefer the 6-step alarm form |
| D3 | AB-ALL TwoCoordinatorsAct 8 / StaleWrites 8; AB-START-UNFENCED 7 | drain, x; alarm; handover raise (handover.mjs:262-345: no kill, 283-297); owner starts coord1; old alarm exits (W:777 64, a wake); coord1 reconciles **then** admits f0; stale coord0 "reads f0 admitted" and starts wt/f0-e1 | **real in a longer form; the 8-step trace itself is an artefact.** coord0 can read only status.json (profiles/coordinator.json), written by coord1's reconcile before its admit, so it shows f0 not admitted. Real when a status.json shows the row admitted: coord1 runs a status build between admit and start (no fault), or coord1's turn dies between them and its next reconcile writes it (one x). Both need the session tools allowed (today they are not: tools_allow has none) and a stale coordinator that ignores R6 |
| D4c | AB-COMMIT-CLOSE AlwaysCanResolve 5 (complete), EventuallyResolves 12 | x before bind; READY; reconcile → started; drain; commit at started (commit.mjs:937 accepts started); stop request refuses committed/started (stop.mjs:276-278); bind refuses committed (replace.mjs:987); handover lock re-check refuses (handover.mjs:322-330) | **real**, given a coordinator that commits a `started` row; status `next` says `bind` for it (S:543) and `commit` only for bound + READY (S:544-548), so it needs a coordinator that acts on the class-11 READY rather than on `next` |
| M2 gap / D6 p1 | AB-ALL WakeSourceAlive 1; AB-WAKE-ALL k=1,x=1 NoDeadlock 2 | first turn: reconcile exit 1 (S:593-601), x before the alarm start | **real** (SEM-wake 3.3) |
| D1 | AB-ALL WakeChainBounded 13, AlarmsBounded 12; AB-WAKE-ALL k=1,u=1 WakeChainBounded 12 | u; reconcile `aliveIn(null)` → exit 1 (S:128, 595-596); AR supersedes; endturn exit 2 (S:652-654); superseded exit 0 (W:786-787) wakes; repeat | **real**; each link is one `alarm_ms` (1 h), so NoBusyLoop cannot see it |
| D5 | AB-ALL NoFalseSuspicion 8; part traces 7 | a healthy child in a long call (planned s), new watcher, two ticks with no new message → hang (W:375, 398-399, 420) | **real**; the first tick's +1 is the model's (as built the new watcher's first evaluation is uncounted, W:729), so the trace is one tick short of the script, not wrong in kind |
| M3 acked, no act | AB-W-ACT-DUE k=2,o=1,cs=1 EventuallyResolves 13 (complete) | hang raised (W:420), turn omits the fence (o), endturn acks it (S:631), key stays silent while hang lasts (W:611, 645-649), status shows no act (S:550, 489) | **real** (I verified the planner side the CEX had INFERRED). Rests on fault o (a turn that skips its act) and on the stuck child never returning (env step, not forced: the right reading for a stuck child) |
| M5 short suspends | AB-W-PAUSE-GAP NoFalseSuspicion 6 | two short suspends, each counted (W:342-345) | **real in kind, compressed**: as built it needs about h = 10 counted ticks with no call, i.e. ten short suspends, or one freeze of the child alone (API stall, efficiency mode) for 10 min; only timer branch (b) makes a missed short suspend harmful. Cannot tell which branch: measure a Node `setTimeout` across a Windows suspend (CONTRACT §7 item 6) |
| D6 p3b | AB-WAKE-ALL k=1,u=1 NoDeadlock 6 | AR's own alarm exits mid-turn; endturn exit 2 hides alarm-missing; B2 | **real in kind** (S:652-654); the shortest trace needs the alarm started in that turn to expire inside it (1 h) - an untimed artefact; a timely form needs the current alarm to exit near a turn start triggered by another wake |
| D7-SLOTS | SlotsR10/SlotsProc 7 | zombie stop, then `admit f0` e2 | **artefact as built**: an unconfirmed stop keeps the row at stop-requested (stop.mjs:441-446), so e2 cannot be admitted; the trace is the design model's z → stopped (M:500) and its `liveCount` |

## 4. The modellers' fixes and caps

| Fix / cap | Can it hide behaviour that matters? |
|---|---|
| At most N_max+1 = 3 sessions per attempt (M:534, 541) | No for safety: Slots and OneSessionPerAttempt already fail before the cap acts. It cuts the infinite duplicate-start livelock, which only liveness could see, and liveness is not checked in those configs |
| The owner ends a zombie that wrote READY, merged with the re-verify (M:852) | **Yes, liveness.** (a) As built the re-verify is a coordinator act that needs a wake and two watcher ticks; merged, the slot frees with neither. (b) Nothing escalates an idle READY zombie: class 25 needs zombie spend past Z (CONTRACT.md:98); an idle child spends nothing. The owner step is weakly fair (proc 6), so the model assumes the owner learns of it. In the worst reading an idle READY child cannot be unconfirmed at all (stop.mjs:426), so the case is inconsistent with the reading used elsewhere |
| At most 3 alarm processes per coordinator (M:373) | Only after AlarmsBounded failed: such a state can hold no current alarm, so a later trace through it (e.g. a WakeSourceAlive or liveness trace) may be an artefact |
| `u` recovery and SLOW/STUCK return are environment steps never forced (proc 31) | Liveness failures resting on them are artefacts (permanent outage, a slow call that never ends); both modellers flagged theirs. They hide nothing |
| One planned slow call (`s` = 1) | Under-approximates D5 (two slow children, a slow call twice); D5 already fails, so no verdict hides behind it |
| SLOW merges "long call" and "waits on its own job" | Same evidence to the watcher (W:375); safe |
| Shared fairness ids (AB_FAIR_IDS off in every fence config and single-flag wake config; duplicate sessions of one attempt share a child id, M:794) | Makes fairness weaker: may add spurious fair cycles, never hides a failure |
| Stale coordinator: empty plan or starts only (M:312-314), live table | See CE: the live-table read is the one cap that changes a counterexample (D3's shortest trace) |
| Merges claimed safe in CEX-fence §2 and CEX-wake §2 | I agree with all but: the stop/close merges (no ticks; z → stopped), the owner zombie merge, and `gp` (M5) - listed above |

## 5. The new property forms

| Property | Rule it stands for (protocol line) | Says what the rule says? | Can fail? |
|---|---|---|---|
| RestartLimitGhost (M:468, 519) | R8 (145): replaced at most R times for failure, host and planned free | Yes: counts failure fences per row (not host, not hand-over), independent of `rs`; checked at admission | Yes: D7-RESTART F 17 with the counter frozen. `gf` is still the model's own counter at the fence site, not derived from the epoch history; it is independent of the mechanism (rs), which is what was asked |
| StaleWrites (M:950-956) | R2 (95-96), R6 (133-134), R57 "one accepted ce" (533) | Stronger than R6's text (R6 forbids writing *scripts*; the property also forbids a session start). Matches R57 | Yes: D7-STALE F 4, AB-ALL F 8 (the D3 artefact above) |
| CommitRecordStable (M:957) | R14 (211-215): first wins, identical no-op, different refused | Yes | Only with both WX and the epoch check removed (D7-COMMIT-NOFENCE F 13); with the epoch check present WX is still not shown load-bearing (D7-COMMIT holds, complete) |
| SlotsProc / SlotsR10 (M:973-982) | R10 (159; amended at 951) | SlotsProc = R10 as written; SlotsR10 = amended R10 on true state | Yes (D7-SLOTS F 7), but that trace is not as built (section 3), and D7_SLOTS was **never run with AB_COMMIT_CLOSE/AB_SLOTCOUNT**: under D7_SLOTS alone the commit closes the child (M:562, 571), an oracle. The forms are untested on the as-built close |
| LoopReported (M:757) | R5 (126-127): one signature three times running | Yes, as "reported by the first tick after" | Yes with the rule removed (D7-LOOPS F 8); BOUNDED with it |
| WakeSourceAlive (M:400-408, 947) | R6 bound (134-135) with the amended clause (949): "a turn that dies before it starts the alarm counts as a lost wake" | A reading: silence is a violation unless two losses (l + x) or a reset (M:986-988). It counts a live child as a source (R6 counts only watcher and alarm) - weaker than R6's "both sources pending" | Yes (F 1). Note: on a first turn there is no second source to lose, so either R6's bound is broken by one fault or "both" must be restated - an owner wording question, not a model error |
| WakeChainBounded (M:948) | none: D1 is a defect report; R6 (948) bounds nothing | A proxy: "fewer than 3 consecutive superseding arms". It fails for any three turns of one outage, so it cannot tell D1's never-quiescing loop from a short outage | Yes (F 9-13) |
| AlarmsBounded (M:972) | none explicit; R6 implies one alarm per ce | A proxy (≤ 2 per coordinator) | Yes (F 5-12) |

## 6. Fault accounting and fairness

One fault (charged when it runs, M:186-187): x = one turn death before any op after reconcile (or, under
AB_X_KILLS_BG, a crash that also kills its background commands, same price); u = one process-list outage of
**any length**; y = alarm.json unreadable until the next registration; o = a whole turn's acts omitted;
p = one pause (long or short); l = one lost wake; z = one unconfirmed stop; t = one torn commit; r = one
host reset (which may also leave run.lock, free); cs/cv/cd one child fault. Planned, not faults: h, d,
and s (one slow call).

At no fault cost: transcript lag of any length; a READY in flight for any time; a stale coordinator
breaking R6 (a free choice, worst-case LLM - defensible as built, nothing enforces R6); duplicate starts;
commit before bind; an alarm exiting early or mid-turn; superseded exits; list recovery; a slow/stuck
child's return; all owner acts. Because the model is untimed, windows of milliseconds (READY in flight,
transcript lag) and of an hour (an alarm inside one turn) are free and unbounded; this is the source of
every "real in kind, timing-dependent" verdict above. One u buys the whole D1 chain.

Fairness behind the liveness verdicts (check.mjs:156-158, 241-261): weak fairness per process id over
fault-free edges; owner wakes only after two losses or a reset (M:986-988), but the owner's zombie end and
fresh-coordinator start are always fair (M:852-853); environment ids 30/31 are never forced; planned
choices (drain, hand-over, slow call) may appear in cycles; a coordinator's choice among plan
alternatives is not forced. Liveness "holds" therefore rests on the owner ending zombies and starting
coordinators, and on the stop/close merges of section 2 (no ticks); liveness "fails" may rest on an
environment step never coming (artefact; flagged per trace). No liveness verdict exists for AB-ALL;
AB-FENCE-ALL's liveness column is from its pre-fix BOUNDED run.

## 7. What is left for R57 (part 1)

1. Stop of a fenced attempt: keep `stop-requested` on an unconfirmed verify (drop M:500 for z), and make
   verify need a live watcher and two ticks after its sample (a split: request+sample, then verify after
   ticks). Same for SR/SV.
2. The stale coordinator plans from a snapshot of the table taken at the last status.json write.
3. Host class from `bn` (bound) rather than a reset flag on every session.
4. Run the slot-count reading "a process line matches" (HARNESS-FACTS 10 open) once, or rule it out.
5. Re-check `gp` against a watcher restart (the start evaluation rewrites last_tick_at).
6. A complete as-built configuration: AB-ALL does not fit 400 MB (CEX-wake §6 estimates ≥ 16 GB). Under
   the owner's ruling this is a pace question, not a scope cut: split by mechanism, not by fault parts.

## 8. Deliberately not run

- No model run and no trace print: every trace was read from the result JSON files directly; a run would
  change no verdict in this part.
- AB-START-UNFENCED with a status.json snapshot for the stale coordinator: D3 is real in a longer form
  either way (section 3); no decision changes.
- Any run with z keeping `stop-requested`: it would change liveness verdicts, but no as-built liveness
  verdict is checkable at 400 MB today (AB-ALL), so it belongs with item 6 of section 7.
- The "process line matches" reading of M4: listed as a fix to the model, not run (no decision waits on it
  in this part).

---

# Part 2 (fidelity-3b): the fence fixes in the frozen model

Reviewed: `model/as-built/model-fixes-fence-frozen.mjs` (MF below), `configs-fixes-fence-frozen.mjs` (CF), and
`check-fixes-fence-frozen.mjs`, which is identical to `check.mjs` except for the file name. They were reviewed
against `FIX-fence.md` rev 4 (sections 0b, 1-4, 6, 12), `ABLATION-fence.md` and
`results-as-built/fixes-fence/*.json`.

- The diff from the part-1 model is 630 lines; every hunk was read.
- No model run, and no trace printed through the lane: every trace quoted here was read from the result files.
- The scripts are unchanged. So "as the scripts would do it" means "as FIX-fence says the changed scripts would
  do it".

## 9. Verdicts

| Fix | Verdict | The limit, in one line |
|---|---|---|
| FX-OUT | **Relied on with a stated limit: safety only** | ReadyNotDiscarded and NoStaleAccepted hold. Slots and the four liveness "holds" rest on an oracle close that the fix itself makes necessary (9.1 a), and on the old stop verify |
| FX-CLAIM | **Relied on with a stated limit: safety only, under a stronger assumption than stated** | Slots holds only if no live session stalls past the lease before its first tool call. The flag also switches that stall off (9.2 a). Liveness cannot be relied on: step 7 is modelled on true liveness, while the design counts folder sessions that nothing ever closes (9.2 b) |
| FX-CGATE (Q5a) | **Relied on with a stated limit** | Narrow configuration: no transcript lag, no table slot count, the old stop verify, no lease. The nonce bind and the hook-to-effect window are merged, so schedules 12 and 14 cannot be expressed |
| FX-CGATE (Q5b) | **Cannot be relied on** | BOUNDED: 8 parts BOUNDED, 2 not run, and liveness not analysed in 3 more complete parts. One liveness failure rests on an INFERRED skip. The Slots "artefact" is not shown to be one |
| FX-CLOSE | **Relied on with a stated limit** | The process list is always available, and PROBE 10(a) and 10(b) are assumed true. The close, its effect and its done record are one step. A dead session needs no record, which is right only while the list is available |
| FX-PLAN | **Relied on with a stated limit** | Holds in all three configurations. Its own ablation shows a defect created by FX-CGATE's one-shot start, not an as-built one. The watcher delegates to `planAct` only for some rows, and `rowAct` is not rewired |

**Across every fix: no result is shown to come from the frozen file.**

- The result files carry no model hash.
- The non-Q5b result files were written 19:05-19:48.
- `model.mjs` was last written at 20:09, and the frozen copy is byte-identical to it (`cmp`).
- The Q5b parts run (1,700 s wall, ending 20:33) spans the 20:09 write. The modeller's own trap list
  (ABLATION section 8) forbids an edit during a parts run.
- INFERRED: the 20:09 edit is the Q5b owner-start correction, which only `FX_Q5B` reaches (MF:1173-1179).
- One recorded run repeated on the frozen file would settle this (section 14).

## 9.1 FX-OUT

**(1) As built under the design.**
- **READY hook.** The row check and the ready-slot create are one step (MF:1112-1121). This is justified. The
  ready slot and the fenced slot are the same outcome slot, and the exclusive create is the linearisation point.
  If a fence ran between the hook's row read and its create, it left a fenced slot, so the create fails and the
  hook denies (MF:1116). The create sees only that the name exists (`ol` 0/1/2), and the model reads no more
  than that.
- **READY.json landing** stays a separate step. A death between the hook and the landing leaves a slot without
  READY.json, and commit reads the slot (`outReady`, MF:806).
- **Fence.** The retry check, ready check, slot, tombstone and CAS run in one hold, with one death point after
  the creates (MF:629-676).
- **Merge not exercised.** The slot and the tombstone are both created before the single death point, so the
  state "slot without tombstone" cannot be reached. No configuration has both `FX_OUT` and `FX_CLAIM`
  (CF:92-95). That merge is unchecked, not wrong.

**(a) The oracle close.** With `FX_OUT` on and `AB_COMMIT_CLOSE` off, commit kills the slot's writer even while
it is mid-write (MF:824, `s.al = 0`).
- Before FX-OUT, commit needed READY.json. That is the child's last act, so "commit closes the child" was the
  base canon.
- FX-OUT changes what a commit means: a child may still run after its ready slot. It can loop or stall before
  READY.json lands.
- Without the oracle, FX-OUT failed AlwaysCanResolve 7 (`FX-OUT-before-commit-close-oracle.json`, in
  SUPERSEDED).
- So this is not only a gap in the base abstraction. It is new behaviour the fix brings, and in C_OUT the
  oracle hides it.
- Its real closer is the as-built close plus FX-CLOSE, which was never run together with FX-OUT.

**(2) Ablation: real.** `FX-OUT-X` = C_OUT + FX_PLAN - FX_OUT (CF:99): only the fix is removed. The trace is
ReadyNotDiscarded F 6, BOUNDED at 400 (`FX-OUT-X.json`), and it is the recorded D4a:
1. the hook passes;
2. the coordinator dies before bind;
3. a planned hand-over fences while READY.json is in flight.

**(3) Scope.**
- C_OUT contains AB-READY-SPLIT's flag.
- It has no `AB_STOP_HELD`, no `AB_SLOTCOUNT`, no `AB_PROCLIST` and no `D7_SLOTS`.
- The complete run is `FX-OUT-PLAN-2500.json`: 5,682,597 states, all 19 properties hold.
- SlotsProc and SlotsR10 were not checked.

**Still on true state:** the commit oracle above. ReadyNotDiscarded reads `rh`/`p` as an observer, which is
correct.

## 9.2 FX-CLAIM

**(1) As built under the design.**
- **Claim.** The epoch gate and the claim create are one step (MF:1101-1110). This is justified. The claim is
  per attempt, and a fence that wins the race leaves a tombstone or makes the session stale. So the create can
  only see absent, claimed or tombstone, and that is all the model reads (`cm`).
- **Bind** checks the claim and its holder (MF:784-798), with one yield before it (MF:953).
- **Reconcile** goes from the claim (MF:354).
- **Stop of a tombstoned attempt** confirms at once (MF:680-687).

**(a) A behaviour switched off by the fix flag.** At MF:1144, `preClaim ? [MODE.DEAD]` means that with
`FX_CLAIM` on, a session can only die before its first tool call. It cannot be stuck, loop or be slow there.
- The stated reason is that a stuck slow call is a tool call, and the claim is made in that call's PreToolUse
  hook.
- A session can still stall before any tool call: its first model request can hang, or the harness can retry
  it.
- That stall is the step-2 fault of the ablation trace itself. In `FX-CLAIM-X-400.json` (Slots F 16), step 2 is
  "FAULT child f0e1 stuck in a slow call", right after the start and before any tool call.
- So the ablation flag removes the fix **and** this restriction.

INFERRED, not run: with the stall allowed while `FX_CLAIM` is on, the run would reach the same three processes
as the ablation.
1. Reading (i) still expires the lease, because a stuck session is not "healthy" (MF:1045).
2. The crash fence tombstones the attempt.
3. The stop confirms at once (MF:682).
4. Step 7 does not count a session with no visible transcript (MF:240).
5. f0e2 is admitted.

**Reading (i), as modelled, therefore means "every live session makes its first tool call, or dies, within the
lease".** That is stronger than the stated "no live healthy unclaimed session" (ABLATION section 7), and
PROBE 5 must measure the stronger form.

**(b) Step 7 on true liveness.**
- The model counts `s.al && s.tv && !s.dn && !s.ch` (MF:240).
- The design (FIX-fence section 2, step 7) counts +1 for every *folder session* with no done file, other than
  the claim holder of a stop-confirmed attempt, whether dead or alive.
- The model merges a dead session with its "no such session" close (comment at MF:236-239).
- In a tombstoned attempt nothing issues that close: step 6 confirms at once, and FX-CLOSE's verify is not on
  that path.

INFERRED design hole: a session that dies after its transcript appears and before its first tool call is
counted by step 7 for ever. At K=2, two such crashes fill N_max = 2 and block admission (AlwaysCanResolve). The
model cannot show this.
- The model counts no more than the design, so the Slots verdict carries over. The liveness verdict does not.
- Under reading (ii), the same holds for a late session that a tombstone made inert: it idles alive with no done
  file.

**(2) Ablation: partly real.** `FX-CLAIM-X` = C_D4B - FX_CLAIM (CF:108).
- The trace shows D4b's mechanism, reached through the lease: no transcript yet, so the stop confirms while the
  session lives.
- It uses the stall that the flag also forbids (a).

**(3) Scope.**
- C_D4B contains AB-TRANSCRIPT-LAG and AB_SLOTCOUNT, plus `AB_STOP_HELD`.
- It has no D7_SLOTS, so SlotsProc and SlotsR10 were not checked. It has no AB_PROCLIST and no watcher-death
  fault.
- The run is complete over 43 parts. I checked the files:
  - 40 parts at 1500 MB had liveness analysed;
  - the three `r` parts were not analysed at 1500 MB, and are complete with liveness at 3000 MB
    (`FX-CLAIM-rparts-3000.json`: 11,799,897, 17,317,214 and 14,114,426 states).
- ABLATION section 1 misquotes the first `r` part as 17.3 M.

**Still on true state:**
- the lease: reading (i) reads `m` and `al` (MF:1045), which encodes the timing assumption;
- step 7's `s.al`;
- the commit's oracle close of denied duplicates (MF:824), reachable only without the one-shot start;
- `tv = 1` at the claim, which stands in for "the stop names the claim holder". I accept this one.

## 9.3 FX-CGATE

**(1) As built under the design.**
- **Stale refusal** is `c.ce < n.ce` (MF:613). The hook reads `coord-session-<ce>`. These are equivalent only
  because the nonce bind is merged into the successor's start. That removes the window between the raise and
  the bind, where the old session's hook must fail closed (schedule 14 cannot be expressed).
- **Start hook.** The row check plus the `start.json` exclusive create, and the tool's effect, are one step
  (MF:754-761). The create sees existence only (`sj`). A second start is denied start-issued.
- **Window between the hook's allow and the effect:** not modelled. INFERRED benign while one current
  coordinator both starts and fences, since those are sequential within it.
- **Close-done record:** the close, its effect and the Post record are one step (see 9.4).

**(2) Ablation: real.** `FX-CGATE-X` = C_CGATE - FX_CGATE (CF:104). The lease is off in both, since neither has
FX_PLAN. The trace (`FX-CGATE-X.json`, TwoCoordinatorsAct F 7) is D3 in its real, longer form:
1. drain;
2. x;
3. alarm;
4. hand-over, ce goes to 1;
5. coord1 admits f0, and a status build writes status.json;
6. the stale coord0 starts f0e1 from that snapshot.

**(3) Scope.**
- Complete: `FX-CGATE-2000.json`, 8,290,758 states, all 19 properties hold.
- C_CGATE has no AB_TRANSCRIPT_LAG, no AB_SLOTCOUNT, no AB_STOP_HELD and no lease.
- In a configuration with lag, FX-CGATE's one-shot start without FX-PLAN loops; FX-PLAN-X shows this
  (AlwaysCanResolve F 3).

**Snapshot fidelity.**
- The model writes the snapshot at the current coordinator's reconcile and, as an alternative, after its admit
  (MF:749, 1212).
- As built, every status build writes status.json (status.mjs:582, under the run lock with `--ce`), including
  intake's status step (watch.mjs:834).
- So the model's write points are a subset of the real ones. This cannot change the "holds": every stale
  session-tool start is refused, whatever the stale coordinator read. More write points could only add paths to
  the ablation.

## 9.4 FX-CLOSE

**(1) As built under the design.**
- The request, the close tool and the sample are one step (MF:847-853). Verify follows after 2 watcher ticks
  (MF:857).
- `closeCommitted` (MF:584-596) merges three things into one step: the close tool call, its effect, and the
  Post hook's done record.
- So a death between the effect and the Post record leaves a dead session with no record. The model needs no
  record for a dead session: verify reads `s.al` (MF:503).
- That merge is right only through rev 4's H3 rule. A "no such session" done counts when the process list
  matches nothing, and C_CLOSE has no `AB_PROCLIST`.
- With `u` on, across a hand-over (the done's `by` is not the coordinator that made the start), a dead child
  needs a listed process or the owner. The model's owner end covers only zombies (MF:1163-1170).

**(2) Ablation: real.**
- `FX-CLOSE-X` = C_CLOSE - FX_CLOSE (CF:101): complete, 3,968,248 states, AlwaysCanResolve F 5.
- That is the recorded D4c trace and length: stop.mjs:278 refuses the request.
- The sub-flag run is real (`FX-CLOSE-NOOWNEREND.json`, F 7).
- `AB_NO_COMMIT_RECONCILE` moves the model toward as built: it removes a reconcile branch that no script has.

**(3) Scope.**
- Complete: `FX-CLOSE.json`, 4,151,883 states, all 21 properties hold on the held stop verify, including
  SlotsProc and SlotsR10.
- Absent: AB_PROCLIST, transcript lag, and claims (verify's `s.ch` term is idle).
- PROBE 10(a), a close success that is only a request (schedule 11), is not modelled: the close always takes
  effect.

## 9.5 FX-PLAN

**(1) As built under the design.**
- `planAct` (MF:385-405) is one pure function, as the design says.
- The watcher's `actionable` delegates to it only for admitted, started-unbound, fenced and committed rows
  (MF:986, 991).
- For a torn fence on a *bound* row (`refence`), the design raises class 17. In the model this is not an act
  for the watcher, so the coordinator must be woken by another source. That is conservative for liveness.
- `rowAct` (the wake configs) is not rewired.
- Step 1's `owner` branch is absent.
- The lease advances only on ticks, and in these configurations the watcher never dies (H2, schedule 6).

**(2) Ablations: real traces, but read them for what they show.**
- `FX-PLAN-X` (CF:110; part k=2,cd=2 complete; AlwaysCanResolve F 3) shows a defect made when FX-CGATE's
  start-issued meets the as-built planner. It is not an as-built defect.
- FX-PLAN's as-built targets are already blocked by other fixes: 13(a) by FX-CGATE's hook, 13(b) by FX-CLOSE
  (F 5).
- So the model shows FX-PLAN to be *needed by the other fixes*, not to remove an as-built defect alone.
- `FX-PLAN-NOSTARTWAIT` fails AlwaysCanResolve where the design names NoBusyLoop. The modeller's reason is
  right: the loop is paced by ticks.

**(3) Scope.** Complete in all three configurations it appears in: FX-CLAIM, FX-OUT-PLAN and FX-CLOSE.

## 10. My two part-1 gaps

**Gap 1 (stop verify): closed as I meant.**
- An unconfirmed verify keeps the row fenced (stop-requested) and resamples (MF:564-571).
- Verify waits for `vt >= 2`, and `vt` advances only on a watcher tick (MF:1037-1040). With no watcher it waits,
  which matches stop.mjs:362 (no watcher, exit 2).
- The owner's end of a zombie no longer confirms (MF:1167-1169).
- The sample is merged into the request. That removes one empty act, and I accept it.
- Still open: the only source of "unconfirmed" is `z`. A live idle process that is not a zombie confirms,
  because the close always kills it. That is part-1 gap 4, the process-line reading, unchanged.

**Gap 2 (stale read): closed as I meant.** The stale coordinator plans `start-session` from `t.se`, the last
snapshot (MF:417). Its write points are a subset of the real ones (9.3).

**D7-SLOTS-HELD: honest.**
- Its configuration is exactly D7-SLOTS + `AB_STOP_HELD` (CF:112 against configs-asbuilt-frozen.mjs:82).
- Complete: 3,093,274 states. SlotsProc and SlotsR10 hold, and so does everything else.
- So the recorded F 7 was the z -> stopped artefact, as part 1 said.

**The D3 rerun: honest.** The trace has the admit with its status build, then the stale start from the snapshot
(9.3).

## 11. What the modeller says it left

| Claim | Right? | Weakens a "holds"? |
|---|---|---|
| C_OUT and C_CGATE run on the old stop verify | Right (CF:92, 94). Under z -> stopped the row resolves faster and admission lets more in | For liveness of FX-OUT and FX-CGATE: yes, it is optimistic. For Slots: no, because the old reading admits more |
| Lease reading (ii) fails Slots and NoChargeWithoutFault in 8 steps | Right. Both traces are fault-free (`FX-CLAIM-II-400.json`). The NoChargeWithoutFault trace also fences a *healthy claimed* session: the crash fence ordered from the expired lease finds a claim and charges it | Only as 9.2 a says. A design note, not a ruling: if a crash-reason fence refused once its tombstone create found a session claim (inside the same hold), the charge failure under (ii) would go. The Slots failure would not |
| Q5b is BOUNDED; NoDeadlock F 15; the Slots F 13 is an artefact | BOUNDED: right. 8 parts BOUNDED, 2 not run, and liveness also "not checked" (memory) in the complete parts cv=2, cd=2 and l=1,r=1, so liveness was analysed in 30 of 43 parts. NoDeadlock: a real model trace, resting on the INFERRED "hand-over skipped, turn ends without endturn". Slots artefact: plausible from gaps 1 and 9 (z -> stopped, and admission by live processes in C_CGATE), but **not shown**: no run had AB_STOP_HELD and AB_SLOTCOUNT | No "holds" to weaken; Q5b stays open |
| Schedules 1, 4, 5, 6, 9 (exit 1), 11, 12 and 14 are not expressible | Right for each, from the code. Two more: schedule 8 reaches only the uncharged part of the cap, and no configuration has `u`, so H3's process-list branch is never exercised | Yes. FX-OUT: 1 and 7 (tainted). FX-CLAIM: 6 and 8. FX-CGATE: 12 and 14. FX-CLOSE: 4, 11 and `u`. FX-PLAN: 5 and 6 |

## 12. The new property forms

- **OneWriterPerAttempt** (MF:1302) is an observer on `wr`. `wr` is set at the claim, at the READY hook, and at
  a card write by a session that is not stale. It can fail: FX-CGATE-X, F 10.
- **NoChargeWithoutFault** (MF:671) is `charged && n.B.k === P.BUD.k`, which means "no fault anywhere on the
  path yet".
  - That is weaker than its rule, "no charge to an attempt unless that attempt had a fault".
  - After any one unrelated fault, a spurious charge is invisible, and at K=2 there is room for exactly one such
    fault.
  - It can fail: FX-CLAIM-II, F 8.
  - INFERRED: under reading (i) no healthy session is crash-fenced, so the weak form hides nothing known there.

## 13. Joint run

Not done (ABLATION section 5). After 9.1 a, it is the only check on FX-OUT's liveness and Slots, so it matters
more than ABLATION says.

## 14. Deliberately not run (part 2)

- **A repeat of one recorded run on the frozen file**, to settle provenance. For example `FX-OUT-X` or
  `FX-CLAIM-X` at 400 MB, comparing states at the bound and trace length. My brief limits me to printing traces,
  and the modeller has priority, so I recommend that the modeller runs it. It decides whether section 9 applies
  to the frozen file at all.
- **FX-CLAIM with a pre-claim stall allowed (9.2 a), and step 7 counting dead folder sessions (9.2 b).** Both
  need model edits, which I may not make. Each could turn an FX-CLAIM "holds" into a failure. If the owner wants
  FX-CLAIM's assumption narrowed, these are the modeller's next runs.
- **Q5b with AB_STOP_HELD and AB_SLOTCOUNT.** It would decide whether the Slots failure is an artefact, but Q5b
  stays open either way.
- **Any trace print through the lane.** Every trace I needed was in the result files.

---

# Part 3 (fidelity-3c): the wake fixes in the frozen model

**What was reviewed.**
- The model: `model/as-built/frozen-wake/{model,check,configs,run-seq}.mjs`, frozen at 21:12. Below, WM is
  `model.mjs` and WC is `configs.mjs`.
- `sha256` of WM is `d527b879...` and of WC is `3e818cb8...`. Both equal the working copy now and the hash
  recorded in `FXW-4R*`, `FXW-5-3000`, `FXW-6-3000`, `FXW-ALL` and `provenance/*`. So those results **are** the
  frozen file.
- Earlier results carry another hash or none (ABLATION-wake, provenance table). I quote them only where
  ABLATION-wake shows the later edits cannot reach them.
- The scope: the FIX-wake rev 4 sections FX-W1, W2, W4, W5 and W6 and "For the modeller"; ABLATION-wake; the
  result files.
- No model run. One trace was read by `sed` from the result files; nothing went through the lane except a JSON
  syntax check.

## 15. Verdicts

| Fix | Verdict | The limit, in one line |
|---|---|---|
| FX-W1 (markers, tri-state) | **Relied on with a stated limit** | Five complete maximal parts, never the whole configuration. Judged inside FXW-4R, which carries a re-alert the design does not have. Its load is on silence; liveness comes from FX-W4. Faults `y` and `o` are in no part, so the exit-67 change is untested |
| FX-W2 (arm first) | **Relied on with a stated limit** | The same five parts, inside FXW-4R. It rests on premises (a) and (b), which are rules about the environment's timing, not mechanisms. Schedules 2 (x,o), 8 and 9 are not covered. The hard-kill path (p6) is open by design |
| FX-W4 (dead-man), as designed | **Cannot be relied on** | NoDeadlock F 8 / AlwaysCanResolve F 7 at one fault x. Once-per-onset never alerts again after the alerted turn dies before call 1 |
| FX-W4 with the candidate re-alert | **Relied on with a stated limit, but it is not the design** | Holds in the five parts. The owner's answer is merged into the dead-man step and is weakly fair, which assumes the owner always answers. WakeToRun is assumed. The list window is a saturating counter. The stuck, busy and unarmed inputs are absent |
| FX-W5 (re-raise) | **Relied on with a stated limit** | Shown only in the one part where the recorded defect lives (`FXW-5__o1cs1.json`, complete, all hold). In the whole run its liveness is masked by the hand-over/u failures (NoDeadlock F 6, EventuallyResolves F 5) |
| FX-W6 (deadlines, B1) | **Relied on with a stated limit: the "holds" is its premise** | NoFalseSuspicion holds by construction. A SLOW child's hang count is capped below the threshold (WM:1136), so under B1 the property cannot fail. Kinds, the transcript-tail reading, idle and the age cap are not modelled |

## 15.1 Modelled as the scripts would do it?

**Time.**
- A tick is one watcher step, and it is enabled only by `tickEnabled`. That is the timeliness oracle of part-1
  gap 1: no tick while a healthy child has something unconsumed.
- A suspend is the pause discount, by `s.pu` or by `gp` under AB_PAUSE_GAP. No C_X runs AB_PAUSE_GAP; only
  FXW-ALL does.
- There are no lease bits, so only L1 is modelled.
- An alarm fires at any time while it sleeps, subject to two premises:
  - (a) an alarm cannot fire between the ensure and the reconcile of one turn (alarm bit 5, WM:1330-1331);
  - (b) at most one current alarm of a coordinator fires inside one of its turns (WM:1328-1330).
- The dead-man is untimed: it may run several times inside one coordinator turn. In the F 9 trace it runs three
  times between reconcile and the plan, where a real dead-man runs every 5 min.
  - Premise (c) stops it counting while a wake is pending (WM:1296-1298), and nothing else stops it.
  - So in the model an alert can arrive sooner than in reality. That adds more wakes, so for liveness it makes
    the model optimistic. The once-per-onset failure does not depend on how fast the alert comes.

**Actors and fairness.**
- The dead-man is proc 3, weakly fair, and one run is one step (WM:1291-1310).
- **The owner's answer to an alert is not an owner step.** `wake(n, n.ce)` runs inside the dead-man step, so it
  sits on proc 3's fairness line. The model assumes the owner always answers, at once.
- The owner's other acts stay on the never-forced environment line, as in part 1. For example, "owner wakes
  coord_i (no wake source of this ce is alive)" exists, but no liveness check relies on it.
- In the FX-W4 trace, the alert's wake targets ce 1 before coord1 exists, so the alert reaches no coordinator.
  coord1 is started by the separate owner step. The effect is the same as the owner answering the alert by
  starting coord1.
- Also in that trace, the dead-man's no-op runs are not steps (a step is pushed only on a change or an alert).
  So "no ordinary action is enabled" is the right reading of a dead-man that keeps running and saying nothing.

**Merges.**
- FX-W2's ensure merges three things: the nonce create, the query, and hold 1. This is justified: only fault u
  changes the list, and a u in between gives `unknown` either way.
- FX-W1's marker is merged with the exit. Justified: the exit follows within milliseconds.
- FX-W5 re-raises at every tick (the untimed form of the capped interval). `stuck_count` is not modelled, so the
  dead-man's `stuck` input does not exist.
- FX-W6 is modelled only as its B1 consequence, reading the child's true mode (SLOW against STUCK). The
  modeller names this, and it is right to.

## 15.2 Ablations

| Ablation | Real? |
|---|---|
| FX-W4: `FXW-4-X`, NoDeadlock F 2 | Real |
| FX-W2: `FXW-4R-X2`, NoSilenceAfterFirstCall F 1 | Real: the recorded M2 gap |
| FX-W1: `FXW-4R-X1`, part k=1,u=1, NoSilenceAfterFirstCall F 5 | Real: schedule W3 |
| FX-W6: `FXW-6-X` = AB-W-HANG-CALLS, NoFalseSuspicion F 6 | Real: CEX-wake 4.5. It removes step 1 and the cap together, so step 1 alone is untested |
| FX-W5: recorded AB-W-ACT-DUE, part o1cs1, EventuallyResolves F 13 | Real, but compared across model versions: the AB-W-ACT-DUE result is from the part-1 frozen model, and `FXW-5__o1cs1` has no hash |

In the W1 and W2 ablations, the flag removes only that fix (WC:137-144).

## 15.3 "Holds" and configurations

- No configuration that contains FX-W2 completes whole. FXW-4 at 3000 MB stopped BOUNDED at 23.2 M states.
- So the FX-W1, W2 and W4 verdicts come from five parts: k=1,x=1; k=1,u=1; k=2,u=1,x=1; k=2,x=2; k=2,u=1,l=1.
  - All five are complete in FXW-4, FXW-4R, -X1 and -X2.
  - Four are complete in -S2.
  - Two are complete in -B1, and liveness was not checked in its three BOUNDED parts.
- These parts contain the mechanisms the defects need: C_W12 is WA, which is every wake AB flag except
  ACT_DUE, PAUSE_GAP and HANG_CALLS. They leave out faults o, y and cs/cv/cd, and l with x.
- FX-W5 and FX-W6 complete whole at 3000 MB. They contain their as-built flag, but the four liveness failures
  from the hand-over/u path mask everything else.

## 15.4 My part-1 wake gaps

| Gap | State |
|---|---|
| 1. `tickEnabled` timeliness | Open. Under FX-W6 it is the B1 premise |
| M1: alarm token abstracted, post-violation alarm cap | Open, unchanged |
| M2: the coordinator always obeys the arm request except by x | Open. Fault `o` is in no wake part |
| M3: start-session and bind merged in `rowAct` | Open |
| 12. `gp` across a watcher restart | Closed behind AB_GP_RESTART, but on only in the BOUNDED FXW-ALL |
| 11. endturn without a list counts any watcher.lock holder | Open |
| D6 p1, never reconciles | Open (needs FX-W3) |
| D6 p3/p3b | Closed by premises (a) and (b), which are rules the design must state |
| D6 p6 | Modelled as the hard-kill branch; open by design |
| "A complete as-built configuration" | Still none |

## 15.5 The modeller's four claims

| Claim | My finding |
|---|---|
| FX-W4 has a design gap at one fault, and a repeated alert closes it | **Right.** FXW-4 part k=1,x=1: hand-over, two alarm-less runs, an alert, then coord1's turn dies before call 1. The cause stays, once-per-onset stays silent, and NoDeadlock fails (F 8 is in another part). FX-W3's `unarmed_turns` would not catch it either: a turn that dies before call 1 writes no `turn.json` (INFERRED). "Closes it" holds within the five parts at K=2, with the owner assumed to answer every alert. The re-alert's pace (every 2 runs = 10 min, for ever while the cause holds) is an owner decision |
| A turn ending through the hand-over's exit 2 skips endturn (no-silence F 9), and only the two-slot branch removes it | **Right in the model, and among the modelled branches.** FXW-4R k=1,u=1 shows F 9 (I read the trace). B1's same part, BOUNDED, has the same F 9. S2's part is complete with no silence. But "turn ends with no endturn after exit 2" is the coordinator's brief, not a script (handover.mjs:271-276 only exits 2). That is INFERRED, as in Q5b part 2. The smaller change the modeller names (endturn after exit 2) is a third remover that was not run. S2 adds its own p6 silence (F 1) |
| FX-W6 holds only under its B1 bound | **Right, and stronger than stated.** In the model the bound *is* the holds (WM:1136), so the run cannot test whether B1 is enough. The run does not see a healthy call misread as the `model` kind (unreadable tail, deadline 10). No kind exists in the model |
| The joint BOUNDED run shows no interaction failure | **True, but it shows little.** 2,579,912 states, 1,350,125 expanded, 344 MB, 13 s. BFS levels 0-13 complete, level 14 partly. So no safety trace longer than 13 steps was seen. The fence fixes' own traces run to 16-17 steps (FX-CLAIM-X 16, FX-CLOSE-X EventuallyResolves 17, Q5b 15). Each fence configuration alone needed 3-17 M states, against 2.6 M here for all of them together. Liveness counts unexpanded states as able to resolve (check.mjs:189), so an interaction is visible only if its whole dead end or cycle lies inside the expanded part. Not in the model at all: FX-W3, FX-W7, FX-REDO, Q5b, reading (ii), and 9.1 a's FX-OUT/FX-CLOSE interaction past step 13 |

## 15.6 Does the provenance rerun settle my part-2 doubt?

**For the four "holds" I relied on: yes.** On the final model (`d527b879`) with every wake flag off,
FX-OUT-PLAN, FX-CLOSE, FX-CGATE (Q5a) and the three FX-CLAIM r parts reproduce exactly: states, transitions,
completeness and every verdict (`provenance/*.json`).

**Partly for the rest.** Three things are not re-run:
- the 40 FX-CLAIM parts at 1500 MB;
- the ablation and sub-flag runs;
- Q5b.

The equality of the r parts makes a difference there unlikely (INFERRED).

The rerun also proves the final file, not the 20:36 frozen fence file. That no longer matters: the frozen-wake
file is now the reference, and it contains the fence code.

## 15.7 Deliberately not run (part 3)

- **FXW-4R with the hand-over exit 2 followed by endturn.** It would show a third remover of the F 9 silence. It
  needs a model edit, and the decision belongs with FX-W3's brief, which is not modelled.
- **FX-W6 with step 1 alone.** It would split the ablation, but it changes no verdict: B1 carries the holds.
- **The joint run above 400 MB.** The cap is my brief's, and only the modeller may run larger.

## 16. Closing: round 3 as a whole

- **As built:** every D-defect of both groups is in the model. After the part-1 and part-2 corrections most are
  real traces (D4a, D4c, D3 long form, D1, D5, the M2/M3/M5 gaps); D7-SLOTS was an artefact. `tickEnabled`,
  `eligibleHO` and admission without AB_SLOTCOUNT still read true state. AB-ALL and FXW-ALL are both BOUNDED.
- **Fixes:** every fence fix holds in its own configuration, with a real ablation. FX-OUT and FX-CLAIM hold for
  safety only, and FX-CLAIM needs a stronger lease reading than stated. Q5b is open. FX-W1, W2 and W5 hold in
  parts under stated premises; FX-W6 holds only as its premise; FX-W4 as designed fails at one fault. FX-W3,
  W7 and REDO are not modelled.
- **R57 still needs:** joint complete runs (FX-OUT with FX-CLOSE; the wake fixes with the fence hand-over); the
  pre-claim stall and step 7; endturn after hand-over exit 2; the owner's re-alert ruling; premises (a)-(c), B1
  and PROBE 5 stated and measured; part-1 gaps 1, 4, 5 and 11.
