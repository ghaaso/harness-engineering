'use strict';
// Stage A for E5: rebuild kge.stage_a_split (Python random.Random(20261114).sample) and the routed specialists'
// known sets on cd806c80; count held-out queries whose true tail no routed specialist knows.
const fs = require('fs'), path = require('path');
const LANE = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const OUT = __dirname;
const SHA = 'cd806c803c4ad8ec198790096d196460789951f0';
const AREAS = ['backend', 'mobile', 'web', 'other'], CO = 'co_changed';
// ---- MT19937 as CPython _randommodule.c
class MT {
  constructor(key) { this.mt = new Uint32Array(624); this.idx = 624; this.initByArray(key); }
  initGenrand(s) { const mt = this.mt; mt[0] = s >>> 0; for (let i = 1; i < 624; i++) { const p = mt[i - 1] ^ (mt[i - 1] >>> 30); mt[i] = (Math.imul(1812433253, p) + i) >>> 0; } this.idx = 624; }
  initByArray(key) {
    this.initGenrand(19650218); const mt = this.mt; let i = 1, j = 0; const kl = key.length;
    for (let k = Math.max(624, kl); k; k--) { const p = mt[i - 1] ^ (mt[i - 1] >>> 30); mt[i] = ((mt[i] ^ Math.imul(p, 1664525)) + key[j] + j) >>> 0; i++; j++; if (i >= 624) { mt[0] = mt[623]; i = 1; } if (j >= kl) j = 0; }
    for (let k = 623; k; k--) { const p = mt[i - 1] ^ (mt[i - 1] >>> 30); mt[i] = ((mt[i] ^ Math.imul(p, 1566083941)) - i) >>> 0; i++; if (i >= 624) { mt[0] = mt[623]; i = 1; } }
    mt[0] = 0x80000000;
  }
  next() {
    const mt = this.mt;
    if (this.idx >= 624) {
      for (let k = 0; k < 624; k++) { const y = (mt[k] & 0x80000000) | (mt[(k + 1) % 624] & 0x7fffffff); mt[k] = mt[(k + 397) % 624] ^ (y >>> 1) ^ ((y & 1) ? 0x9908b0df : 0); }
      this.idx = 0;
    }
    let y = mt[this.idx++]; y ^= y >>> 11; y = (y ^ ((y << 7) & 0x9d2c5680)) >>> 0; y = (y ^ ((y << 15) & 0xefc60000)) >>> 0; y ^= y >>> 18; return y >>> 0;
  }
  getrandbits(k) { return this.next() >>> (32 - k); }
  randbelow(n) { const k = n.toString(2).length; let r = this.getrandbits(k); while (r >= n) r = this.getrandbits(k); return r; }
  random() { const a = this.next() >>> 5, b = this.next() >>> 6; return (a * 67108864 + b) * (1.0 / 9007199254740992); }
}
function sample(rng, pop, k) {
  const n = pop.length; let setsize = 21; if (k > 5) setsize += 4 ** Math.ceil(Math.log(k * 3) / Math.log(4));
  if (n <= setsize) throw new Error('pool branch not implemented');
  const sel = new Set(), res = [];
  for (let i = 0; i < k; i++) { let j = rng.randbelow(n); while (sel.has(j)) j = rng.randbelow(n); sel.add(j); res.push(pop[j]); }
  return res;
}
// self-test of MT against CPython: random.seed(20261114); random.random() is printed for comparison only
const d = path.join(LANE, 'export/graphs0', SHA);
const ents = new Map();
for (const l of fs.readFileSync(path.join(d, 'entities.tsv'), 'utf8').split('\n').slice(1)) { if (!l) continue; const [id, kind, p, code, area] = l.split('\t'); ents.set(id, { kind, area }); }
const tri = fs.readFileSync(path.join(d, 'triples.tsv'), 'utf8').split('\n').slice(1).filter(Boolean).map(l => l.split('\t'));
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const pk = (h, t) => (h < t ? [h, t] : [t, h]);
const pairsSet = new Map(); for (const [h, r, t] of tri) if (r === CO) { const p = pk(h, t); pairsSet.set(p.join('\u0000'), p); }
const pairs = [...pairsSet.values()].sort((a, b) => cmp(a[0], b[0]) || cmp(a[1], b[1]));
const k = Math.round(0.1 * pairs.length);
const held = sample(new MT([20261114]), pairs, k);
const heldKeys = new Set(held.map(p => p.join('\u0000')));
const train = tri.filter(x => !(x[1] === CO && heldKeys.has(pk(x[0], x[2]).join('\u0000'))));
const queries = [...held.map(([a, b]) => [a, b]), ...held.map(([a, b]) => [b, a])].sort((x, y) => cmp(x[0], y[0]) || cmp(x[1], y[1]));
const area = e => (ents.has(e) ? ents.get(e).area : 'other');
const nb = new Map(); const add = (a, b) => { if (!nb.has(a)) nb.set(a, new Set()); nb.get(a).add(b); };
for (const [h, , t] of train) if (h !== t) { add(h, t); add(t, h); }
const known = {}, hasCo = {};
for (const A of AREAS) { const s = new Set(); let co = false; for (const [h, r, t] of train) if (area(h) === A || area(t) === A) { s.add(h); s.add(t); if (r === CO) co = true; } known[A] = s; hasCo[A] = co; }
const fullEnt = new Set(); for (const [h, , t] of tri) { fullEnt.add(h); fullEnt.add(t); }
const trainEnt = new Set(); for (const [h, , t] of train) { trainEnt.add(h); trainEnt.add(t); }
function route(s) { const a1 = area(s); const c = new Map(); for (const n of nb.get(s) || []) { const a = area(n); c.set(a, (c.get(a) || 0) + 1); } c.delete(a1); if (!c.size) return [a1]; const top = Math.max(...c.values()); return [a1, AREAS.find(a => c.get(a) === top)]; }
// true tails per head (all co_changed of the full graph), filtered setting as eval_routed
const trueTails = new Map(); for (const [h, r, t] of tri) if (r === CO) { if (!trueTails.has(h)) trueTails.set(h, new Set()); trueTails.get(h).add(t); }
const rows = []; let unscoredQ = 0, boundSum = 0;
for (const [h, t] of queries) {
  const r = route(h);
  const use = r.filter(A => hasCo[A] && known[A].has(h));
  const tKnown = use.some(A => known[A].has(t));
  // candidates: all entities except other true tails and the head
  const candSet = [...fullEnt].filter(e => e !== h && (e === t || !trueTails.get(h).has(e)));
  const nScored = candSet.filter(e => use.some(A => known[A].has(e))).length;
  const nUn = candSet.length - nScored;
  let rr;
  if (!tKnown) { unscoredQ++; rr = 1 / (nScored + (nUn + 1) / 2); } else rr = 1; // best case for a scored true tail
  boundSum += rr;
  rows.push({ h: h.slice(0, 70), t: t.slice(0, 70), area_h: area(h), area_t: area(t), route: r, use, t_known_to_routed: tKnown, t_in_train_graph: trainEnt.has(t), n_scored: nScored, n_unscored: nUn });
}
const triCount = Object.fromEntries(AREAS.map(A => [A, train.filter(([h, , t]) => area(h) === A || area(t) === A).length]));
const out = { specialist_triples_mine: triCount, train_triples: train.length, pairs: pairs.length, held: held.length, queries: queries.length, entities: fullEnt.size, specialist_has_co: hasCo, specialist_known_sizes: Object.fromEntries(AREAS.map(A => [A, known[A].size])), queries_true_tail_unknown_to_routed: unscoredQ, queries_true_tail_absent_from_train_graph: rows.filter(r => !r.t_in_train_graph).length, mrr_upper_bound_if_every_scored_tail_ranked_first: boundSum / queries.length, cross_area_queries: rows.filter(r => r.area_h !== r.area_t).length, rows };
fs.writeFileSync(path.join(OUT, 'stagea-out.json'), JSON.stringify(out, null, 1));
const { rows: _r, ...summary } = out; console.log(JSON.stringify(summary, null, 1));
console.log(rows.map(r => [r.area_h, r.area_t, r.route.join('>'), r.t_known_to_routed, r.t_in_train_graph].join(' ')).join('\n'));
