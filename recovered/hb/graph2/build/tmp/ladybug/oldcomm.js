'use strict';
// For each old LB5 store on the volume: its stored Louvain grouping against the new prior file (ARI),
// to explain the x_comm changes between the previous and the current stage-1 answers. Read-only.
const fs = require('fs');
const path = require('path');
const lbug = require('@ladybugdb/core');
const S = require('/build/arms/ladybug/store');
const root = '/store/ladybug';
const out = [];
for (const f of fs.readdirSync(root).filter((x) => x.endsWith('.meta.json'))) {
  const meta = JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
  if (meta.store_version !== 'LB5') continue;
  const pf = path.join(S.PRIORS_DIR, meta.canon_hash + '.json');
  if (!fs.existsSync(pf)) { out.push({ sha: meta.sha.slice(0, 8), note: 'no prior file (not a stage-1 parent)' }); continue; }
  const prior = JSON.parse(fs.readFileSync(pf, 'utf8')).comm;
  const dir = path.join(root, f.replace('.meta.json', ''));
  const db = new lbug.Database(dir, 256 * 1024 * 1024, true, true, 2 ** 32);
  const c = new lbug.Connection(db);
  const r = c.querySync('MATCH (n:N) RETURN n.id AS i, n.comm AS c ORDER BY n.id'); const rows = r.getAllSync(); r.close();
  c.closeSync(); db.closeSync();
  const old = rows.map((x) => Number(x.c));
  out.push({ sha: meta.sha.slice(0, 8), old_communities: new Set(old).size, prior_communities: new Set(prior).size, ari_old_vs_prior: +S.ari(old, prior).toFixed(4) });
}
console.log(JSON.stringify({ stores: out.length, differ: out.filter((x) => x.ari_old_vs_prior != null && x.ari_old_vs_prior < 1).length, rows: out }));
