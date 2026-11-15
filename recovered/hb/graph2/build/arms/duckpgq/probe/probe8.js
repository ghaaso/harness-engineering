'use strict';
// Engine probe 8: component sizes of the native weakly_connected_component() over hub-free projections
// (to choose the community-prior parameters before any score is seen), and native pagerank() top nodes.
const P = require('../../common/paths');
const { graphFor, openArm } = require('../../common/arms');
const { CLASSES } = require('../../common/edgeclasses');
(async () => {
  const G = graphFor(process.env.PARENT || P.FROZEN);
  const a = await openArm('duckpgq', G);
  const g = a.raw.graph;
  const sets = {
    code: ['structure', 'imports', 'calls', 'http', 'tests', 'data', 'config'],
    code_nostruct: ['imports', 'calls', 'http', 'tests', 'data', 'config'],
    sic: ['structure', 'imports', 'calls'],
    calls_http_data: ['calls', 'http', 'data'],
  };
  console.log('nodes', G.nodes.length);
  for (const [nm, cl] of Object.entries(sets)) {
    for (const k of [3, 5, 10, 20]) {
      const w = await g.nativeWcc(cl.map((c) => CLASSES.indexOf(c)), 0.5, k);
      const r = await g.all(`SELECT count(*) AS comps, max(n) AS biggest, sum(CASE WHEN n = 1 THEN 1 ELSE 0 END) AS singletons,
        quantile_disc(n, 0.5) AS med FROM (SELECT comp, count(*) AS n FROM ${w} GROUP BY comp)`);
      console.log(nm, 'k', k, JSON.stringify(r[0]));
    }
  }
  await a.close(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
