// Recompute the stage-A hold-out (Python random.Random(20261114).sample over sorted co_changed pairs),
// check it against the training-set size, and recompute PPR's and CO's filtered MRR as refs.py does.
const fs = require('fs'), path = require('path');
const LANE = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const SHA = 'cd806c803c4ad8ec198790096d196460789951f0';
const OUT = path.join(__dirname, 'refs_recompute.out.json');

// ---- MT19937 as CPython
class MT {
  constructor() { this.mt = new Uint32Array(624); this.i = 625; }
  initGenrand(s) { const mt = this.mt; mt[0] = s >>> 0; for (let i = 1; i < 624; i++) { const p = mt[i - 1] ^ (mt[i - 1] >>> 30); mt[i] = (Math.imul(1812433253, p) + i) >>> 0; } this.i = 624; }
  initByArray(key) {
    this.initGenrand(19650218); const mt = this.mt; let i = 1, j = 0; const N = 624;
    for (let k = Math.max(N, key.length); k; k--) {
      const p = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = ((mt[i] ^ Math.imul(p, 1664525)) + key[j] + j) >>> 0; i++; j++;
      if (i >= N) { mt[0] = mt[N - 1]; i = 1; } if (j >= key.length) j = 0;
    }
    for (let k = N - 1; k; k--) {
      const p = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = ((mt[i] ^ Math.imul(p, 1566083941)) - i) >>> 0; i++;
      if (i >= N) { mt[0] = mt[N - 1]; i = 1; }
    }
    mt[0] = 0x80000000;
  }
  u32() {
    const mt = this.mt; if (this.i >= 624) {
      for (let k = 0; k < 624; k++) { const y = (mt[k] & 0x80000000) | (mt[(k + 1) % 624] & 0x7fffffff); mt[k] = mt[(k + 397) % 624] ^ (y >>> 1) ^ ((y & 1) ? 0x9908b0df : 0); }
      this.i = 0;
    }
    let y = mt[this.i++]; y ^= y >>> 11; y ^= (y << 7) & 0x9d2c5680; y ^= (y << 15) & 0xefc60000; y ^= y >>> 18; return y >>> 0;
  }
  getrandbits(k) { return this.u32() >>> (32 - k); }
  randbelow(n) { const k = n.toString(2).length; let r = this.getrandbits(k); while (r >= n) r = this.getrandbits(k); return r; }
}
function pySample(pop, k, seed) {
  const r = new MT(); r.initByArray([seed]);
  const n = pop.length; let setsize = 21; if (k > 5) setsize += 4 ** Math.ceil(Math.log(k * 3) / Math.log(4));
  if (n <= setsize) throw new Error('pool branch not implemented');
  const sel = new Set(), res = [];
  for (let i = 0; i < k; i++) { let j = r.randbelow(n); while (sel.has(j)) j = r.randbelow(n); sel.add(j); res.push(pop[j]); }
  return res;
}
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// ---- graph
const G0 = path.join(LANE, 'export/graphs0', SHA), GP = path.join(LANE, 'export/graphs', SHA);
const tsv = p => fs.readFileSync(p, 'utf8').split('\n').slice(1).filter(l => l.length).map(l => l.split('\t'));
const ents = {}; for (const [i, kind, p, code, area] of tsv(path.join(G0, 'entities.tsv'))) ents[i] = [kind, p, area, code === '1'];
const tri = tsv(path.join(G0, 'triples.tsv'));
const CO = 'co_changed';
const pk = (h, t) => (h < t ? [h, t] : [t, h]);
const pairSet = new Map(); for (const [h, r, t] of tri) if (r === CO) { const k = pk(h, t); pairSet.set(k.join('\u0000'), k); }
const pairs = [...pairSet.values()].sort((a, b) => cmp(a[0], b[0]) || cmp(a[1], b[1]));
const k = Math.round(0.1 * pairs.length); // python round(16.2)=16
const held = pySample(pairs, k, 20261114);
const heldKeys = new Set(held.map(p => p.join('\u0000')));
const train = tri.filter(([h, r, t]) => !(r === CO && heldKeys.has(pk(h, t).join('\u0000'))));
const queries = [...held.map(([a, b]) => [a, b]), ...held.map(([a, b]) => [b, a])].sort((x, y) => cmp(x[0], y[0]) || cmp(x[1], y[1]));
// reciprocal check: build_tf adds (t, r__inv, h) from train only
const recipHeld = train.filter(([h, r, t]) => r === CO && heldKeys.has(pk(h, t).join('\u0000'))).length;
// other relations between held pairs (not a leak, but report)
const otherRel = {}; for (const [h, r, t] of train) if (heldKeys.has(pk(h, t).join('\u0000'))) otherRel[r] = (otherRel[r] || 0) + 1;

const fullEnt = [...new Set(tri.flatMap(([h, , t]) => [h, t]))].sort(cmp);
const idx = new Map(fullEnt.map((e, i) => [e, i]));
const trueTails = new Map(); for (const [h, r, t] of tri) if (r === CO) { if (!trueTails.has(h)) trueTails.set(h, new Set()); trueTails.get(h).add(t); }
const coKinds = [...new Set(tri.filter(x => x[1] === CO).map(x => ents[x[0]][0]))].sort();

// ---- pilot graph
const nb = new Map(); const add = (a, b) => { if (!nb.has(a)) nb.set(a, new Set()); nb.get(a).add(b); };
for (const [a, b] of tsv(path.join(GP, 'pilot_graph.tsv'))) { add(a, b); add(b, a); }
const keys = [...nb.keys()], pidx = new Map(keys.map((x, i) => [x, i]));
const src = [], dst = []; for (const a of keys) for (const b of nb.get(a)) { src.push(pidx.get(a)); dst.push(pidx.get(b)); }
const deg = keys.map(x => nb.get(x).size); const w = src.map(s => 1 / Math.max(deg[s], 1));
function ppr(sp) {
  const S = 'F:' + sp; if (!pidx.has(S)) return null; const N = keys.length;
  const e0 = new Float64Array(N); e0[pidx.get(S)] = 1; let pr = Float64Array.from(e0);
  for (let it = 0; it < 25; it++) { const acc = new Float64Array(N); for (let q = 0; q < src.length; q++) acc[dst[q]] += pr[src[q]] * w[q]; const nx = new Float64Array(N); for (let i = 0; i < N; i++) nx[i] = 0.15 * e0[i] + 0.85 * acc[i]; pr = nx; }
  return pr;
}
const co = new Map(); for (const [a, b, conf] of tsv(path.join(GP, 'pilot_co.tsv'))) { for (const [x, y] of [[a, b], [b, a]]) { if (!co.has(x)) co.set(x, new Map()); co.get(x).set(y, parseFloat(conf)); } }
const heldPaths = new Set(held.map(([a, b]) => [ents[a][1], ents[b][1]].sort(cmp).join('\u0000')));
function scores(which, h) {
  const sp = ents[h][1]; const pr = which === 'PPR' ? ppr(sp) : null;
  return fullEnt.map(e => {
    const [kind, p] = ents[e]; if (!coKinds.includes(kind)) return NaN;
    if (which === 'PPR') { const kk = 'F:' + p; return Math.fround(pr && pidx.has(kk) ? pr[pidx.get(kk)] : 0.0); }
    const v = (co.get('F:' + sp) || new Map()).get('F:' + p);
    if (v && v > 0 && !heldPaths.has([sp, p].sort(cmp).join('\u0000'))) return Math.fround(v); return NaN;
  });
}
function rrank(S, ti, mask) {
  let nS = 0, nU = 0, gt = 0, eq = 0; const st = S[ti];
  for (let i = 0; i < S.length; i++) { if (!mask[i]) continue; if (Number.isNaN(S[i])) { nU++; continue; } nS++; if (!Number.isNaN(st)) { if (S[i] > st) gt++; else if (S[i] === st) eq++; } }
  if (Number.isNaN(st)) return nS + (nU + 1) / 2; return gt + 1 + (eq - 1) / 2;
}
function mrr(which, fileOnly) {
  const rr = [];
  for (const [h, t] of queries) {
    const S = scores(which, h);
    const m = fullEnt.map(e => (fileOnly ? coKinds.includes((ents[e] || [''])[0]) : true));
    for (const o of trueTails.get(h)) if (o !== t && idx.has(o)) m[idx.get(o)] = false;
    if (idx.has(h)) m[idx.get(h)] = false;
    rr.push(1 / rrank(S, idx.get(t), m));
  }
  return rr.reduce((a, b) => a + b, 0) / rr.length;
}
const out = {
  co_triples: tri.filter(x => x[1] === CO).length, co_pairs: pairs.length, held_pairs: held.length, queries: queries.length,
  train_triples: train.length, total_triples: tri.length, entities_in_triples: fullEnt.length, co_kinds: coKinds,
  held_co_triples_left_in_train: recipHeld, other_relations_between_held_pairs_in_train: otherRel,
  held: held.map(([a, b]) => [a, b]),
  held_pair_paths_in_pilot_co: held.filter(([a, b]) => (co.get('F:' + ents[a][1]) || new Map()).has('F:' + ents[b][1])).length,
  PPR: { all: mrr('PPR', false), file_doc: mrr('PPR', true) }, CO: { all: mrr('CO', false), file_doc: mrr('CO', true) },
  refs_json: JSON.parse(fs.readFileSync(path.join(LANE, 'train/stageA/refs.json'), 'utf8')),
};
// CO with the held-out pairs NOT removed (what CO would score if the pair were visible)
heldPaths.clear(); out.CO_if_held_pairs_visible = { all: mrr('CO', false), file_doc: mrr('CO', true) };
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
