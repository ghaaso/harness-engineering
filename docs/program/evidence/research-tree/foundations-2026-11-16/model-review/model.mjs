// Explicit-state model of "Layer 1: Execution (version 2)". Plain Node, no packages.
// One task per field. Time is abstracted into watcher ticks: a healthy current child is
// assumed to make progress within T_box, so a watcher tick waits until every healthy current
// child has moved since the last tick (timeliness), except right after a pause (timers fire
// at once) and at a new watcher's first evaluation (E7: "its first act").
// Faults are budgeted actions that may happen at any point (k = total, then per kind).

export function makeParams(over = {}) {
  const base = {
    FIELDS: 2, R: 2, NMAX: 3, HMAX: 1, HO_TASK_MAX: 1,
    BUDGET: { k: 2, c: 2, z: 1, p: 1, l: 1, t: 1, h: 1 }, // total faults; child faults, zombies, pauses, lost wakes, torn writes; h = planned task hand-overs in the run (not a fault)
    // mechanisms of the spec (ablations switch one off)
    FENCE_EPOCH: true,   // E3 check 1: attempt epoch == table epoch
    FENCE_CE: true,      // E3 last paragraph: every exec script refuses a stale --ce (exit 64)
    COMMIT_RECORD: true, // E4: COMMIT created with wx; consumers read only COMMIT-named attempts
    PROGRESS: true,      // E6: suspicion by progress (variant V); false = by liveness (transcript growth) only
    PAUSE_DET: true,     // E6: pause rule (gap > 2Δ+30 s moves deadlines, suspects nobody)
    LEVEL: true,         // E7: level-triggered re-check; false = act only on what the wake carries
    RESTART_LIMIT: true, // E9: R and "the same class twice"
    PLANNED_HO: true,    // E8: planned hand-over at W* (does not count toward R), capped per task
    ASYNC_PRIORITY: true,// spec silent: a READY and a stall event for one epoch -> either may be acted on
    // smallest fixes found by this model (all off = the spec as written)
    FIX_REWAKE: false,        // a supervisor outside the session re-wakes the coordinator when no watcher of the current ce is alive
    FIX_CLOCK: false,         // stall clocks count only watched, non-paused time (persisted), never raw wall clock since last progress
    FIX_RESTORE_CUT: false,   // restore-check reads only journal lines written before the fence
    FIX_ONE_WATCHER: false,   // endturn kills a live-but-stale watcher of its ce before starting another
    FIX_STOP_ON_FAIL: false,  // the escalation path fences and stops the failed attempt
    FIX_COUNT_LIVE: false,    // admission counts live child processes (stop-unconfirmed zombies included), not table rows
  };
  return { ...base, ...over, BUDGET: { ...base.BUDGET, ...(over.BUDGET || {}) } };
}
export const FIXES = { FIX_REWAKE: true, FIX_CLOCK: true, FIX_RESTORE_CUT: true, FIX_ONE_WATCHER: true, FIX_STOP_ON_FAIL: true, FIX_COUNT_LIVE: true };

const CLS_BIT = { stall: 1, loop: 2 };
const clone = (x) => ({
  ce: x.ce, ho: x.ho, pz: x.pz, syn: x.syn,
  T: x.T.map((t) => ({ ...t })),
  E: x.E.map((e) => (e ? { ...e } : null)),
  S: x.S.map((y) => ({ ...y })),
  W: x.W.map((w) => ({ ...w })),
  C: x.C.map((c) => ({ ce: c.ce, wk: Array.isArray(c.wk) ? [...c.wk] : c.wk, pc: c.pc ? { ops: c.pc.ops, i: c.pc.i, sub: c.pc.sub } : null, boot: c.boot, dr: c.dr })),
  B: { ...x.B }, EM: [...x.EM],
});
export const cur = (n, f) => n.S.find((s) => s.f === f && s.ep === n.T[f].ep);
export const term = (st) => st === 'C' || st === 'F';
export const popcount = (x) => { let c = 0; while (x) { c += x & 1; x >>= 1; } return c; };
const live = (n) => n.S.filter((s) => s.al && s.p < 2).length;

function mkSession(f, ep, par, ct) {
  // m: ok | st stalled | ls loop (same call x3) | lv loop (varied calls, no progress) | dd crashed
  // p: 0 started, 1 journaled a card, 2 READY. mv: progressed since last tick. z: stop unconfirmed.
  // al: process alive. pf: wrote after its fence. ct: its checkpoint carried post-fence cards.
  // h: its READY was handled by commit.mjs. sq: ever suspected. pu: a pause no watcher recorded.
  return { f, ep, m: 'ok', p: 0, mv: 0, z: 0, al: 1, par, pf: 0, ct, h: 0, sq: 0, pu: 0 };
}

export function initial(P) {
  const T = [], E = [];
  for (let f = 0; f < P.FIELDS; f++) { T.push({ st: 'P', ep: 0, rs: 0, fc: 0, hv: 0, cm: -1, mg: 0 }); E.push(null); }
  // st: P planned, S stopping/admitting (inside replace), R running/ready, C committed, F failed (escalated)
  return { ce: 0, ho: 0, pz: 0, syn: 0, T, E, S: [], W: [], C: [{ ce: 0, wk: P.LEVEL ? 1 : ['start'], pc: null, boot: 1, dr: 0 }], B: { ...P.BUDGET }, EM: [] };
}

export function canon(s) {
  s.S = s.S.filter((x) => {
    const t = s.T[x.f];
    return x.al || x.ep === t.ep || t.st === 'S' || (x.p === 2 && !x.h);
  });
  s.S.sort((a, b) => a.f - b.f || a.ep - b.ep);
  s.W.sort((a, b) => a.ce - b.ce || a.gap - b.gap || a.first - b.first);
  s.EM.sort();
  return JSON.stringify(s);
}

const hasWake = (c, P) => (P.LEVEL ? c.wk === 1 : c.wk.length > 0);
function addWake(n, idx, item, P) {
  const c = n.C[idx];
  if (!c) return;
  if (P.LEVEL) c.wk = 1;
  else if (!c.wk.includes(item)) { c.wk.push(item); c.wk.sort(); }
}
function loseGap(n) {
  if (n.W.some((w) => w.gap)) return;
  for (const s of n.S) if (s.al && s.p < 2) s.pu = 1;
}

function tick(st, j, P) {
  const n = clone(st);
  const w = n.W[j];
  if (w.ce < n.ce) {
    n.W.splice(j, 1);
    if (w.gap) loseGap(n);
    addWake(n, w.ce, 'X31', P);
    return [`watcher(ce${w.ce}) tick: coord.json shows ce=${n.ce} -> exits 31, which wakes coord${w.ce}`, n, { tick: true }];
  }
  const det = w.gap && P.PAUSE_DET;
  const gapNoDet = w.gap && !P.PAUSE_DET;
  const evs = []; const viol = [];
  for (let f = 0; f < n.T.length; f++) {
    const t = n.T[f];
    if (t.st !== 'R') continue;
    const s = cur(n, f);
    if (!s) continue;
    if (s.p === 2) { evs.push({ f, ep: s.ep, k: 'R', code: 10 }); continue; }
    if (det) continue;
    let c = null;
    if (s.m === 'st' || s.m === 'dd') c = 'stall';
    else if (s.m === 'ls') c = 'loop';
    else if (s.m === 'lv') c = P.PROGRESS ? 'stall' : null;
    else if (s.m === 'ok' && s.pu && !P.FIX_CLOCK) c = 'stall';
    if (gapNoDet && !c) c = 'stall';
    if (c) {
      if (s.m === 'ok') viol.push('NoFalseSuspicion');
      s.sq = 1;
      evs.push({ f, ep: s.ep, k: 'S', c, code: c === 'loop' ? 21 : 20 });
      if (P.LEVEL) n.E[f] = { ep: s.ep, c };
    }
  }
  for (const s of n.S) if (s.ep < n.T[s.f].ep && s.p === 2 && !s.h) evs.push({ f: s.f, ep: s.ep, k: 'R', code: 10 });
  let fresh = evs;
  if (!P.LEVEL) {
    fresh = evs.filter((e) => !n.EM.includes(`${e.f}:${e.ep}:${e.k}`));
    for (const e of fresh) n.EM.push(`${e.f}:${e.ep}:${e.k}`);
  }
  for (const s of n.S) { s.pu = 0; s.mv = 0; }
  const wasGap = w.gap;
  w.first = 0; w.gap = 0;
  const desc = evs.map((e) => (e.k === 'R' ? `ready f${e.f}e${e.ep}` : `${e.c} f${e.f}e${e.ep}`)).join(', ');
  const gapTxt = wasGap ? (det ? ' (pause gap detected: deadlines moved, nobody suspected)' : ' after a pause gap (no pause detection)') : '';
  if (fresh.length) {
    n.W.splice(j, 1);
    const top = Math.max(...fresh.map((e) => e.code));
    if (P.LEVEL) addWake(n, w.ce, '', P);
    else for (const e of fresh.filter((x) => x.code === top)) addWake(n, w.ce, e.k === 'R' ? `R:${e.f}:${e.ep}` : `S:${e.f}:${e.ep}:${e.c}`, P);
    return [`watcher(ce${w.ce}) tick${gapTxt}: events [${desc}] -> exits ${top}, which wakes coord${w.ce}`, n, { tick: true, viol }];
  }
  return [`watcher(ce${w.ce}) tick${gapTxt}: ${desc ? `events [${desc}] already reported` : 'no event'}`, n, { tick: true, viol }];
}

function planFor(st, i, P) {
  const c = st.C[i];
  const res = [];
  const quiescent = st.T.every((t) => t.st !== 'R' && t.st !== 'S');
  const name = (o) => (o[0] === 'rep' ? `replace(f${o[1]},${o[2]})` : o[0] === 'com' ? `commit(f${o[1]}e${o[2]})` : o[0] === 'adm' ? `admit(f${o[1]})` : o[0] === 'end' ? 'endturn' : o[0] === 'drain' ? 'stop-admitting(W*_coord)' : 'handover');
  // E12: at W*_coord the coordinator stops admitting, waits for a quiet moment, then hands over
  if (c.dr && quiescent) return [['handover', [['ho']]]];
  for (const drain of c.dr ? [true] : P.HMAX > st.ho && c.ce === st.ce ? [false, true] : [false]) {
    const pre = drain && !c.dr ? [['drain']] : [];
    if (drain && !c.dr && quiescent) { res.push([[...pre, ['ho']].map(name).join(' > '), [...pre, ['ho']]]); continue; }
    for (const a of buildAlts(st, i, P, drain)) res.push([[...pre, ...a].map(name).join(' > '), [...pre, ...a]]);
  }
  return res;
}

function buildAlts(st, i, P, drain) {
  const c = st.C[i];
  let alts = [[]];
  const addAll = (ops) => { alts = alts.map((a) => a.concat(ops)); };
  const fork = (o1, o2) => { alts = alts.flatMap((a) => [a.concat(o1), a.concat(o2)]); };
  for (let f = 0; f < st.T.length; f++) {
    const t = st.T[f];
    const s = cur(st, f);
    if (P.LEVEL) {
      if (t.st === 'R') {
        const ready = s && s.p === 2 && t.cm < 0;
        const ev = st.E[f] && st.E[f].ep === t.ep ? st.E[f] : null;
        if (ready && ev) { if (P.ASYNC_PRIORITY) fork([['com', f, t.ep]], [['rep', f, ev.c, t.ep]]); else addAll([['com', f, t.ep]]); }
        else if (ready) addAll([['com', f, t.ep]]);
        else if (ev) addAll([['rep', f, ev.c, t.ep]]);
        else if (P.PLANNED_HO && st.B.h > 0 && st.B.k > 0 && s && s.al && s.m === 'ok' && s.p === 1 && t.hv < P.HO_TASK_MAX) { if (!drain) fork([], [['rep', f, 'handover', t.ep]]); }
      }
      for (const z of st.S) if (z.f === f && z.ep < t.ep && z.p === 2 && !z.h) addAll([['com', f, z.ep]]);
    } else {
      for (const item of c.wk) {
        const [k, ff, ep, cls] = item.split(':');
        if ((k !== 'R' && k !== 'S') || +ff !== f) continue;
        if (k === 'R') addAll([['com', f, +ep]]);
        if (k === 'S') addAll([['rep', f, cls, +ep]]);
      }
      if (t.st === 'R' && P.PLANNED_HO && st.B.h > 0 && st.B.k > 0 && s && s.al && s.m === 'ok' && s.p === 1 && t.hv < P.HO_TASK_MAX) { if (!drain) fork([], [['rep', f, 'handover', t.ep]]); }
    }
    if (t.st === 'S' && !s) addAll([['adm', f]]); // admission was refused earlier: admit.mjs decides from the table
  }
  const pf = st.T.findIndex((t) => t.st === 'P');
  if (pf >= 0 && !drain) addAll([['rep', pf, 'first', 0]]);
  addAll([['end']]);
  return alts;
}

function advance(n, i) {
  const pc = n.C[i].pc;
  pc.i++; pc.sub = 0;
  if (pc.i >= pc.ops.length) n.C[i].pc = null;
}

// E10: stop every older live attempt of f; each stop may fail to take effect (zombie fault)
function stopVariants(n0, f) {
  let vs = [{ n: n0, lab: '', fault: false }];
  const t = n0.T[f];
  const victims = n0.S.map((s, k) => k).filter((k) => { const s = n0.S[k]; return s.f === f && s.ep < t.ep && s.al && !s.z; });
  for (const k of victims) {
    const nv = [];
    for (const v of vs) {
      const s = v.n.S[k];
      if (s.p === 2) { const a = clone(v.n); a.S[k].al = 0; nv.push({ n: a, lab: v.lab, fault: v.fault }); continue; }
      const a = clone(v.n); a.S[k].al = 0; nv.push({ n: a, lab: v.lab + ` stop f${f}e${s.ep} confirmed;`, fault: v.fault });
      if (v.n.B.z > 0 && v.n.B.k > 0) { const b = clone(v.n); b.B.z--; b.B.k--; b.S[k].z = 1; nv.push({ n: b, lab: v.lab + ` FAULT stop of f${f}e${s.ep} unconfirmed (zombie keeps running);`, fault: true }); }
    }
    vs = nv;
  }
  return vs;
}

// E8 steps 4-9: restore-check, todo, admit, start, bind
function startAttempt(n, f, i, P) {
  const t = n.T[f];
  const prev = n.S.find((s) => s.f === f && s.ep === t.ep - 1);
  const ct = !P.FIX_RESTORE_CUT && prev && (prev.pf || prev.ct) ? 1 : 0;
  const running = P.FIX_COUNT_LIVE ? live(n) : n.T.filter((x) => x.st === 'R').length;
  if (running >= P.NMAX) return [false, ' admit refused (exit 2), task waits'];
  n.S.push(mkSession(f, t.ep, i, ct));
  t.st = 'R';
  return [true, ` restore-check${ct ? ' (checkpoint includes cards written AFTER the fence)' : ''}, admit, start session f${f}e${t.ep}, bind`];
}

function step(st, i, P) {
  const out = [];
  const c = st.C[i];
  const op = c.pc.ops[c.pc.i];
  const stale = c.ce < st.ce;
  const who = `coord${i}`;
  if (stale && P.FENCE_CE) {
    const n = clone(st); n.C[i].pc = null;
    out.push([`${who} runs ${op[0]}: exec script refuses (exit 64, stale coordinator epoch); turn ends`, n, {}]);
    return out;
  }
  const actViol = stale ? ['TwoCoordinatorsAct'] : [];
  if (op[0] === 'end') {
    const n = clone(st); const mine = n.C[i].ce;
    const ok = n.W.some((w) => w.ce === mine && !w.gap);
    let lab = `${who} endturn.mjs: `;
    if (!ok) {
      const staleW = n.W.some((w) => w.ce === mine);
      if (P.FIX_ONE_WATCHER) n.W = n.W.filter((w) => w.ce !== mine);
      n.W.push({ ce: mine, gap: 0, first: 1 });
      lab += staleW ? (P.FIX_ONE_WATCHER ? 'watcher tick stale -> kills it, starts a new watch.mjs' : 'watcher tick is stale -> starts ANOTHER watch.mjs (the first is still alive)') : 'no live watcher -> starts watch.mjs';
    } else lab += 'live watcher present';
    n.C[i].pc = null;
    out.push([lab, n, { viol: actViol }]);
    return out;
  }
  if (op[0] === 'ho') {
    const n = clone(st);
    n.ce++; n.ho++; n.C[i].pc = null; n.C[i].dr = 0;
    out.push([`${who} handover.mjs: coord.json ce -> ${n.ce}; its watcher is left running`, n, { viol: actViol }]);
    return out;
  }
  if (op[0] === 'drain') {
    const n = clone(st); n.C[i].dr = 1; advance(n, i);
    out.push([`${who} reaches W*_coord: stops admitting`, n, { viol: actViol }]);
    return out;
  }
  if (op[0] === 'adm') {
    const n = clone(st); const f = op[1]; const t = n.T[f];
    if (t.st !== 'S' || cur(n, f)) { advance(n, i); out.push([`${who} admit(f${f}) skipped`, n, {}]); return out; }
    const [, lab] = startAttempt(n, f, i, P); advance(n, i);
    out.push([`${who} admit f${f}:${lab}`, n, { viol: actViol }]);
    return out;
  }
  if (op[0] === 'rep') {
    const [, f, cls, oep] = op;
    if (c.pc.sub === 0) {
      const n = clone(st); const t = n.T[f];
      if (cls === 'first') {
        if (t.st !== 'P') { advance(n, i); out.push([`${who} replace(f${f},first) skipped`, n, {}]); return out; }
        t.ep++; t.st = 'S'; n.C[i].pc.sub = 1;
        out.push([`${who} replace.mjs f${f} (first): intent, epoch -> e${t.ep}`, n, { viol: actViol }]);
        return out;
      }
      if (t.st !== 'R' || t.ep !== oep) { advance(n, i); out.push([`${who} replace(f${f},${cls}) skipped: e${oep} is no longer current`, n, {}]); return out; }
      if (cls === 'handover') {
        t.ep++; t.hv++; n.B.h--; n.B.k--; t.st = 'S'; n.C[i].pc.sub = 1;
        out.push([`${who} replace.mjs f${f} (planned hand-over at W*): intent, FENCE epoch -> e${t.ep} (not counted toward R)`, n, { viol: actViol }]);
        return out;
      }
      if (P.LEVEL) n.E[f] = null;
      if (P.RESTART_LIMIT && (t.rs >= P.R || (t.fc & CLS_BIT[cls]))) {
        t.st = 'F';
        if (!P.FIX_STOP_ON_FAIL) {
          advance(n, i);
          out.push([`${who} replace.mjs f${f} (${cls}): exit 1 restart limit (restarts=${t.rs}, same class=${!!(t.fc & CLS_BIT[cls])}) -> task FAILED, escalated; the attempt is not stopped`, n, { viol: actViol }]);
          return out;
        }
        t.ep++;
        for (const v of stopVariants(n, f)) { advance(v.n, i); out.push([`${who} replace.mjs f${f} (${cls}): restart limit -> fence e${t.ep},${v.lab} task FAILED, escalated`, v.n, { fault: v.fault, viol: actViol }]); }
        return out;
      }
      t.ep++; t.rs++; t.fc |= CLS_BIT[cls]; t.st = 'S'; n.C[i].pc.sub = 1;
      out.push([`${who} replace.mjs f${f} (${cls}): intent, FENCE epoch -> e${t.ep}, restarts=${t.rs}`, n, { viol: actViol }]);
      return out;
    }
    for (const v of stopVariants(clone(st), f)) {
      const [, lab] = startAttempt(v.n, f, i, P);
      advance(v.n, i);
      out.push([`${who} replace f${f}:${v.lab}${lab}`, v.n, { fault: v.fault, viol: actViol }]);
    }
    return out;
  }
  if (op[0] === 'com') {
    const [, f, ep] = op;
    const n = clone(st); const t = n.T[f];
    const s = n.S.find((x) => x.f === f && x.ep === ep);
    if (c.pc.sub === 0) {
      if (!s || s.p !== 2) { advance(n, i); out.push([`${who} commit(f${f}e${ep}): no READY, nothing to do`, n, {}]); return out; }
      if (P.FENCE_EPOCH && ep !== t.ep) { s.h = 1; advance(n, i); out.push([`${who} commit.mjs f${f}e${ep}: exit 10 stale epoch (table e${t.ep}), zombie-write logged`, n, {}]); return out; }
      if (t.cm >= 0 || t.st === 'C') { s.h = 1; advance(n, i); out.push([`${who} commit.mjs f${f}e${ep}: ${t.cm === ep ? 'already committed identically (exit 0)' : 'exit 13, COMMIT names another attempt'}`, n, {}]); return out; }
      if (t.st !== 'R') { s.h = 1; advance(n, i); out.push([`${who} commit.mjs f${f}e${ep}: refused, task state ${t.st}`, n, {}]); return out; }
      t.mg |= 1 << ep;
      const viol = [...actViol];
      if (!P.COMMIT_RECORD && (ep !== t.ep || s.ct)) viol.push('NoStaleAccepted');
      const a = clone(n); a.C[i].pc.sub = 1;
      out.push([`${who} commit.mjs f${f}e${ep}: checks pass, merge branch${P.COMMIT_RECORD ? '' : ' (the merge is the commit)'}`, a, { viol }]);
      if (n.B.t > 0 && n.B.k > 0) { const b = clone(n); b.B.t--; b.B.k--; advance(b, i); out.push([`${who} commit.mjs f${f}e${ep}: merge, then FAULT torn write (crash before ${P.COMMIT_RECORD ? 'COMMIT' : 'the table update'})`, b, { fault: true, viol }]); }
      return out;
    }
    const viol = [...actViol];
    if (P.COMMIT_RECORD) {
      if (t.cm < 0) { t.cm = ep; t.st = 'C'; if (ep !== t.ep || (s && s.ct)) viol.push('NoStaleAccepted'); }
    } else { t.st = 'C'; t.cm = ep; }
    if (s) s.h = 1;
    advance(n, i);
    out.push([`${who} commit.mjs f${f}e${ep}: ${P.COMMIT_RECORD ? 'COMMIT created (wx)' : 'table marked committed'}`, n, { viol }]);
    return out;
  }
  throw new Error('bad op ' + op);
}

// A coordinator turn runs atomically (scripts are sequential inside one session), except that
// other processes may interleave in the window between a replace's fence (E8 step 2) and its
// stop (step 3): that window is where a still-running attempt can write after its fence.
function macro(st0, i, P, lab0) {
  const res = [];
  const go = (s, labs, fault, viol, fresh) => {
    const c = s.C[i];
    if (!c.pc) { res.push([labs.join(' | '), s, { fault, viol }]); return; }
    const op = c.pc.ops[c.pc.i];
    if (!fresh && op[0] === 'rep' && c.pc.sub === 1 && op[2] !== 'first') { res.push([labs.join(' | '), s, { fault, viol }]); return; }
    for (const [lab, n, o] of step(s, i, P)) go(n, [...labs, lab], fault || !!o.fault, [...viol, ...(o.viol || [])], false);
  };
  go(st0, lab0 ? [lab0] : [], false, [], !lab0);
  return res;
}

export function successors(st, P) {
  const out = [];
  const push = (lab, n, o = {}) => out.push({ lab, s: n, fault: !!o.fault, viol: o.viol || [], tick: !!o.tick });
  if (st.pz) { const n = clone(st); n.pz = 0; push('system resumes from the pause (all processes together; timers fire)', n); return out; }
  if (st.B.p > 0 && st.B.k > 0) {
    const n = clone(st); n.B.p--; n.B.k--; n.pz = 1;
    if (n.W.length) for (const w of n.W) w.gap = 1;
    else for (const s of n.S) if (s.al && s.p < 2) s.pu = 1;
    push(n.W.length ? 'FAULT system pauses (a watcher is alive)' : 'FAULT system pauses while NO watcher is running', n, { fault: true });
  }
  st.S.forEach((s, k) => {
    if (s.al && s.z) { const n = clone(st); n.S[k].al = 0; addWake(n, n.ce, 'X25', P); push(`zombie f${s.f}e${s.ep} passes Z: watcher exits 25, owner ends it`, n); }
    if (!s.al || s.m !== 'ok' || s.p >= 2) return;
    {
      const n = clone(st); const x = n.S[k];
      x.p++; x.mv = 1; x.pu = 0;
      let lab = `child f${x.f}e${x.ep}${x.z ? ' (zombie)' : ''} ` + (x.p === 2 ? `writes READY, turn-end note to coord${x.par}` : 'journals a card (progress)');
      if (x.ep < n.T[x.f].ep) { x.pf = 1; lab += ' AFTER its fence'; }
      if (x.p === 2) addWake(n, x.par, `R:${x.f}:${x.ep}`, P);
      push(lab, n);
    }
    if (st.B.c > 0 && st.B.k > 0 && s.ep === st.T[s.f].ep && !s.z) {
      for (const m of ['st', 'ls', 'lv', 'dd']) {
        const n = clone(st); n.B.c--; n.B.k--; const x = n.S[k]; x.m = m; if (m === 'dd') x.al = 0;
        push(`FAULT child f${x.f}e${x.ep} ${{ st: 'stalls', ls: 'loops (same call x3)', lv: 'loops (varied calls, no progress)', dd: 'crashes' }[m]}`, n, { fault: true });
      }
    }
  });
  st.W.forEach((w, j) => {
    const gating = w.gap || w.first || st.S.every((s) => !(s.al && s.m === 'ok' && s.p < 2 && s.ep === st.T[s.f].ep && st.T[s.f].st === 'R') || s.mv);
    if (gating) { const [lab, n, o] = tick(st, j, P); push(lab, n, o); }
    const n = clone(st); const ww = n.W[j]; n.W.splice(j, 1);
    if (ww.gap) loseGap(n);
    addWake(n, ww.ce, 'X30', P);
    push(`watcher(ce${ww.ce}) exits 30 at its own deadline${ww.gap ? ' BEFORE recording the pause gap' : ''}, which wakes coord${ww.ce}`, n);
  });
  st.C.forEach((c, i) => {
    if (c.pc === null) {
      if (!hasWake(c, P)) return;
      for (const [desc, ops] of planFor(st, i, P)) {
        const n = clone(st); const cc = n.C[i];
        cc.wk = P.LEVEL ? 0 : []; cc.pc = { ops, i: 0, sub: 0 }; cc.boot = 0;
        for (const [lab, m, o] of macro(n, i, P, `coord${i} wakes, runs status, plan: ${desc}`)) push(lab, m, o);
      }
      if (!c.boot && st.B.l > 0 && st.B.k > 0) {
        const n = clone(st); n.B.l--; n.B.k--; n.C[i].wk = P.LEVEL ? 0 : [];
        push(`FAULT wake to coord${i} is lost`, n, { fault: true });
      }
    } else {
      for (const [lab, n, o] of macro(st, i, P, null)) push(lab, n, o);
    }
  });
  if (P.FIX_REWAKE) {
    const c = st.C[st.ce];
    if (c && c.pc === null && !hasWake(c, P) && !st.W.some((w) => w.ce === st.ce)) {
      const n = clone(st); addWake(n, st.ce, 'X', P);
      push(`supervisor outside the session: no watcher of ce${st.ce} alive -> re-wakes coord${st.ce}`, n);
    }
  }
  if (st.ho > 0 && st.C.length <= st.ce) {
    const n = clone(st); n.C.push({ ce: n.ce, wk: P.LEVEL ? 1 : ['start'], pc: null, boot: 1, dr: 0 });
    push(`owner starts a fresh coordinator coord${n.ce} (ce=${n.ce})`, n);
  }
  if (!st.syn && st.T.every((t) => term(t.st))) {
    const n = clone(st); n.syn = 1;
    push('synthesis reads the committed outputs', n);
  }
  return out;
}

export function invariants(st, P) {
  const v = [];
  const l = live(st);
  if (l > P.NMAX) v.push('Slots');
  if (l > 2) v.push('SlotsAtSpecInterimCap2');
  if (st.T.some((t) => t.rs > P.R)) v.push('RestartLimit');
  if (st.T.some((t) => (P.COMMIT_RECORD ? (t.cm >= 0 ? 1 : 0) : popcount(t.mg)) > 1)) v.push('AtMostOneCommit');
  if (st.W.filter((w) => w.ce === st.ce).length > 1) v.push('SingleWatcher');
  if (st.T.some((t, f) => t.st === 'F' && st.S.some((s) => s.f === f && s.ep === t.ep && s.al && s.p < 2))) v.push('FailedTaskStopped');
  return v;
}
