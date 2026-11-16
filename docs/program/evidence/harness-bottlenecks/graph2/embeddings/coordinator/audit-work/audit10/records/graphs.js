'use strict';
const fs = require('fs');
const L = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const plan = JSON.parse(fs.readFileSync(L + '/train/stageB/plan.json', 'utf8'));
const HO = new Set(); for (const [k, v] of Object.entries(plan.heldout.assignment)) { HO.add(k); HO.add(v); }
const TU = new Set(); for (const [k, v] of Object.entries(plan.assignment)) { TU.add(k); if (typeof v === 'string') TU.add(v); }
console.log('plan.assignment entries', Object.keys(plan.assignment).length, 'sample', JSON.stringify(Object.entries(plan.assignment)[0]));
let man = null; try { man = JSON.parse(fs.readFileSync(L + '/tune_inputs/MANIFEST.json', 'utf8')); console.log('tune manifest keys', Object.keys(man)); } catch (e) { console.log('no manifest', e.message); }
const g0 = fs.readdirSync(L + '/export/graphs0'), g = fs.readdirSync(L + '/export/graphs');
console.log('graphs', g.length, 'HO in graphs', g.filter((x) => HO.has(x)).length, 'graphs0', g0.length, 'HO in graphs0', g0.filter((x) => HO.has(x)).length);
const rec = (p) => { const J = JSON.parse(fs.readFileSync(p, 'utf8')); return (Array.isArray(J) ? J[0] : J).Mounts; };
const sets = {};
for (const f of ['r58c/mounts/ktest-r4.json', 'r58c/mounts/ktest-r8.json', 'r58c/mounts/ktest-r9.json', 'r58c/B/out/mounts-test/ktest-r4-20261115T142228Z.json', 'r58c/B/out/mounts-test/ktest-r8-20261115T101652Z.json', 'r58c/B/out/mounts-test/ktest-r8-20261115T162718Z.json', 'r58c/B/out/mounts-test/ktest-r9-20261115T102934Z.json', 'r58c/B/out/mounts-test/ktest-r9-20261115T104953Z.json', 'r58c/B/out/mounts-test/ktest-r9-20261115T162959Z.json']) {
  const M = rec(L + '/' + f);
  const gr = M.filter((m) => /\/export\/graphs0?\/[0-9a-f]{40}$/.test(m.Source)).map((m) => ({ sha: m.Source.slice(-40), g0: /graphs0\//.test(m.Source), rw: m.RW }));
  const rw = M.filter((m) => m.RW).map((m) => m.Source.replace(L, 'LANE'));
  const other = M.filter((m) => !/\/export\/graphs0?\/[0-9a-f]{40}$/.test(m.Source)).map((m) => m.Source.replace(L, 'LANE').replace(/^C:.*graph2/, 'G2') + '>' + m.Destination + (m.RW ? ':rw' : ':ro'));
  sets[f] = new Set(gr.map((x) => x.sha));
  console.log(f, 'graphRows', gr.length, 'graphs0', gr.filter((x) => x.g0).length, 'HO', gr.filter((x) => HO.has(x.sha)).length, 'inTuneAssign', gr.filter((x) => TU.has(x.sha)).length, 'rwGraph', gr.filter((x) => x.rw).length, 'RW:', rw.join(','));
  console.log('   other:', other.join(' ; '));
}
const eq = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
console.log('r4==r8', eq(sets['r58c/mounts/ktest-r4.json'], sets['r58c/mounts/ktest-r8.json']));
console.log('r9==HO', eq(sets['r58c/mounts/ktest-r9.json'], HO), 'HO size', HO.size);
