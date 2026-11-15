'use strict';
// Equivalence check of the interleaved bench's answers (not a timing). Reads <BENCH_OUT>/units/*.json.
//   node bench/icheck.js      -> <BENCH_OUT>/check.json
// - primary, S1, base: every engine's warm answer (every pass, every thread setting) against the reference
//   arm (arms/reference, plain JavaScript; addendum 4 item 5 "equivalence check only"), by hash: order =
//   (node, hop) in rank order and list length; score9 = plus the score rounded to 1e-9; exact = plus the
//   exact score.
// - every cold answer against the warm answer of the same pass, engine, class, thread setting and seed.
// - TQ: answers equal across engines, thread settings and passes. LadybugDB S2 (no reference: a native
//   mode): equal across thread settings and passes.
// - the one-file update: fingerprints and answers after the updates (from the unit files).
const fs = require('fs');
const path = require('path');
const L = require('./lib');

const plan = L.readPlan();
const dir = path.join(L.OUT, 'units');
const units = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^p\d+-(tune|frozen)\.json$/.test(f)).sort().map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))) : [];
const res = { generated_at: new Date().toISOString(), plan_hash: plan.plan_hash, units: units.map((u) => u.unit), reference: {}, engines: {}, cold: {}, tq: null, s2: {}, update: {}, problems: [] };
const { open } = require('../arms/reference/arm');
const warm = (u) => u.blocks.filter((b) => b.spec.type === 'warm');

for (const graph of ['tune', 'frozen']) {
  const us = units.filter((u) => u.graph === graph); if (!us.length) continue;
  const n = Math.max(...us.map((u) => u.config.seeds));
  const { G } = L.graphFacts(plan.graphs[graph].sha);
  const ref = open(G);
  for (const key of ['primary', 'S1', 'base']) {
    const cls = plan.classes.find((c) => c.key === key);
    const t = L.now();
    const hs = plan.graphs[graph].seeds.slice(0, n).map((x) => L.rankedHashes(ref.rank(x.ids, cls.config, x.seed).ranked));
    res.reference[graph + '/' + key] = { seeds: hs.length, ms: L.r3(L.now() - t) };
    for (const u of us) for (const b of warm(u).filter((x) => x.spec.cls === key)) {
      const k = `${graph}/${key}@T${b.spec.T}`;
      const r = ((res.engines[b.spec.engine] = res.engines[b.spec.engine] || {})[k] = res.engines[b.spec.engine][k] || { compared: 0, order_equal: 0, score9_equal: 0, exact_equal: 0, passes: [] });
      if (!r.passes.includes(u.pass)) r.passes.push(u.pass);
      for (const it of b.res.items) {
        const h = it.hash; const g = hs[it.i]; r.compared++;
        if (h.order === g.order && h.n === g.n) r.order_equal++; if (h.score9 === g.score9) r.score9_equal++; if (h.exact === g.exact) r.exact_equal++;
      }
    }
  }
  // cold against warm, per pass
  for (const u of us) {
    for (const b of u.blocks.filter((x) => x.spec.type === 'cold')) {
      const k = `${b.spec.engine} ${graph}/${b.spec.cls}@T${b.spec.T}`;
      const r = (res.cold[k] = res.cold[k] || { compared: 0, equal: 0 });
      for (const row of b.res.rows) {
        const w = warm(u).find((x) => x.spec.engine === b.spec.engine && x.spec.cls === b.spec.cls && x.spec.T === b.spec.T && row.i >= x.spec.from && row.i < x.spec.to);
        const it = w && w.res.items.find((y) => y.i === row.i); if (!it) continue;
        r.compared++; if (JSON.stringify(it.hash) === JSON.stringify(row.hash)) r.equal++;
      }
    }
    for (const [e, c] of Object.entries(u.update ? u.update.check : {})) res.update[`${u.unit} ${e}`] = { fingerprint_differences: c.fingerprint_differences.length, known_engine_effects: c.known_engine_effects.length, answers_compared: c.answers_compared, answers_differing: c.answers_differing.length };
  }
  // LadybugDB S2 across passes and thread settings
  const s2 = us.flatMap((u) => warm(u).filter((x) => x.spec.cls === 'S2').flatMap((b) => b.res.items.map((it) => [it.i, it.hash.exact, u.pass, b.spec.T])));
  if (s2.length) { const first = new Map(); let diff = 0; for (const [i, h] of s2) { if (!first.has(i)) first.set(i, h); else if (first.get(i) !== h) diff++; } res.s2[graph] = { answers: s2.length, seeds: first.size, differing_from_first: diff }; }
}
// TQ across engines, thread settings and passes
const tq = units.filter((u) => u.graph === 'frozen').flatMap((u) => warm(u).filter((x) => x.spec.cls === 'tq').flatMap((b) => b.res.items.map((it) => [it.i, it.hash.exact, b.spec.engine])));
if (tq.length) { const first = new Map(); let diff = 0; for (const [i, h] of tq) { if (!first.has(i)) first.set(i, h); else if (first.get(i) !== h) diff++; } res.tq = { answers: tq.length, questions: first.size, engines: [...new Set(tq.map((x) => x[2]))], differing_from_first: diff }; }

for (const [e, m] of Object.entries(res.engines)) for (const [k, r] of Object.entries(m)) if (r.order_equal !== r.compared || r.score9_equal !== r.compared) res.problems.push(`${e} ${k}: ${r.compared - r.score9_equal} of ${r.compared} answers differ from the reference`);
for (const [k, r] of Object.entries(res.cold)) if (r.equal !== r.compared) res.problems.push(`cold ${k}: ${r.compared - r.equal} of ${r.compared} differ from warm`);
if (res.tq && res.tq.differing_from_first) res.problems.push(`tq: ${res.tq.differing_from_first} answers differ across engines, threads or passes`);
for (const [g, s] of Object.entries(res.s2)) if (s.differing_from_first) res.problems.push(`ladybug S2 ${g}: ${s.differing_from_first} answers differ across threads or passes`);
for (const [k, u] of Object.entries(res.update)) if (u.fingerprint_differences || u.answers_differing) res.problems.push(`update ${k}: ${u.fingerprint_differences} fingerprint differences, ${u.answers_differing} answers differing`);
fs.writeFileSync(path.join(L.OUT, 'check.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify({ units: res.units.length, problems: res.problems }));
