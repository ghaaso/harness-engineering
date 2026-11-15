'use strict';
// dev test of the LB_COMM_DRAW switch on one parent, priors in a scratch folder (LB_PRIORS_DIR)
const fs = require('fs');
const path = require('path');
const H = require('/build/arms/common/harness');
const { graphFor } = require('/build/arms/common/arms');
const S = require('/build/arms/ladybug/store');
const parent = H.loadTasks(['T1'], 'tune')[0].parent;
const G = graphFor(parent);
const out = [];
for (const draw of [0, 1, 2, 1]) {
  const dir = '/tmp/dt/d' + draw + '-' + out.length;
  const meta = S.build(G, dir, { commDraw: draw });
  const f = JSON.parse(fs.readFileSync(path.join(S.PRIORS_DIR, path.basename(meta.comm.file)), 'utf8'));
  out.push({ draw, comm: meta.comm, file_communities: f.communities, ari_vs_draw0: f.ari_vs_draw0, priors_ms: meta.build.native_priors_ms });
}
console.log(JSON.stringify(out, null, 1));
