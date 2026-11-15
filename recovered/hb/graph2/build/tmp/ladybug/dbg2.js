// How many walks do the metapath patterns enumerate, and what do they cost?
const S = require('/build/arms/ladybug/store');
const { LbGraph } = require('/build/arms/ladybug/lb');
const { branch } = require('/build/arms/ladybug/pattern');
const { loadFacts } = require('/build/arms/common/facts');
const H = require('/build/arms/common/harness');
const C = require('/build/arms/common/config');
const RS = require('/build/arms/relational/sweep');
const { randomConfigs, extraConfigs } = require('/build/arms/ladybug/crosscheck');
const tasks = H.loadTasks(['T1'], 'tune').slice(0, 6);
const G = loadFacts(tasks[0].parent);
const st = S.open(G, '/store/ladybug', { threads: 1, bufferPool: Number(process.env.BP || 256) * 1048576 });
const lb = new LbGraph(st, G);
const cfgs = [{ name: 'stage1', cfg: C.normalise(RS.STAGE1.find((c) => c.traversal.mode === 'metapath')) }, ...[...randomConfigs(), ...extraConfigs()].filter((c) => c.cfg.traversal.mode === 'metapath')];
for (const c of cfgs) {
  for (const t of tasks.slice(0, 3)) {
    const sm = H.mapSeed(G, t.seed);
    const tr = c.cfg.traversal;
    for (let j = 0; j < tr.steps.length; j++) {
      const b = branch(lb, tr.steps, j, c.cfg.minConf, null, tr.hops);
      if (!b) continue;
      const cnt = b.arcs.replace(/RETURN .*$/, 'RETURN count(*) AS n');
      const t0 = Date.now();
      try { const n = lb.q(cnt, { S: sm.ids })[0].n; console.log(c.name, t.id, 'step', j, 'walks', String(n), Date.now() - t0, 'ms'); } catch (e) { console.log(c.name, t.id, 'step', j, 'ERR', String(e.message).slice(0, 60), Date.now() - t0, 'ms'); }
    }
  }
}
console.log(JSON.stringify(cfgs.map((c) => [c.name, c.cfg.traversal.steps.map((s) => [s.classes.join('+') + (s.kinds.length ? '/' + s.kinds.join('+') : ''), s.dir, s.min, s.max])])));
process.exit(0);
