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

// ---- round 3, the fence-group FIXES (helper MB2a, ABLATION-fence.md). Per fix X: C_X = design + fixes + the as-built
// flags X's defect needs + X (+ a new fix only where X depends on it) + D7 observers + FX_PROPS; the ablation = C_X - X.
// FIDELITY-3 gaps: AB_STOP_HELD (stop verify needs ticks; unconfirmed stays stop-requested), AB_STALE_SNAPSHOT (a stale
// coordinator reads status.json as last written).
const FXB = { ...FIXES, ...D7_OBS, FX_PROPS: true, BUD: K2, R: 1 };
const C_OUT = { ...FXB, AB_READY_SPLIT: true, FX_OUT: true };
const C_CLOSE = { ...FXB, AB_COMMIT_CLOSE: true, AB_NO_COMMIT_RECONCILE: true, AB_STOP_HELD: true, D7_SLOTS: true, FX_CLOSE: true, FX_CGATE: true, FX_PLAN: true };
const C_CGATE = { ...FXB, AB_START_UNFENCED: true, AB_STALE_SNAPSHOT: true, FX_CGATE: true };
const C_D4B = { ...FXB, AB_TRANSCRIPT_LAG: true, AB_SLOTCOUNT: true, AB_STOP_HELD: true, FX_CLAIM: true, FX_CGATE: true, FX_PLAN: true };
const FXC = [
  ['FX-OUT', 'FX-OUT on AB_READY_SPLIT (D4a)', C_OUT, 'AB-READY-SPLIT'],
  ['FX-OUT-PLAN', 'FX-OUT + FX-PLAN on AB_READY_SPLIT (step 1 retries a torn fence)', { ...C_OUT, FX_PLAN: true }, 'FX-OUT'],
  ['FX-OUT-X', 'ablation: C_OUT + FX-PLAN without FX_OUT', { ...C_OUT, FX_PLAN: true, FX_OUT: false }, 'FX-OUT-PLAN'],
  ['FX-CLOSE', 'FX-CLOSE (+ FX-CGATE close records, FX-PLAN step 3) on AB_COMMIT_CLOSE (D4c) with the held stop verify', C_CLOSE, 'AB-COMMIT-CLOSE'],
  ['FX-CLOSE-X', 'ablation: C_CLOSE without FX_CLOSE', { ...C_CLOSE, FX_CLOSE: false }, 'FX-CLOSE'],
  ['FX-CLOSE-NOOWNEREND', 'sub-flag ablation: C_CLOSE with FX_PLAN_OWNEREND off (schedule 2)', { ...C_CLOSE, FX_PLAN_OWNEREND: false }, 'FX-CLOSE'],
  ['FX-CGATE', 'FX-CGATE on AB_START_UNFENCED (D3) with the stale coordinator reading status.json', C_CGATE, 'AB-START-UNFENCED'],
  ['FX-CGATE-X', 'ablation = D3 rerun: C_CGATE without FX_CGATE (status.json snapshot read)', { ...C_CGATE, FX_CGATE: false }, 'FX-CGATE'],
  ['FX-CGATE-Q5B', 'FX-CGATE, branch Q5b (no session tools: the owner starts by hand), with FX-PLAN and FX-CLAIM (the claim is the only wake path from a hand-started session)', { ...C_CGATE, FX_Q5B: true, FX_PLAN: true, FX_CLAIM: true }, 'FX-CGATE'],
  ['FX-CLAIM', 'FX-CLAIM + FX-CGATE + FX-PLAN on AB_TRANSCRIPT_LAG + AB_SLOTCOUNT (D4b), lease reading (i)', C_D4B, 'AB-TRANSCRIPT-LAG'],
  ['FX-CLAIM-II', 'as FX-CLAIM, lease reading (ii): the lease may expire before a healthy session claims', { ...C_D4B, FX_LEASE_NOBOUND: true }, 'FX-CLAIM'],
  ['FX-CLAIM-X', 'ablation: C_D4B without FX_CLAIM, reading (i)', { ...C_D4B, FX_CLAIM: false }, 'FX-CLAIM'],
  ['FX-CLAIM-II-X', 'ablation: C_D4B without FX_CLAIM, reading (ii)', { ...C_D4B, FX_CLAIM: false, FX_LEASE_NOBOUND: true }, 'FX-CLAIM-II'],
  ['FX-PLAN-X', 'ablation: C_D4B without FX_PLAN', { ...C_D4B, FX_PLAN: false }, 'FX-CLAIM'],
  ['FX-PLAN-NOSTARTWAIT', 'sub-flag ablation: C_D4B with FX_PLAN_STARTWAIT off (schedule 3)', { ...C_D4B, FX_PLAN_STARTWAIT: false }, 'FX-CLAIM'],
  ['D7-SLOTS-HELD', 'D7-SLOTS with the held stop verify (FIDELITY-3 gap 1 closed)', { ...FIXES, D7_SLOTS: true, AB_STOP_HELD: true, BUD: K2, R: 1 }, 'D7-SLOTS'],
];
for (const [id, title, over, base] of FXC) CONFIGS.push({ id, order: 0, title, over, base });

// ---- round 3, the wake-group FIXES (helper MB2b, ABLATION-wake.md; FIX-wake.md rev 4 + FIX-JOIN.md). C_X = the as-built
// wake flags X's defect needs + X (+ a new fix X depends on); the ablation = C_X - X. FX-W3 and FX-W7 are not modelled.
const WA = { ...FIXES, ...D7_OBS, AB_PROCLIST: true, AB_ALARM_SUPERSEDE: true, AB_ALARM_MIDTURN: true, AB_ARM_SPLIT: true, AB_ENDTURN_SPLIT: true, AB_FAIR_IDS: true, WAKE_PROPS: true, WFX_PROPS: true, BUD: K2W, R: 1 };
const C_W12 = { ...WA, FIX_ARM_FIRST: true, FIX_ALARM_MARKER: true };
const AWD = { ...FIXES, AB_PROCLIST: true, WAKE_PROPS: true, BUD: K2W, R: 1 }; // = AB-W-<flag> without the flag
const WXC = [
  ['FXW-12', 'FX-W2 + FX-W1 (S1, L1) on the as-built arm, endturn, supersede and mid-turn alarm', C_W12, 'AB-WAKE-ALL'],
  ['FXW-12-X2', 'ablation of FX-W2: C_W12 without FIX_ARM_FIRST (as-built armAtStart, tri-state view)', { ...C_W12, FIX_ARM_FIRST: false }, 'FXW-12'],
  ['FXW-12-X1', 'ablation of FX-W1: C_W12 without FIX_ALARM_MARKER', { ...C_W12, FIX_ALARM_MARKER: false }, 'FXW-12'],
  ['FXW-12-S2', 'owner branch S2: C_W12 with two alarm slots', { ...C_W12, ALARM_SLOTS: 2 }, 'FXW-12'],
  ['FXW-12-B1', 'owner branch B1 (endturn exit 2 starts both): C_W12 + AB_EXIT2_START', { ...C_W12, AB_EXIT2_START: true }, 'FXW-12'],
  ['FXW-4', 'FX-W4 dead-man on C_W12 with the hard-kill branch (a crash kills its background commands)', { ...C_W12, AB_X_KILLS_BG: true, FIX_DEADMAN: true }, 'FXW-4-X'],
  ['FXW-4-X', 'ablation of FX-W4: C_W12 + AB_X_KILLS_BG', { ...C_W12, AB_X_KILLS_BG: true }, 'FXW-4'],
  ['FXW-5', 'FX-W5 (R1) on AB-W-ACT-DUE', { ...AWD, AB_ACT_DUE: true, FIX_ACT_RERAISE: true }, 'AB-W-ACT-DUE'],
  ['FXW-6', 'FX-W6 (B1) on AB-W-HANG-CALLS', { ...AWD, AB_HANG_CALLS: true, FIX_OP_DEADLINE: true }, 'AB-W-HANG-CALLS'],
  ['FXW-ALL', 'joint: every as-built flag of both groups + all modelled fixes of both groups (FX-W3, FX-W7, FX-REDO not modelled)',
    { ...FIXES, ...AB_FENCE, ...AB_WAKE, WAKE_PROPS: true, WFX_PROPS: true, ...D7_OBS, FX_PROPS: true, AB_STOP_HELD: true, AB_STALE_SNAPSHOT: true, AB_GP_RESTART: true,
      FX_OUT: true, FX_CLAIM: true, FX_CGATE: true, FX_CLOSE: true, FX_PLAN: true,
      FIX_ARM_FIRST: true, FIX_ALARM_MARKER: true, FIX_DEADMAN: true, FIX_ACT_RERAISE: true, FIX_OP_DEADLINE: true, BUD: K2W, R: 1 }, 'AB-ALL'],
];
for (const [id, title, over, base] of WXC) CONFIGS.push({ id, order: 0, title, over, base });
CONFIGS.push({ id: 'FXW-4-X1', order: 0, title: 'ablation of FX-W1 inside C_W4', over: { ...C_W12, AB_X_KILLS_BG: true, FIX_DEADMAN: true, FIX_ALARM_MARKER: false }, base: 'FXW-4' });
CONFIGS.push({ id: 'FXW-4-X2', order: 0, title: 'ablation of FX-W2 inside C_W4', over: { ...C_W12, AB_X_KILLS_BG: true, FIX_DEADMAN: true, FIX_ARM_FIRST: false }, base: 'FXW-4' });
CONFIGS.push({ id: 'FXW-4-S2', order: 0, title: 'owner branch S2 inside C_W4', over: { ...C_W12, AB_X_KILLS_BG: true, FIX_DEADMAN: true, ALARM_SLOTS: 2 }, base: 'FXW-4' });
// isolating FX-W1 / FX-W2 behind the FX-W4 gap: C_W4 + the modeller's candidate re-alert (not the design), and its ablations
const C_W4R = { ...C_W12, AB_X_KILLS_BG: true, FIX_DEADMAN: true, CAND_REALERT: true };
CONFIGS.push({ id: 'FXW-4R', order: 0, title: 'C_W4 + candidate re-alert (modeller, not design)', over: C_W4R, base: 'FXW-4' });
CONFIGS.push({ id: 'FXW-4R-X1', order: 0, title: 'FXW-4R without FX-W1', over: { ...C_W4R, FIX_ALARM_MARKER: false }, base: 'FXW-4R' });
CONFIGS.push({ id: 'FXW-4R-X2', order: 0, title: 'FXW-4R without FX-W2', over: { ...C_W4R, FIX_ARM_FIRST: false }, base: 'FXW-4R' });
CONFIGS.push({ id: 'FXW-4R-S2', order: 0, title: 'FXW-4R, branch S2', over: { ...C_W4R, ALARM_SLOTS: 2 }, base: 'FXW-4R' });
CONFIGS.push({ id: 'FXW-4R-B1', order: 0, title: 'FXW-4R, branch B1 (endturn exit 2 starts both)', over: { ...C_W4R, AB_EXIT2_START: true }, base: 'FXW-4R' });
// ---- final pass (MB2b, label fixes-final): FIX-fence rev 5 points 1 and 3, FIX-JOIN point 1's targeted check
CONFIGS.push({ id: 'FN-R5-DEAD', order: 0, title: 'rev 5 point 1 without the rule: C_D4B, step 7 counts dead visible folder sessions', over: { ...C_D4B, FX_R5_DEADCOUNT: true }, base: 'FX-CLAIM' });
CONFIGS.push({ id: 'FN-R5', order: 0, title: 'rev 5 point 1 with the rule: FN-R5-DEAD + FX_R5_ORPHAN', over: { ...C_D4B, FX_R5_DEADCOUNT: true, FX_R5_ORPHAN: true }, base: 'FN-R5-DEAD' });
CONFIGS.push({ id: 'FN-OUT-CLOSE', order: 0, title: 'rev 5 point 3: FX-OUT + FX-PLAN + FX-CLOSE (+ FX-CGATE records), held stop verify, commit oracle off (AB_COMMIT_CLOSE), 1 fault', over: { ...C_CLOSE, AB_READY_SPLIT: true, FX_OUT: true, BUD: { ...K2, k: 1 } }, base: 'FX-OUT-PLAN' });
CONFIGS.push({ id: 'FN-OUT-CLOSE-X', order: 0, title: 'rev 5 point 3 ablation: FN-OUT-CLOSE without FX_CLOSE', over: { ...C_CLOSE, AB_READY_SPLIT: true, FX_OUT: true, FX_CLOSE: false, BUD: { ...K2, k: 1 } }, base: 'FN-OUT-CLOSE' });
CONFIGS.push({ id: 'FN-JOIN-WSTART', order: 0, title: 'FIX-JOIN point 1: C_D4B (lease at watcher ticks) + C_W4R; a crash kills the watcher, the next turn restarts it (L1, list known)', over: { ...C_D4B, ...C_W4R }, base: 'FX-CLAIM' });
CONFIGS.push({ id: 'FN-JOIN-WSTART-D', order: 0, title: 'FN-JOIN-WSTART with the design FX-W4 (no candidate re-alert)', over: { ...C_D4B, ...C_W4R, CAND_REALERT: false }, base: 'FN-JOIN-WSTART' });
CONFIGS.push({ id: 'FN-N2', order: 0, title: 'FIX-wake rev 5 N2: FXW-4R + every turn ends with endturn (handover exit 2 and exit 75 included)', over: { ...C_W4R, FIX_ENDTURN_ALWAYS: true }, base: 'FXW-4R' });
CONFIGS.push({ id: 'FN-JOIN-WSTART-1F', order: 0, title: 'FN-JOIN-WSTART with one field (to complete the targeted schedule)', over: { ...C_D4B, ...C_W4R, FIELDS: 1 }, base: 'FN-JOIN-WSTART' });
CONFIGS.push({ id: 'FN-OUT-CLOSE-K2', order: 0, title: 'FN-OUT-CLOSE at two faults (K2)', over: { ...C_CLOSE, AB_READY_SPLIT: true, FX_OUT: true }, base: 'FN-OUT-CLOSE' });
