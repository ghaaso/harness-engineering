// Every configuration run-all.mjs runs. over = overrides of makeParams(); base = the configuration an
// ablation is compared with (a property that fails here and holds there is caused by the removal).
// Fault budgets: k faults in total, at most this many of each kind (cs child stuck in a slow call,
// cv child loops with no progress, cd child crashes, z stop unconfirmed, p PC sleeps, l lost wake,
// x coordinator turn dies, t torn commit, r host reset). Planned events are budgeted apart and are
// the same in every part: h task hand-overs (1, at most 1 per task), d coordinator hand-overs (1).
// order: run-all starts lower orders first (and the largest parts first within an order).
export const K2 = { k: 2, cs: 2, cv: 2, cd: 2, z: 2, p: 2, l: 2, x: 2, t: 1, r: 1, h: 1, d: 1 };
export const K3 = { ...K2, k: 3 };
// four faults: bounded to at most one of each kind (126 parts); with two of a kind allowed the 2-field
// parts alone need about 17,000 cpu-s per configuration, beyond the 15-minute run
export const K4 = { k: 4, cs: 1, cv: 1, cd: 1, z: 1, p: 1, l: 1, x: 1, t: 1, r: 1, h: 1, d: 1 };
// candidate fixes for what still fails in the adopted design (FIX_* in model.mjs)
export const FIXES = { FIX_ARM_BY_WRITE: true, FIX_ARM_AT_START: true, FIX_PAUSE_DISCOUNT: true, FIX_ADMIT_RESERVE: true, FIX_READY_ALL: true, FIX_WATCHER_ACTIONABLE: true };
// FIX_ENDTURN_RECHECK (endturn exits 1 when something changed since the read) was a candidate; with the
// watcher's actionable predicate it is not load-bearing at 2 or 3 faults, so it is left out

export const CONFIGS = [
  { id: 'SMOKE', title: 'smoke test: 2 fields, 1 fault', over: { BUD: { ...K2, k: 1 } }, smoke: true },
  // the adopted design (R1-R12 as written), no candidate fix; N_max = 2 (R10's interim value)
  { id: 'D2-K3-R1', order: 2, title: 'adopted design, 2 fields, 3 faults, R=1', over: { BUD: K3, R: 1 } },
  { id: 'D2-K3-R2', order: 3, title: 'adopted design, 2 fields, 3 faults, R=2', over: { BUD: K3, R: 2 } },
  { id: 'D2-K4-R1', order: 3, title: 'adopted design, 2 fields, 4 faults, R=1', over: { BUD: K4, R: 1 } },
  { id: 'D2-K4-R2', order: 3, title: 'adopted design, 2 fields, 4 faults, R=2', over: { BUD: K4, R: 2 } },
  { id: 'D3-K2-R1', order: 2, title: 'adopted design, 3 fields, 2 faults, R=1', over: { FIELDS: 3, BUD: K2, R: 1 } },
  // the adopted design + the candidate fixes
  { id: 'DF2-K2-R1', order: 0, title: 'design + fixes, 2 fields, 2 faults, R=1 (base of the ablations)', over: { ...FIXES, BUD: K2, R: 1 } },
  { id: 'DF2-K3-R1', order: 1, title: 'design + fixes, 2 fields, 3 faults, R=1', over: { ...FIXES, BUD: K3, R: 1 } },
  { id: 'DF2-K3-R2', order: 1, title: 'design + fixes, 2 fields, 3 faults, R=2', over: { ...FIXES, BUD: K3, R: 2 } },
  { id: 'DF2-K4-R1', order: 1, title: 'design + fixes, 2 fields, 4 faults, R=1', over: { ...FIXES, BUD: K4, R: 1 } },
  { id: 'DF2-K4-R2', order: 1, title: 'design + fixes, 2 fields, 4 faults, R=2', over: { ...FIXES, BUD: K4, R: 2 } },
  { id: 'DF3-K2-R1', order: 2, title: 'design + fixes, 3 fields, 2 faults, R=1', over: { ...FIXES, FIELDS: 3, BUD: K2, R: 1 } },
  { id: 'DF3-K2-R2', order: 2, title: 'design + fixes, 3 fields, 2 faults, R=2', over: { ...FIXES, FIELDS: 3, BUD: K2, R: 2 } },
  { id: 'DF3-K3-R1', order: 4, title: 'design + fixes, 3 fields, 3 faults, R=1', over: { ...FIXES, FIELDS: 3, BUD: K3, R: 1 } },
];
// mechanism ablations: one mechanism of the adopted design removed from design + fixes
const ABL = [
  ['CUT', 'restore reads the whole staging (no cut at the fence)', { CUT: false }],
  ['FENCE-EPOCH', 'commit.mjs does not compare epochs; the coordinator commits the READY a note names', { FENCE_EPOCH: false }],
  ['FENCE-CE', 'no --ce check (scripts and the turn-start check); 1 fault (the break needs none)', { FENCE_CE: false, BUD: { ...K2, k: 1 } }],
  ['WX', 'COMMIT written without exclusive create', { COMMIT_WX: false }],
  ['WX+RECONCILE', 'COMMIT without exclusive create and no reconcile', { COMMIT_WX: false, RECONCILE: false }],
  ['PROGRESS', 'suspicion by liveness, not by progress V', { PROGRESS: false }],
  ['WATCHER-LOCK', 'no watcher.lock; endturn starts a watcher when none of its ce has a fresh tick', { WATCHER_LOCK: false }],
  ['ALARM', 'no alarm (the watcher is the only wake source)', { ALARM: false }],
  ['ACK', 'endturn writes acked_seq = ledger head at endturn', { ACK_READ: false }],
  ['READY', 'replace does not re-check for a READY of the current epoch', { READY_WINS: false, FIX_READY_ALL: false }],
  ['STOP-LIMIT', 'limit path exits before the fence and the stop', { STOP_ON_LIMIT: false }],
  ['ADMIT-LIVE', 'admission counts table rows, not live processes', { ADMIT_LIVE: false, FIX_ADMIT_RESERVE: false }],
  ['RECONCILE', 'no status --reconcile at turn start', { RECONCILE: false }],
  ['RESTART-LIMIT', 'replace.mjs never takes the limit path (restarts are not counted against R)', { RESTART_LIMIT: false }],
  ['DRAIN', 'no drain: failure restarts go on while draining, and the hand-over waits only until the table shows nothing running (zombies ignored)', { DRAIN: false }],
];
export const ABL_BUD = K2;
for (const [k, t, o] of ABL) CONFIGS.push({ id: `A-${k}`, order: 0, title: `ablation from design + fixes (2 faults, R=1): ${t}`, over: { ...FIXES, BUD: ABL_BUD, R: 1, ...o }, base: 'DF2-K2-R1' });
CONFIGS.push({ id: 'DFPLUS-RECHECK', order: 0, title: 'design + fixes + FIX_ENDTURN_RECHECK (2 faults, R=1): is the extra fix needed?', over: { ...FIXES, FIX_ENDTURN_RECHECK: true, BUD: ABL_BUD, R: 1 }, base: 'DF2-K2-R1', extraFix: true });
// a reading check: the busy loop of the adopted design depends on KILL_WAKES (a killed alarm wakes its session)
CONFIGS.push({ id: 'D2-K2-R1-NOKILLWAKE', order: 0, title: 'adopted design, 2 fields, 2 faults, R=1, reading: a killed background command does not wake its session', over: { BUD: K2, R: 1, KILL_WAKES: false } });
// fix ablations: one candidate fix removed from design + fixes (is each fix load-bearing?)
for (const f of Object.keys(FIXES)) CONFIGS.push({ id: `X-${f.slice(4).replace(/_/g, '-')}`, order: 0, title: `design + fixes without ${f} (2 faults, R=1)`, over: { ...FIXES, [f]: false, BUD: ABL_BUD, R: 1 }, base: 'DF2-K2-R1' });
// ---- round 3, as-built fence group (helper MA). Each AB_* flag alone on design + fixes, then all together.
// u = the process-list fault (AB_PROCLIST only); K2U adds it to the two-fault budget.
export const K2U = { ...K2, u: 2 };
export const AB_FENCE = { AB_READY_SPLIT: true, AB_START_UNFENCED: true, AB_TRANSCRIPT_LAG: true, AB_SLOTCOUNT: true, AB_COMMIT_CLOSE: true, AB_HANDOVER_NOKILL: true, AB_NO_COMMIT_RECONCILE: true, AB_PROCLIST: true };
for (const f of Object.keys(AB_FENCE)) CONFIGS.push({ id: `AB-${f.slice(3).replace(/_/g, '-')}`, order: 0, title: `design + fixes, as built: ${f} alone (2 faults, R=1)`, over: { ...FIXES, BUD: f === 'AB_PROCLIST' ? K2U : K2, R: 1, [f]: true }, base: 'DF2-K2-R1' });
CONFIGS.push({ id: 'AB-FENCE-ALL', order: 0, title: 'design + fixes, as built: every fence-group flag (2 faults, R=1)', over: { ...FIXES, ...AB_FENCE, BUD: K2U, R: 1 }, base: 'DF2-K2-R1' });
// ---- round 3, as-built wake group (helper MB1, CEX-wake.md). u = process list, o = an act omitted before endturn,
// y = alarm.json unreadable (faults); s = one healthy slow call (planned, not a fault). K2W adds them to K2.
export const K2W = { ...K2, u: 2, o: 2, y: 1, s: 1 };
export const AB_WAKE = { AB_ALARM_SUPERSEDE: true, AB_ALARM_MIDTURN: true, AB_ARM_SPLIT: true, AB_ENDTURN_SPLIT: true, AB_ACT_DUE: true, AB_PAUSE_GAP: true, AB_HANG_CALLS: true, AB_X_KILLS_BG: true, AB_FAIR_IDS: true };
// D7 observers that change no behaviour (new property forms read beside the old ones)
export const D7_OBS = { D7_RESTART: true, D7_STALE: true, D7_COMMIT: true };
// the process list is shared with the fence group: the wake group's unknown case is run with admission's (AB_PROCLIST)
for (const f of Object.keys(AB_WAKE)) CONFIGS.push({ id: `AB-W-${f.slice(3).replace(/_/g, '-')}`, order: 0, title: `design + fixes, as built: wake flag ${f} alone (+ AB_PROCLIST), 2 faults, R=1`, over: { ...FIXES, AB_PROCLIST: true, WAKE_PROPS: true, BUD: K2W, R: 1, [f]: true }, base: 'DF2-K2-R1' });
CONFIGS.push({ id: 'AB-WAKE-ALL', order: 0, title: 'design + fixes, as built: every wake-group flag + AB_PROCLIST + D7 observers (2 faults, R=1)', over: { ...FIXES, ...AB_WAKE, AB_PROCLIST: true, WAKE_PROPS: true, ...D7_OBS, BUD: K2W, R: 1 }, base: 'DF2-K2-R1' });
CONFIGS.push({ id: 'AB-WAKE-ALL-B1', order: 0, title: 'AB-WAKE-ALL with owner branch B1 for endturn exit 2 (start both sources)', over: { ...FIXES, ...AB_WAKE, AB_EXIT2_START: true, AB_PROCLIST: true, WAKE_PROPS: true, ...D7_OBS, BUD: K2W, R: 1 }, base: 'AB-WAKE-ALL' });
CONFIGS.push({ id: 'AB-ALL', order: 0, title: 'design + fixes, as built: every fence-group and wake-group flag + D7 observers (2 faults, R=1)', over: { ...FIXES, ...AB_FENCE, ...AB_WAKE, WAKE_PROPS: true, ...D7_OBS, BUD: K2W, R: 1 }, base: 'DF2-K2-R1' });
// ---- D7: one configuration per new property form in which it fails (the old form is still checked beside it)
CONFIGS.push({ id: 'D7-RESTART', order: 0, title: 'D7: RestartLimitGhost with the restart counter frozen (mutation D7_FREEZE_RS)', over: { ...FIXES, BUD: K2, R: 1, D7_RESTART: true, D7_FREEZE_RS: true }, base: 'DF2-K2-R1' });
CONFIGS.push({ id: 'D7-STALE', order: 0, title: 'D7: no --ce fence, handover.mjs CAS as built (finite), StaleWrites; 1 fault as A-FENCE-CE', over: { ...FIXES, FENCE_CE: false, D7_HANDOVER_CAS: true, D7_STALE: true, BUD: { ...K2, k: 1 }, R: 1 }, base: 'A-FENCE-CE' });
CONFIGS.push({ id: 'D7-COMMIT', order: 0, title: 'D7: CommitRecordStable with COMMIT written without exclusive create and the as-built reconcile', over: { ...FIXES, COMMIT_WX: false, AB_NO_COMMIT_RECONCILE: true, D7_COMMIT: true, BUD: K2, R: 1 }, base: 'A-WX' });
CONFIGS.push({ id: 'D7-SLOTS', order: 0, title: 'D7: SlotsProc / SlotsR10 with READY children alive until closed (design + fixes)', over: { ...FIXES, D7_SLOTS: true, BUD: K2, R: 1 }, base: 'DF2-K2-R1' });
CONFIGS.push({ id: 'D7-LOOPS', order: 0, title: 'D7: LoopReported with same-call loops reachable, progress off and the loop rule removed (mutation)', over: { ...FIXES, PROGRESS: false, D7_LOOPS: true, D7_NO_LOOP_RULE: true, BUD: K2, R: 1 }, base: 'A-PROGRESS' });
CONFIGS.push({ id: 'D7-LOOPS-RULE', order: 0, title: 'D7: LoopReported with same-call loops reachable and progress off, loop rule in place', over: { ...FIXES, PROGRESS: false, D7_LOOPS: true, BUD: K2, R: 1 }, base: 'A-PROGRESS' });
CONFIGS.push({ id: 'D7-COMMIT-NOFENCE', order: 0, title: 'D7: CommitRecordStable as D7-COMMIT, and commit.mjs does not compare epochs (FENCE_EPOCH off): WX is then the only guard', over: { ...FIXES, COMMIT_WX: false, FENCE_EPOCH: false, AB_NO_COMMIT_RECONCILE: true, D7_COMMIT: true, BUD: K2, R: 1 }, base: 'D7-COMMIT' });
