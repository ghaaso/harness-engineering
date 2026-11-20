// Explicit-state model of Layer 1 (execution) of RESEARCH-TREE-PROTOCOL-v2, rules R1-R12, with the
// adopted fixes modelled as designs (not as switches that delete a bad branch). Plain Node, no packages.
//
// Granularity. Every exec script (replace's fence, stop, admit, the start tool call, bind, commit,
// drain, hand-over, endturn) is one atomic step, which is what R1's run lock gives. A coordinator turn
// is: wake -> status --reconcile + read + plan (one step), then one step per planned op, so children,
// watchers, alarms and the owner interleave between ops and the plan can go stale. The coordinator's
// turn can die between any two ops (fault x). Time is abstract: a watcher tick waits until every healthy
// current child has made a model call since the last tick (the h/c timeliness assumption), except for
// a child that a pause froze (pu). No wall clock is read anywhere.
//
// Unusual events are budgeted and charged when the action RUNS: k total, and per kind
// c child fault, z stop unconfirmed, p pause, l lost wake, x coordinator turn dies, t torn commit,
// r host reset. Planned events are not faults and are budgeted apart: h planned task hand-overs,
// d coordinator hand-overs (drain).

export const ST = { P: 0, A: 1, C: 2, F: 3 };
export const STEP = { NONE: 0, FENCED: 1, STOPPED: 2, ADMITTED: 3, RUN: 4 };
// MODE.IDLE (as-built, AB_START_UNFENCED): a session started on a folder whose epoch is no longer current or
// whose row is not open; guard-hook.mjs:394-409 denies every tool call it makes, so it never writes, but its
// process lives until someone closes it (nobody knows its session id)
// MODE.SLOW (as-built wake group, AB_HANG_CALLS / D5): a HEALTHY child in a call longer than the hang threshold, or
// waiting for its own background job (no new assistant message); it returns to OK by an environment step
export const MODE = { OK: 0, STUCK: 1, LOOPS: 2, LOOPV: 3, DEAD: 4, IDLE: 5, SLOW: 6 };
// CRASH (fence fixes, FX_PLAN): `replace-fence --reason crash` after a start lease expired with no claim (a failure reason)
export const RSN = { FIRST: 0, STALL: 1, HANG: 2, LOOP: 3, HO: 4, CRASH: 5 };
// SR/SV (as-built, AB_COMMIT_CLOSE): stop.mjs request and verify of a committed row's last attempt
// AR/SW/SA (as-built wake group): the coordinator's own background tool calls that start the alarm after reconcile's
// exit 1 (AR, AB_ARM_SPLIT), and the watcher / the alarm after endturn's missing reasons (SW, SA, AB_ENDTURN_SPLIT)
export const OP = { F: 1, S: 2, A: 3, T: 4, B: 5, M: 6, D: 7, H: 8, Y: 9, E: 10, SR: 11, SV: 12, AR: 13, SW: 14, SA: 15, EN: 16, RC: 17 };
const RNAME = ['first', 'stall', 'hang', 'loop', 'planned hand-over', 'crash (start lease expired, no claim)'];
const MNAME = ['ok', 'stuck in a slow call', 'loops (same call)', 'loops (varied calls, no progress)', 'crashed', 'idle (every tool call denied)', 'healthy but slow (a call longer than the hang threshold, or waiting on its own job)'];
// u (as-built, AB_PROCLIST): the process list becomes unavailable (proc.list fails) until an environment step restores it
// o (as-built wake group, AB_ACT_DUE): a turn reaches endturn (and acknowledges) without taking the acts it planned
// y (as-built wake group, AB_ARM_SPLIT): run/alarm.json is unreadable (reconcile and endturn exit 67) until an alarm
//   registers again (watch.mjs a6 rewrites it)
export const FAULTS = ['cs', 'cv', 'cd', 'z', 'p', 'l', 'x', 't', 'r', 'u', 'o', 'y', 'q', 'w', 'm', 'g']; // child stuck, child loops, child crashes, ...
// s (planned, not a fault; AB_HANG_CALLS): one healthy slow call per run
export const KINDS = [...FAULTS, 'h', 'd', 's'];
const PLANNED = (k) => k === 'h' || k === 'd' || k === 's';
const MKIND = { 1: 'cs', 3: 'cv', 4: 'cd' };

// one process checks one configuration: XB = the wake-fix state byte is encoded (set by makeParams)
let XB = false;
let BX = false; // S2.2: the build state bytes are encoded (any BQ5_* or BLD_* flag on; set by makeParams)
export function makeParams(over = {}) {
  const base = {
    FIELDS: 2, R: 1, NMAX: 2, HMAX_TASK: 1, C_STALL: 1, H_HANG: 2, LOOP: 3,
    BUD: { k: 3, cs: 2, cv: 2, cd: 2, z: 1, p: 2, l: 2, x: 1, t: 1, r: 0, u: 0, o: 0, y: 0, h: 1, d: 1, s: 0 },
    // mechanisms of the adopted design (an ablation switches one off)
    FENCE_EPOCH: true,   // R2: commit.mjs accepts only the staging whose epoch equals the table's
    FENCE_CE: true,      // R2/R6: --ce on every writing script; a stale coordinator ends its turn
    COMMIT_WX: true,     // R3/R14: COMMIT record by exclusive create; identical repeat no-op, other refused
    CUT: true,           // R2/R7: staging cut recorded at the fence; restore reads only the prefix
    PROGRESS: true,      // R5: stall = c model calls with no fall in V; false = liveness only
    WATCHER_LOCK: true,  // R4: watcher.lock wx for the watcher's life; endturn starts one only if no live holder
    ALARM: true,         // R6: second wake source (watch.mjs --alarm)
    ACK_READ: true,      // R6: endturn writes acked_seq = the seq read at turn start (false: ledger head at endturn)
    READY_WINS: true,    // R5/R7: replace (failure reason) re-checks under the lock for a READY of the epoch
    STOP_ON_LIMIT: true, // R8: limit path fences, stops, then marks failed
    ADMIT_LIVE: true,    // R10: admission counts live child processes, stop-unconfirmed included (false: table rows)
    DRAIN: true,         // R12: from W*_coord every start is blocked; hand-over only when no live child process
    RECONCILE: true,     // R3: status --reconcile at every turn start (transcript => start recorded; COMMIT => committed)
    // readings of facts the design does not settle
    RESTART_LIMIT: true, // R8: replace.mjs takes the limit path once restarts reach R
    KILL_WAKES: true,    // a background command the session started wakes it when it exits, killed or not (fact 2)
    // a notification that arrives between two tool calls of a turn is consumed by that turn; one that arrives
    // during or after the last call (endturn, handover) starts a new turn (wake() above)
    // candidate fixes for flaws that remain with the design (all off = the adopted design)
    FIX_ARM_BY_WRITE: false,   // endturn re-arms a live alarm by writing a token it reads; never kills it
    FIX_ARM_AT_START: false,   // reconcile (first act of every turn) starts an alarm when none of this ce lives
    FIX_PAUSE_DISCOUNT: false, // a tick whose wall gap shows a pause does not count toward hang (one-sided clock use)
    FIX_ADMIT_RESERVE: false,  // admission also counts rows admitted but not yet started
    FIX_READY_ALL: false,      // the READY re-check also applies to a planned hand-over
    FIX_WATCHER_ACTIONABLE: false, // the watcher exits whenever status shows an act for the coordinator (the planner's own
                               // predicate: events after acked_seq, a row mid step machine and not blocked, a hand-over due, synthesis due)
    FIX_ENDTURN_RECHECK: false,// endturn, under the run lock, exits 1 when the ledger head or a READY changed since the turn's read
    // ---- as-built fence group (round 3, helper MA; see model/as-built/CEX-fence.md). All off = the model above.
    // Prefix AB_ = "as built"; the wake group (SEM-wake) adds its own AB_* flags beside these.
    AB_READY_SPLIT: false,     // M6 as built: the child's READY is two steps, the hook's epoch check (rh) then the write
                               // landing (p=2), no run lock; a READY in flight reads as absent to replace's re-check
    AB_START_UNFENCED: false,  // D3/CE gap: the session-tool start is not a script and takes no --ce; a stale coordinator
                               // may plan it from what it reads; one yield point before every start
    AB_TRANSCRIPT_LAG: false,  // D4b: a started session's transcript becomes visible later (tv); reconcile and stop verify
                               // read the transcript; the session id is known only to the turn that started and bound it
    AB_SLOTCOUNT: false,       // M4 as built: admission and the hand-over count slots as lib.slotCount does, from the
                               // table, the attempts' stop state and transcripts (process lines never match: worst reading)
    AB_COMMIT_CLOSE: false,    // D4c: a committed row's last attempt holds its slot until stop request + stop verify;
                               // a row committed at `started` can never be stop-requested (stop.mjs:278)
    AB_HANDOVER_NOKILL: false, // handover.mjs:283-297: the old watcher and alarm are not killed; they exit (and wake the
                               // old coordinator) at their next check
    AB_NO_COMMIT_RECONCILE: false, // delete the reconcile branch "COMMIT record => committed" (no script has it)
    AB_PROCLIST: false,        // M4 unknown: fault u makes the process list unavailable: admission refuses (slots-unknown),
                               // handover raise and stop verify exit 2
    // ---- as-built wake group (round 3, helper MB1; see model/as-built/CEX-wake.md). All off = the model above.
    // The process-list fault u and the bit pl are shared with AB_PROCLIST; any flag below that reads pl enables u.
    AB_ALARM_SUPERSEDE: false, // M1: starting an alarm while one of this coordinator lives supersedes it (no kill); the
                               // superseded alarm exits 0 at the end of its own sleep, and that exit wakes (W:778-788)
    AB_ALARM_MIDTURN: false,   // fidelity: the current alarm's period runs from its own start, so it may exit during a
                               // turn (the exit is consumed by that turn, HARNESS-FACTS 2), not only while idle
    AB_ARM_SPLIT: false,       // M2: reconcile exits 1 alarm-missing (by its own view: no current alarm, or no process
                               // list); the alarm start is a separate op AR that a dying turn can miss; exits 75
                               // (stale run.lock, no list) and 67 (alarm.json unreadable, fault y) issue no arm request
    AB_ENDTURN_SPLIT: false,   // endturn only checks and acks; the watcher and alarm starts are later ops SW/SA; with no
                               // process list and a record present it exits 2 and reports nothing (S:652-654)
    AB_EXIT2_START: false,     // owner branch B1 for endturn exit 2: start the watcher and the alarm anyway (B2: nothing)
    AB_ACT_DUE: false,         // M3: class 17 keyed per row act and raised once per onset, silenced by the coordinator's
                               // ack; acts computed from the table with the empty-list slot count; fault o
    AB_PAUSE_GAP: false,       // M5: the discount reads the wall gap since the last evaluation (gp), not the fault bit;
                               // a pause fault is long (gap seen) or short (missed: timer branch b)
    AB_HANG_CALLS: false,      // D5: hang counts new assistant messages only: a healthy slow child (planned s) is not
                               // waited for by the tick; the first counted tick of a new epoch adds one hang tick
    AB_X_KILLS_BG: false,      // fact branch (unknown, SEM-wake 0): a coordinator crash kills its background commands
    AB_FAIR_IDS: false,        // fidelity: weak fairness per watcher and per alarm (one id per process, not one shared)
    WAKE_PROPS: false,         // check WakeSourceAlive, WakeChainBounded, AlarmsBounded (and report the D6 path tags)
    // ---- D7, non-vacuous forms of weak properties (the old forms stay checked as they were)
    D7_RESTART: false,         // RestartLimitGhost: fences with a failure reason counted from the epochs (gf), no admission
                               // after more than R of them
    D7_FREEZE_RS: false,       // mutation for the demonstration: replace.mjs never increments the restart counter
    D7_STALE: false,           // StaleWrites: a step of a coordinator whose ce is stale changes the table or the sessions
    D7_HANDOVER_CAS: false,    // handover.mjs as built: a CAS on the ce it read (script check, independent of --ce)
    D7_COMMIT: false,          // CommitRecordStable: once a COMMIT record names an epoch, it never names another
    D7_SLOTS: false,           // SlotsProc / SlotsR10: a READY child's process lives until a close; count processes of any p
    D7_LOOPS: false,           // fault cv may also enter LOOPS (same call); LoopReported: reported by the first tick after
                               // LOOP same calls
    D7_NO_LOOP_RULE: false,    // mutation for the demonstration: the loop class (sig >= LOOP) is never assigned
    // ---- round 3, the fence-group FIXES (helper MB2a, model/as-built/ABLATION-fence.md; FIX-fence.md rev 4 + FIX-JOIN.md).
    // Prefix FX_ (the wake group's fixes use FIX_ALARM_MARKER, FIX_ARM_FIRST, ... per FIX-JOIN 2a). All off = the model above.
    // Each main flag acts only through the steps its fix adds; a sub-flag acts only while its main flag is on.
    FX_OUT: false,             // FX-OUT: the outcome log. The child's READY hook creates a ready slot (t.ol=1) by exclusive
                               // create, then READY.json lands (a copy no decision reads); the fence refuses (exit 5) on an
                               // uncommitted ready slot for every reason but first, writes a fenced slot (t.ol=2, reason
                               // t.orr) before its CAS (a death between = a torn fence), retries only with the same reason
                               // (else exit 65); commit, the watcher and the planner read the slot (R-a, R-b)
    FX_CLAIM: false,           // FX-CLAIM: the child hook's first tool call creates claim.json (t.cm=1, s.ch); any other
                               // session of the attempt is denied and idles; the fence writes a tombstone (t.cm=2) when no
                               // claim exists (a no-start fence, uncharged while ns < H_NOSTART); reconcile starts by the
                               // claim (a single transcript stays a second source); bind needs the claim and its holder;
                               // stop of a tombstoned attempt confirms at once; slotCount +1 per visible non-holder session
                               // with no close record (step 7, non-holder reading); one yield between the start and the bind
    FX_CGATE: false,           // FX-CGATE: (a) a session that is not the current coordinator's may only Read: a stale
                               // coordinator's session-tool start is refused; (b) the start hook needs the row admitted at E
                               // and creates start.json (t.sj; a second start is denied start-issued; it starts the lease);
                               // (c) a successful close writes a close-done record (s.dn); the owner's end of a zombie writes
                               // one (owner act `closed`). The nonce bind is merged into the successor's start (section F)
    FX_CLOSE: false,           // FX-CLOSE: stop-request accepts a row committed at `started`; with FX_CGATE, stop verify
                               // confirms only when every live session of the attempt has a close-done record, else the row
                               // stays stop-requested and verify_rounds (t.vr) grows; the owner is asked at vr >= 3
    FX_PLAN: false,            // FX-PLAN: one planner act per row, for status and the watcher: owner at vr >= 3; a torn
                               // fence is retried with its reason; committed at started -> stop-request; admitted: claim ->
                               // bind, start.json with the lease running -> wait, lease expired -> fence crash, else start
    FX_PLAN_STARTWAIT: true,   // sub-flag (rev 4, P2): `started` with no claim follows the admitted rule (off: bind, which
                               // exits 6 not-claimed for ever)
    FX_PLAN_OWNEREND: true,    // sub-flag (rev 4, P1): the owner rule ends once every needed close is recorded (off: owner
                               // for ever once vr >= 3)
    FX_Q5B: false,             // owner branch Q5b (open question 5): the coordinator has no session tools; the owner starts
                               // an admitted row's session by hand (once) and the closes are the owner's (merged, see
                               // ABLATION-fence.md); with FX_PLAN the planner answers `owner` for those acts
    FIX_ENDTURN_ALWAYS: false, // FIX-wake rev 5 N2 (brief rule, compliant coordinator): every turn's last call is endturn, also
                               // after handover exit 2 and after reconcile's exit 75 (endturn's own exit 75 still ends the turn)
    FX_R5_DEADCOUNT: false,    // final pass (FIX-fence rev 5 point 1 check): step 7 counts a visible folder session with no
                               // close-done record whether it is alive or dead (the script cannot tell; no merged close)
    FX_R5_ORPHAN: false,       // rev 5 point 1: a tombstone confirms at once only with no visible folder session left; a dead
                               // visible one gets its done record from the close's "no such session" (H3: list answers)
    FX_LEASE_NOBOUND: false,   // modeller's reading (ii) of FX-CLAIM's timing assumption: the start lease may expire before
                               // a healthy started session's first tool call (off = reading (i): it expires only when no
                               // live healthy unclaimed session of the attempt exists)
    FX_PROPS: false,           // check OneWriterPerAttempt and NoChargeWithoutFault (observers, no behaviour)
    H_NOSTART: 2,              // thresholds H_nostart (FX-CLAIM step 2)
    // ---- FIDELITY-3 gaps closed by MB2a (each off = the model above)
    AB_STOP_HELD: false,       // gap 1 (FIDELITY-3 sec 1, sec 7 item 1): a stop (fenced row, OP.S) and a committed close
                               // (OP.SR/SV) are request (+ closes + the growth sample) then a LATER verify that needs
                               // stop_verify_deltas = 2 watcher ticks after the sample (stop.mjs:362, 367-399); an
                               // unconfirmed verify (fault z: growth) keeps the row stop-requested (stop.mjs:441-446) and
                               // resamples; the owner's end of a zombie no longer confirms the stop (the next verify does).
                               // The tick that completes the wait raises act-due stop-verify (W:543-567), which wakes
    AB_STALE_SNAPSHOT: false,  // gap 2 (FIDELITY-3 sec 3 D3): a stale coordinator plans from status.json as of its last
                               // write (t.se: the epoch a row showed admitted in it), written by the current coordinator's
                               // reconcile and, as an alternative, by a status build right after its admit
    // ---- round 3, the wake-group FIXES (helper MB2b, model/as-built/ABLATION-wake.md; FIX-wake.md rev 4 + FIX-JOIN.md).
    // All off = the model above (the extra state byte `x` exists only when one of them is on).
    FIX_ARM_FIRST: false,      // FX-W2: the turn's first call is `watch --alarm --ensure` (op EN: register into a free slot,
                               // else `present`), then reconcile is its own op RC (yield before it) that counts the live
                               // slots (confirmed / arm-unconfirmed); armAtStart (alarm-missing + AR) is gone; endturn's dead
                               // alarm is answered by another ensure
    ALARM_SLOTS: 1,            // owner branch S1 (1) / S2 (2) of FX-W2
    FIX_ALARM_MARKER: false,   // FX-W1: an alarm writes its exit marker just before it exits (merged with the exit); every
                               // reader is tri-state (marker or listed-gone = dead, no list and no marker = unknown, never
                               // dead); endturn exits 1 on any dead source and 2 only when none is dead; alarm.json corrupt is
                               // an anomaly, not exit 67
    FIX_DEADMAN: false,        // FX-W4: status --deadman, a periodic task outside the tree (proc 3): runs_no_alarm (list
                               // answers, no alarm of the current ce alive) and a list-failure window; alert at >= 2 / >= 3,
                               // once per onset; the alert reaches the owner, who wakes the current coordinator
    FIX_ACT_RERAISE: false,    // FX-W5 (branch R1): the watcher raises an acknowledged act-due again while its condition
                               // holds (row acts: aks back to 1; a hang/stall/loop event re-appended when acked and still true)
    FIX_OP_DEADLINE: false,    // FX-W6 (branch B1): the first tick of an epoch counts nothing; an in-call child's hang is
                               // judged against its kind's deadline, which under B1 a healthy call ends within (the healthy
                               // slow child's count is capped below it: the stated bound, an environment premise)
    CAND_REALERT: false,       // the modeller's candidate for the FX-W4 gap found here (ABLATION-wake 1): re-alert while the
                               // cause persists two runs after an alert. Not part of the design; used only to isolate FX-W1/W2
    AB_GP_RESTART: false,     // FIDELITY-3 gap 12: a newly started watcher's uncounted first evaluation rewrites
                               // last_tick_at (W:729), so the wall gap (gp) does not survive a watcher restart
    WFX_PROPS: false,          // check NoSilenceAfterFirstCall: WakeSourceAlive except a death before the turn's first tool
                               // call (tag p0, FX-W2's stated scope) and the owner's cases
  };
  // ---- S2.2: the model as built on `build` (MAP-build.md). Every flag below off = the model above, state for state (the
  // extra state bytes exist only when one of them is on). New fault kinds: q a start called on a turn the owner did not
  // type, w a false relay of the owner's `closed`, m a child that imitates activity, g a script dies between its row
  // write and its ledger line (each 0 in every budget above).
  Object.assign(base, {
    BQ5_OWNER_TURN: false,     // branches row 1 (the app's rule): a start works only on a turn the owner typed; otherwise the
                               // brief leaves it due. The owner types while the status view shows a start due (owner step,
                               // weakly fair: the premise); boot, the dead-man's alert (H4 B) and the owner's recovery wake
                               // are owner-typed turns. Fault q: the coordinator calls the start anyway; the app refuses it
    BQ5_REFUSED_SJ: false,     // unrecorded fact (branches thin item 1): the start hook runs before the app's refusal and
                               // leaves start.json (its lease runs out: a no-start crash fence); off: nothing is written
    BQ5_NO_OWNER: false,       // ablation of the owner's step: the owner never types (starts then rest on nothing)
    BLD_IF_UNCLAIMED: false,   // the lease act `replace-fence --reason crash --if-unclaimed` (FX-PLAN, FX-CLAIM): a session
                               // claim at its check, which is first in the hold, refuses it (claimed-late, nothing written);
                               // a torn fence's retry carries no flag (departures/CLAIM.md 1, refute/CLAIM.md:50-56)
    BLD_LEASE_WINDOW: false,   // CLAIM's window as built: a claim lands in the hold after the check and before the tombstone
                               // create; the fence goes on, charged as crash
    BLD_LEASE_ORDER: false,    // the order that closes it (refusals, tombstone, slot): the tombstone create meets the claim
                               // and the fence is refused with nothing written
    BLD_CLOSE_IDGAP: false,    // CLOSE's id gap as built (departures/CLOSE.md 1): the hook names its close records by the app's
                               // id and verify looks them up by the CLI id, so no record of a coordinator's close counts; the
                               // owner's `closed`, relayed by the coordinator (asked at the first close-missing, brief 5c),
                               // does. Fault w: the coordinator relays `closed` for a session the owner did not close
    BLD_VERIFY_RECORDS: false, // stop verify (a)/(b) as built (stop.mjs closesMissing, lib.closeDoneCounts): every nameable
                               // session (claim holder, folder transcript) needs a counted record, alive or dead
    BLD_STOP_INTERRUPT_ONLY: false, // unrecorded fact: stop_session only interrupts a turn (its own description); off: it ends
                               // the process (F-P10a's reading)
    BLD_ARCHIVE_APPROVAL: false, // unrecorded fact: archive_session waits for the owner's approval (outside auto and bypass);
                               // with BLD_STOP_INTERRUPT_ONLY a coordinator's close may leave the session alive (no fault)
    BLD_PROPS: false,          // check RefusedStartNotCharged and LeaseFenceClaimed (observers, no behaviour)
  });
  base.BUD = { ...base.BUD, q: 0, w: 0, m: 0, g: 0 };
  const P = { ...base, ...over, BUD: { ...base.BUD, ...(over.BUD || {}) } };
  XB = !!(P.FIX_ARM_FIRST || P.FIX_ALARM_MARKER || P.FIX_DEADMAN);
  BX = Object.keys(P).some((k) => /^(BQ5|BLD)_/.test(k) && P[k] === true);
  return P;
}

// ---------------------------------------------------------------- state
export function initial(P) {
  const T = [];
  // as-built row fields: cl = close state of a committed row's last attempt (0 none/confirmed, 1 held, stop not
  // requested, 2 stop requested, 3 committed at `started`: never stoppable); bn = the row was bound (not only started)
  // wake-group row fields: ad = the act-due (class 17) act last raised for the row (0 none; 1 replace-fence first, 2
  // replace-start, 3 stop-request, 4 stop-verify, 5 start-session/bind of admitted, 6 bind of started); aks = the ack
  // state of the row's keys (0 acked or none, 1 raised and not yet read by a turn, 2 read by the turn in progress);
  // ry = the row's READY (class 11) was raised. D7: gf = fences with a failure reason (ghost count from the epochs)
  // fence fixes (current attempt only; reset at every new epoch): ol = outcome log (0 empty, 1 ready slot, 2 fenced slot),
  // orr = the fenced slot's reason, cm = claim.json (0 none, 1 a session claim, 2 tombstone), sj = start.json exists, le =
  // its lease expired; per row: ns = nostart, vr = verify_rounds
  for (let f = 0; f < P.FIELDS; f++) T.push({ st: 0, ep: 0, step: 0, rs: 0, hv: 0, fail: 0, cut: 0, ctn: 0, ncr: 0, cmE: -1, rsn: 0, wep: 0, cs: 0, hs: 0, rep: 0, cl: 0, bn: 0, ad: 0, aks: 0, ry: 0, gf: 0, ol: 0, orr: 0, cm: 0, sj: 0, le: 0, ns: 0, vr: 0, sq: 0, vt: 0, se: 0, rq: 0, sl: 0, ag: 0, ac: 0, ax: 0 });
  // pl: the process list is available (as-built AB_PROCLIST; always 1 otherwise)
  // wake group: ar = alarm.json names the current ce; rl = a stale run.lock is left; cj = alarm.json is unreadable;
  // gp = a long pause happened since the last evaluation (the wall gap the next tick sees); ra = run-level act-due
  // raised (bit 0 handover, bit 1 run-terminal); rk = their ack state (as aks). C[i].ch = the supersede chain (D1)
  return { ce: 0, ws: 0, syn: 0, to: 0, pl: 1, ar: 0, rl: 0, cj: 0, gp: 0, ra: 0, rk: 0, x: 0, y: 0, seq: 0, ack: 0, B: { ...P.BUD }, T, S: [], W: [], A: [], E: [], C: [{ ce: 0, wk: 1, boot: 1, dr: 0, rd: 0, pc: null, ch: 0, om: P.BQ5_OWNER_TURN ? 1 : 0, ot: 0 }] };
}
const cloneT = (t) => ({ st: t.st, ep: t.ep, step: t.step, rs: t.rs, hv: t.hv, fail: t.fail, cut: t.cut, ctn: t.ctn, ncr: t.ncr, cmE: t.cmE, rsn: t.rsn, wep: t.wep, cs: t.cs, hs: t.hs, rep: t.rep, cl: t.cl, bn: t.bn, ad: t.ad, aks: t.aks, ry: t.ry, gf: t.gf, ol: t.ol, orr: t.orr, cm: t.cm, sj: t.sj, le: t.le, ns: t.ns, vr: t.vr, sq: t.sq, vt: t.vt, se: t.se, rq: t.rq, sl: t.sl, ag: t.ag, ac: t.ac, ax: t.ax });
// as-built session fields: rh = READY hook passed, write not landed; tv = transcript visible; bd = its session id
// is recorded (bound); sc = its attempt's stop is confirmed. Fence fixes: ch = holds the attempt's claim (FX_CLAIM);
// dn = a close-done record names it (FX_CGATE); wr = it has passed a tool call that writes (FX_PROPS, OneWriterPerAttempt)
const cloneS = (s) => ({ f: s.f, ep: s.ep, m: s.m, p: s.p, pf: s.pf, tc: s.tc, al: s.al, z: s.z, mv: s.mv, nc: s.nc, sig: s.sig, pu: s.pu, par: s.par, hb: s.hb, hd: s.hd, rh: s.rh, tv: s.tv, bd: s.bd, sc: s.sc, ch: s.ch, dn: s.dn, wr: s.wr, ap: s.ap });
export function clone(x) {
  return {
    ce: x.ce, ws: x.ws, syn: x.syn, to: x.to, pl: x.pl, ar: x.ar, rl: x.rl, cj: x.cj, gp: x.gp, ra: x.ra, rk: x.rk, x: x.x, y: x.y, seq: x.seq, ack: x.ack,
    B: { ...x.B },
    T: x.T.map(cloneT), S: x.S.map(cloneS), W: x.W.map((w) => ({ par: w.par, ph: w.ph, lk: w.lk, gap: w.gap })),
    A: x.A.slice(), E: x.E.map((e) => ({ f: e.f, ep: e.ep, cls: e.cls, seq: e.seq })),
    C: x.C.map((c) => ({ ce: c.ce, wk: c.wk, boot: c.boot, dr: c.dr, rd: c.rd, pc: c.pc ? c.pc.map((o) => o.slice()) : null, ch: c.ch, om: c.om, ot: c.ot })),
  };
}
// alarms: A holds one byte per alarm process: bits 0-2 the coordinator index that started it, bit 3 superseded
const aPar = (a) => a & 7;
const aSup = (a) => (a >> 3) & 1;
const alarmsOf = (n, i) => n.A.filter((a) => aPar(a) === i).length;
// ---- wake fixes (MB2b). n.x: bits 0-1 slot records of the current ce (FX-W2; without it bit 0 is unused and alarm.json is
// n.ar), bits 2-3 exit markers of the slots' alarms (FX-W1), bits 4-5 dead-man runs_no_alarm, bits 6-7 its list-failure
// window (FX-W4). n.y: bit 0 the dead-man has alerted for the present onset. Alarm byte bit 4 = its slot (FX-W2)
const aSlot = (a) => (a >> 4) & 1;
const slotRec = (n, k, P) => (P.FIX_ARM_FIRST ? (n.x >> k) & 1 : k === 0 ? n.ar : 0);
const slotMk = (n, k) => (n.x >> (2 + k)) & 1;
const setBit = (n, b, v) => { n.x = v ? n.x | (1 << b) : n.x & ~(1 << b); };
// the alarm process a slot names is alive (not superseded); without FX-W2 the current alarm of alarm.json
const slotProc = (n, k, P) => n.A.some((a) => aPar(a) === n.ce && !aSup(a) && (!P.FIX_ARM_FIRST || aSlot(a) === k));
// lib.liveness (FX-W1 step 1): 0 dead, 1 alive, 2 unknown. Without the marker: as built, a record and no list is unknown
function slotVerdict(n, k, P) {
  if (!slotRec(n, k, P)) return 0;
  if (P.FIX_ALARM_MARKER && slotMk(n, k)) return 0;
  if (!n.pl) return 2;
  return slotProc(n, k, P) ? 1 : 0;
}
// the process list is modelled (fault u, bit pl) when any flag reads it
const PLU = (P) => P.AB_PROCLIST || P.AB_ARM_SPLIT || P.AB_ENDTURN_SPLIT;
const term = (st) => st === ST.C || st === ST.F;
export const isTerm = term;
// the session of the current attempt; with FX_CLAIM the claim holder first (ch is 0 everywhere when FX_CLAIM is off)
export const cur = (n, f) => n.S.find((s) => s.f === f && s.ep === n.T[f].ep && s.ch) || n.S.find((s) => s.f === f && s.ep === n.T[f].ep);
const liveCount = (n) => n.S.filter((s) => s.al && s.p < 2).length;
const quiescent = (n) => !n.S.some((s) => s.al && s.p < 2);
// R12: quiescence = no live child process of any epoch; the ablation reads the table (nothing at run/admitted)
// as built (AB_SLOTCOUNT): handover raise refuses while lib.slotCount > 0 (handover.mjs:277-281) and while a row at
// admitted/started/bound has a stop not confirmed (318-330); slotCountAB covers both
const readyToHandOver = (n, P) => (P.DRAIN ? ((P.AB_SLOTCOUNT || P.AB_COMMIT_CLOSE) ? slotCountAB(n, P) === 0 : quiescent(n)) :!n.T.some((t) => t.st === ST.A && (t.step === STEP.RUN || t.step === STEP.ADMITTED)));
function mkSession(f, ep, par, tc, tv = 1, bd = 0, m = 0) { return { f, ep, m, p: 0, pf: 0, tc, al: 1, z: 0, mv: 0, nc: 0, sig: 0, pu: 0, par, hb: 0, hd: 0, rh: 0, tv, bd, sc: 0, ch: 0, dn: 0, wr: 0, ap: 0 }; }
// lib.slotCount (lib.mjs:3063-3102) as built, in the worst reading of HARNESS-FACTS 10 (a process line never names the
// folder or the session id): per attempt, once per epoch, stop not confirmed and (unconfirmed, or the current attempt of
// an open row, or the last attempt of a committed row, or a transcript). No process list: unknown -> nothing admitted.
function slotCountAB(n, P) {
  if (P.AB_PROCLIST && !n.pl) return 99;
  let k = 0; const seen = new Set();
  n.T.forEach((t, f) => {
    if (t.st === ST.A && (t.step === STEP.ADMITTED || t.step === STEP.RUN)) { k++; seen.add(f * 256 + t.ep); }
    else if (t.st === ST.C && P.AB_COMMIT_CLOSE && t.cl) { k++; seen.add(f * 256 + t.ep); }
  });
  for (const s of n.S) { const key = s.f * 256 + s.ep; if (seen.has(key) || s.sc) continue; if (s.z || s.tv) { k++; seen.add(key); } }
  // FX-CLAIM step 7: one more slot for every folder session (a transcript is visible) with no close-done record that is not
  // the claim holder (the modelled reading: the text also names a holder of an unconfirmed attempt, which today's term
  // already counts; counting it twice only admits less, so a Slots verdict here carries over). A dead session is merged
  // with its "no such session" close (FX-CGATE step 6(b), counted by FX-CLOSE because this coordinator started it).
  if (P.FX_CLAIM) for (const s of n.S) if ((s.al || P.FX_R5_DEADCOUNT) && s.tv && !s.dn && !s.ch) k++;
  return k;
}
function wake(n, i) { const c = n.C[i]; if (!c) return; if (c.pc !== null) return; /* fact 2: seen at the next tool call of the running turn */ c.wk = Math.min(3, c.wk + 1); }
const has = (n, kind) => n.B[kind] > 0 && (PLANNED(kind) || n.B.k > 0);
const spend = (n, kind) => { n.B[kind]--; if (!PLANNED(kind)) n.B.k--; }; // planned hand-overs (and the planned slow call) are not faults

// canonical form: drop what can no longer matter, renumber the ledger, sort
export function canon(n, P) {
  n.S = n.S.filter((s) => {
    const t = n.T[s.f];
    if (s.al && s.p < 2) return true;
    if (P.FX_CLAIM && P.FX_R5_DEADCOUNT && s.tv && !s.dn && !s.ch) return true; // still counted by step 7
    if (P.D7_SLOTS && s.al) return true; // D7: a READY child's process lives until it is closed
    if (t.st === ST.A && s.ep === t.ep) return true;
    if (t.st === ST.A && s.ep === t.ep - 1 && (t.step === STEP.FENCED || t.step === STEP.STOPPED)) return true; // restore source
    if (!P.FENCE_EPOCH && s.p === 2 && !s.hd && t.st === ST.A) return true; // ablation: a stale READY can still be committed
    if (P.BLD_VERIFY_RECORDS && !s.dn && needsRecord(n, s)) return true; // S2.2: its row's stop verify still needs its record
    return false;
  });
  for (const s of n.S) {
    if (!s.al || s.p === 2) { s.mv = 0; s.nc = 0; s.sig = 0; s.pu = 0; if (!s.al && s.p < 2) s.m = MODE.DEAD; if (s.p === 2) s.m = MODE.OK; }
    if (s.p === 2 || !s.al) s.z = s.al ? s.z : 0;
    if (s.p === 2 || !s.al) s.rh = 0; // a landed READY, or a writer that died mid-write (a torn READY reads as absent)
  }
  for (const t of n.T) if (t.st !== ST.A || t.step !== STEP.RUN) { t.wep = 0; t.cs = 0; t.hs = 0; t.rep = 0; t.ry = 0; }
  for (const t of n.T) if (term(t.st)) { t.step = 0; t.cut = 0; t.ctn = 0; t.rsn = 0; t.fail = t.st === ST.F ? 1 : 0; t.bn = 0; t.gf = 0; t.ol = 0; t.orr = 0; t.sj = 0; t.le = 0; t.ns = 0; t.se = 0; t.rq = 0; t.sq = 0; if (!t.cl) { t.cm = 0; t.vr = 0; } if (t.cl !== 2) t.vt = 0; }
  for (const t of n.T) if (t.st === ST.A && t.step !== STEP.FENCED) { t.sq = 0; t.vt = 0; }
  // ledger: keep events after acked_seq that name a current running attempt; renumber 1..n
  const keep = n.E.filter((e) => e.seq > n.ack && n.T[e.f].st === ST.A && n.T[e.f].step === STEP.RUN && n.T[e.f].ep === e.ep);
  keep.sort((a, b) => a.seq - b.seq);
  for (const c of n.C) { let r = 0; for (const e of keep) if (e.seq <= c.rd) r++; c.rd = c.pc ? r : 0; }
  keep.forEach((e, i) => { e.seq = i + 1; });
  n.E = keep; n.ack = 0; n.seq = keep.length;
  for (const c of n.C) if (c.pc === null && !c.wk) c.dr = c.ce < n.ce ? 0 : c.dr;
  n.S.sort((a, b) => a.f - b.f || a.ep - b.ep || a.par - b.par || a.al - b.al || a.p - b.p || a.m - b.m || a.z - b.z || a.rh - b.rh || a.tv - b.tv || a.bd - b.bd || a.sc - b.sc || a.ch - b.ch || a.dn - b.dn || a.wr - b.wr || (a.ap | 0) - (b.ap | 0));
  n.W.sort((a, b) => a.par - b.par || a.ph - b.ph || a.lk - b.lk || a.gap - b.gap);
  n.A = n.A.map((a) => ((a & 32) && n.C[aPar(a)] && n.C[aPar(a)].pc === null ? a & ~32 : a));
  if (P.FIX_ARM_FIRST) for (const c of n.C) if (c.pc === null) c.ch = 0;
  if (P.BQ5_OWNER_TURN) for (const c of n.C) if (c.pc === null) c.ot = 0; // S2.2: owner-typed is a property of a running turn
  n.A.sort((a, b) => a - b);
  return n;
}

// compact byte encoding (all values < 256); a plan is interned (2 bytes), the table lives per process
const planIds = new Map(); const planList = [];
function planId(pc) { const k = pc.map((o) => o.join(',')).join(';'); let id = planIds.get(k); if (id === undefined) { id = planList.length; planIds.set(k, id); planList.push(pc.map((o) => o.slice())); } return id; }
export function encode(n, buf) {
  let i = 0;
  const B = n.B;
  buf[i++] = n.ce; buf[i++] = n.ws | (n.syn << 1) | (n.to << 2) | (n.pl << 3) | (n.ar << 4) | (n.rl << 5) | (n.cj << 6) | (n.gp << 7); buf[i++] = n.seq;
  buf[i++] = B.k; buf[i++] = B.cs | (B.cv << 4); buf[i++] = B.cd | (B.z << 4); buf[i++] = B.p | (B.l << 4); buf[i++] = B.x | (B.t << 4); buf[i++] = B.r | (B.h << 4); buf[i++] = B.d | ((B.u || 0) << 4);
  buf[i++] = (B.o || 0) | ((B.y || 0) << 4); buf[i++] = (B.s || 0) | (n.ra << 4) | (n.rk << 6);
  if (XB) { buf[i++] = n.x; buf[i++] = n.y; }
  if (BX) { buf[i++] = (B.q || 0) | ((B.w || 0) << 4); buf[i++] = (B.m || 0) | ((B.g || 0) << 4); }
  buf[i++] = n.T.length; buf[i++] = n.S.length; buf[i++] = n.W.length; buf[i++] = n.A.length; buf[i++] = n.E.length; buf[i++] = n.C.length;
  for (const t of n.T) {
    buf[i++] = t.st | (t.step << 2) | (t.fail << 5) | (t.cut << 6) | (t.ctn << 7);
    buf[i++] = t.ep;
    buf[i++] = t.rs | (t.hv << 3) | (t.ncr << 5);
    buf[i++] = (t.cmE + 1) | (t.rsn << 4);
    buf[i++] = t.wep;
    buf[i++] = t.cs | (t.hs << 3) | (t.rep << 6);
    buf[i++] = t.cl | (t.bn << 2) | (t.gf << 3);
    buf[i++] = t.ad | (t.aks << 3) | (t.ry << 5);
    buf[i++] = t.ol | (t.orr << 2) | (t.cm << 5) | (t.sj << 7);
    buf[i++] = t.le | (t.ns << 1) | (t.vr << 3) | (t.sq << 5) | (t.vt << 6);
    buf[i++] = t.se;
    if (BX) buf[i++] = (t.rq | 0) | ((t.sl | 0) << 1) | ((t.ag | 0) << 2) | ((t.ac | 0) << 4) | ((t.ax | 0) << 5);
  }
  for (const s of n.S) {
    buf[i++] = s.f | (s.m << 2) | (s.p << 5) | (s.rh << 7);
    buf[i++] = s.ep;
    buf[i++] = s.pf | (s.tc << 1) | (s.al << 2) | (s.z << 3) | (s.mv << 4) | (s.pu << 5) | (s.hb << 6) | (s.hd << 7);
    buf[i++] = s.nc | (s.sig << 3) | (s.par << 6);
    buf[i++] = s.tv | (s.bd << 1) | (s.sc << 2) | (s.ch << 3) | (s.dn << 4) | (s.wr << 5) | ((s.ap | 0) << 6);
  }
  for (const w of n.W) buf[i++] = w.par | (w.ph << 3) | (w.lk << 4) | (w.gap << 5);
  for (const a of n.A) buf[i++] = a;
  for (const e of n.E) buf[i++] = e.f | (e.cls << 2) | (e.ep << 5); // seq = position + 1
  for (const c of n.C) {
    buf[i++] = c.ce; buf[i++] = c.wk | (c.boot << 2) | (c.dr << 3) | ((c.pc ? 1 : 0) << 4) | (c.ch << 5); buf[i++] = c.rd;
    if (BX) buf[i++] = (c.om ? 1 : 0) | (c.ot ? 2 : 0);
    if (c.pc) { const id = planId(c.pc); buf[i++] = id & 255; buf[i++] = id >> 8; }
  }
  return i;
}
export function decode(b) {
  let i = 0;
  const n = { ce: b[i++], ws: 0, syn: 0, seq: 0, ack: 0 };
  const x = b[i++]; n.ws = x & 1; n.syn = (x >> 1) & 1; n.to = (x >> 2) & 1; n.pl = (x >> 3) & 1; n.ar = (x >> 4) & 1; n.rl = (x >> 5) & 1; n.cj = (x >> 6) & 1; n.gp = (x >> 7) & 1; n.seq = b[i++];
  const B = { k: b[i++] }; let y = b[i++]; B.cs = y & 15; B.cv = y >> 4; y = b[i++]; B.cd = y & 15; B.z = y >> 4; y = b[i++]; B.p = y & 15; B.l = y >> 4; y = b[i++]; B.x = y & 15; B.t = y >> 4; y = b[i++]; B.r = y & 15; B.h = y >> 4; y = b[i++]; B.d = y & 15; B.u = y >> 4;
  y = b[i++]; B.o = y & 15; B.y = y >> 4; y = b[i++]; B.s = y & 15; n.ra = (y >> 4) & 3; n.rk = (y >> 6) & 3;
  n.x = 0; n.y = 0; if (XB) { n.x = b[i++]; n.y = b[i++]; }
  B.q = 0; B.w = 0; B.m = 0; B.g = 0; if (BX) { let z = b[i++]; B.q = z & 15; B.w = z >> 4; z = b[i++]; B.m = z & 15; B.g = z >> 4; }
  n.B = B;
  const nT = b[i++], nS = b[i++], nW = b[i++], nA = b[i++], nE = b[i++], nC = b[i++];
  n.T = []; n.S = []; n.W = []; n.A = []; n.E = []; n.C = [];
  for (let k = 0; k < nT; k++) {
    const a = b[i++], ep = b[i++], c = b[i++], d = b[i++], wep = b[i++], e = b[i++], g = b[i++], h = b[i++], x1 = b[i++], x2 = b[i++], x3 = b[i++], x4 = BX ? b[i++] : 0;
    n.T.push({ st: a & 3, step: (a >> 2) & 7, fail: (a >> 5) & 1, cut: (a >> 6) & 1, ctn: (a >> 7) & 1, ep, rs: c & 7, hv: (c >> 3) & 3, ncr: (c >> 5) & 7, cmE: (d & 15) - 1, rsn: d >> 4, wep, cs: e & 7, hs: (e >> 3) & 7, rep: (e >> 6) & 1, cl: g & 3, bn: (g >> 2) & 1, gf: (g >> 3) & 7, ad: h & 7, aks: (h >> 3) & 3, ry: (h >> 5) & 1, ol: x1 & 3, orr: (x1 >> 2) & 7, cm: (x1 >> 5) & 3, sj: (x1 >> 7) & 1, le: x2 & 1, ns: (x2 >> 1) & 3, vr: (x2 >> 3) & 3, sq: (x2 >> 5) & 1, vt: (x2 >> 6) & 3, se: x3, rq: x4 & 1, sl: (x4 >> 1) & 1, ag: (x4 >> 2) & 3, ac: (x4 >> 4) & 1, ax: (x4 >> 5) & 3 });
  }
  for (let k = 0; k < nS; k++) {
    const a = b[i++], ep = b[i++], c = b[i++], d = b[i++], e = b[i++];
    n.S.push({ f: a & 3, m: (a >> 2) & 7, p: (a >> 5) & 3, rh: (a >> 7) & 1, ep, pf: c & 1, tc: (c >> 1) & 1, al: (c >> 2) & 1, z: (c >> 3) & 1, mv: (c >> 4) & 1, pu: (c >> 5) & 1, hb: (c >> 6) & 1, hd: (c >> 7) & 1, nc: d & 7, sig: (d >> 3) & 7, par: d >> 6, tv: e & 1, bd: (e >> 1) & 1, sc: (e >> 2) & 1, ch: (e >> 3) & 1, dn: (e >> 4) & 1, wr: (e >> 5) & 1, ap: (e >> 6) & 1 });
  }
  for (let k = 0; k < nW; k++) { const a = b[i++]; n.W.push({ par: a & 7, ph: (a >> 3) & 1, lk: (a >> 4) & 1, gap: (a >> 5) & 1 }); }
  for (let k = 0; k < nA; k++) n.A.push(b[i++]);
  for (let k = 0; k < nE; k++) { const a = b[i++]; n.E.push({ f: a & 3, cls: (a >> 2) & 7, ep: a >> 5, seq: k + 1 }); }
  for (let k = 0; k < nC; k++) {
    const ce = b[i++], a = b[i++], rd = b[i++]; const xc = BX ? b[i++] : 0;
    const c = { ce, wk: a & 3, boot: (a >> 2) & 1, dr: (a >> 3) & 1, rd, pc: null, ch: (a >> 5) & 3, om: xc & 1, ot: (xc >> 1) & 1 };
    if ((a >> 4) & 1) { const id = b[i++] | (b[i++] << 8); c.pc = planList[id].map((o) => o.slice()); }
    n.C.push(c);
  }
  return n;
}

// ---------------------------------------------------------------- the coordinator
function reconcile(n, P) {
  if (!P.RECONCILE) return;
  for (let f = 0; f < n.T.length; f++) {
    const t = n.T[f];
    // FX-CLAIM step 3: a session claim on an admitted row -> started (the session taken from the claim); transcripts stay a
    // second source below (so `started` with no claim is reachable: FX-PLAN rev 4, P2)
    if (P.FX_CLAIM && t.st === ST.A && t.step === STEP.ADMITTED && t.cm === 1) { t.step = STEP.RUN; t.bn = 0; }
    else if (P.AB_TRANSCRIPT_LAG) {
      // status.mjs:263-317: exactly one transcript with a cwd record -> started; none -> stays admitted (D4b);
      // more than one -> `several-sessions` anomaly, no change (status.mjs:266-268)
      if (t.st === ST.A && t.step === STEP.ADMITTED) { const k = n.S.filter((s) => s.f === f && s.ep === t.ep && s.tv).length; if (k === 1) { t.step = STEP.RUN; t.bn = 0; } }
    } else if (t.st === ST.A && t.step === STEP.ADMITTED && cur(n, f)) { t.step = STEP.RUN; t.bn = 0; } // a transcript for the attempt folder: the start happened
    if (!P.AB_NO_COMMIT_RECONCILE && t.st === ST.A && t.cmE >= 0) { t.st = ST.C; t.step = 0; } // a COMMIT record exists: the task is committed
  }
}

// AB_STALE_SNAPSHOT: status.json as the last status build wrote it; per row the epoch at which it showed the row admitted
function snapStatus(n) { for (const t of n.T) t.se = t.st === ST.A && t.step === STEP.ADMITTED ? t.ep : 0; }

function eligibleHO(n, f, P) {
  const t = n.T[f]; const s = cur(n, f);
  return t.st === ST.A && t.step === STEP.RUN && s && s.al && s.m === MODE.OK && s.p === 1 && t.hv < P.HMAX_TASK && n.B.h > 0;
}

// ---- fence fixes: what the deciders read
// READY of the current attempt: FX-OUT reads the outcome log (a ready slot), as built READY.json (p = 2)
function readyOf(n, f, P) { const t = n.T[f]; if (P.FX_OUT) return t.ol === 1; const s = cur(n, f); return !!(s && s.p === 2); }
// the attempt whose stop or close a row waits on: a fenced row's older attempts, a committed row's last attempt
const closeTargets = (n, f) => { const t = n.T[f]; return n.S.filter((s) => s.f === f && (t.st === ST.C ? s.ep === t.ep : s.ep < t.ep)); };
// FX-PLAN step 0 (rev 4, P1): owner while verify_rounds >= 3 and some needed close is not recorded (off: no end condition)
// S2.2: a session whose counted close record its row's stop verify needs (BLD_VERIFY_RECORDS, BLD_CLOSE_IDGAP): nameable
// (claim holder or a folder transcript) and of a fenced row's older attempt or a stop-requested committed row's last one
function needsRecord(n, s) { const t = n.T[s.f]; if (!(s.ch || s.tv)) return false; return (t.st === ST.A && t.step === STEP.FENCED && s.ep < t.ep) || (t.st === ST.C && t.cl === 2 && s.ep === t.ep); }
// S2.2 (Q5): the status view shows a start due for the row (admit and start, a restart, or an admitted row's start)
function startDue(n, t, P) { return t.st === ST.P || (t.st === ST.A && (t.step === STEP.FENCED || t.step === STEP.STOPPED || (t.step === STEP.ADMITTED && !t.sj && !(P.FX_CLAIM && t.cm === 1)))); }
function ownerRow(n, f, P) {
  const t = n.T[f];
  if (!P.FX_PLAN || t.vr < 3) return false;
  if (!P.FX_PLAN_OWNEREND) return true;
  return closeTargets(n, f).some((s) => (s.al || (P.BLD_VERIFY_RECORDS && (s.ch || s.tv))) && !s.dn);
}
// FX-PLAN's act for a row (one function for the planner and the watcher): 'none' | 'owner' | an act name
function planAct(n, f, P, c) {
  const t = n.T[f];
  if (t.st === ST.F) return 'none';
  if (ownerRow(n, f, P)) return 'owner';
  if (t.st === ST.P) return c && c.dr ? 'none' : 'admit';
  if (t.st === ST.C) { if (!P.AB_COMMIT_CLOSE) return 'none'; return t.cl === 1 || t.cl === 3 ? 'stop-request' : t.cl === 2 ? 'stop-verify' : 'none'; } // step 3 (stop.mjs refuses cl 3 without FX-CLOSE)
  if (P.FX_OUT && t.ol === 2 && (t.step === STEP.RUN || t.step === STEP.ADMITTED)) return 'refence';
  if (t.step === STEP.FENCED) return 'stop';
  if (t.step === STEP.STOPPED) return c && c.dr ? 'none' : 'admit';
  const leaseRule = () => (t.sj && !t.le ? 'none' : t.sj && t.le ? 'fence-crash' : 'owner');
  if (t.step === STEP.ADMITTED) {
    if (P.FX_CLAIM && t.cm === 1) return 'bind';
    if (t.sj) return leaseRule();
    return P.FX_Q5B ? 'owner' : 'start';
  }
  if (t.step === STEP.RUN && P.FX_CLAIM && !t.bn) {
    if (t.cm === 1) return 'bind';
    return P.FX_PLAN_STARTWAIT ? leaseRule() : 'bind';
  }
  return 'run'; // a running row: READY, ledger events and hand-overs are the planner's as before
}

// the plans a coordinator may make at the start of a turn (after reconcile), from what it reads
function plans(n, i, P) {
  const c = n.C[i];
  if (P.FENCE_CE && c.ce < n.ce) {
    if (!P.AB_START_UNFENCED) return [[]]; // R6: woken with a stale ce, it ends its turn without any writing script
    // As built R6 is a rule the session follows, enforced by nothing (SEM-fence 3.2). Its reconcile exits 64, but it can
    // still Read status.json and call the session tool, which takes no --ce. It either obeys R6 (empty plan) or starts
    // the session of a row it reads at admitted; the bind that would follow is a script and exits 64, ending the turn.
    const out = [[]];
    // AB_STALE_SNAPSHOT: it reads status.json as last written (t.se), not the live table
    if (P.AB_STALE_SNAPSHOT) n.T.forEach((t, f) => { if (t.se > 0) out.push([[OP.T, f, 0, t.se]]); });
    else n.T.forEach((t, f) => { if (t.st === ST.A && t.step === STEP.ADMITTED) out.push([[OP.T, f, 0, t.ep]]); });
    return out;
  }
  let alts = [[]];
  const add = (ops) => { alts = alts.map((a) => a.concat(ops)); };
  // the session-tool start names the attempt folder the coordinator read (AB_START_UNFENCED); 0 = the epoch this turn admitted
  const tEp = (t) => (P.AB_START_UNFENCED ? t.ep : 0);
  // Q5b (no session tools): the coordinator admits; the owner starts the session (FX_Q5B)
  const startOps = (f) => (P.FX_Q5B ? [[OP.A, f, 0, 0]] : [[OP.A, f, 0, 0], [OP.T, f, 0, 0], [OP.B, f, 0, 0]]);
  const fenceOps = (f, r, e) => [[OP.F, f, r, e], [OP.S, f, 0, 0], ...startOps(f)];
  for (let f = 0; f < n.T.length; f++) {
    const t = n.T[f];
    if (P.FX_PLAN && ownerRow(n, f, P)) continue; // FX-PLAN step 0: the owner's act, nothing for the coordinator
    if (t.st === ST.P) { if (!c.dr) add(startOps(f)); continue; }
    // AB_COMMIT_CLOSE: status.mjs:526 lists stop-request for committed+bound, then stop-session and stop-verify
    // (watch.mjs:141-156); committed+started gets `bind` (watch.mjs:166), which replace.mjs:987 refuses: nothing to plan.
    // FX-PLAN step 3 (with FX-CLOSE step 2): committed at `started` -> stop-request as well
    if (t.st === ST.C && P.AB_COMMIT_CLOSE) { if (t.cl === 1 || (t.cl === 3 && P.FX_PLAN)) add([[OP.SR, f, 0, 0], [OP.SV, f, 0, 0]]); else if (t.cl === 2) add([[OP.SV, f, 0, 0]]); continue; }
    if (t.st !== ST.A) continue;
    // FX-PLAN step 1: the log is fenced and the row is still at E (a torn fence): fence again with the slot's reason
    if (P.FX_PLAN && P.FX_OUT && t.ol === 2 && (t.step === STEP.RUN || t.step === STEP.ADMITTED)) { add(fenceOps(f, t.orr, t.ep)); continue; }
    if (t.step === STEP.RUN) {
      const s = cur(n, f);
      const ev = n.E.find((e) => e.f === f && e.ep === t.ep && e.seq > n.ack && e.seq <= c.rd);
      const started = (P.AB_COMMIT_CLOSE || P.FX_CLAIM) && !t.bn;
      // FX-CLAIM: `started` with no claim. FX-PLAN rev 4 (P2): the admitted rule; off (or no FX-PLAN): bind (exit 6)
      if (P.FX_CLAIM && started && t.cm !== 1) {
        const a = P.FX_PLAN ? planAct(n, f, P, c) : 'bind';
        if (a === 'bind') add([[OP.B, f, 0, t.ep]]); else if (a === 'fence-crash') add(fenceOps(f, RSN.CRASH, t.ep));
        continue;
      }
      const ready = readyOf(n, f, P);
      // AB_COMMIT_CLOSE: a row at `started` (reconcile, no bind) is listed `bind` (watch.mjs:166); with a READY the
      // coordinator may commit first (commit.mjs:843 accepts `started`), so both orders are plans
      if (P.AB_COMMIT_CLOSE && !t.bn && ready) alts = alts.flatMap((a) => [a.concat([[OP.M, f, 0, t.ep]]), a.concat([[OP.B, f, 0, t.ep], [OP.M, f, 0, t.ep]])]);
      else if (ready) add([[OP.M, f, 0, t.ep]]);
      else if (started && (add([[OP.B, f, 0, t.ep]]), false)) { /* bind first, then as below */ }
      else if (ev) add(fenceOps(f, ev.cls, t.ep));
      else if (eligibleHO(n, f, P) && !c.dr) alts = alts.flatMap((a) => [a, a.concat(fenceOps(f, RSN.HO, t.ep))]);
    } else if (t.step === STEP.FENCED) add([[OP.S, f, 0, 0], ...startOps(f)]);
    else if (t.step === STEP.STOPPED) add(startOps(f));
    else if (t.step === STEP.ADMITTED) {
      // FX-PLAN step 5: claim -> bind; start.json with the lease running -> wait; expired -> fence crash; else start
      const a = P.FX_PLAN ? planAct(n, f, P, c) : 'start';
      if (a === 'start') add([[OP.T, f, 0, tEp(t)], [OP.B, f, 0, 0]]);
      else if (a === 'bind') add([[OP.B, f, 0, 0]]);
      else if (a === 'fence-crash') add(fenceOps(f, RSN.CRASH, t.ep));
    }
    if (!P.FENCE_EPOCH) for (const s of n.S) if (s.f === f && s.ep < t.ep && s.p === 2 && !s.hd) add([[OP.M, f, 0, s.ep]]); // ablation: commits the READY a note named
  }
  const out = [];
  const allTerm = n.T.every((t) => term(t.st));
  for (const a of alts) {
    if (allTerm) { out.push(a.concat([[OP.Y, 0, 0, 0]])); continue; }
    const tail = (dr) => (dr && readyToHandOver(n, P) ? [[OP.H, 0, 0, 0]] : [[OP.E, 0, 0, 0]]);
    out.push(a.concat(tail(c.dr)));
    if (!c.dr && c.ce === n.ce && n.B.d > 0) out.push([[OP.D, 0, 0, 0]].concat(a, tail(1)));
  }
  return out;
}

const opName = (o) => {
  const [k, f, x, y] = o;
  return k === OP.F ? (x === RSN.FIRST ? `replace(f${f},first)` : `replace(f${f},${RNAME[x]},e${y})`) : k === OP.S ? `stop(f${f})` : k === OP.A ? `admit(f${f})` : k === OP.T ? `start-session(f${f}${y ? 'e' + y : ''})` : k === OP.B ? `bind(f${f})` : k === OP.M ? `commit(f${f}e${y})` : k === OP.D ? 'drain(W*_coord)' : k === OP.H ? 'handover' : k === OP.Y ? 'synthesis' : k === OP.SR ? `stop-request(f${f} committed)` : k === OP.SV ? `stop-verify(f${f} committed)` : k === OP.AR ? 'start-alarm(arm)' : k === OP.SW ? 'start-watcher' : k === OP.SA ? 'start-alarm' : k === OP.EN ? 'watch --alarm --ensure' : k === OP.RC ? 'status --reconcile' : 'endturn';
};

function killAlarmsOf(n, i, P, why) {
  const before = n.A.length;
  n.A = n.A.filter((a) => aPar(a) !== i);
  if (before !== n.A.length && P.KILL_WAKES) wake(n, i);
  return before !== n.A.length;
}
// start an alarm of coordinator i. As built (AB_ALARM_SUPERSEDE) nothing is killed: the alarm that registers last is
// current and every older one of i is superseded (W:778-788; registration a6 merged into the start). The chain counter
// ch counts consecutive turns whose alarm start superseded a live one (D1). At most 3 alarm processes per coordinator are
// kept (state bound; AlarmsBounded already fails at 3). Returns a label fragment.
function startAlarm(n, i, P) {
  if (P.AB_ARM_SPLIT || P.AB_ENDTURN_SPLIT) { if (n.C[i].ce === n.ce) n.ar = 1; n.cj = 0; } // a6 rewrites alarm.json (repairs an unreadable one)
  if (P.FIX_ALARM_MARKER && n.C[i].ce === n.ce) setBit(n, 2, 0); // the new alarm has no exit marker
  if (!P.AB_ALARM_SUPERSEDE) { const killed = killAlarmsOf(n, i, P); n.A.push(i); return killed ? ' kills the alarm and starts a new one,' : ' starts the alarm,'; }
  const had = n.A.includes(i);
  if (had) { n.A = n.A.map((a) => (a === i ? i | 8 : a)); n.C[i].ch = Math.min(3, n.C[i].ch + 1); }
  if (alarmsOf(n, i) < 3) n.A.push(i);
  return had ? ` starts an alarm that SUPERSEDES the live one (chain ${n.C[i].ch}; ${alarmsOf(n, i)} alarm processes),` : ' starts the alarm,';
}
// watch.mjs act-due (W:543-567, rowAct W:132-168) from the table: lib.slotCount with an EMPTY process list. Without
// AB_SLOTCOUNT/AB_COMMIT_CLOSE: per attempt once, the current attempt of a row at admitted/run (unknown), an older
// attempt whose stop is not done (row fenced) or unconfirmed (zombie). A committed row's attempt counts only under
// AB_COMMIT_CLOSE (slotCountAB), where the model has a close.
function slotCountEmpty(n, P) {
  if (P.AB_SLOTCOUNT || P.AB_COMMIT_CLOSE) { const pl = n.pl; n.pl = 1; const k = slotCountAB(n, P); n.pl = pl; return k; }
  const seen = new Set();
  n.T.forEach((t, f) => { if (t.st === ST.A && (t.step === STEP.ADMITTED || t.step === STEP.RUN)) seen.add(f * 256 + t.ep); });
  for (const s of n.S) { const t = n.T[s.f]; if (s.ep < t.ep && (s.z || (t.st === ST.A && t.step === STEP.FENCED && s.ep === t.ep - 1))) seen.add(s.f * 256 + s.ep); }
  return seen.size;
}
function rowAct(n, f, slotFree, blocked, P) {
  const t = n.T[f];
  if (t.st === ST.F) return 0;
  if (t.st === ST.P) return slotFree && !blocked ? 1 : 0;
  if (t.st === ST.C) return P.AB_COMMIT_CLOSE ? (t.cl === 1 ? 3 : t.cl === 2 ? 4 : t.cl === 3 ? 6 : 0) : 0;
  if (t.step === STEP.FENCED) return 3;
  if (t.step === STEP.STOPPED) return slotFree && !blocked ? 2 : 0;
  if (t.step === STEP.ADMITTED) return 5;
  if (t.step === STEP.RUN && P.AB_COMMIT_CLOSE && !t.bn) return 6;
  return 0;
}
// no wake source can reach the current coordinator (WakeSourceAlive): it is idle with no pending wake, and no watcher,
// no alarm (current or superseded) and no child that can still write READY or crash belongs to it
function silent(n) {
  if (n.syn) return false;
  const i = n.ce; const c = n.C[i];
  if (!c || c.pc !== null || c.wk) return false;
  if (n.W.some((w) => w.par === i)) return false;
  if (n.A.some((a) => aPar(a) === i)) return false;
  if (n.S.some((s) => s.al && s.p < 2 && s.par === i && (s.m === MODE.OK || s.m === MODE.STUCK || s.m === MODE.SLOW))) return false;
  return true;
}

function admitCount(n, P) {
  if (P.AB_SLOTCOUNT || P.AB_COMMIT_CLOSE) return slotCountAB(n, P);
  if (P.AB_PROCLIST && !n.pl) return 99; // replace.mjs:847-852 + admit.mjs:226,470: no process list -> slots-unknown
  if (P.ADMIT_LIVE) {
    let k = liveCount(n);
    if (P.FIX_ADMIT_RESERVE) k += n.T.filter((t, f) => t.st === ST.A && t.step === STEP.ADMITTED && !cur(n, f)).length;
    return k;
  }
  return n.T.filter((t) => t.st === ST.A && (t.step === STEP.RUN || t.step === STEP.ADMITTED)).length;
}

// endturn's acknowledgement: acked_seq = the seq the turn read (ACK_READ) or the head; with AB_ACT_DUE the act-due and
// READY keys the turn read (aks 2) are acknowledged with it (one K acknowledges every key at or below it, S:631)
function ackAt(n, i, P, rd) {
  n.ack = P.ACK_READ ? rd : n.seq;
  if (P.AB_ACT_DUE) { for (const t of n.T) if (t.aks === 2 || (!P.ACK_READ && t.aks)) t.aks = 0; if (n.rk === 2 || (!P.ACK_READ && n.rk)) n.rk = 0; }
}

// AB_STOP_HELD (FIDELITY-3 gap 1): stop verify needs stop_verify_deltas (= 2 in the model) watcher ticks after the request's
// sample (stop.mjs:367-399); ticks advance only while a watcher lives, so no watcher means it waits (stop.mjs:362 exits 2)
function stopVerifyGate(n, t, P) {
  if (t.vt < 2) return `only ${t.vt} watcher tick(s) since the sample, stop_verify_deltas not reached (waits)`;
  if (P.AB_PROCLIST && !n.pl) return 'no process list -> exit 2';
  return null;
}
// verify of a fenced row's older attempts. As built (AB_STOP_HELD): unconfirmed while a zombie (a close that did not end
// the session: growth) lives, and the row stays stop-requested (stop.mjs:441-446). FX-CLOSE with FX-CGATE: also every
// live nameable session (claim holder or visible transcript) needs a close-done record; verify_rounds grows
function verifyFenced(n, f, P, L) {
  const t = n.T[f];
  const VER = P.FX_CLOSE && P.FX_CGATE;
  const bad = n.S.filter((s) => s.f === f && s.ep < t.ep && ((s.al && s.z) || (VER && !s.dn && (s.ch || s.tv) && (s.al || P.BLD_VERIFY_RECORDS))));
  if (bad.length) {
    t.sq = P.AB_STOP_HELD ? 1 : 0; t.vt = 0; if (VER) t.vr = Math.min(3, t.vr + 1);
    return L && ` verify UNCONFIRMED (${bad.map((s) => `f${s.f}e${s.ep} ${s.z ? 'still growing' : 'no close-done record'}`).join(', ')}): row stays stop-requested${VER ? `, verify_rounds=${t.vr}` : ''}${P.AB_STOP_HELD ? ', new sample' : ''}`;
  }
  t.step = STEP.STOPPED; t.sq = 0; t.vt = 0;
  if (P.AB_SLOTCOUNT || P.AB_COMMIT_CLOSE) for (const s of n.S) if (s.f === f && s.ep < t.ep && !s.z) s.sc = 1;
  let lab = L && ' verify confirmed, row stopped';
  if (t.fail) { t.st = ST.F; t.step = 0; lab = L && lab + '; task FAILED, escalated'; }
  return lab;
}

// FX-CLOSE step 4 with FX-CGATE steps 5-6: the coordinator's close tool on every live session of a committed row's last
// attempt that has no close-done record; a successful close ends the session and writes the record (merged: the tool
// call, its effect and the Post hook's record are one step; the death between request and close is the x before the
// next op, after which FX-PLAN lists stop-session again). Fault z: the close does not end it (a zombie: no record, only
// the owner can end it). A zombie is not closed again (the close tool cannot end it). Mutates `res` in place.
function closeCommitted(res, f, P, L) {
  const t0 = res[0].n.T[f];
  const qs = []; res[0].n.S.forEach((s, q) => { if (s.f === f && s.ep === t0.ep && s.al && !s.dn && !s.z) qs.push(q); });
  for (const q of qs) {
    const nv = [];
    for (const v of res) {
      const a = clone(v.n); a.S[q].al = 0; if (!P.BLD_CLOSE_IDGAP) a.S[q].dn = 1; if (P.KILL_WAKES) wake(a, a.S[q].par);
      if (P.BLD_STOP_INTERRUPT_ONLY && P.BLD_ARCHIVE_APPROVAL) nv.push({ n: clone(v.n), lab: v.lab + (L ? ` the archive of f${f}e${v.n.S[q].ep} waits for the owner's approval (not given): it lives;` : ''), fault: v.fault });
      nv.push({ n: a, lab: v.lab + (L ? ` closes f${f}e${a.S[q].ep} (close-done record);` : ''), fault: v.fault });
      if (has(v.n, 'z')) { const b = clone(v.n); spend(b, 'z'); b.S[q].z = 1; nv.push({ n: b, lab: v.lab + (L ? ` FAULT the close of f${f}e${b.S[q].ep} does not end it (zombie, no close-done record);` : ''), fault: true }); }
    }
    res.splice(0, res.length, ...nv);
  }
}

// one op of coordinator i; returns [{lab, n, fault, viol, d6}]
function runOp(st, i, P, L) {
  const out = [];
  const c0 = st.C[i];
  const op = c0.pc[0];
  const [k, f, x, ep] = op;
  const who = `coord${i}`;
  const n = clone(st);
  const c = n.C[i];
  const next = (m) => { m.C[i].pc.shift(); if (!m.C[i].pc.length) m.C[i].pc = null; };
  const stale = c.ce < n.ce;
  if (stale && P.FENCE_CE && k !== OP.Y && !(P.AB_START_UNFENCED && k === OP.T)) { c.pc = null; out.push({ lab: L && `${who} ${opName(op)}: script refuses (exit 64, stale --ce); turn ends`, n, viol: [] }); return out; }
  // FX-CGATE step 3: the coordinator hook allows a session that is not bound to the current ce only Read; the session tool
  // is refused (the hook takes ce from coord-session-<ce>, never from the input). The refusal ends this act; the stale
  // coordinator's plan has nothing else it may do
  if (stale && P.FX_CGATE && k === OP.T) { c.pc = null; out.push({ lab: L && `${who} ${opName(op)}: the coordinator hook DENIES (not the session bound to ce ${n.ce}: only Read is allowed); turn ends`, n, viol: [] }); return out; }
  const sv = stale ? ['TwoCoordinatorsAct'] : [];
  const t = f < n.T.length ? n.T[f] : null;
  if (k === OP.F) {
    if (x === RSN.FIRST) {
      if (t.st !== ST.P) { next(n); out.push({ lab: L && `${who} ${opName(op)} skipped`, n, viol: [] }); return out; }
      t.st = ST.A; t.ep++; t.ad = 0; t.step = STEP.STOPPED; t.rsn = RSN.FIRST; t.cut = 0;
      next(n); out.push({ lab: L && `${who} replace.mjs f${f} first start: epoch -> e${t.ep}`, n, viol: sv }); return out;
    }
    // a crash fence (FX-PLAN, lease expired) may target an admitted row as well as a started one
    const atE = t.st === ST.A && t.ep === ep && (t.step === STEP.RUN || (x === RSN.CRASH && t.step === STEP.ADMITTED));
    if (!atE) { next(n); out.push({ lab: L && `${who} ${opName(op)} skipped: the row is no longer at run e${ep}`, n, viol: [] }); return out; }
    const s = cur(n, f);
    const viol = [...sv];
    let retry = false;
    // S2.2 (departures/CLAIM.md 1): the lease act's --if-unclaimed check comes first in the hold; a torn fence's retry has no flag
    const lease = P.FX_CLAIM && x === RSN.CRASH && !(P.FX_OUT && t.ol === 2) && op[4] !== 1;
    if (lease && P.BLD_IF_UNCLAIMED && t.cm === 1) { next(n); out.push({ lab: L && `${who} replace.mjs f${f} (crash --if-unclaimed): a session claim exists -> claimed-late, nothing written`, n, viol: [] }); return out; }
    // CLAIM's window (refute/CLAIM.md:52): a claim lands in the hold after that check and before the tombstone create
    if (lease && P.BLD_IF_UNCLAIMED && P.BLD_LEASE_WINDOW && t.cm === 0) {
      const q = st.S.findIndex((y) => y.f === f && y.ep === t.ep && y.al && y.p < 2 && !y.ch && y.m !== MODE.DEAD && y.m !== MODE.IDLE);
      if (q >= 0) {
        const b = clone(st); const yb = b.S[q]; b.T[f].cm = 1; yb.ch = 1; yb.m = MODE.OK; yb.mv = 1; yb.pu = 0; yb.tv = 1; if (P.FX_PROPS) yb.wr = 1;
        const w = L && `${who} replace.mjs f${f} (crash --if-unclaimed): the check passes; then child f${f}e${t.ep}'s first tool call claims inside the hold;`;
        if (P.BLD_LEASE_ORDER) { next(b); out.push({ lab: L && `${w} the tombstone create meets the claim -> refused, nothing written (order: refusals, tombstone, slot)`, n: b, viol: [] }); }
        else { b.C[i].pc[0] = [OP.F, f, x, ep, 1]; for (const r of runOp(b, i, P, L)) out.push({ ...r, lab: L && `${w} then ${r.lab}` }); }
      }
    }
    if (P.FX_OUT) {
      // FX-OUT fence steps 1-4, in replace's one lock hold: the retry path, then the ready check on the log (every reason
      // but first; no tainted reason exists in the model). Q6 (a) and (b) place this check in lib.fence or in replace,
      // inside the same hold: one model step either way
      if (t.ol === 2) {
        if (t.orr !== x) { next(n); out.push({ lab: L && `${who} replace.mjs f${f} (${RNAME[x]}): the log of e${ep} is fenced with reason ${RNAME[t.orr]} -> exit 65 fence-pending`, n, viol: [] }); return out; }
        retry = true;
      } else if (t.ol === 1) { next(n); out.push({ lab: L && `${who} replace.mjs f${f} (${RNAME[x]}): an uncommitted ready slot in the outcome log of e${ep} -> exit 5 ready-wins, commit wins`, n, viol }); return out; }
    } else {
      if (s && s.p === 2) {
        if ((x !== RSN.HO && P.READY_WINS) || (x === RSN.HO && P.FIX_READY_ALL)) { next(n); out.push({ lab: L && `${who} replace.mjs f${f} (${RNAME[x]}): READY of e${ep} found under the lock -> refuses, commit wins`, n, viol }); return out; }
        viol.push('ReadyNotDiscarded');
      }
      // AB_READY_SPLIT: the child's hook passed for epoch e and its READY.json write has not landed; replace.mjs:186-198
      // reads it as absent and fences; the READY then lands in the fenced attempt (D4a)
      if (P.AB_READY_SPLIT && s && s.al && s.rh && s.p < 2) viol.push('ReadyNotDiscarded');
    }
    // the drain skip is the coordinator's rule for a NEW planned hand-over; replace.mjs itself has no drain check (grep: no
    // drain test in replace.mjs), so the retry of a torn fence (FX-OUT, same reason) goes through while draining
    if (n.C[i].dr && x === RSN.HO && !retry) { next(n); out.push({ lab: L && `${who} ${opName(op)} skipped: draining`, n, viol: [] }); return out; }
    // the model's planned-event budget h counts one hand-over once: a retry of a torn hand-over fence is the same hand-over
    if (x === RSN.HO && !retry && !has(n, 'h')) { next(n); out.push({ lab: L && `${who} ${opName(op)} skipped: no planned hand-over left in the budget`, n, viol: [] }); return out; }
    // FX-OUT step 5 (the fenced slot) and FX-CLAIM fence step (the tombstone), by strict create, before the CAS
    let tomb = false; let pre = '';
    if (P.FX_OUT && !retry) { t.ol = 2; t.orr = x; pre += ` fenced slot (${RNAME[x]}) created in the log of e${ep};`; }
    if (P.FX_CLAIM) { if (t.cm === 0) { t.cm = 2; tomb = true; pre += ` tombstone created (no session ever claimed e${ep}: a no-start fence);`; } else if (t.cm === 2) tomb = true; }
    // death inside the hold after the slot/tombstone and before the CAS: a torn fence (charged as x: the turn dies with it)
    if (pre && has(n, 'x')) { const b = clone(n); spend(b, 'x'); if (x === RSN.HO && !retry) { spend(b, 'h'); b.T[f].hv++; } b.C[i].pc = null; out.push({ lab: L && `${who} replace.mjs f${f} (${RNAME[x]}):${pre} then FAULT the script dies before the CAS (row still at e${ep}); turn ends`, n: b, fault: true, viol }); }
    if (x === RSN.HO && !retry) { spend(n, 'h'); t.hv++; }
    const host = s && s.hb;
    // FX-CLAIM (N7): a no-start fence with a failure reason is uncharged while nostart < H_nostart and counts nostart; a
    // fence that finds a session claim resets nostart; planned reasons and host stay as before
    const fail = x !== RSN.HO && !host;
    const free = P.FX_CLAIM && fail && tomb && t.ns < P.H_NOSTART;
    if (P.FX_CLAIM && fail) { if (tomb) t.ns = Math.min(P.H_NOSTART, t.ns + 1); else t.ns = 0; }
    const charged = fail && !free;
    if (P.BLD_PROPS && charged && x === RSN.CRASH && t.cm === 1) viol.push('LeaseFenceClaimed'); // S2.2: the lease act fenced a claimed attempt, charged
    if (P.BLD_PROPS && charged && t.rq) viol.push('RefusedStartNotCharged'); // S2.2: a charge for an attempt whose start the app refused
    if (charged && P.RESTART_LIMIT && t.rs >= P.R) {
      if (!P.STOP_ON_LIMIT) { t.st = ST.F; t.step = 0; next(n); out.push({ lab: L && `${who} replace.mjs f${f} (${RNAME[x]}): restart limit -> exit 1, task FAILED; the attempt is neither fenced nor stopped`, n, viol }); return out; }
      t.fail = 1;
    } else if (charged && !P.D7_FREEZE_RS) t.rs = Math.min(7, t.rs + 1);
    // D7 ghost: fences with a failure reason, read from the epochs (R8 as amended by FX-CLAIM: an uncharged no-start is not one)
    if (P.D7_RESTART && charged) t.gf = Math.min(7, t.gf + 1);
    // NoChargeWithoutFault: a restart charged on a path where no fault has happened yet
    if (P.FX_PROPS && charged && n.B.k === P.BUD.k) viol.push('NoChargeWithoutFault');
    t.cut = s ? Math.min(s.p, 1) : 0; t.ep++; t.ad = 0; /* the act-due key names the epoch (W:583-585): a new epoch is a new key */ t.step = STEP.FENCED; t.rsn = x === RSN.HO ? RSN.HO : x; t.bn = 0;
    t.ol = 0; t.orr = 0; t.cm = 0; t.sj = 0; t.le = 0; t.vr = 0; t.sq = 0; t.vt = 0; t.rq = 0; // the new attempt's log, claim and start record are empty
    next(n);
    out.push({ lab: L && `${who} replace.mjs f${f} (${host ? 'host' : RNAME[x]}):${pre}${retry ? ' retry of a torn fence (same reason);' : ''} FENCE e${ep} -> e${t.ep}${t.fail ? ' on the LIMIT path' : !charged ? ' (no charge to R)' : `, restarts=${t.rs}`}, staging cut=${t.cut} card(s)${P.AB_READY_SPLIT && !P.FX_OUT && s && s.al && s.rh && s.p < 2 ? ' -- the READY of e' + ep + ' is in flight (hook passed, write not landed) and reads as absent' : ''}`, n, viol });
    return out;
  }
  if (k === OP.S) {
    if (t.st !== ST.A || t.step !== STEP.FENCED) { next(n); out.push({ lab: L && `${who} ${opName(op)} skipped`, n, viol: [] }); return out; }
    // FX-CLAIM step 6: the fenced attempt holds a tombstone (no session ever claimed it) -> the stop is confirmed at once;
    // its sessions (if any) are left alive and inert (every tool call denied attempt-cancelled)
    let r5 = '';
    if (P.FX_CLAIM && P.FX_R5_ORPHAN && !n.S.some((s) => s.f === f && s.ep === t.ep - 1 && s.ch)) {
      // rev 5 step 6: stop requested for every folder session; a dead one answers "no such session" and its done record
      // counts when a process list matches nothing (H3; merged into this step)
      if (n.pl || !PLU(P)) for (const s of n.S) if (s.f === f && s.ep === t.ep - 1 && !s.al && s.tv && !s.dn) { if (!P.BLD_CLOSE_IDGAP) s.dn = 1; r5 = P.BLD_CLOSE_IDGAP ? ' dead folder session: no such session (its record is under the app id: not found);' : ' dead folder session closed (no such session, done record);'; }
    }
    if (P.FX_CLAIM && !n.S.some((s) => s.f === f && s.ep === t.ep - 1 && s.ch) && !(P.FX_R5_ORPHAN && n.S.some((s) => s.f === f && s.ep === t.ep - 1 && s.tv && !s.dn))) {
      t.step = STEP.STOPPED; for (const s of n.S) if (s.f === f && s.ep === t.ep - 1) s.sc = 1; // only the tombstoned attempt
      let lab = L && `${who} stop.mjs f${f}:${r5} the attempt e${t.ep - 1} holds a tombstone -> stop confirmed at once`;
      if (t.fail) { t.st = ST.F; t.step = 0; lab = L && lab + '; task FAILED, escalated'; }
      next(n); out.push({ lab, n, viol: sv }); return out;
    }
    const VER = P.FX_CLOSE && P.FX_CGATE; // FX-CLOSE step 5 with FX-CGATE's close records
    const HELD = P.AB_STOP_HELD;
    if (HELD && t.sq) { // stop verify of an attempt already stop-requested and sampled (stop.mjs:362-461)
      const r = stopVerifyGate(n, t, P);
      if (r) { next(n); out.push({ lab: L && `${who} stop.mjs verify f${f}: ${r}; row stays stop-requested`, n, viol: [] }); return out; }
      const lab = verifyFenced(n, f, P, L);
      next(n); out.push({ lab: L && `${who} stop.mjs verify f${f}:${lab}`, n, viol: sv }); return out;
    }
    let vs = [{ n, lab: '', fault: false }];
    const victims = [];
    n.S.forEach((s, q) => { if (s.f === f && s.ep < t.ep && s.al && (s.p < 2 || P.D7_SLOTS) && !s.z && !(VER && s.dn)) victims.push(q); });
    for (const q of victims) {
      const nv = [];
      // AB_TRANSCRIPT_LAG: the coordinator closes (session tool) only a session it can name: one it bound (bd) or one
      // whose transcript reconcile/stop can see (tv). Stop verify (stop.mjs:402-426) sees no transcript growth and no
      // matched process for the other, and confirms the stop while that session lives on (D4b variant).
      if (P.AB_TRANSCRIPT_LAG && !n.S[q].bd && !n.S[q].tv) {
        for (const v of vs) v.lab += L ? ` stop f${f}e${n.S[q].ep}: no transcript yet, session id unknown -> stop verify CONFIRMS while the session lives;` : '';
        continue;
      }
      for (const v of vs) {
        const a = clone(v.n); a.S[q].al = 0; if (P.FX_CGATE && !P.BLD_CLOSE_IDGAP) a.S[q].dn = 1; if (P.KILL_WAKES) wake(a, a.S[q].par);
        if (P.BLD_STOP_INTERRUPT_ONLY && P.BLD_ARCHIVE_APPROVAL) nv.push({ n: clone(v.n), lab: v.lab + (L ? ` the archive of f${f}e${v.n.S[q].ep} waits for the owner's approval (not given): it lives;` : ''), fault: v.fault });
        nv.push({ n: a, lab: v.lab + (L ? ` stop f${f}e${a.S[q].ep} ${HELD ? 'closed' : 'confirmed'}${P.FX_CGATE ? ' (close-done record)' : ''};` : ''), fault: v.fault });
        if (has(v.n, 'z')) { const b = clone(v.n); spend(b, 'z'); b.S[q].z = 1; nv.push({ n: b, lab: v.lab + (L ? ` FAULT stop of f${f}e${b.S[q].ep} unconfirmed (zombie: the close does not end it${HELD || VER ? '' : ', escalated to the owner'});` : ''), fault: true }); }
      }
      vs = nv;
    }
    for (const v of vs) {
      const tt = v.n.T[f];
      if (HELD) { // as built: stop request + the closes + the growth sample; verify needs stop_verify_deltas ticks later
        tt.sq = 1; tt.vt = 0; next(v.n);
        out.push({ lab: L && `${who} stop.mjs request f${f}:${v.lab || ' nothing live to close;'} sample taken (verify after ${2} watcher ticks)`, n: v.n, fault: v.fault, viol: sv }); continue;
      }
      if (P.AB_PROCLIST && !v.n.pl) { // stop.mjs:405-418: verify exits 2 (proc-unavailable), the row stays stop-requested
        next(v.n); out.push({ lab: L && `${who} stop.mjs f${f}:${v.lab || ''} verify exits 2 (no process list), row stays at fenced/stop-requested`, n: v.n, fault: v.fault, viol: sv }); continue;
      }
      if (VER) { const lab = verifyFenced(v.n, f, P, L); next(v.n); out.push({ lab: L && `${who} stop.mjs f${f}:${v.lab || ''}${lab}`, n: v.n, fault: v.fault, viol: sv }); continue; }
      tt.step = STEP.STOPPED;
      if (P.AB_SLOTCOUNT || P.AB_COMMIT_CLOSE) for (const s of v.n.S) if (s.f === f && s.ep < tt.ep && !s.z) s.sc = 1; // attempt stop confirmed
      let lab = L && `${who} stop.mjs f${f}:${v.lab || ' nothing live to stop;'}`;
      if (tt.fail) { tt.st = ST.F; tt.step = 0; lab = L && lab + ' task FAILED, escalated'; }
      next(v.n); out.push({ lab, n: v.n, fault: v.fault, viol: sv });
    }
    return out;
  }
  if (k === OP.A) {
    const firstStart = t.st === ST.P;
    if (!firstStart && (t.st !== ST.A || t.step !== STEP.STOPPED)) { next(n); out.push({ lab: L && `${who} ${opName(op)} skipped`, n, viol: [] }); return out; }
    if (n.C[i].dr && (P.DRAIN || firstStart || t.rsn === RSN.HO)) { next(n); out.push({ lab: L && `${who} admit.mjs f${f}: refused, draining (row stays at stopped)`, n, viol: [] }); return out; }
    if (P.AB_PROCLIST && !n.pl) { next(n); out.push({ lab: L && `${who} replace start f${f}: no process list -> slots-unknown, exit 6 deferred (row stays at stopped)`, n, viol: [] }); return out; }
    const cnt = admitCount(n, P);
    if (cnt >= P.NMAX) { next(n); out.push({ lab: L && `${who} admit.mjs f${f}: refused, ${cnt} counted >= N_max=${P.NMAX} (row stays at stopped)`, n, viol: [] }); return out; }
    if (firstStart) { t.st = ST.A; t.ep++; t.ad = 0; t.rsn = RSN.FIRST; t.cut = 0; }
    const old = n.S.find((s) => s.f === f && s.ep === t.ep - 1);
    t.ctn = old ? (old.tc | (P.CUT ? 0 : old.pf)) : 0;
    t.step = STEP.ADMITTED; t.bn = 0; next(n);
    const va = (P.D7_RESTART && !firstStart && t.gf > P.R) ? [...sv, 'RestartLimitGhost'] : sv;
    const lab = L && `${who} admit.mjs f${f}: ${cnt} counted < ${P.NMAX}; checkpoint = commits + e${t.ep - 1} staging ${P.CUT ? `prefix <= cut (${t.cut})` : 'as found'}${t.ctn ? ' (CONTAINS cards written after the fence)' : ''}; row admitted e${t.ep}${P.D7_RESTART ? ` (failure fences so far: ${t.gf}, restart counter ${t.rs})` : ''}`;
    out.push({ lab, n, viol: va });
    // AB_STALE_SNAPSHOT: the coordinator may run a status build right after its admit (no fault), so status.json shows
    // the row admitted (FIDELITY-3 sec 3, D3's longer real form)
    if (P.AB_STALE_SNAPSHOT && !stale) { const b = clone(n); snapStatus(b); out.push({ lab: L && lab + '; then runs `status` (status.json now shows the row admitted)', n: b, viol: va }); }
    return out;
  }
  if (k === OP.T) {
    // S2.2 (Q5, branches row 1): on a turn the owner did not type, the brief leaves the start due (no call). Fault q: the
    // coordinator calls it and the app refuses it; BQ5_REFUSED_SJ: the start hook ran first and left start.json
    if (P.BQ5_OWNER_TURN && !c.ot) {
      next(n); out.push({ lab: L && `${who} start-session(f${f}) left due: the owner did not type this turn`, n, viol: [] });
      if (has(st, 'q')) {
        const b = clone(st); spend(b, 'q'); const tb = b.T[f]; let w = ' nothing is written';
        if (P.BQ5_REFUSED_SJ && (!P.FX_CGATE || (tb.st === ST.A && tb.step === STEP.ADMITTED && !tb.sj))) { tb.sj = 1; tb.le = 0; tb.rq = 1; w = ' the start hook ran first: start.json is left (its lease runs)'; }
        next(b); out.push({ lab: L && `${who} FAULT start-session(f${f}) on a turn the owner did not type: the app refuses it;${w}`, n: b, fault: true, viol: [] });
      }
      return out;
    }
    const tv = P.AB_TRANSCRIPT_LAG ? 0 : 1;
    if (P.FX_CGATE) {
      // FX-CGATE step 4: the coordinator's start hook (PreToolUse on the session tool) admits the start only for a row
      // admitted at the named epoch and creates start.json by strict create (a second start is denied start-issued); the
      // hook and the tool's effect are one step here (the allow-to-effect window stays: the yield before OP.T)
      const e = ep > 0 ? ep : t.ep;
      if (!(t.st === ST.A && t.ep === e && t.step === STEP.ADMITTED)) { next(n); out.push({ lab: L && `${who} start-session(f${f}e${e}): the start hook DENIES (row not admitted at e${e})`, n, viol: [] }); return out; }
      if (t.sj) { next(n); out.push({ lab: L && `${who} start-session(f${f}e${e}): the start hook DENIES start-issued (start.json exists)`, n, viol: [] }); return out; }
      t.sj = 1; t.le = 0;
    }
    if (P.AB_START_UNFENCED && ep > 0) {
      // the session tool starts a session in wt/<f>-e<ep>/ as the coordinator read it; it checks nothing on disk.
      // The child's hook (guard-hook.mjs:394-409) then admits its tool calls only while the row is at epoch ep and open.
      const open = t.st === ST.A && t.ep === ep && (t.step === STEP.ADMITTED || t.step === STEP.RUN);
      const dup = n.S.some((s) => s.f === f && s.ep === ep);
      // state-space bound: at most N_max+1 sessions per attempt are kept; a further start is reported but not added
      // (with N_max+1 live sessions of one attempt Slots already fails, and the second start already fails
      // OneSessionPerAttempt, so no property loses a counterexample; without the cap a stale coordinator that is woken
      // by each duplicate's READY starts duplicates for ever while the current one sits at its yield point)
      if (n.S.filter((y) => y.f === f && y.ep === ep).length > P.NMAX) { next(n); out.push({ lab: L && `${who} starts ANOTHER session f${f}e${ep} (not added: cap of ${P.NMAX + 1} per attempt)`, n, viol: [...sv, 'OneSessionPerAttempt'] }); return out; }
      n.S.push(mkSession(f, ep, i, open ? t.ctn : 0, tv, P.AB_TRANSCRIPT_LAG && !stale ? 1 : 0, open ? MODE.OK : MODE.IDLE)); next(n);
      out.push({ lab: L && `${who} starts session f${f}e${ep} (session tool, no --ce${stale ? ', coordinator is STALE' : ''})${open ? '' : ' -- the row is no longer open at e' + ep + ': every tool call of the session is denied, its process idles'}${dup ? ' -- a SECOND session for the same attempt' : ''}`, n, viol: dup ? [...sv, 'OneSessionPerAttempt'] : sv });
      return out;
    }
    if (t.st !== ST.A || t.step !== STEP.ADMITTED) { next(n); out.push({ lab: L && `${who} ${opName(op)} skipped`, n, viol: [] }); return out; }
    const dup = n.S.some((s) => s.f === f && s.ep === t.ep);
    if ((P.AB_START_UNFENCED || P.AB_TRANSCRIPT_LAG || P.D7_HANDOVER_CAS) && n.S.filter((y) => y.f === f && y.ep === t.ep).length > P.NMAX) { next(n); out.push({ lab: L && `${who} starts ANOTHER session f${f}e${t.ep} (not added: cap of ${P.NMAX + 1} per attempt)`, n, viol: [...sv, 'OneSessionPerAttempt'] }); return out; }
    n.S.push(mkSession(f, t.ep, i, t.ctn, tv, P.AB_TRANSCRIPT_LAG ? 1 : 0)); next(n);
    out.push({ lab: L && `${who} starts session f${f}e${t.ep} (session tool)${dup ? ' -- a SECOND session for the same attempt' : ''}`, n, viol: dup ? [...sv, 'OneSessionPerAttempt'] : sv });
    return out;
  }
  if (k === OP.B) {
    if ((P.AB_COMMIT_CLOSE || P.FX_CLAIM) && ep > 0) { // replace bind of a row reconcile marked `started` (session id from the table)
      if (t.st !== ST.A || t.step !== STEP.RUN || t.bn || t.ep !== ep) { next(n); out.push({ lab: L && `${who} bind(f${f}e${ep}) refused (row not at started e${ep}${t.st === ST.C ? ': committed, replace.mjs:987' : ''})`, n, viol: [] }); return out; }
      // FX-CLAIM step 4: no claim -> exit 6 not-claimed (the session named is the table's, from the claim when there is one)
      if (P.FX_CLAIM && t.cm !== 1) { next(n); out.push({ lab: L && `${who} bind(f${f}e${ep}) from started: exit 6 not-claimed`, n, viol: [] }); return out; }
      t.bn = 1; next(n); out.push({ lab: L && `${who} replace.mjs --step bound f${f}e${t.ep} (from started)`, n, viol: sv }); return out;
    }
    if (P.FX_CLAIM) {
      // bind --session S right after this turn's start: S is the session this turn started and still knows (bd); with no
      // transcript lag the turn knows the session it started (par)
      const mine = n.S.find((s) => s.f === f && s.ep === t.ep && s.par === i && (P.AB_TRANSCRIPT_LAG ? s.bd : 1));
      if (t.st !== ST.A || t.step !== STEP.ADMITTED || !mine) { next(n); out.push({ lab: L && `${who} ${opName(op)} skipped`, n, viol: [] }); return out; }
      if (t.cm !== 1) { next(n); out.push({ lab: L && `${who} bind(f${f}e${t.ep}): exit 6 not-claimed (row stays admitted)`, n, viol: [] }); return out; }
      if (!mine.ch) { next(n); out.push({ lab: L && `${who} bind(f${f}e${t.ep}): exit 1 not-claim-holder (another session holds the claim)`, n, viol: [] }); return out; }
      t.step = STEP.RUN; t.bn = 1; next(n); out.push({ lab: L && `${who} replace.mjs --step bound f${f}e${t.ep} (the claim holder)`, n, viol: sv }); return out;
    }
    if (t.st !== ST.A || t.step !== STEP.ADMITTED || !cur(n, f)) { next(n); out.push({ lab: L && `${who} ${opName(op)} skipped`, n, viol: [] }); return out; }
    t.step = STEP.RUN; if (P.AB_COMMIT_CLOSE) t.bn = 1; next(n); out.push({ lab: L && `${who} replace.mjs --step bound f${f}e${t.ep}`, n, viol: sv }); return out;
  }
  if (k === OP.M) {
    const s = n.S.find((y) => y.f === f && y.ep === ep && (!P.FX_CLAIM || y.ch)) || n.S.find((y) => y.f === f && y.ep === ep);
    // FX-OUT (R-b): commit reads the ready slot of the table's epoch; READY.json is a copy no decision reads
    const outReady = P.FX_OUT && t.st === ST.A && t.ep === ep && t.ol === 1;
    if (!s || (s.p !== 2 && !outReady)) { next(n); out.push({ lab: L && `${who} commit(f${f}e${ep}): no READY`, n, viol: [] }); return out; }
    if (P.FENCE_EPOCH && ep !== t.ep) { s.hd = 1; next(n); out.push({ lab: L && `${who} commit.mjs f${f}e${ep}: exit 10 stale epoch (table e${t.ep}), zombie write logged`, n, viol: [] }); return out; }
    if (t.st !== ST.A) { s.hd = 1; next(n); out.push({ lab: L && `${who} commit.mjs f${f}e${ep}: refused, task ${['planned', 'active', 'committed', 'failed'][t.st]}`, n, viol: [] }); return out; }
    const viol = [...sv];
    if (t.cmE >= 0 && P.COMMIT_WX) {
      s.hd = 1;
      if (t.cmE === ep) { if (P.AB_COMMIT_CLOSE) t.cl = t.bn ? 1 : 3; else if (P.D7_SLOTS || P.FX_OUT) s.al = 0; t.st = ST.C; t.step = 0; next(n); out.push({ lab: L && `${who} commit.mjs f${f}e${ep}: COMMIT exists, identical -> no-op, table committed`, n, viol }); }
      else { next(n); out.push({ lab: L && `${who} commit.mjs f${f}e${ep}: exit 13, COMMIT names e${t.cmE}`, n, viol }); }
      return out;
    }
    t.ncr = Math.min(3, t.ncr + 1); t.cmE = ep; s.hd = 1;
    if (s.tc || ep !== t.ep) viol.push('NoStaleAccepted');
    const lab0 = L && `${who} commit.mjs f${f}e${ep}: COMMIT ${P.COMMIT_WX ? 'created (wx)' : 'written (overwrites)'}${s.tc ? ' -- its checkpoint holds post-fence cards' : ''}`;
    if (has(n, 't')) { const b = clone(n); spend(b, 't'); next(b); out.push({ lab: L && lab0 + ', then FAULT the script dies before the table update', n: b, fault: true, viol }); }
    if (P.AB_COMMIT_CLOSE) t.cl = t.bn ? 1 : 3;
    // FX-OUT without the as-built close: the base model's "the commit closes the committed child" (held for a READY child by
    // canon) applied to the slot's writer, which may still be mid-write (the as-built close is FX-CLOSE's, run in C_CLOSE)
    else { if (P.D7_SLOTS || P.FX_OUT) s.al = 0; if (P.FX_CLAIM) for (const y of n.S) if (y.f === f && y.ep === ep && !y.ch) { y.al = 0; y.dn = 1; } } // D7: without a modelled close, the committed child is closed with the commit (base assumption made explicit)
    t.st = ST.C; t.step = 0; next(n); out.push({ lab: L && lab0 + `, table committed${P.AB_COMMIT_CLOSE && !t.bn ? ' at step `started` (never bound): stop.mjs:278 will refuse its stop request' : ''}`, n, viol });
    return out;
  }
  if (k === OP.D) {
    if (!has(n, 'd') || c.dr) { next(n); out.push({ lab: L && `${who} drain skipped`, n, viol: [] }); return out; }
    spend(n, 'd'); c.dr = 1; next(n); out.push({ lab: L && `${who} reaches W*_coord: drains (coord.json), every start blocked`, n, viol: sv }); return out;
  }
  if (k === OP.H) {
    if (P.AB_PROCLIST && !n.pl) { c.pc = P.FIX_ENDTURN_ALWAYS ? [[OP.E, 0, 0, 0]] : null; out.push({ lab: L && `${who} handover raise: no process list -> exit 2 (proc-unavailable, handover.mjs:271-276); ${P.FIX_ENDTURN_ALWAYS ? 'goes to endturn (N2)' : 'turn ends'}`, n, viol: [] }); return out; }
    if (!c.dr || !readyToHandOver(n, P)) { c.pc = null; out.push({ lab: L && `${who} handover skipped: not quiescent; turn ends`, n, viol: [] }); return out; }
    if (P.D7_HANDOVER_CAS && c.ce !== n.ce) { c.pc = null; out.push({ lab: L && `${who} handover.mjs raise: CAS on ce fails (read ${c.ce}, coord.json ${n.ce}); turn ends`, n, viol: [] }); return out; }
    c.pc = null;
    if (P.AB_ARM_SPLIT || P.AB_ENDTURN_SPLIT) n.ar = 0; // alarm.json now names an older ce
    if (XB) n.x &= ~15; // FX-W1/W2: the slot records and their markers name an older ce (free for the successor)
    if (!P.AB_HANDOVER_NOKILL) {
      for (const w of n.W.filter((w) => w.par === i)) { if (w.lk) n.ws = 1; if (P.KILL_WAKES) wake(n, i); }
      n.W = n.W.filter((w) => w.par !== i);
      killAlarmsOf(n, i, P);
    }
    n.ce++; n.to = 0; c.pc = null;
    out.push({ lab: L && (P.AB_HANDOVER_NOKILL ? `${who} handover.mjs raise: ce -> ${n.ce}; its watcher and alarm are reported, not killed (handover.mjs:283-297)` : `${who} handover.mjs: kills its watcher and alarm, ce -> ${n.ce}`), n, viol: sv });
    return out;
  }
  if (k === OP.SR) { // stop.mjs request, one lock hold (268-301); a committed row only at `bound` (278); FX-CLOSE step 3: also `started`
    if (t.st !== ST.C || !(t.cl === 1 || (t.cl === 3 && P.FX_CLOSE))) { next(n); out.push({ lab: L && `${who} ${opName(op)} ${t.st === ST.C && t.cl === 3 ? 'refused: wrong-step (committed at started, stop.mjs:278)' : 'skipped'}`, n, viol: [] }); return out; }
    t.cl = 2; t.vt = 0;
    const res = [{ n, lab: '', fault: false }];
    if (P.FX_CLOSE && P.FX_CGATE) closeCommitted(res, f, P, L); // the close tool right after the request (FX-CLOSE step 4)
    for (const r of res) { next(r.n); out.push({ lab: L && `${who} stop.mjs request f${f}e${t.ep} (committed) -> stop-requested${P.AB_STOP_HELD ? ', sample taken' : ''};${r.lab}`, n: r.n, fault: r.fault, viol: sv }); }
    return out;
  }
  if (k === OP.SV) { // stop.mjs verify (375-461): no matched process (worst reading) and no transcript growth -> confirmed
    if (t.st !== ST.C || t.cl !== 2) { next(n); out.push({ lab: L && `${who} ${opName(op)} skipped`, n, viol: [] }); return out; }
    if (P.AB_STOP_HELD) { const r = stopVerifyGate(n, t, P); if (r) { next(n); out.push({ lab: L && `${who} stop.mjs verify f${f}e${t.ep} (committed): ${r}; stays stop-requested`, n, viol: [] }); return out; } }
    if (P.AB_PROCLIST && !n.pl) { next(n); out.push({ lab: L && `${who} stop.mjs verify f${f}e${t.ep}: no process list -> exit 2, stays stop-requested`, n, viol: [] }); return out; }
    if (P.FX_CLOSE && P.FX_CGATE) {
      const res = [{ n, lab: '', fault: false }];
      closeCommitted(res, f, P, L); // FX-PLAN lists stop-session again for a session with no record (a redo)
      for (const r of res) {
        const tt = r.n.T[f]; const bad = r.n.S.filter((s) => s.f === f && s.ep === tt.ep && !s.dn && (s.al || (P.BLD_VERIFY_RECORDS && (s.ch || s.tv))));
        let lab;
        if (bad.length) { tt.vt = 0; tt.vr = Math.min(3, tt.vr + 1); lab = ` verify UNCONFIRMED (no close-done record), verify_rounds=${tt.vr}`; }
        else { tt.cl = 0; lab = ' stop confirmed, the slot is free'; }
        next(r.n); out.push({ lab: L && `${who} stop.mjs verify f${f}e${tt.ep} (committed):${r.lab}${lab}`, n: r.n, fault: r.fault, viol: sv });
      }
      return out;
    }
    t.cl = 0; if (P.D7_SLOTS) for (const s of n.S) if (s.f === f && s.ep === t.ep) s.al = 0; // D7: the close of the committed child
    next(n); out.push({ lab: L && `${who} stop.mjs verify f${f}e${t.ep} (committed): stop confirmed, the slot is free`, n, viol: sv }); return out;
  }
  if (k === OP.Y) {
    if (!n.T.every((tt) => term(tt.st))) { next(n); out.push({ lab: L && `${who} synthesis skipped`, n, viol: [] }); return out; }
    n.syn = 1; n.W = []; n.A = []; c.pc = null;
    out.push({ lab: L && `${who} synthesis reads the committed outputs; run ends`, n, viol: sv });
    return out;
  }
  if (k === OP.E && P.AB_ENDTURN_SPLIT) {
    // status --endturn as built (S:606-659): one lock hold writes acked.json (t5), then a wake check outside the lock with
    // a process list taken before it (t4, t7-t10). It starts nothing; the starts are the turn's later tool calls SW/SA.
    if (n.rl && !n.pl) { c.pc = null; out.push({ lab: L && `${who} status --endturn: run.lock held by a dead holder that cannot be judged (no process list) -> exit 75 after ~30 s, nothing acked, nothing reported; turn ends`, n, viol: sv, d6: 'p5' }); return out; }
    ackAt(n, i, P, c.rd);
    if (P.FIX_ARM_FIRST || P.FIX_ALARM_MARKER) {
      // wake fixes: the watcher part as built (no marker for a watcher); the alarm part reads the slots (FX-W2) or alarm.json,
      // tri-state under FX-W1 (exit 1 on any dead source, exit 2 only when none is dead and some is unknown; a corrupt
      // alarm.json is an anomaly, not 67). Without FX-W1: as built (no list and any record -> exit 2, S:652-654)
      if (n.cj && !P.FIX_ALARM_MARKER) { c.pc = null; out.push({ lab: L && `${who} status --endturn: acked_seq written, then alarm.json unreadable -> exit 67, no wake reasons; turn ends`, n, viol: sv, d6: 'p5' }); return out; }
      const wv = n.pl ? (n.W.some((w) => w.par === i && w.ph === 1) ? 1 : 0) : (n.W.some((w) => w.lk) || n.ws ? 2 : 0);
      const NS = P.FIX_ARM_FIRST ? P.ALARM_SLOTS : 1;
      const av = []; for (let k2 = 0; k2 < NS; k2++) av.push(slotVerdict(n, k2, P));
      const vs = [wv, ...av];
      const anyDead = vs.includes(0); const anyUnk = vs.includes(2);
      const hide = P.FIX_ALARM_MARKER ? (!anyDead && anyUnk) : (!n.pl && (wv === 2 || av.includes(2)));
      if (hide && !P.AB_EXIT2_START) { c.pc = null; out.push({ lab: L && `${who} status --endturn: ${P.FIX_ALARM_MARKER ? 'no source dead, one unknown' : 'no process list and a record present'} -> exit 2 proc-unavailable; the coordinator starts nothing (branch B2); turn ends`, n, viol: sv, d6: 'p3b' }); return out; }
      const rest = [];
      if (hide || wv === 0) rest.push([OP.SW, 0, 0, 0]);
      for (let k2 = 0; k2 < NS; k2++) if (hide || av[k2] === 0) rest.push([P.FIX_ARM_FIRST ? OP.EN : OP.SA, 0, 0, 0]);
      c.pc = rest.length ? rest : null;
      out.push({ lab: L && `${who} status --endturn: acked; watcher ${['dead', 'alive', 'unknown'][wv]}, alarm slot(s) ${av.map((v) => ['dead', 'alive', 'unknown'][v]).join('/')}${hide ? ' -> exit 2; branch B1: starts both anyway' : rest.length ? ' -> exit 1' : ' -> exit 0'}${rest.length ? '' : '; turn ends'}`, n, viol: sv });
      return out;
    }
    if (n.cj) { c.pc = null; out.push({ lab: L && `${who} status --endturn: acked_seq written, then alarm.json unreadable -> exit 67 (S:644-646), no wake reasons; turn ends`, n, viol: sv, d6: 'p5' }); return out; }
    let wRec, aRec, why;
    if (n.pl) { wRec = n.W.some((w) => w.par === i && w.ph === 1); aRec = n.A.includes(i); }
    else {
      const wNull = n.W.some((w) => w.lk) || n.ws; const aNull = !!n.ar;
      if (wNull || aNull) {
        if (!P.AB_EXIT2_START) { c.pc = null; out.push({ lab: L && `${who} status --endturn: no process list and a ${wNull ? 'watcher.lock' : 'alarm.json'} record present -> exit 2 proc-unavailable, which hides any missing source (S:652-654); the coordinator starts nothing (branch B2); turn ends`, n, viol: sv, d6: 'p3b' }); return out; }
        wRec = false; aRec = false; why = ' exit 2 proc-unavailable; branch B1: starts both anyway';
      } else { wRec = false; aRec = false; }
    }
    const rest = [];
    if (!wRec) rest.push([OP.SW, 0, 0, 0]);
    if (!aRec) rest.push([OP.SA, 0, 0, 0]);
    c.pc = rest.length ? rest : null;
    out.push({ lab: L && `${who} status --endturn: acked_seq=${P.ACK_READ ? 'seq read at turn start' : 'ledger head'};${why || (rest.length ? `${wRec ? '' : ' watcher-missing'}${aRec ? '' : ' alarm-missing'} (exit 1)` : ' both sources alive (exit 0)')}${rest.length ? '' : '; turn ends'}`, n, viol: sv });
    return out;
  }
  if (k === OP.EN) { // FX-W2 steps 1-4: `watch --alarm --ensure` (background); start, the query outside the lock and hold 1 merged
    if (P.AB_ARM_SPLIT && n.rl && !n.pl) { next(n); out.push({ lab: L && `${who} watch --alarm --ensure: run.lock held by a holder no list can judge -> exit 75, nothing registered`, n, viol: sv }); return out; }
    let reg = -1; const NS = P.ALARM_SLOTS;
    for (let k2 = 0; k2 < NS && reg < 0; k2++) if (slotVerdict(n, k2, P) === 0) reg = k2;
    if (reg < 0) { next(n); out.push({ lab: L && `${who} watch --alarm --ensure: no free slot (each holds an alarm judged alive or unknown) -> exit 0 present`, n, viol: sv }); return out; }
    // a process of that slot still running was judged dead wrongly: it exits superseded at its next beat (W:778-788)
    n.A = n.A.map((a) => (aPar(a) === i && !aSup(a) && aSlot(a) === reg ? a | 8 : a));
    setBit(n, reg, 1); setBit(n, 2 + reg, 0); n.cj = 0; if (P.AB_ARM_SPLIT || P.AB_ENDTURN_SPLIT) n.ar = 1;
    if (alarmsOf(n, i) < 4) n.A.push(i | (reg << 4) | 32); // bit 5: registered in the running turn, before its reconcile
    next(n); out.push({ lab: L && `${who} watch --alarm --ensure: slot ${reg} free -> registers and sleeps as the alarm`, n, viol: sv }); return out;
  }
  if (k === OP.RC) { // FX-W2 step 5-7: reconcile r1-r13 + turn.json, the wait, hold 2 (live slots); then the plan
    let fail = null;
    if (P.AB_ARM_SPLIT && n.rl && !n.pl) fail = 'exits 75 (run.lock held by a holder no process list can judge): no status.json';
    else {
      reconcile(n, P); c.rd = n.seq; if (P.AB_STALE_SNAPSHOT) snapStatus(n);
      if (P.AB_ARM_SPLIT && n.cj && !P.FIX_ALARM_MARKER) fail = 'exits 67 (alarm.json unreadable): no status.json';
      else { if (n.pl) n.rl = 0; if (P.AB_ACT_DUE) { for (const t2 of n.T) if (t2.aks === 1) t2.aks = 2; if (n.rk === 1) n.rk = 2; } }
    }
    if (fail) { c.pc = P.FIX_ENDTURN_ALWAYS ? [[OP.E, 0, 0, 0]] : null; out.push({ lab: L && `${who} status --reconcile ${fail}; ${P.FIX_ENDTURN_ALWAYS ? 'goes to endturn (N2)' : 'turn ends'}`, n, viol: sv, d6: 'p5' }); return out; }
    n.A = n.A.map((a) => (aPar(a) === i ? a & ~32 : a)); // seconds after the ensure: from here on it may fire (untimed)
    let live = 0; for (let k2 = 0; k2 < P.ALARM_SLOTS; k2++) if (slotVerdict(n, k2, P) > 0) live++;
    const conf = live >= P.ALARM_SLOTS;
    const head = `${who} status --reconcile: ${live} live slot(s) -> ${conf ? 'arm confirmed' : 'exit 1 arm-unconfirmed'}`;
    for (const ops of plans(n, i, P)) {
      const vars = [{ ops, o: false }];
      if (P.AB_ACT_DUE && has(n, 'o') && ops.length > 1 && ops[ops.length - 1][0] === OP.E) vars.push({ ops: [ops[ops.length - 1]], o: true });
      for (const v of vars) {
        const m = clone(n); if (v.o) spend(m, 'o');
        m.C[i].pc = v.ops.length ? v.ops.map((o) => o.slice()) : null;
        out.push({ lab: L && `${head}; plan: ${v.ops.length ? v.ops.map(opName).join(' > ') : '(nothing)'}${v.o ? ' -- FAULT o: it goes to endturn without taking the planned acts' : ''}`, n: m, fault: v.o, viol: sv });
      }
    }
    return out;
  }
  if (k === OP.SW) { // the coordinator's background tool call `node tcb/watch.mjs` (W:707-748)
    const holder = n.W.some((w) => w.ph === 1 && w.lk);
    let lab;
    if (holder || (n.ws && !n.pl) || (n.rl && !n.pl)) { n.W.push({ par: i, ph: 0, lk: 0, gap: 0 }); lab = `${who} starts watch.mjs: ${holder ? 'watcher.lock is held by a live watcher' : 'a stale lock cannot be judged with no process list'}; it will exit 75 after ~30 s (L:1327,1377)`; }
    else { if (n.ws) n.ws = 0; n.W.push({ par: i, ph: 1, lk: 1, gap: 0 }); if (P.AB_GP_RESTART) n.gp = 0; lab = `${who} starts watch.mjs (it takes watcher.lock)`; }
    next(n); out.push({ lab: L && lab + (n.C[i].pc ? '' : '; turn ends'), n, viol: sv }); return out;
  }
  if (k === OP.SA || k === OP.AR) { // the coordinator's background tool call `node tcb/watch.mjs --alarm` (W:752-804)
    const lab = startAlarm(n, i, P);
    next(n); out.push({ lab: L && `${who} starts watch.mjs --alarm${k === OP.AR ? ' (reconcile said alarm-missing)' : ''}:${lab}${n.C[i].pc ? '' : ' turn ends'}`, n, viol: sv }); return out;
  }
  if (k === OP.E) {
    let lab = L && `${who} status --endturn:`;
    // the watcher
    if (P.WATCHER_LOCK) {
      const holder = n.W.some((w) => w.ph === 1 && w.lk);
      if (!holder) {
        if (n.ws) { n.ws = 0; lab = L && lab + ' breaks the stale watcher.lock,'; }
        n.W.push({ par: i, ph: 1, lk: 1, gap: 0 }); lab = L && lab + ' starts watch.mjs (it takes watcher.lock),';
      } else lab = L && lab + ' watcher.lock held by a live watcher,';
    } else {
      const fresh = n.W.some((w) => w.par === i && !w.gap);
      if (!fresh) { n.W.push({ par: i, ph: 1, lk: 0, gap: 0 }); lab = L && lab + (n.W.length > 1 ? ' no fresh tick -> starts ANOTHER watch.mjs,' : ' starts watch.mjs,'); }
      else lab = L && lab + ' live watcher,';
    }
    // the alarm
    c.pc = null; // the kills below happen during the last tool call: their exits start a new turn
    if (P.ALARM && !P.FIX_ARM_FIRST) {
      if (P.FIX_ARM_BY_WRITE && n.A.includes(i)) lab = L && lab + ' re-arms the live alarm by writing its token,';
      else if (P.AB_ALARM_SUPERSEDE) lab = L && lab + startAlarm(n, i, P);
      else { const killed = killAlarmsOf(n, i, P); n.A.push(i); lab = L && lab + (killed ? ` kills the alarm${P.KILL_WAKES ? ' (its exit is a wake to coord' + i + ')' : ''} and starts a new one,` : ' starts the alarm,'); }
    }
    ackAt(n, i, P, c.rd); n.to = 0;
    c.pc = null;
    if (P.FIX_ENDTURN_RECHECK && (n.seq > c.rd || n.T.some((tt, ff) => tt.st === ST.A && tt.step === STEP.RUN && cur(n, ff) && cur(n, ff).p === 2))) { c.wk = Math.min(3, c.wk + 1); lab = L && lab + ' something changed since the read -> exit 1, the turn goes on (re-plan);'; }
    out.push({ lab: L && lab + ` acked_seq=${P.ACK_READ ? 'seq read at turn start' : 'ledger head'}; turn ends`, n, viol: sv });
    return out;
  }
  throw new Error('bad op ' + op);
}

// A turn's ops run back to back; other processes interleave only at yield points: before a fence
// (the plan may be stale), after a fence (the fence-to-stop window) and before endturn. The turn can
// die (fault x) before any op.
function macro(st0, i, P, L, labs0, fromPlan) {
  const res = [];
  const go = (s, labs, fault, viol, ranAny, prevF, d6) => {
    const c = s.C[i];
    if (!c.pc) { res.push({ lab: L && labs.join(' | '), n: s, fault, viol, d6 }); return; }
    const o = c.pc[0];
    // AB_START_UNFENCED: the session-tool start is its own tool call; one yield point before it (SEM-fence 3.5)
    if (ranAny && (o[0] === OP.F || o[0] === OP.E || prevF || (P.AB_START_UNFENCED && o[0] === OP.T) || (P.FX_CLAIM && o[0] === OP.B) || (P.FIX_ARM_FIRST && o[0] === OP.RC))) { res.push({ lab: L && labs.join(' | '), n: s, fault, viol, d6 }); return; }
    if (has(s, 'x')) {
      // D6 path tags: p1 a first turn (no alarm of this ce ever registered) dies before its arm, p2 dies between
      // reconcile's alarm-missing and the alarm start, p3 dies between endturn and the watcher/alarm starts, p4 dies
      // elsewhere mid-turn (e.g. after its alarm exited into the turn), p6 the crash also kills its background commands
      const call1 = o[0] === OP.EN && c.pc.length === (P.ALARM_SLOTS === 2 ? 3 : 2) && c.pc[c.pc.length - 1][0] === OP.RC; // FX-W2: before the turn's first tool call
      const tag = call1 ? 'p0' : o[0] === OP.AR ? (s.ar ? 'p2' : 'p1') : (o[0] === OP.SW || o[0] === OP.SA || o[0] === OP.EN) ? 'p3' : 'p4';
      const kinds = P.AB_X_KILLS_BG ? [0, 1] : [0];
      for (const kb of kinds) {
        const n = clone(s); spend(n, 'x'); n.C[i].pc = null;
        // AB_TRANSCRIPT_LAG: the session id of a session this turn started but did not bind dies with the turn
        if (P.AB_TRANSCRIPT_LAG) for (const y of n.S) { const ty = n.T[y.f]; if (y.par === i && y.bd && ty.st === ST.A && ty.step === STEP.ADMITTED && y.ep === ty.ep) y.bd = 0; }
        if (kb) { n.W = n.W.filter((w) => w.par !== i); n.A = n.A.filter((a) => aPar(a) !== i); }
        res.push({ lab: L && [...labs, kb ? `FAULT coord${i}'s claude.exe crashes before ${opName(o)}; its background watcher and alarms die with it, no exit reaches it` : `FAULT coord${i}'s turn dies before ${opName(o)}`].join(' | '), n, fault: true, viol, d6: kb && tag !== 'p0' ? 'p6' : tag }); // FX-W2: a crash before call 1 is p0 either way
      }
    }
    for (const r of runOp(s, i, P, L)) go(r.n, [...labs, r.lab], fault || !!r.fault, [...viol, ...r.viol], true, o[0] === OP.F, r.d6 || d6);
  };
  go(st0, labs0, false, [], fromPlan, false, null);
  return res;
}

// ---------------------------------------------------------------- the watcher
const ACTNAME = ['', 'replace-fence(first)', 'replace-start', 'stop-request', 'stop-verify', 'start-session/bind', 'bind'];
// what status.mjs would put on the coordinator's list, apart from READY and ledger events
function actionable(n, P) {
  const c = n.C[n.ce]; if (!c) return false;
  if (n.T.every((t) => term(t.st))) return !n.syn;
  if (c.dr && readyToHandOver(n, P)) return true;
  if (n.E.some((e) => e.seq > n.ack)) return true; // ledger events after acked_seq (coord.json)
  const slots = admitCount(n, P) < P.NMAX;
  for (let f = 0; f < n.T.length; f++) {
    const t = n.T[f];
    if (t.st === ST.P && !c.dr && slots) return true;
    if (P.FX_PLAN && t.st === ST.C && P.AB_COMMIT_CLOSE) { const a = planAct(n, f, P, c); if (a === 'stop-request' || (a === 'stop-verify' && (!P.AB_STOP_HELD || t.vt >= 2))) return true; continue; }
    if (t.st !== ST.A) continue;
    // AB_STOP_HELD: a stop-requested row waiting for its ticks is not an act (the tick that completes the wait raises it)
    if (P.AB_STOP_HELD && t.step === STEP.FENCED && t.sq && t.vt < 2) continue;
    // FX-PLAN: the watcher reads the same planner act (rowAct delegates): wait and owner are not acts for the coordinator
    if (P.FX_PLAN && (t.step === STEP.ADMITTED || (t.step === STEP.RUN && P.FX_CLAIM && !t.bn) || t.step === STEP.FENCED)) { const a = planAct(n, f, P, c); if (a !== 'none' && a !== 'owner' && a !== 'run') return true; continue; }
    if (t.step === STEP.FENCED || t.step === STEP.ADMITTED) return true;
    if (t.step === STEP.STOPPED && (!c.dr || (!P.DRAIN && t.rsn !== RSN.HO)) && slots) return true;
  }
  return false;
}
function tickEnabled(n, w) {
  if (w.gap) return true;
  for (const s of n.S) {
    const t = n.T[s.f];
    if (s.al && s.m === MODE.OK && s.p < 2 && s.ep === t.ep && t.st === ST.A && t.step === STEP.RUN && !s.mv && !s.pu) return false;
  }
  return true;
}
function tick(st, j, P, L) {
  const n = clone(st); const w = n.W[j];
  const par = w.par;
  if (n.C[par].ce < n.ce) { n.W.splice(j, 1); wake(n, par); return { lab: L && `watcher(coord${par}) tick: coord.json ce=${n.ce} is newer -> exits 31, which wakes coord${par}`, n, viol: [] }; }
  const evs = []; const viol = []; const notes = []; const gp0 = n.gp;
  for (let f = 0; f < n.T.length; f++) {
    const t = n.T[f];
    if (t.st !== ST.A || t.step !== STEP.RUN) continue;
    const s = cur(n, f);
    if (P.FX_OUT ? t.ol === 1 : s && s.p === 2) { // FX-OUT (R-a): the watcher reads the ready slot
      // AB_ACT_DUE: READY (class 11) is keyed like every class: raised once, then silent once acknowledged
      if (!P.AB_ACT_DUE) evs.push({ f, ep: t.ep, cls: 0, ready: 1 });
      else if (!t.ry) { t.ry = 1; t.aks = 1; evs.push({ f, ep: t.ep, cls: 0, ready: 1 }); }
      continue; // R4: exits within delta; R5: READY voids suspicion
    }
    if (!s) continue;
    const fresh = t.wep !== t.ep;
    if (fresh) { t.wep = t.ep; t.cs = 0; t.hs = 0; t.rep = 0; }
    // M5 as built: the discount reads the wall gap since the last evaluation (gp), which only a long pause leaves
    const disc = P.FIX_PAUSE_DISCOUNT && (P.AB_PAUSE_GAP ? gp0 : s.pu);
    if (P.FIX_OP_DEADLINE && fresh) { /* FX-W6 step 1: the first tick of an epoch counts nothing */ }
    else if (P.AB_HANG_CALLS && fresh) { if (!disc) t.hs = Math.min(P.H_HANG, t.hs + 1); } // W:375: a fresh state forces newCalls = 0
    else if (s.mv) { t.cs = 0; t.hs = 0; }
    else if (s.nc > 0) { if (P.PROGRESS) t.cs = Math.min(P.C_STALL, t.cs + s.nc); t.hs = 0; }
    // FX-W6 B1: a healthy in-call child ends its call within its kind's deadline (the stated bound): its count stays below it
    else if (!disc) t.hs = Math.min(P.FIX_OP_DEADLINE && s.m === MODE.SLOW ? P.H_HANG - 1 : P.H_HANG, t.hs + 1);
    let cls = 0;
    if (s.sig >= P.LOOP && !P.D7_NO_LOOP_RULE) cls = RSN.LOOP; else if (P.PROGRESS && t.cs >= P.C_STALL) cls = RSN.STALL; else if (t.hs >= P.H_HANG) cls = RSN.HANG;
    if (L && !cls && (t.hs || t.cs)) notes.push(`f${f}: hang=${t.hs} stall=${t.cs}`);
    if (cls && !t.rep) { t.rep = 1; evs.push({ f, ep: t.ep, cls }); if (s.m === MODE.OK || s.m === MODE.SLOW) viol.push('NoFalseSuspicion'); }
    // FX-W5: an acknowledged suspicion whose condition still holds is raised again (at-least-once; interval untimed)
    else if (cls && P.FIX_ACT_RERAISE && !n.E.some((e) => e.f === f && e.ep === t.ep && e.seq > n.ack)) evs.push({ f, ep: t.ep, cls });
    if (P.D7_LOOPS && s.m === MODE.LOOPS && s.sig >= P.LOOP && !t.rep) viol.push('LoopReported');
  }
  // AB_STOP_HELD: watcher.json's tick counter advances; a stop-requested row whose sample is now stop_verify_deltas old
  // makes stop-verify due (act-due, W:543-567: the watcher exits 17 and wakes)
  if (P.AB_STOP_HELD) n.T.forEach((t, f) => {
    if ((t.st === ST.A && t.step === STEP.FENCED && t.sq) || (t.st === ST.C && t.cl === 2)) { if (t.vt < 2) { t.vt++; if (t.vt === 2) evs.push({ f, ep: t.ep, cls: 0, ready: 1, open: 1, txt: `act-due stop-verify f${f}` }); } }
  });
  // FX-CLAIM lease (start_lease_ticks abstracted to one tick): a start record with no session claim expires at a tick;
  // reading (i) only when no live healthy unclaimed session of the attempt exists (the measured start-lag bound), reading
  // (ii) (FX_LEASE_NOBOUND) at any tick. FX-PLAN then answers fence-crash, raised as act-due
  if (P.FX_CGATE && P.FX_PLAN) n.T.forEach((t, f) => {
    if (!(t.st === ST.A && (t.step === STEP.ADMITTED || (t.step === STEP.RUN && !t.bn)) && t.sj && !t.le && t.cm !== 1)) return;
    if (!P.FX_LEASE_NOBOUND && n.S.some((y) => y.f === f && y.ep === t.ep && y.al && y.p < 2 && y.m === MODE.OK && !y.ch)) return;
    t.le = 1; evs.push({ f, ep: t.ep, cls: 0, ready: 1, open: 1, txt: `act-due f${f}: start lease expired with no claim (fence crash)` });
  });
  for (const s of n.S) { s.mv = 0; s.nc = 0; s.pu = 0; }
  const gap = w.gap || gp0; w.gap = 0; n.gp = 0;
  if (P.AB_ACT_DUE) {
    // M3 as built (W:543-567, 583-663): per row act from the table, empty-list slot count; a new act (or a changed one)
    // appends an event and raises; an absent condition clears the key; keys stay due while not acknowledged (aks > 0),
    // also ledger events after acked_seq. Exit 17 when something is due.
    const cc = n.C[n.ce];
    const used = slotCountEmpty(n, P); const slotFree = used < P.NMAX; const blocked = !!(cc && cc.dr && P.DRAIN);
    let raised = [];
    let anyAct = false;
    n.T.forEach((t, f) => {
      const a = rowAct(n, f, slotFree, blocked, P);
      if (a) { anyAct = true; if (t.ad !== a) { t.ad = a; t.aks = 1; raised.push(`f${f}:${ACTNAME[a]}`); } else if (P.FIX_ACT_RERAISE && t.aks === 0) { t.aks = 1; raised.push(`f${f}:${ACTNAME[a]} (again: acknowledged, still due)`); } }
      else t.ad = 0;
    });
    const H = cc && cc.dr && used === 0 ? 1 : 0;
    const Tm = !anyAct && n.T.every((t) => term(t.st)) && !n.syn ? 2 : 0;
    const ra = H | Tm;
    if ((ra & ~n.ra) !== 0) { n.rk = 1; raised.push(ra & 1 ? 'handover' : 'run-terminal'); }
    n.ra = ra;
    const due = n.T.some((t) => t.aks) || n.rk || n.E.some((e) => e.seq > n.ack);
    if (raised.length || due) evs.push({ f: 0, ep: 0, cls: 0, ready: 1, open: 1, txt: raised.length ? `act-due raised: ${raised.join(', ')}` : 'unacknowledged keys due' });
  } else if (P.FIX_WATCHER_ACTIONABLE && actionable(n, P)) evs.push({ f: 0, ep: 0, cls: 0, ready: 1, open: 1 });
  if (evs.length) {
    for (const e of evs) if (!e.ready) { n.seq++; n.E.push({ f: e.f, ep: e.ep, cls: e.cls, seq: n.seq }); }
    n.W.splice(j, 1); wake(n, par);
    const urgent = evs.some((e) => !e.ready);
    return { lab: L && `watcher(coord${par}) tick${gap ? ' after a pause' : ''}: ${evs.map((e) => (e.txt ? e.txt : e.open ? 'status shows an act due (unacked ledger events, a row mid step machine, a hand-over or synthesis)' : e.ready ? `READY f${e.f}e${e.ep}` : `${RNAME[e.cls]} f${e.f}e${e.ep} -> ledger`)).join(', ')}; exits ${urgent ? 20 : 10}, which wakes coord${par}`, n, viol };
  }
  return { lab: L && `watcher(coord${par}) tick: no event${notes.length ? ` (${notes.join('; ')})` : ''}`, n, viol };
}

// ---------------------------------------------------------------- successors
// proc ids for fairness: coordinator i -> i (0..3), watcher 4, alarm 5, owner 6, child (f,ep) 7 + f*6 + min(ep,5)
export const PROC = { W: 4, A: 5, O: 6, OT: 29 }; // S2.2: OT, the owner types (Q5), the one strongly fair process (check-build.mjs)
const childProc = (s) => 7 + s.f * 6 + Math.min(s.ep, 5);

export function successors(st, P, L) {
  const out = [];
  if (st.syn) return out;
  // u: untimed (coordinator steps and immediate lock races), ow: owner wake, pl: planned optional event
  const push = (lab, n, o) => out.push({ lab, s: n, fault: !!o.fault, viol: o.viol || [], proc: o.proc, u: !!o.u, ow: !!o.ow, pl: !!o.pl, d6: o.d6 || null });
  // children
  st.S.forEach((s, q) => {
    if (!s.al || s.p >= 2) return;
    const t = st.T[s.f];
    const proc = childProc(s);
    const stale = s.ep < t.ep;
    // AB_TRANSCRIPT_LAG: the transcript's first record with a cwd appears (lib.mjs:2357-2358); the child's own act
    if (P.AB_TRANSCRIPT_LAG && !s.tv) { const n = clone(st); n.S[q].tv = 1; push(L && `transcript of f${s.f}e${s.ep} becomes visible (first record with cwd)`, n, { proc }); }
    // FX-CLAIM step 1: the first tool call of a session of the current attempt goes through the claim (the hook, no lock,
    // atomic by the hard link): no claim -> it creates one and the call goes on (mv); another session's claim or a
    // tombstone -> denied, and the session ends its turn and idles (alive until a close)
    const preClaim = P.FX_CLAIM && s.m === MODE.OK && !s.ch && !stale;
    if (preClaim) {
      const n = clone(st); const y = n.S[q]; const tt = n.T[y.f];
      if (tt.cm === 0 && tt.st === ST.A && (tt.step === STEP.ADMITTED || tt.step === STEP.RUN)) {
        tt.cm = 1; y.ch = 1; y.mv = 1; y.pu = 0; y.tv = 1; if (P.FX_PROPS) y.wr = 1;
        push(L && `child f${y.f}e${y.ep}'s first tool call: the hook creates claim.json (session claim)`, n, { proc });
      } else {
        y.m = MODE.IDLE; y.tv = 1;
        push(L && `child f${y.f}e${y.ep}'s first tool call: the hook DENIES (${tt.cm === 1 ? 'attempt-claimed' : tt.cm === 2 ? 'attempt-cancelled' : 'row not open'}); it ends its turn and idles`, n, { proc });
      }
    } else if (s.m === MODE.OK && (P.AB_READY_SPLIT || P.FX_OUT) && s.p === 1 && !s.rh) {
      // the hook of the READY Write: guard-hook.mjs:394-409 (epoch equal, row active at admitted/started/bound), no lock
      if (t.st === ST.A && t.ep === s.ep && (t.step === STEP.ADMITTED || t.step === STEP.RUN)) {
        const n = clone(st); const y = n.S[q]; const tt = n.T[y.f];
        // FX-OUT step 1: the READY hook creates the ready slot by exclusive create; a fenced slot (a torn fence) -> deny
        if (P.FX_OUT && tt.ol === 2) { y.m = MODE.IDLE; y.mv = 1; push(L && `child f${y.f}e${y.ep} calls Write READY.json: the hook finds a FENCED slot in the outcome log -> denied; it idles`, n, { proc }); }
        else {
          if (P.FX_OUT) tt.ol = 1;
          y.rh = 1; y.mv = 1; y.pu = 0; y.nc = 0; y.sig = 0; y.tv = 1; if (P.FX_PROPS) y.wr = 1;
          push(L && `child f${y.f}e${y.ep}${y.z ? ' (zombie)' : ''} calls Write READY.json: the hook passes (epoch e${y.ep} current)${P.FX_OUT ? ', creates the READY SLOT in the outcome log' : ''}, the write is in flight`, n, { proc });
        }
      }
    } else if (s.m === MODE.OK) {
      const n = clone(st); const y = n.S[q];
      y.p++; y.mv = 1; y.pu = 0; y.nc = 0; y.sig = 0; y.tv = 1; if (P.FX_PROPS && !stale) y.wr = 1;
      if (stale) y.pf = 1;
      if (y.p === 2) { wake(n, y.par); y.rh = 0; }
      push(L && `child f${y.f}e${y.ep}${y.z ? ' (zombie)' : ''} ${y.p === 2 ? `${P.AB_READY_SPLIT ? 'READY.json write lands (no re-check)' : 'writes READY'}, its turn-end note wakes coord${y.par}` : 'journals a card (V falls)'}${stale ? ' AFTER its fence' : ''}`, n, { proc });
    } else if (s.m === MODE.STUCK) {
      const n = clone(st); n.S[q].m = MODE.OK;
      push(L && `child f${s.f}e${s.ep} returns from its slow call (transient stall)`, n, { proc: 31 }); // environment, not weakly fair
    } else if (s.m === MODE.SLOW) {
      const n = clone(st); n.S[q].m = MODE.OK;
      push(L && `child f${s.f}e${s.ep} (healthy) finishes its long call / its own job returns`, n, { proc: 31 }); // environment
    } else if (s.m === MODE.LOOPV && s.nc < P.C_STALL) {
      const n = clone(st); n.S[q].nc++;
      push(L && `child f${s.f}e${s.ep} makes a call with no fall in V`, n, { proc });
    } else if (s.m === MODE.LOOPS && s.sig < P.LOOP) {
      const n = clone(st); n.S[q].sig++; n.S[q].nc = Math.min(P.C_STALL, n.S[q].nc + 1);
      push(L && `child f${s.f}e${s.ep} repeats the same call (${n.S[q].sig})`, n, { proc });
    }
    if (s.m === MODE.OK && !stale && !s.z) {
      // a same-signature loop is folded into LOOPV unless D7_LOOPS (then fault cv may also enter LOOPS)
      for (const m of preClaim ? [MODE.DEAD] : P.D7_LOOPS ? [MODE.STUCK, MODE.LOOPV, MODE.LOOPS, MODE.DEAD] : [MODE.STUCK, MODE.LOOPV, MODE.DEAD]) {
        const kind = m === MODE.LOOPS ? 'cv' : MKIND[m];
        if (!has(st, kind)) continue;
        const n = clone(st); spend(n, kind); const y = n.S[q]; y.m = m;
        if (m === MODE.DEAD) { y.al = 0; wake(n, y.par); }
        push(L && `FAULT child f${y.f}e${y.ep} ${MNAME[m]}${m === MODE.DEAD ? `; its turn-end note wakes coord${y.par}` : ''}`, n, { fault: true, proc });
      }
      // AB_HANG_CALLS (D5): a healthy call longer than the hang threshold, or the child waits on its own background job
      // (planned, not a fault): no new assistant message, so the watcher's ticks go on (no timeliness assumption for it)
      if (P.AB_HANG_CALLS && !preClaim && has(st, 's')) { const n = clone(st); spend(n, 's'); n.S[q].m = MODE.SLOW; push(L && `child f${s.f}e${s.ep} (healthy) starts a long call or waits on its own background job: no new assistant message for a while`, n, { proc }); }
    }
  });
  // owner: ends an escalated zombie; starts the fresh coordinator after a hand-over; wakes the tree (recovery only)
  // (slot counting: the owner's end plus the stop-verify@- re-run that confirms it, watch.mjs:153, merged into one step)
  // with slot counting, a zombie that wrote READY still holds its attempt's slot (stop unconfirmed), so the owner's end
  // must reach it too; without slot counting it is invisible (p=2) and the step stays as it was
  // AB_STOP_HELD: the owner's end no longer confirms the stop; the coordinator's next verify does (after its ticks).
  // FX-PLAN with FX-CLOSE/FX-CGATE: the owner acts on the planner's `owner` row (verify_rounds >= 3) and writes a close
  // record (owner act `closed`, FX-CGATE step 7)
  const VERP = P.FX_CLOSE && P.FX_CGATE && P.FX_PLAN;
  st.S.forEach((s, q) => {
    if (!(s.al && s.z && (s.p < 2 || P.AB_SLOTCOUNT || P.AB_COMMIT_CLOSE || P.D7_SLOTS))) return;
    if (VERP && !ownerRow(st, s.f, P)) return;
    const n = clone(st); n.S[q].al = 0; if (P.FX_CGATE) n.S[q].dn = 1;
    if ((P.AB_SLOTCOUNT || P.AB_COMMIT_CLOSE) && !P.AB_STOP_HELD) n.S[q].sc = 1;
    push(L && `owner ends zombie f${s.f}e${s.ep} (${VERP ? 'planner act owner, verify_rounds >= 3; owner act closed writes the close record' : 'Z escalation'})`, n, { proc: PROC.O });
  });
  // FX-PLAN step 0 without its end condition (FX_PLAN_OWNEREND off): the owner has nothing left to end but the row stays
  // the owner's (no step; that is the schedule-2 ablation). Q5b: the owner starts an admitted row's session by hand, once
  if (P.FX_Q5B) st.T.forEach((t, f) => {
    // the owner answers the planner's `owner` act: an admitted row, or a started one with no claim (FX-PLAN step 6), with
    // no live session of the attempt (a hand start that died is started again; the first MB2a model allowed one start)
    if (t.st === ST.A && (t.step === STEP.ADMITTED || (t.step === STEP.RUN && !t.bn && t.cm !== 1 && !t.sj)) && !st.S.some((s) => s.f === f && s.ep === t.ep && s.al) && st.S.filter((s) => s.f === f && s.ep === t.ep).length <= P.NMAX) {
      const n = clone(st); n.S.push(mkSession(f, t.ep, 3, t.ctn, P.AB_TRANSCRIPT_LAG ? 0 : 1, 0));
      push(L && `owner starts the session of f${f}e${t.ep} by hand (Q5b, planner act owner; no start.json)`, n, { proc: PROC.O });
    }
  });
  // FX-W4: status --deadman (Windows task, every 5 min, wake-to-run; proc 3, an id no coordinator uses at d = 1). One run =
  // one step: list, counters, alert once per onset; the alert reaches the owner, who wakes the current coordinator
  if (P.FIX_DEADMAN) {
    const n = clone(st);
    let dn = (n.x >> 4) & 3, dl = (n.x >> 6) & 3, dal = n.y & 1;
    // timing premise: a delivered wake starts a turn whose call 1 (the ensure) runs within seconds, far below two 5-minute
    // runs; so an alarm-less state with a wake pending is not counted (the untimed model would otherwise alert before it)
    const pend = n.C[n.ce] && n.C[n.ce].wk > 0 && n.C[n.ce].pc === null;
    if (n.pl) { dn = n.A.some((a) => aPar(a) === n.ce) ? 0 : pend ? dn : Math.min(2, dn + 1); dl = Math.max(0, dl - 1); } else dl = Math.min(3, dl + 1);
    const cause = dn >= 2 || dl >= 3; let alert = false;
    // CAND_REALERT (the modeller's candidate, NOT in FIX-wake rev 4): while the same cause still holds, count runs since the
    // alert (y bits 1-2) and alert again after two of them (the owner's wake produced no alarm)
    let ra = (n.y >> 1) & 3;
    if (cause && dal && P.CAND_REALERT) { ra = Math.min(2, ra + 1); if (ra >= 2) { dal = 0; ra = 0; } }
    if (!cause) ra = 0;
    n.y = (n.y & ~6) | (ra << 1);
    if (cause && !dal) { dal = 1; alert = true; if (P.BQ5_OWNER_TURN && n.C[n.ce] && n.C[n.ce].pc === null) n.C[n.ce].om = 1; wake(n, n.ce); } else if (!cause) dal = 0;
    n.x = (n.x & 15) | (dn << 4) | (dl << 6); n.y = (n.y & ~1) | dal;
    if (n.x !== st.x || n.y !== st.y || alert) push(L && `status --deadman run: runs_no_alarm=${dn}, list failures=${dl}${alert ? ' -> ALERT (owner wakes coord' + n.ce + ')' : ''}`, n, { proc: 3 });
  }
  if (st.C.length <= st.ce) { const n = clone(st); n.C.push({ ce: n.ce, wk: 1, boot: 1, dr: 0, rd: 0, pc: null, ch: 0, om: P.BQ5_OWNER_TURN ? 1 : 0, ot: 0 }); push(L && `owner starts the fresh coordinator coord${n.ce}`, n, { proc: PROC.O }); }
  {
    const i = st.ce; const c = st.C[i];
    if (c && c.pc === null && !c.wk && !st.W.some((w) => w.par === i) && !st.A.some((a) => aPar(a) === i)) { const n = clone(st); n.C[i].wk = 1; if (P.BQ5_OWNER_TURN) n.C[i].om = 1; push(L && `owner wakes coord${i} (no wake source of this ce is alive)`, n, { proc: PROC.O, ow: true }); }
  }
  // S2.2 (Q5, branches row 1): the owner types to the current coordinator while the status view shows a start due (the
  // premise that the owner answers a due start: an owner step, weakly fair). BQ5_NO_OWNER: never (the ablation)
  // Under a drain the plan still starts an admitted row (lib.mjs:4121-4127 has no drain test; only replace-fence and
  // replace-start wait, lib.mjs:4103-4104), so the status view shows that start due and the owner answers it.
  if (P.BQ5_OWNER_TURN && !P.BQ5_NO_OWNER) {
    const i = st.ce; const c = st.C[i];
    if (c && c.pc === null && !c.om && st.T.some((t) => startDue(st, t, P) && (!c.dr || (t.st === ST.A && t.step === STEP.ADMITTED)))) { const n = clone(st); n.C[i].om = 1; n.C[i].wk = Math.min(3, n.C[i].wk + 1); push(L && `owner types to coord${i} (the status view shows a start due)`, n, { proc: PROC.OT }); }
  }
  // S2.2 (CLOSE's id gap): the owner, asked at the first close-missing (brief 5c), ends the session if it lives and says
  // `closed`; the coordinator relays it with a quote file (merged: the premise of a true relay, at once). Fault w: the
  // coordinator relays `closed` for a session the owner did not close
  if (P.BLD_CLOSE_IDGAP) st.S.forEach((s, q) => {
    if (s.dn || !needsRecord(st, s) || st.T[s.f].vr < 1) return;
    const n = clone(st); n.S[q].al = 0; n.S[q].dn = 1; n.S[q].z = 0;
    if (P.BQ5_OWNER_TURN && n.C[n.ce] && n.C[n.ce].pc === null) n.C[n.ce].om = 1;
    wake(n, n.ce);
    push(L && `owner: closed f${s.f}e${s.ep} (ended if it lived); the coordinator relays it (owner act closed: a record under the CLI id)`, n, { proc: PROC.O });
    if (s.al && has(st, 'w')) { const b = clone(st); spend(b, 'w'); b.S[q].dn = 1; wake(b, b.ce); push(L && `FAULT the coordinator relays closed for f${s.f}e${s.ep}, which the owner did not close (it lives)`, b, { fault: true, proc: PROC.O }); }
  });
  // watchers (AB_FAIR_IDS: one fairness id per watcher, by the coordinator that started it)
  st.W.forEach((w, j) => {
    const proc = P.AB_FAIR_IDS ? 19 + Math.min(w.par, 3) : PROC.W;
    if (w.ph === 0) { const n = clone(st); n.W.splice(j, 1); wake(n, w.par); push(L && `watch.mjs(coord${w.par}) gave up on watcher.lock: exits 75, which wakes coord${w.par}`, n, { proc }); return; }
    if (tickEnabled(st, w)) { const r = tick(st, j, P, L); push(r.lab, r.n, { proc, viol: r.viol }); }
  });
  // alarms. The current alarm fires only while its coordinator is idle (the period is longer than any turn), unless
  // AB_ALARM_MIDTURN; a superseded alarm (AB_ALARM_SUPERSEDE) exits 0 at the end of its own sleep, at any time
  st.A.forEach((a, j) => {
    const par = aPar(a); const sup = aSup(a);
    if (j > 0 && st.A[j - 1] === a) return; // identical alarm processes: one representative step
    if (!sup && !P.AB_ALARM_MIDTURN && st.C[par].pc !== null) return;
    // timing premise (stated in ABLATION-wake): a turn is shorter than the alarm period, so at most one current alarm of a
    // coordinator fires inside one of its turns (C.ch marks it; under FX-W2 the supersede chain counter is unused)
    if (P.FIX_ARM_FIRST && !sup && st.C[par].pc !== null && st.C[par].ch) return;
    if (!sup && (a & 32)) return; // FX-W2: an alarm (period 1 h) cannot fire between the ensure and the reconcile of the same turn
    const n = clone(st); n.A.splice(j, 1); wake(n, par);
    // FX-W1 step 2: the marker is created just before the exit (merged: the exit follows within ms); only a slot naming this
    // process is marked (a superseded alarm's pid is named by no slot)
    if (P.FIX_ARM_FIRST && !sup && st.C[par].pc !== null) n.C[par].ch = 1;
    if (P.FIX_ALARM_MARKER && !sup && par === st.ce) setBit(n, 2 + (P.FIX_ARM_FIRST ? aSlot(a) : 0), 1);
    const proc = P.AB_FAIR_IDS ? (sup ? 27 : 23) + Math.min(par, 3) : PROC.A;
    push(L && (sup ? `superseded alarm(coord${par}) ends its sleep, finds alarm.json naming another alarm: exits 0, which wakes coord${par}${st.C[par].pc !== null ? ' (consumed by the running turn)' : ''}` : `alarm(coord${par}) fires after a long silence, which wakes coord${par}${st.C[par].pc !== null ? ' (mid-turn: consumed by the running turn)' : ''}`), n, { proc });
  });
  // coordinators
  st.C.forEach((c, i) => {
    if (c.pc === null) {
      if (!c.wk) return;
      const n0 = clone(st); const cc = n0.C[i]; cc.wk = 0; cc.boot = 0; if (P.BQ5_OWNER_TURN) { cc.ot = cc.om ? 1 : 0; cc.om = 0; }
      const current = cc.ce >= n0.ce;
      if (P.FIX_ARM_FIRST && current) {
        // FX-W2: call 1 (background) the ensure (S2: a second one), call 2 reconcile; the plan comes from reconcile (op RC)
        const ops = P.ALARM_SLOTS === 2 ? [[OP.EN, 0, 0, 0], [OP.EN, 0, 0, 0], [OP.RC, 0, 0, 0]] : [[OP.EN, 0, 0, 0], [OP.RC, 0, 0, 0]];
        n0.C[i].pc = ops;
        for (const r of macro(n0, i, P, L, [L && `coord${i} wakes; calls: ${ops.map(opName).join(' > ')}`], true)) push(r.lab, r.n, { proc: i, u: true, fault: r.fault, viol: r.viol, d6: r.d6 });
        if (!c.boot && has(st, 'l')) { const n = clone(st); spend(n, 'l'); n.C[i].wk--; push(L && `FAULT a wake to coord${i} is lost`, n, { fault: true, proc: i, d6: 'lost' }); }
        return;
      }
      let arm = false; let head = 'status --reconcile'; let fail = null;
      if (current || !P.FENCE_CE) {
        if (P.AB_ARM_SPLIT && n0.rl && !n0.pl) fail = 'p5';  // r8: a stale run.lock cannot be judged with no process list: 75
        else {
          reconcile(n0, P); cc.rd = n0.seq; if (P.AB_STALE_SNAPSHOT && current) snapStatus(n0); // reconcile writes status.json
          if (P.AB_ARM_SPLIT && n0.cj && !P.FIX_ALARM_MARKER) fail = 'p5'; // r11 reads alarm.json: unreadable -> 67 under the lock (FX-W1: an anomaly)
          else if (P.AB_ARM_SPLIT) {
            if (n0.pl) n0.rl = 0;                             // the run lock was broken (its holder judged dead)
            // r14: alive only when the list shows the alarm.json pid; FX-W1: tri-state, alarm-missing only on `dead`
            arm = P.ALARM && (P.FIX_ALARM_MARKER ? (n0.cj || slotVerdict(n0, 0, P) === 0) : (!n0.A.includes(i) || !n0.pl));
            if (!arm) cc.ch = 0;
          } else if (P.FIX_ARM_AT_START && P.ALARM && !n0.A.includes(i)) n0.A.push(i);
          if (P.AB_ACT_DUE && current) { for (const t of n0.T) if (t.aks === 1) t.aks = 2; if (n0.rk === 1) n0.rk = 2; } // the turn reads status.json
        }
        if (fail) head = n0.rl && !n0.pl ? 'status --reconcile exits 75 (run.lock held by a holder no process list can judge): no status.json, no arm request' : 'status --reconcile exits 67 (alarm.json unreadable, S:354): no status.json, no arm request';
        else if (arm) head = `status --reconcile exits 1 alarm-missing${n0.pl ? '' : ' (no process list: the alarm cannot be seen alive)'}`;
      }
      const all = fail ? [[]] : plans(n0, i, P);
      const variants = [];
      for (const ops of all) {
        variants.push({ ops, o: false });
        // fault o (AB_ACT_DUE): the turn goes straight to its last call (endturn) without the acts it planned
        if (P.AB_ACT_DUE && has(n0, 'o') && ops.length > 1 && ops[ops.length - 1][0] === OP.E) variants.push({ ops: [ops[ops.length - 1]], o: true });
      }
      for (const v of variants) {
        const n = clone(n0); if (v.o) spend(n, 'o');
        const ops = arm ? [[OP.AR, 0, 0, 0], ...v.ops] : v.ops;
        n.C[i].pc = ops.length ? ops.map((o) => o.slice()) : null;
        const lab0 = L && `coord${i} wakes, ${head}, plan: ${ops.length ? ops.map(opName).join(' > ') : fail ? '(nothing it can act on: end turn)' : '(stale ce: end turn)'}${v.o ? ' -- FAULT o: it goes to endturn without taking the planned acts' : ''}`;
        for (const r of macro(n, i, P, L, [lab0], true)) push(r.lab, r.n, { proc: i, u: true, fault: r.fault || v.o, viol: r.viol, d6: r.d6 || fail });
      }
      if (!c.boot && has(st, 'l')) { const n = clone(st); spend(n, 'l'); n.C[i].wk--; push(L && `FAULT a wake to coord${i} is lost`, n, { fault: true, proc: i, d6: 'lost' }); }
    } else {
      for (const r of macro(st, i, P, L, [], false)) push(r.lab, r.n, { proc: i, u: true, fault: r.fault, viol: r.viol, d6: r.d6 });
    }
  });
  // system faults
  if (has(st, 'p')) {
    // AB_PAUSE_GAP: a long pause leaves a wall gap > 2 delta that the next evaluation sees (gp); a short one (timer branch
    // b, SEM-wake 6.2) or a freeze of the child alone leaves none
    for (const long of P.AB_PAUSE_GAP ? [1, 0] : [1]) {
      const n = clone(st); spend(n, 'p');
      for (const s of n.S) if (s.al && s.p < 2) s.pu = 1;
      if (!P.WATCHER_LOCK) for (const w of n.W) w.gap = 1;
      if (P.AB_PAUSE_GAP && long) n.gp = 1;
      push(L && (P.AB_PAUSE_GAP ? (long ? 'FAULT the PC sleeps longer than 2 delta and resumes (the watcher will see the gap)' : 'FAULT a SHORT suspend (or the child alone frozen): no wall gap over 2 delta for the watcher') : 'FAULT the PC sleeps and resumes (every process frozen together)'), n, { fault: true, proc: 30 });
    }
  }
  if (PLU(P)) { // proc.list (PowerShell) fails until it works again; recovery is environment (never forced)
    if (st.pl && has(st, 'u')) { const n = clone(st); spend(n, 'u'); n.pl = 0; push(L && 'FAULT the process list becomes unavailable (proc.list fails)', n, { fault: true, proc: 30 }); }
    if (!st.pl) { const n = clone(st); n.pl = 1; push(L && 'the process list is available again', n, { proc: 31 }); }
  }
  if (P.AB_ARM_SPLIT && !st.cj && has(st, 'y')) { const n = clone(st); spend(n, 'y'); n.cj = 1; push(L && 'FAULT run/alarm.json becomes unreadable', n, { fault: true, proc: 30 }); }
  if (has(st, 'r')) {
    for (const lk of P.AB_ARM_SPLIT ? [0, 1] : [0]) { // as built a reset can fall inside a run-lock hold and leave run.lock
      const n = clone(st); spend(n, 'r');
      for (const s of n.S) { if (s.al) { s.al = 0; s.z = 0; } s.hb = 1; }
      if (n.W.some((w) => w.lk)) n.ws = 1;
      if (lk) n.rl = 1;
      n.W = []; n.A = [];
      for (const c of n.C) { c.pc = null; c.wk = 0; c.boot = 0; }
      push(L && `FAULT host reset: every process dies; locks are left behind${lk ? ' (run.lock among them)' : ''}`, n, { fault: true, proc: 30, d6: 'p7' });
    }
  }
  // per-transition properties of the wake group and D7 (each only when its flag is on)
  for (const e of out) {
    const n = e.s; const add = [];
    if (P.WAKE_PROPS) {
      if (!silent(st) && silent(n)) { if (e.d6 !== 'p7' && !ownerLegit(n, P)) add.push('WakeSourceAlive'); add.push('D6:' + (e.d6 || 'other')); if (P.WFX_PROPS && e.d6 !== 'p7' && e.d6 !== 'p0' && !ownerLegit(n, P)) add.push('NoSilenceAfterFirstCall'); }
      for (let i = 0; i < n.C.length; i++) if (n.C[i].ch >= 3 && (!st.C[i] || st.C[i].ch < 3)) add.push('WakeChainBounded');
    }
    if (P.D7_STALE) {
      const i = e.proc; const c = st.C[i];
      // the fields a coordinator's acts write (rows; sessions started or stopped), compared field by field
      const tk = (T) => T.map((t) => [t.st, t.ep, t.step, t.rs, t.hv, t.fail, t.ncr, t.cmE, t.rsn, t.cl, t.bn].join(',')).join(';');
      const sk = (S) => S.map((s) => [s.f, s.ep, s.par, s.al, s.z, s.sc].join(',')).sort().join(';');
      if (i < 4 && c && c.ce < st.ce && (tk(st.T) !== tk(n.T) || sk(st.S) !== sk(n.S))) add.push('StaleWrites');
    }
    if (P.D7_COMMIT) n.T.forEach((t, f) => { const a = st.T[f].cmE; if (a >= 0 && t.cmE !== a) add.push('CommitRecordStable'); });
    if (add.length) e.viol = [...e.viol, ...add];
  }
  return out;
}

// ---------------------------------------------------------------- invariants (checked on every state)
export function invariants(n, P) {
  const v = [];
  if (liveCount(n) > P.NMAX) v.push('Slots');
  if (n.T.some((t) => t.rs > P.R)) v.push('RestartLimit');
  if (n.T.some((t) => t.ncr > 1)) v.push('AtMostOneCommit');
  if (n.W.filter((w) => w.ph === 1).length > 1) v.push('SingleWatcher');
  n.T.forEach((t, f) => { if (t.st === ST.F && n.S.some((s) => s.f === f && s.al && s.p < 2 && !s.z)) v.push('FailedTaskStopped'); });
  // wake group: at most two alarm processes of one coordinator (the current one and one superseded by a registration race)
  if (P.WAKE_PROPS && n.C.some((c, i) => alarmsOf(n, i) > (P.FIX_ARM_FIRST ? P.ALARM_SLOTS + 1 : 2))) v.push('AlarmsBounded'); // FX-W1: alarm_slots + 1
  // FX_PROPS: OneWriterPerAttempt - two sessions of one attempt have both passed a tool call that writes (true state)
  if (P.FX_PROPS) { const w = new Set(); for (const s of n.S) if (s.wr) { const key = s.f * 256 + s.ep; if (w.has(key)) { v.push('OneWriterPerAttempt'); break; } w.add(key); } }
  if (P.D7_SLOTS) {
    // SlotsProc: live child processes of any progress (a READY child's process lives until closed) <= N_max
    if (n.S.filter((s) => s.al).length > P.NMAX) v.push('SlotsProc');
    // SlotsR10 (R10 amended, on true state): per attempt, a live process, a stop unconfirmed, or the current attempt of
    // an active row at admitted/started/bound (a committed row's last attempt counts through its live process)
    const k = new Set();
    for (const s of n.S) if (s.al || s.z) k.add(s.f * 256 + s.ep);
    n.T.forEach((t, f) => { if (t.st === ST.A && (t.step === STEP.ADMITTED || t.step === STEP.RUN)) k.add(f * 256 + t.ep); });
    if (k.size > P.NMAX) v.push('SlotsR10');
  }
  return v;
}
// owner wake is part of the design only after two wake losses (R6) or a host reset
export function ownerLegit(n, P) {
  const lost = (P.BUD.l - n.B.l) + (P.BUD.x - n.B.x);
  return lost >= 2 || n.B.r < P.BUD.r;
}
