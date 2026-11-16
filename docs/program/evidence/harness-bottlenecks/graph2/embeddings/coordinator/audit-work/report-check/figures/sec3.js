const fs = require('fs');
const L = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/';
const R = 'C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks/graph2/embeddings/COORDINATOR-REPORT.md';
const t = JSON.parse(fs.readFileSync(L + 'train/report/tune.json', 'utf8'));
const i24 = JSON.parse(fs.readFileSync(L + 'grader-returns/tune-item24.json', 'utf8'));
const tr = JSON.parse(fs.readFileSync(L + 'grader-returns/tune-rank.json', 'utf8'));
const rep = fs.readFileSync(R, 'utf8').split(/\r?\n/);
const f4 = x => (x >= 0 ? '+' : '-') + Math.abs(x).toFixed(4);
const word = w => w === 'cannot tell (lower)' ? 'lower' : w;
const arms = { 'E1 RotatE': 'E1', 'E2 ComplEx-N3': 'E2', 'E3 TransE': 'E3', 'E4 CompGCN': 'E4', 'E5 routed specialists': 'E5', 'Placebo': 'PLACEBO' };
const cols = [['pool', 'fused'], ['pool', 'alone'], ['unrestricted', 'fused'], ['unrestricted', 'alone']];
let n = 0, bad = 0;
for (const line of rep) {
  const m = line.match(/^\| ([^|]+?) \| (.+) \|$/);
  if (!m || !arms[m[1]]) continue;
  const a = arms[m[1]];
  const cells = m[2].split(' | ');
  cols.forEach(([sc, mode], i) => {
    const c = t.contrasts.late50[sc][`${a}_${mode}`].vs_RRF['P@10'];
    const v = t.verdicts.late50[a][`${mode}_${sc}`];
    const exp = `${f4(c.diff)} [${f4(c.lo)}, ${f4(c.hi)}] ${word(v)}`;
    // also cross-check grader tune-rank diffs
    const g = tr.rank[`${a}_${mode}_mean`][sc]['P@10'] - tr.rank.RRF[sc]['P@10'];
    n++;
    const ok = exp === cells[i].trim();
    if (!ok) bad++;
    console.log(`${ok ? 'OK ' : 'BAD'} ${a} ${sc} ${mode}: report="${cells[i].trim()}" source="${exp}" raw=${c.diff},${c.lo},${c.hi} verdict="${v}" graderDiff=${g.toFixed(6)}`);
  });
}
console.log('cells', n, 'bad', bad);
const cmp = t.comparators.late50;
console.log('RRF pool', cmp.pool.RRF['P@10'], 'unres', cmp.unrestricted.RRF['P@10'], 'PPR', cmp.pool.PPR['P@10'], 'CO', cmp.pool.CO['P@10'], 'DIR', cmp.pool.DIR['P@10'], 'RANDOM', cmp.pool.RANDOM['P@10']);
console.log('grader RRF pool', tr.rank.RRF.pool['P@10'], tr.rank.RRF.unrestricted['P@10'], tr.rank.PPR.pool['P@10'], tr.rank.CO.pool['P@10'], tr.rank.DIR.pool['P@10']);
for (const [k, v] of Object.entries(i24.labels)) console.log('item24', k, v.mean.primary.toFixed(4), v.vs_RRF ? JSON.stringify(v.vs_RRF.primary) : '');
console.log('primary verdicts', Object.fromEntries(Object.entries(t.verdicts.late50).map(([k, v]) => [k, v.primary])));
console.log('max fused pool diff', Math.max(...['E1','E2','E3','E4','E5'].map(a => t.contrasts.late50.pool[a + '_fused'].vs_RRF['P@10'].diff)));
console.log('choices', JSON.stringify(t.choices).slice(0, 3000));
