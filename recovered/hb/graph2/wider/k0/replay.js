'use strict';
// K0 cache replay. No model, no agent. Usage: node replay.js <outdir>
// For every snapshot (depth-first over the first-parent ancestry tree of all 190 snapshots) every live
// question is answered fresh (the ground truth, with its dependency record), then each lane replays
// each policy against its carried cache.
// Lanes: tree (all 190 snapshots; each inherits the cache of its nearest cached first-parent ancestor),
//        main_s1 (the 99 snapshots on main's first-parent chain), main_s2/s4/s8 (every 2nd/4th/8th of them).
// Policies: none, repo (any file change in the repository), file (a file of the dependency set changed,
//   git blob id), fact (a recorded fact's whole-record hash changed or a recorded pattern's matched set
//   changed), fact_sem (as fact, but a fact read without its line/token fields is compared on its
//   semantic hash; extra row, not in the brief), cutoff (fact, with early cutoff at sub-derivations),
//   cutoff_sem (extra row), ttl5, ttl20 (served while the answer is at most 5 / 20 first-parent commits
//   old), never (no invalidation; the stale control).
// A question is live at a snapshot when its anchor exists there or at the lane's previous snapshot (so
// the step that removes the anchor is tested too).
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const C = require('./conf');
const { Snap, INT, fnv } = require('./load');
const { Rec, derivation, flatDep } = require('./rec');
const { P } = require('./programs');

const OUTDIR = path.resolve(process.argv[2] || path.join(C.OUT, 'run1'));
fs.mkdirSync(OUTDIR, { recursive: true });
const tree = JSON.parse(fs.readFileSync(path.join(C.DATA, 'tree.json'), 'utf8'));
const chain = JSON.parse(fs.readFileSync(path.join(C.DATA, 'chain.json'), 'utf8'));
const QS = JSON.parse(fs.readFileSync(path.join(C.DATA, 'questions.json'), 'utf8')).questions;
const ONLY = process.env.K0_ONLY ? new Set(process.env.K0_ONLY.split(',')) : null; // development filter
const LIMIT = process.env.K0_LIMIT ? Number(process.env.K0_LIMIT) : Infinity;
const Q = ONLY ? QS.filter((q) => ONLY.has(q.kind)) : QS;
const exists = new Map(Q.map((q) => [q.qid, new Set(q.exists_at)]));

// fact_pos (extra row, not in the brief): fact-level on positive facts only, with no negative
// dependencies (pattern sets not checked), to show what the negative dependencies prevent.
const POLICIES = ['none', 'repo', 'file', 'fact_pos', 'fact', 'fact_sem', 'cutoff', 'cutoff_sem', 'ttl5', 'ttl20', 'never'];
const depthOf = (sha) => tree.nodes[sha].depth_fp;

// lanes
const mainShas = chain.snapshots.map((x) => x.sha);
const lanes = [{ name: 'tree', pred: (s) => tree.nodes[s].parent, has: () => true }];
for (const k of [1, 2, 4, 8]) {
  const list = mainShas.filter((_, i) => i % k === 0);
  const pos = new Map(list.map((s, i) => [s, i]));
  lanes.push({ name: 'main_s' + k, pred: (s) => (pos.get(s) > 0 ? list[pos.get(s) - 1] : null), has: (s) => pos.has(s) });
}

// depth-first order (children by sha)
const order = [];
(function dfs(s) { order.push(s); for (const c of tree.nodes[s].children.slice().sort()) dfs(c); })(tree.roots[0]);

const ageB = (a) => (a == null ? 'cold' : a <= 1 ? '1' : a === 2 ? '2' : a <= 5 ? '3-5' : a <= 10 ? '6-10' : a <= 20 ? '11-20' : a <= 50 ? '21-50' : '51+');
const gapB = (g) => (g == null ? 'none' : g === 1 ? '1' : g === 2 ? '2' : g <= 4 ? '3-4' : g <= 8 ? '5-8' : '9+');

// aggregate counters: key -> [lookups, hits, stale, recomputes, avoidable, cold, reads_recompute, checks]
const AGG = new Map();
function bump(key, idx, v = 1) { let a = AGG.get(key); if (!a) { a = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; AGG.set(key, a); } a[idx] += v; }
// extra counters for early cutoff: hits that needed a sub recomputation, sub recomputations, their reads
const CUT = new Map();
function cbump(k, v = 1) { CUT.set(k, (CUT.get(k) || 0) + v); }
const DEPCASE = []; // dependency cases (tree lane): answer changed while none of its own files changed
const CHANGES = new Map(); // kind -> [steps, changed, changed_files_unchanged]
const STALE_FACT = []; // any stale serve by a fact or cutoff policy (must stay empty)
const STALE_FILE = []; // stale serves by the file policy, with their cause
const DEPSIZE = new Map(); // kind -> list of [nodes, edges, patterns, files, reads]
const TIMING = []; // per snapshot timings (not part of the determinism check)
const EMPTY = new Map(); // kind -> [fresh answers, empty answers]
const isEmpty = (a) => (Array.isArray(a) ? a.length === 0 : a && Array.isArray(a.items) ? a.items.length === 0 : Object.values(a).every((v) => Array.isArray(v) && v.length === 0));
const rawOut = zlib.createGzip();
const rawFile = fs.createWriteStream(path.join(OUTDIR, 'lookups_tree.jsonl.gz'));
rawOut.pipe(rawFile);

// per-snapshot validity checks, memoised by dependency object
function makeChecker(S) {
  const n = INT.size + 16;
  const hf = new Int32Array(n); const hs = new Int32Array(n);
  for (const g of S.G.nodes) { hf[g.key] = g.hf; hs[g.key] = g.hs; }
  for (const e of S.G.edges) { hf[e.key] = e.hf; hs[e.key] = e.hs; }
  const memo = { full: new WeakMap(), sem: new WeakMap(), file: new WeakMap(), pos: new WeakMap() };
  const blobMemo = new Map();
  const blobOfKey = (fk) => { let b = blobMemo.get(fk); if (b === undefined) { b = S.blobOf(INT.str(fk).slice(2)); blobMemo.set(fk, b); } return b; };
  let checks = 0;
  // returns 0 valid, 1 a positive fact changed, 2 only a pattern's matched set changed
  function fact(d, sem, positiveOnly) {
    const m = positiveOnly ? memo.pos : sem ? memo.sem : memo.full;
    if (m.has(d)) return m.get(d);
    let r = 0;
    for (let i = 0; i < d.nk.length; i++) {
      checks++;
      const k = d.nk[i];
      const cur = k < n ? (sem && !d.npos[i] ? hs[k] : hf[k]) : 0;
      if (cur !== (sem && !d.npos[i] ? d.nhs[i] : d.nhf[i])) { r = 1; break; }
    }
    if (!r) for (let i = 0; i < d.ek.length; i++) {
      checks++;
      const k = d.ek[i];
      const cur = k < n ? (sem && !d.epos[i] ? hs[k] : hf[k]) : 0;
      if (cur !== (sem && !d.epos[i] ? d.ehs[i] : d.ehf[i])) { r = 1; break; }
    }
    if (!r && !positiveOnly) for (let i = 0; i < d.pk.length; i++) { checks++; if (S.patHash(d.pk[i]) !== d.ph[i]) { r = 2; break; } }
    m.set(d, r);
    return r;
  }
  function file(d) {
    if (memo.file.has(d)) return memo.file.get(d);
    let r = 0;
    for (let i = 0; i < d.fk.length; i++) { checks++; if (blobOfKey(d.fk[i]) !== d.fb[i]) { r = 1; break; } }
    memo.file.set(d, r);
    return r;
  }
  return { fact, file, checks: () => checks, hf, hs, n, blobOfKey };
}

// a fresh answer at S with its dependency record
function computeTruth(S, q) {
  const rec = new Rec(S);
  const ans = P[q.kind](rec, q.target);
  const dv = derivation(rec, ans);
  const t = { ans: JSON.stringify(ans), dv, sha: S.sha, depth: depthOf(S.sha), tree: S.treeHash, _flat: null, _subFlat: null };
  return t;
}
const flatOf = (t) => t._flat || (t._flat = flatDep(t.dv));
const subFlats = (t) => t._subFlat || (t._subFlat = t.dv.subs.map((s) => { const dep = flatDep(s.d); return { name: s.name, args: JSON.stringify(s.args), res: JSON.stringify(s.d.result), dep, reads: dep.reads }; }));

function entryFrom(t, policy) {
  if (policy === 'cutoff' || policy === 'cutoff_sem') return { ans: t.ans, depth: t.depth, sha: t.sha, own: t.dv.own, subs: subFlats(t), t };
  return { ans: t.ans, depth: t.depth, sha: t.sha, tree: t.tree, dep: flatOf(t), t };
}

const laneState = new Map(); // lane -> Map sha -> state
for (const L of lanes) laneState.set(L.name, new Map());
const pendingChildren = new Map(Object.keys(tree.nodes).map((s) => [s, tree.nodes[s].children.length]));
const truthAt = new Map(); // sha -> Map qid -> truth (kept while children pending, tree lane)

const t00 = Date.now();
let done = 0;
for (const sha of order) {
  if (done >= LIMIT) break;
  const T = { sha, load: 0, truth: {}, check: {} };
  let t0 = Date.now();
  const S = new Snap(sha);
  S.treeHash = fnv([...S.blobs.entries()].map(([p, b]) => p + '\u0001' + b).sort().join('\n'));
  T.load = Date.now() - t0;
  const dS = depthOf(sha);
  // which questions are live in some lane here
  const lanesHere = lanes.filter((L) => L.has(sha));
  const live = new Map();
  for (const L of lanesHere) {
    const p = L.pred(sha);
    const set = new Set();
    for (const q of Q) { const ex = exists.get(q.qid); if (ex.has(sha) || (p && ex.has(p))) set.add(q.qid); }
    live.set(L.name, set);
  }
  const need = new Set(); for (const s of live.values()) for (const x of s) need.add(x);
  const truth = new Map();
  for (const q of Q) {
    if (!need.has(q.qid)) continue;
    t0 = process.hrtime.bigint();
    const t = computeTruth(S, q);
    T.truth[q.kind] = (T.truth[q.kind] || 0) + Number(process.hrtime.bigint() - t0) / 1e6;
    truth.set(q.qid, t);
    let em = EMPTY.get(q.kind); if (!em) { em = [0, 0]; EMPTY.set(q.kind, em); }
    em[0]++; if (isEmpty(JSON.parse(t.ans))) em[1]++;
    const f = flatOf(t);
    if (!DEPSIZE.has(q.kind)) DEPSIZE.set(q.kind, []);
    DEPSIZE.get(q.kind).push([f.nk.length, f.ek.length, f.pk.length, f.fk.length, f.reads]);
  }
  const ck = makeChecker(S);
  const qById = new Map(Q.map((q) => [q.qid, q]));

  for (const L of lanesHere) {
    const p = L.pred(sha);
    const gap = p ? dS - depthOf(p) : null;
    const prev = p ? laneState.get(L.name).get(p) : null;
    const st = { pol: new Map(), last: new Map() };
    for (const pol of POLICIES) st.pol.set(pol, new Map(prev ? prev.pol.get(pol) : []));
    if (prev) for (const [k, v] of prev.last) st.last.set(k, v);
    const rawRows = [];
    for (const qid of live.get(L.name)) {
      const q = qById.get(qid); const t = truth.get(qid);
      const lastAns = st.last.get(qid);
      // dependency cases and change counts (tree lane, consecutive lookups of the same question)
      if (L.name === 'tree' && p && truthAt.has(p) && truthAt.get(p).has(qid)) {
        const tp = truthAt.get(p).get(qid);
        let c = CHANGES.get(q.kind); if (!c) { c = [0, 0, 0, 0]; CHANGES.set(q.kind, c); }
        c[0]++;
        if (tp.ans !== t.ans) {
          c[1]++;
          const fileChanged = ck.file(flatOf(tp));
          if (!fileChanged) {
            c[2]++;
            const fr = ck.fact(flatOf(tp), false);
            DEPCASE.push({ sha, parent: p, gap, qid, kind: q.kind, runtime: q.runtime, set: q.set, fact_check: fr === 1 ? 'positive fact changed' : fr === 2 ? 'pattern gained or lost a match' : 'NO RECORDED DEPENDENCY CHANGED', before: tp.ans.slice(0, 400), after: t.ans.slice(0, 400), why: explain(ck, flatOf(tp), S) });
          }
        }
      }
      const row = { s: sha.slice(0, 10), q: qid, ch: lastAns === undefined ? null : (lastAns !== t.ans ? 1 : 0), o: '', a: [] };
      for (const pol of POLICIES) {
        const cache = st.pol.get(pol);
        const e = cache.get(qid);
        const base = L.name + '|' + pol + '|' + q.set + '|' + q.kind + '|' + q.runtime;
        const ab = e ? ageB(dS - e.depth) : 'cold';
        const key = base + '|' + ab + '|' + gapB(gap);
        if (pol === 'none') {
          if (lastAns === undefined) { bump(key, 5); row.o += 'C'; row.a.push(null); continue; }
          bump(key, 0); bump(key, 3); bump(key, 6, flatOf(t).reads);
          if (lastAns === t.ans) { bump(key, 4); row.o += 'A'; } else row.o += 'R';
          row.a.push(null);
          continue;
        }
        if (!e) { bump(key, 5); cache.set(qid, entryFrom(t, pol)); row.o += 'C'; row.a.push(null); continue; }
        bump(key, 0);
        let serve = false; let cutoffSub = 0;
        const tc0 = process.hrtime.bigint();
        if (pol === 'repo') serve = e.tree === S.treeHash;
        else if (pol === 'file') serve = ck.file(e.dep) === 0;
        else if (pol === 'fact_pos') serve = ck.fact(e.dep, false, true) === 0;
        else if (pol === 'fact') serve = ck.fact(e.dep, false) === 0;
        else if (pol === 'fact_sem') serve = ck.fact(e.dep, true) === 0;
        else if (pol === 'ttl5') serve = dS - e.depth <= 5;
        else if (pol === 'ttl20') serve = dS - e.depth <= 20;
        else if (pol === 'never') serve = true;
        else { // cutoff / cutoff_sem
          const sem = pol === 'cutoff_sem';
          serve = ck.fact(e.own, sem) === 0;
          let newSubs = null;
          if (serve) {
            const tsubs = subFlats(t);
            for (let i = 0; i < e.subs.length && serve; i++) {
              const s = e.subs[i];
              if (ck.fact(s.dep, sem) === 0) continue;
              // re-derive this sub-derivation (its fresh result at S is the truth's sub with the same arguments)
              const fresh = tsubs.find((x) => x.name === s.name && x.args === s.args);
              cutoffSub++; bump(key, 8, fresh ? fresh.reads : 0);
              if (fresh && fresh.res === s.res) { if (!newSubs) newSubs = e.subs.slice(); newSubs[i] = fresh; }
              else serve = false;
            }
          }
          if (serve && newSubs) cache.set(qid, { ...e, subs: newSubs });
          if (cutoffSub) cbump(L.name + '|' + pol + '|' + q.kind + '|subs_rederived', cutoffSub);
          if (serve && cutoffSub) cbump(L.name + '|' + pol + '|' + q.kind + '|hits_after_backdating');
        }
        T.check[pol] = (T.check[pol] || 0) + Number(process.hrtime.bigint() - tc0) / 1e6;
        row.a.push(dS - e.depth);
        if (serve) {
          bump(key, 1);
          if (e.ans !== t.ans) {
            bump(key, 2); row.o += 'S';
            if (pol === 'fact' || pol === 'fact_sem' || pol === 'cutoff' || pol === 'cutoff_sem') STALE_FACT.push({ lane: L.name, pol, sha, qid, kind: q.kind, computed_at: e.sha });
            if (pol === 'file' && L.name === 'tree') STALE_FILE.push({ sha, qid, kind: q.kind, runtime: q.runtime, computed_at: e.sha, age: dS - e.depth, cause: (() => { const r = ck.fact(e.dep, false); return r === 1 ? 'positive fact changed' : r === 2 ? 'pattern gained or lost a match' : 'none recorded'; })(), why: explain(ck, e.dep, S) });
          } else row.o += 'H';
        } else {
          bump(key, 3);
          if (pol === 'cutoff' || pol === 'cutoff_sem') bump(key, 6, t.dv.own.reads + subFlats(t).reduce((a, s, i) => a + (e.subs[i] && ck.fact(e.subs[i].dep, pol === 'cutoff_sem') === 0 ? 0 : s.reads), 0));
          else bump(key, 6, flatOf(t).reads);
          if (e.ans === t.ans) { bump(key, 4); row.o += 'A'; } else row.o += 'R';
          cache.set(qid, entryFrom(t, pol));
        }
      }
      st.last.set(qid, t.ans);
      if (L.name === 'tree') rawRows.push(row);
    }
    for (const r of rawRows) rawOut.write(JSON.stringify(r) + '\n');
    laneState.get(L.name).set(sha, st);
    // free states no lane will read again
    if (L.name === 'tree') {
      if (p) { pendingChildren.set(p, pendingChildren.get(p) - 1); if (pendingChildren.get(p) === 0) laneState.get('tree').delete(p); }
      if (tree.nodes[sha].children.length === 0) laneState.get('tree').delete(sha);
    } else if (p) laneState.get(L.name).delete(p);
  }
  T.checks = ck.checks();
  // keep this snapshot's truth for its children (dependency cases), free the parent's when done
  truthAt.set(sha, truth);
  const par = tree.nodes[sha].parent;
  if (par && pendingChildren.get(par) === 0) truthAt.delete(par);
  if (tree.nodes[sha].children.length === 0) truthAt.delete(sha);
  T.total = Date.now() - t00;
  TIMING.push(T);
  done++;
  if (done % 5 === 0 || done === order.length) {
    fs.writeFileSync(path.join(OUTDIR, 'progress.json'), JSON.stringify({ done, of: order.length, elapsed_s: (Date.now() - t00) / 1000, last: sha, heap_mb: Math.round(process.memoryUsage().heapUsed / 1e6) }));
    console.log('done', done, 'of', order.length, ((Date.now() - t00) / 1000).toFixed(1) + 's', 'heap', Math.round(process.memoryUsage().heapUsed / 1e6) + 'MB');
  }
}

// what changed among the recorded dependencies (for the notes): counts by fact kind, a few examples
function explain(ck, d, S) {
  const out = { nodes: {}, edges: {}, patterns: {}, files_changed: 0, examples: [] };
  for (let i = 0; i < d.nk.length; i++) {
    const k = d.nk[i]; const cur = k < ck.n ? ck.hf[k] : 0;
    if (cur !== d.nhf[i]) { const sid = INT.str(k).slice(2); const n = S.node.get(sid); const kd = n ? n.kind : 'absent-now'; out.nodes[kd] = (out.nodes[kd] || 0) + 1; if (out.examples.length < 3) out.examples.push('node ' + sid + (n ? ' changed' : ' gone') + ((cur !== 0 && d.nhf[i] === 0) ? ' (appeared)' : '')); }
  }
  for (let i = 0; i < d.ek.length; i++) {
    const k = d.ek[i]; const cur = k < ck.n ? ck.hf[k] : 0;
    if (cur !== d.ehf[i]) { const sk = INT.str(k).slice(2); const kd = sk.split('|')[0] + (cur ? ' changed' : ' gone'); out.edges[kd] = (out.edges[kd] || 0) + 1; if (out.examples.length < 6) out.examples.push('edge ' + sk + (cur ? ' changed' : ' gone')); }
  }
  for (let i = 0; i < d.pk.length; i++) {
    if (S.patHash(d.pk[i]) !== d.ph[i]) { const pk = INT.str(d.pk[i]); const t = pk[0] + ':' + pk.slice(pk.lastIndexOf('|') + 1).slice(0, 60); out.patterns[t] = (out.patterns[t] || 0) + 1; if (out.examples.length < 8) out.examples.push('pattern ' + pk.slice(0, 160)); }
  }
  for (let i = 0; i < d.fk.length; i++) if (ck.blobOfKey(d.fk[i]) !== d.fb[i]) out.files_changed++;
  return out;
}

rawOut.end();
rawFile.on('finish', () => {
  const sizes = {};
  for (const [k, v] of DEPSIZE) {
    const col = (j) => v.map((x) => x[j]).sort((a, b) => a - b);
    const med = (a) => a[Math.floor((a.length - 1) / 2)];
    const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    sizes[k] = { derivations: v.length };
    ['nodes', 'edges', 'patterns', 'files', 'reads'].forEach((nm, j) => { const a = col(j); sizes[k][nm] = { median: med(a), mean: +mean(a).toFixed(1), max: a[a.length - 1] }; });
  }
  const res = {
    policies: POLICIES, lanes: lanes.map((L) => L.name), snapshots_processed: done, questions: Q.length,
    agg_columns: ['lookups', 'hits', 'stale', 'recomputes', 'avoidable', 'cold', 'reads_recompute', 'unused', 'reads_sub_rederive', 'unused2'],
    agg: Object.fromEntries([...AGG.entries()].sort()), cutoff: Object.fromEntries([...CUT.entries()].sort()),
    changes: Object.fromEntries([...CHANGES.entries()].sort()), empty_answers: Object.fromEntries([...EMPTY.entries()].sort()), dependency_cases: DEPCASE, stale_fact: STALE_FACT, stale_file: STALE_FILE, dep_sizes: sizes,
  };
  fs.writeFileSync(path.join(OUTDIR, 'replay.json'), JSON.stringify(res));
  fs.writeFileSync(path.join(OUTDIR, 'timing.json'), JSON.stringify({ wall_s: (Date.now() - t00) / 1000, per_snapshot: TIMING }));
  console.log('finished', done, 'snapshots in', ((Date.now() - t00) / 1000).toFixed(1), 's; stale by fact policies:', STALE_FACT.length, '; dependency cases:', DEPCASE.length);
});
