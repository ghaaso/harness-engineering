'use strict';
// Item 5: pilot_co.tsv (comparator CO, conf > 0) vs co_changed triples of the training graph (graphs0) per tune checkpoint.
const fs = require('fs');
const LANE = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const plan = JSON.parse(fs.readFileSync(LANE + '/train/stageB/plan.json', 'utf8'));
const tasks = fs.readFileSync(LANE + '/eval/tune_tasks.jsonl', 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const CODE = /^(backend|src|technician-app)\/.*\.(py|ts|tsx|js|jsx|mjs|cjs)$/;
const key = (a, b) => a < b ? a + '\u0000' + b : b + '\u0000' + a;
const rep = { s: plan.s, n_checkpoints: plan.checkpoints.length, assignment_identity: Object.entries(plan.assignment).filter(([p]) => tasks.some(t => t.parent === p)).every(([p, c]) => p === c), per: [] };
const tot = { pilot_pos: 0, pilot_all: 0, train_pairs: 0, both: 0, pilot_only: 0, train_only: 0, train_only_code: 0, pilot_only_code: 0, asym: 0, nonfile: 0 };
const exPO = [], exTO = [];
let seedImpact = { tasks: 0, tasks_with_train_only_code_nbr_in_pool: 0, tasks_with_pilot_only_code: 0 };
for (const sha of plan.checkpoints) {
  const pc = new Map(); let pall = 0;
  const L = fs.readFileSync(LANE + '/export/graphs/' + sha + '/pilot_co.tsv', 'utf8').split('\n');
  for (let i = 1; i < L.length; i++) { if (!L[i]) continue; const [a, b, conf, sup, rec, cmax] = L[i].split('\t'); pall++; const k = key(a.slice(2), b.slice(2)); const prev = pc.get(k); pc.set(k, { conf: +conf, cmax: +cmax }); }
  const pos = new Set([...pc].filter(([k, v]) => v.conf > 0).map(([k]) => k));
  const tr = new Map(); let nonfile = 0;
  const T = fs.readFileSync(LANE + '/export/graphs0/' + sha + '/triples.tsv', 'utf8').split('\n');
  for (let i = 1; i < T.length; i++) { if (!T[i]) continue; const [h, r, t] = T[i].split('\t'); if (r !== 'co_changed') continue; if (!h.startsWith('file:') || !t.startsWith('file:')) { nonfile++; continue; } const k = key(h.slice(5), t.slice(5)); tr.set(k, (tr.get(k) || 0) + 1); }
  const asym = [...tr.values()].filter(v => v !== 2).length;
  const both = [...pos].filter(k => tr.has(k)).length;
  const po = [...pos].filter(k => !tr.has(k)), to = [...tr.keys()].filter(k => !pos.has(k));
  const isCodePair = k => k.split('\u0000').some(x => CODE.test(x));
  const bothCode = k => k.split('\u0000').every(x => CODE.test(x));
  const r = { sha: sha.slice(0, 8), pilot_rows: pall, pilot_pairs: pc.size, pilot_conf_pos: pos.size, train_pairs: tr.size, both, pilot_only: po.length, train_only: to.length, train_only_both_code: to.filter(bothCode).length, pilot_only_both_code: po.filter(bothCode).length, train_only_in_pilot_with_conf0: to.filter(k => pc.has(k)).length, asym, nonfile };
  rep.per.push(r);
  for (const k of Object.keys(tot)) if (r[{ pilot_pos: 'pilot_conf_pos', pilot_all: 'pilot_pairs', train_pairs: 'train_pairs', both: 'both', pilot_only: 'pilot_only', train_only: 'train_only', train_only_code: 'train_only_both_code', pilot_only_code: 'pilot_only_both_code', asym: 'asym', nonfile: 'nonfile' }[k]] !== undefined) tot[k] += r[{ pilot_pos: 'pilot_conf_pos', pilot_all: 'pilot_pairs', train_pairs: 'train_pairs', both: 'both', pilot_only: 'pilot_only', train_only: 'train_only', train_only_code: 'train_only_both_code', pilot_only_code: 'pilot_only_both_code', asym: 'asym', nonfile: 'nonfile' }[k]];
  if (exPO.length < 8) exPO.push(...po.slice(0, 2).map(k => sha.slice(0, 8) + ' ' + k.replace('\u0000', ' <> ') + ' conf=' + JSON.stringify(pc.get(k))));
  if (exTO.length < 8) exTO.push(...to.slice(0, 2).map(k => sha.slice(0, 8) + ' ' + k.replace('\u0000', ' <> ') + ' pilot=' + JSON.stringify(pc.get(k) || null)));
}
rep.totals = tot; rep.examples_pilot_only = exPO; rep.examples_train_only = exTO;
fs.writeFileSync(__dirname + '/codiff-result.json', JSON.stringify(rep, null, 1));
console.log(JSON.stringify({ s: rep.s, n: rep.n_checkpoints, id: rep.assignment_identity, totals: tot, exPO, exTO }, null, 1));
console.log(rep.per.slice(0, 53).map(r => Object.values(r).join(' ')).join('\n'));
