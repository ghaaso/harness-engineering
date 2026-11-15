'use strict';
// Diagnose the relational/reference mismatches found by c7_crosscheck.js: for each example, the
// symmetric difference of reach sets, hop differences, score differences on common nodes, and the
// reachable-state count, so the faulty side can be read against SPEC.md 6.3 and 8.1.
//   node c7_diag.js [examples json = c7_crosscheck.json]
const fs = require('fs');
const path = require('path');
const B = process.env.GT_BUILD || path.resolve(__dirname, '..', '..');
const H = require(path.join(B, 'arms/common/harness'));
const { graphFor, openArm } = require(path.join(B, 'arms/common/arms'));
const ex = JSON.parse(fs.readFileSync(process.argv[2] || path.join(__dirname, 'c7_crosscheck.json'), 'utf8')).examples.filter((e) => e.cfg && e.first_diff !== undefined);
const tasks = new Map(H.loadTasks(['T1', 'T2'], 'tune').map((t) => [t.id, t]));
(async () => {
  const out = [];
  for (const e of ex) {
    const t = tasks.get(e.task); const G = graphFor(t.parent);
    const rel = await openArm('relational', G); const ref = await openArm('reference', G);
    const sm = H.mapSeed(G, t.seed);
    const res = {};
    for (const [nm, arm] of [['rel', rel], ['ref', ref]]) for (const cl of [true, false]) for (const cte of [true, false]) {
      if (nm === 'ref' && !(cl && cte)) continue;
      if (nm === 'rel') { arm.raw.rel.useClosure = cl; arm.raw.rel.useCte = cte; }
      const r = H.normRank(await arm.rank(sm.ids, e.cfg, t.seed)).ranked;
      res[nm + (nm === 'rel' ? (cl ? '+closure' : '') + (cte ? '+cte' : '+levelwise') : '')] = r;
    }
    const A = res['rel+closure+cte']; const R0 = res.ref;
    const mA = new Map(A.map((x) => [x.i, x])); const mR = new Map(R0.map((x) => [x.i, x]));
    const onlyRel = A.filter((x) => !mR.has(x.i)).slice(0, 5); const onlyRef = R0.filter((x) => !mA.has(x.i)).slice(0, 5);
    const hopDiff = A.filter((x) => mR.has(x.i) && mR.get(x.i).hop !== x.hop).slice(0, 5).map((x) => ({ i: x.i, rel: [x.hop, x.path], ref: [mR.get(x.i).hop, mR.get(x.i).path] }));
    const scoreDiff = A.filter((x) => mR.has(x.i) && mR.get(x.i).score !== x.score).length;
    const pathDiff = A.filter((x) => mR.has(x.i) && JSON.stringify(mR.get(x.i).path) !== JSON.stringify(x.path)).slice(0, 3).map((x) => ({ i: x.i, rel: x.path, ref: mR.get(x.i).path, relvia: x.via, refvia: mR.get(x.i).via }));
    const variantsAgree = Object.entries(res).filter(([k]) => k.startsWith('rel')).map(([k, v]) => [k, JSON.stringify(v) === JSON.stringify(A)]);
    const nodeKinds = (ids) => ids.map((i) => { const n = G.nodes[i - 1]; return i + ':' + n.kind + ':' + (n.path || n.name || '').slice(-40); });
    out.push({ task: e.task, seeds: nodeKinds(sm.ids), traversal: e.cfg.traversal, direction: e.cfg.direction, rank: e.cfg.rank.mode, minConf: e.cfg.minConf,
      n_rel: A.length, n_ref: R0.length, only_rel: onlyRel.map((x) => ({ ...x, node: nodeKinds([x.i])[0] })), only_ref: onlyRef.map((x) => ({ ...x, node: nodeKinds([x.i])[0] })),
      hop_diff_examples: hopDiff, hop_diff_count: A.filter((x) => mR.has(x.i) && mR.get(x.i).hop !== x.hop).length, score_diff_count: scoreDiff, path_diff_examples: pathDiff, rel_query_paths_agree: variantsAgree });
    await rel.close(); await ref.close();
  }
  fs.writeFileSync(path.join(__dirname, 'c7_diag.json'), JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1).slice(0, 12000));
})().catch((e) => { console.error(e); process.exit(1); });
