'use strict';
// Development check: an asynchronous arm (promise-returning open/rank/close) goes through the harness
// path (openArm, normRank, answer) and is equivalent to the reference; plus reach sizes of the
// metapath configurations, so a 0-mismatch cross-check is not a check of empty lists.
const path = require('path');
const C = path.join(__dirname, '..', '..', 'arms', 'common');
const { graphFor, openArm, register } = require(path.join(C, 'arms'));
const H = require(path.join(C, 'harness'));
const E = require(path.join(C, 'equiv'));
const CF = require(path.join(C, 'config'));
const RS = require(path.join(C, '..', 'relational', 'sweep'));
const ref = require(path.join(C, '..', 'reference', 'arm'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
register('asyncref', { open: async (G) => { await sleep(5); const a = ref.open(G); return {
  rank: async (s, c, seed) => { await sleep(1); const r = a.rank(s, c, seed); return { ranked: [...r.ranked].reverse().sort((x, y) => (y.score ?? 0) - (x.score ?? 0) || (x.score === null ? 0 : 0)), engine_ms: 1.5 }; },
  close: async () => { await sleep(1); } }; } });
(async () => {
  const tasks = H.loadTasks(['T1'], 'tune').filter((t) => ['T1-0144', 'T1-0145', 'T1-0364'].includes(t.id));
  const cfgs = RS.STAGE1.filter((c) => ['base', 'rank=degnorm', 'metapath=defs>code1-2>tests'].includes(c.name)).map((c) => ({ name: c.name, cfg: CF.normalise(c) }));
  cfgs.push({ name: 'emit=end', cfg: CF.normalise({ ...RS.BASE, traversal: { mode: 'metapath', hops: null, emit: 'end', steps: [{ classes: ['structure'], dir: 'out', min: 0, max: 1 }, { kinds: ['calls', 'depends_injects'], dir: 'in', min: 1, max: 3 }, { kinds: ['registers_route'], dir: 'in', min: 0, max: 1 }] } }) });
  for (const t of tasks) {
    const G = graphFor(t.parent);
    const A = await openArm('asyncref', G); const R = await openArm('reference', G);
    const sm = H.mapSeed(G, t.seed);
    for (const c of cfgs) {
      const a = H.normRank(await A.rank(sm.ids, c.cfg, t.seed)); const b = H.normRank(await R.rank(sm.ids, c.cfg, t.seed));
      const chk = R.raw.ref.explainChecker(sm.ids, c.cfg);
      const ev = E.equivalent(a.ranked, b.ranked, chk, chk);
      const ans = H.answer(G, t, sm, a, c.cfg, 'asyncref', 3);
      console.log(t.id, c.name.padEnd(30), 'reach', b.ranked.length, 'equiv', ev.ok ? 'yes' : ev.reason, 'engine_ms', ans.engine_ms, 'strict', E.strict(a.ranked, b.ranked));
    }
    await A.close(); await R.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
