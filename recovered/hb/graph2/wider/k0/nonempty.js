'use strict';
// Hit and stale rates restricted to lookups whose fresh answer is not empty (tree lane, kinds 1-8), so
// that stable empty answers do not carry the hit rate. Recomputes the answers of kinds 1-8 at every
// snapshot (deterministic, same programs) and joins them with <run>/lookups_tree.jsonl.gz.
// Usage: node nonempty.js <rundir>   -> <rundir>/nonempty.json
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const C = require('./conf');
const { Snap } = require('./load');
const { Rec } = require('./rec');
const { P } = require('./programs');

const RUN = path.resolve(process.argv[2] || path.join(C.OUT, 'final1'));
const R = JSON.parse(fs.readFileSync(path.join(RUN, 'replay.json'), 'utf8'));
const tree = JSON.parse(fs.readFileSync(path.join(C.DATA, 'tree.json'), 'utf8'));
const Q = JSON.parse(fs.readFileSync(path.join(C.DATA, 'questions.json'), 'utf8')).questions.filter((q) => q.kind !== 'completion');
const isEmpty = (a) => (Array.isArray(a) ? a.length === 0 : Object.values(a).every((v) => Array.isArray(v) && v.length === 0));
const raw = zlib.gunzipSync(fs.readFileSync(path.join(RUN, 'lookups_tree.jsonl.gz'))).toString().split('\n').filter(Boolean).map(JSON.parse);
const want = new Map(); // sha10 -> Set qid
for (const r of raw) { if (r.q.startsWith('c_')) continue; if (!want.has(r.s)) want.set(r.s, new Set()); want.get(r.s).add(r.q); }
const empty = new Map();
const qById = new Map(Q.map((q) => [q.qid, q]));
for (const sha of tree.order) {
  const s10 = sha.slice(0, 10);
  if (!want.has(s10)) continue;
  const S = new Snap(sha);
  for (const qid of want.get(s10)) empty.set(s10 + '|' + qid, isEmpty(P[qById.get(qid).kind](new Rec(S), qById.get(qid).target)));
}
const POL = R.policies;
const agg = {};
for (const p of POL) agg[p] = { nonempty: { lookups: 0, served: 0, stale: 0 }, empty: { lookups: 0, served: 0, stale: 0 } };
const byKind = {};
for (const r of raw) {
  if (r.q.startsWith('c_')) continue;
  const e = empty.get(r.s + '|' + r.q) ? 'empty' : 'nonempty';
  const k = qById.get(r.q).kind;
  if (!byKind[k]) { byKind[k] = {}; for (const p of POL) byKind[k][p] = { lookups: 0, served: 0, stale: 0 }; }
  POL.forEach((p, i) => {
    const c = r.o[i]; if (c === 'C') return;
    agg[p][e].lookups++; if (c === 'H' || c === 'S') agg[p][e].served++; if (c === 'S') agg[p][e].stale++;
    if (e === 'nonempty') { byKind[k][p].lookups++; if (c === 'H' || c === 'S') byKind[k][p].served++; if (c === 'S') byKind[k][p].stale++; }
  });
}
const r4 = (x) => Math.round(x * 1e4) / 1e4;
for (const p of POL) for (const e of ['nonempty', 'empty']) { const a = agg[p][e]; a.hit_rate = a.lookups ? r4(a.served / a.lookups) : null; a.stale_per_served = a.served ? r4(a.stale / a.served) : null; }
for (const k of Object.keys(byKind)) for (const p of POL) { const a = byKind[k][p]; a.hit_rate = a.lookups ? r4(a.served / a.lookups) : null; a.stale_per_served = a.served ? r4(a.stale / a.served) : null; }
fs.writeFileSync(path.join(RUN, 'nonempty.json'), JSON.stringify({ note: 'tree lane, kinds 1-8, cold lookups excluded; empty = the fresh answer at that snapshot is empty', all_kinds: agg, nonempty_by_kind: byKind }, null, 1));
for (const p of POL) console.log(p, JSON.stringify(agg[p]));
