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
