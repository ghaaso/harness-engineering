const fs = require('fs');
const L = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/';
const R = 'C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks/graph2/embeddings/COORDINATOR-REPORT.md';
const J = p => JSON.parse(fs.readFileSync(L + p, 'utf8'));
const tune = J('train/report/tune.json');
const i24 = J('grader-returns/tune-item24.json');
const ho = J('grader-returns/heldout.json');
const lines = fs.readFileSync(R, 'utf8').split(/\r?\n/);
const sg = x => (x >= 0 ? '+' : '-') + Math.abs(x).toFixed(4);
const fmt = c => `${sg(c.diff)} [${sg(c.lo)}, ${sg(c.hi)}]`;
const word = w => w === 'cannot tell (lower)' ? 'lower' : w;
let n = 0, bad = 0;
function cmp(label, rep, src) { n++; if (rep !== src) { bad++; console.log('MISMATCH', label, '| report:', rep, '| source:', src); } }
// Section 3 table
const armRow = { E1: 'E1 RotatE', E2: 'E2 ComplEx-N3', E3: 'E3 TransE', E4: 'E4 CompGCN', E5: 'E5 routed specialists', PLACEBO: 'Placebo' };
const cols = [['pool', 'fused'], ['pool', 'alone'], ['unrestricted', 'fused'], ['unrestricted', 'alone']];
for (const [a, name] of Object.entries(armRow)) {
  const line = lines.find(l => l.startsWith('| ' + name + ' |'));
  const cells = line.split('|').slice(2, 6).map(s => s.trim());
  cols.forEach(([sc, k], i) => {
    const c = tune.contrasts.late50[sc][`${a}_${k}`];
    const src = fmt(c.vs_RRF['P@10']) + ' ' + word(c.verdict_P10);
    const v2 = word(tune.verdicts.late50[a][`${k}_${sc}`]);
    if (v2 !== word(c.verdict_P10)) console.log('verdict key disagree', a, k, sc);
    cmp(`s3 ${a} ${sc} ${k}`, cells[i], src);
  });
}
// comparators
const cp = tune.comparators.late50;
console.log('comparators pool RRF', cp.pool.RRF['P@10'].toFixed(4), 'unr RRF', cp.unrestricted.RRF['P@10'].toFixed(4),
  'PPR', cp.pool.PPR['P@10'].toFixed(4), 'CO', cp.pool.CO['P@10'].toFixed(4), 'DIR', cp.pool.DIR['P@10'].toFixed(4), 'RANDOM', cp.pool.RANDOM['P@10'].toFixed(4));
n += 6;
// answer level tuning
const lab = i24.labels;
console.log('\nanswer level labels:', Object.keys(lab).join(','));
for (const [k, v] of Object.entries(lab)) {
  const p = v.vs_RRF && v.vs_RRF.primary;
  console.log(k, v.mean.primary.toFixed(4), p ? fmt(p) : '', p && p.p !== undefined ? 'p=' + p.p : '');
}
// Section 5 table
console.log('\nheldout keys', Object.keys(ho).join(','));
const hrow = { 'Simple ranker (RRF)': 'RRF', 'E1 fused': 'E1_fused_mean', 'E1 alone': 'E1_alone_mean', 'PPR': 'PPR', 'CO': 'CO', 'Same folder': 'DIR' };
const vs = ho.vs_RRF;
console.log('vs_RRF structure:', JSON.stringify(vs).slice(0, 600));
for (const [name, k] of Object.entries(hrow)) {
  const line = lines.find(l => l.startsWith('| ' + name + ' |'));
  const cells = line.split('|').slice(2, 5).map(s => s.trim());
  const vals = [ho.rank[k].pool['P@10'], ho.rank[k].unrestricted['P@10'], ho.answer_level[k]];
  cells.forEach((c, i) => {
    const m = c.match(/^([0-9.]+)/);
    cmp(`s5 ${name} col${i} value`, m[1], vals[i].toFixed(4));
    const m2 = c.match(/\((.*)\)/);
    if (m2) console.log('  diff cell', name, i, m2[1]);
  });
}
console.log(`\nchecked ${n}, mismatches ${bad}`);
