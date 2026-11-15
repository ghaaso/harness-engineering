'use strict';
// Reproducibility of the community prior (addendum 3, B.5): for each TUNE parent, two fresh store
// builds in two empty folders on the container filesystem, then the x_comm configurations ranked on
// every TUNE task of that parent in both; the ranked lists must be byte-identical. Also recorded per
// build: the number of communities of that build's own Louvain run and its adjusted Rand index against
// the stored grouping (which shows the run-to-run variation that the prior file removes).
//   node commcheck.js [--sets T1,T1x,T2] [--parents N] [--root /tmp/commcheck] [--out file]
const fs = require('fs');
const path = require('path');
const P = require('../common/paths');
const C = require('../common/config');
const H = require('../common/harness');
const { graphFor } = require('../common/arms');
const LB = require('./arm');
const LS = require('./sweep');

async function main() {
  const a = process.argv.slice(2); const o = { sets: ['T1', 'T1x', 'T2'], parents: 0, root: '/tmp/commcheck', out: path.join(P.RESULTS, 'ladybug', 'xcheck', 'commcheck.json') };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--sets') o.sets = a[++i].split(','); else if (a[i] === '--parents') o.parents = Number(a[++i]);
    else if (a[i] === '--root') o.root = a[++i]; else if (a[i] === '--out') o.out = a[++i]; else throw new Error('unknown argument ' + a[i]);
  }
  const cfgs = [
    ...LS.STAGE1.filter((c) => JSON.stringify(c.rank).includes('x_comm')).map((c) => ({ name: c.name, cfg: C.normalise(c) })),
    { name: 'x_comm alone', cfg: C.normalise({ ...LS.BASE, rank: { mode: 'x_comm' } }) },
  ];
  const tasks = H.loadTasks(o.sets, 'tune');
  const byParent = new Map();
  for (const t of tasks) { if (!byParent.has(t.parent)) byParent.set(t.parent, []); byParent.get(t.parent).push(t); }
  let parents = [...byParent.keys()].sort(); if (o.parents) parents = parents.slice(0, o.parents);
  const rows = []; let compared = 0; let differ = 0; let changedRaw = 0;
  const t0 = Date.now();
  for (const parent of parents) {
    const G = graphFor(parent);
    const builds = [];
    for (const side of ['a', 'b']) {
      const root = path.join(o.root, side);
      fs.rmSync(root, { recursive: true, force: true }); fs.mkdirSync(root, { recursive: true });
      const arm = await LB.open(G, { store: root });
      const ranked = [];
      for (const t of byParent.get(parent)) {
        const sm = H.mapSeed(G, t.seed);
        for (const c of cfgs) ranked.push(sm.ids.length ? JSON.stringify(H.normRank(await arm.rank(sm.ids, c.cfg, t.seed)).ranked) : '[]');
      }
      builds.push({ comm: arm.build.comm, ranked });
      await arm.close();
      fs.rmSync(root, { recursive: true, force: true });
    }
    let d = 0; for (let i = 0; i < builds[0].ranked.length; i++) { compared++; if (builds[0].ranked[i] !== builds[1].ranked[i]) { d++; differ++; } }
    const raw = builds.map((b) => b.comm);
    if (raw.some((x) => x.this_build_ari_vs_file < 1)) changedRaw++;
    rows.push({ parent, tasks: byParent.get(parent).length, rankings_compared: builds[0].ranked.length, rankings_differ: d, builds: raw });
    process.stderr.write(`${parent.slice(0, 8)} compared ${builds[0].ranked.length} differ ${d} raw ARI ${raw.map((x) => x.this_build_ari_vs_file).join(',')} source ${raw.map((x) => x.source).join(',')}\n`);
  }
  const out = { sets: o.sets, parents: parents.length, configs: cfgs.map((c) => ({ name: c.name, hash: C.configHash(c.cfg) })), rankings_compared: compared, rankings_differ: differ,
    parents_where_a_fresh_louvain_run_differed_from_the_stored_grouping: changedRaw, wall_s: (Date.now() - t0) / 1000, per_parent: rows };
  fs.mkdirSync(path.dirname(o.out), { recursive: true });
  fs.writeFileSync(o.out, JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ parents: out.parents, rankings_compared: compared, rankings_differ: differ, parents_raw_louvain_differed: changedRaw, wall_s: out.wall_s }));
}

main().catch((e) => { console.error(e); process.exit(1); });
