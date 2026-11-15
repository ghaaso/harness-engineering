'use strict';
// Equivalence check of the bench answers (not a timing): the reference arm (arms/reference, plain
// JavaScript, addendum 4 item 5: "for the equivalence check only") ranks the same seeds with the
// primary, S1 and the 2-hop base, and every engine's answers (warm pass, every thread setting) are
// compared with it by hash: order = (node, hop) in rank order; score9 = plus the score rounded to 1e-9
// (the cross-check tolerance); exact = plus the exact score. LadybugDB S2 has no reference (a native
// mode): its answers are compared across thread settings. TQ answers are compared across the engines.
//   node bench/check.js      -> <BENCH_OUT>/check.json
const fs = require('fs');
const path = require('path');
const L = require('./lib');

const ENGINES = ['relational', 'ladybug', 'duckpgq'];

function main() {
  const plan = L.readPlan();
  const res = { generated_at: new Date().toISOString(), plan_hash: plan.plan_hash, engines: {}, reference: {}, tq_across_engines: null, s2_across_threads: {} };
  const J = {};
  for (const e of ENGINES) { const f = path.join(L.OUT, e + '.json'); if (fs.existsSync(f)) J[e] = JSON.parse(fs.readFileSync(f, 'utf8')); }
  const { open } = require('../arms/reference/arm');
  for (const graph of ['tune', 'frozen']) {
    const { G } = L.graphFacts(plan.graphs[graph].sha);
    const ref = open(G);
    const n = Math.max(0, ...Object.values(J).map((j) => j.run.seeds));
    for (const key of ['primary', 'S1', 'base']) {
      const cls = plan.classes.find((c) => c.key === key);
      const items = plan.graphs[graph].seeds.slice(0, n);
      const t = L.now();
      const hs = items.map((x) => L.rankedHashes(ref.rank(x.ids, cls.config, x.seed).ranked));
      res.reference[graph + '/' + key] = { seeds: items.length, ms: L.r3(L.now() - t) };
      for (const [e, j] of Object.entries(J)) {
        const c = j.classes[graph + '/' + key]; if (!c) continue;
        for (const [t2, w] of Object.entries(c.by_threads)) {
          const r = { seeds: w.hashes.length, order_equal: 0, score9_equal: 0, exact_equal: 0, cold_samples_equal_to_warm: w.cold.hashes_equal_warm };
          w.hashes.forEach((h, i) => { if (h.order === hs[i].order && h.n === hs[i].n) r.order_equal++; if (h.score9 === hs[i].score9) r.score9_equal++; if (h.exact === hs[i].exact) r.exact_equal++; });
          (res.engines[e] = res.engines[e] || {})[graph + '/' + key + '@' + t2] = r;
        }
      }
    }
    const lb = J.ladybug && J.ladybug.classes[graph + '/S2'];
    if (lb) {
      const ts = Object.keys(lb.by_threads); const a = lb.by_threads[ts[0]].hashes;
      res.s2_across_threads[graph] = { threads: ts, seeds: a.length, exact_equal_all: ts.every((t) => lb.by_threads[t].hashes.every((h, i) => h.exact === a[i].exact)), cold_samples_equal_to_warm: ts.every((t) => lb.by_threads[t].cold.hashes_equal_warm) };
    }
  }
  const tq = Object.entries(J).map(([e, j]) => [e, j.classes['frozen/tq']]).filter(([, c]) => c);
  if (tq.length) {
    const base = Object.values(tq[0][1].by_threads)[0].hashes;
    res.tq_across_engines = { questions: base.length, engines: tq.map(([e]) => e), all_equal: tq.every(([, c]) => Object.values(c.by_threads).every((w) => w.hashes.every((h, i) => h.exact === base[i].exact))) };
  }
  const bad = [];
  for (const [e, m] of Object.entries(res.engines)) for (const [k, r] of Object.entries(m)) if (r.score9_equal !== r.seeds || r.order_equal !== r.seeds || !r.cold_samples_equal_to_warm) bad.push(e + ' ' + k);
  res.problems = bad;
  if (res.tq_across_engines && !res.tq_across_engines.all_equal) bad.push('tq answers differ across engines');
  for (const [g, s] of Object.entries(res.s2_across_threads)) if (!s.exact_equal_all || !s.cold_samples_equal_to_warm) bad.push('ladybug S2 ' + g + ' differs across thread settings or cold/warm');
  fs.writeFileSync(path.join(L.OUT, 'check.json'), JSON.stringify(res, null, 1));
  console.log(JSON.stringify({ problems: bad, engines: Object.keys(J) }));
}

main();
