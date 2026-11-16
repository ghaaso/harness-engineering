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
export const MODE = { OK: 0, STUCK: 1, LOOPS: 2, LOOPV: 3, DEAD: 4 };
export const RSN = { FIRST: 0, STALL: 1, HANG: 2, LOOP: 3, HO: 4 };
export const OP = { F: 1, S: 2, A: 3, T: 4, B: 5, M: 6, D: 7, H: 8, Y: 9, E: 10 };
const RNAME = ['first', 'stall', 'hang', 'loop', 'planned hand-over'];
const MNAME = ['ok', 'stuck in a slow call', 'loops (same call)', 'loops (varied calls, no progress)', 'crashed'];
export const FAULTS = ['cs', 'cv', 'cd', 'z', 'p', 'l', 'x', 't', 'r']; // child stuck, child loops, child crashes, ...
export const KINDS = [...FAULTS, 'h', 'd'];
const MKIND = { 1: 'cs', 3: 'cv', 4: 'cd' };

export function makeParams(over = {}) {
  const base = {
    FIELDS: 2, R: 1, NMAX: 2, HMAX_TASK: 1, C_STALL: 1, H_HANG: 2, LOOP: 3,
    BUD: { k: 3, cs: 2, cv: 2, cd: 2, z: 1, p: 2, l: 2, x: 1, t: 1, r: 0, h: 1, d: 1 },
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
  };
  return { ...base, ...over, BUD: { ...base.BUD, ...(over.BUD || {}) } };
}

// ---------------------------------------------------------------- state
export function initial(P) {
  const T = [];
  for (let f = 0; f < P.FIELDS; f++) T.push({ st: 0, ep: 0, step: 0, rs: 0, hv: 0, fail: 0, cut: 0, ctn: 0, ncr: 0, cmE: -1, rsn: 0, wep: 0, cs: 0, hs: 0, rep: 0 });
  return { ce: 0, ws: 0, syn: 0, to: 0, seq: 0, ack: 0, B: { ...P.BUD }, T, S: [], W: [], A: [], E: [], C: [{ ce: 0, wk: 1, boot: 1, dr: 0, rd: 0, pc: null }] };
}
const cloneT = (t) => ({ st: t.st, ep: t.ep, step: t.step, rs: t.rs, hv: t.hv, fail: t.fail, cut: t.cut, ctn: t.ctn, ncr: t.ncr, cmE: t.cmE, rsn: t.rsn, wep: t.wep, cs: t.cs, hs: t.hs, rep: t.rep });
const cloneS = (s) => ({ f: s.f, ep: s.ep, m: s.m, p: s.p, pf: s.pf, tc: s.tc, al: s.al, z: s.z, mv: s.mv, nc: s.nc, sig: s.sig, pu: s.pu, par: s.par, hb: s.hb, hd: s.hd });
export function clone(x) {
  return {
    ce: x.ce, ws: x.ws, syn: x.syn, to: x.to, seq: x.seq, ack: x.ack,
    B: { ...x.B },
    T: x.T.map(cloneT), S: x.S.map(cloneS), W: x.W.map((w) => ({ par: w.par, ph: w.ph, lk: w.lk, gap: w.gap })),
    A: x.A.slice(), E: x.E.map((e) => ({ f: e.f, ep: e.ep, cls: e.cls, seq: e.seq })),
    C: x.C.map((c) => ({ ce: c.ce, wk: c.wk, boot: c.boot, dr: c.dr, rd: c.rd, pc: c.pc ? c.pc.map((o) => o.slice()) : null })),
  };
}
const term = (st) => st === ST.C || st === ST.F;
export const isTerm = term;
export const cur = (n, f) => n.S.find((s) => s.f === f && s.ep === n.T[f].ep);
const liveCount = (n) => n.S.filter((s) => s.al && s.p < 2).length;
const quiescent = (n) => !n.S.some((s) => s.al && s.p < 2);
// R12: quiescence = no live child process of any epoch; the ablation reads the table (nothing at run/admitted)
const readyToHandOver = (n, P) => (P.DRAIN ? quiescent(n) : !n.T.some((t) => t.st === ST.A && (t.step === STEP.RUN || t.step === STEP.ADMITTED)));
function mkSession(f, ep, par, tc) { return { f, ep, m: 0, p: 0, pf: 0, tc, al: 1, z: 0, mv: 0, nc: 0, sig: 0, pu: 0, par, hb: 0, hd: 0 }; }
function wake(n, i) { const c = n.C[i]; if (!c) return; if (c.pc !== null) return; /* fact 2: seen at the next tool call of the running turn */ c.wk = Math.min(3, c.wk + 1); }
const has = (n, kind) => n.B[kind] > 0 && (kind === 'h' || kind === 'd' || n.B.k > 0);
const spend = (n, kind) => { n.B[kind]--; if (kind !== 'h' && kind !== 'd') n.B.k--; }; // planned hand-overs are not faults

// canonical form: drop what can no longer matter, renumber the ledger, sort
export function canon(n, P) {
  n.S = n.S.filter((s) => {
    const t = n.T[s.f];
    if (s.al && s.p < 2) return true;
    if (t.st === ST.A && s.ep === t.ep) return true;
    if (t.st === ST.A && s.ep === t.ep - 1 && (t.step === STEP.FENCED || t.step === STEP.STOPPED)) return true; // restore source
    if (!P.FENCE_EPOCH && s.p === 2 && !s.hd && t.st === ST.A) return true; // ablation: a stale READY can still be committed
    return false;
  });
  for (const s of n.S) {
    if (!s.al || s.p === 2) { s.mv = 0; s.nc = 0; s.sig = 0; s.pu = 0; if (!s.al && s.p < 2) s.m = MODE.DEAD; if (s.p === 2) s.m = MODE.OK; }
    if (s.p === 2 || !s.al) s.z = s.al ? s.z : 0;
  }
  for (const t of n.T) if (t.st !== ST.A || t.step !== STEP.RUN) { t.wep = 0; t.cs = 0; t.hs = 0; t.rep = 0; }
  for (const t of n.T) if (term(t.st)) { t.step = 0; t.cut = 0; t.ctn = 0; t.rsn = 0; t.fail = t.st === ST.F ? 1 : 0; }
  // ledger: keep events after acked_seq that name a current running attempt; renumber 1..n
  const keep = n.E.filter((e) => e.seq > n.ack && n.T[e.f].st === ST.A && n.T[e.f].step === STEP.RUN && n.T[e.f].ep === e.ep);
  keep.sort((a, b) => a.seq - b.seq);
  for (const c of n.C) { let r = 0; for (const e of keep) if (e.seq <= c.rd) r++; c.rd = c.pc ? r : 0; }
  keep.forEach((e, i) => { e.seq = i + 1; });
  n.E = keep; n.ack = 0; n.seq = keep.length;
  for (const c of n.C) if (c.pc === null && !c.wk) c.dr = c.ce < n.ce ? 0 : c.dr;
  n.S.sort((a, b) => a.f - b.f || a.ep - b.ep || a.par - b.par || a.al - b.al || a.p - b.p || a.m - b.m || a.z - b.z);
  n.W.sort((a, b) => a.par - b.par || a.ph - b.ph || a.lk - b.lk || a.gap - b.gap);
  n.A.sort((a, b) => a - b);
  return n;
}

// compact byte encoding (all values < 256); a plan is interned (2 bytes), the table lives per process
const planIds = new Map(); const planList = [];
function planId(pc) { const k = pc.map((o) => o.join(',')).join(';'); let id = planIds.get(k); if (id === undefined) { id = planList.length; planIds.set(k, id); planList.push(pc.map((o) => o.slice())); } return id; }
export function encode(n, buf) {
  let i = 0;
  const B = n.B;
  buf[i++] = n.ce; buf[i++] = n.ws | (n.syn << 1) | (n.to << 2); buf[i++] = n.seq;
  buf[i++] = B.k; buf[i++] = B.cs | (B.cv << 4); buf[i++] = B.cd | (B.z << 4); buf[i++] = B.p | (B.l << 4); buf[i++] = B.x | (B.t << 4); buf[i++] = B.r | (B.h << 4); buf[i++] = B.d;
  buf[i++] = n.T.length; buf[i++] = n.S.length; buf[i++] = n.W.length; buf[i++] = n.A.length; buf[i++] = n.E.length; buf[i++] = n.C.length;
  for (const t of n.T) {
    buf[i++] = t.st | (t.step << 2) | (t.fail << 5) | (t.cut << 6) | (t.ctn << 7);
    buf[i++] = t.ep;
    buf[i++] = t.rs | (t.hv << 3) | (t.ncr << 5);
    buf[i++] = (t.cmE + 1) | (t.rsn << 4);
    buf[i++] = t.wep;
    buf[i++] = t.cs | (t.hs << 3) | (t.rep << 6);
  }
  for (const s of n.S) {
    buf[i++] = s.f | (s.m << 2) | (s.p << 5);
    buf[i++] = s.ep;
    buf[i++] = s.pf | (s.tc << 1) | (s.al << 2) | (s.z << 3) | (s.mv << 4) | (s.pu << 5) | (s.hb << 6) | (s.hd << 7);
    buf[i++] = s.nc | (s.sig << 3) | (s.par << 6);
  }
  for (const w of n.W) buf[i++] = w.par | (w.ph << 3) | (w.lk << 4) | (w.gap << 5);
  for (const a of n.A) buf[i++] = a;
  for (const e of n.E) buf[i++] = e.f | (e.cls << 2) | (e.ep << 5); // seq = position + 1
  for (const c of n.C) {
    buf[i++] = c.ce; buf[i++] = c.wk | (c.boot << 2) | (c.dr << 3) | ((c.pc ? 1 : 0) << 4); buf[i++] = c.rd;
    if (c.pc) { const id = planId(c.pc); buf[i++] = id & 255; buf[i++] = id >> 8; }
  }
  return i;
}
export function decode(b) {
  let i = 0;
  const n = { ce: b[i++], ws: 0, syn: 0, seq: 0, ack: 0 };
  const x = b[i++]; n.ws = x & 1; n.syn = (x >> 1) & 1; n.to = (x >> 2) & 1; n.seq = b[i++];
  const B = { k: b[i++] }; let y = b[i++]; B.cs = y & 15; B.cv = y >> 4; y = b[i++]; B.cd = y & 15; B.z = y >> 4; y = b[i++]; B.p = y & 15; B.l = y >> 4; y = b[i++]; B.x = y & 15; B.t = y >> 4; y = b[i++]; B.r = y & 15; B.h = y >> 4; B.d = b[i++];
  n.B = B;
  const nT = b[i++], nS = b[i++], nW = b[i++], nA = b[i++], nE = b[i++], nC = b[i++];
  n.T = []; n.S = []; n.W = []; n.A = []; n.E = []; n.C = [];
  for (let k = 0; k < nT; k++) {
    const a = b[i++], ep = b[i++], c = b[i++], d = b[i++], wep = b[i++], e = b[i++];
    n.T.push({ st: a & 3, step: (a >> 2) & 7, fail: (a >> 5) & 1, cut: (a >> 6) & 1, ctn: (a >> 7) & 1, ep, rs: c & 7, hv: (c >> 3) & 3, ncr: (c >> 5) & 7, cmE: (d & 15) - 1, rsn: d >> 4, wep, cs: e & 7, hs: (e >> 3) & 7, rep: (e >> 6) & 1 });
  }
  for (let k = 0; k < nS; k++) {
    const a = b[i++], ep = b[i++], c = b[i++], d = b[i++];
    n.S.push({ f: a & 3, m: (a >> 2) & 7, p: (a >> 5) & 3, ep, pf: c & 1, tc: (c >> 1) & 1, al: (c >> 2) & 1, z: (c >> 3) & 1, mv: (c >> 4) & 1, pu: (c >> 5) & 1, hb: (c >> 6) & 1, hd: (c >> 7) & 1, nc: d & 7, sig: (d >> 3) & 7, par: d >> 6 });
  }
  for (let k = 0; k < nW; k++) { const a = b[i++]; n.W.push({ par: a & 7, ph: (a >> 3) & 1, lk: (a >> 4) & 1, gap: (a >> 5) & 1 }); }
  for (let k = 0; k < nA; k++) n.A.push(b[i++]);
  for (let k = 0; k < nE; k++) { const a = b[i++]; n.E.push({ f: a & 3, cls: (a >> 2) & 7, ep: a >> 5, seq: k + 1 }); }
  for (let k = 0; k < nC; k++) {
    const ce = b[i++], a = b[i++], rd = b[i++];
    const c = { ce, wk: a & 3, boot: (a >> 2) & 1, dr: (a >> 3) & 1, rd, pc: null };
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
    if (t.st === ST.A && t.step === STEP.ADMITTED && cur(n, f)) t.step = STEP.RUN; // a transcript for the attempt folder: the start happened
    if (t.st === ST.A && t.cmE >= 0) { t.st = ST.C; t.step = 0; } // a COMMIT record exists: the task is committed
  }
}

function eligibleHO(n, f, P) {
  const t = n.T[f]; const s = cur(n, f);
  return t.st === ST.A && t.step === STEP.RUN && s && s.al && s.m === MODE.OK && s.p === 1 && t.hv < P.HMAX_TASK && n.B.h > 0;
}

// the plans a coordinator may make at the start of a turn (after reconcile), from what it reads
function plans(n, i, P) {
  const c = n.C[i];
  if (P.FENCE_CE && c.ce < n.ce) return [[]]; // R6: woken with a stale ce, it ends its turn without any writing script
  let alts = [[]];
  const add = (ops) => { alts = alts.map((a) => a.concat(ops)); };
  for (let f = 0; f < n.T.length; f++) {
    const t = n.T[f];
    if (t.st === ST.P) { if (!c.dr) add([[OP.A, f, 0, 0], [OP.T, f, 0, 0], [OP.B, f, 0, 0]]); continue; }
    if (t.st !== ST.A) continue;
    if (t.step === STEP.RUN) {
      const s = cur(n, f);
      const ev = n.E.find((e) => e.f === f && e.ep === t.ep && e.seq > n.ack && e.seq <= c.rd);
      if (s && s.p === 2) add([[OP.M, f, 0, t.ep]]);
      else if (ev) add([[OP.F, f, ev.cls, t.ep], [OP.S, f, 0, 0], [OP.A, f, 0, 0], [OP.T, f, 0, 0], [OP.B, f, 0, 0]]);
      else if (eligibleHO(n, f, P) && !c.dr) alts = alts.flatMap((a) => [a, a.concat([[OP.F, f, RSN.HO, t.ep], [OP.S, f, 0, 0], [OP.A, f, 0, 0], [OP.T, f, 0, 0], [OP.B, f, 0, 0]])]);
    } else if (t.step === STEP.FENCED) add([[OP.S, f, 0, 0], [OP.A, f, 0, 0], [OP.T, f, 0, 0], [OP.B, f, 0, 0]]);
    else if (t.step === STEP.STOPPED) add([[OP.A, f, 0, 0], [OP.T, f, 0, 0], [OP.B, f, 0, 0]]);
    else if (t.step === STEP.ADMITTED) add([[OP.T, f, 0, 0], [OP.B, f, 0, 0]]);
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
  return k === OP.F ? (x === RSN.FIRST ? `replace(f${f},first)` : `replace(f${f},${RNAME[x]},e${y})`) : k === OP.S ? `stop(f${f})` : k === OP.A ? `admit(f${f})` : k === OP.T ? `start-session(f${f})` : k === OP.B ? `bind(f${f})` : k === OP.M ? `commit(f${f}e${y})` : k === OP.D ? 'drain(W*_coord)' : k === OP.H ? 'handover' : k === OP.Y ? 'synthesis' : 'endturn';
};

function killAlarmsOf(n, i, P, why) {
  const before = n.A.length;
  n.A = n.A.filter((a) => a !== i);
  if (before !== n.A.length && P.KILL_WAKES) wake(n, i);
  return before !== n.A.length;
}

function admitCount(n, P) {
  if (P.ADMIT_LIVE) {
    let k = liveCount(n);
    if (P.FIX_ADMIT_RESERVE) k += n.T.filter((t, f) => t.st === ST.A && t.step === STEP.ADMITTED && !cur(n, f)).length;
    return k;
  }
  return n.T.filter((t) => t.st === ST.A && (t.step === STEP.RUN || t.step === STEP.ADMITTED)).length;
}

// one op of coordinator i; returns [{lab, n, fault, viol}]
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
  if (stale && P.FENCE_CE && k !== OP.Y) { c.pc = null; out.push({ lab: L && `${who} ${opName(op)}: script refuses (exit 64, stale --ce); turn ends`, n, viol: [] }); return out; }
  const sv = stale ? ['TwoCoordinatorsAct'] : [];
  const t = f < n.T.length ? n.T[f] : null;
  if (k === OP.F) {
    if (x === RSN.FIRST) {
      if (t.st !== ST.P) { next(n); out.push({ lab: L && `${who} ${opName(op)} skipped`, n, viol: [] }); return out; }
      t.st = ST.A; t.ep++; t.step = STEP.STOPPED; t.rsn = RSN.FIRST; t.cut = 0;
      next(n); out.push({ lab: L && `${who} replace.mjs f${f} first start: epoch -> e${t.ep}`, n, viol: sv }); return out;
    }
    if (t.st !== ST.A || t.step !== STEP.RUN || t.ep !== ep) { next(n); out.push({ lab: L && `${who} ${opName(op)} skipped: the row is no longer at run e${ep}`, n, viol: [] }); return out; }
    const s = cur(n, f);
    const viol = [...sv];
    if (s && s.p === 2) {
      if ((x !== RSN.HO && P.READY_WINS) || (x === RSN.HO && P.FIX_READY_ALL)) { next(n); out.push({ lab: L && `${who} replace.mjs f${f} (${RNAME[x]}): READY of e${ep} found under the lock -> refuses, commit wins`, n, viol }); return out; }
      viol.push('ReadyNotDiscarded');
    }
    if (n.C[i].dr && x === RSN.HO) { next(n); out.push({ lab: L && `${who} ${opName(op)} skipped: draining`, n, viol: [] }); return out; }
    if (x === RSN.HO) {
      if (!has(n, 'h')) { next(n); out.push({ lab: L && `${who} ${opName(op)} skipped: no planned hand-over left in the budget`, n, viol: [] }); return out; }
      spend(n, 'h'); t.hv++;
    }
    const host = s && s.hb;
    if (x !== RSN.HO && !host && P.RESTART_LIMIT && t.rs >= P.R) {
      if (!P.STOP_ON_LIMIT) { t.st = ST.F; t.step = 0; next(n); out.push({ lab: L && `${who} replace.mjs f${f} (${RNAME[x]}): restart limit -> exit 1, task FAILED; the attempt is neither fenced nor stopped`, n, viol }); return out; }
      t.fail = 1;
    } else if (x !== RSN.HO && !host) t.rs = Math.min(7, t.rs + 1);
    t.cut = s ? Math.min(s.p, 1) : 0; t.ep++; t.step = STEP.FENCED; t.rsn = x === RSN.HO ? RSN.HO : x;
    next(n);
    out.push({ lab: L && `${who} replace.mjs f${f} (${host ? 'host' : RNAME[x]}): FENCE e${ep} -> e${t.ep}${t.fail ? ' on the LIMIT path' : x === RSN.HO || host ? ' (no charge to R)' : `, restarts=${t.rs}`}, staging cut=${t.cut} card(s)`, n, viol });
    return out;
  }
  if (k === OP.S) {
    if (t.st !== ST.A || t.step !== STEP.FENCED) { next(n); out.push({ lab: L && `${who} ${opName(op)} skipped`, n, viol: [] }); return out; }
    let vs = [{ n, lab: '', fault: false }];
    const victims = [];
    n.S.forEach((s, q) => { if (s.f === f && s.ep < t.ep && s.al && s.p < 2 && !s.z) victims.push(q); });
    for (const q of victims) {
      const nv = [];
      for (const v of vs) {
        const a = clone(v.n); a.S[q].al = 0; if (P.KILL_WAKES) wake(a, a.S[q].par);
        nv.push({ n: a, lab: v.lab + (L ? ` stop f${f}e${a.S[q].ep} confirmed;` : ''), fault: v.fault });
        if (has(v.n, 'z')) { const b = clone(v.n); spend(b, 'z'); b.S[q].z = 1; nv.push({ n: b, lab: v.lab + (L ? ` FAULT stop of f${f}e${b.S[q].ep} unconfirmed (zombie, escalated to the owner);` : ''), fault: true }); }
      }
      vs = nv;
    }
    for (const v of vs) {
      const tt = v.n.T[f]; tt.step = STEP.STOPPED;
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
    const cnt = admitCount(n, P);
    if (cnt >= P.NMAX) { next(n); out.push({ lab: L && `${who} admit.mjs f${f}: refused, ${cnt} counted >= N_max=${P.NMAX} (row stays at stopped)`, n, viol: [] }); return out; }
    if (firstStart) { t.st = ST.A; t.ep++; t.rsn = RSN.FIRST; t.cut = 0; }
    const old = n.S.find((s) => s.f === f && s.ep === t.ep - 1);
    t.ctn = old ? (old.tc | (P.CUT ? 0 : old.pf)) : 0;
    t.step = STEP.ADMITTED; next(n);
    out.push({ lab: L && `${who} admit.mjs f${f}: ${cnt} counted < ${P.NMAX}; checkpoint = commits + e${t.ep - 1} staging ${P.CUT ? `prefix <= cut (${t.cut})` : 'as found'}${t.ctn ? ' (CONTAINS cards written after the fence)' : ''}; row admitted e${t.ep}`, n, viol: sv });
    return out;
  }
  if (k === OP.T) {
    if (t.st !== ST.A || t.step !== STEP.ADMITTED) { next(n); out.push({ lab: L && `${who} ${opName(op)} skipped`, n, viol: [] }); return out; }
    const dup = n.S.some((s) => s.f === f && s.ep === t.ep);
    n.S.push(mkSession(f, t.ep, i, t.ctn)); next(n);
    out.push({ lab: L && `${who} starts session f${f}e${t.ep} (session tool)${dup ? ' -- a SECOND session for the same attempt' : ''}`, n, viol: dup ? [...sv, 'OneSessionPerAttempt'] : sv });
    return out;
  }
  if (k === OP.B) {
    if (t.st !== ST.A || t.step !== STEP.ADMITTED || !cur(n, f)) { next(n); out.push({ lab: L && `${who} ${opName(op)} skipped`, n, viol: [] }); return out; }
    t.step = STEP.RUN; next(n); out.push({ lab: L && `${who} replace.mjs --step bound f${f}e${t.ep}`, n, viol: sv }); return out;
  }
  if (k === OP.M) {
    const s = n.S.find((y) => y.f === f && y.ep === ep);
    if (!s || s.p !== 2) { next(n); out.push({ lab: L && `${who} commit(f${f}e${ep}): no READY`, n, viol: [] }); return out; }
    if (P.FENCE_EPOCH && ep !== t.ep) { s.hd = 1; next(n); out.push({ lab: L && `${who} commit.mjs f${f}e${ep}: exit 10 stale epoch (table e${t.ep}), zombie write logged`, n, viol: [] }); return out; }
    if (t.st !== ST.A) { s.hd = 1; next(n); out.push({ lab: L && `${who} commit.mjs f${f}e${ep}: refused, task ${['planned', 'active', 'committed', 'failed'][t.st]}`, n, viol: [] }); return out; }
    const viol = [...sv];
    if (t.cmE >= 0 && P.COMMIT_WX) {
      s.hd = 1;
      if (t.cmE === ep) { t.st = ST.C; t.step = 0; next(n); out.push({ lab: L && `${who} commit.mjs f${f}e${ep}: COMMIT exists, identical -> no-op, table committed`, n, viol }); }
      else { next(n); out.push({ lab: L && `${who} commit.mjs f${f}e${ep}: exit 13, COMMIT names e${t.cmE}`, n, viol }); }
      return out;
    }
    t.ncr = Math.min(3, t.ncr + 1); t.cmE = ep; s.hd = 1;
    if (s.tc || ep !== t.ep) viol.push('NoStaleAccepted');
    const lab0 = L && `${who} commit.mjs f${f}e${ep}: COMMIT ${P.COMMIT_WX ? 'created (wx)' : 'written (overwrites)'}${s.tc ? ' -- its checkpoint holds post-fence cards' : ''}`;
    if (has(n, 't')) { const b = clone(n); spend(b, 't'); next(b); out.push({ lab: L && lab0 + ', then FAULT the script dies before the table update', n: b, fault: true, viol }); }
    t.st = ST.C; t.step = 0; next(n); out.push({ lab: L && lab0 + ', table committed', n, viol });
    return out;
  }
  if (k === OP.D) {
    if (!has(n, 'd') || c.dr) { next(n); out.push({ lab: L && `${who} drain skipped`, n, viol: [] }); return out; }
    spend(n, 'd'); c.dr = 1; next(n); out.push({ lab: L && `${who} reaches W*_coord: drains (coord.json), every start blocked`, n, viol: sv }); return out;
  }
  if (k === OP.H) {
    if (!c.dr || !readyToHandOver(n, P)) { c.pc = null; out.push({ lab: L && `${who} handover skipped: not quiescent; turn ends`, n, viol: [] }); return out; }
    c.pc = null;
    for (const w of n.W.filter((w) => w.par === i)) { if (w.lk) n.ws = 1; if (P.KILL_WAKES) wake(n, i); }
    n.W = n.W.filter((w) => w.par !== i);
    killAlarmsOf(n, i, P);
    n.ce++; n.to = 0; c.pc = null;
    out.push({ lab: L && `${who} handover.mjs: kills its watcher and alarm, ce -> ${n.ce}`, n, viol: sv });
    return out;
  }
  if (k === OP.Y) {
    if (!n.T.every((tt) => term(tt.st))) { next(n); out.push({ lab: L && `${who} synthesis skipped`, n, viol: [] }); return out; }
    n.syn = 1; n.W = []; n.A = []; c.pc = null;
    out.push({ lab: L && `${who} synthesis reads the committed outputs; run ends`, n, viol: sv });
    return out;
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
    if (P.ALARM) {
      if (P.FIX_ARM_BY_WRITE && n.A.includes(i)) lab = L && lab + ' re-arms the live alarm by writing its token,';
      else { const killed = killAlarmsOf(n, i, P); n.A.push(i); lab = L && lab + (killed ? ` kills the alarm${P.KILL_WAKES ? ' (its exit is a wake to coord' + i + ')' : ''} and starts a new one,` : ' starts the alarm,'); }
    }
    n.ack = P.ACK_READ ? c.rd : n.seq; n.to = 0;
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
  const go = (s, labs, fault, viol, ranAny, prevF) => {
    const c = s.C[i];
    if (!c.pc) { res.push({ lab: L && labs.join(' | '), n: s, fault, viol }); return; }
    const o = c.pc[0];
    if (ranAny && (o[0] === OP.F || o[0] === OP.E || prevF)) { res.push({ lab: L && labs.join(' | '), n: s, fault, viol }); return; }
    if (has(s, 'x')) { const n = clone(s); spend(n, 'x'); n.C[i].pc = null; res.push({ lab: L && [...labs, `FAULT coord${i}'s turn dies before ${opName(o)}`].join(' | '), n, fault: true, viol }); }
    for (const r of runOp(s, i, P, L)) go(r.n, [...labs, r.lab], fault || !!r.fault, [...viol, ...r.viol], true, o[0] === OP.F);
  };
  go(st0, labs0, false, [], fromPlan, false);
  return res;
}

// ---------------------------------------------------------------- the watcher
// what status.mjs would put on the coordinator's list, apart from READY and ledger events
function actionable(n, P) {
  const c = n.C[n.ce]; if (!c) return false;
  if (n.T.every((t) => term(t.st))) return !n.syn;
  if (c.dr && readyToHandOver(n, P)) return true;
  if (n.E.some((e) => e.seq > n.ack)) return true; // ledger events after acked_seq (coord.json)
  const slots = admitCount(n, P) < P.NMAX;
  for (const t of n.T) {
    if (t.st === ST.P && !c.dr && slots) return true;
    if (t.st !== ST.A) continue;
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
  const evs = []; const viol = []; const notes = [];
  for (let f = 0; f < n.T.length; f++) {
    const t = n.T[f];
    if (t.st !== ST.A || t.step !== STEP.RUN) continue;
    const s = cur(n, f);
    if (s && s.p === 2) { evs.push({ f, ep: t.ep, cls: 0, ready: 1 }); continue; } // R4: exits within delta; R5: READY voids suspicion
    if (!s) continue;
    if (t.wep !== t.ep) { t.wep = t.ep; t.cs = 0; t.hs = 0; t.rep = 0; }
    if (s.mv) { t.cs = 0; t.hs = 0; }
    else if (s.nc > 0) { if (P.PROGRESS) t.cs = Math.min(P.C_STALL, t.cs + s.nc); t.hs = 0; }
    else if (!(P.FIX_PAUSE_DISCOUNT && s.pu)) t.hs = Math.min(P.H_HANG, t.hs + 1);
    let cls = 0;
    if (s.sig >= P.LOOP) cls = RSN.LOOP; else if (P.PROGRESS && t.cs >= P.C_STALL) cls = RSN.STALL; else if (t.hs >= P.H_HANG) cls = RSN.HANG;
    if (L && !cls && (t.hs || t.cs)) notes.push(`f${f}: hang=${t.hs} stall=${t.cs}`);
    if (cls && !t.rep) { t.rep = 1; evs.push({ f, ep: t.ep, cls }); if (s.m === MODE.OK) viol.push('NoFalseSuspicion'); }
  }
  for (const s of n.S) { s.mv = 0; s.nc = 0; s.pu = 0; }
  const gap = w.gap; w.gap = 0;
  if (P.FIX_WATCHER_ACTIONABLE && actionable(n, P)) evs.push({ f: 0, ep: 0, cls: 0, ready: 1, open: 1 });
  if (evs.length) {
    for (const e of evs) if (!e.ready) { n.seq++; n.E.push({ f: e.f, ep: e.ep, cls: e.cls, seq: n.seq }); }
    n.W.splice(j, 1); wake(n, par);
    const urgent = evs.some((e) => !e.ready);
    return { lab: L && `watcher(coord${par}) tick${gap ? ' after a pause' : ''}: ${evs.map((e) => (e.open ? 'status shows an act due (unacked ledger events, a row mid step machine, a hand-over or synthesis)' : e.ready ? `READY f${e.f}e${e.ep}` : `${RNAME[e.cls]} f${e.f}e${e.ep} -> ledger`)).join(', ')}; exits ${urgent ? 20 : 10}, which wakes coord${par}`, n, viol };
  }
  return { lab: L && `watcher(coord${par}) tick: no event${notes.length ? ` (${notes.join('; ')})` : ''}`, n, viol };
}

// ---------------------------------------------------------------- successors
// proc ids for fairness: coordinator i -> i (0..3), watcher 4, alarm 5, owner 6, child (f,ep) 7 + f*6 + min(ep,5)
export const PROC = { W: 4, A: 5, O: 6 };
const childProc = (s) => 7 + s.f * 6 + Math.min(s.ep, 5);

export function successors(st, P, L) {
  const out = [];
  if (st.syn) return out;
  // u: untimed (coordinator steps and immediate lock races), ow: owner wake, pl: planned optional event
  const push = (lab, n, o) => out.push({ lab, s: n, fault: !!o.fault, viol: o.viol || [], proc: o.proc, u: !!o.u, ow: !!o.ow, pl: !!o.pl });
  // children
  st.S.forEach((s, q) => {
    if (!s.al || s.p >= 2) return;
    const t = st.T[s.f];
    const proc = childProc(s);
    const stale = s.ep < t.ep;
    if (s.m === MODE.OK) {
      const n = clone(st); const y = n.S[q];
      y.p++; y.mv = 1; y.pu = 0; y.nc = 0; y.sig = 0;
      if (stale) y.pf = 1;
      if (y.p === 2) wake(n, y.par);
      push(L && `child f${y.f}e${y.ep}${y.z ? ' (zombie)' : ''} ${y.p === 2 ? `writes READY, its turn-end note wakes coord${y.par}` : 'journals a card (V falls)'}${stale ? ' AFTER its fence' : ''}`, n, { proc });
    } else if (s.m === MODE.STUCK) {
      const n = clone(st); n.S[q].m = MODE.OK;
      push(L && `child f${s.f}e${s.ep} returns from its slow call (transient stall)`, n, { proc: 31 }); // environment, not weakly fair
    } else if (s.m === MODE.LOOPV && s.nc < P.C_STALL) {
      const n = clone(st); n.S[q].nc++;
      push(L && `child f${s.f}e${s.ep} makes a call with no fall in V`, n, { proc });
    } else if (s.m === MODE.LOOPS && s.sig < P.LOOP) {
      const n = clone(st); n.S[q].sig++; n.S[q].nc = Math.min(P.C_STALL, n.S[q].nc + 1);
      push(L && `child f${s.f}e${s.ep} repeats the same call (${n.S[q].sig})`, n, { proc });
    }
    if (s.m === MODE.OK && !stale && !s.z) {
      for (const m of [MODE.STUCK, MODE.LOOPV, MODE.DEAD]) { // a same-signature loop is caught earlier by the same class-free rule (R8: any class); folded into LOOPV
        if (!has(st, MKIND[m])) continue;
        const n = clone(st); spend(n, MKIND[m]); const y = n.S[q]; y.m = m;
        if (m === MODE.DEAD) { y.al = 0; wake(n, y.par); }
        push(L && `FAULT child f${y.f}e${y.ep} ${MNAME[m]}${m === MODE.DEAD ? `; its turn-end note wakes coord${y.par}` : ''}`, n, { fault: true, proc });
      }
    }
  });
  // owner: ends an escalated zombie; starts the fresh coordinator after a hand-over; wakes the tree (recovery only)
  st.S.forEach((s, q) => { if (s.al && s.z && s.p < 2) { const n = clone(st); n.S[q].al = 0; push(L && `owner ends zombie f${s.f}e${s.ep} (Z escalation)`, n, { proc: PROC.O }); } });
  if (st.C.length <= st.ce) { const n = clone(st); n.C.push({ ce: n.ce, wk: 1, boot: 1, dr: 0, rd: 0, pc: null }); push(L && `owner starts the fresh coordinator coord${n.ce}`, n, { proc: PROC.O }); }
  {
    const i = st.ce; const c = st.C[i];
    if (c && c.pc === null && !c.wk && !st.W.some((w) => w.par === i) && !st.A.includes(i)) { const n = clone(st); n.C[i].wk = 1; push(L && `owner wakes coord${i} (no wake source of this ce is alive)`, n, { proc: PROC.O, ow: true }); }
  }
  // watchers
  st.W.forEach((w, j) => {
    if (tickEnabled(st, w)) { const r = tick(st, j, P, L); push(r.lab, r.n, { proc: PROC.W, viol: r.viol }); }
  });
  // alarms
  st.A.forEach((a, j) => { if (st.C[a].pc !== null) return; /* timing: the alarm period is longer than any turn */ const n = clone(st); n.A.splice(j, 1); wake(n, a); push(L && `alarm(coord${a}) fires after a long silence, which wakes coord${a}`, n, { proc: PROC.A }); });
  // coordinators
  st.C.forEach((c, i) => {
    if (c.pc === null) {
      if (!c.wk) return;
      const n0 = clone(st); const cc = n0.C[i]; cc.wk = 0; cc.boot = 0;
      const current = cc.ce >= n0.ce;
      if (current || !P.FENCE_CE) { reconcile(n0, P); cc.rd = n0.seq;  if (P.FIX_ARM_AT_START && P.ALARM && !n0.A.includes(i)) n0.A.push(i); }
      for (const ops of plans(n0, i, P)) {
        const n = clone(n0); n.C[i].pc = ops.length ? ops.map((o) => o.slice()) : null;
        for (const r of macro(n, i, P, L, [L && `coord${i} wakes, status --reconcile, plan: ${ops.length ? ops.map(opName).join(' > ') : '(stale ce: end turn)'}`], true)) push(r.lab, r.n, { proc: i, u: true, fault: r.fault, viol: r.viol });
      }
      if (!c.boot && has(st, 'l')) { const n = clone(st); spend(n, 'l'); n.C[i].wk--; push(L && `FAULT a wake to coord${i} is lost`, n, { fault: true, proc: i }); }
    } else {
      for (const r of macro(st, i, P, L, [], false)) push(r.lab, r.n, { proc: i, u: true, fault: r.fault, viol: r.viol });
    }
  });
  // system faults
  if (has(st, 'p')) {
    const n = clone(st); spend(n, 'p');
    for (const s of n.S) if (s.al && s.p < 2) s.pu = 1;
    if (!P.WATCHER_LOCK) for (const w of n.W) w.gap = 1;
    push(L && 'FAULT the PC sleeps and resumes (every process frozen together)', n, { fault: true, proc: 30 });
  }
  if (has(st, 'r')) {
    const n = clone(st); spend(n, 'r');
    for (const s of n.S) { if (s.al) { s.al = 0; s.z = 0; } s.hb = 1; }
    if (n.W.some((w) => w.lk)) n.ws = 1;
    n.W = []; n.A = [];
    for (const c of n.C) { c.pc = null; c.wk = 0; c.boot = 0; }
    push(L && 'FAULT host reset: every process dies; locks are left behind', n, { fault: true, proc: 30 });
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
  return v;
}
// owner wake is part of the design only after two wake losses (R6) or a host reset
export function ownerLegit(n, P) {
  const lost = (P.BUD.l - n.B.l) + (P.BUD.x - n.B.x);
  return lost >= 2 || n.B.r < P.BUD.r;
}
