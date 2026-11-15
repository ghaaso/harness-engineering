'use strict';
// Development check of this arm's own stage-1 list: every configuration runs without error; specified
// ones are compared with the reference arm; extensions and native variants are only timed.
//   node arms/duckpgq/dev/try2.js [limit]   (env FROM = first task index, STEP = take every n-th task)
const C = require('../../common/config');
const H = require('../../common/harness');
const E = require('../../common/equiv');
const { graphFor, openArm } = require('../../common/arms');
const L = require('../sweep');

(async () => {
  const limit = Number(process.argv[2] || 4);
  let tasks = H.loadTasks(['T1', 'T2'], 'tune');
  const step = Number(process.env.STEP || 1);
  tasks = tasks.slice(Number(process.env.FROM || 0)).filter((_, i) => i % step === 0).slice(0, limit);
  const list = L.STAGE1.filter((c) => !process.env.ONLY || c.name.includes(process.env.ONLY)).map((c) => ({ name: c.name, cfg: C.normalise(c) }));
  const isSpec = (cfg) => { try { C.specOnly(cfg); return true; } catch (e) { return false; } };
  let a = null; let r = null; let parent = null; let G = null; let bad = 0; let n = 0; let errs = 0;
  const times = {}; const sizes = {};
  for (const t of tasks) {
    if (t.parent !== parent) { if (a) await a.close(); parent = t.parent; G = graphFor(parent); a = await openArm('duckpgq', G); r = await openArm('reference', G); }
    const sm = H.mapSeed(G, t.seed);
    if (!sm.ids.length) continue;
    for (const c of list) {
      let x;
      try { x = H.normRank(await a.rank(sm.ids, c.cfg, t.seed)); } catch (e) { errs++; console.log('ERROR', t.id, c.name, String(e.message).slice(0, 500)); continue; }
      (times[c.name] = times[c.name] || []).push(x.engine_ms); (sizes[c.name] = sizes[c.name] || []).push(x.ranked.length);
      if (!isSpec(c.cfg)) continue;
      const y = H.normRank(await r.rank(sm.ids, c.cfg, t.seed));
      const chk = r.raw.ref.explainChecker(sm.ids, c.cfg);
      const ev = E.equivalent(x.ranked, y.ranked, chk, chk); n++;
      if (!ev.ok) { bad++; console.log('MISMATCH', t.id, c.name, JSON.stringify(ev)); }
    }
  }
  if (a) await a.close();
  for (const [k, v] of Object.entries(times)) {
    v.sort((p, q) => p - q); const s = sizes[k].slice().sort((p, q) => p - q);
    console.log('time', k, '| p50', v[Math.floor(v.length / 2)].toFixed(1), 'max', v[v.length - 1].toFixed(1), '| ranked p50', s[Math.floor(s.length / 2)], 'max', s[s.length - 1]);
  }
  console.log('tasks', tasks.length, 'compared', n, 'bad', bad, 'errors', errs);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
