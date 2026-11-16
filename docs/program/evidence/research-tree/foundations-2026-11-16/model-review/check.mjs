// Explicit-state checker: BFS over all interleavings, safety (invariants + transition
// properties), deadlock, AG EF(resolved) per field, and "a looping field is eventually
// suspected" as a fair-cycle search (a cycle in which the watcher keeps ticking).
import { makeParams, initial, canon, successors, invariants, cur, term, FIXES } from './model.mjs';

function explore(P, limit = 3_000_000) {
  const ids = new Map(); const keys = []; const par = []; const plab = [];
  const eFrom = [], eTo = [], eTick = [];
  const first = {}; // property -> {id, lab}
  const deadlocks = []; const tmask = []; const lmask = [];
  const s0 = initial(P); const k0 = canon(s0);
  ids.set(k0, 0); keys.push(k0); par.push(-1); plab.push('init');
  for (const v of invariants(s0, P)) first[v] ??= { id: 0, lab: null };
  for (let q = 0; q < keys.length; q++) {
    if (keys.length > limit) throw new Error('state limit');
    const st = JSON.parse(keys[q]);
    let tm = 0, lm = 0;
    st.T.forEach((t, f) => { if (term(t.st)) tm |= 1 << f; const s = cur(st, f); if (s && s.al && (s.m === 'ls' || s.m === 'lv') && !s.sq && t.st === 'R') lm |= 1 << f; });
    tmask.push(tm); lmask.push(lm);
    const succ = successors(st, P);
    let nonFault = 0;
    for (const x of succ) {
      if (!x.fault) nonFault++;
      const k = canon(x.s);
      let id = ids.get(k);
      if (id === undefined) {
        id = keys.length; ids.set(k, id); keys.push(k); par.push(q); plab.push(x.lab);
        for (const v of invariants(x.s, P)) first[v] ??= { id, lab: null };
      }
      for (const v of x.viol) first[v] ??= { id: q, lab: x.lab };
      eFrom.push(q); eTo.push(id); eTick.push(x.tick ? 1 : 0);
    }
    if (!nonFault && st.T.some((t) => !term(t.st))) deadlocks.push(q);
  }
  return { ids, keys, par, plab, eFrom, eTo, eTick, first, deadlocks, tmask, lmask };
}

function pathTo(G, id) {
  const p = [];
  for (let x = id; x !== -1; x = G.par[x]) p.push(G.plab[x]);
  return p.reverse().slice(1);
}

function backReach(G, goal) {
  const n = G.keys.length; const rev = new Array(n);
  for (let i = 0; i < n; i++) rev[i] = [];
  for (let e = 0; e < G.eFrom.length; e++) rev[G.eTo[e]].push(G.eFrom[e]);
  const seen = new Uint8Array(n); const st = [];
  for (let i = 0; i < n; i++) if (goal[i]) { seen[i] = 1; st.push(i); }
  while (st.length) { const x = st.pop(); for (const y of rev[x]) if (!seen[y]) { seen[y] = 1; st.push(y); } }
  return seen;
}

// SCCs (iterative Tarjan) of the subgraph induced by pred; return SCCs containing a tick edge
function fairLoopCycles(G, pred) {
  const n = G.keys.length; const adj = new Array(n);
  for (let i = 0; i < n; i++) adj[i] = [];
  for (let e = 0; e < G.eFrom.length; e++) { const a = G.eFrom[e], b = G.eTo[e]; if (pred[a] && pred[b]) adj[a].push([b, G.eTick[e]]); }
  const index = new Int32Array(n).fill(-1), low = new Int32Array(n), on = new Uint8Array(n), comp = new Int32Array(n).fill(-1);
  let idx = 0, nc = 0; const S = [];
  for (let r = 0; r < n; r++) {
    if (!pred[r] || index[r] !== -1) continue;
    const cs = [[r, 0]]; index[r] = low[r] = idx++; S.push(r); on[r] = 1;
    while (cs.length) {
      const top = cs[cs.length - 1]; const [v, ei] = top;
      if (ei < adj[v].length) {
        top[1]++; const w = adj[v][ei][0];
        if (index[w] === -1) { index[w] = low[w] = idx++; S.push(w); on[w] = 1; cs.push([w, 0]); }
        else if (on[w]) low[v] = Math.min(low[v], index[w]);
      } else {
        cs.pop();
        if (cs.length) { const u = cs[cs.length - 1][0]; low[u] = Math.min(low[u], low[v]); }
        if (low[v] === index[v]) { let w; do { w = S.pop(); on[w] = 0; comp[w] = nc; } while (w !== v); nc++; }
      }
    }
  }
  const hits = [];
  for (let a = 0; a < n; a++) if (pred[a]) for (const [b, t] of adj[a]) if (t && comp[a] === comp[b]) hits.push([a, b]);
  return { hits, comp, adj };
}

function cycleThrough(G, F, a, b) {
  // path b -> a inside the SCC, then edge a -> b
  const prev = new Map([[b, -1]]); const q = [b];
  while (q.length) { const x = q.shift(); if (x === a) break; for (const [y] of F.adj[x]) if (F.comp[y] === F.comp[a] && !prev.has(y)) { prev.set(y, x); q.push(y); } }
  const p = []; for (let x = a; x !== -1 && x !== b; x = prev.get(x)) p.push(G.plab[x]);
  return p.reverse().concat([`(tick) back to the start of the cycle`]);
}

const SAFETY = ['NoStaleAccepted', 'AtMostOneCommit', 'Slots', 'RestartLimit', 'TwoCoordinatorsAct'];
const EXTRA = ['NoFalseSuspicion', 'SingleWatcher', 'FailedTaskStopped'];

function check(name, over, extra = []) {
  const P = makeParams(over);
  const t0 = Date.now();
  const G = explore(P);
  const n = G.keys.length;
  const res = { name, states: n, edges: G.eFrom.length, props: {} };
  for (const p of [...SAFETY, ...EXTRA, ...extra]) {
    const f = G.first[p];
    res.props[p] = f ? { holds: false, trace: [...pathTo(G, f.id), ...(f.lab ? [f.lab] : [])] } : { holds: true };
  }
  // deadlock
  if (G.deadlocks.length) { const d = Math.min(...G.deadlocks); res.props.NoDeadlock = { holds: false, trace: [...pathTo(G, d), '(no non-fault action enabled; a field is unresolved)'] }; }
  else res.props.NoDeadlock = { holds: true };
  // AG EF resolved, per field
  let worst = null;
  for (let f = 0; f < P.FIELDS; f++) {
    const goal = new Uint8Array(n); for (let i = 0; i < n; i++) if (G.tmask[i] & (1 << f)) goal[i] = 1;
    const can = backReach(G, goal);
    for (let i = 0; i < n; i++) if (!can[i]) { if (worst === null || i < worst.id) worst = { id: i, f }; break; }
  }
  res.props.AlwaysCanResolve = worst ? { holds: false, trace: [...pathTo(G, worst.id), `(from here field f${worst.f} can never reach committed or failed)`] } : { holds: true };
  // looping field eventually suspected (weak fairness on watcher ticks)
  let loopBad = null;
  for (let f = 0; f < P.FIELDS && !loopBad; f++) {
    const pred = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (G.lmask[i] & (1 << f)) pred[i] = 1;
    const F = fairLoopCycles(G, pred);
    if (F.hits.length) {
      const [a, b] = F.hits.reduce((m, h) => (h[0] < m[0] ? h : m));
      loopBad = { trace: [...pathTo(G, b), '-- cycle repeated forever --', ...cycleThrough(G, F, a, b)] };
    }
  }
  res.props.LoopEventuallySuspected = loopBad ? { holds: false, trace: loopBad.trace } : { holds: true };
  res.ms = Date.now() - t0;
  return res;
}

const ONLY_CHILD = { k: 3, c: 3, z: 0, p: 0, l: 0, t: 0 };
// [id, title, parameters, baseline id (traces printed only for properties that newly fail), extra properties]
const RUNS = [
  ['SPEC', 'spec as written (R=2, N_max=3, one coordinator hand-over)', {}, null, ['SlotsAtSpecInterimCap2']],
  ['FIXED', 'spec + the smallest fixes (R=2, N_max=3)', FIXES, null],
  ['FIXED-N2', 'spec + fixes, N_max=2 (the spec interim cap)', { ...FIXES, NMAX: 2 }, null],
  ['FIXED-K3', 'spec + fixes, deeper: 3 faults (up to 3 child faults, 2 zombies)', { ...FIXES, BUDGET: { k: 3, c: 3, z: 2 } }, null],
  ['A-FENCE-EPOCH', 'ablation from FIXED: fencing by attempt epoch', { ...FIXES, FENCE_EPOCH: false }, 'FIXED'],
  ['A-FENCE-CE', 'ablation from FIXED: fencing by coordinator epoch (--ce)', { ...FIXES, FENCE_CE: false }, 'FIXED'],
  ['A-COMMIT', 'ablation from FIXED: the commit record', { ...FIXES, COMMIT_RECORD: false }, 'FIXED'],
  ['A-COMMIT-SPEC', 'ablation from SPEC: the commit record', { COMMIT_RECORD: false }, 'SPEC'],
  ['A-PROGRESS', 'ablation from FIXED: suspicion by progress -> by liveness', { ...FIXES, PROGRESS: false }, 'FIXED'],
  ['A-PAUSE', 'ablation from FIXED: pause detection', { ...FIXES, PAUSE_DET: false }, 'FIXED'],
  ['A-LEVEL', 'ablation from FIXED: level-triggered re-check after a wake', { ...FIXES, LEVEL: false }, 'FIXED'],
  ['C-LIMIT', 'control: FIXED, child faults only, budget 3', { ...FIXES, BUDGET: ONLY_CHILD }, null],
  ['A-LIMIT', 'ablation from C-LIMIT: the restart limit', { ...FIXES, RESTART_LIMIT: false, BUDGET: ONLY_CHILD }, 'C-LIMIT'],
];
const EXTRA_RUNS = [['SPEC-R1', 'spec as written with R=1 (the spec value)', { R: 1 }, null]];

const only = process.argv[2];
const list = only ? [...RUNS, ...EXTRA_RUNS].filter((r) => r[0] === only) : RUNS;
const T0 = Date.now(); let total = 0; const done = {};
for (const [id, name, over, base, extra = []] of list) {
  const r = check(name, over, extra);
  done[id] = r; total += r.states;
  const b = base && done[base];
  console.log(`\n=== ${id}: ${r.name}: ${r.states} states, ${r.edges} transitions, ${r.ms} ms`);
  for (const [p, v] of Object.entries(r.props)) {
    const isNew = b && !v.holds && b.props[p] && b.props[p].holds;
    const show = !v.holds && (!b || isNew);
    console.log(`  ${v.holds ? 'HOLDS' : 'FAILS'}  ${p}${v.holds ? '' : `  (shortest trace ${v.trace.length} steps)${b ? (isNew ? ' NEW vs ' + base : ' as in ' + base) : ''}`}`);
    if (show) v.trace.forEach((l, i) => console.log(`        ${String(i + 1).padStart(2)}. ${l}`));
  }
}
console.log(`\nTotal states over all runs: ${total}; wall time ${Date.now() - T0} ms`);
