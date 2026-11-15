'use strict';
// Currency check of the stored stage-1 answer files (step 2): re-run a seeded sample of
// (configuration, TUNE task) pairs from each arm's own stage-1 list on the current facts, in fresh
// stores, and compare the packed answer (items, budgets, units, seeds, ranked_sha) with the stored
// record. Extension entries are included for the graph arms (they run only on their own arm).
//   node replay.js [--per 24] [--seed 20261121] [--out /out/gate]
const fs = require('fs');
const path = require('path');
const B = process.env.GT_BUILD || '/build';
const H = require(B + '/arms/common/harness');
const { graphFor, openArm } = require(B + '/arms/common/arms');
const argv = process.argv.slice(2); const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const PER = Number(opt('per', 24)); const OUT = opt('out', '/out/gate');
let a0 = Number(opt('seed', 20261121)) >>> 0;
const r = () => { a0 = (a0 + 0x6D2B79F5) >>> 0; let t = a0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const ARMS = (opt('arms', 'relational,search,ladybug,duckpgq,floor-dir,floor-co')).split(',');
const tasks = H.loadTasks(['T1', 'T1x', 'T2'], 'tune');
const key = (a) => JSON.stringify({ items: a.items, budgets: a.budgets, n_units: a.n_units, n_head: a.n_head, seeds: a.seeds, seed_match: a.seed_match, n_ranked: a.n_ranked, ranked_sha: a.ranked_sha, lookups_pad: a.lookups_pad });
(async () => {
  const res = {}; const t0 = Date.now();
  for (const arm of ARMS) {
    const L = H.loadArmList(arm, 1, false).list;
    const pairs = [];
    for (let k = 0; k < PER; k++) pairs.push({ x: L[Math.floor(r() * L.length)], t: tasks[Math.floor(r() * tasks.length)] });
    const R = res[arm] = { pairs: pairs.length, identical: 0, differ: 0, errors: 0, examples: [] };
    const stored = new Map();
    for (const p of pairs) {
      const f = path.join(B, 'results', arm, 'tune', p.x.hash + '.' + p.t.set + '.jsonl.gz');
      if (!stored.has(f)) stored.set(f, new Map(H.readGzJsonl(f).map((a) => [a.id, a])));
      p.stored = stored.get(f).get(p.t.id);
    }
    stored.clear();
    const byParent = new Map(); for (const p of pairs) { if (!byParent.has(p.t.parent)) byParent.set(p.t.parent, []); byParent.get(p.t.parent).push(p); }
    for (const parent of [...byParent.keys()].sort()) {
      const G = graphFor(parent); const A = await openArm(arm, G);
      for (const p of byParent.get(parent)) {
        const sm = H.mapSeed(G, p.t.seed);
        try {
          const y = sm.ids.length || arm.startsWith('floor') ? H.normRank(await A.rank(sm.ids, p.x.cfg, p.t.seed)) : { ranked: [] };
          const a = H.answer(G, p.t, sm, y, p.x.cfg, arm, 0);
          if (key(a) === key(p.stored)) R.identical++; else { R.differ++; if (R.examples.length < 5) R.examples.push({ name: p.x.name, task: p.t.id, ranked_sha: [a.ranked_sha, p.stored.ranked_sha], n_ranked: [a.n_ranked, p.stored.n_ranked] }); }
        } catch (e) { R.errors++; if (R.examples.length < 5) R.examples.push({ name: p.x.name, task: p.t.id, error: String(e.message || e).slice(0, 200) }); }
      }
      await A.close();
    }
    process.stderr.write(arm + ' ' + JSON.stringify({ identical: R.identical, differ: R.differ, errors: R.errors }) + ' ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s\n');
  }
  fs.writeFileSync(path.join(OUT, 'replay.json'), JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res));
})().catch((e) => { console.error(e); process.exit(1); });
