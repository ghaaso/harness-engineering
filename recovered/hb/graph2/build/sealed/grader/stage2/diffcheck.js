'use strict';
// For a configuration hash present in two arms, show how the differing answers differ.
//   node diffcheck.js <hash> <armA> <armB>
const path = require('path');
const B = path.resolve(__dirname, '..', '..', '..');
const H = require(path.join(B, 'arms', 'common', 'harness'));
const [h, a, b] = process.argv.slice(2);
for (const s of ['T1', 'T1x', 'T2']) {
  const ra = H.readGzJsonl(path.join(B, 'results', a, 'tune', h + '.' + s + '.jsonl.gz'));
  const rb = new Map(H.readGzJsonl(path.join(B, 'results', b, 'tune', h + '.' + s + '.jsonl.gz')).map((x) => [x.id, x]));
  for (const x of ra) {
    const y = rb.get(x.id);
    const kx = JSON.stringify({ items: x.items, budgets: x.budgets, n_units: x.n_units, seeds: x.seeds, ranked_sha: x.ranked_sha });
    const ky = JSON.stringify({ items: y.items, budgets: y.budgets, n_units: y.n_units, seeds: y.seeds, ranked_sha: y.ranked_sha });
    if (kx === ky) continue;
    const ix = x.items || []; const iy = y.items || [];
    const sameOrder = ix.length === iy.length && ix.every((it, i) => it.path === iy[i].path && it.sym === iy[i].sym && it.tok === iy[i].tok);
    const diffs = [];
    for (let i = 0; i < Math.max(ix.length, iy.length); i++) {
      const jx = JSON.stringify(ix[i]); const jy = JSON.stringify(iy[i]);
      if (jx !== jy) diffs.push({ i, a: jx && jx.slice(0, 300), b: jy && jy.slice(0, 300) });
    }
    const maxScoreDiff = Math.max(0, ...ix.map((it, i) => (iy[i] && typeof it.score === 'number' && typeof iy[i].score === 'number' ? Math.abs(it.score - iy[i].score) : 0)));
    console.log(JSON.stringify({ set: s, id: x.id, items: ix.length, same_paths_and_order: sameOrder, budgets_same: JSON.stringify(x.budgets) === JSON.stringify(y.budgets), max_abs_score_diff: maxScoreDiff, first_diffs: diffs.slice(0, 2) }));
  }
}
