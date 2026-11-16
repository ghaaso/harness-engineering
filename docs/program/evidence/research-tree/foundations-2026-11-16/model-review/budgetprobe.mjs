import { makeParams, initial, canon, successors, FIXES } from './model.mjs';
for (const [id, over] of [['SPEC', {}], ['FIXED', FIXES], ['FIXED-K3', { ...FIXES, BUDGET: { k: 3, c: 3, z: 2 } }]]) {
  const P = makeParams(over); const seen = new Set(); const q = [canon(initial(P))]; seen.add(q[0]);
  let negH = 0, negK = 0, twoHO = 0, ex = null;
  for (let i = 0; i < q.length; i++) {
    const st = JSON.parse(q[i]);
    if (st.B.h < 0) { negH++; ex ??= st.B; }
    if (st.B.k < 0) negK++;
    if (st.T.filter((t) => t.hv > 0).length > 1) twoHO++;
    for (const x of successors(st, P)) { const k = canon(x.s); if (!seen.has(k)) { seen.add(k); q.push(k); } }
  }
  console.log(id, 'states', q.length, 'B.h<0:', negH, 'B.k<0:', negK, 'states with >1 planned hand-over:', twoHO, 'example', JSON.stringify(ex));
}
