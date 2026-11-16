'use strict';
const fs = require('fs');
const C = require('C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/verify-item27/recompute/core.js');
const L = C.LANE;
const tasks = C.readJsonl(L + '/eval/tune_tasks.jsonl').filter(t => t.late50);
const out = [];
const log = s => out.push(s);
log('late50 tasks ' + tasks.length + ' commits ' + new Set(tasks.map(t => t.commit)).size);
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const ARMS = ['E1', 'E2', 'E3', 'E4', 'E5', 'PLACEBO'];
const choices = JSON.parse(fs.readFileSync(L + '/train/report/tune.json', 'utf8')).choices;
for (const a of ARMS) log(a + ' blocks ' + JSON.stringify(choices[a].blocks));
for (const sc of ['pool', 'unrestricted']) {
  log('\n===== ' + sc);
  const cand = C.readScoreTable(L + '/eval/comparators/candidates_' + sc + '.tsv.gz');
  const PPR = C.readScoreTable(L + '/eval/comparators/PPR_' + sc + '.tsv.gz');
  const CO = C.readScoreTable(L + '/eval/comparators/CO_' + sc + '.tsv.gz');
  const RRF = C.readScoreTable(L + '/eval/comparators/RRF_' + sc + '.tsv.gz');
  const get = (T, id) => T.get(id) || new Map();
  const n = {}, m = {}, cl = {};
  let pprGap = 0, rrfMis = 0;
  const top = {}, p = {};
  const put = (name, id, list, truth) => { (top[name] = top[name] || {})[id] = list.slice(0, 10); (p[name] = p[name] || {})[id] = C.p10(list, truth); };
  for (const t of tasks) {
    const id = t.task_id; const c = [...get(cand, id).keys()]; cl[id] = c; n[id] = c.length; m[id] = get(CO, id).size;
    if (get(PPR, id).size !== c.length) pprGap++;
    const r1 = C.rank(id, c, get(RRF, id));
    const r2 = C.rank(id, c, C.rrfScores(id, c, [[get(PPR, id), 1], [get(CO, id), 1]]));
    if (r1.slice(0, 10).join() !== r2.slice(0, 10).join()) rrfMis++;
    put('RRF', id, r1, t.truth);
  }
  log('tasks where PPR does not score every candidate: ' + pprGap + '; recomputed RRF top10 != stored: ' + rrfMis);
  log('RRF P@10 task-mean ' + mean(tasks.map(t => p.RRF[t.task_id])).toFixed(4));
  // embedding coverage
  for (const a of ARMS) {
    let gap = 0;
    const A = C.readScoreTable(L + '/train/selectB/' + a + '/alone_' + sc + '_s1.tsv.gz');
    for (const t of tasks) { const s = get(A, t.task_id); let k = 0; for (const v of s.values()) if (!Number.isNaN(v)) k++; if (k !== n[t.task_id]) gap++; }
    log(a + ' s1 alone: tasks where the embedding does not score every candidate (non-NaN): ' + gap);
  }
  for (const w of [0.25, 0.5, 1]) {
    let dom = 0, domTop = 0, mlt = 0;
    for (const t of tasks) {
      const N = n[t.task_id], M = m[t.task_id];
      const d = M > 0 && M < N && (1 + w) / (60 + N) + 1 / (60 + M) > (1 + w) / 61;
      if (d) { dom++; if (M >= 10) domTop++; }
    }
    log('w=' + w + ' analytic dominance ' + dom + '/' + tasks.length + ', with m>=10: ' + domTop);
  }
  log('tasks m=0: ' + tasks.filter(t => m[t.task_id] === 0).length + ', m=n: ' + tasks.filter(t => m[t.task_id] === n[t.task_id] && n[t.task_id] > 0).length + ', n<=10: ' + tasks.filter(t => n[t.task_id] <= 10).length + ', m>=10: ' + tasks.filter(t => m[t.task_id] >= 10).length);
  for (const a of ARMS) {
    for (const s of [1, 2, 3]) {
      const F = C.readScoreTable(L + '/train/selectB/' + a + '/fused_' + sc + '_s' + s + '.tsv.gz');
      let ovs = [], same = 0, diffP = 0, up = 0, empDom = 0, empDomEligible = 0;
      for (const t of tasks) {
        const id = t.task_id; const r = C.rank(id, cl[id], get(F, id));
        put(a + s, id, r, t.truth);
        const R = new Set(top.RRF[id]); const o = top[a + s][id].filter(x => R.has(x)).length; ovs.push(o);
        if (o === top.RRF[id].length && top[a + s][id].length === top.RRF[id].length) same++;
        const d = p[a + s][id] - p.RRF[id]; if (Math.abs(d) > 1e-12) { diffP++; if (d > 0) up++; }
        const M = m[id]; if (M > 0 && M < n[id]) { empDomEligible++; const co = get(CO, id); if (r.slice(0, M).every(x => co.has(x))) empDom++; }
      }
      log(a + ' s' + s + ': overlap ' + mean(ovs).toFixed(2) + ', same set ' + same + ' (' + (100 * same / tasks.length).toFixed(1) + '%), P@10 != RRF on ' + diffP + ' (' + up + ' up), fused P@10-RRF ' + (mean(tasks.map(t => p[a + s][t.task_id])) - mean(tasks.map(t => p.RRF[t.task_id]))).toFixed(4) + ' | observed: CO block wholly on top in ' + empDom + '/' + empDomEligible);
    }
    const dm = tasks.filter(t => Math.abs(mean([1, 2, 3].map(s => p[a + s][t.task_id])) - p.RRF[t.task_id]) > 1e-12).length;
    log(a + ' seed-mean P@10 != RRF on ' + dm);
  }
}
fs.writeFileSync(__dirname + '/v.out.txt', out.join('\n') + '\n');
console.log(out.join('\n'));
