function itemsOf(ans) {
  if (Array.isArray(ans)) return ans.map((x) => String(x).trim());
  if (ans && typeof ans === 'object') { const o = []; for (const k of Object.keys(ans)) for (const x of ans[k] || []) o.push(k + '\u0001' + String(x).trim()); return o; }
  return [];
}
function scoreQ(ansRaw, ref, dropJudge) {
  const aliases = ref.accept_aliases || {};
  let ans = itemsOf(ansRaw);
  const isObj = !Array.isArray(ref.answer);
  if (dropJudge) { const J = new Set((JUDGE[String(ref.id)] || JUDGE[ref.id] || []).map(String)); ans = ans.filter((x) => !J.has(isObj ? x.split('\u0001')[1] : x)); }
  ans = [...new Set(ans)];
  const refItems = [...new Set(itemsOf(ref.answer))];
  const canon = (x) => { // map an answer item to a reference item via aliases
    for (const r of refItems) {
      const [rk, rv] = isObj ? r.split('\u0001') : [null, r];
      const [ak, av] = isObj ? x.split('\u0001') : [null, x];
      if (rk !== ak) continue;
      if (av === rv || (aliases[rv] || []).includes(av)) return r;
    }
    return null;
  };
  const hit = new Set(); let tpA = 0;
  for (const a of ans) { const c = canon(a); if (c) { tpA++; hit.add(c); } }
  const nA = ans.length; const nR = refItems.length;
  let p; let r; let f1;
  if (nA === 0 && nR === 0) { p = 1; r = 1; f1 = 1; } else {
    p = nA ? tpA / nA : 0; // convention A: empty answer to a non-empty reference has precision 0
    r = nR ? hit.size / nR : 0; // non-empty answer to empty reference: recall 0
    f1 = p + r ? (2 * p * r) / (p + r) : 0;
  }
  const pAlt = nA ? tpA / nA : (nR ? 1 : 1); // convention B: empty answer has precision 1
  return { p, r, f1, pAlt, tp: hit.size, tpA, nA, nR };
}
const JUDGE = {};
const fs = require('fs'); const path = require('path'); const L = require('./lib');
const refs = new Map(L.readJsonl(path.join(L.BUILD, 'sealed/tq_reference.jsonl')).filter((r) => r.split !== 'tune').map((r) => [r.id, r]));
const OUTQ = new Set([24, 25, 27, 33, 40, 41, 46, 47]);
const res = {};
for (const a of ['relational', 'search']) {
  const ans = new Map(L.readJsonl(path.join(L.BUILD, 'results/heldout/tq', a + '.answers.jsonl')).map((x) => [x.id, x]));
  const s = [...refs.keys()].sort((x, y) => x - y).map((i) => ({ i, ...scoreQ(ans.get(i).answer, refs.get(i), false), tok: ans.get(i).tokens }));
  const b = (q) => ({ n: q.length, r: L.r4(L.mean(q.map((x) => x.r))), p: L.r4(L.mean(q.map((x) => x.p))), f1: L.r4(L.mean(q.map((x) => x.f1))), tok: L.median(q.map((x) => x.tok)) });
  res[a] = { all30: b(s), u22: b(s.filter((x) => !OUTQ.has(x.i))) };
}
fs.writeFileSync(path.join(__dirname, 'out/tq_typed.json'), JSON.stringify(res, null, 1)); console.log(JSON.stringify(res));
