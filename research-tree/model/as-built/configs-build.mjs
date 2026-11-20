// S2.2 (task r57-0507, slice 2): the configurations of the model as built on `build` (MAP-build.md, RUN-BUILD.md).
// check-build.mjs and run-seq-build.mjs read this file; configs.mjs and every other file of this folder stay as the R57
// round left them. The R57 final pass's configurations are taken from configs.mjs by id, unchanged (their verdicts must
// reproduce on model-build.mjs with every S2.2 flag off); each "-B" configuration is one of them with the build's flags.
import { CONFIGS as R57, K2 } from './configs.mjs';

const byId = (id) => { const c = R57.find((x) => x.id === id); if (!c) throw new Error('configs.mjs has no ' + id); return c; };
// the R57 final pass (BUILD-PLAN row S2.2; RUN-BUILD.md section 1), kept as they were (regression of model-build.mjs)
const FINAL = ['SMOKE', 'FN-R5', 'FN-OUT-CLOSE-K2', 'FXW-4R', 'FXW-5', 'FXW-6', 'FN-N2', 'FX-CLAIM', 'FX-CLOSE'];
export const CONFIGS = FINAL.map((id) => ({ ...byId(id), order: 0 }));

// the flags of the code as built (MAP-build.md section 2). Fence group: every row act and close as the scripts do it now.
export const BUILT = { BQ5_OWNER_TURN: true, BLD_PROPS: true };
export const BUILT_FENCE = { ...BUILT, BLD_IF_UNCLAIMED: true, BLD_LEASE_WINDOW: true, BLD_CLOSE_IDGAP: true, BLD_VERIFY_RECORDS: true };
// FX-CLAIM step 7 as built counts a visible folder session with no counted record, alive or dead, and a tombstone's stop
// closes every folder session first (rev 5 point 1): the final pass's FN-R5 readings, which the code settles
const R5 = { FX_R5_DEADCOUNT: true, FX_R5_ORPHAN: true };
const C_D4B = byId('FX-CLAIM').over;   // FX-CLAIM + FX-CGATE + FX-PLAN, transcript lag, slot count, held stop verify
const C_CLOSE = byId('FX-CLOSE').over; // FX-CLOSE + FX-CGATE + FX-PLAN, commit close, held stop verify
const add = (id, title, over, base) => CONFIGS.push({ id, order: 0, title, over, base });

// 1. the final pass as built
add('FN-R5-B', 'FN-R5 as built: + the Q5 rule, --if-unclaimed with its window, the id gap, verify by records', { ...byId('FN-R5').over, ...BUILT_FENCE }, 'FN-R5');
add('FN-OUT-CLOSE-K2-B', 'FN-OUT-CLOSE-K2 as built: + the Q5 rule, the id gap, verify by records', { ...byId('FN-OUT-CLOSE-K2').over, ...BUILT_FENCE }, 'FN-OUT-CLOSE-K2');
add('FXW-4R-B', 'FXW-4R as built (S1, L1, P1 re-alert, B2 on exit 2) + the Q5 rule', { ...byId('FXW-4R').over, ...BUILT }, 'FXW-4R');
add('FXW-5-B', 'FXW-5 (R1) as built + the Q5 rule', { ...byId('FXW-5').over, ...BUILT }, 'FXW-5');
add('FXW-6-B', 'FXW-6 (B1) as built + the Q5 rule', { ...byId('FXW-6').over, ...BUILT }, 'FXW-6');
add('FN-N2-B', 'FN-N2 (E1 with the N2 rule) as built + the Q5 rule', { ...byId('FN-N2').over, ...BUILT }, 'FN-N2');

// 2. Q5 (branches row 1): starts only on a turn the owner typed; fault q, a start called on another turn (refute/S0.3.md:58);
// the unrecorded fact both ways (BQ5_REFUSED_SJ); three q faults reach the third no-start fence, the first charged one
const C_Q5 = { ...C_D4B, ...R5, ...BUILT_FENCE, BUD: { ...K2, k: 3, q: 3 } };
add('BQ5-SJ', 'Q5 rule, a refused start leaves start.json (hook first): no-start fences, charged after H_nostart = 2', { ...C_Q5, BQ5_REFUSED_SJ: true }, 'BQ5-NOSJ');
add('BQ5-NOSJ', 'Q5 rule, a refused start writes nothing (the app refuses before the hook)', C_Q5, 'FN-R5-B');
add('BQ5-X', 'ablation of the owner step: the Q5 rule with an owner who never types (starts rest on the owner)', { ...C_Q5, BQ5_NO_OWNER: true }, 'BQ5-NOSJ');

// 3. CLAIM's window (refute/CLAIM.md:52): a session stuck before its first call lets the lease expire, then claims
// FX_LEASE_NOBOUND, reading (ii): the lease may run out while the session lives unclaimed (a start slower than the
// 10-minute lease); under reading (i) the window is unreachable (the lease waits for every live unclaimed session)
// One field: reading (ii) at two fields fills 1800 MB before 13 M states; the lease act is per row (S2.2 runs, MAP-build.md)
const C_LEASE = { ...C_D4B, ...R5, ...BUILT_FENCE, FX_LEASE_NOBOUND: true, FIELDS: 1 };
add('LEASE-B', 'the lease act as built: --if-unclaimed checked first, a claim may land before the tombstone (window)', C_LEASE, 'LEASE-ORDER');
add('LEASE-ORDER', 'the closing order: refusals, tombstone, slot (the tombstone create decides)', { ...C_LEASE, BLD_LEASE_ORDER: true }, 'LEASE-B');
add('LEASE-NOWIN', 'ablation of the window: --if-unclaimed read in the same instant as the tombstone (the design, rev 5)', { ...C_LEASE, BLD_LEASE_WINDOW: false }, 'LEASE-B');
add('LEASE-X', 'ablation: the lease act without --if-unclaimed (the R57 model)', { ...C_LEASE, BLD_IF_UNCLAIMED: false, BLD_LEASE_WINDOW: false }, 'LEASE-B');

// 4. CLOSE's id gap (departures/CLOSE.md 1, units/CLOSE/result.md:76): every close through the owner's relayed `closed`
const C_GAP = { ...C_CLOSE, AB_READY_SPLIT: true, FX_OUT: true, ...BUILT_FENCE };
// fault w needs a session alive at the verify: with the close facts' other value (stop interrupts, archive waits) it is
// one; under the first value only a zombie (z) is, so IDGAP-WZ runs k=2,z=1,w=1
add('IDGAP-W', 'the id gap with fault w: the coordinator relays closed for a live session the owner did not close', { ...C_GAP, BLD_STOP_INTERRUPT_ONLY: true, BLD_ARCHIVE_APPROVAL: true, BUD: { ...K2, k: 1, w: 1 } }, 'CLOSE-APPROVAL');
add('IDGAP-WZ', 'the id gap with fault w on a zombie (the close does not end it)', { ...C_GAP, BUD: { ...K2, k: 2, z: 1, w: 1 } }, 'FN-OUT-CLOSE-K2-B');
add('IDGAP-X', 'ablation: no id gap (the hook records count), verify by records as built', { ...C_GAP, BLD_CLOSE_IDGAP: false }, 'FN-OUT-CLOSE-K2-B');

// 5. the unrecorded close facts, the other value of each (the -B configurations run the first): stop_session only
// interrupts and archive_session waits for the owner's approval
add('CLOSE-APPROVAL', 'FN-OUT-CLOSE-K2-B with stop_session interrupt-only and archive_session approval', { ...C_GAP, BLD_STOP_INTERRUPT_ONLY: true, BLD_ARCHIVE_APPROVAL: true }, 'FN-OUT-CLOSE-K2-B');
add('CLOSE-APPROVAL-R5', 'FN-R5-B with stop_session interrupt-only and archive_session approval', { ...byId('FN-R5').over, ...BUILT_FENCE, BLD_STOP_INTERRUPT_ONLY: true, BLD_ARCHIVE_APPROVAL: true }, 'FN-R5-B');

// 6. W6 item 6 (refute/W4.md:100-125) after the FX-W6 fix round (S2.4 VERDICT section 1): the age cap as built, never
// re-armed by an acknowledgement; fault m, a child at bound that imitates activity (no detector fires, no READY); the
// coordinator only acknowledges. AGE-STUCK, once the design leg, is now the code: the same flags and states as AGE-B.
// AGE-REARM is the ablation, the re-arm the fix round deleted, and fails AgeCapReachesOwner (the check is not vacuous).
const C_AGE = { ...byId('FXW-5').over, ...BUILT, BLD_AGE_CAP: true, BUD: { ...byId('FXW-5').over.BUD, k: 1, m: 1 } };
add('AGE-B', 'the age cap as built: acknowledged, FX-W5 raises it again, stuck, the dead-man reaches the owner', C_AGE, 'AGE-REARM');
add('AGE-STUCK', 'the design leg, built by the FX-W6 fix round: the same flags as AGE-B (kept as the record names it)', { ...C_AGE }, 'AGE-REARM');
add('AGE-REARM', 'ablation: the re-arm on an acknowledgement (build d655547f); FX-W5 and its stuck count never see the cap', { ...C_AGE, AB_AGE_REARM: true }, 'AGE-B');

// 7. REDO (refute/W4.md:132-137): fault g, a reconcile dies between a row's started write and its started line; FX-REDO
// writes it at the next reconcile while the row is at started; the close group, where a row may be committed at started
const C_REDO = { ...byId('FN-OUT-CLOSE-K2').over, ...BUILT_FENCE, BLD_REDO: true, BUD: { ...K2, k: 2, g: 2 } };
add('REDO-B', 'REDO as built: a started line lost by a dying reconcile, FX-REDO at the next reconcile', C_REDO, 'REDO-X');
add('REDO-X', 'ablation of FX-REDO: a missing started line is never written', { ...C_REDO, BLD_REDO_OFF: true }, 'REDO-B');
