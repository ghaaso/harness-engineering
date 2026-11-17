// Explicit-state checker for model.mjs. One configuration per process:
//   node check.mjs <CONFIG-ID> [--mem-mb N]
// BFS over every interleaving with a compact byte-encoded state store (typed arrays, off the V8 heap,
// counted against --mem-mb). Prints one JSON line on stdout; progress and summaries go to stderr.
// Properties:
//   safety   invariants on every state + per-transition checks (first, BFS-shortest trace)
//   NoBusyLoop          no cycle made only of untimed steps (coordinator steps, lock races): turns that
//                       wake themselves with no child, watcher, alarm or owner action in between
//   NoDeadlock          no state where no ordinary action is enabled while a field is unresolved
//   AlwaysCanResolve    AG EF(field committed or failed), ordinary edges only (no fault, no planned
//                       event needed, owner wake only after two wake losses or a host reset)
//   EventuallyResolves  AF(field resolved) under weak fairness per process (coordinator i, watcher,
//                       alarm, owner, child f/e): no fair cycle that keeps a field unresolved
import { FAULTS, makeParams, initial, canon, encode, decode, successors, invariants, ownerLegit, isTerm } from './model.mjs';
import { CONFIGS } from './configs.mjs';

const args = process.argv.slice(2);
const id = args[0];
const memMB = +(args[args.indexOf('--mem-mb') + 1] || 0) || 1500;
const cfg = CONFIGS.find((c) => c.id === id);
if (!cfg) { console.error('unknown config ' + id + '; known: ' + CONFIGS.map((c) => c.id).join(' ')); process.exit(2); }
// --bud k=3,c=2,... : run one part of the budget (the fault kinds of one multiset); h and d stay as configured
const budArg = args.includes('--bud') ? args[args.indexOf('--bud') + 1] : null;
const over = { ...cfg.over, BUD: { ...(cfg.over.BUD || {}) } };
if (budArg) { for (const k of FAULTS) over.BUD[k] = 0; for (const kv of budArg.split(',')) { const [k, v] = kv.split('='); over.BUD[k] = +v; } }
const P = makeParams(over);
const BUDGET = memMB * 1024 * 1024;
const DEADLINE = args.includes('--deadline') ? +args[args.indexOf('--deadline') + 1] : Infinity; // epoch ms: stop exploring then
const T0 = Date.now();
const log = (s) => process.stderr.write(`[${id}] ${s}\n`);

// ------------------------------------------------------------ growable typed arrays, counted
let held = 0;
function grow(arr, need, Ctor) {
  if (need <= arr.length) return arr;
  let cap = arr.length; while (cap < need) cap = Math.ceil(cap * 1.25);
  const b = new Ctor(cap); b.set(arr); held += b.byteLength - arr.byteLength; return b;
}
function alloc(Ctor, n) { const a = new Ctor(n); held += a.byteLength; return a; }
function free(a) { if (a) held -= a.byteLength; }
const heapUsed = () => process.memoryUsage().heapUsed;
const used = () => held + heapUsed();

// ------------------------------------------------------------ state store
let arena = alloc(Uint8Array, 1 << 22), aTop = 0;
let off = alloc(Uint32Array, 1 << 16), parent = alloc(Int32Array, 1 << 16);
let flags = alloc(Uint8Array, 1 << 16), estart = alloc(Int32Array, 1 << 16);
let table = alloc(Int32Array, 1 << 18), tmask = table.length - 1;
let eto = alloc(Int32Array, 1 << 18), einfo = alloc(Uint8Array, 1 << 18), nE = 0;
let N = 0;
const buf = new Uint8Array(1024);
function fnv(b, len) { let h = 0x811c9dc5; for (let i = 0; i < len; i++) { h ^= b[i]; h = Math.imul(h, 16777619); } return h >>> 0; }
function view(i) { return arena.subarray(off[i] + 2, off[i] + 2 + recLen(i)); }
function recLen(i) { return arena[off[i]] | (arena[off[i] + 1] << 8); }
function same(i, b, len) {
  const o = off[i] + 2; if (recLen(i) !== len) return false;
  for (let k = 0; k < len; k++) if (arena[o + k] !== b[k]) return false;
  return true;
}
function rehash() {
  const nt = alloc(Int32Array, table.length * 2); free(table); table = nt; tmask = table.length - 1;
  for (let i = 0; i < N; i++) { let p = fnv(view(i), recLen(i)) & tmask; while (table[p]) p = (p + 1) & tmask; table[p] = i + 1; }
}
function insert(b, len) {
  const h = fnv(b, len);
  let p = h & tmask;
  while (table[p]) { const i = table[p] - 1; if (same(i, b, len)) return [i, false]; p = (p + 1) & tmask; }
  const i = N++;
  arena = grow(arena, aTop + len + 2, Uint8Array);
  if (N > off.length) { off = grow(off, N, Uint32Array); parent = grow(parent, N, Int32Array); flags = grow(flags, N, Uint8Array); estart = grow(estart, N + 1, Int32Array); }
  off[i] = aTop; arena[aTop] = len & 255; arena[aTop + 1] = len >> 8; arena.set(b.subarray(0, len), aTop + 2); aTop += len + 2;
  table[p] = i + 1;
  if (N * 10 > table.length * 7) rehash();
  return [i, true];
}

const enc = (s) => { canon(s, P); const len = encode(s, buf); if (len > 1000) throw new Error('state too long'); return len; };

// ------------------------------------------------------------ BFS
const SAFETY = ['NoStaleAccepted', 'AtMostOneCommit', 'Slots', 'RestartLimit', 'TwoCoordinatorsAct', 'SingleWatcher', 'FailedTaskStopped', 'OneSessionPerAttempt', 'ReadyNotDiscarded', 'NoFalseSuspicion'];
// round 3 (wake group and D7): further properties, each checked only when its flag is on
if (P.WAKE_PROPS) SAFETY.push('WakeSourceAlive', 'WakeChainBounded', 'AlarmsBounded');
if (P.D7_RESTART) SAFETY.push('RestartLimitGhost');
if (P.D7_STALE) SAFETY.push('StaleWrites');
if (P.D7_COMMIT) SAFETY.push('CommitRecordStable');
if (P.D7_SLOTS) SAFETY.push('SlotsProc', 'SlotsR10');
if (P.D7_LOOPS) SAFETY.push('LoopReported');
if (P.FX_PROPS) SAFETY.push('OneWriterPerAttempt', 'NoChargeWithoutFault'); // round 3, fence fixes (MB2a)
// diagnostics (not properties): the D6 path by which the current coordinator was left with no wake source
const DIAG = P.WAKE_PROPS ? ['D6:p1', 'D6:p2', 'D6:p3', 'D6:p3b', 'D6:p4', 'D6:p5', 'D6:p6', 'D6:p7', 'D6:lost', 'D6:other'] : [];
const first = {}; // prop -> {src, k (successor index) | null, dst}
const F = P.FIELDS;
let complete = true, why = '';
{
  const s0 = initial(P); const len = enc(s0); insert(buf, len); parent[0] = -1;
  for (const v of invariants(s0, P)) first[v] ??= { dst: 0, src: -1, k: -1 };
}
const STOP_FRAC = 0.78; // leave room for the analyses
let lastLog = Date.now();
let expanded = 0;
const levels = []; let levelEnd = 1; // BFS level sizes (states first found at each depth), for growth estimates
for (let q = 0; q < N; q++) {
  expanded = q;
  if (q === levelEnd) { levels.push(levelEnd - (levels.reduce((a, b) => a + b, 0))); levelEnd = N; }
  if ((q & 4095) === 0 && Date.now() > DEADLINE) { complete = false; why = `time: stopped at the run's deadline with ${N} states (${q} expanded)`; break; }
  if (used() > BUDGET * STOP_FRAC) { complete = false; why = `memory: stopped at ${N} states (${q} expanded) with ${Math.round(used() / 1048576)} MB in use`; break; }
  const st = decode(view(q));
  let fl = 0; st.T.forEach((t, f) => { if (isTerm(t.st)) fl |= 1 << f; });
  const legit = ownerLegit(st, P);
  if (legit) fl |= 8; if (st.syn) fl |= 16;
  const succ = successors(st, P, false);
  estart[q] = nE;
  for (let k = 0; k < succ.length; k++) {
    const x = succ[k];
    const len = enc(x.s);
    const [d, isNew] = insert(buf, len);
    if (isNew) { parent[d] = q; for (const v of invariants(x.s, P)) first[v] ??= { dst: d, src: -1, k: -1 }; }
    for (const v of x.viol) first[v] ??= { dst: d, src: q, k };
    if (nE + 1 > eto.length) { eto = grow(eto, nE + 1, Int32Array); einfo = grow(einfo, nE + 1, Uint8Array); }
    eto[nE] = d;
    einfo[nE] = (x.fault ? 1 : 0) | (x.u ? 2 : 0) | (x.ow ? 4 : 0) | ((x.proc & 31) << 3);
    nE++;
  }
  flags[q] = fl;
  if (Date.now() - lastLog > 20000) { lastLog = Date.now(); log(`${N} states, ${q} expanded, ${nE} edges, ${Math.round(used() / 1048576)} MB, ${Math.round((Date.now() - T0) / 1000)} s`); }
}
if (complete) expanded = N; // otherwise states >= expanded were found but not expanded
estart = grow(estart, N + 1, Int32Array); estart[expanded] = nE; for (let q = expanded + 1; q <= N; q++) estart[q] = nE;
const bfsSeconds = (Date.now() - T0) / 1000;
log(`BFS ${complete ? 'complete' : 'BOUNDED'}: ${N} states, ${nE} transitions, ${bfsSeconds.toFixed(1)} s`);

// ------------------------------------------------------------ traces by replay
function labelOf(a, b) {
  const st = decode(view(a));
  for (const x of successors(st, P, true)) { const len = enc(x.s); if (same(b, buf, len)) return x.lab; }
  return '(edge not found on replay)';
}
function pathIds(d) { const p = []; for (let x = d; x !== -1; x = parent[x]) p.push(x); return p.reverse(); }
function traceTo(d) { const ids = pathIds(d); const out = []; for (let i = 1; i < ids.length; i++) out.push(labelOf(ids[i - 1], ids[i])); return out; }
function edgeLabel(src, k) { const st = decode(view(src)); return successors(st, P, true)[k].lab; }

const props = {};
for (const p of SAFETY) {
  const f = first[p];
  if (!f) { props[p] = { holds: complete ? true : 'not refuted (bounded)' }; continue; }
  const tr = f.src >= 0 ? [...traceTo(f.src), edgeLabel(f.src, f.k)] : traceTo(f.dst);
  props[p] = { holds: false, trace: tr };
}
const diag = {};
for (const p of DIAG) {
  const f = first[p];
  if (!f) { diag[p] = complete ? 'not reached' : 'not reached (bounded)'; continue; }
  diag[p] = { reached: true, trace: f.src >= 0 ? [...traceTo(f.src), edgeLabel(f.src, f.k)] : traceTo(f.dst) };
}

// ------------------------------------------------------------ graph analyses
const allowedEdge = (q, e) => { const inf = einfo[e]; if (inf & 1) return false; if (inf & 4) return (flags[q] & 8) !== 0; return true; };
const procOf = (e) => einfo[e] >> 3;
const ENV = (1 << 30) | (1 << 31); // environment choices (resume after a slow call), never forced by fairness

function analyses() {
  // deadlock
  let dead = -1;
  for (let q = 0; q < expanded && dead < 0; q++) {
    if (flags[q] & 16) continue;
    let unresolved = false; for (let f = 0; f < F; f++) if (!(flags[q] & (1 << f))) unresolved = true;
    if (!unresolved) continue;
    let any = false; for (let e = estart[q]; e < estart[q + 1]; e++) if (allowedEdge(q, e)) { any = true; break; }
    if (!any) dead = q;
  }
  props.NoDeadlock = dead < 0 ? { holds: complete ? true : 'not refuted (bounded)' } : { holds: false, trace: [...traceTo(dead), '(no ordinary action is enabled; a field is unresolved)'] };

  // reverse CSR over allowed edges
  const rstart = alloc(Int32Array, N + 2);
  for (let q = 0; q < expanded; q++) for (let e = estart[q]; e < estart[q + 1]; e++) if (allowedEdge(q, e)) rstart[eto[e] + 1]++;
  for (let i = 0; i < N + 1; i++) rstart[i + 1] += rstart[i];
  const rsrc = alloc(Int32Array, rstart[N] + 1); const fillp = alloc(Int32Array, N + 1); fillp.set(rstart.subarray(0, N + 1));
  for (let q = 0; q < expanded; q++) for (let e = estart[q]; e < estart[q + 1]; e++) if (allowedEdge(q, e)) rsrc[fillp[eto[e]]++] = q;
  free(fillp);
  const seen = alloc(Uint8Array, N); const stack = alloc(Int32Array, N);
  let worst = null;
  for (let f = 0; f < F; f++) {
    seen.fill(0); let sp = 0;
    for (let i = 0; i < N; i++) if ((flags[i] & (1 << f)) || i >= expanded) { seen[i] = 1; stack[sp++] = i; } // unexpanded: assume it can
    while (sp) { const x = stack[--sp]; for (let r = rstart[x]; r < rstart[x + 1]; r++) { const y = rsrc[r]; if (!seen[y]) { seen[y] = 1; stack[sp++] = y; } } }
    for (let i = 0; i < expanded; i++) if (!seen[i] && !(flags[i] & 16)) { if (!worst || i < worst.i) worst = { i, f }; break; }
  }
  props.AlwaysCanResolve = worst ? { holds: false, trace: [...traceTo(worst.i), `(from here field f${worst.f} can never be committed or failed by ordinary actions)`] } : { holds: complete ? true : 'not refuted (bounded)' };
  free(rsrc); free(rstart);

  // SCC machinery (iterative Tarjan) over a predicate on edges
  const index = alloc(Int32Array, N), low = alloc(Int32Array, N), comp = alloc(Int32Array, N), onst = alloc(Uint8Array, N), cs = alloc(Int32Array, N), ce = alloc(Int32Array, N);
  function sccs(inNode, inEdge) {
    index.fill(-1); comp.fill(-1); onst.fill(0);
    let idx = 0, nc = 0, sp2 = 0;
    for (let r = 0; r < expanded; r++) {
      if (!inNode(r) || index[r] !== -1) continue;
      let top = 0; cs[0] = r; ce[0] = estart[r]; index[r] = low[r] = idx++; stack[sp2++] = r; onst[r] = 1;
      while (top >= 0) {
        const v = cs[top]; let e = ce[top]; let pushed = false;
        while (e < estart[v + 1]) {
          const w = eto[e]; const ok = w < expanded && inNode(w) && inEdge(v, e); e++;
          if (!ok) continue;
          if (index[w] === -1) { ce[top] = e; top++; cs[top] = w; ce[top] = estart[w]; index[w] = low[w] = idx++; stack[sp2++] = w; onst[w] = 1; pushed = true; break; }
          else if (onst[w] && index[w] < low[v]) low[v] = index[w];
        }
        if (pushed) continue;
        ce[top] = e;
        if (low[v] === index[v]) { let w; do { w = stack[--sp2]; onst[w] = 0; comp[w] = nc; } while (w !== v); nc++; }
        top--;
        if (top >= 0) { const u = cs[top]; if (low[v] < low[u]) low[u] = low[v]; }
      }
    }
    return nc;
  }
  function cycleIn(start, inNode, inEdge) { // BFS from start back to start inside its SCC
    const c = comp[start]; const prev = new Map([[start, -1]]); const q = [start]; let hit = -1;
    for (let h = 0; h < q.length && hit < 0; h++) {
      const x = q[h];
      for (let e = estart[x]; e < estart[x + 1]; e++) {
        const y = eto[e]; if (y >= expanded || comp[y] !== c || !inNode(y) || !inEdge(x, e)) continue;
        if (y === start) { hit = x; break; }
        if (!prev.has(y)) { prev.set(y, x); q.push(y); }
      }
    }
    const ids = []; for (let x = hit; x !== -1; x = prev.get(x)) ids.push(x); ids.reverse();
    const out = []; for (let i = 1; i < ids.length; i++) out.push(labelOf(ids[i - 1], ids[i]));
    out.push(labelOf(ids[ids.length - 1], start) + '   (back to the start of the cycle)');
    return out;
  }

  // busy loop: SCC over untimed ordinary edges
  {
    const inNode = () => true; const inEdge = (q, e) => (einfo[e] & 3) === 2;
    const nc = sccs(inNode, inEdge);
    const internal = alloc(Uint8Array, nc); let best = -1;
    for (let q = 0; q < expanded; q++) for (let e = estart[q]; e < estart[q + 1]; e++) if (inEdge(q, e) && eto[e] < expanded && comp[eto[e]] === comp[q]) { internal[comp[q]] = 1; if (best < 0 || q < best) best = q; }
    free(internal);
    props.NoBusyLoop = best < 0 ? { holds: complete ? true : 'not refuted (bounded)' } : { holds: false, trace: [...traceTo(best), '-- this cycle repeats with no child, watcher, alarm or owner action --', ...cycleIn(best, inNode, inEdge)] };
  }

  // eventual resolution under weak fairness, per field
  let bad = null;
  for (let f = 0; f < F && !bad; f++) {
    const inNode = (q) => !(flags[q] & (1 << f)) && !(flags[q] & 16);
    const inEdge = (q, e) => allowedEdge(q, e);
    const nc = sccs(inNode, inEdge);
    const req = alloc(Uint32Array, nc).fill(0xffffffff), took = alloc(Uint32Array, nc), internal = alloc(Uint8Array, nc), minq = alloc(Int32Array, nc).fill(-1);
    for (let q = 0; q < expanded; q++) {
      if (!inNode(q)) continue; const c = comp[q];
      let em = 0; for (let e = estart[q]; e < estart[q + 1]; e++) if (allowedEdge(q, e)) em |= 1 << procOf(e);
      req[c] &= em;
      if (minq[c] < 0) minq[c] = q;
      for (let e = estart[q]; e < estart[q + 1]; e++) if (inEdge(q, e) && eto[e] < expanded && comp[eto[e]] === c && inNode(eto[e])) { internal[c] = 1; took[c] |= 1 << procOf(e); }
    }
    let bc = -1;
    for (let c = 0; c < nc; c++) if (internal[c] && (((req[c] & ~ENV) & ~took[c]) >>> 0) === 0) { if (bc < 0 || minq[c] < minq[bc]) bc = c; }
    if (bc >= 0) bad = { f, q: minq[bc], tr: null };
    if (bad) bad.tr = [...traceTo(bad.q), `-- a fair cycle in which field f${f} is never resolved --`, ...cycleIn(bad.q, inNode, inEdge)];
    free(req); free(took); free(internal); free(minq);
  }
  props.EventuallyResolves = bad ? { holds: false, trace: bad.tr } : { holds: complete ? true : 'not refuted (bounded)' };
}
let anaErr = null;
try {
  const need = N * 26 + nE * 4;
  if (Date.now() > DEADLINE + 45000) throw new Error('no time left for the graph analyses');
  if (used() + need > BUDGET) throw new Error(`analyses need about ${Math.round(need / 1048576)} MB more than the budget leaves`);
  analyses();
} catch (e) { anaErr = String(e.message || e); for (const p of ['NoDeadlock', 'AlwaysCanResolve', 'NoBusyLoop', 'EventuallyResolves']) props[p] ??= { holds: 'not checked: ' + anaErr }; }

const res = { id, part: budArg, title: cfg.title, base: cfg.base || null, states: N, transitions: nE, complete, bounded_why: why || null, seconds: Math.round((Date.now() - T0) / 100) / 10, peak_mb: Math.round(used() / 1048576), bytes_per_state: Math.round(used() / Math.max(1, N)), avg_record: Math.round(aTop / Math.max(1, N)), props, ...(DIAG.length ? { diag } : {}), levels_done: levels, level_open: { found: N - levels.reduce((a, b) => a + b, 0), expanded_upto: expanded } };
process.stdout.write(JSON.stringify(res) + '\n');
for (const [p, v] of Object.entries(props)) log(`${v.holds === true ? 'HOLDS' : v.holds === false ? 'FAILS' : 'UNKNOWN'} ${p}${v.trace ? ` (${v.trace.length} steps)` : ''}`);
