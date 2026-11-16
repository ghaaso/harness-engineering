'use strict';
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const L = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const P = (...a) => path.join(L, ...a);
const gz = p => zlib.gunzipSync(fs.readFileSync(p)).toString('utf8').split('\n').slice(1).filter(Boolean).map(l => l.split('\t'));
function table(p) { const m = new Map(); for (const [t, c, s] of gz(p)) { if (!m.has(t)) m.set(t, new Map()); m.get(t).set(c, parseFloat(s)); } return m; }
function cands(sc) { const m = new Map(); for (const [t, c] of gz(P('eval', 'comparators', 'candidates_' + sc + '.tsv.gz'))) { if (!m.has(t)) m.set(t, []); m.get(t).push(c); } return m; }
const tasks = fs.readFileSync(P('eval', 'tune_tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter(t => t.late50);
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const med = a => { const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
function rk(v) { const idx = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]); const r = new Array(v.length); let i = 0; while (i < idx.length) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1; i = j + 1; } return r; }
function sp(x, y) { if (x.length < 3) return NaN; const a = rk(x), b = rk(y), n = a.length, ma = mean(a), mb = mean(b); let ab = 0, aa = 0, bb = 0; for (let i = 0; i < n; i++) { ab += (a[i] - ma) * (b[i] - mb); aa += (a[i] - ma) ** 2; bb += (b[i] - mb) ** 2; } return aa && bb ? ab / Math.sqrt(aa * bb) : NaN; }
const top = (c, s, k = 10) => [...c].sort((a, b) => ((s.get(b) ?? -Infinity) - (s.get(a) ?? -Infinity)) || (a < b ? -1 : 1)).slice(0, k);
const ov = (a, b) => { const B = new Set(b); return a.filter(x => B.has(x)).length; };
function rrf(c, lists) { const out = new Map(c.map(x => [x, 0])); for (const s of lists) { const r = top(c, s, c.length); r.forEach((x, i) => { if (s.has(x)) out.set(x, out.get(x) + 1 / (60 + i + 1)); }); } return out; }
const out = []; const log = s => { out.push(s); };
for (const sc of ['pool', 'unrestricted']) {
  const cl = cands(sc), CO = table(P('eval', 'comparators', 'CO_' + sc + '.tsv.gz')), PPR = table(P('eval', 'comparators', 'PPR_' + sc + '.tsv.gz')), RRF = table(P('eval', 'comparators', 'RRF_' + sc + '.tsv.gz'));
  let coMin = Infinity, coRows = 0; for (const m of CO.values()) for (const v of m.values()) { coMin = Math.min(coMin, v); coRows++; }
  let nC = 0, nCO = 0; for (const t of tasks) { const c = cl.get(t.task_id) || []; nC += c.length; const co = CO.get(t.task_id) || new Map(); nCO += c.filter(x => co.has(x)).length; }
  log(`== ${sc}: late tasks ${tasks.length}; candidate occurrences ${nC}; CO-scored ${nCO} (${(100 * nCO / nC).toFixed(1)}%); CO table rows ${coRows}, min CO score ${coMin}`);
  // PPR vs CO overlap
  { const o = []; for (const t of tasks) { const c = cl.get(t.task_id) || []; o.push(ov(top(c, PPR.get(t.task_id) || new Map()), top(c, CO.get(t.task_id) || new Map()))); } log(`  top10 overlap PPR-CO mean ${mean(o).toFixed(2)}`); }
  for (const a of ['E1', 'E2', 'E3', 'E4', 'E5', 'PLACEBO']) {
    const E = table(P('train', 'selectB', a, `alone_${sc}_s1.tsv.gz`));
    const auc = [], spAll = [], spNon = [], spCOin = [], oR = [], oC = [], oP = []; let p10e = [], p10p = [];
    for (const t of tasks) {
      const tid = t.task_id, c = cl.get(tid) || [], e = E.get(tid) || new Map(), co = CO.get(tid) || new Map(), pp = PPR.get(tid) || new Map(), T = new Set(t.truth);
      const sc_ = c.filter(x => e.has(x));
      const pos = sc_.filter(x => co.has(x)).map(x => e.get(x)), neg = sc_.filter(x => !co.has(x)).map(x => e.get(x));
      if (pos.length && neg.length) { let g = 0; for (const p of pos) for (const n of neg) g += p > n ? 1 : p === n ? 0.5 : 0; auc.push(g / pos.length / neg.length); }
      spAll.push(sp(sc_.map(x => e.get(x)), sc_.map(x => pp.get(x) || 0)));
      const non = sc_.filter(x => !co.has(x)); const r = sp(non.map(x => e.get(x)), non.map(x => pp.get(x) || 0)); if (!isNaN(r)) spNon.push(r);
      const cin = sc_.filter(x => co.has(x)); const r2 = sp(cin.map(x => e.get(x)), cin.map(x => co.get(x))); if (!isNaN(r2)) spCOin.push(r2);
      const te = top(c, e); oR.push(ov(te, top(c, RRF.get(tid) || new Map()))); oC.push(ov(te, top(c, co))); oP.push(ov(te, top(c, pp)));
      // independent signal: non-CO candidates only, P@10
      const nonc = c.filter(x => !co.has(x)); if ([...T].some(x => nonc.includes(x)) && nonc.length > 10) { p10e.push(top(nonc, e).filter(x => T.has(x)).length / 10); p10p.push(top(nonc, pp).filter(x => T.has(x)).length / 10); }
    }
    const f = a => isNaN(med(a.filter(x => !isNaN(x)))) ? 'nan' : med(a.filter(x => !isNaN(x))).toFixed(3);
    log(`  ${a}: AUC CO-scored vs not median ${med(auc).toFixed(3)} mean ${mean(auc).toFixed(3)} n=${auc.length} | Spearman emb-PPR all cands median ${f(spAll)}; non-CO cands only median ${f(spNon)} (n=${spNon.length}); emb-CO within CO-scored median ${f(spCOin)} (n=${spCOin.length}) | top10 overlap alone-RRF ${mean(oR).toFixed(2)} alone-CO ${mean(oC).toFixed(2)} alone-PPR ${mean(oP).toFixed(2)} | non-CO-only P@10 (task mean, ${p10e.length} tasks) emb ${mean(p10e).toFixed(4)} PPR ${mean(p10p).toFixed(4)}`);
  }
}
fs.writeFileSync(__dirname + '/v.out.txt', out.join('\n') + '\n');
console.log(out.join('\n'));
