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
const C_LEASE = { ...C_D4B, ...R5, ...BUILT_FENCE };
add('LEASE-B', 'the lease act as built: --if-unclaimed checked first, a claim may land before the tombstone (window)', C_LEASE, 'LEASE-ORDER');
add('LEASE-ORDER', 'the closing order: refusals, tombstone, slot (the tombstone create decides)', { ...C_LEASE, BLD_LEASE_ORDER: true }, 'LEASE-B');
add('LEASE-X', 'ablation: the lease act without --if-unclaimed (the R57 model)', { ...C_LEASE, BLD_IF_UNCLAIMED: false, BLD_LEASE_WINDOW: false }, 'LEASE-B');

// 4. CLOSE's id gap (departures/CLOSE.md 1, units/CLOSE/result.md:76): every close through the owner's relayed `closed`
const C_GAP = { ...C_CLOSE, AB_READY_SPLIT: true, FX_OUT: true, ...BUILT_FENCE };
add('IDGAP-W', 'the id gap with fault w: the coordinator relays closed for a session the owner did not close', { ...C_GAP, BUD: { ...K2, k: 1, w: 1 } }, 'FN-OUT-CLOSE-K2-B');
add('IDGAP-X', 'ablation: no id gap (the hook records count), verify by records as built', { ...C_GAP, BLD_CLOSE_IDGAP: false }, 'FN-OUT-CLOSE-K2-B');

// 5. the unrecorded close facts, the other value of each (the -B configurations run the first): stop_session only
// interrupts and archive_session waits for the owner's approval
add('CLOSE-APPROVAL', 'FN-OUT-CLOSE-K2-B with stop_session interrupt-only and archive_session approval', { ...C_GAP, BLD_STOP_INTERRUPT_ONLY: true, BLD_ARCHIVE_APPROVAL: true }, 'FN-OUT-CLOSE-K2-B');
add('CLOSE-APPROVAL-R5', 'FN-R5-B with stop_session interrupt-only and archive_session approval', { ...byId('FN-R5').over, ...BUILT_FENCE, BLD_STOP_INTERRUPT_ONLY: true, BLD_ARCHIVE_APPROVAL: true }, 'FN-R5-B');
